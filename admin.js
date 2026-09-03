// ======================================================
// LANGDEX - admin.js (محدث ومنظم بالكامل مع دعم رفع الإكسيل والطباعة الشاملة وإرسال الإشعارات)
// ======================================================
import { applyPrefsGlobally } from "/Langdex/prefs.js";
applyPrefsGlobally();

import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
    getAuth,
    setPersistence,
    browserLocalPersistence,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

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

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.error("Persistence error:", err);
});

const wordsCollection = collection(db, "words");
const usersCollection = collection(db, "users");
const logsCollection = collection(db, "logs"); // 🌟 كوليكشن السجل
const notificationsCollection = collection(db, "notifications"); // 🔔 كوليكشن الإشعارات

const ADMIN_EMAILS = ["amjadtxt@gmail.com"];

const loaderOverlay = document.createElement("div");
loaderOverlay.id = "auth-loader-overlay";
loaderOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background-color: #121212; color: #ffffff; z-index: 9999999999;
    display: flex; justify-content: center; align-items: center;
    font-family: 'Cairo', Arial, sans-serif; font-size: 20px; font-weight: bold; direction: rtl;
`;
loaderOverlay.textContent = "جاري التحقق من الصلاحيات والتحميل...";
document.body.appendChild(loaderOverlay);

async function verifyAdminPermission(user) {
    if (!user || !user.email) return false;
    const email = user.email.toLowerCase().trim();

    if (ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === email)) {
        return true;
    }

    try {
        let userDocRef = doc(db, "users", email);
        let userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            const role = String(userDocSnap.data().role || "").toLowerCase().trim();
            if (role === "admin") return true;
        }

        const usersSnapshot = await getDocs(usersCollection);
        for (const userDoc of usersSnapshot.docs) {
            const data = userDoc.data();
            if (String(data.email || "").toLowerCase().trim() === email) {
                const role = String(data.role || "").toLowerCase().trim();
                if (role === "admin") return true;
            }
        }
    } catch (err) {
        console.error("Admin check error:", err);
    }
    return false;
}

let currentAdmin = null;
let selectedDocumentId = null;
let allTableData = [];
let allUsersData = [];

const form = document.querySelector(".form");
const inputs = form ? form.querySelectorAll("input") : [];
const idInput = inputs[0] || null;
const userIdInput = inputs[1] || null;
const wordInput = inputs[2] || null;
const meaningInput = inputs[3] || null;
const synonymsInput = inputs[4] || null;
const languageSelect = document.querySelector("#formLanguageSelect");

const registerButton = document.querySelector(".reg");
const updateButton = document.querySelector(".upa");
const clearButton = document.querySelector(".cel");
const downloadPdfBtn = document.querySelector("#downloadPdfBtn");
const excelFileInput = document.querySelector("#excelFileInput"); // زر ملف الإكسيل المستقل

const searchInput = document.querySelector(".search-txt");
const searchButton = document.querySelector(".search-btn");
const searchResult = document.querySelector(".search-result");
const languageFilterSearch = document.querySelector("#languageFilterSearch");
const dataTable = document.querySelector("#data-table");
const cardsContainer = document.querySelector("#cardsContainer");
const totalUsersCountElem = document.querySelector("#totalUsersCount");

// عناصر قسم الإشعارات
const notifyTargetType  = document.querySelector("#notifyTargetType");
const notifyTargetEmail = document.querySelector("#notifyTargetEmail");
const notifyMessage     = document.querySelector("#notifyMessage");
const sendNotifyBtn     = document.querySelector("#sendNotifyBtn");

function normalize(val) {
    return String(val ?? "").trim().toLowerCase();
}

function extractUsername(emailOrUser) {
    if (!emailOrUser) return "-";
    const str = String(emailOrUser).trim();
    if (str.includes("@")) return str.split("@")[0];
    return str;
}

function showNotification(message) {
    let notification = document.querySelector(".langdex-notification");
    if (!notification) {
        notification = document.createElement("div");
        notification.className = "langdex-notification";
        document.body.appendChild(notification);
    }
    notification.textContent = message;
    notification.style.cssText = `
        color: #FFFFFF; position: fixed; top: 25px; left: 50%; transform: translateX(-50%);
        z-index: 999999; padding: 12px 22px; border-radius: 10px; font-family: Cairo, Arial, sans-serif;
        font-size: 15px; font-weight: 600; text-align: center; direction: rtl;
        background: #222222; border: 1px solid rgba(255, 255, 255, 0.25); box-shadow: 0 5px 20px rgba(0,0,0,0.3);
    `;
    clearTimeout(notification._timer);
    notification._timer = setTimeout(() => notification.remove(), 3000);
}

// ======================================================
// 🌟 تسجيل الأحداث في اللوج (Logs) — بشكل يسمح بالتراجع الحقيقي لاحقاً
// ======================================================
async function writeLog({ action, collectionName, targetDocId = null, oldData = null, newData = null, details = "" }) {
    try {
        await addDoc(logsCollection, {
            userName: currentAdmin?.email || "أدمن",
            uid: currentAdmin?.uid || null,
            action,
            collectionName,
            targetDocId,
            oldData,
            newData,
            details,
            role: "admin",
            undone: false,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("فشل تسجيل الحدث في اللوج:", error);
    }
}

function updateLanguageFilterDropdown(rows) {
    if (!languageFilterSearch) return;
    const currentVal = languageFilterSearch.value;
    languageFilterSearch.innerHTML = `<option value="all">كل اللغات (للبحث أو العرض)</option>`;
    
    const langs = new Set();
    rows.forEach(item => {
        if (item.language) langs.add(String(item.language).trim());
    });

    langs.forEach(lang => {
        const opt = document.createElement("option");
        opt.value = lang;
        opt.textContent = lang;
        languageFilterSearch.appendChild(opt);
    });

    languageFilterSearch.value = langs.has(currentVal) ? currentVal : "all";
}

async function fetchAllData() {
    try {
        const usersSnap = await getDocs(usersCollection);
        allUsersData = [];
        usersSnap.forEach(d => allUsersData.push({ id: d.id, ...d.data() }));
        if (totalUsersCountElem) totalUsersCountElem.textContent = allUsersData.length;

        const wordsSnap = await getDocs(wordsCollection);
        allTableData = [];
        wordsSnap.forEach(d => {
            allTableData.push({ _documentId: d.id, ...d.data() });
        });

        // 🌟 الترتيب الأساسي والنهائي: الأحدث من حيث تاريخ الإنشاء (createdAt) يظهر أولاً دائماً
        allTableData.sort((a, b) => {
            let timeA = 0;
            let timeB = 0;

            if (a.createdAt) {
                timeA = a.createdAt.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
            }
            if (b.createdAt) {
                timeB = b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
            }

            if (timeB !== timeA) {
                return timeB - timeA;
            }
            return Number(b.id || 0) - Number(a.id || 0);
        });

        updateLanguageFilterDropdown(allTableData);
        renderCardsAndTable(allTableData);
        await setNextIdAdmin();
    } catch (error) {
        console.error(error);
        // تم إزالة إشعار الخطأ بناءً على طلبك
    }
}

function renderCardsAndTable(rows) {
    const langCounts = {};
    rows.forEach(item => {
        const lang = String(item.language || "غير محدد").trim();
        langCounts[lang] = (langCounts[lang] || 0) + 1;
    });

    const existingLangCards = cardsContainer.querySelectorAll(".lang-card");
    existingLangCards.forEach(c => c.remove());

    for (const [lang, count] of Object.entries(langCounts)) {
        const card = document.createElement("div");
        card.className = "card lang-card";
        card.innerHTML = `<h3>كلمات لغة (${lang})</h3><p>${count}</p>`;
        cardsContainer.appendChild(card);
    }

    renderTableLog(rows);
}

function renderTableLog(rows) {
    if (!dataTable) return;
    dataTable.innerHTML = "";

    if (rows.length === 0) {
        dataTable.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #777;">لا توجد بيانات مطابقة</td></tr>`;
        return;
    }

    rows.forEach(data => {
        const tr = document.createElement("tr");

        const rawUser = data.userEmail || data.userId || "";
        const username = extractUsername(rawUser);
        
        let userRole = data.role || "user";
        const matchedUser = allUsersData.find(u => normalize(u.email) === normalize(rawUser) || u.id === data.userId);
        if (matchedUser && matchedUser.role) {
            userRole = matchedUser.role;
        }

        let timeFormatted = "-";
        if (data.createdAt) {
            const dateObj = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            if (!isNaN(dateObj)) {
                timeFormatted = dateObj.toLocaleDateString("ar-EG") + " - " + dateObj.toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' });
            }
        }

        tr.innerHTML = `
            <td>${data.id || "-"}</td>
            <td>${username}</td>
            <td><strong>${data.word || "-"}</strong></td>
            <td>${data.meaning || "-"}</td>
            <td>${data.synonyms || "-"}</td>
            <td>${data.language || "-"}</td>
            <td><span style="color: ${normalize(userRole) === 'admin' ? '#00bcd4' : '#fff'};">${userRole}</span></td>
            <td>${timeFormatted}</td>
            <td class="action-btns">
                <button class="btn-edit" data-id="${data._documentId}">تعديل</button>
                <button class="btn-delete" data-id="${data._documentId}">حذف</button>
            </td>
        `;

        const editBtn = tr.querySelector(".btn-edit");
        const deleteBtn = tr.querySelector(".btn-delete");

        editBtn.addEventListener("click", () => {
            selectedDocumentId = data._documentId;
            if (idInput) idInput.value = data.id || "";
            if (userIdInput) userIdInput.value = username;
            if (wordInput) wordInput.value = data.word || "";
            if (meaningInput) meaningInput.value = data.meaning || "";
            if (synonymsInput) synonymsInput.value = data.synonyms || "";
            if (languageSelect) languageSelect.value = data.language || "";
            window.scrollTo({ top: 0, behavior: 'smooth' });
            showNotification(`تم تحديد الكلمة (${data.word}) للتعديل.`);
        });

        deleteBtn.addEventListener("click", async () => {
            if (!confirm(`هل أنت متأكد من حذف الكلمة "${data.word}"؟`)) return;
            try {
                const oldData = {
                    id: data.id ?? null,
                    word: data.word ?? "",
                    meaning: data.meaning ?? "",
                    synonyms: data.synonyms ?? "",
                    language: data.language ?? "",
                    userId: data.userId ?? "",
                    userEmail: data.userEmail ?? "",
                    username: data.username ?? "",
                    role: data.role ?? "user"
                };

                await deleteDoc(doc(db, "words", data._documentId));

                await writeLog({
                    action: "delete",
                    collectionName: "words",
                    targetDocId: data._documentId,
                    oldData,
                    newData: null,
                    details: `حذف كلمة "${data.word || ""}" (بواسطة الأدمن)`
                });

                showNotification("تم حذف الكلمة بنجاح.");
                await fetchAllData();
            } catch (err) {
                showNotification("حدث خطأ أثناء الحذف.");
            }
        });

        dataTable.appendChild(tr);
    });
}

