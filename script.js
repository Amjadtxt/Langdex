
// ======================================================
// LANGDEX - script.js (Full & Complete Edition for Amjad)
// ======================================================

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
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";


// ======================================================
// FIREBASE CONFIG & ADMIN LIST
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

const ADMIN_EMAILS = ["amjadtxt@gmail.com"]; // إيميل الأدمن المعتمد


// ======================================================
// INITIALIZE FIREBASE
// ======================================================

const app =
    getApps().length > 0
        ? getApp()
        : initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

const wordsCollection = collection(db, "words");


// ======================================================
// CURRENT USER & VARIABLES
// ======================================================

let currentUser = null;
let selectedDocumentId = null;
let allTableData = [];
let searchResults = [];
let searchIndex = 0;
let lastSearchText = "";


// ======================================================
// FORM ELEMENTS
// ======================================================

const form = document.querySelector(".form");

let idInput = null;
let wordInput = null;
let meaningInput = null;
let synonymsInput = null;
let languageSelect = null;

if (form) {
    const inputs = form.querySelectorAll("input");

    idInput = inputs[0] || null;
    wordInput = inputs[1] || null;
    meaningInput = inputs[2] || null;
    synonymsInput = inputs[3] || null;

    languageSelect = form.querySelector("select") || null;
}


// ======================================================
// FORM BUTTONS
// ======================================================

const registerButton = document.querySelector(".reg");
const updateButton = document.querySelector(".upa");
const deleteButton = document.querySelector(".del");
const clearButton = document.querySelector(".cel");


// ======================================================
// SEARCH ELEMENTS
// ======================================================

const searchInput = document.querySelector(".search-txt") || document.querySelector("#search-input");
const searchButton = document.querySelector(".search-btn");
const searchResult = document.querySelector(".search-result");


// ======================================================
// DATA PAGE ELEMENTS
// ======================================================

const showDataButton = document.querySelector(".show-data");
const dataTable = document.querySelector("#data-table");
const languageFilter = document.querySelector("#language-filter");
const clearFilterButton = document.querySelector("#clear-filter");
const downloadPdfButton = document.querySelector("#download-pdf");


// ======================================================
// HELPER FUNCTIONS
// ======================================================

function normalize(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}

function isCurrentUserAdmin() {
    if (!currentUser) return false;
    const email = (currentUser.email || "").toLowerCase();
    return ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === email);
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

        setTimeout(() => {
            if (notification) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}


// ======================================================
// GET WORDS (USER DATA VS ADMIN ALL LOGS)
// ======================================================

async function getAllWords() {
    // إذا كان المستخدم لم يتم تعيينه بعد ولكن الـ auth جاهز، نحاول أخذه مباشرة
    if (!currentUser && auth.currentUser) {
        currentUser = auth.currentUser;
    }

    if (!currentUser) {
        return [];
    }

    let snapshot;
    const isAdmin = isCurrentUserAdmin();

    try {
        if (isAdmin) {
            snapshot = await getDocs(wordsCollection);
        } else {
            const userWordsQuery = query(
                wordsCollection,
                where("userId", "==", currentUser.uid)
            );
            snapshot = await getDocs(userWordsQuery);
        }

        const rows = [];
        snapshot.forEach(firebaseDoc => {
            const data = firebaseDoc.data();
            rows.push({
                ...data,
                _documentId: firebaseDoc.id
            });
        });

        rows.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
        return rows;
    } catch (error) {
        console.error("Error fetching words:", error);
        return [];
    }
}


// ======================================================
// SMART ID
// ======================================================

async function getNextId() {
    try {
        const rows = await getAllWords();
        const usedIds = new Set();

        rows.forEach(item => {
            const id = Number(item.id);
            if (Number.isInteger(id) && id > 0) {
                usedIds.add(id);
            }
        });

        let nextId = 1;
        while (usedIds.has(nextId)) {
            nextId++;
        }

        return nextId;
    } catch (error) {
        console.error("Get Next ID Error:", error);
        return 1;
    }
}

async function setNextId() {
    if (!idInput) return;

    try {
        const nextId = await getNextId();
        idInput.value = nextId;
    } catch (error) {
        console.error("Set Next ID Error:", error);
    }
}


// ======================================================
// CLEAR & FILL FORM
// ======================================================

async function clearForm() {
    if (wordInput) wordInput.value = "";
    if (meaningInput) meaningInput.value = "";
    if (synonymsInput) synonymsInput.value = "";
    if (languageSelect) languageSelect.selectedIndex = 0;

    selectedDocumentId = null;
    searchResults = [];
    searchIndex = 0;
    lastSearchText = "";

    if (searchInput && !document.querySelector("#search-input")) searchInput.value = "";
    if (searchResult) searchResult.textContent = "";

    await setNextId();
}

function fillForm(data, documentId) {
    selectedDocumentId = documentId;

    if (idInput) idInput.value = data.id ?? "";
    if (wordInput) wordInput.value = data.word ?? "";
    if (meaningInput) meaningInput.value = data.meaning ?? "";
    if (synonymsInput) synonymsInput.value = data.synonyms ?? "";
    if (languageSelect) languageSelect.value = data.language ?? "";
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

    const exists = [...languageFilter.options].some(option => {
        return normalize(option.value) === normalize(currentValue);
    });

    if (currentValue && exists) {
        languageFilter.value = currentValue;
    } else {
        languageFilter.value = "all";
    }
}


// ======================================================
// RENDER TABLE
// ======================================================

function renderTable(rows) {
    if (!dataTable) return;

    dataTable.innerHTML = "";
    const isAdmin = isCurrentUserAdmin();

    const thead = dataTable.closest('table')?.querySelector('thead tr');
    if (thead) {
        if (isAdmin) {
            if (!thead.querySelector('.admin-user-th')) {
                const userTh = document.createElement('th');
                userTh.className = 'admin-user-th';
                userTh.textContent = 'المستخدم';
                thead.appendChild(userTh);
            }
        } else {
            const userTh = thead.querySelector('.admin-user-th');
            if (userTh) userTh.remove();
        }
    }

    if (rows.length === 0) {
        const emptyRow = document.createElement("tr");
        const emptyCell = document.createElement("td");
        emptyCell.colSpan = isAdmin ? 6 : 5;
        emptyCell.textContent = "لا توجد بيانات للعرض.";
        emptyCell.style.textAlign = "center";
        emptyRow.appendChild(emptyCell);
        dataTable.appendChild(emptyRow);
        return;
    }

    rows.forEach(data => {
        const row = document.createElement("tr");

        const values = [
            data.id,
            data.word,
            data.meaning,
            data.synonyms,
            data.language
        ];

        if (isAdmin) {
            values.push(data.userEmail || data.username || "غير معروف");
        }

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent =
                value !== undefined && value !== null && String(value).trim() !== ""
                    ? value
                    : "-";
            row.appendChild(cell);
        });

        row.style.cursor = "pointer";
        row.addEventListener("click", () => {
            fillForm(data, data._documentId);
            showNotification(`تم اختيار الكلمة: ${data.word}`);
        });

        dataTable.appendChild(row);
    });
}


