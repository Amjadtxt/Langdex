import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, query, orderBy, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// استيراد إعدادات فايربيس (تأكد من مسار الملف لديك)
import { firebaseConfig } from "./firebase-config.js"; 

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let allLogs = []; // لتخزين السجلات لجلبها مرة واحدة وتسهيل الفلترة والبحث

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

    // إذا كان أدمن، قم بجلب السجلات مباشرة
    fetchLogs();
  } catch (error) {
    console.error("خطأ في التحقق من الصلاحيات:", error);
    window.location.href = "/Langdex/index.html";
  }
});

// 2. جلب السجلات من قاعدة البيانات
async function fetchLogs() {
  const tableBody = document.getElementById("logs-table-body");
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
  const searchQuery = document.getElementById("logSearchInput").value.trim().toLowerCase();
  const timeRange = document.getElementById("timeRangeFilter").value;
  
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - (24 * 60 * 60 * 1000);
  const last7DaysStart = todayStart - (7 * 24 * 60 * 60 * 1000);
  const last30DaysStart = todayStart - (30 * 24 * 60 * 60 * 1000);

  let todayCount = 0;
  let totalCount = allLogs.length;

  const filtered = allLogs.filter(log => {
    // التحقق من التاريخ (إذا كان الـ timestamp مخزن كـ Firestore Timestamp أو Milliseconds)
    let logTime = log.timestamp?.toDate ? log.timestamp.toDate().getTime() : new Date(log.timestamp).getTime();

    // عد أحداث اليوم بغض النظر عن الفلتر لحساب الإحصائية
    if (logTime >= todayStart) {
      todayCount++;
    }

    // فلترة الأيام (الافتراضي اليوم)
    let timeMatch = true;
    if (timeRange === "today") {
      timeMatch = logTime >= todayStart;
    } else if (timeRange === "yesterday") {
      timeMatch = logTime >= yesterdayStart && logTime < todayStart;
    } else if (timeRange === "last7") {
      timeMatch = logTime >= last7DaysStart;
    } else if (timeRange === "last30") {
      timeMatch = logTime >= last30DaysStart;
    } // لو "all" يبقى كل السجلات

    // فلترة البحث النصي
    const userName = (log.userName || "").toLowerCase();
    const action = (log.action || "").toLowerCase();
    const details = (log.details || "").toLowerCase();
    const searchMatch = userName.includes(searchQuery) || action.includes(searchQuery) || details.includes(searchQuery);

    return timeMatch && searchMatch;
  });

  // تحديث الكاردز (الإحصائيات)
  document.getElementById("todayEventsCount").textContent = todayCount;
  document.getElementById("totalEventsCount").textContent = totalCount;

  renderTable(filtered);
}

// 4. رسم جدول السجلات
function renderTable(logsArray) {
  const tableBody = document.getElementById("logs-table-body");
  
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

// 5. زر التراجع عن التغيير (Undo)
document.getElementById("undoActionBtn").addEventListener("click", async () => {
  if (allLogs.length === 0) {
    alert("لا توجد سجلات للتراجع عنها.");
    return;
  }

  // فرضا نقوم بأخذ آخر حدث تم تسجيله
  const lastLog = allLogs[0];
  const confirmUndo = confirm(`هل أنت متأكد من رغبتك في التراجع عن الحدث الأخير؟\n(${lastLog.action}: ${lastLog.details || ""})`);
  
  if (!confirmUndo) return;

  try {
    // يمكنك كتابة الكود البرمجي هنا لعكس التأثير بناءً على نوع الحدث (مثل حذف كلمة أُضيفت، إلخ)
    // وحذف السجل من جدول الـ logs
    await deleteDoc(doc(db, "logs", lastLog.id));
    
    alert("تم التراجع عن التغيير بنجاح.");
    fetchLogs(); // إعادة تحميل السجلات
  } catch (error) {
    console.error("خطأ أثناء التراجع:", error);
    alert("حدث خطأ أثناء محاولة التراجع.");
  }
});

// 6. تصدير السجل إلى PDF
document.getElementById("downloadLogPdfBtn").addEventListener("click", () => {
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

// تفعيل الأحداث للبحث والفلترة الفورية
document.getElementById("logSearchInput").addEventListener("input", filterAndRenderLogs);
document.getElementById("timeRangeFilter").addEventListener("change", filterAndRenderLogs);
