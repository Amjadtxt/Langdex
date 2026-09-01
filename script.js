// ======================================================
// LANGDEX - script.js
// Firebase + Authentication + User Data + Data Table
// Filter + Search + PDF
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
    deleteDoc,
    query,
    where
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

const ADMIN_EMAILS = ["admin@gmail.com"]; // قائمة إيميلات الأدمن


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
    return String(value ?? "")
        .trim()
        .toLowerCase();
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
// GET ALL WORDS FOR CURRENT USER
// ======================================================

async function getAllWords() {
    if (!currentUser) {
        throw new Error("No authenticated user.");
    }

    const userWordsQuery = query(
        wordsCollection,
        where("userId", "==", currentUser.uid)
    );

    const snapshot = await getDocs(userWordsQuery);
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

    if (searchInput) searchInput.value = "";
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
// POPULATE LANGUAGE FILTER (بدون عرض الجدول)
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
            fillForm(data, data._documentId);
            showNotification(`تم اختيار الكلمة: ${data.word}`);
        });

        dataTable.appendChild(row);
    });
}


// ======================================================
// APPLY LANGUAGE FILTER
// ======================================================

function applyLanguageFilter() {
    if (!dataTable) return;

    const selectedLanguage = languageFilter ? languageFilter.value.trim() : "all";

    if (selectedLanguage === "" || selectedLanguage === "all") {
        renderTable(allTableData);
        return;
    }

    const filteredData = allTableData.filter(item => {
        return normalize(item.language) === normalize(selectedLanguage);
    });

    renderTable(filteredData);
}


// ======================================================
// SHOW DATA & FILTER LISTENERS
// ======================================================

if (showDataButton) {
    showDataButton.addEventListener("click", async function () {
        try {
            allTableData = await getAllWords();
            populateLanguageFilter(allTableData);
            applyLanguageFilter();
            showNotification(`تم عرض ${dataTable.children.length} سجل.`);
        } catch (error) {
            console.error("Show Data Error:", error);
            showNotification("حدث خطأ أثناء عرض البيانات.");
        }
    });
}

if (languageFilter) {
    languageFilter.addEventListener("change", async function () {
        try {
            if (allTableData.length === 0) {
                allTableData = await getAllWords();
            }
            applyLanguageFilter();
        } catch (error) {
            console.error("Filter Error:", error);
            showNotification("حدث خطأ أثناء تطبيق الفلتر.");
        }
    });
}

if (clearFilterButton) {
    clearFilterButton.addEventListener("click", function () {
        if (languageFilter) {
            languageFilter.value = "all";
        }

        if (dataTable) {
            dataTable.innerHTML = "";
        }

        showNotification("تم إخفاء عرض البيانات.");
    });
}


// ======================================================
// SEARCH FIREBASE
// ======================================================

