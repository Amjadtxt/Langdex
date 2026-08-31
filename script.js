// ======================================================
// LANGDEX - script.js
// ======================================================


// ======================================================
// FIREBASE IMPORTS
// ======================================================

import {
    initializeApp
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

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const wordsCollection = collection(db, "words");


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

    languageSelect =
        form.querySelector("select") || null;
}


// ======================================================
// BUTTONS
// ======================================================

const registerButton =
    document.querySelector(".reg");

const updateButton =
    document.querySelector(".upa");

const deleteButton =
    document.querySelector(".del");

const clearButton =
    document.querySelector(".cel");


// ======================================================
// SEARCH
// ======================================================

const searchInput =
    document.querySelector(".search-txt");

const searchButton =
    document.querySelector(".search-btn");

const searchResult =
    document.querySelector(".search-result");


// ======================================================
// DATA PAGE
// ======================================================

const showDataButton =
    document.querySelector(".show-data");

const dataTable =
    document.querySelector("#data-table");

const languageFilter =
    document.querySelector("#language-filter");

const clearFilterButton =
    document.querySelector("#clear-filter");

const downloadPdfButton =
    document.querySelector("#download-pdf");


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
// GET ALL WORDS
// ======================================================

async function getAllWords() {

    const snapshot =
        await getDocs(wordsCollection);

    const rows = [];

    snapshot.forEach(firebaseDoc => {

        const data =
            firebaseDoc.data();

        rows.push({

            ...data,

            _documentId:
                firebaseDoc.id

        });

    });


    // ترتيب Firebase حسب ID

    rows.sort((a, b) => {

        return (
            Number(a.id || 0) -
            Number(b.id || 0)
        );

    });


    return rows;

}


// ======================================================
// SMART ID
// ======================================================
//
// مثال:
//
// Firebase:
//
// 1
// 3
// 4
//
// الجديد = 2
//
//
// Firebase:
//
// 1
// 2
// 3
//
// الجديد = 4
//
//
// Firebase:
//
// 2
// 3
//
// الجديد = 1
//
// ======================================================

async function getNextId() {

    try {

        const rows =
            await getAllWords();

        const usedIds =
            new Set();


        rows.forEach(item => {

            const id =
                Number(item.id);


            if (
                Number.isInteger(id) &&
                id > 0
            ) {

                usedIds.add(id);

            }

        });


        let nextId = 1;


        while (
            usedIds.has(nextId)
        ) {

            nextId++;

        }


        return nextId;


    } catch (error) {

        console.error(
            "Get Next ID Error:",
            error
        );


        return 1;

    }

}


// ======================================================
// SET NEXT ID
// ======================================================

async function setNextId() {

    if (!idInput) return;

    const nextId =
        await getNextId();

    idInput.value =
        nextId;

}


// ======================================================
// CLEAR FORM
// ======================================================

async function clearForm() {

    if (wordInput) {

        wordInput.value = "";

    }


    if (meaningInput) {

        meaningInput.value = "";

    }


    if (synonymsInput) {

        synonymsInput.value = "";

    }


    if (languageSelect) {

        languageSelect.selectedIndex = 0;

    }


    selectedDocumentId = null;

    searchResults = [];

    searchIndex = 0;

    lastSearchText = "";


    if (searchInput) {

        searchInput.value = "";

    }


    if (searchResult) {

        searchResult.textContent = "";

    }


    await setNextId();

}


// ======================================================
// FILL FORM
// ======================================================

function fillForm(data, documentId) {

    selectedDocumentId =
        documentId;


    if (idInput) {

        idInput.value =
            data.id ?? "";

    }


    if (wordInput) {

        wordInput.value =
            data.word ?? "";

    }


    if (meaningInput) {

        meaningInput.value =
            data.meaning ?? "";

    }


    if (synonymsInput) {

        synonymsInput.value =
            data.synonyms ?? "";

    }


    if (languageSelect) {

        languageSelect.value =
            data.language ?? "";

    }

}


// ======================================================
// POPULATE LANGUAGE FILTER
// ======================================================
//
// اللغات يتم جلبها تلقائيًا من Firebase.
// لا نكتب English / Urdu / Hindi يدويًا.
// ======================================================

