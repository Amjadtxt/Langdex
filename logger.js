import { getFirestore, collection, addDoc, doc, deleteDoc, updateDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// دالة تسجيل أي حدث (تستخدمها في أي مكان في المشروع)
export async function logAction(db, actionName, details, targetCollection, targetId, oldData = null) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    // جلب دور المستخدم (Admin أو User) لو حبيت
    let userRole = "user";
    let userName = user ? (user.displayName || user.email) : "مجهول";

    await addDoc(collection(db, "logs"), {
      userName: userName,
      action: actionName, // مثل: "إضافة كلمة", "حذف مستخدم"
      details: details,
      role: userRole,
      targetCollection: targetCollection, // اسم الكوليكشن اللي حصل فيه التغيير (مثلا "words")
      targetId: targetId, // الـ ID بتاع المستند اللي اتعمل عليه التغيير
      oldData: oldData ? JSON.stringify(oldData) : null, // البيانات القديمة لو حبينا نعمل استرجاع
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("خطأ أثناء تسجيل اللوج:", error);
  }
}
