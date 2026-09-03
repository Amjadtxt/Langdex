// ======================================================
// LANGDEX - settings.js
// Firebase Authentication + Firestore - Settings Page
// ======================================================

import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged,
    updateProfile,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    deleteUser
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
    getPrefs,
    savePrefs,
    applyDarkMode
} from "/Langdex/prefs.js";


// ======================================================
// FIREBASE CONFIG
// ======================================================

const firebaseConfig = {
  apiKey: "AIzaSyCKshc43zO6DYwfPheHH9CsraX3VpU2fjc",
  authDomain: "langdex.firebaseapp.com",
  databaseURL: "https://langdex-default-rtdb.firebaseio.com",
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


// ======================================================
// LOCAL HELPERS
// ======================================================

const PREFS_KEY = "langdex_prefs";

function showMsg(el, text, isError = false) {
    if (!el) return;
    el.textContent = text;
    el.style.color = isError ? "#ffb3b3" : "#fff";
    setTimeout(() => { el.textContent = ""; }, 3500);
}


// ======================================================
// ELEMENTS
// ======================================================

const displayNameInput   = document.querySelector("#display-name");
const emailInput         = document.querySelector("#account-email");
const saveProfileBtn     = document.querySelector("#save-profile-btn");

const currentPasswordInp = document.querySelector("#current-password");
const newPasswordInp     = document.querySelector("#new-password");
const changePasswordBtn  = document.querySelector("#change-password-btn");

const accountMsg         = document.querySelector("#account-msg");

const darkToggle      = document.querySelector("#dark-mode-toggle");
const resultsSelect   = document.querySelector("#results-per-page");
const langSelect      = document.querySelector("#default-lang");
const pdfOrientation  = document.querySelector("#pdf-orientation");
const notifyToggle    = document.querySelector("#notify-toggle");
const savePrefsBtn    = document.querySelector("#save-prefs-btn");
const prefsMsg        = document.querySelector("#prefs-msg");

const deleteAccountBtn = document.querySelector("#delete-account-btn");


// ======================================================
// AUTH GUARD + LOAD CURRENT USER
// ======================================================

document.documentElement.style.visibility = "hidden";

let currentUser = null;

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        window.location.replace("login.html");
        return;
    }

    currentUser = user;
    document.documentElement.style.visibility = "visible";

    if (displayNameInput) displayNameInput.value = user.displayName || "";
    if (emailInput) emailInput.value = user.email || "";

    try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            if (!user.displayName && data.name && displayNameInput) {
                displayNameInput.value = data.name;
            }
        }
    } catch (err) {
        console.error("Firestore read error:", err);
    }

    loadPrefs();
});


// ======================================================
// PREFERENCES (localStorage)
// ======================================================

function loadPrefs() {
    const prefs = getPrefs();

    if (darkToggle) {
        darkToggle.checked = !!prefs.darkMode;
        applyDarkMode(prefs.darkMode);
    }
    if (resultsSelect && prefs.resultsPerPage) resultsSelect.value = prefs.resultsPerPage;
    if (langSelect && prefs.defaultLang) langSelect.value = prefs.defaultLang;
    if (pdfOrientation && prefs.pdfOrientation) pdfOrientation.value = prefs.pdfOrientation;
    if (notifyToggle) notifyToggle.checked = prefs.notify !== false;
}

if (darkToggle) {
    darkToggle.addEventListener("change", () => applyDarkMode(darkToggle.checked));
}

if (savePrefsBtn) {
    savePrefsBtn.addEventListener("click", () => {
        savePrefs({
            darkMode: darkToggle ? darkToggle.checked : false,
            resultsPerPage: resultsSelect ? resultsSelect.value : "20",
            defaultLang: langSelect ? langSelect.value : "all",
            pdfOrientation: pdfOrientation ? pdfOrientation.value : "portrait",
            notify: notifyToggle ? notifyToggle.checked : true,
        });
        showMsg(prefsMsg, "تم حفظ التفضيلات بنجاح ");
    });
}


