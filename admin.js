// ======================================================
// LANGDEX - admin.js
// Firebase + Admin Management + All Users Data
// Global Search + Full CRUD + Advanced PDF Export
// ======================================================

// ======================================================
// FIREBASE IMPORTS
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
    deleteDoc
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

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const wordsCollection = collection(db, "words");

// ======================================================
// CURRENT ADMIN STATE
// ======================================================

let currentAdmin = null;
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
let userIdInput = null;
let wordInput = null;
let meaningInput = null;
let synonymsInput = null;
let languageSelect = null;

if (form) {
    const inputs = form.querySelectorAll("input");
    
    // ترتيب المدخلات في صفحة الأدمن:
    // 0: ID الكلمة (تلقائي)
    // 1: User ID (معرف المستخدم صاحب الكلمة)
    // 2: الكلمة
    // 3: المعنى
    // 4: المرادفات
    idInput = inputs[0] || null;
    userIdInput = inputs[1] || null;
    wordInput = inputs[2] || null;
    meaningInput = inputs[3] || null;
    synonymsInput = inputs[4] || null;

    languageSelect = form.querySelector("select") || null;
}

// ======================================================
// BUTTON ELEMENTS
// ======================================================

const registerButton = document.querySelector(".reg");
const updateButton = document.querySelector(".upa");
const deleteButton = document.querySelector(".del");
const clearButton = document.querySelector(".cel");

// ======================================================
// SEARCH ELEMENTS
// ======================================================

const searchInput = document.querySelector(".search-txt");
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
        background: #111111;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 5px 20px rgba(0,0,0,0.4);
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
// GET ALL WORDS ACROSS ALL USERS
// ======================================================

async function getAllWordsAdmin() {
    if (!currentAdmin) throw new Error("لم يتم تسجيل دخول الأدمن.");

    const snapshot = await getDocs(wordsCollection);
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
}

// ======================================================
// SMART ID (GLOBAL)
// ======================================================

async function getNextIdAdmin() {
    try {
        const rows = await getAllWordsAdmin();
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
        console.error("Get Next ID Admin Error:", error);
        return 1;
    }
}

async function setNextIdAdmin() {
    if (!idInput) return;
    try {
        const nextId = await getNextIdAdmin();
        idInput.value = nextId;
    } catch (error) {
        console.error("Set Next ID Error:", error);
    }
}

// ======================================================
// CLEAR FORM
// ======================================================

async function clearFormAdmin() {
    if (userIdInput) userIdInput.value = "";
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

    await setNextIdAdmin();
}

// ======================================================
// FILL FORM
// ======================================================

function fillFormAdmin(data, documentId) {
    selectedDocumentId = documentId;

    if (idInput) idInput.value = data.id ?? "";
    if (userIdInput) userIdInput.value = data.userId ?? "";
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

    const exists = [...languageFilter.options].some(option => normalize(option.value) === normalize(currentValue));
    languageFilter.value = (currentValue && exists) ? currentValue : "all";
}

// ======================================================
// RENDER TABLE (ADMIN VIEW INCLUDES USER ID)
// ======================================================

function renderTableAdmin(rows) {
    if (!dataTable) return;

    dataTable.innerHTML = "";

    rows.forEach(data => {
        const row = document.createElement("tr");

        // الخانات المعروضة للأدمن: [ID, المستخدم, الكلمة, المعنى, المرادف, اللغة]
        const values = [
            data.id,
            data.userId,
            data.word,
            data.meaning,
            data.synonyms,
            data.language
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = (value !== undefined && value !== null && String(value).trim() !== "") ? value : "-";
            row.appendChild(cell);
        });

        // النقر على السطر يملأ استمارة التعديل تلقائياً
        row.style.cursor = "pointer";
        row.addEventListener("click", () => {
            fillFormAdmin(data, data._documentId);
            showNotification(`تم تحديد الكلمة: ${data.word}`);
        });

        dataTable.appendChild(row);
    });
}