function populateLanguageFilter(rows) {

    if (!languageFilter) return;


    const oldValue =
        languageFilter.value;


    languageFilter.innerHTML = "";


    // جميع اللغات

    const allOption =
        document.createElement("option");

    allOption.value = "all";

    allOption.textContent =
        "جميع اللغات";

    languageFilter.appendChild(
        allOption
    );


    // مجموعة اللغات

    const languages =
        new Map();


    rows.forEach(item => {

        const language =
            String(
                item.language ?? ""
            ).trim();


        if (!language) return;


        const key =
            normalize(language);


        if (!languages.has(key)) {

            languages.set(
                key,
                language
            );

        }

    });


    // إضافة اللغات

    [...languages.values()]
        .sort((a, b) =>
            a.localeCompare(
                b,
                "ar"
            )
        )
        .forEach(language => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                language;


            option.textContent =
                language;


            languageFilter.appendChild(
                option
            );

        });


    // الحفاظ على اللغة المختارة

    const exists =
        [...languageFilter.options]
            .some(option => {

                return (
                    normalize(
                        option.value
                    ) ===
                    normalize(
                        oldValue
                    )
                );

            });


    if (
        oldValue &&
        exists
    ) {

        languageFilter.value =
            oldValue;

    } else {

        languageFilter.value =
            "all";

    }

}


// ======================================================
// RENDER TABLE
// ======================================================