async function searchFirebase(text) {
    const rows = await getAllWords();
    const target = normalize(text);

    return rows.filter(item => {
        return (
            normalize(item.id).includes(target) ||
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
            showNotification("اكتب شيئًا للبحث.");
            return;
        }

        try {
            if (normalize(text) !== normalize(lastSearchText)) {
                searchResults = await searchFirebase(text);
                searchIndex = 0;
                lastSearchText = text;
            }

            if (searchResults.length === 0) {
                showNotification("لم يتم العثور على نتائج.");
                return;
            }

            const result = searchResults[searchIndex];
            fillForm(result, result._documentId);

            if (searchResult) {
                searchResult.textContent = `تم العثور على ${searchIndex + 1} من ${searchResults.length}`;
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
// REGISTER / UPDATE / DELETE
// ======================================================

if (registerButton) {
    registerButton.addEventListener("click", async function () {
        if (!currentUser) {
            showNotification("يجب تسجيل الدخول أولاً.");
            return;
        }

        const word = wordInput ? wordInput.value.trim() : "";
        const meaning = meaningInput ? meaningInput.value.trim() : "";
        const synonyms = synonymsInput ? synonymsInput.value.trim() : "";
        const language = languageSelect ? languageSelect.value.trim() : "";

        if (!word || !meaning || !language) {
            showNotification("يرجى إكمال البيانات الأساسية.");
            return;
        }

        try {
            const rows = await getAllWords();

            const duplicate = rows.find(item => normalize(item.word) === normalize(word));

            if (duplicate) {
                showNotification(`الكلمة موجودة بالفعل - ID: ${duplicate.id}`);
                fillForm(duplicate, duplicate._documentId);
                return;
            }

            const newId = await getNextId();
            const userEmail = currentUser.email || "";
            const username = userEmail.includes("@") ? userEmail.split("@")[0] : "مستخدم";

            await addDoc(wordsCollection, {
                id: newId,
                word: word,
                meaning: meaning,
                synonyms: synonyms,
                language: language,
                userId: currentUser.uid,
                userEmail: userEmail,
                username: username
            });

            showNotification(`تم تسجيل الكلمة بنجاح - ID: ${newId}`);
            
            allTableData = await getAllWords();
            populateLanguageFilter(allTableData);

            await clearForm();
        } catch (error) {
            console.error("Register Error:", error);
            showNotification("حدث خطأ أثناء حفظ البيانات.");
        }
    });
}

if (updateButton) {
    updateButton.addEventListener("click", async function () {
        if (!currentUser || !selectedDocumentId) {
            showNotification("اختر الكلمة أولاً لتعديلها.");
            return;
        }

        const word = wordInput ? wordInput.value.trim() : "";
        const meaning = meaningInput ? meaningInput.value.trim() : "";
        const synonyms = synonymsInput ? synonymsInput.value.trim() : "";
        const language = languageSelect ? languageSelect.value.trim() : "";

        if (!word || !meaning || !language) {
            showNotification("يرجى إكمال البيانات الأساسية.");
            return;
        }

        try {
            const wordRef = doc(db, "words", selectedDocumentId);

            await updateDoc(wordRef, {
                word: word,
                meaning: meaning,
                synonyms: synonyms,
                language: language
            });

            showNotification("تم تحديث البيانات بنجاح.");
            
            allTableData = await getAllWords();
            populateLanguageFilter(allTableData);
            if (dataTable && dataTable.children.length > 0) applyLanguageFilter();

            await clearForm();
        } catch (error) {
            console.error("Update Error:", error);
            showNotification("حدث خطأ أثناء التحديث.");
        }
    });
}

if (deleteButton) {
    deleteButton.addEventListener("click", async function (event) {
        event.preventDefault();

        if (!currentUser || !selectedDocumentId) {
            showNotification("اختر الكلمة أولاً لحذفها.");
            return;
        }

        if (!confirm("هل أنت متأكد من حذف هذه الكلمة؟")) return;

        try {
            const wordRef = doc(db, "words", selectedDocumentId);
            await deleteDoc(wordRef);

            showNotification("تم حذف البيانات بنجاح.");
            
            allTableData = await getAllWords();
            populateLanguageFilter(allTableData);
            if (dataTable && dataTable.children.length > 0) applyLanguageFilter();

            await clearForm();
        } catch (error) {
            console.error("Delete Error:", error);
            showNotification("حدث خطأ أثناء الحذف.");
        }
    });
}

if (clearButton) {
    clearButton.addEventListener("click", async function (event) {
        event.preventDefault();
        await clearForm();
        showNotification("تم مسح البيانات.");
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

        if (typeof html2pdf === "undefined") {
            showNotification("مكتبة PDF غير محملة.");
            return;
        }

        try {
            if (allTableData.length === 0) {
                allTableData = await getAllWords();
            }

            let selectedLanguage = languageFilter ? languageFilter.value.trim() : "all";
            let rows = allTableData;

            if (selectedLanguage !== "all" && selectedLanguage !== "") {
                rows = allTableData.filter(item => normalize(item.language) === normalize(selectedLanguage));
            }

            if (rows.length === 0) {
                showNotification("لا توجد بيانات لتحميلها.");
                return;
            }

            showNotification("جاري تجهيز ملف PDF...");

            const container = document.createElement("div");
            container.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 900px;
                background: #ffffff;
                color: #000000;
                padding: 25px;
                box-sizing: border-box;
                direction: rtl;
                font-family: Cairo, Arial, sans-serif;
                z-index: 999999;
            `;

            const selectedLanguageText = (languageFilter && languageFilter.options[languageFilter.selectedIndex])
                ? languageFilter.options[languageFilter.selectedIndex].textContent
                : "جميع اللغات";

            container.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="margin: 0; font-size: 26px; color: #000;">Langdex Data</h1>
                    <h3 style="margin: 5px 0 0; font-size: 16px; color: #333;">اللغة: ${selectedLanguageText}</h3>
                </div>
                <table style="width: 100%; border-collapse: collapse; direction: rtl; font-size: 11px; table-layout: fixed;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="border: 1px solid #000; padding: 6px; width: 8%;">#</th>
                            <th style="border: 1px solid #000; padding: 6px; width: 22%;">الكلمة</th>
                            <th style="border: 1px solid #000; padding: 6px; width: 35%;">المعنى</th>
                            <th style="border: 1px solid #000; padding: 6px; width: 20%;">المرادف</th>
                            <th style="border: 1px solid #000; padding: 6px; width: 15%;">اللغة</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map((item, idx) => `
                            <tr>
                                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${idx + 1}</td>
                                <td style="border: 1px solid #000; padding: 5px; word-break: break-word;">${item.word || '-'}</td>
                                <td style="border: 1px solid #000; padding: 5px; word-break: break-word;">${item.meaning || '-'}</td>
                                <td style="border: 1px solid #000; padding: 5px; word-break: break-word;">${item.synonyms || '-'}</td>
                                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${item.language || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <p style="text-align: center; margin-top: 15px; font-weight: bold; font-size: 12px; color: #000;">
                    إجمالي الكلمات: ${rows.length}
                </p>
            `;

            document.body.appendChild(container);

            const originalScrollY = window.scrollY;
            window.scrollTo(0, 0);

            const safeLanguage = selectedLanguageText.replace(/[\\/:*?"<>|]/g, "-");
            const fileName = `Langdex-${safeLanguage}.pdf`;

            const opt = {
                margin: [8, 8, 8, 8],
                filename: fileName,
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: "#ffffff",
                    logging: false,
                    scrollY: 0,
                    scrollX: 0
                },
                pagebreak: { mode: ["css", "legacy"] },
                jsPDF: { unit: "mm", format: "a4", orientation: "landscape", compress: true }
            };

            await html2pdf().set(opt).from(container).save();

            container.remove();
            window.scrollTo(0, originalScrollY);

            showNotification("تم تحميل ملف PDF بنجاح.");
        } catch (error) {
            console.error("PDF Error:", error);
            showNotification("حدث خطأ أثناء إنشاء PDF.");
        }
    });
}


// ======================================================
// AUTH STATE & ROUTE GUARD (طرد الأدمن من index.html)
// ======================================================

onAuthStateChanged(auth, async user => {
    // 1. إذا لم يكن مسجلاً للدخول، توجيهه لصفحة التسجيل
    if (!user) {
        currentUser = null;
        window.location.href = "login.html";
        return;
    }

    const userEmail = (user.email || "").toLowerCase();
    const isAdmin = ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail);

    // 2. طرد الأدمن مباشرة عند دخوا أي صفحة مستخدم عادية (مثل index.html) إلى admin.html
    if (isAdmin) {
        window.location.href = "admin.html";
        return; // إيقاف التنفيذ لمنع جلب البيانات أو التعامل مع واجهة المستخدم
    }

    // 3. مستخدم عادي
    currentUser = user;

    if (idInput) {
        await setNextId();
    }

    // جلب البيانات فوراً وتجهيز قائمة اللغات
    try {
        allTableData = await getAllWords();
        populateLanguageFilter(allTableData);
    } catch (err) {
        console.error("Initial load error:", err);
    }
});
