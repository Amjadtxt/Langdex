// ======================================================
// 1. حماية صفحة الـ Admin والتحقق من صلاحيات الأدمن
// ======================================================
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

onAuthStateChanged(auth, async user => {
    const currentPath = window.location.pathname.toLowerCase();
    const currentUrl = window.location.href.toLowerCase();
    const isAdminPage = currentPath.includes("admin") || currentUrl.includes("admin");

    if (isAdminPage) {
        if (!user) {
            // لو مش مسجل دخول، حوله للرئيسية
            window.location.href = "/Langdex/index.html";
            return;
        }

        try {
            // التحقق من قاعدة البيانات لمعرفة ما إذا كان المستخدم أدمن أم لا
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            let isAdmin = false;

            if (userDoc.exists()) {
                const userData = userDoc.data();
                // التحقق من دور الأدمن (حسب هيكل قاعدة البيانات لديك)
                if (userData.role === "admin" || userData.isAdmin === true || userData.adminRole === true) {
                    isAdmin = true;
                }
            }

            // لو اليوزر مش أدمن، امنعه وحوله فوراً لصفحة index.html
            if (!isAdmin) {
                alert("عذراً، هذه الصفحة مخصصة للمديرين فقط!");
                window.location.href = "/Langdex/index.html";
                return;
            } else {
                console.log("تم التحقق بنجاح: المستخدم مسجل كـ Admin.");
                
                // ======================================================
                // 2. تفعيل كود الـ Upload Data وتشغيل الصفحة للأدمن
                // ======================================================
                // ضع هنا الكود الخاص بتفعيل وظائف صفحة الـ Admin والرفع:
                const uploadSection = document.getElementById("uploadSection"); // أو معرف عنصر الرفع لديك
                if (uploadSection) {
                    uploadSection.style.display = "block"; // إظهار جزء الرفع للأدمن فقط
                }
            }

        } catch (error) {
            console.error("خطأ أثناء التحقق من الصلاحيات:", error);
            window.location.href = "/Langdex/index.html";
        }
    }
});