function renderTable(rows) {

    if (!dataTable) return;


    dataTable.innerHTML = "";


    rows.forEach(data => {

        const row =
            document.createElement("tr");


        const values = [

            data.id,
            data.word,
            data.meaning,
            data.synonyms,
            data.language

        ];


        values.forEach(value => {

            const cell =
                document.createElement("td");


            cell.textContent =
                value || "-";


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


    const selectedLanguage =
        languageFilter
            ? languageFilter.value.trim()
            : "all";


    // جميع اللغات

    if (
        selectedLanguage === "" ||
        selectedLanguage === "all"
    ) {

        renderTable(
            allTableData
        );

        return;

    }


    // لغة واحدة فقط

    const filteredData =
        allTableData.filter(item => {

            return (
                normalize(
                    item.language
                ) ===
                normalize(
                    selectedLanguage
                )
            );

        });


    renderTable(
        filteredData
    );

}


// ======================================================
// SHOW DATA
// ======================================================

if (showDataButton) {

    showDataButton.addEventListener(
        "click",
        async function () {

            try {

                allTableData =
                    await getAllWords();


                populateLanguageFilter(
                    allTableData
                );


                applyLanguageFilter();


            } catch (error) {

                console.error(
                    "Show Data Error:",
                    error
                );


                alert(
                    "حدث خطأ أثناء عرض البيانات:\n" +
                    error.message
                );

            }

        }
    );

}


// ======================================================
// FILTER CHANGE
// ======================================================

if (languageFilter) {

    languageFilter.addEventListener(
        "change",
        async function () {

            try {

                if (
                    allTableData.length === 0
                ) {

                    allTableData =
                        await getAllWords();


                    populateLanguageFilter(
                        allTableData
                    );

                }


                applyLanguageFilter();


            } catch (error) {

                console.error(
                    "Filter Error:",
                    error
                );


                alert(
                    "حدث خطأ أثناء تطبيق الفلتر:\n" +
                    error.message
                );

            }

        }
    );

}


// ======================================================
// CLEAR FILTER
// ======================================================
//
// هنا إلغاء الفلتر = إلغاء عرض البيانات بالكامل.
//
// لا يرجع جميع اللغات.
// الجدول يصبح فارغًا.
//
// ======================================================

if (clearFilterButton) {

    clearFilterButton.addEventListener(
        "click",
        function () {

            // إرجاع الفلتر للوضع الطبيعي

            if (languageFilter) {

                languageFilter.value =
                    "all";

            }


            // مسح الجدول

            if (dataTable) {

                dataTable.innerHTML =
                    "";

            }


            // مسح البيانات المحملة

            allTableData = [];

        }
    );

}


// ======================================================
// SEARCH
// ======================================================

async function searchFirebase(text) {

    const rows =
        await getAllWords();


    const target =
        normalize(text);


    return rows.filter(item => {

        return (

            normalize(item.id)
                .includes(target)

            ||

            normalize(item.word)
                .includes(target)

            ||

            normalize(item.meaning)
                .includes(target)

            ||

            normalize(item.synonyms)
                .includes(target)

            ||

            normalize(item.language)
                .includes(target)

        );

    });

}


// ======================================================
// SEARCH BUTTON
// ======================================================

if (
    searchButton &&
    searchInput
) {

    searchButton.addEventListener(
        "click",
        async function () {

            const text =
                searchInput.value.trim();


            if (!text) {

                alert(
                    "اكتب شيئًا للبحث."
                );

                return;

            }


            try {

                // بحث جديد

                if (
                    normalize(text) !==
                    normalize(lastSearchText)
                ) {

                    searchResults =
                        await searchFirebase(
                            text
                        );


                    searchIndex = 0;

                    lastSearchText =
                        text;

                }


                if (
                    searchResults.length === 0
                ) {

                    alert(
                        "لم يتم العثور على نتائج."
                    );

                    return;

                }


                const result =
                    searchResults[
                        searchIndex
                    ];


                fillForm(
                    result,
                    result._documentId
                );


                if (searchResult) {

                    searchResult.textContent =
                        `تم العثور على ${searchIndex + 1} من ${searchResults.length}`;

                }


                searchIndex++;


                if (
                    searchIndex >=
                    searchResults.length
                ) {

                    searchIndex = 0;

                }


            } catch (error) {

                console.error(
                    "Search Error:",
                    error
                );


                alert(
                    "حدث خطأ أثناء البحث:\n" +
                    error.message
                );

            }

        }
    );

}


// ======================================================
// REGISTER
// ======================================================

if (registerButton) {

    registerButton.addEventListener(
        "click",
        async function () {

            const word =
                wordInput
                    ? wordInput.value.trim()
                    : "";


            const meaning =
                meaningInput
                    ? meaningInput.value.trim()
                    : "";


            const synonyms =
                synonymsInput
                    ? synonymsInput.value.trim()
                    : "";


            const language =
                languageSelect
                    ? languageSelect.value.trim()
                    : "";


            // Validation

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

                // منع التكرار

                const rows =
                    await getAllWords();


                const duplicate =
                    rows.find(item => {

                        return (
                            normalize(
                                item.word
                            ) ===
                            normalize(
                                word
                            )
                        );

                    });


                if (duplicate) {

                    alert(
                        `الكلمة موجودة بالفعل.\nID: ${duplicate.id}`
                    );


                    fillForm(
                        duplicate,
                        duplicate._documentId
                    );


                    return;

                }


                // Smart ID

                const newId =
                    await getNextId();


                // إضافة البيانات

                await addDoc(
                    wordsCollection,
                    {

                        id:
                            newId,

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
                    `تم تسجيل البيانات بنجاح.\nID: ${newId}`
                );


                await clearForm();


            } catch (error) {

                console.error(
                    "Register Error:",
                    error
                );


                alert(
                    "حدث خطأ أثناء الحفظ:\n" +
                    error.message
                );

            }

        }
    );

}


// ======================================================
// UPDATE
// ======================================================

if (updateButton) {

    updateButton.addEventListener(
        "click",
        async function () {

            if (!selectedDocumentId) {

                alert(
                    "ابحث عن الكلمة أولاً."
                );

                return;

            }


            const word =
                wordInput
                    ? wordInput.value.trim()
                    : "";


            const meaning =
                meaningInput
                    ? meaningInput.value.trim()
                    : "";


            const synonyms =
                synonymsInput
                    ? synonymsInput.value.trim()
                    : "";


            const language =
                languageSelect
                    ? languageSelect.value.trim()
                    : "";


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

                const wordRef =
                    doc(
                        db,
                        "words",
                        selectedDocumentId
                    );


                await updateDoc(
                    wordRef,
                    {

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
                    "تم تحديث البيانات بنجاح."
                );


                await clearForm();


            } catch (error) {

                console.error(
                    "Update Error:",
                    error
                );


                alert(
                    "حدث خطأ أثناء التحديث:\n" +
                    error.message
                );

            }

        }
    );

}


// ======================================================
// DELETE
// ======================================================

if (deleteButton) {

    deleteButton.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();


            if (!selectedDocumentId) {

                alert(
                    "ابحث عن الكلمة أولاً."
                );

                return;

            }


            const confirmed =
                confirm(
                    "هل أنت متأكد من حذف هذه الكلمة؟"
                );


            if (!confirmed) {

                return;

            }


            try {

                const wordRef =
                    doc(
                        db,
                        "words",
                        selectedDocumentId
                    );


                await deleteDoc(
                    wordRef
                );


                alert(
                    "تم حذف البيانات بنجاح."
                );


                await clearForm();


            } catch (error) {

                console.error(
                    "Delete Error:",
                    error
                );


                alert(
                    "حدث خطأ أثناء الحذف:\n" +
                    error.message
                );

            }

        }
    );

}


// ======================================================
// CLEAR FORM BUTTON
// ======================================================

if (clearButton) {

    clearButton.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();

            await clearForm();

        }
    );

}


