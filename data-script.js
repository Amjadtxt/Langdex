// ======================================================
// LANGDEX - data-script.js (User Personal Dashboard Script)
// ======================================================

import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp
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
let allUserTableData = [];
let currentFilteredData = []; 
let editingDocId = null; // لتتبع الكلمة الجاري تعديلها

// عناصر الـ DOM
const searchInput = document.querySelector("#search-input");
const languageFilter = document.querySelector("#language-filter");
const dataTable = document.querySelector("#data-table");

const wordIdInput = document.querySelector("#word-id");
const wordInput = document.querySelector("#word-input");
const meaningInput = document.querySelector("#meaning-input");
const synonymsInput = document.querySelector("#synonyms-input");
const formLanguageSelect = document.querySelector("#formLanguageSelect");

const addBtn = document.querySelector("#add-btn");
const updateBtn = document.querySelector("#update-btn");
const clearBtn = document.querySelector("#clear-btn");
const downloadPdfBtn = document.querySelector("#downloadPdfBtn");

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

// حساب الـ ID التالي تلقائياً للمستخدم نفسه
function updateNextIdInput() {
    if (!wordIdInput) return;
    if (editingDocId) return;

    let nextId = 1;
    if (allUserTableData && allUserTableData.length > 0) {
        const maxId = Math.max(...allUserTableData.map(item => Number(item.id) || 0));
        nextId = maxId > 0 ? maxId + 1 : 1;
    }
    wordIdInput.value = nextId;
}

// جلب بيانات المستخدم الحالي فقط وترتيبها حسب الأحدث
async function getUserWords() {
    if (!currentUser) return [];
    try {
        const q = query(wordsCollection, where("uid", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        const rows = [];
        querySnapshot.forEach(firebaseDoc => {
            const data = firebaseDoc.data();
            rows.push({
                ...data,
                _documentId: firebaseDoc.id
            });
        });

        rows.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
            return timeB - timeA;
        });

        return rows;
    } catch (error) {
        console.error("Error fetching user words:", error);
        return [];
    }
}

