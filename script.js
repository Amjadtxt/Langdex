// ======================================================
// LANGDEX - script.js (Index Page Complete Logic)
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

const ADMIN_EMAILS = ["amjadtxt@gmail.com"];


// ======================================================
// INITIALIZE FIREBASE
// ======================================================

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
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
    idInput = inputs[0] || null;        // ID
    wordInput = inputs[1] || null;      // الكلمة
    meaningInput = inputs[2] || null;   // المعنى
    synonymsInput = inputs[3] || null;  // المرادف
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
// HELPER FUNCTIONS
// ======================================================

function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
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
        setTimeout(() => { if (notification) notification.remove(); }, 300);
    }, 3000);
}


// ======================================================
// GET ALL WORDS (للبحث والاطلاع على كل القاموس)
// ======================================================

async function getAllWords() {
    if (!currentUser && auth.currentUser) {
        currentUser = auth.currentUser;
    }
    if (!currentUser) return [];

    try {
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
    } catch (error) {
        console.error("Error fetching words:", error);
        return [];
    }
}


// ======================================================
// SMART ID (توليد ID جديد خاص بكلمات المستخدم فقط)
// ======================================================

async function getNextId() {
    try {
        const rows = await getAllWords();
        const userRows = rows.filter(item => item.userId === currentUser.uid);
        const usedIds = new Set();

        userRows.forEach(item => {
            const id = Number(item.id);
            if (Number.isInteger(id) && id > 0) usedIds.add(id);
        });

        let nextId = 1;
        while (usedIds.has(nextId)) nextId++;
        return nextId;
    } catch (error) {
        return 1;
    }
}

async function setNextId() {
    if (!idInput) return;
    try {
        idInput.value = await getNextId();
    } catch (error) {}
}


// ======================================================
// FORM SECURITY & PERMISSIONS (قفل/فتح الخانات حسب الملكية)
// ======================================================

function setFormAccess(isEditable) {
    const elementsToToggle = [wordInput, meaningInput, synonymsInput, languageSelect];
    
    elementsToToggle.forEach(el => {
        if (el) {
            el.disabled = !isEditable;
            el.style.opacity = isEditable ? "1" : "0.7";
            el.style.cursor = isEditable ? "text" : "not-allowed";
            el.style.background = isEditable ? "#ffffff" : "#e9ecef";
        }
    });

    // إظهار أو إخفاء أزرار التعديل والحذف بناءً على الملكية
    if (updateButton) updateButton.style.display = isEditable ? "block" : "none";
    if (deleteButton) deleteButton.style.display = isEditable ? "block" : "none";
    if (registerButton) registerButton.style.display = isEditable ? "block" : "none";
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

    setFormAccess(true); // إعادة تفعيل الفورم للإضافة الجديدة
    await setNextId();
}

function fillForm(data, documentId) {
    selectedDocumentId = documentId;

    if (idInput) idInput.value = data.id ?? "";
    if (wordInput) wordInput.value = data.word ?? "";
    if (meaningInput) meaningInput.value = data.meaning ?? "";
    if (synonymsInput) synonymsInput.value = data.synonyms ?? "";
    if (languageSelect) languageSelect.value = data.language ?? "";

    // التحقق من الملكية: هل الكلمة تابعة للمستخدم الحالي أو أدمن؟
    const isOwner = currentUser && (data.userId === currentUser.uid || isCurrentUserAdmin());

    if (isOwner) {
        setFormAccess(true);
        showNotification(`تم اختيار كلمتك بنجاح.`);
    } else {
        setFormAccess(false);
        showNotification(`هذه الكلمة تخص مستخدم آخر (للاطلاع فقط).`);
    }
}


