import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";


// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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


// نخفي الصفحة لحد ما Firebase يحدد حالة المستخدم
document.documentElement.style.visibility = "hidden";


onAuthStateChanged(auth, (user) => {

    if (user) {

        // مسجل دخول
        // أظهر الصفحة

        document.documentElement.style.visibility = "visible";

    } else {

        // مش مسجل
        // متظهرش الصفحة وحوله للوجين

        window.location.replace("login.html");

    }

});