function applyLanguageFilterAdmin() {
    if (!dataTable) return;

    const selectedLanguage = languageFilter ? languageFilter.value.trim() : "all";

    if (selectedLanguage === "" || selectedLanguage === "all") {
        renderTableAdmin(allTableData);
        return;
    }

    const filteredData = allTableData.filter(item => normalize(item.language) === normalize(selectedLanguage));
    renderTableAdmin(filteredData);
}

// ======================================================
// SHOW DATA BUTTON
// ======================================================

if (showDataButton) {
    showDataButton.addEventListener("click", async function () {
        try {
            allTableData = await getAllWordsAdmin();
            populateLanguageFilter(allTableData);
            applyLanguageFilterAdmin();
            showNotification(`تم إحضار ${allTableData.length} كلمة من جميع المستخدمين.`);
        } catch (error) {
            console.error("Show Data Admin Error:", error);
            showNotification("حدث خطأ أثناء جلب البيانات.");
        }
    });
}

if (languageFilter) {
    languageFilter.addEventListener("change", async function () {
        try {
            if (allTableData.length === 0) {
                allTableData = await getAllWordsAdmin();
                populateLanguageFilter(allTableData);
            }
            applyLanguageFilterAdmin();
        } catch (error) {
            console.error("Filter Error:", error);
            showNotification("حدث خطأ أثناء الفلترة.");
        }
    });
}

if (clearFilterButton) {
    clearFilterButton.addEventListener("click", function () {
        if (languageFilter) languageFilter.value = "all";
        if (dataTable) dataTable.innerHTML = "";
        allTableData = [];
        showNotification("تم إلغاء عرض البيانات.");
    });
}

// ======================================================
// GLOBAL SEARCH (BY ID, USER ID, WORD, MEANING, LANGUAGE)
// ======================================================

async function searchFirebaseAdmin(text) {
    const rows = await getAllWordsAdmin();
    const target = normalize(text);

    return rows.filter(item => {
        return (
            normalize(item.id).includes(target) ||
            normalize(item.userId).includes(target) ||
            normalize(item.word).includes(target) ||
            normalize(item.meaning).includes(target) ||
            normalize(item.synonyms).includes(target) ||
            normalize(item.language).includes(target)
        );
    });
}

if (searchButton && searchInput) {
    searchButton.addEventListener("click", async function () {
        const text = searchInput.value.trim();

        if (!text) {
            showNotification("اكتب شيئاً للبحث (كلمة، معرف مستخدم، ID...).");
            return;
        }

        try {
            if (normalize(text) !== normalize(lastSearchText)) {
                searchResults = await searchFirebaseAdmin(text);
                searchIndex = 0;
                lastSearchText = text;
            }

            if (searchResults.length === 0) {
                showNotification("لم يتم العثور على أي نتائج.");
                return;
            }

            const result = searchResults[searchIndex];
            fillFormAdmin(result, result._documentId);

            if (searchResult) {
                searchResult.textContent = `نتيجة ${searchIndex + 1} من ${searchResults.length}`;
            }

            searchIndex++;
            if (searchIndex >= searchResults.length) {
                searchIndex = 0;
            }
        } catch (error) {
            console.error("Search Error:", error);
            showNotification("حدث خطأ أثناء البحث.");
        }
    });
}

// ======================================================
// REGISTER / ADD WORD (ADMIN CAN ASSIGN USER ID)
// ======================================================

