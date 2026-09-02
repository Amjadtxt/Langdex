// ======================================================
// LANGDEX - admin.js (محدث ومنظم بالكامل)
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
    getDoc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
    getAuth,
    setPersistence,
    browserLocalPersistence,
    onAuthStateChanged,
    signOut
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

setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.error("Persistence error:", err);
});

const wordsCollection = collection(db, "words");
const usersCollection = collection(db, "users");

const ADMIN_EMAILS = ["amjadtxt@gmail.com"];

const loaderOverlay = document.createElement("div");
loaderOverlay.id = "auth-loader-overlay";
loaderOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background-color: #121212; color: #ffffff; z-index: 9999999999;
    display: flex; justify-content: center; align-items: center;
    font-family: 'Cairo', Arial, sans-serif; font-size: 20px; font-weight: bold; direction: rtl;
`;
loaderOverlay.textContent = "جاري التحقق من الصلاحيات والتحميل...";
document.body.appendChild(loaderOverlay);

async function verifyAdminPermission(user) {
    if (!user || !user.email) return false;
    const email = user.email.toLowerCase().trim();

    if (ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === email)) {
        return true;
    }

    try {
        let userDocRef = doc(db, "users", email);
        let userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            const role = String(userDocSnap.data().role || "").toLowerCase().trim();
            if (role === "admin") return true;
        }

        const usersSnapshot = await getDocs(usersCollection);
        for (const userDoc of usersSnapshot.docs) {
            const data = userDoc.data();
            if (String(data.email || "").toLowerCase().trim() === email) {
                const role = String(data.role || "").toLowerCase().trim();
                if (role === "admin") return true;
            }
        }
    } catch (err) {
        console.error("Admin check error:", err);
    }
    return false;
}

let currentAdmin = null;
let selectedDocumentId = null;
let allTableData = [];
let allUsersData = [];

const form = document.querySelector(".form");
const inputs = form ? form.querySelectorAll("input") : [];
const idInput = inputs[0] || null;
const userIdInput = inputs[1] || null;
const wordInput = inputs[2] || null;
const meaningInput = inputs[3] || null;
const synonymsInput = inputs[4] || null;
const languageSelect = document.querySelector("#formLanguageSelect");

const registerButton = document.querySelector(".reg");
const updateButton = document.querySelector(".upa");
const clearButton = document.querySelector(".cel");
const downloadPdfBtn = document.querySelector("#downloadPdfBtn");

const searchInput = document.querySelector(".search-txt");
const searchButton = document.querySelector(".search-btn");
const searchResult = document.querySelector(".search-result");
const languageFilterSearch = document.querySelector("#languageFilterSearch");
const dataTable = document.querySelector("#data-table");
const cardsContainer = document.querySelector("#cardsContainer");
const totalUsersCountElem = document.querySelector("#totalUsersCount");

function normalize(val) {
    return String(val ?? "").trim().toLowerCase();
}

function extractUsername(emailOrUser) {
    if (!emailOrUser) return "-";
    const str = String(emailOrUser).trim();
    if (str.includes("@")) return str.split("@")[0];
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
        color: #FFFFFF; position: fixed; top: 25px; left: 50%; transform: translateX(-50%);
        z-index: 999999; padding: 12px 22px; border-radius: 10px; font-family: Cairo, Arial, sans-serif;
        font-size: 15px; font-weight: 600; text-align: center; direction: rtl;
        background: #222222; border: 1px solid rgba(255, 255, 255, 0.25); box-shadow: 0 5px 20px rgba(0,0,0,0.3);
    `;
    clearTimeout(notification._timer);
    notification._timer = setTimeout(() => notification.remove(), 3000);
}

function updateLanguageFilterDropdown(rows) {
    if (!languageFilterSearch) return;
    const currentVal = languageFilterSearch.value;
    languageFilterSearch.innerHTML = `<option value="all">كل اللغات (للبحث أو العرض)</option>`;
    
    const langs = new Set();
    rows.forEach(item => {
        if (item.language) langs.add(String(item.language).trim());
    });

    langs.forEach(lang => {
        const opt = document.createElement("option");
        opt.value = lang;
        opt.textContent = lang;
        languageFilterSearch.appendChild(opt);
    });

    languageFilterSearch.value = langs.has(currentVal) ? currentVal : "all";
}

