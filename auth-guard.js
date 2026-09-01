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


// نخفي الصفحة لحد ما Firebase يحدد حالة المستخدم وصلاحياته
document.documentElement.style.visibility = "hidden";


onAuthStateChanged(auth, async (user) => {

    if (user) {

        try {
            // التحقق من قاعدة البيانات (كولكشن users) هل المستخدم أدمن فعلاً أم لا؟
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            let isAdmin = false;

            if (userDoc.exists()) {
                const userData = userDoc.data();
                // التحقق من صلاحية الأدمن (حسب الحقل عندك في الـ Database)
                if (userData.role === "admin" || userData.isAdmin === true || userData.adminRole === true) {
                    isAdmin = true;
                }
            }

            if (isAdmin) {
                // لو مسجل دخول وهو أدمن فعلاً -> أظهر الصفحة
                document.documentElement.style.visibility = "visible";
            } else {
                // لو مسجل دخول بس مش أدمن -> متظهرش الصفحة وحوله للرئيسية أو اللوجين
                window.location.replace("index.html");
            }

        } catch (error) {
            console.error("خطأ أثناء التحقق من الصلاحيات:", error);
            window.location.replace("index.html");
        }

    } else {

        // مش مسجل دخول تماماً -> متظهرش الصفحة وحوله للوجين
        window.location.replace("login.html");

    }

});
