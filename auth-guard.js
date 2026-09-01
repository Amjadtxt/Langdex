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
    getDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

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

// تم إلغاء إخفاء الصفحة بالكامل حتى لا تختفي باقي الصفحات

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            let isAdmin = false;

            // 1. محاولة البحث بالـ UID أولاً
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (String(userData.role).trim().toLowerCase() === "admin") {
                    isAdmin = true;
                }
            } 
            
            // 2. إذا لم تكن موجودة بالـ UID، ابحث بالـ Email
            if (!isAdmin && user.email) {
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("email", "==", user.email));
                const querySnapshot = await getDocs(q);

                querySnapshot.forEach((docSnap) => {
                    const userData = docSnap.data();
                    if (String(userData.role).trim().toLowerCase() === "admin") {
                        isAdmin = true;
                    }
                });
            }

            if (isAdmin) {
                // لو أدمن، يبقى في الصفحة طبيعي
                console.log("Welcome Admin");
            } else {
                // لو يوزر عادي، يتم تحويله للرئيسية فوراً
                window.location.replace("index.html");
            }

        } catch (error) {
            console.error("خطأ في التحقق:", error);
            window.location.replace("index.html");
        }

    } else {
        // غير مسجل دخول -> تحويل لصفحة تسجيل الدخول
        window.location.replace("login.html");
    }
});
