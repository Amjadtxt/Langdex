// ======================================================
// LANGDEX - user-bar.js
// Username + Logout + أيقونة إشعارات ثابتة أسفل يمين الشاشة
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
// 🔔 أيقونة إشعارات ثابتة أسفل يمين الشاشة
// ======================================================

let bellBadge = null;
let currentNotifs = [];

function injectBellIcon() {
    if (document.querySelector("#notifyBellBtn")) return true;

    const bellBtn = document.createElement("button");
    bellBtn.id = "notifyBellBtn";
    bellBtn.type = "button";
    bellBtn.setAttribute(
        "style",
        "position:fixed !important; bottom:20px !important; right:70px !important; " +
        "background:#00bcd4 !important; border:none !important; border-radius:50% !important; " +
        "width:52px !important; height:52px !important; display:flex !important; " +
        "align-items:center !important; justify-content:center !important; cursor:pointer !important; " +
        "font-size:24px !important; color:#fff !important; z-index:2147483647 !important; " +
        "box-shadow:0 4px 14px rgba(0,0,0,0.35) !important; transition:transform .15s, background .2s !important;"
    );
    bellBtn.textContent = "🔔";
    bellBtn.addEventListener("mouseenter", () => {
        bellBtn.style.setProperty("background", "#008ba3", "important");
        bellBtn.style.setProperty("transform", "scale(1.06)", "important");
    });
    bellBtn.addEventListener("mouseleave", () => {
        bellBtn.style.setProperty("background", "#00bcd4", "important");
        bellBtn.style.setProperty("transform", "scale(1)", "important");
    });

    const badge = document.createElement("span");
    badge.id = "notifyBellBadge";
    badge.setAttribute(
        "style",
        "position:absolute !important; top:-4px !important; left:-4px !important; " +
        "background:#e74c3c !important; color:#fff !important; border-radius:50% !important; " +
        "min-width:19px !important; height:19px !important; font-size:11px !important; " +
        "display:none !important; align-items:center !important; justify-content:center !important; " +
        "padding:0 4px !important; font-family:Arial, sans-serif !important; " +
        "border:2px solid #fff !important; box-sizing:content-box !important;"
    );
    bellBtn.appendChild(badge);
    bellBadge = badge;

    document.body.appendChild(bellBtn);

    bellBtn.addEventListener("click", () => {
        showNotificationsPopup(currentNotifs);
    });

    return true;
}

function ensureBellInjected(attempt = 0) {
    if (!injectBellIcon() && attempt < 20) {
        setTimeout(() => ensureBellInjected(attempt + 1), 300);
    }
}

function updateBellBadge(count) {
    if (!bellBadge) return;
    if (count > 0) {
        bellBadge.textContent = count > 9 ? "9+" : String(count);
        bellBadge.style.setProperty("display", "flex", "important");
    } else {
        bellBadge.style.setProperty("display", "none", "important");
    }
}

ensureBellInjected();


// ======================================================
// USERNAME + تشغيل نظام الإشعارات
// ======================================================

onAuthStateChanged(auth, (user) => {

    if (!user) return;

    const email =
        user.email || "";

    const name =
        email.split("@")[0];

    if (username) {
        username.textContent =
            `مرحباً، ${name}`;
    }

    ensureBellInjected();
    checkNotifications(user);
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
// 🔔 جلب الإشعارات (بدون فتح تلقائي — بس تحديث الـ badge)
// ======================================================

async function checkNotifications(user) {
    try {
        const notificationsCollection = collection(db, "notifications");
        const userEmail = (user.email || "").toLowerCase().trim();

        const qAll = query(notificationsCollection, where("target", "==", "all"));
        const qSpecific = query(notificationsCollection, where("target", "==", userEmail));

        const [snapAll, snapSpecific] = await Promise.all([
            getDocs(qAll),
            getDocs(qSpecific)
        ]);

        const notifs = [];

        snapAll.forEach(d => {
            const data = d.data();
            if (data.read !== true) notifs.push({ id: d.id, ...data });
        });

        snapSpecific.forEach(d => {
            const data = d.data();
            if (data.read !== true) notifs.push({ id: d.id, ...data });
        });

        notifs.sort((a, b) => {
            const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
            const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
            return tb - ta;
        });

        currentNotifs = notifs;
        updateBellBadge(notifs.length);
        // مفيش فتح تلقائي — بس تحديث العداد على الجرس

    } catch (error) {
        console.error("[Langdex Notify] خطأ أثناء جلب الإشعارات:", error);
    }
}

function showNotificationsPopup(notifs) {
    const existing = document.querySelector("#langdex-notify-overlay");
    if (existing) existing.remove();

    if (!notifs || notifs.length === 0) {
        showEmptyMessage();
        return;
    }

    const overlay = document.createElement("div");
    overlay.id = "langdex-notify-overlay";
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.6);
        z-index: 2147483647; display: flex; align-items: center; justify-content: center;
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
        try {
            const updates = notifs.map(n => updateDoc(doc(db, "notifications", n.id), { read: true }));
            await Promise.all(updates);
            currentNotifs = [];
            updateBellBadge(0);
        } catch (err) {
            console.error("[Langdex Notify] خطأ أثناء تعليم الإشعارات كمقروءة:", err);
        }
    });
}

function showEmptyMessage() {
    const overlay = document.createElement("div");
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.6);
        z-index: 2147483647; display: flex; align-items: center; justify-content: center;
        font-family: 'Cairo', Arial, sans-serif; direction: rtl; padding: 15px; box-sizing: border-box;
    `;
    overlay.innerHTML = `
        <div style="background:#2c2f33; color:#fff; padding:25px; border-radius:12px; text-align:center; max-width:300px;">
            <p style="margin:0 0 15px;">لا توجد إشعارات جديدة حالياً 🔕</p>
            <button id="closeEmptyPopup" style="padding:10px 20px; border:none; border-radius:8px; background:#00bcd4; color:#fff; font-weight:bold; cursor:pointer; font-family:'Cairo',sans-serif;">حسنًا</button>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector("#closeEmptyPopup").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
}