import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCKshc43zO6DYwfPheHH9CsraX3VpU2fjc",
  authDomain: "langdex.firebaseapp.com",
  projectId: "langdex",
  storageBucket: "langdex.firebasestorage.app",
  messagingSenderId: "819838317933",
  appId: "1:819838317933:web:cae7f4531ea32f958c5664",
  measurementId: "G-F60CC2CDCJ"
};

const app =
    getApps().length > 0
        ? getApp()
        : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

// قائمة الإيميلات الأدمن الاحتياطية (لو حابب) أو الاعتماد على الداتا بيز
const ADMIN_EMAILS = ["amjadtxt@gmail.com"];

// إنشاء شاشة التحميل بنفس لون خلفية الموقع وخط أبيض
const loaderOverlay = document.createElement("div");
loaderOverlay.id = "auth-loader-overlay";
loaderOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: #121212;
    color: #ffffff;
    z-index: 9999999999;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: 'Cairo', Arial, sans-serif;
    font-size: 20px;
    font-weight: bold;
    direction: rtl;
`;
loaderOverlay.textContent = "جاري التحميل...";

// إدراج شاشة التحميل في الصفحة فوراً
if (document.body) {
    document.body.appendChild(loaderOverlay);
} else {
    document.addEventListener("DOMContentLoaded", () => {
        document.body.appendChild(loaderOverlay);
    });
}

// دالة فحص الأدمن من قاعدة البيانات (Firestore)
async function verifyAdminPermission(user) {
    if (!user || !user.email) return false;
    const email = user.email.toLowerCase().trim();

    if (ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === email)) {
        return true;
    }

    try {
        const customDocId = email.replace(/[^a-zA-Z0-9]/g, "_");
        const userDocRef = doc(db, "users", customDocId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            if (data.role && String(data.role).toLowerCase().trim() === "admin") {
                return true;
            }
        }
    } catch (err) {
        console.error("Admin role check error:", err);
    }

    return false;
}

// نخفي الصفحة لحد ما Firebase وقاعدة البيانات يحددوا حالة المستخدم وصلاحيته
document.documentElement.style.visibility = "hidden";


onAuthStateChanged(auth, async (user) => {

    if (user) {

        // مسجل دخول - جاري التحقق من صلاحية الأدمن في الداتا بيز
        const isAdmin = await verifyAdminPermission(user);

        if (isAdmin) {
            // طلع أدمن حقيقي: أظهر الصفحة وشيل شاشة التحميل
            document.documentElement.style.visibility = "visible";
            if (loaderOverlay && loaderOverlay.parentNode) {
                loaderOverlay.remove();
            }
        } else {
            // مسجل بس مش أدمن: شيل شاشة التحميل وحوله للـ index فوراً
            if (loaderOverlay && loaderOverlay.parentNode) {
                loaderOverlay.remove();
            }
            window.location.replace("index.html");
        }

    } else {

        // مش مسجل: شيل شاشة التحميل وحوله للـ login فوراً
        if (loaderOverlay && loaderOverlay.parentNode) {
            loaderOverlay.remove();
        }
        window.location.replace("login.html");

    }

});
