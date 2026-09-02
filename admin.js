// ======================================================
// LANGDEX - admin.js (Updated with Excel Upload & Toast Notifications)
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
// FIREBASE CONFIG & INIT
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
// STATE VARIABLES
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
    idInput = inputs[0] || null;
    userIdInput = inputs[1] || null; // يظهر فيه اسم المستخدم قبل الـ @
    wordInput = inputs[2] || null;
    meaningInput = inputs[3] || null;
    synonymsInput = inputs[4] || null;
    languageSelect = form.querySelector("select") || null;
}

const registerButton = document.querySelector(".reg");
const updateButton = document.querySelector(".upa");
const deleteButton = document.querySelector(".del");
const clearButton = document.querySelector(".cel");

const searchInput = document.querySelector(".search-txt");
const searchButton = document.querySelector(".search-btn");
const searchResult = document.querySelector(".search-result");

const showDataButton = document.querySelector(".show-data");
const dataTable = document.querySelector("#data-table");
const languageFilter = document.querySelector("#language-filter");
const clearFilterButton = document.querySelector("#clear-filter");
const downloadPdfButton = document.querySelector("#download-pdf");

// عناصر رفع الإكسيل
const uploadExcelButton = document.getElementById('uploadExcelButton');
const excelFileInput = document.getElementById('excelFileInput');

// ======================================================
// HELPER FUNCTIONS
// ======================================================

function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
}

// استخراج الاسم قبل علامة @ من الإيميل
function extractUsername(emailOrUser) {
    if (!emailOrUser) return "-";
    const str = String(emailOrUser).trim();
    if (str.includes("@")) {
        return str.split("@")[0];
    }
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
        background: #222222;
        border: 1px solid rgba(255, 255, 255, 0.25);
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
// DATA FETCHING
// ======================================================

async function getAllWordsAdmin() {
    if (!currentAdmin) throw new Error("لم يتم تسجيل الدخول.");

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
        return 1;
    }
}

async function setNextIdAdmin() {
    if (!idInput) return;
    const nextId = await getNextIdAdmin();
    idInput.value = nextId;
}

// ======================================================
// FORM CONTROL
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

function fillFormAdmin(data, documentId) {
    selectedDocumentId = documentId;

    if (idInput) idInput.value = data.id ?? "";
    
    const rawUser = data.userEmail || data.userId || "";
    if (userIdInput) userIdInput.value = extractUsername(rawUser);
    
    if (wordInput) wordInput.value = data.word ?? "";
    if (meaningInput) meaningInput.value = data.meaning ?? "";
    if (synonymsInput) synonymsInput.value = data.synonyms ?? "";
    if (languageSelect) languageSelect.value = data.language ?? "";
}

// ======================================================
// RENDER & FILTER
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
        if (!languages.has(key)) languages.set(key, language);
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