async function fetchAllData() {
    try {
        const usersSnap = await getDocs(usersCollection);
        allUsersData = [];
        usersSnap.forEach(d => allUsersData.push({ id: d.id, ...d.data() }));
        if (totalUsersCountElem) totalUsersCountElem.textContent = allUsersData.length;

        const wordsSnap = await getDocs(wordsCollection);
        allTableData = [];
        wordsSnap.forEach(d => {
            allTableData.push({ _documentId: d.id, ...d.data() });
        });

        // 🌟 ترتيب البيانات بدقة بحيث يكون الأحدث من حيث وقت الإنشاء (createdAt) أولاً
        allTableData.sort((a, b) => {
            let timeA = 0;
            let timeB = 0;

            if (a.createdAt) {
                timeA = a.createdAt.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
            }
            if (b.createdAt) {
                timeB = b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
            }

            if (timeB !== timeA) {
                return timeB - timeA; // الأحدث تاريخاً يظهر أولاً
            }
            return Number(b.id || 0) - Number(a.id || 0); // ترتيب تنازلي للـ ID في حال التساوي
        });

        updateLanguageFilterDropdown(allTableData);
        renderCardsAndTable(allTableData);
        await setNextIdAdmin();
    } catch (error) {
        console.error(error);
        showNotification("حدث خطأ أثناء جلب البيانات.");
    }
}

function renderCardsAndTable(rows) {
    const langCounts = {};
    rows.forEach(item => {
        const lang = String(item.language || "غير محدد").trim();
        langCounts[lang] = (langCounts[lang] || 0) + 1;
    });

    const existingLangCards = cardsContainer.querySelectorAll(".lang-card");
    existingLangCards.forEach(c => c.remove());

    for (const [lang, count] of Object.entries(langCounts)) {
        const card = document.createElement("div");
        card.className = "card lang-card";
        card.innerHTML = `<h3>كلمات لغة (${lang})</h3><p>${count}</p>`;
        cardsContainer.appendChild(card);
    }

    renderTableLog(rows);
}

function renderTableLog(rows) {
    if (!dataTable) return;
    dataTable.innerHTML = "";

    if (rows.length === 0) {
        dataTable.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #777;">لا توجد بيانات مطابقة</td></tr>`;
        return;
    }

    rows.forEach(data => {
        const tr = document.createElement("tr");

        const rawUser = data.userEmail || data.userId || "";
        const username = extractUsername(rawUser);
        
        let userRole = data.role || "user";
        const matchedUser = allUsersData.find(u => normalize(u.email) === normalize(rawUser) || u.id === data.userId);
        if (matchedUser && matchedUser.role) {
            userRole = matchedUser.role;
        }

        let timeFormatted = "-";
        if (data.createdAt) {
            const dateObj = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            if (!isNaN(dateObj)) {
                timeFormatted = dateObj.toLocaleDateString("ar-EG") + " - " + dateObj.toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' });
            }
        }

        tr.innerHTML = `
            <td>${data.id || "-"}</td>
            <td>${username}</td>
            <td><strong>${data.word || "-"}</strong></td>
            <td>${data.meaning || "-"}</td>
            <td>${data.synonyms || "-"}</td>
            <td>${data.language || "-"}</td>
            <td><span style="color: ${normalize(userRole) === 'admin' ? '#00bcd4' : '#fff'};">${userRole}</span></td>
            <td>${timeFormatted}</td>
            <td class="action-btns">
                <button class="btn-edit" data-id="${data._documentId}">تعديل</button>
                <button class="btn-delete" data-id="${data._documentId}">حذف</button>
            </td>
        `;

        const editBtn = tr.querySelector(".btn-edit");
        const deleteBtn = tr.querySelector(".btn-delete");

        editBtn.addEventListener("click", () => {
            selectedDocumentId = data._documentId;
            if (idInput) idInput.value = data.id || "";
            if (userIdInput) userIdInput.value = username;
            if (wordInput) wordInput.value = data.word || "";
            if (meaningInput) meaningInput.value = data.meaning || "";
            if (synonymsInput) synonymsInput.value = data.synonyms || "";
            if (languageSelect) languageSelect.value = data.language || "";
            window.scrollTo({ top: 0, behavior: 'smooth' });
            showNotification(`تم تحديد الكلمة (${data.word}) للتعديل.`);
        });

        deleteBtn.addEventListener("click", async () => {
            if (!confirm(`هل أنت متأكد من حذف الكلمة "${data.word}"؟`)) return;
            try {
                await deleteDoc(doc(db, "words", data._documentId));
                showNotification("تم حذف الكلمة بنجاح.");
                await fetchAllData();
            } catch (err) {
                showNotification("حدث خطأ أثناء الحذف.");
            }
        });

        dataTable.appendChild(tr);
    });
}

