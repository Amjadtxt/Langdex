// ======================================================
// LANGDEX - admin.js
// Admin Panel Protection
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

import {
    getFirestore,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


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
// FIREBASE
// ======================================================

const app =
    getApps().length > 0
        ? getApp()
        : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


// ======================================================
// HIDE PAGE
// ======================================================

document.documentElement.style.visibility = "hidden";


// ======================================================
// CHECK ADMIN
// ======================================================

onAuthStateChanged(auth, async (user) => {

    // --------------------------------------------------
    // NOT LOGGED IN
    // --------------------------------------------------

    if (!user) {

        window.location.replace("login.html");

        return;
    }


    // --------------------------------------------------
    // GET USER DATA
    // --------------------------------------------------

    try {

        const userRef =
            doc(db, "users", user.uid);

        const userSnap =
            await getDoc(userRef);


        // ------------------------------------------------
        // USER DOCUMENT DOESN'T EXIST
        // ------------------------------------------------

        if (!userSnap.exists()) {

            window.location.replace("index.html");

            return;
        }


        const userData =
            userSnap.data();


        // ------------------------------------------------
        // NOT ADMIN
        // ------------------------------------------------

        if (userData.role !== "admin") {

            window.location.replace("index.html");

            return;
        }


        // ------------------------------------------------
        // ADMIN
        // ------------------------------------------------

        document.documentElement.style.visibility =
            "visible";


        console.log(
            "Admin access granted:",
            user.email
        );


    } catch (error) {

        console.error(
            "Admin Check Error:",
            error
        );

        window.location.replace("index.html");

    }

});