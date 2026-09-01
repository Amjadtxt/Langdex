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
    if (!currentUser) {
        throw new Error("No authenticated user.");
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
        throw error;
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
// RENDER TABLE (Fixed Columns Order: User at the End)
// ======================================================

function renderTable(rows) {
    if (!dataTable) return;

    dataTable.innerHTML = "";
    const isAdmin = isCurrentUserAdmin();

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

        // ترتيب الأعمدة الأساسية
        const values = [
            data.id,
            data.word,
            data.meaning,
            data.synonyms,
            data.language
        ];

        // لو أدمن، بنحط إيميل المستخدم في آخر المصفوفة عشان يظهر في الصف الأخير (الجهة اليمنى)
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
            normalize(item.language).includes(target) ||
            normalize(item.userEmail).includes(target)
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
                if (searchResult) searchResult.textContent = "";
                return;
            }

            const result = searchResults[searchIndex];
            fillForm(result, result._documentId);

            showNotification(`تم العثور على النتيجة رقم ${searchIndex + 1} من ${searchResults.length}`);
            if (searchResult) searchResult.textContent = "";

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
                username: username,
                createdAt: serverTimestamp()
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
// DOWNLOAD PDF (Fixed Column Order for Admin)
// ======================================================

if (downloadPdfButton) {
    downloadPdfButton.addEventListener("click", async function () {
        if (!currentUser) {
            showNotification("يجب تسجيل الدخول أولاً.");
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

            const isAdmin = isCurrentUserAdmin();

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
            `;

            const selectedLanguageText = (languageFilter && languageFilter.options[languageFilter.selectedIndex])
                ? languageFilter.options[languageFilter.selectedIndex].textContent
                : "جميع اللغات";

            printArea.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="margin:0; font-size: 22px; color: #000;">Langdex Report ${isAdmin ? '(Admin All Data)' : ''}</h2>
                    <p style="margin:5px 0; font-size: 14px; color: #333;">اللغة: ${selectedLanguageText}</p>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #000; background: #ffffff;">
                    <thead>
                        <tr style="background-color: #b5b5b5;">
                            <th style="border: 1px solid #333; padding: 6px; width: 8%;">#</th>
                            <th style="border: 1px solid #333; padding: 6px; width: 22%;">الكلمة</th>
                            <th style="border: 1px solid #333; padding: 6px; width: 28%;">المعنى</th>
                            <th style="border: 1px solid #333; padding: 6px; width: 18%;">المرادف</th>
                            <th style="border: 1px solid #333; padding: 6px; width: 14%;">اللغة</th>
                            ${isAdmin ? '<th style="border: 1px solid #333; padding: 6px; width: 10%;">المستخدم</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map((item, idx) => `
                            <tr>
                                <td style="border: 1px solid #333; padding: 5px; text-align: center;">${idx + 1}</td>
                                <td style="border: 1px solid #333; padding: 5px;">${item.word || '-'}</td>
                                <td style="border: 1px solid #333; padding: 5px;">${item.meaning || '-'}</td>
                                <td style="border: 1px solid #333; padding: 5px;">${item.synonyms || '-'}</td>
                                <td style="border: 1px solid #333; padding: 5px; text-align: center;">${item.language || '-'}</td>
                                ${isAdmin ? `<td style="border: 1px solid #333; padding: 5px; text-align: center;">${item.userEmail || item.username || '-'}</td>` : ''}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;

            document.body.appendChild(printArea);

            await new Promise(resolve => setTimeout(resolve, 200));

            const canvas = await html2canvas(printArea, {
                scale: 2,
                backgroundColor: "#ffffff",
                useCORS: true
            });

            printArea.remove();

            const imgData = canvas.toDataURL("image/jpeg", 1.0);
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF("p", "mm", "a4");

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
            
            const safeLanguage = selectedLanguageText.replace(/[\\/:*?"<>|]/g, "-");
            pdf.save(`Langdex-${safeLanguage}.pdf`);

            showNotification("تم تحميل ملف PDF بنجاح.");
        } catch (error) {
            console.error("PDF Export Error:", error);
            showNotification("حدث خطأ أثناء تصدير الـ PDF.");
        }
    });
}


// ======================================================
// UPLOAD EXCEL FILE (.xlsx) TO FIREBASE
// ======================================================

const uploadExcelButton = document.querySelector("#uploadExcelButton");
const excelFileInput = document.querySelector("#excelFileInput");

if (uploadExcelButton && excelFileInput) {
    uploadExcelButton.addEventListener("click", async () => {
        const file = excelFileInput.files[0];
        if (!file) {
            showNotification("من فضلك اختر ملف إكسيل أولاً!");
            return;
        }

        if (!currentUser) {
            showNotification("يجب تسجيل الدخول أولاً!");
            return;
        }

        if (typeof XLSX === "undefined") {
            showNotification("خطأ: مكتبة قراءة الإكسيل غير مُحمّلة في الصفحة!");
            console.error("XLSX library is missing. Please add SheetJS CDN in HTML.");
            return;
        }

        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (rows.length === 0) {
                    showNotification("الملف فارغ!");
                    return;
                }

                showNotification("جاري رفع كلمات الإكسيل للفايربيز...");
                let successCount = 0;
                let baseId = await getNextId();

                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || row.length === 0) continue;

                    const wordData = {
                        id: baseId + successCount,
                        word: String(row[0] || "").trim(),
                        meaning: String(row[1] || "").trim(),
                        synonyms: String(row[2] || "").trim(),
                        language: String(row[3] || "عامة").trim(),
                        userId: currentUser.uid,
                        userEmail: currentUser.email || "",
                        username: currentUser.email ? currentUser.email.split("@")[0] : "مستخدم",
                        createdAt: serverTimestamp()
                    };

                    if (!wordData.word && !wordData.meaning) continue;

                    try {
                        await addDoc(wordsCollection, wordData);
                        successCount++;
                    } catch (err) {
                        console.error("Error adding excel row:", err);
                    }
                }

                showNotification(`تم رفع ${successCount} كلمة من الإكسيل بنجاح!`);
                excelFileInput.value = "";

                allTableData = await getAllWords();
                populateLanguageFilter(allTableData);
                await setNextId();

            } catch (error) {
                console.error("Excel read error:", error);
                showNotification("حدث خطأ أثناء قراءة ملف الإكسيل.");
            }
        };

        reader.readAsArrayBuffer(file);
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

    try {
        allTableData = await getAllWords();
        populateLanguageFilter(allTableData);
    } catch (err) {
        console.error("Initial load error:", err);
    }
});