// ======================================================
// SEARCH HANDLER (صفحة index.html)
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

        // تكرار البحث للتنقل بين النتائج المتعددة لو وُجدت نفس الكلمة
        if (queryText === lastSearchText && searchResults.length > 1) {
            searchIndex = (searchIndex + 1) % searchResults.length;
            const matchedItem = searchResults[searchIndex];
            fillForm(matchedItem, matchedItem._documentId);
            if (searchResult) {
                searchResult.textContent = `نتيجة ${searchIndex + 1} من ${searchResults.length} (اضغط مجدداً للتنقل)`;
            }
            return;
        }

        lastSearchText = queryText;

        // البحث الشامل في جميع الخانات (ID، الكلمة، المعنى، المرادف، اللغة، وإيميل المستخدم)
        let matches = allTableData.filter(item => {
            return (
                normalize(item.id).includes(target) ||
                normalize(item.word).includes(target) ||
                normalize(item.meaning).includes(target) ||
                normalize(item.synonyms).includes(target) ||
                normalize(item.language).includes(target) ||
                normalize(item.userEmail).includes(target)
            );
        });

        // منح الأولوية لكلمات المستخدم الحالي لتظهر في مقدمة النتائج
        if (currentUser) {
            matches.sort((a, b) => {
                const aIsOwner = a.userId === currentUser.uid ? 1 : 0;
                const bIsOwner = b.userId === currentUser.uid ? 1 : 0;
                return bIsOwner - aIsOwner;
            });
        }

        searchResults = matches;
        searchIndex = 0;

        if (searchResults.length > 0) {
            const matchedItem = searchResults[0];
            fillForm(matchedItem, matchedItem._documentId);
            if (searchResult) {
                searchResult.textContent = searchResults.length > 1 
                    ? `تم العثور على ${searchResults.length} نتائج (اضغط بحث للتنقل).` 
                    : `تم العثور على نتيجة مطابقة.`;
            }
        } else {
            selectedDocumentId = null;
            if (searchResult) searchResult.textContent = "لم يتم العثور على نتائج مطابقة في أي خانة.";
            showNotification("لا توجد نتائج مطابقة.");
        }
    });
}


// ======================================================
// CRUD OPERATIONS (حفظ، تحديث، حذف، مسح)
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

            showNotification("تم تسجيل الكلمة بنجاح!");
            await clearForm();
        } catch (error) {
            showNotification("حدث خطأ أثناء الحفظ.");
        }
    });
}

if (updateButton) {
    updateButton.addEventListener("click", async () => {
        if (!selectedDocumentId) {
            showNotification("اختر كلمة أولاً لتحديثها.");
            return;
        }

        const word = wordInput ? wordInput.value.trim() : "";
        const meaning = meaningInput ? meaningInput.value.trim() : "";
        const synonyms = synonymsInput ? synonymsInput.value.trim() : "";
        const language = languageSelect ? languageSelect.value : "";

        try {
            const docRef = doc(db, "words", selectedDocumentId);
            await updateDoc(docRef, { word, meaning, synonyms, language });

            showNotification("تم تحديث الكلمة بنجاح!");
            await clearForm();
        } catch (error) {
            showNotification("حدث خطأ أثناء التحديث.");
        }
    });
}

if (deleteButton) {
    deleteButton.addEventListener("click", async () => {
        if (!selectedDocumentId) {
            showNotification("اختر كلمة أولاً لحذفها.");
            return;
        }

        try {
            const docRef = doc(db, "words", selectedDocumentId);
            await deleteDoc(docRef);

            showNotification("تم حذف الكلمة بنجاح!");
            await clearForm();
        } catch (error) {
            showNotification("حدث خطأ أثناء الحذف.");
        }
    });
}

if (clearButton) {
    clearButton.addEventListener("click", async () => {
        await clearForm();
        showNotification("تم مسح الفورم.");
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

    // حماية صفحات الأدمن والعادي
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
});

document.addEventListener("DOMContentLoaded", async () => {
    if (auth.currentUser) {
        currentUser = auth.currentUser;
        if (idInput) {
            await setNextId();
        }
    }
});