if (registerButton) {
    registerButton.addEventListener("click", async function () {
        if (!currentAdmin) {
            showNotification("يجب تسجيل الدخول كأدمن أولاً.");
            return;
        }

        const targetUserId = userIdInput ? userIdInput.value.trim() : currentAdmin.uid;
        const word = wordInput ? wordInput.value.trim() : "";
        const meaning = meaningInput ? meaningInput.value.trim() : "";
        const synonyms = synonymsInput ? synonymsInput.value.trim() : "";
        const language = languageSelect ? languageSelect.value.trim() : "";

        if (!targetUserId) {
            showNotification("حدد معرف المستخدم (User ID).");
            return;
        }
        if (!word || !meaning || !language) {
            showNotification("يرجى ملء كافة البيانات الأساسية.");
            return;
        }

        try {
            const rows = await getAllWordsAdmin();
            const duplicate = rows.find(item => normalize(item.word) === normalize(word) && item.userId === targetUserId);

            if (duplicate) {
                showNotification(`الكلمة موجودة بالفعل لهذا المستخدم - ID: ${duplicate.id}`);
                fillFormAdmin(duplicate, duplicate._documentId);
                return;
            }

            const newId = await getNextIdAdmin();

            await addDoc(wordsCollection, {
                id: newId,
                word: word,
                meaning: meaning,
                synonyms: synonyms,
                language: language,
                userId: targetUserId
            });

            showNotification(`تم تسجيل الكلمة بنجاح - ID: ${newId}`);
            await clearFormAdmin();
        } catch (error) {
            console.error("Register Error:", error);
            showNotification("حدث خطأ أثناء حفظ البيانات.");
        }
    });
}

// ======================================================
// UPDATE WORD (ADMIN)
// ======================================================

if (updateButton) {
    updateButton.addEventListener("click", async function () {
        if (!currentAdmin) {
            showNotification("يجب تسجيل الدخول أولاً.");
            return;
        }

        if (!selectedDocumentId) {
            showNotification("اختر كلمة أولاً للقيام بالتعديل.");
            return;
        }

        const targetUserId = userIdInput ? userIdInput.value.trim() : currentAdmin.uid;
        const word = wordInput ? wordInput.value.trim() : "";
        const meaning = meaningInput ? meaningInput.value.trim() : "";
        const synonyms = synonymsInput ? synonymsInput.value.trim() : "";
        const language = languageSelect ? languageSelect.value.trim() : "";

        if (!word || !meaning || !language) {
            showNotification("يرجى اختيار البيانات المطلوبة كاملة.");
            return;
        }

        try {
            const wordRef = doc(db, "words", selectedDocumentId);

            await updateDoc(wordRef, {
                word: word,
                meaning: meaning,
                synonyms: synonyms,
                language: language,
                userId: targetUserId
            });

            showNotification("تم تحديث الكلمة بنجاح بواسطة الأدمن.");
            await clearFormAdmin();
        } catch (error) {
            console.error("Update Error:", error);
            showNotification("حدث خطأ أثناء التحديث.");
        }
    });
}

// ======================================================
// DELETE WORD (ADMIN)
// ======================================================

if (deleteButton) {
    deleteButton.addEventListener("click", async function (event) {
        event.preventDefault();

        if (!currentAdmin) {
            showNotification("يجب تسجيل الدخول أولاً.");
            return;
        }

        if (!selectedDocumentId) {
            showNotification("حدد الكلمة المراد حذفها أولاً.");
            return;
        }

        const confirmed = confirm("هل أنت متأكد من حذف هذه الكلمة نهائياً من النظام؟");
        if (!confirmed) return;

        try {
            const wordRef = doc(db, "words", selectedDocumentId);
            await deleteDoc(wordRef);

            showNotification("تم حذف الكلمة بنجاح.");
            await clearFormAdmin();
        } catch (error) {
            console.error("Delete Error:", error);
            showNotification("حدث خطأ أثناء عملية الحذف.");
        }
    });
}

// ======================================================
// CLEAR BUTTON
// ======================================================

if (clearButton) {
    clearButton.addEventListener("click", async function (event) {
        event.preventDefault();
        await clearFormAdmin();
        showNotification("تم تفريغ الاستمارة.");
    });
}

// ======================================================
// DOWNLOAD PDF (ADMIN INCLUDES USER ID COLUMN)
// ======================================================