// ======================================================
// DOWNLOAD PDF
// ======================================================

if (downloadPdfButton) {

    downloadPdfButton.addEventListener(
        "click",
        async function () {

            // التأكد من وجود html2pdf

            if (
                typeof html2pdf ===
                "undefined"
            ) {

                alert(
                    "مكتبة PDF غير محملة."
                );

                return;

            }


            try {

                // --------------------------------------
                // البيانات التي سيتم تحميلها
                // --------------------------------------

                if (
                    allTableData.length === 0
                ) {

                    alert(
                        "اعرض البيانات أولاً."
                    );

                    return;

                }


                // --------------------------------------
                // معرفة اللغة
                // --------------------------------------

                let selectedLanguage =
                    "جميع اللغات";


                if (languageFilter) {

                    if (
                        languageFilter.value &&
                        languageFilter.value !==
                        "all"
                    ) {

                        selectedLanguage =
                            languageFilter.value;

                    }

                }


                // --------------------------------------
                // تحديد البيانات
                // --------------------------------------

                let rows =
                    allTableData;


                if (
                    selectedLanguage !==
                    "جميع اللغات"
                ) {

                    rows =
                        allTableData.filter(
                            item => {

                                return (
                                    normalize(
                                        item.language
                                    ) ===
                                    normalize(
                                        selectedLanguage
                                    )
                                );

                            }
                        );

                }


                if (
                    rows.length === 0
                ) {

                    alert(
                        "لا توجد بيانات لتحميلها."
                    );

                    return;

                }


                // --------------------------------------
                // PDF CONTAINER
                // --------------------------------------

                const container =
                    document.createElement(
                        "div"
                    );


                container.style.width =
                    "100%";

                container.style.padding =
                    "25px";

                container.style.background =
                    "#ffffff";

                container.style.color =
                    "#000000";

                container.style.direction =
                    "rtl";

                container.style.fontFamily =
                    "Cairo, Arial, sans-serif";


                // --------------------------------------
                // HEADER
                // --------------------------------------

                const header =
                    document.createElement(
                        "div"
                    );


                header.style.textAlign =
                    "center";

                header.style.marginBottom =
                    "25px";


                // --------------------------------------
                // LANGDEX DATA
                // --------------------------------------

                const title =
                    document.createElement(
                        "h1"
                    );


                title.textContent =
                    "Langdex Data";


                title.style.margin =
                    "0";

                title.style.fontSize =
                    "28px";


                // --------------------------------------
                // LANGUAGE TITLE
                // --------------------------------------

                const languageTitle =
                    document.createElement(
                        "h2"
                    );


                languageTitle.textContent =
                    selectedLanguage;


                languageTitle.style.margin =
                    "8px 0 0";

                languageTitle.style.fontSize =
                    "22px";


                header.appendChild(
                    title
                );


                header.appendChild(
                    languageTitle
                );


                container.appendChild(
                    header
                );


                // --------------------------------------
                // TABLE
                // --------------------------------------

                const table =
                    document.createElement(
                        "table"
                    );


                table.style.width =
                    "100%";

                table.style.borderCollapse =
                    "collapse";

                table.style.direction =
                    "rtl";


                // --------------------------------------
                // HEADER ROW
                // --------------------------------------

                const thead =
                    document.createElement(
                        "thead"
                    );


                const headerRow =
                    document.createElement(
                        "tr"
                    );


                // ترتيب الأعمدة من اليمين

                const headers = [

                    "الترتيب",
                    "الكلمة",
                    "المعنى",
                    "المرادف",
                    "اللغة",
                    "ID"

                ];


                headers.forEach(
                    headerText => {

                        const th =
                            document.createElement(
                                "th"
                            );


                        th.textContent =
                            headerText;


                        th.style.border =
                            "1px solid #000";

                        th.style.padding =
                            "10px";

                        th.style.textAlign =
                            "center";

                        th.style.fontWeight =
                            "bold";

                        th.style.background =
                            "#eeeeee";


                        headerRow.appendChild(
                            th
                        );

                    }
                );


                thead.appendChild(
                    headerRow
                );


                table.appendChild(
                    thead
                );


                // --------------------------------------
                // TABLE BODY
                // --------------------------------------

                const tbody =
                    document.createElement(
                        "tbody"
                    );


                rows.forEach(
                    (data, index) => {

                        const row =
                            document.createElement(
                                "tr"
                            );


                        // ----------------------------------
                        // الترتيب
                        // ----------------------------------

                        const orderCell =
                            document.createElement(
                                "td"
                            );


                        orderCell.textContent =
                            index + 1;


                        orderCell.style.border =
                            "1px solid #000";

                        orderCell.style.padding =
                            "8px";

                        orderCell.style.textAlign =
                            "center";


                        row.appendChild(
                            orderCell
                        );


                        // ----------------------------------
                        // WORD
                        // ----------------------------------

                        const wordCell =
                            document.createElement(
                                "td"
                            );


                        wordCell.textContent =
                            data.word || "-";


                        wordCell.style.border =
                            "1px solid #000";

                        wordCell.style.padding =
                            "8px";

                        wordCell.style.textAlign =
                            "right";


                        row.appendChild(
                            wordCell
                        );


                        // ----------------------------------
                        // MEANING
                        // ----------------------------------

                        const meaningCell =
                            document.createElement(
                                "td"
                            );


                        meaningCell.textContent =
                            data.meaning || "-";


                        meaningCell.style.border =
                            "1px solid #000";

                        meaningCell.style.padding =
                            "8px";

                        meaningCell.style.textAlign =
                            "right";


                        row.appendChild(
                            meaningCell
                        );


                        // ----------------------------------
                        // SYNONYMS
                        // ----------------------------------

                        const synonymsCell =
                            document.createElement(
                                "td"
                            );


                        synonymsCell.textContent =
                            data.synonyms || "-";


                        synonymsCell.style.border =
                            "1px solid #000";

                        synonymsCell.style.padding =
                            "8px";

                        synonymsCell.style.textAlign =
                            "right";


                        row.appendChild(
                            synonymsCell
                        );


                        // ----------------------------------
                        // LANGUAGE
                        // ----------------------------------

                        const languageCell =
                            document.createElement(
                                "td"
                            );


                        languageCell.textContent =
                            data.language || "-";


                        languageCell.style.border =
                            "1px solid #000";

                        languageCell.style.padding =
                            "8px";

                        languageCell.style.textAlign =
                            "right";


                        row.appendChild(
                            languageCell
                        );


                        // ----------------------------------
                        // FIREBASE ID
                        // ----------------------------------

                        const idCell =
                            document.createElement(
                                "td"
                            );


                        idCell.textContent =
                            data.id || "-";


                        idCell.style.border =
                            "1px solid #000";

                        idCell.style.padding =
                            "8px";

                        idCell.style.textAlign =
                            "center";


                        row.appendChild(
                            idCell
                        );


                        tbody.appendChild(
                            row
                        );

                    }
                );


                table.appendChild(
                    tbody
                );


                container.appendChild(
                    table
                );


                // --------------------------------------
                // NUMBER OF WORDS
                // --------------------------------------

                const footer =
                    document.createElement(
                        "p"
                    );


                footer.textContent =
                    `عدد الكلمات: ${rows.length}`;


                footer.style.textAlign =
                    "center";

                footer.style.marginTop =
                    "15px";

                footer.style.fontWeight =
                    "bold";


                container.appendChild(
                    footer
                );


                // --------------------------------------
                // TEMPORARY CONTAINER
                // --------------------------------------

                document.body.appendChild(
                    container
                );


                // --------------------------------------
                // PDF FILE NAME
                // --------------------------------------

                const safeLanguage =
                    selectedLanguage.replace(
                        /[\\/:*?"<>|]/g,
                        "-"
                    );


                const fileName =
                    `Langdex-Data-${safeLanguage}.pdf`;


                // --------------------------------------
                // GENERATE PDF
                // --------------------------------------

                await html2pdf()

                    .set({

                        margin: 10,

                        filename:
                            fileName,

                        image: {

                            type:
                                "jpeg",

                            quality:
                                0.98

                        },

                        html2canvas: {

                            scale:
                                2,

                            useCORS:
                                true

                        },

                        jsPDF: {

                            unit:
                                "mm",

                            format:
                                "a4",

                            orientation:
                                "landscape"

                        }

                    })

                    .from(container)

                    .save();


                // --------------------------------------
                // REMOVE CONTAINER
                // --------------------------------------

                container.remove();


            } catch (error) {

                console.error(
                    "PDF Error:",
                    error
                );


                alert(
                    "حدث خطأ أثناء إنشاء PDF:\n" +
                    error.message
                );

            }

        }
    );

}


// ======================================================
// INITIAL ID
// ======================================================

if (idInput) {

    setNextId();

}