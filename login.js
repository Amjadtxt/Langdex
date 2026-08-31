

// ======================================================
// LANGDEX - LOGIN
// ======================================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";


// ======================================================
// FIREBASE CONFIG
// ======================================================

const firebaseConfig = {
    apiKey: "AIzaSyCKshc43O6DYwfPheHH9CsraX3VpU2fjc",
    authDomain: "langdex.firebaseapp.com",
    projectId: "langdex",
    storageBucket: "langdex.firebasestorage.app",
    messagingSenderId: "819838317933",
    appId: "1:819838317933:web:cae7f4531ea32f958c5664",
    measurementId: "G-F60CC2CDCJ"
};


// ======================================================
// FIREBASE
// ======================================================

const app = initializeApp(firebaseConfig);

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
        async () => {

            const email =
                emailInput.value.trim();

            const password =
                passwordInput.value;


            // ------------------------------
            // VALIDATION
            // ------------------------------

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


            // ------------------------------
            // LOGIN
            // ------------------------------

            try {

                loginButton.disabled =
                    true;

                loginButton.textContent =
                    "جاري تسجيل الدخول...";


                const userCredential =
                    await signInWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                const user =
                    userCredential.user;


                console.log(
                    "Logged in UID:",
                    user.uid
                );


                showMessage(
                    "تم تسجيل الدخول بنجاح."
                );


                // ------------------------------
                // GO TO HOME
                // ------------------------------

                setTimeout(() => {

                    window.location.href =
                        "index.html";

                }, 800);


            } catch (error) {

                console.error(
                    "Login Error:",
                    error
                );


                let errorMessage =
                    "حدث خطأ أثناء تسجيل الدخول.";


                if (
                    error.code ===
                    "auth/invalid-credential"
                ) {

                    errorMessage =
                        "البريد الإلكتروني أو كلمة المرور غير صحيحة.";

                }

                else if (
                    error.code ===
                    "auth/user-not-found"
                ) {

                    errorMessage =
                        "هذا الحساب غير موجود.";

                }

                else if (
                    error.code ===
                    "auth/wrong-password"
                ) {

                    errorMessage =
                        "كلمة المرور غير صحيحة.";

                }

                else if (
                    error.code ===
                    "auth/invalid-email"
                ) {

                    errorMessage =
                        "البريد الإلكتروني غير صحيح.";

                }

                else if (
                    error.code ===
                    "auth/network-request-failed"
                ) {

                    errorMessage =
                        "تأكد من اتصال الإنترنت.";

                }


                showMessage(
                    errorMessage
                );


                loginButton.disabled =
                    false;

                loginButton.textContent =
                    "تسجيل الدخول";

            }

        }
    );

}