import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, query, orderBy, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// تأكد من مسار إعدادات فايربيس لديك
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

// 1. حماية الصفحة والتحقق من صلاحية الأدمن
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/Langdex/index.html";
    return;
  }

  try {
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists() || userDoc.data().role !== "admin") {
      alert("عذراً، هذه الصفحة خاصة بالمشرفين فقط.");
      window.location.href = "/Langdex/index.html";
      return;
    }

    fetchLogs();
  } catch (error) {
    console.error("خطأ في التحقق من الصلاحيات:", error);
    window.location.href = "/Langdex/index.html";
  }
});

// 2. جلب السجلات من قاعدة البيانات
async function fetchLogs() {
  const tableBody = document.getElementById("logs-table-body");
  if (!tableBody) return;
  
  tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">جاري جلب السجل...</td></tr>`;

  try {
    const q = query(collection(db, "logs"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    
    allLogs = [];
    querySnapshot.forEach((docSnap) => {
      allLogs.push({ id: docSnap.id, ...docSnap.data() });
    });

    filterAndRenderLogs();
  } catch (error) {
    console.error("خطأ في جلب السجلات:", error);
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ff6b6b;">فشل في تحميل السجلات.</td></tr>`;
  }
}

// 3. فلترة وعرض السجلات (حسب الوقت والبحث)
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
  let totalCount = allLogs.length;

  const filtered = allLogs.filter(log => {
    let logTime = 0;
    if (log.timestamp) {
      logTime = log.timestamp.toDate ? log.timestamp.toDate().getTime() : new Date(log.timestamp).getTime();
    }

    if (logTime >= todayStart) {
      todayCount++;
    }

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

    const userName = (log.userName || "").toLowerCase();
    const action = (log.action || "").toLowerCase();
    const details = (log.details || "").toLowerCase();
    const searchMatch = userName.includes(searchQuery) || action.includes(searchQuery) || details.includes(searchQuery);

    return timeMatch && searchMatch;
  });

  const todayElem = document.getElementById("todayEventsCount");
  const totalElem = document.getElementById("totalEventsCount");
  if (todayElem) todayElem.textContent = todayCount;
  if (totalElem) totalElem.textContent = totalCount;

  renderTable(filtered);
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

// 5. زر التراجع الفعلي عن التغيير (Undo)
const undoBtn = document.getElementById("undoActionBtn");
if (undoBtn) {
  undoBtn.addEventListener("click", async () => {
    if (allLogs.length === 0) {
      alert("لا توجد تغييرات سابقة للتراجع عنها.");
      return;
    }

    // جلب آخر حدث حصل في المشروع (أعلى القائمة)
    const lastLog = allLogs[0];
    const confirmUndo = confirm(`هل أنت متأكد من رغبتك في التراجع عن التغيير الأخير؟\n[الحدث]: ${lastLog.action}\n[التفاصيل]: ${lastLog.details || "-"}`);
    
    if (!confirmUndo) return;

    try {
      // عكس التأثير الفعلي في قاعدة البيانات لو توفرت بيانات الهدف
      if (lastLog.targetCollection && lastLog.targetId) {
        const targetRef = doc(db, lastLog.targetCollection, lastLog.targetId);
        
        const actionType = lastLog.action ? lastLog.action.toLowerCase() : "";
        
        // لو الحدث كان "إضافة" أو "إنشاء"، التراجع يكون بحذف العنصر المضاف من مكانه الأساسي
        if (actionType.includes("إضافة") || actionType.includes("add") || actionType.includes("إنشاء")) {
          await deleteDoc(targetRef);
        }
        // يمكن إضافة شروط أخرى هنا للتعديل أو الحذف حسب الحاجة
      }

      // حذف سجل اللوج نفسه من جدول الlogs بعد إتمام التراجع
      await deleteDoc(doc(db, "logs", lastLog.id));

      alert("تم التراجع عن التغيير بنجاح وعكسه في المشروع.");
      fetchLogs(); // إعادة تحميل السجلات وتحديث الشاشة
    } catch (error) {
      console.error("خطأ أثناء تنفيذ التراجع:", error);
      alert("حدث خطأ أثناء محاولة التراجع عن التغيير.");
    }
  });
}

// 6. تصدير السجل إلى PDF
const pdfBtn = document.getElementById("downloadLogPdfBtn");
if (pdfBtn) {
  pdfBtn.addEventListener("click", () => {
    if (!window.jspdf) {
      alert("مكتبة PDF لم يتم تحميلها بشكل صحيح.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const docPdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    docPdf.text("سجل الأحداث والعمليات", 140, 15, { align: "center" });

    const table = document.querySelector("table");
    docPdf.html(table, {
      callback: function (doc) {
        doc.save("System_Logs.pdf");
      },
      x: 10,
      y: 25,
      width: 275,
      windowWidth: 900
    });
  });
}

// ربط أحداث الفلترة والبحث الفوري
const searchInputElem = document.getElementById("logSearchInput");
const timeFilterElem = document.getElementById("timeRangeFilter");

if (searchInputElem) searchInputElem.addEventListener("input", filterAndRenderLogs);
if (timeFilterElem) timeFilterElem.addEventListener("change", filterAndRenderLogs);