async function setNextIdAdmin() {
    try {
        const usedIds = new Set();
        allTableData.forEach(item => {
            const idNum = Number(item.id);
            if (Number.isInteger(idNum) && idNum > 0) usedIds.add(idNum);
        });
        let nextId = 1;
        while (usedIds.has(nextId)) nextId++;
        if (idInput) idInput.value = nextId;
    } catch (e) {
        if (idInput) idInput.value = 1;
    }
}

function performSearchAndFilter() {
    const query = normalize(searchInput ? searchInput.value : "");
    const selectedLang = languageFilterSearch ? languageFilterSearch.value : "all";

    let filtered = allTableData.filter(item => {
        const username = normalize(extractUsername(item.userEmail || item.userId));
        const matchesQuery = !query || (
            normalize(item.id).includes(query) ||
            username.includes(query) ||
            normalize(item.word).includes(query) ||
            normalize(item.meaning).includes(query) ||
            normalize(item.synonyms).includes(query) ||
            normalize(item.language).includes(query)
        );

        const matchesLang = (selectedLang === "all") || (normalize(item.language) === normalize(selectedLang));

        return matchesQuery && matchesLang;
    });

    renderTableLog(filtered);
    if (searchResult) {
        searchResult.textContent = (query || selectedLang !== "all") ? `النتائج المطابقة: ${filtered.length}` : "";
    }
    return filtered;
}

if (searchButton && searchInput) {
    searchButton.addEventListener("click", performSearchAndFilter);
    searchInput.addEventListener("input", performSearchAndFilter);
}

if (languageFilterSearch) {
    languageFilterSearch.addEventListener("change", performSearchAndFilter);
}

// ==========================================================
// تصدير PDF للبيانات المعروضة حالياً
// ==========================================================

if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener("click", async () => {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            showNotification("مكتبة الـ PDF لم يتم تحميلها بشكل صحيح!");
            return;
        }

        const currentRows = performSearchAndFilter();
        if (currentRows.length === 0) {
            showNotification("لا توجد بيانات معروضة لتحميلها في الـ PDF!");
            return;
        }

        let printContainer = document.createElement("div");
        printContainer.style.direction = "rtl";
        printContainer.style.padding = "20px";
        printContainer.style.background = "#ffffff";
        printContainer.style.color = "#000000";
        printContainer.style.fontFamily = "Cairo, Arial, sans-serif";
        printContainer.style.width = "800px";

        let htmlContent = `
            <h2 style="text-align: center; color: #333; margin-bottom: 10px;">Langdex - تقرير سجل الكلمات والبيانات</h2>
            <p style="text-align: center; color: #666; font-size: 12px; margin-bottom: 20px;">تاريخ التصدير: ${new Date().toLocaleString()} | عدد السجلات المعروضة: ${currentRows.length}</p>
            <table border="1" cellspacing="0" cellpadding="8" style="width: 100%; border-collapse: collapse; text-align: right; font-size: 12px;">
                <thead>
                    <tr style="background: #f0f0f0; color: #000;">
                        <th>ID</th>
                        <th>بواسطة (اليوزر)</th>
                        <th>الكلمة</th>
                        <th>المعنى</th>
                        <th>التفاصيل / المرادفات</th>
                        <th>اللغة</th>
                    </tr>
                </thead>
                <tbody>
        `;

        currentRows.forEach((item, index) => {
            htmlContent += `
                <tr>
                    <td>${item.id || (index + 1)}</td>
                    <td>${extractUsername(item.userEmail || item.userId)}</td>
                    <td>${item.word || ''}</td>
                    <td>${item.meaning || ''}</td>
                    <td>${item.synonyms || ''}</td>
                    <td>${item.language || ''}</td>
                </tr>
            `;
        });

        htmlContent += `</tbody></table>`;
        printContainer.innerHTML = htmlContent;
        document.body.appendChild(printContainer);

        try {
            let canvas = await html2canvas(printContainer, { scale: 2, useCORS: true });
            let imgData = canvas.toDataURL("image/png");
            
            let pdf = new jsPDF("p", "mm", "a4");
            let pdfWidth = pdf.internal.pageSize.getWidth();
            let pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            let heightLeft = pdfHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();

            while (heightLeft >= 0) {
                position = heightLeft - pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pdf.internal.pageSize.getHeight();
            }

            pdf.save("Langdex_Filtered_Words_Report.pdf");
            showNotification("تم تحميل ملف الـ PDF للبيانات المعروضة بنجاح 🚀");
        } catch (error) {
            console.error("PDF Error:", error);
            showNotification("حدث خطأ أثناء تصدير ملف الـ PDF.");
        } finally {
            document.body.removeChild(printContainer);
        }
    });
}