// ======================================================
// APPLY FILTERS & LIVE SEARCH
// ======================================================

function applyFiltersAndSearch() {
    if (!dataTable) return;

    const selectedLanguage = languageFilter ? languageFilter.value.trim() : "all";
    const searchQuery = document.querySelector("#search-input") ? document.querySelector("#search-input").value.trim() : "";

    let filtered = allTableData;

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
                normalize(item.language).includes(target) ||
                normalize(item.userEmail).includes(target)
            );
        });
    }

    renderTable(filtered);
}


// ======================================================
// INITIAL DATA LOADER FUNCTION
// ======================================================

async function initializePageData() {
    try {
        allTableData = await getAllWords();
        populateLanguageFilter(allTableData);
        if (dataTable) {
            applyFiltersAndSearch();
        }
    } catch (err) {
        console.error("Load Data Error:", err);
    }
}


// ======================================================
// LISTENERS
// ======================================================

if (showDataButton) {
    showDataButton.addEventListener("click", async function () {
        await initializePageData();
        showNotification(`تم تحديث وعرض ${allTableData.length} سجل.`);
    });
}

if (languageFilter) {
    languageFilter.addEventListener("change", function () {
        applyFiltersAndSearch();
    });
}

const liveSearchInput = document.querySelector("#search-input");
if (liveSearchInput) {
    liveSearchInput.addEventListener("input", function () {
        applyFiltersAndSearch();
    });
}

if (clearFilterButton) {
    clearFilterButton.addEventListener("click", function () {
        if (languageFilter) {
            languageFilter.value = "all";
        }
        if (liveSearchInput) {
            liveSearchInput.value = "";
        }
        applyFiltersAndSearch();
        showNotification("تم إلغاء الفلتر والبحث.");
    });
}


// ======================================================
// DOWNLOAD PDF
// ======================================================

