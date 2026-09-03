import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

/**
 * دالة تسجيل أي عمل في السجل (Logs)
 * @param {Object} db - كائن قاعدة البيانات Firestore
 * @param {string} actionName - اسم الحدث (مثلاً: "إضافة كلمة", "حذف مستخدم")
 * @param {string} details - تفاصيل العملية
 * @param {string} targetCollection - اسم المجموعة في قاعدة البيانات (مثل: "words", "users")
 * @param {string} targetId - ID العنصر الذي حدث عليه التغيير (لتمكين زر التراجع)
 * @param {Object|null} oldData - البيانات القديمة قبل التعديل (اختياري)
 */
export async function logAction(db, actionName, details, targetCollection = null, targetId = null, oldData = null) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    const userName = user ? (user.displayName || user.email || "مستخدم") : "مستخدم غير معروف";
    const userRole = "admin"; // يمكنك استبدالها برول المستخدم الحالي لو متاح

    await addDoc(collection(db, "logs"), {
      userName: userName,
      action: actionName,
      details: details || "-",
      role: userRole,
      targetCollection: targetCollection,
      targetId: targetId,
      oldData: oldData ? JSON.stringify(oldData) : null,
      timestamp: serverTimestamp()
    });

    console.log(`[Log] تم تسجيل الحدث بنجاح: ${actionName}`);
  } catch (error) {
    console.error("خطأ أثناء كتابة السجل (Log):", error);
  }
}
