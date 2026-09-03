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

        // ترتيب الكلمات حسب الأحدث تاريخاً (من الأحدث إلى الأقدم)
        rows.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
            return timeB - timeA;
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
// EXPORT PDF WITH ALL DATA FIELDS & FILTER COMPATIBILITY
// ======================================================

async function exportFilteredDataToPdf() {
    if (!currentFilteredData || currentFilteredData.length === 0) {
        showNotification("لا توجد بيانات لتصديرها.");
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape', // استخدام الوضع الأفقي عشان يستوعب كل الأعمدة براحته
            unit: 'mm',
            format: 'a4'
        });

        doc.addFont("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf", "Roboto", "normal");
        doc.setFont("Roboto");

        doc.setFontSize(16);
        doc.text("Langdex - Public Dictionary Report", 148, 12, { align: "center" });
        
        doc.setFontSize(10);
        doc.text(`Exported Date: ${new Date().toLocaleDateString()}`, 148, 18, { align: "center" });

        let y = 28;
        doc.setFontSize(10);

        // رأس الجدول في الـ PDF يطابق أعمدة الموقع تماماً (ID, الكلمة, المعنى, المرادف, اللغة, التاريخ)
        doc.setFillColor(103, 128, 113);
        doc.rect(10, y, 277, 8, "F");
        doc.setTextColor(255, 255, 255);
        
        doc.text("ID", 15, y + 6);
        doc.text("الكلمة (Word)", 35, y + 6);
        doc.text("المعنى (Meaning)", 85, y + 6);
        doc.text("المرادف (Synonyms)", 155, y + 6);
        doc.text("اللغة (Lang)", 215, y + 6);
        doc.text("تاريخ التسجيل", 245, y + 6);

        y += 10;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);

        currentFilteredData.forEach((item) => {
            if (y > 190) {
                doc.addPage();
                y = 20;
            }

            const idStr = String(item.id || "-");
            const wordStr = String(item.word || "-");
            const meaningStr = String(item.meaning || "-");
            const synonymsStr = String(item.synonyms || "-");
            const langStr = String(item.language || "-");
            const dateStr = formatTimestamp(item.createdAt);

            doc.text(idStr, 15, y);
            doc.text(wordStr, 35, y, { maxWidth: 45 });
            doc.text(meaningStr, 85, y, { maxWidth: 65 });
            doc.text(synonymsStr, 155, y, { maxWidth: 55 });
            doc.text(langStr, 215, y, { maxWidth: 25 });
            doc.text(dateStr, 245, y);

            y += 9;
            doc.setDrawColor(220, 220, 220);
            doc.line(10, y - 3, 287, y - 3);
        });

        doc.save("langdex-dictionary-report.pdf");
        showNotification("تم تصدير ملف الـ PDF كاملاً بنجاح!");
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
