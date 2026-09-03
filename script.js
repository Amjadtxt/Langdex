// ======================================================
// LANGDEX - script.js (Index Search Page - All Users & View Only)
// ======================================================

import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs,
    query
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

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

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const wordsCollection = collection(db, "words");


// ======================================================
// VARIABLES
// ======================================================

let allTableData = [];


// ======================================================
// ELEMENTS (بحث وعرض عام فقط)
// ======================================================

const searchInput = document.querySelector(".search-txt") || document.querySelector("#search-input");
const searchButton = document.querySelector(".search-btn");
const searchResult = document.querySelector(".search-result");
const dataTable = document.querySelector("#data-table");
const languageFilter = document.querySelector("#language-filter");
const clearFilterButton = document.querySelector("#clear-filter");


// ======================================================
// HELPER FUNCTIONS
// ======================================================

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


// ======================================================
// GET ALL WORDS (جلب كل كلمات الناس للبحث العام)
// ======================================================

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

        rows.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
        return rows;
    } catch (error) {
        console.error("Error fetching public words:", error);
        return [];
    }
}


// ======================================================
// POPULATE LANGUAGE FILTER
// ======================================================

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


// ======================================================
// RENDER TABLE (عرض فقط - بدون أي تفاعل للتعديل)
// ======================================================

function renderTable(rows) {
    if (!dataTable) return;
    dataTable.innerHTML = "";

    if (rows.length === 0) {
        const emptyRow = document.createElement("tr");
        const emptyCell = document.createElement("td");
        emptyCell.colSpan = 5;
        emptyCell.textContent = "لا توجد بيانات للعرض.";
        emptyCell.style.textAlign = "center";
        emptyRow.appendChild(emptyCell);
        dataTable.appendChild(emptyRow);
        return;
    }

    rows.forEach(data => {
        const row = document.createElement("tr");
        const values = [data.id, data.word, data.meaning, data.synonyms, data.language];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = (value !== undefined && value !== null && String(value).trim() !== "") ? value : "-";
            row.appendChild(cell);
        });

        row.style.cursor = "default";
        dataTable.appendChild(row);
    });
}


// ======================================================
// APPLY FILTERS & SEARCH
// ======================================================

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
        applyFiltersAndSearch();
        showNotification("تم إلغاء الفلتر والبحث.");
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

// في صفحة index، نكتفي بالتأكد من جلب البيانات العامة بغض النظر عن حالة تسجيل الدخول، أو مع متابعة الحالة
onAuthStateChanged(auth, async user => {
    await initializeIndexPage();
});

document.addEventListener("DOMContentLoaded", async () => {
    await initializeIndexPage();
});