// ======================================================
// UPDATE PROFILE (display name)
// ======================================================

if (saveProfileBtn) {

    saveProfileBtn.addEventListener("click", async () => {

        const newName = displayNameInput ? displayNameInput.value.trim() : "";

        if (!newName) {
            showMsg(accountMsg, "من فضلك أدخل اسم صالح", true);
            return;
        }

        try {
            saveProfileBtn.disabled = true;
            saveProfileBtn.textContent = "جاري الحفظ...";

            await updateProfile(currentUser, { displayName: newName });

            await setDoc(
                doc(db, "users", currentUser.uid),
                { name: newName },
                { merge: true }
            );

            showMsg(accountMsg, "تم تحديث بيانات الحساب ");

        } catch (error) {
            console.error("Update profile error:", error.code, error.message);
            showMsg(accountMsg, "حدث خطأ أثناء حفظ الاسم: " + error.code, true);
        } finally {
            saveProfileBtn.disabled = false;
            saveProfileBtn.textContent = "حفظ بيانات الحساب";
        }
    });
}


// ======================================================
// CHANGE PASSWORD (with re-authentication)
// ======================================================

if (changePasswordBtn) {

    changePasswordBtn.addEventListener("click", async () => {

        const current = currentPasswordInp ? currentPasswordInp.value : "";
        const next = newPasswordInp ? newPasswordInp.value : "";

        if (!current || !next) {
            showMsg(accountMsg, "من فضلك املأ كلمة المرور الحالية والجديدة", true);
            return;
        }

        if (next.length < 6) {
            showMsg(accountMsg, "كلمة المرور الجديدة قصيرة جداً (6 أحرف على الأقل)", true);
            return;
        }

        try {
            changePasswordBtn.disabled = true;
            changePasswordBtn.textContent = "جاري التغيير...";

            const credential = EmailAuthProvider.credential(currentUser.email, current);
            await reauthenticateWithCredential(currentUser, credential);
            await updatePassword(currentUser, next);

            showMsg(accountMsg, "تم تغيير كلمة المرور بنجاح");
            currentPasswordInp.value = "";
            newPasswordInp.value = "";

        } catch (error) {

            console.error("Change password error:", error.code, error.message);

            switch (error.code) {
                case "auth/invalid-credential":
                case "auth/wrong-password":
                    showMsg(accountMsg, "كلمة المرور الحالية غير صحيحة.", true);
                    break;
                case "auth/too-many-requests":
                    showMsg(accountMsg, "محاولات كثيرة، حاول لاحقًا.", true);
                    break;
                case "auth/weak-password":
                    showMsg(accountMsg, "كلمة المرور الجديدة ضعيفة جداً.", true);
                    break;
                default:
                    showMsg(accountMsg, "حدث خطأ: " + error.code, true);
                    break;
            }

        } finally {
            changePasswordBtn.disabled = false;
            changePasswordBtn.textContent = "تغيير كلمة المرور";
        }
    });
}


// ======================================================
// DELETE ACCOUNT
// ======================================================

if (deleteAccountBtn) {

    deleteAccountBtn.addEventListener("click", async () => {

        const sure = confirm("هل أنت متأكد من حذف الحساب نهائياً؟ لا يمكن التراجع عن هذا الإجراء.");
        if (!sure) return;

        const current = prompt("لتأكيد الحذف، اكتب كلمة المرور الحالية:");
        if (!current) return;

        try {
            const credential = EmailAuthProvider.credential(currentUser.email, current);
            await reauthenticateWithCredential(currentUser, credential);

            await deleteDoc(doc(db, "users", currentUser.uid));
            await deleteUser(currentUser);

            localStorage.removeItem(PREFS_KEY);
            window.location.replace("login.html");

        } catch (error) {
            console.error("Delete account error:", error.code, error.message);
            showMsg(accountMsg, "تعذر حذف الحساب: " + error.code, true);
        }
    });
}
