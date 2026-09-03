import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
    let logTime = log.timestamp?.toDate ? log.timestamp.toDate().getTime() : new Date(log.timestamp).getTime();

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

  document.getElementById("todayEventsCount").textContent = todayCount;
  document.getElementById("totalEventsCount").textContent = totalCount;

  renderTable(filtered);
}

// خريطة لعرض اسم العملية بالعربي في الجدول
const ACTION_LABELS = {
  add: "إضافة",
  update: "تعديل",
  delete: "حذف",
  bulk_add: "إضافة جماعية",
  bulk_update: "تعديل جماعي",
  bulk_delete: "حذف جماعي",
  delete_user_full: "حذف مستخدم بالكامل"
};

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

    const actionLabel = ACTION_LABELS[log.action] || log.action || "حدث";
    const undoneTag = log.undone ? ` <span style="color:#e67e22; font-size:11px;">(تم التراجع عنه)</span>` : "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${log.userName || "مستخدم"}</td>
      <td>${actionLabel}${undoneTag}</td>
      <td>${log.details || "-"}</td>
      <td>${log.role || "user"}</td>
      <td>${formattedDate}</td>
    `;
    tableBody.appendChild(tr);
  });
}

// ======================================================
// 5. زر التراجع عن التغيير (Undo) — تراجع حقيقي بناءً على نوع الحدث
// ======================================================

// يرجع أول لوج (الأحدث) لسه مفيهوش تراجع
function getLastUndoableLog() {
  // allLogs مرتبة أصلاً من الأحدث للأقدم (orderBy timestamp desc)
  return allLogs.find(log => !log.undone) || null;
}

async function performUndo(log) {
  const collectionName = log.collectionName || "words";

  switch (log.action) {
    case "add": {
      // التراجع عن إضافة = حذف العنصر اللي اتضاف
      if (!log.targetDocId) throw new Error("لا يوجد معرف عنصر للتراجع.");
      await deleteDoc(doc(db, collectionName, log.targetDocId));
      break;
    }

    case "update": {
      // التراجع عن تعديل = رجّع oldData على نفس الـ doc
      if (!log.targetDocId || !log.oldData) throw new Error("لا توجد بيانات سابقة كافية للتراجع.");
      const docRef = doc(db, collectionName, log.targetDocId);
      const { id, ...fieldsToRestore } = log.oldData; // مانلمسش id الداخلي بتاع الكلمة
      await updateDoc(docRef, fieldsToRestore);
      break;
    }

    case "delete": {
      // التراجع عن حذف = إعادة إضافة العنصر بنفس بياناته القديمة
      if (!log.oldData) throw new Error("لا توجد بيانات كافية لإعادة إضافة العنصر المحذوف.");
      const restoredData = { ...log.oldData };
      // لو مفيش createdAt نحطه دلوقتي عشان الترتيب يفضل شغال
      if (!restoredData.createdAt) restoredData.createdAt = new Date();
      if (log.targetDocId) {
        await setDoc(doc(db, collectionName, log.targetDocId), restoredData);
      } else {
        await addDoc(collection(db, collectionName), restoredData);
      }
      break;
    }

    case "bulk_add": {
      // التراجع عن استيراد جماعي = حذف كل الـ docIds اللي اتضافوا
      const docIds = log.newData?.docIds || [];
      if (docIds.length === 0) throw new Error("لا توجد عناصر مسجلة للتراجع عنها.");
      await Promise.all(docIds.map(id => deleteDoc(doc(db, collectionName, id))));
      break;
    }

    case "bulk_update": {
      // التراجع عن تعديل جماعي (زي تغيير اللغة) = رجّع القيمة القديمة على كل الـ docIds
      const field = log.oldData?.field;
      const oldValue = log.oldData?.value;
      const docIds = log.oldData?.docIds || [];
      if (!field || docIds.length === 0) throw new Error("لا توجد بيانات كافية للتراجع الجماعي.");
      await Promise.all(docIds.map(id => updateDoc(doc(db, collectionName, id), { [field]: oldValue })));
      break;
    }

    case "bulk_delete": {
      // التراجع عن حذف جماعي = إعادة إضافة كل العناصر بنفس بياناتها القديمة
      const items = Array.isArray(log.oldData) ? log.oldData : [];
      if (items.length === 0) throw new Error("لا توجد عناصر مسجلة لإعادتها.");
      await Promise.all(items.map(item => {
        const { _documentId, ...rest } = item;
        const restoredData = { ...rest };
        if (!restoredData.createdAt) restoredData.createdAt = new Date();
        if (_documentId) {
          return setDoc(doc(db, collectionName, _documentId), restoredData);
        }
        return addDoc(collection(db, collectionName), restoredData);
      }));
      break;
    }

    case "delete_user_full": {
      // التراجع عن حذف مستخدم بالكامل = إعادة إنشاء وثيقة اليوزر + كلماته
      // تنبيه: ده بيرجّع بيانات Firestore بس، مش حساب تسجيل الدخول (Auth)
      const userDoc = log.oldData?.userDoc;
      const words = Array.isArray(log.oldData?.words) ? log.oldData.words : [];

      if (userDoc && log.targetDocId) {
        const { email, ...rest } = userDoc;
        await setDoc(doc(db, "users", log.targetDocId), { email, ...rest });
      }

      await Promise.all(words.map(item => {
        const { _documentId, ...rest } = item;
        const restoredData = { ...rest };
        if (!restoredData.createdAt) restoredData.createdAt = new Date();
        if (_documentId) {
          return setDoc(doc(db, "words", _documentId), restoredData);
        }
        return addDoc(collection(db, "words"), restoredData);
      }));

      showNotice("تم إرجاع بيانات المستخدم وكلماته، لكن لازم تعمل له حساب دخول (Auth) يدوياً من جديد لو محتاج يسجل دخول.");
      break;
    }

    default:
      throw new Error(`نوع الحدث (${log.action}) غير مدعوم للتراجع التلقائي حالياً.`);
  }

  // 🌟 بعد التراجع بنجاح، نعلّم اللوج بدل ما نمسحه، عشان يفضل موجود كدليل
  await updateDoc(doc(db, "logs", log.id), { undone: true });
}

function showNotice(message) {
  // إشعار بسيط لو مفيش نظام إشعارات جاهز في الصفحة
  alert(message);
}

document.getElementById("undoActionBtn").addEventListener("click", async () => {
  if (allLogs.length === 0) {
    alert("لا توجد سجلات للتراجع عنها.");
    return;
  }

  const lastLog = getLastUndoableLog();
  if (!lastLog) {
    alert("لا يوجد حدث آخر متاح للتراجع عنه (كل الأحداث المسجلة تم التراجع عنها بالفعل).");
    return;
  }

  const actionLabel = ACTION_LABELS[lastLog.action] || lastLog.action;
  const confirmUndo = confirm(`هل أنت متأكد من رغبتك في التراجع عن هذا الحدث؟\n(${actionLabel}: ${lastLog.details || ""})`);

  if (!confirmUndo) return;

  try {
    await performUndo(lastLog);
    alert("تم التراجع عن التغيير بنجاح.");
    fetchLogs(); // إعادة تحميل السجلات
  } catch (error) {
    console.error("خطأ أثناء التراجع:", error);
    alert(`حدث خطأ أثناء محاولة التراجع: ${error.message || ""}`);
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
