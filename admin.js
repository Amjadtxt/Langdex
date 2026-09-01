//
// ======================================================
// LANGDEX - admin.js
// Admin Page Protection
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
// INITIALIZE FIREBASE
// ======================================================

const app =
    getApps().length > 0
        ? getApp()
        : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


// ======================================================
// HIDE PAGE UNTIL CHECK IS COMPLETE
// ======================================================

document.documentElement.style.visibility = "hidden";


// ======================================================
// CHECK USER
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
    // GET USER DOCUMENT
    // --------------------------------------------------

    try {

        const userRef =
            doc(db, "users", user.uid);

        const userSnap =
            await getDoc(userRef);


        // ------------------------------------------------
        // USER DOCUMENT NOT FOUND
        // ------------------------------------------------

        if (!userSnap.exists()) {

            console.log("User document not found.");

            window.location.replace("index.html");

            return;
        }


        // ------------------------------------------------
        // GET USER DATA
        // ------------------------------------------------

        const userData =
            userSnap.data();

        console.log("Logged user UID:", user.uid);
        console.log("User data:", userData);
        console.log("User role:", userData.role);


        // ------------------------------------------------
        // CHECK ADMIN
        // ------------------------------------------------

        if (userData.role !== "admin") {

            console.log("Access denied. User is not admin.");

            window.location.replace("index.html");

            return;
        }


        // ------------------------------------------------
        // ADMIN ACCESS GRANTED
        // ------------------------------------------------

        console.log("Admin access granted.");

        document.documentElement.style.visibility =
            "visible";


    } catch (error) {

        console.error(
            "Admin authentication error:",
            error
        );

        window.location.replace("index.html");

    }

});