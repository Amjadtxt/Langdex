// ======================================================
// LANGDEX - admin.js
// Global Admin CRUD Operations (Full Access for All Users)
// ======================================================

import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// ======================================================
// FIREBASE INITIALIZATION
// ======================================================

const firebaseConfig = {
  apiKey: "AIzaSyCKshc43zO6DYwfPheHH9CsraX3VpU2fjc",
  authDomain: "langdex.firebaseapp.com",
  projectId: "langdex",
  storageBucket: "langdex.firebasestorage.app",
  messagingSenderId: "819838317933",
  appId: "1:819838317933:web:cae7f4531ea32f958c5664",
  measurementId: "G-F60CC2CDCJ"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;


// ======================================================
// DOM ELEMENTS
// ======================================================

const searchInput = document.querySelector("#search-input");
const searchBtn = document.querySelector("#search-btn");
const searchResult = document.querySelector("#search-result");

const wordIdInput = document.querySelector("#word-id");
const wordUserInput = document.querySelector("#word-user");
const wordInput = document.querySelector("#word");
const meaningInput = document.querySelector("#meaning");
const synonymsInput = document.querySelector("#synonyms");
const languageSelect = document.querySelector("#language");

const saveBtn = document.querySelector("#save-word");
const updateBtn = document.querySelector("#update-word");
const deleteBtn = document.querySelector("#delete-word");
const clearBtn = document.querySelector("#clear-form");


// ======================================================
// AUTH MONITOR
// ======================================================

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
    }
});


// ======================================================
// HELPER: CLEAR FORM
// ======================================================

function clearForm() {
    if (wordIdInput) wordIdInput.value = "";
    if (wordInput) wordInput.value = "";
    if (meaningInput) meaningInput.value = "";
    if (synonymsInput) synonymsInput.value = "";
    if (languageSelect) languageSelect.value = "";
    if (searchResult) searchResult.innerHTML = "";
    if (wordUserInput) wordUserInput.value = "";
}

if (clearBtn) {
    clearBtn.addEventListener("click", clearForm);
}


// ======================================================
// 1. SAVE NEW WORD (حفظ كلمة جديدة)
// ======================================================

if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
        if (!currentUser) return alert("يجب تسجيل الدخول أولاً.");

        const word = wordInput.value.trim();
        const meaning = meaningInput.value.trim();
        const synonyms = synonymsInput.value.trim();
        const language = languageSelect.value;

        if (!word || !meaning || !language) {
            return alert("يرجى ملء الكلمة والمعنى واختيار اللغة.");
        }

        try {
            saveBtn.disabled = true;

            const docRef = await addDoc(collection(db, "words"), {
                userId: currentUser.uid,
                userEmail: currentUser.email,
                word: word,
                meaning: meaning,
                synonyms: synonyms,
                language: language,
                createdAt: serverTimestamp()
            });

            wordIdInput.value = docRef.id;
            if (wordUserInput) wordUserInput.value = currentUser.email;

            alert("تم حفظ الكلمة بنجاح!");

        } catch (error) {
            console.error("Save Error:", error);
            alert("حدث خطأ أثناء الحفظ: " + error.message);
        } finally {
            saveBtn.disabled = false;
        }
    });
}


// ======================================================
// 2. GLOBAL SEARCH (البحث في كلمات جميع المستخدمين)
// ======================================================

if (searchBtn) {
    searchBtn.addEventListener("click", async () => {
        const queryText = searchInput.value.trim();

        if (!queryText) return alert("اكتب كلمة للبحث عنها.");

        try {
            searchResult.innerHTML = "جاري البحث في كافة السجلات...";

            // بحث شامل بدون تقييد بـ userId
            const q = query(
                collection(db, "words"),
                where("word", "==", queryText)
            );

            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                searchResult.innerHTML = "<p>لم يتم العثور على أية نتائج.</p>";
                return;
            }

            searchResult.innerHTML = "";

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                
                const item = document.createElement("div");
                item.style.cssText = "padding: 10px; margin-top: 5px; background: #2a2a2a; border-right: 4px solid #ff9800; cursor: pointer; border-radius: 4px;";
                
                item.innerHTML = `
                    <div><strong>الكلمة:</strong> ${data.word} | <strong>المعنى:</strong> ${data.meaning}</div>
                    <div style="font-size: 0.85em; color: #aaa; margin-top: 3px;">
                        اللغة: ${data.language} | صاحب الكلمة: ${data.userEmail || data.userId || "غير معروف"}
                    </div>
                `;
                
                // عند النقر يتم تعبئة بيانات الكلمة في النموذج لتعديلها أو حذفها
                item.addEventListener("click", () => {
                    wordIdInput.value = docSnap.id;
                    wordInput.value = data.word || "";
                    meaningInput.value = data.meaning || "";
                    synonymsInput.value = data.synonyms || "";
                    languageSelect.value = data.language || "";
                    if (wordUserInput) wordUserInput.value = data.userEmail || data.userId || "";
                });

                searchResult.appendChild(item);
            });

        } catch (error) {
            console.error("Search Error:", error);
            searchResult.innerHTML = "حدث خطأ أثناء البحث.";
        }
    });
}


// ======================================================
// 3. UPDATE ANY WORD (تحديث أي كلمة لأي مستخدم)
// ======================================================

if (updateBtn) {
    updateBtn.addEventListener("click", async () => {
        const docId = wordIdInput.value;

        if (!docId) {
            return alert("اختر كلمة من نتائج البحث أولاً لتحديدها قبل التحديث.");
        }

        try {
            updateBtn.disabled = true;

            const docRef = doc(db, "words", docId);
            
            // تعديل مستند الكلمة في Firestore بغض النظر عن صاحبها الاصلي
            await updateDoc(docRef, {
                word: wordInput.value.trim(),
                meaning: meaningInput.value.trim(),
                synonyms: synonymsInput.value.trim(),
                language: languageSelect.value,
                updatedAt: serverTimestamp(),
                lastModifiedByAdmin: currentUser ? currentUser.email : "Admin"
            });

            alert("تم تحديث الكلمة بنجاح!");

        } catch (error) {
            console.error("Update Error:", error);
            alert("حدث خطأ أثناء التحديث: " + error.message);
        } finally {
            updateBtn.disabled = false;
        }
    });
}


// ======================================================
// 4. DELETE ANY WORD (حذف أي كلمة لأي مستخدم)
// ======================================================

if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
        const docId = wordIdInput.value;

        if (!docId) {
            return alert("اختر كلمة من نتائج البحث أولاً لحذفها.");
        }

        if (!confirm("هل أنت متأكد من رغبتك في حذف هذه الكلمة نهائياً؟")) return;

        try {
            deleteBtn.disabled = true;

            const docRef = doc(db, "words", docId);
            await deleteDoc(docRef);

            alert("تم حذف الكلمة بنجاح.");
            clearForm();

        } catch (error) {
            console.error("Delete Error:", error);
            alert("حدث خطأ أثناء الحذف: " + error.message);
        } finally {
            deleteBtn.disabled = false;
        }
    });
}
