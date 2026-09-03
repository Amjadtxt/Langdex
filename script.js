// ======================================================
// LANGDEX - script.js (User Data Page Edition)
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

        setTimeout(() => {
            if (notification) notification.remove();
        }, 300);
    }, 3000);
}


// ======================================================
// GET WORDS (فلترة آمنة ومزدوجة لمستخدم واحد حصرياً)
// ======================================================

async function getAllWords() {
    if (!currentUser && auth.currentUser) {
        currentUser = auth.currentUser;
    }

    if (!currentUser) {
        return [];
    }

    try {
        const userQuery = query(wordsCollection, where("userId", "==", currentUser.uid));
        const snapshot = await getDocs(userQuery);

        const rows = [];
        snapshot.forEach(firebaseDoc => {
            const data = firebaseDoc.data();
            if (data.userId === currentUser.uid) {
                rows.push({
                    ...data,
                    _documentId: firebaseDoc.id
                });
            }
        });

        rows.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
        return rows;
    } catch (error) {
        console.error("Error fetching user words:", error);
        return [];
    }
}


// ======================================================
// SMART ID
// ======================================================

async function getNextId() {
    if (!currentUser) return 1;
    try {
        const userQuery = query(wordsCollection, where("userId", "==", currentUser.uid));
        const snapshot = await getDocs(userQuery);
        const usedIds = new Set();

        snapshot.forEach(item => {
            const data = item.data();
            if (data.userId === currentUser.uid) {
                const id = Number(data.id);
                if (Number.isInteger(id) && id > 0) {
                    usedIds.add(id);
                }
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
// FORM ACCESS CONTROL
// ======================================================

function setFormAccess(isEditable) {
    if (!form) return;
    const elementsToToggle = [wordInput, meaningInput, synonymsInput, languageSelect];

    elementsToToggle.forEach(el => {
        if (el) {
            el.disabled = !isEditable;
            el.style.opacity = isEditable ? "1" : "0.75";
            el.style.cursor = isEditable ? "text" : "not-allowed";
            el.style.background = isEditable ? "#ffffff" : "#e2e8f0";
        }
    });

    if (updateButton) updateButton.style.display = isEditable ? "block" : "none";
    if (deleteButton) deleteButton.style.display = isEditable ? "block" : "none";
    if (registerButton) registerButton.style.display = isEditable ? "block" : "none";
}


// ======================================================
// CLEAR & FILL FORM
// ======================================================

async function clearForm() {
    if (!form) return;
    if (wordInput) wordInput.value = "";
    if (meaningInput) meaningInput.value = "";
    if (synonymsInput) synonymsInput.value = "";
    if (languageSelect) languageSelect.selectedIndex = 0;

    selectedDocumentId = null;
    searchResults = [];
    searchIndex = 0;
    lastSearchText = "";

    if (searchInput) searchInput.value = "";
    if (searchResult) searchResult.textContent = "";

    setFormAccess(true);
    await setNextId();
}

function fillForm(data, documentId) {
    if (!form) return;
    selectedDocumentId = documentId;

    if (idInput) idInput.value = data.id ?? "";
    if (wordInput) wordInput.value = data.word ?? "";
    if (meaningInput) meaningInput.value = data.meaning ?? "";
    if (synonymsInput) synonymsInput.value = data.synonyms ?? "";
    if (languageSelect) languageSelect.value = data.language ?? "";

    setFormAccess(true);
    showNotification(`تم اختيار الكلمة: ${data.word}`);
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

        const values = [
            data.id,
            data.word,
            data.meaning,
            data.synonyms,
            data.language
        ];

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
            if (!form) {
                showNotification(`الكلمة: ${data.word} - المعنى: ${data.meaning}`);
                return;
            }
            fillForm(data, data._documentId);
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
// SEARCH BUTTON HANDLER
// ======================================================

if (searchButton && searchInput) {
    searchButton.addEventListener("click", async () => {
        const queryText = searchInput.value.trim();
        if (!queryText) {
            if (searchResult) searchResult.textContent = "الرجاء كتابة كلمة للبحث.";
            return;
        }

        allTableData = await getAllWords();
        const target = normalize(queryText);

        if (queryText === lastSearchText && searchResults.length > 1) {
            searchIndex = (searchIndex + 1) % searchResults.length;
            const matchedItem = searchResults[searchIndex];
            fillForm(matchedItem, matchedItem._documentId);
            if (searchResult) {
                searchResult.textContent = `نتيجة ${searchIndex + 1} من ${searchResults.length} (اضغط بحث للتنقل)`;
            }
            return;
        }

        lastSearchText = queryText;

        let matches = allTableData.filter(item => {
            return (
                normalize(item.id).includes(target) ||
                normalize(item.word).includes(target) ||
                normalize(item.meaning).includes(target) ||
                normalize(item.synonyms).includes(target) ||
                normalize(item.language).includes(target)
            );
        });

        searchResults = matches;
        searchIndex = 0;

        if (searchResults.length > 0) {
            const matchedItem = searchResults[0];
            fillForm(matchedItem, matchedItem._documentId);
            if (searchResult) {
                searchResult.textContent = searchResults.length > 1
                    ? `تم العثور على ${searchResults.length} نتائج (اضغط بحث للتنقل بينها).`
                    : `تم العثور على نتيجة مطابقة.`;
            }
        } else {
            selectedDocumentId = null;
            if (searchResult) searchResult.textContent = "لم يتم العثور على نتائج مطابقة.";
            showNotification("لا توجد نتائج مطابقة.");
        }
    });
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
// CRUD OPERATIONS (مع التأكيد قبل التعديل والحذف)
// ======================================================

if (registerButton) {
    registerButton.addEventListener("click", async () => {
        if (!currentUser) {
            showNotification("يجب تسجيل الدخول أولاً.");
            return;
        }

        const word = wordInput ? wordInput.value.trim() : "";
        const meaning = meaningInput ? meaningInput.value.trim() : "";
        const synonyms = synonymsInput ? synonymsInput.value.trim() : "";
        const language = languageSelect ? languageSelect.value : "";
        const id = idInput ? Number(idInput.value) : 1;

        if (!word || !meaning || !language) {
            showNotification("يرجى إدخال الكلمة والمعنى واختيار اللغة.");
            return;
        }

        try {
            await addDoc(wordsCollection, {
                id,
                word,
                meaning,
                synonyms,
                language,
                userId: currentUser.uid,
                userEmail: currentUser.email || "",
                createdAt: serverTimestamp()
            });

            showNotification("تم تسجيل الكلمة بنجاح.");
            await clearForm();
            await initializePageData();
        } catch (error) {
            showNotification("حدث خطأ أثناء الحفظ.");
        }
    });
}

if (updateButton) {
    updateButton.addEventListener("click", async () => {
        if (!selectedDocumentId) {
            showNotification("الرجاء اختيار كلمة أولاً لتحديثها.");
            return;
        }

        // سؤال المستخدم قبل التعديل
        const confirmUpdate = confirm("هل أنت متأكد من تعديل هذه الكلمة؟");
        if (!confirmUpdate) return;

        const word = wordInput ? wordInput.value.trim() : "";
        const meaning = meaningInput ? meaningInput.value.trim() : "";
        const synonyms = synonymsInput ? synonymsInput.value.trim() : "";
        const language = languageSelect ? languageSelect.value : "";

        try {
            const docRef = doc(db, "words", selectedDocumentId);
            await updateDoc(docRef, { word, meaning, synonyms, language });

            showNotification("تم تحديث الكلمة بنجاح.");
            await clearForm();
            await initializePageData();
        } catch (error) {
            showNotification("حدث خطأ أثناء التحديث.");
        }
    });
}

if (deleteButton) {
    deleteButton.addEventListener("click", async () => {
        if (!selectedDocumentId) {
            showNotification("الرجاء اختيار كلمة أولاً لحذفها.");
            return;
        }

        // سؤال المستخدم قبل الحذف
        const confirmDelete = confirm("هل أنت متأكد من حذف هذه الكلمة نهائياً؟");
        if (!confirmDelete) return;

        try {
            const docRef = doc(db, "words", selectedDocumentId);
            await deleteDoc(docRef);

            showNotification("تم حذف الكلمة بنجاح.");
            await clearForm();
            await initializePageData();
        } catch (error) {
            showNotification("حدث خطأ أثناء الحذف.");
        }
    });
}

if (clearButton) {
    clearButton.addEventListener("click", async () => {
        await clearForm();
        showNotification("تم مسح الحقول.");
    });
}


// ======================================================
// DOWNLOAD PDF (مع ضبط الألوان وخلفية بيضاء صريحة)
// ======================================================

if (downloadPdfButton) {
    downloadPdfButton.addEventListener("click", async function () {
        if (!currentUser) {
            showNotification("يجب تسجيل الدخول أولاً.");
            return;
        }

        try {
            showNotification("جاري تجهيز ملف الـ PDF...");

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

            const selectedLanguageText = (languageFilter && languageFilter.options[languageFilter.selectedIndex])
                ? languageFilter.options[languageFilter.selectedIndex].textContent
                : "جميع اللغات";

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF("p", "mm", "a4");

            const chunkSize = 30;
            const totalChunks = Math.ceil(rows.length / chunkSize);

            // تم إصلاح مشكلة الخلفية البيضاء والخانات الغير ظاهرة
            const printArea = document.createElement("div");
            printArea.style.cssText = `
                position: fixed;
                top: -9999px;
                left: -9999px;
                width: 800px;
                background-color: #ffffff !important;
                color: #000000 !important;
                padding: 20px;
                font-family: Cairo, Arial, sans-serif;
                direction: rtl;
                z-index: -9999;
            `;
            document.body.appendChild(printArea);

            for (let i = 0; i < totalChunks; i++) {
                const chunkRows = rows.slice(i * chunkSize, (i + 1) * chunkSize);

                printArea.innerHTML = `
                    <div style="text-align: center; margin-bottom: 15px; background: #ffffff;">
                        <h2 style="margin:0; font-size: 20px; color: #000000;">Langdex Report</h2>
                        <p style="margin:3px 0; font-size: 13px; color: #333333;">اللغة: ${selectedLanguageText} (صفحة ${i + 1} من ${totalChunks})</p>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px; color: #000000; background-color: #ffffff;">
                        <thead>
                            <tr style="background-color: #e0e0e0; color: #000000;">
                                <th style="border: 1px solid #000000; padding: 6px; width: 10%;">#</th>
                                <th style="border: 1px solid #000000; padding: 6px; width: 25%;">الكلمة</th>
                                <th style="border: 1px solid #000000; padding: 6px; width: 30%;">المعنى</th>
                                <th style="border: 1px solid #000000; padding: 6px; width: 20%;">المرادف</th>
                                <th style="border: 1px solid #000000; padding: 6px; width: 15%;">اللغة</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${chunkRows.map((item, idx) => `
                                <tr style="background-color: #ffffff;">
                                    <td style="border: 1px solid #000000; padding: 5px; text-align: center; color: #000000;">${(i * chunkSize) + idx + 1}</td>
                                    <td style="border: 1px solid #000000; padding: 5px; color: #000000;">${item.word || '-'}</td>
                                    <td style="border: 1px solid #000000; padding: 5px; color: #000000;">${item.meaning || '-'}</td>
                                    <td style="border: 1px solid #000000; padding: 5px; color: #000000;">${item.synonyms || '-'}</td>
                                    <td style="border: 1px solid #000000; padding: 5px; text-align: center; color: #000000;">${item.language || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;

                await new Promise(resolve => setTimeout(resolve, 0));

                const canvas = await html2canvas(printArea, {
                    scale: 2,
                    backgroundColor: "#ffffff",
                    useCORS: true,
                    logging: false
                });

                const imgData = canvas.toDataURL("image/jpeg", 0.95);
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

            showNotification("تم تحميل ملف الـ PDF بنجاح.");
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

    if (idInput) {
        await setNextId();
    }

    await initializePageData();
});

document.addEventListener("DOMContentLoaded", async () => {
    if (auth.currentUser) {
        currentUser = auth.currentUser;
        if (idInput) {
            await setNextId();
        }
        await initializePageData();
    }
});
