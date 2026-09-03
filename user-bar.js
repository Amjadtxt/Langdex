// ======================================================
// LANGDEX - user-bar.js
// Username + Logout + استقبال إشعارات الأدمن
// ======================================================

import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


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
// ELEMENTS
// ======================================================

const username =
    document.querySelector("#username");

const logoutButton =
    document.querySelector("#logout-btn");


// ======================================================
// USERNAME + استدعاء الإشعارات
// ======================================================

onAuthStateChanged(auth, (user) => {

    if (!user) return;

    const email =
        user.email || "";

    // الجزء قبل @
    const name =
        email.split("@")[0];

    if (username) {
        username.textContent =
            `مرحباً، ${name}`;
    }

    checkAndShowNotifications(user);
});


// ======================================================
// LOGOUT
// ======================================================

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async function () {

            try {

                await signOut(auth);

                window.location.replace(
                    "login.html"
                );

            } catch (error) {

                console.error(
                    "Logout Error:",
                    error
                );

            }

        }
    );

}


// ======================================================
// 🔔 استقبال وعرض إشعارات الأدمن
// ======================================================

async function checkAndShowNotifications(user) {
    try {
        const notificationsCollection = collection(db, "notifications");
        const userEmail = (user.email || "").toLowerCase().trim();

        // إشعارات لكل المستخدمين + إشعارات خاصة بالإيميل ده، غير المقروءة
        const qAll = query(notificationsCollection, where("target", "==", "all"), where("read", "==", false));
        const qSpecific = query(notificationsCollection, where("target", "==", userEmail), where("read", "==", false));

        const [snapAll, snapSpecific] = await Promise.all([
            getDocs(qAll),
            getDocs(qSpecific)
        ]);

        const notifs = [];
        snapAll.forEach(d => notifs.push({ id: d.id, ...d.data() }));
        snapSpecific.forEach(d => notifs.push({ id: d.id, ...d.data() }));

        if (notifs.length === 0) return;

        // ترتيب الأحدث أولاً (لو فيه createdAt)
        notifs.sort((a, b) => {
            const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
            const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
            return tb - ta;
        });

        showNotificationsPopup(notifs, userEmail);

    } catch (error) {
        console.error("Notifications fetch error:", error);
    }
}

function showNotificationsPopup(notifs, userEmail) {
    const overlay = document.createElement("div");
    overlay.id = "langdex-notify-overlay";
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.6);
        z-index: 99999999; display: flex; align-items: center; justify-content: center;
        font-family: 'Cairo', Arial, sans-serif; direction: rtl; padding: 15px; box-sizing: border-box;
    `;

    const box = document.createElement("div");
    box.style.cssText = `
        background: #2c2f33; color: #fff; width: 100%; max-width: 420px;
        border-radius: 12px; padding: 20px; box-shadow: 0 8px 30px rgba(0,0,0,0.4);
        max-height: 80vh; overflow-y: auto;
    `;

    let itemsHtml = "";
    notifs.forEach(n => {
        let dateStr = "";
        if (n.createdAt?.toDate) {
            dateStr = n.createdAt.toDate().toLocaleString("ar-EG");
        }
        itemsHtml += `
            <div style="background:#3a3f44; border-radius:8px; padding:12px; margin-bottom:10px; border-right:4px solid #00bcd4;">
                <p style="margin:0 0 6px; font-size:14px; line-height:1.6;">${n.message}</p>
                <span style="font-size:11px; color:#aaa;">${dateStr}</span>
            </div>
        `;
    });

    box.innerHTML = `
        <h3 style="margin:0 0 15px; text-align:center; font-size:18px;">🔔 لديك إشعارات جديدة</h3>
        ${itemsHtml}
        <button id="closeNotifyPopup" style="
            width:100%; margin-top:10px; padding:12px; border:none; border-radius:8px;
            background:#00bcd4; color:#fff; font-weight:bold; font-family:'Cairo',sans-serif;
            font-size:14px; cursor:pointer;
        ">تم الاطلاع</button>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.querySelector("#closeNotifyPopup").addEventListener("click", async () => {
        overlay.remove();
        // تعليم الإشعارات كمقروءة عشان متتكررش تاني
        try {
            const updates = notifs.map(n => updateDoc(doc(db, "notifications", n.id), { read: true }));
            await Promise.all(updates);
        } catch (err) {
            console.error("Mark as read error:", err);
        }
    });
}