async function setNextIdAdmin() {
    try {
        const usedIds = new Set();
        allTableData.forEach(item => {
            const idNum = Number(item.id);
            if (Number.isInteger(idNum) && idNum > 0) usedIds.add(idNum);
        });
        let nextId = 1;
        while (usedIds.has(nextId)) nextId++;
        if (idInput) idInput.value = nextId;
    } catch (e) {
        if (idInput) idInput.value = 1;
    }
}

function performSearchAndFilter() {
    const query = normalize(searchInput ? searchInput.value : "");
    const selectedLang = languageFilterSearch ? languageFilterSearch.value : "all";

    let filtered = allTableData.filter(item => {
        const username = normalize(extractUsername(item.userEmail || item.userId));
        const matchesQuery = !query || (
            normalize(item.id).includes(query) ||
            username.includes(query) ||
            normalize(item.word).includes(query) ||
            normalize(item.meaning).includes(query) ||
            normalize(item.synonyms).includes(query) ||
            normalize(item.language).includes(query)
        );

        const matchesLang = (selectedLang === "all") || (normalize(item.language) === normalize(selectedLang));

        return matchesQuery && matchesLang;
    });

    renderTableLog(filtered);
    if (searchResult) {
        searchResult.textContent = (query || selectedLang !== "all") ? `النتائج المطابقة: ${filtered.length}` : "";
    }
    return filtered;
}

