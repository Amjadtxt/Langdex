// ======================================================
// LANGDEX - AUTH GUARD
// حماية الصفحات من المستخدمين غير المسجلين
// ======================================================

import {
    initializeApp
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

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);


// ======================================================
// CURRENT PAGE
// ======================================================

const currentPage =
    window.location.pathname
        .split("/")
        .pop();


// ======================================================
// PAGES THAT DO NOT NEED LOGIN
// ======================================================

const publicPages = [
    "login.html",
    "register.html"
];


// ======================================================
// AUTH CHECK
// ======================================================

onAuthStateChanged(auth, (user) => {

    // ------------------------------------------
    // لو الصفحة Login أو Register
    // ------------------------------------------

    if (publicPages.includes(currentPage)) {

        if (user) {

            window.location.href =
                "index.html";

        }

        return;

    }


    // ------------------------------------------
    // باقي الصفحات
    // لازم يكون المستخدم مسجل دخول
    // ------------------------------------------

    if (!user) {

        window.location.replace(
            "login.html"
        );

        return;

    }

});

