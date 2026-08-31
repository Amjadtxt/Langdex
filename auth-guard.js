// ======================================================
// LANGDEX - auth-guard.js
// Protect pages + Username + Logout
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

const usernameElement =
    document.querySelector("#username");

const logoutButton =
    document.querySelector("#logout-btn");


// ======================================================
// AUTH GUARD
// ======================================================

onAuthStateChanged(auth, (user) => {

    // --------------------------------------
    // NOT LOGGED IN
    // --------------------------------------

    if (!user) {

        window.location.replace("login.html");

        return;
    }


    // --------------------------------------
    // LOGGED IN
    // --------------------------------------

    if (usernameElement) {

        const email =
            user.email || "User";

        // يأخذ الكلام قبل @

        const username =
            email.split("@")[0];

        usernameElement.textContent =
            `مرحباً، ${username}`;

    }

});


// ======================================================
// LOGOUT
// ======================================================

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async () => {

            try {

                await signOut(auth);

                // بعد الخروج يرجع لصفحة تسجيل الدخول

                window.location.replace(
                    "login.html"
                );

            } catch (error) {

                console.error(
                    "Logout Error:",
                    error
                );

            }

        }
    );

}