if (searchButton && searchInput) {
    searchButton.addEventListener("click", performSearchAndFilter);
    searchInput.addEventListener("input", performSearchAndFilter);
}

if (languageFilterSearch) {
    languageFilterSearch.addEventListener("change", performSearchAndFilter);
}

// ==========================================================
// تصدير تقرير PDF للبيانات المعروضة
// ==========================================================
if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener("click", () => {
        const currentRows = performSearchAndFilter();
        if (currentRows.length === 0) {
            showNotification("لا توجد بيانات معروضة لتحميلها في الـ PDF!");
            return;
        }

        try {
            showNotification("جاري تجهيز تقرير الـ PDF للطباعة والحفظ...");

            let rowsHtml = "";
            currentRows.forEach((item, index) => {
                rowsHtml += `
                    <tr>
                        <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${item.id || (index + 1)}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${extractUsername(item.userEmail || item.userId)}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${item.word || ''}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.meaning || ''}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.synonyms || ''}</td>
                        <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${item.language || ''}</td>
                    </tr>
                `;
            });

            const printWindow = window.open("", "_blank");
            printWindow.document.write(`
                <!DOCTYPE html>
                <html lang="ar" dir="rtl">
                <head>
                    <meta charset="UTF-8">
                    <title>Langdex - تقرير السجلات والبيانات</title>
                    <style>
                        body { font-family: 'Cairo', Tahoma, Arial, sans-serif; padding: 20px; color: #333; direction: rtl; }
                        h2 { text-align: center; color: #2c3e50; margin-bottom: 5px; }
                        p { text-align: center; color: #7f8c8d; margin-top: 0; margin-bottom: 25px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th { background-color: #678071; color: black; padding: 10px; border: 1px solid #678071; font-size: 13px; }
                        td { font-size: 12px; }
                        tr:nth-child(even) { background-color: #f9f9f9; }
                    </style>
                </head>
                <body>
                    <h2>Langdex - تقرير سجل الكلمات والبيانات</h2>
                    <p>تاريخ التصدير: <b>${new Date().toLocaleString()}</b> | عدد السجلات المعروضة: <b>${currentRows.length}</b></p>
                    <table>
                        <thead>