// ======================================================
// LANGDEX - user-bar.js
// Username + Logout + جرس إشعارات الأدمن (مع تشخيص Console)
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
// 🔔 حقن أيقونة الجرس جنب زر الخروج
// ======================================================

let bellBtn = null;
let bellBadge = null;
let currentNotifs = [];

function injectBellIcon() {
    const userBar = document.querySelector(".user-bar");
    if (!userBar || document.querySelector("#notifyBellBtn")) return;

    bellBtn = document.createElement("button");
    bellBtn.id = "notifyBellBtn";
    bellBtn.type = "button";
    bellBtn.style.cssText = `
        position: relative; background: transparent; border: none; cursor: pointer;
        font-size: 20px; color: #fff; margin: 0 6px; padding: 4px 6px; line-height: 1;
    `;
    bellBtn.textContent = "🔔";

    bellBadge = document.createElement("span");
    bellBadge.id = "notifyBellBadge";
    bellBadge.style.cssText = `
        position: absolute; top: -2px; left: -2px; background: #e74c3c; color: #fff;
        border-radius: 50%; min-width: 16px; height: 16px; font-size: 10px;
        display: none; align-items: center; justify-content: center; padding: 0 3px;
        font-family: Arial, sans-serif;
    `;
    bellBtn.appendChild(bellBadge);

    // نحطه قبل زرار تسجيل الخروج لو موجود، وإلا في آخر الـ user-bar
    if (logoutButton) {
        userBar.insertBefore(bellBtn, logoutButton);
    } else {
        userBar.appendChild(bellBtn);
    }

    bellBtn.addEventListener("click", () => {
        console.log("[Langdex Notify] تم الضغط على الجرس، عدد الإشعارات الحالية:", currentNotifs.length);
        showNotificationsPopup(currentNotifs);
    });

    console.log("[Langdex Notify] تم حقن أيقونة الجرس بنجاح.");
}

function updateBellBadge(count) {
    if (!bellBadge) return;
    if (count > 0) {
        bellBadge.textContent = count > 9 ? "9+" : String(count);
        bellBadge.style.display = "flex";
    } else {
        bellBadge.style.display = "none";
    }
}


// ======================================================
// USERNAME + تشغيل نظام الإشعارات
// ======================================================

onAuthStateChanged(auth, (user) => {

    if (!user) {
        console.log("[Langdex Notify] مفيش مستخدم مسجل دخول، تم إيقاف فحص الإشعارات.");
        return;
    }

    const email =
        user.email || "";

    // الجزء قبل @
    const name =
        email.split("@")[0];

    if (username) {
        username.textContent =
            `مرحباً، ${name}`;
    }

    console.log("[Langdex Notify] مستخدم مسجل دخول:", email);

    injectBellIcon();
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
// 🔔 جلب الإشعارات من Firestore
// ======================================================

async function checkAndShowNotifications(user) {
    try {
        const notificationsCollection = collection(db, "notifications");
        const userEmail = (user.email || "").toLowerCase().trim();

        console.log("[Langdex Notify] بدء جلب الإشعارات لـ:", userEmail);

        const qAll = query(notificationsCollection, where("target", "==", "all"));
        const qSpecific = query(notificationsCollection, where("target", "==", userEmail));

        const [snapAll, snapSpecific] = await Promise.all([
            getDocs(qAll),
            getDocs(qSpecific)
        ]);

        console.log("[Langdex Notify] عدد مستندات target=all:", snapAll.size);
        console.log("[Langdex Notify] عدد مستندات target=" + userEmail + ":", snapSpecific.size);

        const notifs = [];

        snapAll.forEach(d => {
            const data = d.data();
            console.log("[Langdex Notify] مستند (all):", d.id, data);
            if (data.read !== true) notifs.push({ id: d.id, ...data });
        });

        snapSpecific.forEach(d => {
            const data = d.data();
            console.log("[Langdex Notify] مستند (specific):", d.id, data);
            if (data.read !== true) notifs.push({ id: d.id, ...data });
        });

        notifs.sort((a, b) => {
            const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
            const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
            return tb - ta;
        });

        currentNotifs = notifs;
        console.log("[Langdex Notify] الإشعارات الغير مقروءة بعد الفلترة:", notifs.length, notifs);

        updateBellBadge(notifs.length);

        // فتح تلقائي أول ما فيه إشعار جديد غير مقروء
        if (notifs.length > 0) {
            showNotificationsPopup(notifs);
        }

    } catch (error) {
        console.error("[Langdex Notify] خطأ أثناء جلب الإشعارات:", error);
    }
}

function showNotificationsPopup(notifs) {
    // امنع فتح أكتر من بوب أب في نفس الوقت
    const existing = document.querySelector("#langdex-notify-overlay");
    if (existing) existing.remove();

    if (!notifs || notifs.length === 0) {
        console.log("[Langdex Notify] لا توجد إشعارات لعرضها حاليًا.");
        return;
    }

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
        <h3 style="margin:0 0 15px; text-align:center; font-size:18px;">🔔 الإشعارات</h3>
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
        console.log("[Langdex Notify] تم إغلاق البوب أب، جاري تعليم الإشعارات كمقروءة...");
        try {
            const updates = notifs.map(n => updateDoc(doc(db, "notifications", n.id), { read: true }));
            await Promise.all(updates);
            console.log("[Langdex Notify] تم تعليم الإشعارات كمقروءة بنجاح.");
            currentNotifs = [];
            updateBellBadge(0);
        } catch (err) {
            console.error("[Langdex Notify] خطأ أثناء تعليم الإشعارات كمقروءة:", err);
        }
    });
}