if (downloadPdfButton) {
    downloadPdfButton.addEventListener("click", async function () {
        if (!currentAdmin) {
            showNotification("يجب تسجيل الدخول أولاً.");
            return;
        }

        if (typeof html2pdf === "undefined") {
            showNotification("مكتبة html2pdf غير متوفرة.");
            return;
        }

        try {
            if (allTableData.length === 0) {
                allTableData = await getAllWordsAdmin();
            }

            if (allTableData.length === 0) {
                showNotification("لا توجد بيانات للطباعة.");
                return;
            }

            let selectedLanguage = "جميع اللغات";
            if (languageFilter && languageFilter.value && languageFilter.value !== "all") {
                selectedLanguage = languageFilter.value;
            }

            let rows = allTableData;
            if (selectedLanguage !== "جميع اللغات") {
                rows = allTableData.filter(item => normalize(item.language) === normalize(selectedLanguage));
            }

            const container = document.createElement("div");
            container.style.cssText = `
                position: fixed; left: -10000px; top: 0; width: 1000px;
                background: #ffffff; color: #000000; padding: 25px;
                box-sizing: border-box; direction: rtl; font-family: Cairo, Arial, sans-serif;
            `;

            const header = document.createElement("div");
            header.style.textAlign = "center";
            header.style.marginBottom = "20px";
            header.innerHTML = `
                <h1 style="margin:0; font-size:26px; color:#000;">Langdex Admin Report</h1>
                <h3 style="margin:5px 0 0; font-size:16px; color:#444;">اللغة: ${selectedLanguage}</h3>
            `;
            container.appendChild(header);

            const table = document.createElement("table");
            table.style.cssText = "width: 100%; border-collapse: collapse; table-layout: fixed; direction: rtl; font-size: 10px;";

            const colgroup = document.createElement("colgroup");
            const widths = ["6%", "20%", "20%", "24%", "18%", "12%"];
            widths.forEach(w => {
                const col = document.createElement("col");
                col.style.width = w;
                colgroup.appendChild(col);
            });
            table.appendChild(colgroup);

            const thead = document.createElement("thead");
            const headerRow = document.createElement("tr");
            const headers = ["الترتيب", "User ID", "الكلمة", "المعنى", "المرادف", "اللغة"];

            headers.forEach(text => {
                const th = document.createElement("th");
                th.textContent = text;
                th.style.cssText = "border: 1px solid #000; padding: 6px; text-align: center; background: #e0e0e0; font-weight: bold;";
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            const tbody = document.createElement("tbody");
            rows.forEach((data, index) => {
                const row = document.createElement("tr");
                const values = [index + 1, data.userId || "-", data.word || "-", data.meaning || "-", data.synonyms || "-", data.language || "-"];

                values.forEach((val, i) => {
                    const td = document.createElement("td");
                    td.textContent = String(val);
                    td.style.cssText = "border: 1px solid #000; padding: 5px; word-break: break-word; overflow-wrap: break-word;";
                    td.style.textAlign = (i === 0) ? "center" : "right";
                    row.appendChild(td);
                });
                tbody.appendChild(row);
            });
            table.appendChild(tbody);
            container.appendChild(table);

            const footer = document.createElement("p");
            footer.textContent = `إجمالي عدد المسجلات: ${rows.length}`;
            footer.style.cssText = "text-align: center; margin-top: 15px; font-weight: bold;";
            container.appendChild(footer);

            document.body.appendChild(container);

            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

            const safeLang = selectedLanguage.replace(/[\\/:*?"<>|]/g, "-");
            await html2pdf().set({
                margin: [8, 8, 8, 8],
                filename: `Langdex-Admin-Report-${safeLang}.pdf`,
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", windowWidth: 1000 },
                pagebreak: { mode: ["css", "legacy"] },
                jsPDF: { unit: "mm", format: "a4", orientation: "landscape", compress: true }
            }).from(container).save();

            container.remove();
            showNotification("تم إنشاء وتقديم تقرير PDF بنجاح.");
        } catch (error) {
            console.error("PDF Export Error:", error);
            showNotification("حدث خطأ أثناء طباعة PDF.");
        }
    });
}

// ======================================================
// AUTH STATE
// ======================================================

onAuthStateChanged(auth, async user => {
    if (!user) {
        currentAdmin = null;
        console.log("No authenticated admin user.");
        return;
    }

    currentAdmin = user;
    console.log("Logged in as Admin UID:", currentAdmin.uid);

    if (idInput) {
        await setNextIdAdmin();
    }

    if (languageFilter) {
        allTableData = await getAllWordsAdmin();
        populateLanguageFilter(allTableData);
    }
});