function renderTableAdmin(rows) {
    if (!dataTable) return;
    dataTable.innerHTML = "";

    rows.forEach(data => {
        const row = document.createElement("tr");
        const username = extractUsername(data.userEmail || data.userId);

        const values = [
            data.id,
            username,
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

        row.style.cursor = "pointer";
        row.addEventListener("click", () => {
            fillFormAdmin(data, data._documentId);
            showNotification(`تم تحديد: ${data.word} (${username})`);
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
// SEARCH WITH TOAST NOTIFICATION
// ======================================================

async function searchFirebaseAdmin(text) {
    const rows = await getAllWordsAdmin();
    const target = normalize(text);

    return rows.filter(item => {
        const username = normalize(extractUsername(item.userEmail || item.userId));
        return (
            normalize(item.id).includes(target) ||
            username.includes(target) ||
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
            showNotification("اكتب شيئاً للبحث.");
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

            const username = extractUsername(result.userEmail || result.userId);
            showNotification(`تم العثور على ${searchIndex + 1} من ${searchResults.length} - [${result.word} : ${username}]`);

            if (searchResult) {
                searchResult.textContent = `نتيجة ${searchIndex + 1} من ${searchResults.length}`;
            }

            searchIndex++;
            if (searchIndex >= searchResults.length) {
                searchIndex = 0;
            }
        } catch (error) {
            console.error(error);
            showNotification("حدث خطأ أثناء البحث.");
        }
    });
}

// ======================================================
// EXCEL UPLOAD FEATURE (NEW)
// ======================================================

if (uploadExcelButton && excelFileInput) {
    uploadExcelButton.addEventListener('click', async function () {
        if (!currentAdmin) {
            showNotification("يجب تسجيل الدخول أولاً لرفع البيانات!");
            return;
        }

        const file = excelFileInput.files[0];
        if (!file) {
            showNotification("من فضلك اختر ملف إكسيل الأول!");
            return;
        }

        if (typeof XLSX === 'undefined') {
            showNotification("مكتبة الإكسيل XLSX مش محملة في الصفحة!");
            return;
        }

        const userEmail = currentAdmin.email || "";
        const usernameInputVal = userIdInput ? userIdInput.value.trim() : "";
        const finalUsername = usernameInputVal || extractUsername(userEmail);

        uploadExcelButton.disabled = true;
        uploadExcelButton.innerText = "جاري حساب الأرقام والرفع... ⏳";

        try {
            // جلب أحدث ID مستخص خصيصاً لهذا المستخدم
            const rows = await getAllWordsAdmin();
            let maxUserSpecificId = 0;

            rows.forEach(item => {
                // فلترة الكلمات الخاصة بهذا المستخدم فقط لحساب تتابع الـ ID الخاص به
                const itemUser = item.userEmail || item.userId || "";
                if (normalize(itemUser) === normalize(userEmail) || item.userId === currentAdmin.uid) {
                    const idNum = Number(item.id);
                    if (!isNaN(idNum) && idNum > maxUserSpecificId) {
                        maxUserSpecificId = idNum;
                    }
                }
            });

            const reader = new FileReader();
            reader.onload = async function (e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const excelRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                    
                    let successCount = 0;
                    let nextId = maxUserSpecificId + 1; // البدء تتابعياً بعد آخر ID للمستخدم

                    for (let i = 1; i < excelRows.length; i++) {
                        const row = excelRows[i];
                        if (!row || row.length === 0) continue;

                        const word = row[0] ? String(row[0]).trim() : '';
                        const meaning = row[1] ? String(row[1]).trim() : '';
                        const synonyms = row[2] ? String(row[2]).trim() : '';
                        const language = row[3] ? String(row[3]).trim() : 'عامة';

                        if (!word || !meaning) continue;

                        await addDoc(wordsCollection, {
                            id: nextId,
                            word: word,
                            meaning: meaning,
                            synonyms: synonyms,
                            language: language,
                            userId: currentAdmin.uid,
                            userEmail: userEmail,
                            username: finalUsername,
                            createdAt: new Date()
                        });

                        nextId++;
                        successCount++;
                    }

                    showNotification(`تم رفع ${successCount} كلمة بنجاح بدءاً من ID: ${maxUserSpecificId + 1} 🚀`);
                    setTimeout(() => location.reload(), 1500);

                } catch (readError) {
                    console.error(readError);
                    showNotification("حدث خطأ أثناء قراءة ملف الإكسيل.");
                    uploadExcelButton.disabled = false;
                    uploadExcelButton.innerText = "رفع ملف";
                }
            };

            reader.readAsArrayBuffer(file);

        } catch (error) {
            console.error(error);
            showNotification("حدث خطأ أثناء الاتصال بقاعدة البيانات.");
            uploadExcelButton.disabled = false;
            uploadExcelButton.innerText = "رفع ملف";
        }
    });
}

// ======================================================
// ACTIONS WITH NOTIFICATIONS
// ======================================================

if (showDataButton) {
    showDataButton.addEventListener("click", async function () {
        try {
            allTableData = await getAllWordsAdmin();
            populateLanguageFilter(allTableData);
            applyLanguageFilterAdmin();
            showNotification(`تم عرض ${allTableData.length} سجل بنجاح.`);
        } catch (error) {
            showNotification("حدث خطأ أثناء عرض البيانات.");
        }
    });
}

if (registerButton) {
    registerButton.addEventListener("click", async function () {
        if (!currentAdmin) {
            showNotification("يجب تسجيل الدخول أولاً.");
            return;
        }

        const userInputVal = userIdInput ? userIdInput.value.trim() : "";
        const word = wordInput ? wordInput.value.trim() : "";
        const meaning = meaningInput ? meaningInput.value.trim() : "";
        const synonyms = synonymsInput ? synonymsInput.value.trim() : "";
        const language = languageSelect ? languageSelect.value.trim() : "";

        if (!word || !meaning || !language) {
            showNotification("يرجى ملء الكلمة والمعنى واللغة.");
            return;
        }

        try {
            const rows = await getAllWordsAdmin();
            const duplicate = rows.find(item => normalize(item.word) === normalize(word));

            if (duplicate) {
                showNotification(`الكلمة موجودة بالفعل - ID: ${duplicate.id}`);
                fillFormAdmin(duplicate, duplicate._documentId);
                return;
            }

            const newId = await getNextIdAdmin();
            const userEmail = currentAdmin.email || "";

            await addDoc(wordsCollection, {
                id: newId,
                word: word,
                meaning: meaning,
                synonyms: synonyms,
                language: language,
                userId: currentAdmin.uid,
                userEmail: userEmail,
                username: userInputVal || extractUsername(userEmail),
                createdAt: new Date()
            });

            showNotification(`تم حفظ البيانات بنجاح - ID: ${newId}`);
            await clearFormAdmin();
        } catch (error) {
            showNotification("حدث خطأ أثناء الحفظ.");
        }
    });
}

if (updateButton) {
    updateButton.addEventListener("click", async function () {
        if (!currentAdmin || !selectedDocumentId) {
            showNotification("اختر كلمة أولاً لتعديلها.");
            return;
        }

        const word = wordInput ? wordInput.value.trim() : "";
        const meaning = meaningInput ? meaningInput.value.trim() : "";
        const synonyms = synonymsInput ? synonymsInput.value.trim() : "";
        const language = languageSelect ? languageSelect.value.trim() : "";

        if (!word || !meaning || !language) {
            showNotification("يرجى إكمال البيانات.");
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

            showNotification("تم تحديث الكلمة بنجاح.");
            await clearFormAdmin();
        } catch (error) {
            showNotification("حدث خطأ أثناء التحديث.");
        }
    });
}

if (deleteButton) {
    deleteButton.addEventListener("click", async function (e) {
        e.preventDefault();
        if (!selectedDocumentId) {
            showNotification("حدد الكلمة المراد حذفها أولاً.");
            return;
        }

        if (!confirm("هل أنت متأكد من الحذف؟")) return;

        try {
            const wordRef = doc(db, "words", selectedDocumentId);
            await deleteDoc(wordRef);
            showNotification("تم حذف الكلمة بنجاح.");
            await clearFormAdmin();
        } catch (error) {
            showNotification("حدث خطأ أثناء الحذف.");
        }
    });
}

if (clearButton) {
    clearButton.addEventListener("click", async function (e) {
        e.preventDefault();
        await clearFormAdmin();
        showNotification("تم مسح البيانات من الاستمارة.");
    });
}

if (clearFilterButton) {
    clearFilterButton.addEventListener("click", function () {
        if (languageFilter) languageFilter.value = "all";
        if (dataTable) dataTable.innerHTML = "";
        allTableData = [];
        showNotification("تم إلغاء عرض الجدول.");
    });
}

// ======================================================
// AUTH STATE
// ======================================================

onAuthStateChanged(auth, async user => {
    if (!user) {
        currentAdmin = null;
        return;
    }

    currentAdmin = user;
    await setNextIdAdmin();

    if (languageFilter) {
        allTableData = await getAllWordsAdmin();
        populateLanguageFilter(allTableData);
    }
});


                

    
        
            
        // ======================================================
// AUTO-INJECT & CLEAN DUPLICATE WORDS BUTTON (Custom Position)
// ======================================================

function initAutoCleanButton() {
    const cleanBtn = document.createElement("button");
    cleanBtn.textContent = "🧹 حذف الكلمات المتكررة نهائياً";
    cleanBtn.style.cssText = `
        background-color: #d9534f;
        color: white;
        padding: 10px 18px;
        border: none;
        border-radius: 8px;
        font-family: 'Cairo', Arial, sans-serif;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        margin: 10px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    `;

    // -----------------------------------------------------------------
    // حدد هنا المكان اللي عايز تحط فيه الزر بالضبط جوه الكود:
    // -----------------------------------------------------------------
    
    // الخيار الأول: لو عايز تحطه جوه الفورم (Form) نفسها مع باقي الأزرار
    const targetElement = document.querySelector(".form"); 
    
    // الخيار الثاني (لو حبيت): لو عايز تحطه جنب زرار البحث مثلاً، شيل السطر اللي فوق وحط ده:
    // const targetElement = document.querySelector(".search-btn");
    
    // الخيار الثالث (لو حبيت): لو عايز تحطه فوق جدول البيانات مباشرة:
    // const targetElement = dataTable;

    if (targetElement) {
        // لو اخترت الفورم أو ديف، هيحطه جواها. لو عايز تحطه جنبه استخدم insertBefore
        targetElement.appendChild(cleanBtn); 
    } else {
        document.body.appendChild(cleanBtn); // احتياطي لو ملقاش العنصر
    }

    cleanBtn.addEventListener("click", async function () {
        if (!currentAdmin) {
            showNotification("يجب تسجيل الدخول كأدمن أولاً.");
            return;
        }

        if (!confirm("هل أنت متأكد من رغبتك في فحص وحذف الكلمات المتكررة تماماً من قاعدة البيانات؟")) {
            return;
        }

        try {
            showNotification("جاري فحص الكلمات وتصفية التكرارات...");

            const snapshot = await getDocs(wordsCollection);
            const seenWords = new Set();
            let deletedCount = 0;

            for (const firebaseDoc of snapshot.docs) {
                const data = firebaseDoc.data();
                const wordKey = String(data.word || "").trim().toLowerCase();

                if (!wordKey) continue;

                if (seenWords.has(wordKey)) {
                    const wordRef = doc(db, "words", firebaseDoc.id);
                    await deleteDoc(wordRef);
                    deletedCount++;
                } else {
                    seenWords.add(wordKey);
                }
            }

            showNotification(`تم بنجاح حذف ${deletedCount} كلمة متكررة!`);
            alert(`تم الانتهاء بنجاح! تم حذف ${deletedCount} كلمة متكررة من قاعدة البيانات.`);

            // تحديث الجدول
            allTableData = await getAllWordsAdmin();
            populateLanguageFilter(allTableData);
            applyLanguageFilterAdmin();

        } catch (error) {
            console.error("Clean Duplicates Error:", error);
            showNotification("حدث خطأ أثناء عملية التنظيف.");
        }
    });
}

// تشغيل الدالة تلقائياً
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoCleanButton);
} else {
    initAutoCleanButton();
}
