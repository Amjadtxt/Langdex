// ======================================================
// LANGDEX - user-bar.js
// Username + Logout
// ======================================================

import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";


// ======================================================
// FIREBASE CONFIG
// ======================================================

const firebaseConfig = {
    apiKey: "AIzaSyCKsh43cO6DYwfPheHH9CsraX3VpU2fjc",
    authDomain: "langdex.firebaseapp.com",
    projectId: "langdex",
    storageBucket: "langdex.firebasestorage.app",
    messagingSenderId: "819838317933",
    appId: "1:819838317933:web:cae7f4531ea32f958c5664",
    measurementId: "G-F60CC2CDCJ"
};


// ======================================================
// INITIALIZE FIREBASE
// ======================================================

const app =
    getApps().length > 0
        ? getApp()
        : initializeApp(firebaseConfig);

const auth = getAuth(app);


// ======================================================
// ELEMENTS
// ======================================================

const username =
    document.querySelector("#username");

const logoutButton =
    document.querySelector("#logout-btn");


// ======================================================
// SHOW USERNAME
// ======================================================

onAuthStateChanged(auth, (user) => {

    if (!user) return;

    if (username) {

        // مثال:
        // hello@gmail.com
        // تصبح:
        // hello

        const email =
            user.email || "";

        const name =
            email.split("@")[0];

        username.textContent =
            `مرحباً، ${name}`;

    }

});


// ======================================================
// LOGOUT
// ======================================================

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async function () {

            try {

                logoutButton.disabled = true;

                await signOut(auth);

                // الرجوع إلى صفحة تسجيل الدخول

                window.location.replace(
                    "login.html"
                );

            } catch (error) {

                console.error(
                    "Logout Error:",
                    error
                );

                logoutButton.disabled = false;

                alert(
                    "حدث خطأ أثناء تسجيل الخروج."
                );

            }

        }
    );

}