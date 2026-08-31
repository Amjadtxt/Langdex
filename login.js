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

const emailInput =
    document.querySelector("#login-email");

const passwordInput =
    document.querySelector("#login-password");

const loginButton =
    document.querySelector("#login-btn");

const message =
    document.querySelector("#login-message");


// ======================================================
// MESSAGE
// ======================================================

function showMessage(text) {

    if (!message) return;

    message.textContent = text;
    message.style.color = "#FFFFFF";

}


// ======================================================
// LOGIN
// ======================================================

if (loginButton) {

    loginButton.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();


            // ==================================================
            // GET VALUES
            // ==================================================

            const email =
                emailInput
                    ? emailInput.value.trim()
                    : "";

            const password =
                passwordInput
                    ? passwordInput.value
                    : "";


            // ==================================================
            // VALIDATION
            // ==================================================

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


            // ==================================================
            // START LOGIN
            // ==================================================

            try {

                loginButton.disabled = true;

                loginButton.textContent =
                    "جاري تسجيل الدخول...";


                // ==================================================
                // FIREBASE LOGIN
                // ==================================================

                const userCredential =
                    await signInWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                const user =
                    userCredential.user;


                console.log(
                    "Login successful:",
                    user.email
                );


                // ==================================================
                // SUCCESS
                // ==================================================

                showMessage(
                    "تم تسجيل الدخول بنجاح."
                );


                // ==================================================
                // GO DIRECTLY TO INDEX
                // ==================================================

                window.location.replace(
                    "index.html"
                );


            } catch (error) {

                console.error(
                    "Firebase Login Error:",
                    error.code,
                    error.message
                );


                // ==================================================
                // FIREBASE ERRORS
                // ==================================================

                switch (error.code) {

                    case "auth/invalid-credential":

                        showMessage(
                            "البريد الإلكتروني أو كلمة المرور غير صحيحة."
                        );

                        break;


                    case "auth/invalid-email":

                        showMessage(
                            "البريد الإلكتروني غير صحيح."
                        );

                        break;


                    case "auth/user-disabled":

                        showMessage(
                            "هذا الحساب تم تعطيله."
                        );

                        break;


                    case "auth/user-not-found":

                        showMessage(
                            "هذا الحساب غير موجود."
                        );

                        break;


                    case "auth/wrong-password":

                        showMessage(
                            "كلمة المرور غير صحيحة."
                        );

                        break;


                    case "auth/too-many-requests":

                        showMessage(
                            "تمت محاولات كثيرة، حاول مرة أخرى لاحقًا."
                        );

                        break;


                    case "auth/network-request-failed":

                        showMessage(
                            "مشكلة في الاتصال بالإنترنت."
                        );

                        break;


                    case "auth/operation-not-allowed":

                        showMessage(
                            "تسجيل الدخول بالبريد الإلكتروني غير مفعل في Firebase."
                        );

                        break;


                    default:

                        showMessage(
                            "حدث خطأ: " + error.code
                        );

                        break;

                }


                // ==================================================
                // ENABLE BUTTON AGAIN
                // ==================================================

                loginButton.disabled =
                    false;

                loginButton.textContent =
                    "تسجيل الدخول";

            }

        }
    );

}