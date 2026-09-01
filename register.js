// ======================================================
// LANGDEX - REGISTER
// ======================================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

// استيراد خدمات Firestore
import {
    getFirestore,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// ======================================================
// FIREBASE CONFIG
// ======================================================

const firebaseConfig = {
  apiKey: "AIzaSyCKshc43zO6DYwfPheHH9CsraX3VpU2fjc",
  authDomain: "langdex.firebaseapp.com",
  projectId: "langdex",
  storageBucket: "langdex.firebasestorage.app",
  messagingSenderId: "819838317933",
  appId: "1:819838317933:web:cae7f4531ea32f958c5664",
  measurementId: "G-F60CC2CDCJ"
};


// ======================================================
// FIREBASE INITIALIZATION
// ======================================================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // تهيئة قاعدة بيانات Firestore


// ======================================================
// ELEMENTS
// ======================================================

const emailInput =
    document.querySelector("#register-email");

const passwordInput =
    document.querySelector("#register-password");

const confirmPasswordInput =
    document.querySelector("#register-confirm-password");

const registerButton =
    document.querySelector("#register-btn");

const message =
    document.querySelector("#register-message");


// ======================================================
// MESSAGE
// ======================================================

function showMessage(text, success = false) {

    if (!message) return;

    message.textContent = text;

    message.style.color = "#FFFFFF";

}


// ======================================================
// REGISTER
// ======================================================

if (registerButton) {

    registerButton.addEventListener(
        "click",
        async () => {

            const email =
                emailInput.value.trim();

            const password =
                passwordInput.value;

            const confirmPassword =
                confirmPasswordInput.value;


            // ------------------------------
            // VALIDATION
            // ------------------------------

            if (!email) {
                showMessage("اكتب البريد الإلكتروني.");
                return;
            }

            if (!password) {
                showMessage("اكتب كلمة المرور.");
                return;
            }

            if (password.length < 6) {
                showMessage("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
                return;
            }

            if (password !== confirmPassword) {
                showMessage("كلمتا المرور غير متطابقتين.");
                return;
            }


            // ------------------------------
            // CREATE ACCOUNT & SAVE ROLE
            // ------------------------------

            try {

                registerButton.disabled = true;

                registerButton.textContent =
                    "جاري إنشاء الحساب...";


                // 1. إنشاء الحساب في Authentication
                const userCredential =
                    await createUserWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );

                const user = userCredential.user;


                // 2. إنشاء مستند المستخدم في Firestore وإضافة الـ Role
                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid,
                    email: user.email,
                    role: "user",
                    createdAt: serverTimestamp()
                });


                console.log(
                    "User registered & saved to Firestore:",
                    user.uid
                );


                showMessage(
                    "تم إنشاء الحساب بنجاح."
                );


                // ------------------------------
                // GO TO LOGIN
                // ------------------------------

                setTimeout(() => {

                    window.location.href =
                        "login.html";

                }, 1200);


            } catch (error) {

                console.error(
                    "Register Error:",
                    error
                );


                let errorMessage =
                    "حدث خطأ أثناء إنشاء الحساب.";


                if (
                    error.code ===
                    "auth/email-already-in-use"
                ) {

                    errorMessage =
                        "هذا البريد الإلكتروني مستخدم بالفعل.";

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
                    "auth/weak-password"
                ) {

                    errorMessage =
                        "كلمة المرور ضعيفة.";

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


                registerButton.disabled =
                    false;

                registerButton.textContent =
                    "إنشاء الحساب";

            }

        }
    );

}