function populateLanguageFilter(rows) {
    if (!languageFilter) return;

    const currentValue = languageFilter.value;
    languageFilter.innerHTML = '<option value="all">كل اللغات</option>';

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

    currentFilteredData = rows; 

    if (rows.length === 0) {
        const emptyRow = document.createElement("tr");
        const emptyCell = document.createElement("td");
        emptyCell.colSpan = 7;
        emptyCell.textContent = "لا توجد كلمات مسجلة لديك حتى الآن.";
        emptyCell.style.textAlign = "center";
        emptyRow.appendChild(emptyCell);
        dataTable.appendChild(emptyRow);
        return;
    }

    rows.forEach((data, index) => {
        const row = document.createElement("tr");

        const idVal = data.id !== undefined ? data.id : (index + 1);
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
            <td>
                <button type="button" class="edit-row-btn">تعديل</button>
                <button type="button" class="delete-row-btn">حذف</button>
            </td>
        `;

        const editBtn = row.querySelector(".edit-row-btn");
        const deleteBtn = row.querySelector(".delete-row-btn");

        editBtn.addEventListener("click", () => {
            fillFormForEditing(data);
        });

        deleteBtn.addEventListener("click", async () => {
            if (confirm(`هل أنت متأكد من حذف الكلمة "${wordVal}"؟`)) {
                await deleteWord(data._documentId);
            }
        });

        dataTable.appendChild(row);
    });
}

function fillFormForEditing(data) {
    editingDocId = data._documentId;
    if (wordIdInput) wordIdInput.value = data.id || "";
    if (wordInput) wordInput.value = data.word || "";
    if (meaningInput) meaningInput.value = data.meaning || "";
    if (synonymsInput) synonymsInput.value = data.synonyms || "";
    if (formLanguageSelect) formLanguageSelect.value = data.language || "";
    
    showNotification("تم نقل الكلمة للفورم للأعلى لتعديلها.");
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearForm() {
    editingDocId = null;
    if (wordInput) wordInput.value = "";
    if (meaningInput) meaningInput.value = "";
    if (synonymsInput) synonymsInput.value = "";
    if (formLanguageSelect) formLanguageSelect.selectedIndex = 0;
    updateNextIdInput();
}

// عملية الإضافة
if (addBtn) {
    addBtn.addEventListener("click", async () => {
        const word = wordInput ? wordInput.value.trim() : "";
        const meaning = meaningInput ? meaningInput.value.trim() : "";
        const synonyms = synonymsInput ? synonymsInput.value.trim() : "";
        const language = formLanguageSelect ? formLanguageSelect.value.trim() : "";

        if (!word || !meaning || !language) {
            showNotification("يرجى إدخال الكلمة والمعنى واختيار اللغة على الأقل.");
            return;
        }

        try {
            let currentIdToSave = wordIdInput ? Number(wordIdInput.value) : 1;
            if (!currentIdToSave || isNaN(currentIdToSave)) {
                let nextId = 1;
                if (allUserTableData && allUserTableData.length > 0) {
                    const maxId = Math.max(...allUserTableData.map(item => Number(item.id) || 0));
                    nextId = maxId > 0 ? maxId + 1 : 1;
                }
                currentIdToSave = nextId;
            }
            
            await addDoc(wordsCollection, {
                id: currentIdToSave,
                word,
                meaning,
                synonyms,
                language,
                uid: currentUser.uid,
                userEmail: currentUser.email || "",
                createdAt: serverTimestamp()
            });

            showNotification("تمت إضافة الكلمة بنجاح!");
            clearForm();
            await reloadUserData();
        } catch (error) {
            console.error("Add error:", error);
            showNotification("حدث خطأ أثناء الإضافة.");
        }
    });
}

// عملية التعديل
if (updateBtn) {
    updateBtn.addEventListener("click", async () => {
        if (!editingDocId) {
            showNotification("الرجاء اختيار كلمة من الجدول لتعديلها أولاً.");
            return;
        }

        const word = wordInput ? wordInput.value.trim() : "";
        const meaning = meaningInput ? meaningInput.value.trim() : "";
        const synonyms = synonymsInput ? synonymsInput.value.trim() : "";
        const language = formLanguageSelect ? formLanguageSelect.value.trim() : "";

        if (!word || !meaning || !language) {
            showNotification("يرجى التأكد من تعبئة الحقول الأساسية.");
            return;
        }

        try {
            const docRef = doc(db, "words", editingDocId);
            await updateDoc(docRef, {
                word,
                meaning,
                synonyms,
                language
            });

            showNotification("تم تعديل الكلمة بنجاح!");
            clearForm();
            await reloadUserData();
        } catch (error) {
            console.error("Update error:", error);
            showNotification("حدث خطأ أثناء التعديل.");
        }
    });
}

if (clearBtn) {
    clearBtn.addEventListener("click", () => {
        clearForm();
        showNotification("تم تفريغ الحقول.");
    });
}

async function deleteWord(docId) {
    try {
        await deleteDoc(doc(db, "words", docId));
        showNotification("تم حذف الكلمة نهائياً.");
        if (editingDocId === docId) {
            clearForm();
        } else {
            updateNextIdInput();
        }
        await reloadUserData();
    } catch (error) {
        console.error("Delete error:", error);
        showNotification("حدث خطأ أثناء الحذف.");
    }
}

function applyFiltersAndSearch() {
    if (!dataTable) return;

    const selectedLanguage = languageFilter ? languageFilter.value.trim() : "all";
    const searchQuery = searchInput ? searchInput.value.trim() : "";

    let filtered = [...allUserTableData];

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

// تصدير PDF محدث ومضبوط بالكامل لعرض النصوص الطويلة والـ Padding
async function exportUserPdf() {
    if (!currentFilteredData || currentFilteredData.length === 0) {
        showNotification("لا توجد بيانات لتصديرها.");
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        doc.addFont("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf", "Roboto", "normal");
        doc.setFont("Roboto");

        doc.setFontSize(16);
        doc.text("Langdex - My Personal Words Report", 148, 12, { align: "center" });
        
        doc.setFontSize(10);
        doc.text(`Exported Date: ${new Date().toLocaleDateString()}`, 148, 18, { align: "center" });

        let y = 28;
        doc.setFontSize(10);

        doc.setFillColor(103, 128, 113);
        doc.rect(10, y, 277, 9, "F");
        doc.setTextColor(255, 255, 255);
        
        doc.text("ID", 14, y + 6);
        doc.text("الكلمة (Word)", 32, y + 6);
        doc.text("المعنى (Meaning)", 82, y + 6);
        doc.text("المرادف (Synonyms)", 152, y + 6);
        doc.text("اللغة (Lang)", 215, y + 6);
        doc.text("تاريخ التسجيل", 245, y + 6);

        y += 12;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);

        currentFilteredData.forEach((item) => {
            const idStr = String(item.id || "-");
            const wordStr = String(item.word || "-");
            const meaningStr = String(item.meaning || "-");
            const synonymsStr = String(item.synonyms || "-");
            const langStr = String(item.language || "-");
            const dateStr = formatTimestamp(item.createdAt);

            const splitMeaning = doc.splitTextToSize(meaningStr, 65);
            const splitSynonyms = doc.splitTextToSize(synonymsStr, 58);
            const splitWord = doc.splitTextToSize(wordStr, 45);

            const maxLines = Math.max(splitMeaning.length, splitSynonyms.length, splitWord.length, 1);
            const rowHeight = maxLines * 6 + 4;

            if (y + rowHeight > 190) {
                doc.addPage();
                y = 20;
            }

            doc.text(idStr, 14, y + 4);
            doc.text(splitWord, 32, y + 4);
            doc.text(splitMeaning, 82, y + 4);
            doc.text(splitSynonyms, 152, y + 4);
            doc.text(langStr, 215, y + 4, { maxWidth: 28 });
            doc.text(dateStr, 245, y + 4);

            y += rowHeight + 2;
            doc.setDrawColor(220, 220, 220);
            doc.line(10, y - 2, 287, y - 2);
        });

        doc.save("my-langdex-words.pdf");
        showNotification("تم تصدير ملف الـ PDF الشخصي بنجاح!");
    } catch (error) {
        console.error("PDF Error:", error);
        showNotification("حدث خطأ أثناء تصدير الـ PDF.");
    }
}

if (searchInput) searchInput.addEventListener("input", applyFiltersAndSearch);
if (languageFilter) languageFilter.addEventListener("change", applyFiltersAndSearch);
if (downloadPdfBtn) downloadPdfBtn.addEventListener("click", exportUserPdf);

async function reloadUserData() {
    allUserTableData = await getUserWords();
    populateLanguageFilter(allUserTableData);
    applyFiltersAndSearch();
    updateNextIdInput();
}

onAuthStateChanged(auth, async user => {
    if (!user) {
        currentUser = null;
        window.location.href = "login.html";
        return;
    }
    currentUser = user;
    await reloadUserData();
});

document.addEventListener("DOMContentLoaded", async () => {
    if (auth.currentUser) {
        currentUser = auth.currentUser;
        await reloadUserData();
    }
});
