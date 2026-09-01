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

const ADMIN_EMAILS = ["admin@gmail.com"]; // أضف إيميل الأدمن هنا


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
// CURRENT USER
// ======================================================

let currentUser = null;


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
// VARIABLES
// ======================================================

let selectedDocumentId = null;
let allTableData = [];
let searchResults = [];
let searchIndex = 0;
let lastSearchText = "";


// ======================================================
// NORMALIZE
// ======================================================

function normalize(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}


// ======================================================
// PAGE NOTIFICATION
// ======================================================

function showNotification(message, type = "normal") {
    let notification = document.querySelector(".langdex-notification");

    if (!notification) {
        notification = document.createElement("div");
        notification.className = "langdex-notification";
        document.body.appendChild(notification);
    }

    notification.textContent = message;
    notification.style.color = "#FFFFFF";
    notification.style.position = "fixed";
    notification.style.top = "25px";
    notification.style.left = "50%";
    notification.style.transform = "translateX(-50%)";
    notification.style.zIndex = "999999";
    notification.style.padding = "12px 22px";
    notification.style.borderRadius = "10px";
    notification.style.fontFamily = "Cairo, Arial, sans-serif";
    notification.style.fontSize = "15px";
    notification.style.fontWeight = "600";
    notification.style.textAlign = "center";
    notification.style.maxWidth = "90%";
    notification.style.boxSizing = "border-box";
    notification.style.direction = "rtl";
    notification.style.background = "#222";
    notification.style.border = "1px solid rgba(255,255,255,0.25)";
    notification.style.boxShadow = "0 5px 20px rgba(0,0,0,0.3)";
    notification.style.opacity = "1";

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


// ======================================================
// SET NEXT ID
// ======================================================

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
// CLEAR FORM
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


// ======================================================
// FILL FORM
// ======================================================

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
// INITIALIZE DATA PAGE
// ======================================================

async function initializeDataPage() {
    if (!languageFilter) return;

    try {
        const rows = await getAllWords();
        allTableData = rows;

        populateLanguageFilter(allTableData);

        if (dataTable) {
            dataTable.innerHTML = "";
        }
    } catch (error) {
        console.error("Initial Data Load Error:", error);
        showNotification("حدث خطأ أثناء تحميل اللغات.");
    }
}


// ======================================================
// SHOW DATA
// ======================================================

if (showDataButton) {
    showDataButton.addEventListener("click", async function () {
        try {
            allTableData = await getAllWords();
            populateLanguageFilter(allTableData);
            applyLanguageFilter();
        } catch (error) {
            console.error("Show Data Error:", error);
            showNotification("حدث خطأ أثناء عرض البيانات.");
        }
    });
}


// ======================================================
// FILTER CHANGE
// ======================================================

if (languageFilter) {
    languageFilter.addEventListener("change", async function () {
        try {
            if (allTableData.length === 0) {
                allTableData = await getAllWords();
                populateLanguageFilter(allTableData);
            }
            applyLanguageFilter();
        } catch (error) {
            console.error("Filter Error:", error);
            showNotification("حدث خطأ أثناء تطبيق الفلتر.");
        }
    });
}


// ======================================================
// CLEAR FILTER
// ======================================================

if (clearFilterButton) {
    clearFilterButton.addEventListener("click", function () {
        if (languageFilter) {
            languageFilter.value = "all";
        }

        if (dataTable) {
            dataTable.innerHTML = "";
        }

        allTableData = [];
        showNotification("تم إلغاء عرض البيانات.");
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


// ======================================================
// SEARCH BUTTON
// ======================================================

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
// REGISTER
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

        if (!word) {
            showNotification("اكتب الكلمة.");
            return;
        }

        if (!meaning) {
            showNotification("اكتب المعنى.");
            return;
        }

        if (!language) {
            showNotification("اختر اللغة.");
            return;
        }

        try {
            const rows = await getAllWords();

            const duplicate = rows.find(item => {
                return normalize(item.word) === normalize(word);
            });

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

            showNotification(`تم تسجيل البيانات بنجاح - ID: ${newId}`);
            await clearForm();
        } catch (error) {
            console.error("Register Error:", error);
            showNotification("حدث خطأ أثناء حفظ البيانات.");
        }
    });
}


// ======================================================
// UPDATE
// ======================================================

if (updateButton) {
    updateButton.addEventListener("click", async function () {
        if (!currentUser) {
            showNotification("يجب تسجيل الدخول أولاً.");
            return;
        }

        if (!selectedDocumentId) {
            showNotification("ابحث عن الكلمة أولاً.");
            return;
        }

        const word = wordInput ? wordInput.value.trim() : "";
        const meaning = meaningInput ? meaningInput.value.trim() : "";
        const synonyms = synonymsInput ? synonymsInput.value.trim() : "";
        const language = languageSelect ? languageSelect.value.trim() : "";

        if (!word) {
            showNotification("اكتب الكلمة.");
            return;
        }

        if (!meaning) {
            showNotification("اكتب المعنى.");
            return;
        }

        if (!language) {
            showNotification("اختر اللغة.");
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
            await clearForm();
        } catch (error) {
            console.error("Update Error:", error);
            showNotification("حدث خطأ أثناء التحديث.");
        }
    });
}


// ======================================================
// DELETE
// ======================================================

if (deleteButton) {
    deleteButton.addEventListener("click", async function (event) {
        event.preventDefault();

        if (!currentUser) {
            showNotification("يجب تسجيل الدخول أولاً.");
            return;
        }

        if (!selectedDocumentId) {
            showNotification("ابحث عن الكلمة أولاً.");
            return;
        }

        const confirmed = confirm("هل أنت متأكد من حذف هذه الكلمة؟");
        if (!confirmed) return;

        try {
            const wordRef = doc(db, "words", selectedDocumentId);
            await deleteDoc(wordRef);

            showNotification("تم حذف البيانات بنجاح.");
            await clearForm();
        } catch (error) {
            console.error("Delete Error:", error);
            showNotification("حدث خطأ أثناء الحذف.");
        }
    });
}


// ======================================================
// CLEAR FORM BUTTON
// ======================================================

if (clearButton) {
    clearButton.addEventListener("click", async function (event) {
        event.preventDefault();
        await clearForm();
        showNotification("تم مسح البيانات.");
    });
}


// ======================================================
// DOWNLOAD PDF (FIXED BLANK PDF ISSUE)
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

            if (allTableData.length === 0) {
                showNotification("لا توجد بيانات لتحميلها.");
                return;
            }

            let selectedLanguage = "جميع اللغات";

            if (
                languageFilter &&
                languageFilter.value &&
                languageFilter.value !== "all"
            ) {
                selectedLanguage = languageFilter.value;
            }

            let rows = allTableData;

            if (selectedLanguage !== "جميع اللغات") {
                rows = allTableData.filter(item => {
                    return normalize(item.language) === normalize(selectedLanguage);
                });
            }

            if (rows.length === 0) {
                showNotification("لا توجد بيانات لتحميلها.");
                return;
            }

            // إنشاء الحاوية بوضعية تمنع ظهور صفحة بيضاء في html2canvas
            const container = document.createElement("div");
            container.style.position = "fixed";
            container.style.left = "0";
            container.style.top = "0";
            container.style.zIndex = "-9999"; // إخفاؤه خلف العناصر مع بقائه قابل لالتقاط html2canvas
            container.style.width = "1000px";
            container.style.background = "#ffffff";
            container.style.color = "#000000";
            container.style.padding = "30px";
            container.style.boxSizing = "border-box";
            container.style.direction = "rtl";
            container.style.fontFamily = "Cairo, Arial, sans-serif";

            // Header
            const header = document.createElement("div");
            header.style.textAlign = "center";
            header.style.marginBottom = "20px";

            const title = document.createElement("h1");
            title.textContent = "Langdex Data";
            title.style.margin = "0";
            title.style.fontSize = "28px";
            title.style.color = "#000000";

            const languageTitle = document.createElement("h2");
            languageTitle.textContent = selectedLanguage;
            languageTitle.style.margin = "5px 0 0";
            languageTitle.style.fontSize = "18px";
            languageTitle.style.color = "#000000";

            header.appendChild(title);
            header.appendChild(languageTitle);
            container.appendChild(header);

            // Table
            const table = document.createElement("table");
            table.style.width = "100%";
            table.style.borderCollapse = "collapse";
            table.style.tableLayout = "fixed";
            table.style.direction = "rtl";
            table.style.fontSize = "11px";

            const colgroup = document.createElement("colgroup");
            const widths = ["7%", "20%", "29%", "22%", "14%", "8%"];

            widths.forEach(width => {
                const col = document.createElement("col");
                col.style.width = width;
                colgroup.appendChild(col);
            });

            table.appendChild(colgroup);

            // Table Header
            const thead = document.createElement("thead");
            const headerRow = document.createElement("tr");
            const headers = ["الترتيب", "الكلمة", "المعنى", "المرادف", "اللغة", "ID"];

            headers.forEach(headerText => {
                const th = document.createElement("th");
                th.textContent = headerText;
                th.style.border = "1px solid #000";
                th.style.padding = "7px 4px";
                th.style.textAlign = "center";
                th.style.verticalAlign = "middle";
                th.style.fontWeight = "bold";
                th.style.fontSize = "10px";
                th.style.background = "#eeeeee";
                th.style.color = "#000000";
                th.style.wordBreak = "break-word";
                th.style.overflowWrap = "break-word";

                headerRow.appendChild(th);
            });

            thead.appendChild(headerRow);
            table.appendChild(thead);

            // Table Body
            const tbody = document.createElement("tbody");

            rows.forEach((data, index) => {
                const row = document.createElement("tr");

                const values = [
                    index + 1,
                    data.word || "-",
                    data.meaning || "-",
                    data.synonyms || "-",
                    data.language || "-",
                    data.id || "-"
                ];

                values.forEach((value, valueIndex) => {
                    const cell = document.createElement("td");
                    cell.textContent = String(value);
                    cell.style.border = "1px solid #000";
                    cell.style.padding = "6px 4px";
                    cell.style.textAlign = (valueIndex === 0 || valueIndex === 5) ? "center" : "right";
                    cell.style.verticalAlign = "middle";
                    cell.style.fontSize = "10px";
                    cell.style.lineHeight = "1.5";
                    cell.style.color = "#000000";
                    cell.style.wordBreak = "break-word";
                    cell.style.overflowWrap = "break-word";
                    cell.style.whiteSpace = "normal";

                    row.appendChild(cell);
                });

                tbody.appendChild(row);
            });

            table.appendChild(tbody);
            container.appendChild(table);

            // Footer
            const footer = document.createElement("p");
            footer.textContent = `عدد الكلمات: ${rows.length}`;
            footer.style.textAlign = "center";
            footer.style.margin = "15px 0 0";
            footer.style.fontSize = "11px";
            footer.style.fontWeight = "bold";
            footer.style.color = "#000000";

            container.appendChild(footer);

            document.body.appendChild(container);

            // انتظر إتمام الرندر في المتصفح
            await new Promise(resolve => setTimeout(resolve, 300));

            const safeLanguage = selectedLanguage.replace(/[\\/:*?"<>|]/g, "-");
            const fileName = `Langdex-Data-${safeLanguage}.pdf`;

            await html2pdf()
                .set({
                    margin: [8, 8, 8, 8],
                    filename: fileName,
                    image: { type: "jpeg", quality: 0.98 },
                    html2canvas: {
                        scale: 2,
                        useCORS: true,
                        backgroundColor: "#ffffff",
                        logging: false,
                        scrollX: 0,
                        scrollY: 0
                    },
                    pagebreak: { mode: ["css", "legacy"] },
                    jsPDF: { unit: "mm", format: "a4", orientation: "landscape", compress: true }
                })
                .from(container)
                .save();

            container.remove();
            showNotification("تم تحميل ملف PDF بنجاح.");
        } catch (error) {
            console.error("PDF Error:", error);

            const pdfContainers = document.querySelectorAll('body > div[style*="-9999"]');
            pdfContainers.forEach(element => element.remove());

            showNotification("حدث خطأ أثناء إنشاء PDF.");
        }
    });
}


// ======================================================
// AUTH STATE & ROUTE GUARD
// ======================================================

onAuthStateChanged(auth, async user => {
    if (!user) {
        currentUser = null;
        window.location.href = "login.html";
        return;
    }

    // إذا كان الحساب يتبع للأدمن، توجيهه إلى admin.html
    if (ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
        showNotification("مرحباً بك يا أدمن، جاري توجيهك للوحة التحكم...");
        setTimeout(() => {
            window.location.href = "admin.html";
        }, 1000);
        return;
    }

    currentUser = user;

    if (idInput) {
        await setNextId();
    }

    if (languageFilter) {
        await initializeDataPage();
    }
});
