// ======================================================
// LANGDEX - admin.js
// Admin Dashboard - Manage Words
// ======================================================

import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// ======================================================
// FIREBASE CONFIG
// ======================================================

const firebaseConfig = {
    apiKey: "AIzaSyCKsh43zO6DYwfPheHH9CsraX3VpU2fjc",
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
    getApps().length
        ? getApp()
        : initializeApp(firebaseConfig);

const db = getFirestore(app);

const wordsRef =
    collection(db, "words");


// ======================================================
// ELEMENTS
// ======================================================

const searchInput =
    document.getElementById("search-input");

const searchButton =
    document.getElementById("search-btn");

const searchResult =
    document.getElementById("search-result");

const idInput =
    document.getElementById("word-id");

const userInput =
    document.getElementById("word-user");

const wordInput =
    document.getElementById("word");

const meaningInput =
    document.getElementById("meaning");

const synonymsInput =
    document.getElementById("synonyms");

const languageInput =
    document.getElementById("language");

const saveButton =
    document.getElementById("save-word");

const updateButton =
    document.getElementById("update-word");

const deleteButton =
    document.getElementById("delete-word");

const clearButton =
    document.getElementById("clear-form");


// ======================================================
// VARIABLES
// ======================================================

let allWords = [];

let selectedDocumentId = null;


// ======================================================
// LOAD ALL WORDS
// ======================================================

async function loadWords() {

    try {

        const snapshot =
            await getDocs(wordsRef);

        allWords = [];

        snapshot.forEach((item) => {

            const data =
                item.data();

            allWords.push({

                documentId: item.id,

                id: data.id ?? "",

                userEmail:
                    data.userEmail ?? "",

                word:
                    data.word ?? "",

                meaning:
                    data.meaning ?? "",

                synonyms:
                    data.synonyms ?? "",

                language:
                    data.language ?? ""

            });

        });


        console.log(
            "Total words:",
            allWords.length
        );


        // اعرض كل الكلمات

        displayResults(allWords);


    } catch (error) {

        console.error(
            "LOAD ERROR:",
            error
        );

        searchResult.textContent =
            "حدث خطأ أثناء تحميل الكلمات.";

    }

}


// ======================================================
// DISPLAY RESULTS
// ======================================================

function displayResults(words) {

    searchResult.innerHTML = "";


    if (words.length === 0) {

        searchResult.textContent =
            "لا توجد نتائج.";

        return;

    }


    words.forEach((item) => {

        const result =
            document.createElement("div");


        result.className =
            "admin-result-item";


        result.innerHTML = `

            <strong>
                ${escapeHTML(item.word || "-")}
            </strong>

            <span>
                ID: ${escapeHTML(item.id || "-")}
            </span>

            <small>
                ${escapeHTML(item.userEmail || "-")}
            </small>

        `;


        // عند الضغط على الكلمة

        result.addEventListener(
            "click",
            function () {

                selectWord(item);

            }
        );


        searchResult.appendChild(result);

    });

}


// ======================================================
// SEARCH
// ======================================================

function searchWords() {

    const text =
        searchInput.value
            .trim()
            .toLowerCase();


    // لو البحث فاضي
    // اعرض كل الكلمات

    if (!text) {

        displayResults(allWords);

        return;

    }


    const results =
        allWords.filter((item) => {

            const word =
                String(item.word)
                    .toLowerCase();

            const meaning =
                String(item.meaning)
                    .toLowerCase();

            const synonyms =
                String(item.synonyms)
                    .toLowerCase();

            const id =
                String(item.id)
                    .toLowerCase();

            const email =
                String(item.userEmail)
                    .toLowerCase();


            return (

                word.includes(text) ||

                meaning.includes(text) ||

                synonyms.includes(text) ||

                id.includes(text) ||

                email.includes(text)

            );

        });


    displayResults(results);

}


// ======================================================
// SEARCH BUTTON
// ======================================================

searchButton.addEventListener(
    "click",
    searchWords
);


// ======================================================
// ENTER SEARCH
// ======================================================

searchInput.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Enter") {

            searchWords();

        }

    }
);


