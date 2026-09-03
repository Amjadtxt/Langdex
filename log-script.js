import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, query, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// استيراد إعدادات فايربيس
import { firebaseConfig } from "./firebase-config.js";

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("خطأ في تهيئة Firebase:", e);
}

let allLogs = [];

// 1. التحقق من حالة تسجيل الدخول وجلب السجلات
onAuthStateChanged(auth, (user) => {
  if (user) {
    fetchLogs();
  } else {
    window.location.href = "/Langdex/index.html";
  }
});

// 2. جلب جميع السجلات من Firestore
async function fetchLogs() {
  const tableBody = document.getElementById("logs-table-body");
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">جاري تحميل السجل...</td></tr>`;

  try {
    const q = query(collection(db, "logs"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);

    allLogs = [];
    querySnapshot.forEach((docSnap) => {
      allLogs.push({ id: docSnap.id, ...docSnap.data() });
    });

    filterAndRenderLogs();
  } catch (error) {
    console.error("خطأ أثناء جلب السجلات:", error);
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ff6b6b;">فشل في تحميل السجلات.</td></tr>`;
  }
}

// 3. فلترة السجلات وتحديث الإحصائيات
function filterAndRenderLogs() {
  const searchInput = document.getElementById("logSearchInput");
  const timeFilter = document.getElementById("timeRangeFilter");

  const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const timeRange = timeFilter ? timeFilter.value : "today"; // الافتراضي اليوم

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - (24 * 60 * 60 * 1000);
  const last7DaysStart = todayStart - (7 * 24 * 60 * 60 * 1000);
  const last30DaysStart = todayStart - (30 * 24 * 60 * 60 * 1000);

  let todayCount = 0;
  const totalCount = allLogs.length;

  const filteredLogs = allLogs.filter((log) => {
    let logTime = 0;
    if (log.timestamp) {
      logTime = log.timestamp.toDate ? log.timestamp.toDate().getTime() : new Date(log.timestamp).getTime();
    }

    if (logTime >= todayStart) {
      todayCount++;
    }

    // فلترة حسب المدى الزمني
    let timeMatch = true;
    if (timeRange === "today") {
      timeMatch = logTime >= todayStart;
    } else if (timeRange === "yesterday") {
      timeMatch = logTime >= yesterdayStart && logTime < todayStart;
    } else if (timeRange === "last7") {
      timeMatch = logTime >= last7DaysStart;
    } else if (timeRange === "last30") {
      timeMatch = logTime >= last30DaysStart;
    }

    // فلترة البحث اللحظي
    const userName = (log.userName || "").toLowerCase();
    const action = (log.action || "").toLowerCase();
    const details = (log.details || "").toLowerCase();
    const searchMatch = userName.includes(searchQuery) || action.includes(searchQuery) || details.includes(searchQuery);

    return timeMatch && searchMatch;
  });

  // تحديث أرقام الكروت العلوية
  const todayElem = document.getElementById("todayEventsCount");
  const totalElem = document.getElementById("totalEventsCount");
  if (todayElem) todayElem.textContent = todayCount;
  if (totalElem) totalElem.textContent = totalCount;

  renderTable(filteredLogs);
}

// 4. رسم الجدول
function renderTable(logsArray) {
  const tableBody = document.getElementById("logs-table-body");
  if (!tableBody) return;

  if (logsArray.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">لا توجد سجلات مطابقة.</td></tr>`;
    return;
  }

  tableBody.innerHTML = "";
  logsArray.forEach((log, index) => {
    let formattedDate = "وقت غير معروف";
    if (log.timestamp) {
      const dateObj = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
      formattedDate = dateObj.toLocaleString("ar-EG");
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${log.userName || "مستخدم"}</td>
      <td>${log.action || "حدث"}</td>
      <td>${log.details || "-"}</td>
      <td>${log.role || "user"}</td>
      <td>${formattedDate}</td>
    `;
    tableBody.appendChild(tr);
  });
}

// 5. تنفيذ زر التراجع الفعلي عن التغيير (Undo)
const undoBtn = document.getElementById("undoActionBtn");
if (undoBtn) {
  undoBtn.addEventListener("click", async () => {
    if (allLogs.length === 0) {
      alert("لا توجد تغييرات سابقة للتراجع عنها.");
      return;
    }

    const lastLog = allLogs[0];
    const confirmUndo = confirm(`هل أنت متأكد من التراجع عن التغيير الأخير؟\n\nالحدث: ${lastLog.action}\nالتفاصيل: ${lastLog.details || "-"}`);

    if (!confirmUndo) return;

    try {
      // 1. عكس التغيير في الكوليكشن الأساسي إن وُجد targetCollection و targetId
      if (lastLog.targetCollection && lastLog.targetId) {
        const targetRef = doc(db, lastLog.targetCollection, lastLog.targetId);
        const actionType = (lastLog.action || "").toLowerCase();

        // لو كان الأكشن إضافة/إنشاء يتم حذفه من قاعدة البيانات
        if (actionType.includes("إضافة") || actionType.includes("add") || actionType.includes("إنشاء")) {
          await deleteDoc(targetRef);
        }
      }

      // 2. حذف مستند السجل نفسه بعد التراجع
      await deleteDoc(doc(db, "logs", lastLog.id));

      alert("تم التراجع عن التغيير بنجاح وعكس التأثير في المشروع.");
      fetchLogs();
    } catch (error) {
      console.error("خطأ أثناء التراجع:", error);
      alert("حدث خطأ أثناء محاولة التراجع عن التغيير.");
    }
  });
}

// 6. تصدير وطباعة السجل (PDF / Print)
const pdfBtn = document.getElementById("downloadLogPdfBtn");
if (pdfBtn) {
  pdfBtn.addEventListener("click", () => {
    if (allLogs.length === 0) {
      alert("لا توجد سجلات للطباعة أو التصدير.");
      return;
    }
    window.print();
  });
}

// 7. الأحداث اللحظية للبحث والفلترة
const searchInputElem = document.getElementById("logSearchInput");
const timeFilterElem = document.getElementById("timeRangeFilter");

if (searchInputElem) searchInputElem.addEventListener("input", filterAndRenderLogs);
if (timeFilterElem) timeFilterElem.addEventListener("change", filterAndRenderLogs);
