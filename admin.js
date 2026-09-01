// ======================================================
// LANGDEX - auth-guard.js
// Protect Admin Page
// ======================================================

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


// CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCKshc43zO6DYwfPheHH9CsraX3VpU2fjc",
  authDomain: "langdex.firebaseapp.com",
  projectId: "langdex",
  storageBucket: "langdex.firebasestorage.app",
  messagingSenderId: "819838317933",
  appId: "1:819838317933:web:cae7f4531ea32f958c5664",
  measurementId: "G-F60CC2CDCJ"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// إخفاء المحتوى مؤقتاً لحين التحقق من الصلاحيات
document.body.style.display = "none";

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        // غير مسجل دخول -> تحويل لصفحة الدخول
        window.location.replace("login.html");
        return;
    }

    try {
        // قراءة الـ role من Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists() && userDocSnap.data().role === "admin") {
            // أدمن معتمد -> إظهار الصفحة
            document.body.style.display = "block";
        } else {
            // مستخدم عادي -> تحويل للصفحة الرئيسية
            window.location.replace("index.html");
        }

    } catch (error) {
        console.error("Auth Guard Error:", error);
        window.location.replace("index.html");
    }

});