// ======================================================
// SELECT WORD
// ======================================================

function selectWord(item) {

    selectedDocumentId =
        item.documentId;


    idInput.value =
        item.id;

    userInput.value =
        item.userEmail;

    wordInput.value =
        item.word;

    meaningInput.value =
        item.meaning;

    synonymsInput.value =
        item.synonyms;

    languageInput.value =
        item.language;


    console.log(
        "Selected document:",
        selectedDocumentId
    );

}


// ======================================================
// UPDATE
// ======================================================

updateButton.addEventListener(
    "click",
    async function () {

        if (!selectedDocumentId) {

            alert(
                "اختار كلمة من نتائج البحث أولاً."
            );

            return;

        }


        try {

            const wordDocument =
                doc(
                    db,
                    "words",
                    selectedDocumentId
                );


            await updateDoc(
                wordDocument,
                {

                    word:
                        wordInput.value.trim(),

                    meaning:
                        meaningInput.value.trim(),

                    synonyms:
                        synonymsInput.value.trim(),

                    language:
                        languageInput.value

                }
            );


            alert(
                "تم تحديث الكلمة بنجاح."
            );


            await loadWords();


        } catch (error) {

            console.error(
                "UPDATE ERROR:",
                error
            );

            alert(
                "حدث خطأ أثناء التحديث."
            );

        }

    }
);


// ======================================================
// DELETE
// ======================================================

deleteButton.addEventListener(
    "click",
    async function () {

        if (!selectedDocumentId) {

            alert(
                "اختار كلمة من نتائج البحث أولاً."
            );

            return;

        }


        const confirmDelete =
            confirm(
                "هل أنت متأكد من حذف هذه الكلمة؟"
            );


        if (!confirmDelete) return;


        try {

            await deleteDoc(
                doc(
                    db,
                    "words",
                    selectedDocumentId
                )
            );


            alert(
                "تم حذف الكلمة."
            );


            clearForm();

            await loadWords();


        } catch (error) {

            console.error(
                "DELETE ERROR:",
                error
            );

            alert(
                "حدث خطأ أثناء الحذف."
            );

        }

    }
);


// ======================================================
// SAVE
// ======================================================

saveButton.addEventListener(
    "click",
    async function () {

        const word =
            wordInput.value.trim();

        const meaning =
            meaningInput.value.trim();

        const synonyms =
            synonymsInput.value.trim();

        const language =
            languageInput.value;


        if (!word) {

            alert(
                "اكتب الكلمة."
            );

            return;

        }


        if (!meaning) {

            alert(
                "اكتب المعنى."
            );

            return;

        }


        if (!language) {

            alert(
                "اختر اللغة."
            );

            return;

        }


        try {

            await addDoc(
                wordsRef,
                {

                    id:
                        idInput.value.trim(),

                    userEmail:
                        userInput.value.trim(),

                    word:
                        word,

                    meaning:
                        meaning,

                    synonyms:
                        synonyms,

                    language:
                        language

                }
            );


            alert(
                "تم حفظ الكلمة."
            );


            clearForm();

            await loadWords();


        } catch (error) {

            console.error(
                "SAVE ERROR:",
                error
            );

            alert(
                "حدث خطأ أثناء الحفظ."
            );

        }

    }
);


// ======================================================
// CLEAR
// ======================================================

clearButton.addEventListener(
    "click",
    clearForm
);


function clearForm() {

    selectedDocumentId =
        null;

    idInput.value = "";

    userInput.value = "";

    wordInput.value = "";

    meaningInput.value = "";

    synonymsInput.value = "";

    languageInput.value = "";

    searchInput.value = "";

}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// ======================================================
// START
// ======================================================

loadWords();