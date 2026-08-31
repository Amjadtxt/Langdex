// ======================================================
// LANGDEX - auth-guard.js
// Protect index.html + data.html
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
// HIDE PAGE IMMEDIATELY
// ======================================================

document.documentElement.style.visibility = "hidden";


// ======================================================
// AUTH CHECK
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

    document.documentElement.style.visibility = "visible";

});