// تغيير اسم التصنيف جماعياً
const renameLangBtn = document.getElementById("renameAnyLangBtn");
if (renameLangBtn) {
    renameLangBtn.addEventListener("click", async () => {
        let oldLang = prompt("اكتب اسم اللغة القديمة تماماً كما تظهر (مثلاً: Urdu):");
        if (!oldLang) return;

        let newLang = prompt(`اكتب الاسم الجديد للغة "${oldLang}" (مثلاً: اردو):`);
        if (!newLang) return;

        if (!confirm(`هل أنت متأكد من تغيير وتوحيد كل كلمات لغة "${oldLang}" إلى "${newLang}"؟`)) return;

        try {
            let updatedCount = 0;
            let batchPromises = [];

            allTableData.forEach(item => {
                if (item.language && item.language.trim().toLowerCase() === oldLang.trim().toLowerCase()) {
                    item.language = newLang.trim();
                    if (item._documentId) {
                        const docRef = doc(db, "words", item._documentId);
                        batchPromises.push(updateDoc(docRef, { language: newLang.trim() }));
                        updatedCount++;
                    }
                }
            });

            await Promise.all(batchPromises);
            showNotification(`تم تحديث ${updatedCount} كلمة بنجاح من (${oldLang}) إلى (${newLang})!`);
            await fetchAllData();
        } catch (error) {
            console.error("Rename Error:", error);
            showNotification("حدث خطأ أثناء تنفيذ التعديل الجماعي.");
        }
    });
}

// حذف الكلمات المكررة جماعياً
const deleteDuplicatesBtn = document.getElementById("deleteDuplicatesBtn");
if (deleteDuplicatesBtn) {
    deleteDuplicatesBtn.addEventListener("click", async () => {
        if (!confirm("هل أنت متأكد من البحث عن الكلمات المكررة وحذف النسخ المكررة مع إبقاء نسخة واحدة فقط؟")) return;

        try {
            let seenWords = new Set();
            let duplicatesIds = [];

            const querySnapshot = await getDocs(wordsCollection);
            querySnapshot.forEach(d => {
                const data = d.data();
                const wordVal = String(data.word || "").trim().toLowerCase();
                const langVal = String(data.language || "").trim().toLowerCase();
                
                const identifier = `${wordVal}_${langVal}`;

                if (wordVal && seenWords.has(identifier)) {
                    duplicatesIds.push(d.id);
                } else if (wordVal) {
                    seenWords.add(identifier);
                }
            });

            if (duplicatesIds.length === 0) {
                showNotification("لا توجد كلمات مكررة مطابقة في السجل!");
                return;
            }

            let deletePromises = duplicatesIds.map(id => deleteDoc(doc(db, "words", id)));
            await Promise.all(deletePromises);

            showNotification(`تم بنجاح العثور على ${duplicatesIds.length} كلمة مكررة وحذفها من السجل!`);
            await fetchAllData();
        } catch (error) {
            console.error("Duplicates Error:", error);
            showNotification("حدث خطأ أثناء محاولة حذف الكلمات المكررة.");
        }
    });
}

// 🌟 تفعيل زر حذف النطاق حسب الـ ID (من ID كذا إلى ID كذا) بشكل صحيح
const deleteRangeBtn = document.getElementById("deleteRangeBtn");
const startIdInput = document.getElementById("startIdInput");
const endIdInput = document.getElementById("endIdInput");

