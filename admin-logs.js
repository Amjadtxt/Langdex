import { db } from "/Langdex/firebase-config.js"; // قم بتعديل مسار ملف Firebase حسب مشروعك
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const logsTableBody = document.getElementById("logsTableBody");
const undoLastBtn = document.getElementById("undoLastBtn");

let cachedLogs = [];

// 1. تحميل عرض اللوجات من داتابيز Firebase
async function loadLogs() {
  try {
    const logsQuery = query(collection(db, "logs"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(logsQuery);
    
    cachedLogs = [];
    snapshot.forEach(docSnap => {
      cachedLogs.push({ id: docSnap.id, ...docSnap.data() });
    });

    renderLogsTable(cachedLogs);
  } catch (error) {
    console.error("خطأ أثناء تحميل السجل:", error);
    logsTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ff6b6b;">فشل تحميل السجل</td></tr>`;
  }
}

// 2. رسم الجدول في الصفحة
function renderLogsTable(logs) {
  if (logs.length === 0) {
    logsTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">لا توجد سجلات مسجلة حالياً</td></tr>`;
    return;
  }

  logsTableBody.innerHTML = logs.map((log, index) => {
    const badgeClass = getBadgeClass(log.actionType);
    const actionName = getActionLabel(log.actionType);
    const formattedDate = formatDate(log.createdAt);

    return `
      <tr>
        <td>${index + 1}</td>
        <td><span class="badge ${badgeClass}">${actionName}</span></td>
        <td style="text-align: right;">${log.details || "بدون تفاصيل"}</td>
        <td>${log.performedBy || "أدمن"}</td>
        <td>${formattedDate}</td>
        <td>
          <button class="btn-table-undo" data-id="${log.id}">تراجع</button>
        </td>
      </tr>
    `;
  }).join('');

  // إضافة المستمعات لأزرار التراجع
  document.querySelectorAll(".btn-table-undo").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const logId = e.target.getAttribute("data-id");
      handleUndo(logId);
    });
  });
}

// 3. المحرك الرئيسي للتراجع باستغلال oldData
async function handleUndo(logId) {
  const log = cachedLogs.find(l => l.id === logId);
  if (!log) return;

  if (!confirm(`هل أنت تأكد من التراجع عن عملية: (${log.details})؟`)) {
    return;
  }

  try {
    const targetColl = log.targetCollection || "words";

    switch (log.actionType) {
      case "add":
        // إضافة -> التراجع عنها يكون بحذف العنصر الذي أضيف
        if (log.targetId) {
          await deleteDoc(doc(db, targetColl, log.targetId.toString()));
        }
        break;

      case "edit":
        // تعديل -> التراجع بإعادة الـ oldData إلى مستند العنصر
        if (log.targetId && log.oldData) {
          await setDoc(doc(db, targetColl, log.targetId.toString()), log.oldData, { merge: true });
        }
        break;

      case "delete":
        // حذف فردي -> التراجع بإعادة إنشاء المستند كاملاً من oldData
        if (log.targetId && log.oldData) {
          await setDoc(doc(db, targetColl, log.targetId.toString()), log.oldData);
        }
        break;

      case "bulk_delete":
      case "range_delete":
      case "category_delete":
        // حذف مجموعة -> التراجع بالمرور على المصفوفة في oldData وإعادة إنشائها
        if (Array.isArray(log.oldData) && log.oldData.length > 0) {
          for (const item of log.oldData) {
            const itemId = item.id || item.docId;
            if (itemId) {
              const itemData = { ...item };
              delete itemData.id;
              delete itemData.docId;
              await setDoc(doc(db, targetColl, itemId.toString()), itemData);
            }
          }
        }
        break;

      case "delete_user":
        // حذف مستخدم -> إعادة بيانات المستخدم وكافة الكلمات الخاصة به المسجلة في oldData
        if (log.oldData) {
          if (log.oldData.userData && log.targetId) {
            await setDoc(doc(db, "users", log.targetId.toString()), log.oldData.userData);
          }
          if (Array.isArray(log.oldData.userWords)) {
            for (const word of log.oldData.userWords) {
              const wId = word.id || word.docId;
              const wData = { ...word };
              delete wData.id;
              delete wData.docId;
              await setDoc(doc(db, "words", wId.toString()), wData);
            }
          }
        }
        break;

      default:
        alert("نوع العملية غير معروف للتراجع عنه");
        return;
    }

    // حذف سجل اللوج بعد نجاح عملية التراجع عنه
    await deleteDoc(doc(db, "logs", logId));

    alert("تم التراجع عن العملية بنجاح!");
    loadLogs(); // إعادة تحميل السجل

  } catch (err) {
    console.error("خطأ أثناء تنفيذ التراجع:", err);
    alert("حدث خطأ أثناء محاولة التراجع: " + err.message);
  }
}

// 4. التراجع عن آخر عملية
undoLastBtn.addEventListener("click", () => {
  if (cachedLogs.length === 0) {
    alert("لا توجد عمليات للتراجع عنها");
    return;
  }
  handleUndo(cachedLogs[0].id);
});

// أدوات مساعدة للتنسيق والـ Formatting
function getBadgeClass(type) {
  switch (type) {
    case "add": return "badge-add";
    case "edit": return "badge-edit";
    case "delete": return "badge-delete";
    default: return "badge-bulk";
  }
}

function getActionLabel(type) {
  switch (type) {
    case "add": return "إضافة";
    case "edit": return "تعديل";
    case "delete": return "حذف";
    case "bulk_delete": return "حذف جماعي";
    case "range_delete": return "حذف نطاق";
    case "category_delete": return "تغيير/حذف تصنيف";
    case "delete_user": return "حذف مستخدم";
    default: return "عملية";
  }
}

function formatDate(timestamp) {
  if (!timestamp) return "-";
  let dateObj = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return dateObj.toLocaleString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// بدء التشغيل عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", loadLogs);
