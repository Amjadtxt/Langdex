// ======================================================
// LANGDEX - index-script.js (Public Dictionary & PDF Export)
// ======================================================

import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";


const firebaseConfig = {
    apiKey: "AIzaSyCKsh43cO6DYwfPheHH9CsraX3VpU2fjc",
    authDomain: "langdex.firebaseapp.com",
    projectId: "langdex",
    storageBucket: "langdex.firebasestorage.app",
    messagingSenderId: "819838317933",
    appId: "1:819838317933:web:cae7f4531ea32f958c5664",
    measurementId: "G-F60CC2CDCJ"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const wordsCollection = collection(db, "words");

let currentUser = null;
let allTableData = [];
let currentFilteredData = []; // لتخزين البيانات المعروضة حالياً وتصديرها للـ PDF

const searchInput = document.querySelector("#search-input");
const searchButton = document.querySelector(".search-btn");
const searchResult = document.querySelector(".search-result");
const dataTable = document.querySelector("#data-table");
const languageFilter = document.querySelector("#language-filter");
const clearFilterButton = document.querySelector("#clear-filter");
const downloadPdfBtn = document.querySelector("#download-pdf-btn");

function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
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
        color: #FFFFFF;
        position: fixed;
        top: 25px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 999999;
        padding: 12px 22px;
        border-radius: 10px;
        font-family: Cairo, Arial, sans-serif;
        font-size: 15px;
        font-weight: 600;
        text-align: center;
        max-width: 90%;
        box-sizing: border-box;
        direction: rtl;
        background: #222;
        border: 1px solid rgba(255,255,255,0.25);
        box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        opacity: 1;
    `;

    clearTimeout(notification._timer);
    notification._timer = setTimeout(() => {
        notification.style.transition = "opacity 0.3s";
        notification.style.opacity = "0";
        setTimeout(() => { if (notification) notification.remove(); }, 300);
    }, 3000);
}

function formatTimestamp(timestamp) {
    if (!timestamp) return "-";
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        if (isNaN(date.getTime())) return "-";
        
        return date.toLocaleString('ar-EG', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return "-";
    }
}

async function getAllWordsPublic() {
    try {
        const querySnapshot = await getDocs(wordsCollection);
        const rows = [];
        
        querySnapshot.forEach(firebaseDoc => {
            const data = firebaseDoc.data();
            rows.push({
                ...data,
                _documentId: firebaseDoc.id
            });
        });

        // 🌟 الترتيب الأساسي والنهائي: الأحدث من حيث تاريخ الإنشاء (createdAt) يظهر أولاً دائماً بدقة
        rows.sort((a, b) => {
            let timeA = 0;
            let timeB = 0;

            if (a.createdAt) {
                timeA = a.createdAt.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
            }
            if (b.createdAt) {
                timeB = b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
            }

            if (timeB !== timeA) {
                return timeB - timeA; // الأحدث تاريخاً يظهر أولاً بدقة
            }
            return Number(b.id || 0) - Number(a.id || 0); // ترتيب تنازلي للـ ID في حال تساوي الوقت تماماً
        });

        return rows;
    } catch (error) {
        console.error("Error fetching public words:", error);
        return [];
    }
}

function populateLanguageFilter(rows) {
    if (!languageFilter) return;

    const currentValue = languageFilter.value;
    languageFilter.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "جميع اللغات";
    languageFilter.appendChild(allOption);

    const languages = new Map();
    rows.forEach(item => {
        const language = String(item.language ?? "").trim();
        if (!language) return;
        const key = normalize(language);
        if (!languages.has(key)) {
            languages.set(key, language);
        }
    });

    [...languages.values()]
        .sort((a, b) => a.localeCompare(b, "ar"))
        .forEach(language => {
            const option = document.createElement("option");
            option.value = language;
            option.textContent = language;
            languageFilter.appendChild(option);
        });

    const exists = [...languageFilter.options].some(option => normalize(option.value) === normalize(currentValue));
    languageFilter.value = (currentValue && exists) ? currentValue : "all";
}

function renderTable(rows) {
    if (!dataTable) return;
    dataTable.innerHTML = "";

    currentFilteredData = rows; // تحديث البيانات المعروضة حالياً للـ PDF

    if (rows.length === 0) {
        const emptyRow = document.createElement("tr");
        const emptyCell = document.createElement("td");
        emptyCell.colSpan = 6;
        emptyCell.textContent = "لا توجد بيانات مطابقة للبحث.";
        emptyCell.style.textAlign = "center";
        emptyRow.appendChild(emptyCell);
        dataTable.appendChild(emptyRow);
        return;
    }

    rows.forEach(data => {
        const row = document.createElement("tr");

        const idVal = data.id !== undefined ? data.id : "-";
        const wordVal = data.word || "-";
        const meaningVal = data.meaning || "-";
        const synonymsVal = data.synonyms || "-";
        const langVal = data.language || "-";
        const dateVal = formatTimestamp(data.createdAt);

        row.innerHTML = `
            <td>${idVal}</td>
            <td>${wordVal}</td>
            <td>${meaningVal}</td>
            <td>${synonymsVal}</td>
            <td>${langVal}</td>
            <td>${dateVal}</td>
        `;

        dataTable.appendChild(row);
    });
}

function applyFiltersAndSearch() {
    if (!dataTable) return;

    const selectedLanguage = languageFilter ? languageFilter.value.trim() : "all";
    const searchQuery = searchInput ? searchInput.value.trim() : "";

    let filtered = [...allTableData];

    if (selectedLanguage !== "" && selectedLanguage !== "all") {
        filtered = filtered.filter(item => normalize(item.language) === normalize(selectedLanguage));
    }

    if (searchQuery !== "") {
        const target = normalize(searchQuery);
        filtered = filtered.filter(item => {
            return (
                normalize(item.id).includes(target) ||
                normalize(item.word).includes(target) ||
                normalize(item.meaning).includes(target) ||
                normalize(item.synonyms).includes(target) ||
                normalize(item.language).includes(target)
            );
        });
    }

    renderTable(filtered);
}

// ======================================================
// EXPORT PDF WITH ALL DATA FIELDS & FILTER COMPATIBILITY (Print Window Method)
// ======================================================

async function exportFilteredDataToPdf() {
    if (!currentFilteredData || currentFilteredData.length === 0) {
        showNotification("لا توجد بيانات لتصديرها.");
        return;
    }

    try {
        showNotification("جاري تجهيز تقرير الـ PDF للطباعة والحفظ...");

        let rowsHtml = "";
        currentFilteredData.forEach((item, index) => {
            rowsHtml += `
                <tr>
                    <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${item.id !== undefined ? item.id : (index + 1)}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${item.word || ''}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${item.meaning || ''}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${item.synonyms || ''}</td>
                    <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${item.language || ''}</td>
                    <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${formatTimestamp(item.createdAt)}</td>
                </tr>
            `;
        });

        const printWindow = window.open("", "_blank");
        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>Langdex - التقرير العام</title>
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
                <h2>Langdex - التقرير العام</h2>
                <p>تاريخ التصدير: <b>${new Date().toLocaleString()}</b> | عدد السجلات المعروضة: <b>${currentFilteredData.length}</b></p>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 8%;">ID</th>
                            <th style="width: 20%;">الكلمة (Word)</th>
                            <th style="width: 25%;">المعنى (Meaning)</th>
                            <th style="width: 22%;">المرادف (Synonyms)</th>
                            <th style="width: 10%;">اللغة (Lang)</th>
                            <th style="width: 15%;">تاريخ التسجيل</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
                <script>
                    window.onload = function() {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        showNotification("تم فتح نافذة التقرير، اختر حفظ كـ PDF (Save as PDF) من نافذة الطباعة!");
    } catch (error) {
        console.error("PDF Export Error:", error);
        showNotification("حدث خطأ أثناء تصدير ملف الـ PDF.");
    }
}

// ======================================================
// EVENT LISTENERS
// ======================================================

if (searchButton && searchInput) {
    searchButton.addEventListener("click", () => {
        applyFiltersAndSearch();
        if (searchResult) searchResult.textContent = "تم تحديث نتائج البحث.";
    });
}

if (searchInput) {
    searchInput.addEventListener("input", () => {
        applyFiltersAndSearch();
    });
}

if (languageFilter) {
    languageFilter.addEventListener("change", () => {
        applyFiltersAndSearch();
    });
}

if (clearFilterButton) {
    clearFilterButton.addEventListener("click", () => {
        if (languageFilter) languageFilter.value = "all";
        if (searchInput) searchInput.value = "";
        if (searchResult) searchResult.textContent = "";
        applyFiltersAndSearch();
        showNotification("تم إلغاء الفلتر والبحث.");
    });
}

if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener("click", () => {
        exportFilteredDataToPdf();
    });
}

// ======================================================
// INITIALIZATION
// ======================================================

async function initializeIndexPage() {
    try {
        allTableData = await getAllWordsPublic();
        populateLanguageFilter(allTableData);
        renderTable(allTableData);
    } catch (err) {
        console.error("Index Page Load Error:", err);
    }
}

onAuthStateChanged(auth, async user => {
    if (!user) {
        currentUser = null;
        window.location.href = "login.html";
        return;
    }
    currentUser = user;
    await initializeIndexPage();
});

document.addEventListener("DOMContentLoaded", async () => {
    if (auth.currentUser) {
        currentUser = auth.currentUser;
        await initializeIndexPage();
    }
});

import { 
    getFirestore, 
    collection, 
    query, 
    orderBy, 
    limit, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// 1. طلب إذن الإشعارات من المتصفح أول ما يفتح الموقع
if ("Notification" in window) {
    Notification.requestPermission();
}

// 2. الاستماع التلقائي لأحدث إشعار يرسله الأدمن
const db = getFirestore();
let isFirstLoad = true; // متغير عشان نمنع ظهور الإشعارات القديمة أول ما يفتح

// بنقول للفايربيز: هاتلي آخر إشعار ينزل في كوليكشن notifications
const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(1));

onSnapshot(q, (snapshot) => {
    // التحميل الأول بنتخطاه عشان المالك ميتفاجئش بإشعارات قديمة بتظهر أول ما يفتح
    if (isFirstLoad) {
        isFirstLoad = false;
        return;
    }

    // أول ما ينزل إشعار جديد فعلياً من الأدمن:
    snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
            const data = change.doc.data();
            
            // إظهار الإشعار في نظام الويندوز/الموبايل
            if (Notification.permission === "granted") {
                new Notification(data.title || "Langdex", {
                    body: data.body,
                    icon: "/favicon.ico" // مسار اللوجو بتاعك لو تحب
                });
            }
        }
    });
});