if (deleteRangeBtn) {
    deleteRangeBtn.addEventListener("click", async () => {
        const startId = Number(startIdInput ? startIdInput.value : NaN);
        const endId = Number(endIdInput ? endIdInput.value : NaN);

        if (isNaN(startId) || isNaN(endId) || startId > endId) {
            showNotification("يرجى إدخال نطاق صحيح (من ID أصغر إلى ID أكبر).");
            return;
        }

        if (!confirm(`هل أنت متأكد من حذف جميع الكلمات التي يقع رقم الـ ID الخاص بها بين ${startId} و ${endId}؟`)) return;

        try {
            let targetDocsIds = [];
            allTableData.forEach(item => {
                const currentIdNum = Number(item.id);
                if (!isNaN(currentIdNum) && currentIdNum >= startId && currentIdNum <= endId && item._documentId) {
                    targetDocsIds.push(item._documentId);
                }
            });

            if (targetDocsIds.length === 0) {
                showNotification("لا توجد كلمات مطابقة ضمن هذا النطاق للحذف!");
                return;
            }

            let deletePromises = targetDocsIds.map(id => deleteDoc(doc(db, "words", id)));
            await Promise.all(deletePromises);

            showNotification(`تم بنجاح حذف ${targetDocsIds.length} كلمة ضمن النطاق المحدد!`);
            if (startIdInput) startIdInput.value = "";
            if (endIdInput) endIdInput.value = "";
            await fetchAllData();
        } catch (error) {
            console.error("Range Delete Error:", error);
            showNotification("حدث خطأ أثناء تنفيذ عملية الحذف بالنطاق.");
        }
    });
}

// إدارة الاستمارة (إضافة وتعديل ومسح)
if (registerButton) {
    registerButton.addEventListener("click", async () => {
        const usernameVal = userIdInput ? userIdInput.value.trim() : "";
        const word = wordInput ? wordInput.value.trim() : "";
        const meaning = meaningInput ? meaningInput.value.trim() : "";
        const synonyms = synonymsInput ? synonymsInput.value.trim() : "";
        const language = languageSelect ? languageSelect.value.trim() : "";

        if (!word || !meaning || !language) {
            showNotification("يرجى ملء الكلمة والمعنى واللغة على الأقل.");
            return;
        }

        try {
            const newId = idInput ? Number(idInput.value) || 1 : 1;
            const adminEmail = currentAdmin.email || "";
            const finalUser = usernameVal ? usernameVal + "@admin" : extractUsername(adminEmail);

            await addDoc(wordsCollection, {
                id: newId,
                word: word,
                meaning: meaning,
                synonyms: synonyms,
                language: language,
                userId: currentAdmin.uid,
                userEmail: adminEmail,
                username: finalUser,
                role: "admin",
                createdAt: new Date()
            });

            showNotification("تم إضافة الكلمة بنجاح للقاعدة!");
            clearForm();
            await fetchAllData();
        } catch (err) {
            showNotification("حدث خطأ أثناء حفظ الكلمة.");
        }
    });
}

if (updateButton) {
    updateButton.addEventListener("click", async () => {
        if (!selectedDocumentId) {
            showNotification("اختر كلمة من الجدول أولاً لتعديلها.");
            return;
        }

        const word = wordInput ? wordInput.value.trim() : "";
        const meaning = meaningInput ? meaningInput.value.trim() : "";
        const synonyms = synonymsInput ? synonymsInput.value.trim() : "";
        const language = languageSelect ? languageSelect.value.trim() : "";

        if (!word || !meaning || !language) {
            showNotification("يرجى إكمال الحقول الأساسية.");
            return;
        }

        try {
            const docRef = doc(db, "words", selectedDocumentId);
            await updateDoc(docRef, {
                word: word,
                meaning: meaning,
                synonyms: synonyms,
                language: language
            });

            showNotification("تم تحديث الكلمة بنجاح!");
            clearForm();
            await fetchAllData();
        } catch (err) {
            showNotification("حدث خطأ أثناء التحديث.");
        }
    });
}

function clearForm() {
    if (userIdInput) userIdInput.value = "";
    if (wordInput) wordInput.value = "";
    if (meaningInput) meaningInput.value = "";
    if (synonymsInput) synonymsInput.value = "";
    if (languageSelect) languageSelect.selectedIndex = 0;
    selectedDocumentId = null;
    setNextIdAdmin();
}

if (clearButton) {
    clearButton.addEventListener("click", (e) => {
        e.preventDefault();
        clearForm();
        showNotification("تم مسح الاستمارة.");
    });
}

let authCheckCompleted = false;

setTimeout(() => {
    if (!authCheckCompleted && (!auth.currentUser)) {
        window.location.replace("login.html");
    }
}, 3000);

onAuthStateChanged(auth, async user => {
    authCheckCompleted = true;

    if (!user) {
        window.location.replace("login.html");
        return;
    }

    const isAdmin = await verifyAdminPermission(user);
    if (!isAdmin) {
        showNotification("ليس لديك صلاحيات الأدمن للوصول هنا!");
        setTimeout(() => {
            window.location.replace("index.html");
        }, 1500);
        return;
    }

    currentAdmin = user;
    if (loaderOverlay && loaderOverlay.parentNode) loaderOverlay.remove();
    
    await fetchAllData();
});
