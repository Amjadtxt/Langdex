// ======================================================
// LANGDEX - login.js
// Firebase Authentication - Login
// ======================================================

import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword
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
// INITIALIZE FIREBASE SAFELY
// ======================================================

const app =
    getApps().length > 0
        ? getApp()
        : initializeApp(firebaseConfig);


const auth = getAuth(app);


// ======================================================
// ELEMENTS
// ======================================================

const emailInput =
    document.querySelector("#login-email");

const passwordInput =
    document.querySelector("#login-password");

const loginButton =
    document.querySelector("#login-btn");

const message =
    document.querySelector("#login-message");


// ======================================================
// LOGIN
// ======================================================

if (loginButton) {

    loginButton.addEventListener(
        "click",
        async function () {

            const email =
                emailInput
                    ? emailInput.value.trim()
                    : "";

            const password =
                passwordInput
                    ? passwordInput.value
                    : "";


            // --------------------------------------
            // VALIDATION
            // --------------------------------------

            if (!email) {

                showMessage(
                    "اكتب البريد الإلكتروني."
                );

                return;

            }


            if (!password) {

                showMessage(
                    "اكتب كلمة المرور."
                );

                return;

            }


            // --------------------------------------
            // LOGIN
            // --------------------------------------

            try {

                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


                showMessage(
                    "تم تسجيل الدخول بنجاح."
                );


                // --------------------------------------
                // GO TO INDEX
                // --------------------------------------

                setTimeout(() => {

                    window.location.replace(
                        "index.html"
                    );

                }, 500);


            } catch (error) {

                console.error(
                    "Firebase Login Error:",
                    error
                );


                // --------------------------------------
                // FIREBASE ERRORS
                // --------------------------------------

                if (
                    error.code ===
                    "auth/invalid-credential"
                ) {

                    showMessage(
                        "البريد الإلكتروني أو كلمة المرور غير صحيحة."
                    );

                }

                else if (
                    error.code ===
                    "auth/user-not-found"
                ) {

                    showMessage(
                        "هذا الحساب غير موجود."
                    );

                }

                else if (
                    error.code ===
                    "auth/wrong-password"
                ) {

                    showMessage(
                        "كلمة المرور غير صحيحة."
                    );

                }

                else if (
                    error.code ===
                    "auth/invalid-email"
                ) {

                    showMessage(
                        "البريد الإلكتروني غير صحيح."
                    );

                }

                else if (
                    error.code ===
                    "auth/too-many-requests"
                ) {

                    showMessage(
                        "تمت محاولات كثيرة، حاول مرة أخرى لاحقًا."
                    );

                }

                else {

                    showMessage(
                        "حدث خطأ في تسجيل الدخول."
                    );

                }

            }

        }
    );

}


// ======================================================
// MESSAGE
// ======================================================

function showMessage(text) {

    if (!message) return;

    message.textContent =
        text;

    message.style.color =
        "#FFFFFF";

}