if (downloadPdfButton) {
    downloadPdfButton.addEventListener("click", async function () {
        if (!currentUser) {
            showNotification("يجب تسجيل الدخول أولاً.");
            return;
        }

        try {
            showNotification("جاري جلب البيانات وتجهيز ملف الـ PDF...");

            const freshRows = await getAllWords();
            let selectedLanguage = languageFilter ? languageFilter.value.trim() : "all";
            let rows = freshRows;

            if (selectedLanguage !== "all" && selectedLanguage !== "") {
                rows = freshRows.filter(item => normalize(item.language) === normalize(selectedLanguage));
            }

            if (rows.length === 0) {
                showNotification("لا توجد بيانات لتحميلها.");
                return;
            }

            const isAdmin = isCurrentUserAdmin();
            const selectedLanguageText = (languageFilter && languageFilter.options[languageFilter.selectedIndex])
                ? languageFilter.options[languageFilter.selectedIndex].textContent
                : "جميع اللغات";

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF("p", "mm", "a4");

            const chunkSize = 30;
            const totalChunks = Math.ceil(rows.length / chunkSize);

            const printArea = document.createElement("div");
            printArea.style.cssText = `
                position: fixed;
                top: -9999px;
                left: -9999px;
                width: 800px;
                background: #ffffff;
                color: #000000;
                padding: 20px;
                font-family: Cairo, Arial, sans-serif;
                direction: rtl;
                z-index: -9999;
            `;
            document.body.appendChild(printArea);

            for (let i = 0; i < totalChunks; i++) {
                const chunkRows = rows.slice(i * chunkSize, (i + 1) * chunkSize);

                printArea.innerHTML = `
                    <div style="text-align: center; margin-bottom: 15px;">
                        <h2 style="margin:0; font-size: 20px; color: #000;">Langdex Report ${isAdmin ? '(Admin All Data)' : ''}</h2>
                        <p style="margin:3px 0; font-size: 13px; color: #333;">اللغة: ${selectedLanguageText} (صفحة ${i + 1} من ${totalChunks})</p>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px; color: #000; background: #ffffff;">
                        <thead>
                            <tr style="background-color: #b5b5b5;">
                                <th style="border: 1px solid #333; padding: 5px; width: 8%;">#</th>
                                <th style="border: 1px solid #333; padding: 5px; width: 22%;">الكلمة</th>
                                <th style="border: 1px solid #333; padding: 5px; width: 28%;">المعنى</th>
                                <th style="border: 1px solid #333; padding: 5px; width: 18%;">المرادف</th>
                                <th style="border: 1px solid #333; padding: 5px; width: 14%;">اللغة</th>
                                ${isAdmin ? '<th style="border: 1px solid #333; padding: 5px; width: 10%;">المستخدم</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>
                            ${chunkRows.map((item, idx) => `
                                <tr>
                                    <td style="border: 1px solid #333; padding: 4px; text-align: center;">${(i * chunkSize) + idx + 1}</td>
                                    <td style="border: 1px solid #333; padding: 4px;">${item.word || '-'}</td>
                                    <td style="border: 1px solid #333; padding: 4px;">${item.meaning || '-'}</td>
                                    <td style="border: 1px solid #333; padding: 4px;">${item.synonyms || '-'}</td>
                                    <td style="border: 1px solid #333; padding: 4px; text-align: center;">${item.language || '-'}</td>
                                    ${isAdmin ? `<td style="border: 1px solid #333; padding: 4px; text-align: center;">${item.userEmail || item.username || '-'}</td>` : ''}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;

                await new Promise(resolve => setTimeout(resolve, 0));

                const canvas = await html2canvas(printArea, {
                    scale: 1,
                    backgroundColor: "#ffffff",
                    useCORS: true,
                    logging: false
                });

                const imgData = canvas.toDataURL("image/jpeg", 0.75);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                if (i > 0) {
                    pdf.addPage();
                }

                pdf.addImage(imgData, "JPEG", 0, 10, pdfWidth, pdfHeight);
            }
            
            printArea.remove();

            const safeLanguage = selectedLanguageText.replace(/[\\/:*?"<>|]/g, "-");
            pdf.save(`Langdex-${safeLanguage}.pdf`);

            showNotification("تم تحميل ملف الـ PDF بنجاح وسرعة بدون تعليق!");
        } catch (error) {
            console.error("PDF Export Error:", error);
            showNotification("حدث خطأ أثناء تصدير الـ PDF.");
        }
    });
}


// ======================================================
// AUTH STATE & INITIALIZATION
// ======================================================

onAuthStateChanged(auth, async user => {
    if (!user) {
        currentUser = null;
        window.location.href = "login.html";
        return;
    }

    currentUser = user;
    const isAdmin = isCurrentUserAdmin();
    const currentPage = window.location.pathname.split("/").pop();

    if (isAdmin && (currentPage === "index.html" || currentPage === "")) {
        window.location.href = "admin.html";
        return;
    }

    if (!isAdmin && currentPage === "admin.html") {
        window.location.href = "index.html";
        return;
    }

    if (idInput) {
        await setNextId();
    }

    await initializePageData();
});

// تشغيل احتياطي فوري فور تحميل الصفحة في حال تأخر الـ Auth State
document.addEventListener("DOMContentLoaded", async () => {
    if (auth.currentUser) {
        currentUser = auth.currentUser;
        await initializePageData();
    }
});

