// ======================================================
// LANGDEX - SCRIPT.JS
// Firebase + Search + Register + Update + Delete
// Clear + Auto ID + Show Data + Language Filter + PDF
// ======================================================


// ======================================================
// FIREBASE
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
// FIREBASE CONFIGURATION
// ======================================================

const firebaseConfig = {

  apiKey:
    "AIzaSyCKsh43O6DYwfPheHH9CsraX3VpU2fjc",

  authDomain:
    "langdex.firebaseapp.com",

  projectId:
    "langdex",

  storageBucket:
    "langdex.firebasestorage.app",

  messagingSenderId:
    "819838317933",

  appId:
    "1:819838317933:web:cae7f4531ea32f958c5664",

  measurementId:
    "G-F60CC2CDC"

};


// ======================================================
// INITIALIZE FIREBASE
// ======================================================

const app =
  initializeApp(firebaseConfig);

const db =
  getFirestore(app);


// ======================================================
// FIRESTORE COLLECTION
// ======================================================

const wordsCollection =
  collection(db, "words");


// ======================================================
// FORM
// ======================================================

const form =
  document.querySelector(".form");


let idInput = null;
let wordInput = null;
let meaningInput = null;
let synonymsInput = null;
let languageSelect = null;


// ======================================================
// GET FORM INPUTS
// ======================================================

if (form) {

  const inputs =
    form.querySelectorAll("input");


  idInput =
    inputs[0] || null;


  wordInput =
    inputs[1] || null;


  meaningInput =
    inputs[2] || null;


  synonymsInput =
    inputs[3] || null;


  languageSelect =
    form.querySelector("select");

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

const downloadPdfButton =
  document.querySelector("#download-pdf");


// ======================================================
// VARIABLES
// ======================================================

// Firestore document ID
let selectedDocumentId = null;


// Whether form currently contains existing Firebase data
let isExistingData = false;


// Search results
let searchResults = [];


// Current search result
let searchIndex = 0;


// Previous search text
let lastSearchText = "";


// All data loaded into Data page
let allTableData = [];


// ======================================================
// NORMALIZE TEXT
// ======================================================

function normalize(value) {

  return String(value ?? "")
    .trim()
    .toLowerCase();

}


// ======================================================
// GET NEXT ID
// ======================================================

async function getNextId() {

  try {

    const snapshot =
      await getDocs(wordsCollection);


    let maxId = 0;


    snapshot.forEach(
      firebaseDoc => {

        const data =
          firebaseDoc.data();


        const currentId =
          Number(data.id);


        if (
          Number.isFinite(currentId) &&
          currentId > maxId
        ) {

          maxId =
            currentId;

        }

      }
    );


    return maxId + 1;


  } catch (error) {

    console.error(
      "Error getting next ID:",
      error
    );


    return 1;

  }

}


// ======================================================
// SET NEXT ID
// ======================================================

async function setNextId() {

  if (!idInput) {
    return;
  }


  idInput.value =
    await getNextId();

}


// ======================================================
// CLEAR SEARCH STATE
// ======================================================

function clearSearchState() {

  searchResults = [];

  searchIndex = 0;

  lastSearchText = "";

}


// ======================================================
// CLEAR FORM
// ======================================================

async function clearForm() {

  // --------------------------------------------------
  // CLEAR INPUTS
  // --------------------------------------------------

  if (wordInput) {

    wordInput.value =
      "";

  }


  if (meaningInput) {

    meaningInput.value =
      "";

  }


  if (synonymsInput) {

    synonymsInput.value =
      "";

  }


  // --------------------------------------------------
  // RESET LANGUAGE
  // --------------------------------------------------

  if (languageSelect) {

    languageSelect.selectedIndex =
      0;

  }


  // --------------------------------------------------
  // RESET SELECTED DOCUMENT
  // --------------------------------------------------

  selectedDocumentId =
    null;


  isExistingData =
    false;


  // --------------------------------------------------
  // RESET SEARCH
  // --------------------------------------------------

  clearSearchState();


  if (searchInput) {

    searchInput.value =
      "";

  }


  if (searchResult) {

    searchResult.textContent =
      "";

  }


  // --------------------------------------------------
  // GET NEW ID
  // --------------------------------------------------

  await setNextId();

}


// ======================================================
// FILL FORM WITH FIREBASE DATA
// ======================================================

function fillForm(
  data,
  documentId
) {

  selectedDocumentId =
    documentId;


  isExistingData =
    true;


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

    const language =
      data.language ?? "";


    languageSelect.value =
      language;

  }

}


// ======================================================
// SEARCH FIREBASE
// ======================================================

async function searchFirebase(
  searchText
) {

  const snapshot =
    await getDocs(wordsCollection);


  const target =
    normalize(searchText);


  const results = [];


  snapshot.forEach(
    firebaseDoc => {

      const data =
        firebaseDoc.data();


      const id =
        normalize(data.id);


      const word =
        normalize(data.word);


      const meaning =
        normalize(data.meaning);


      const synonyms =
        normalize(data.synonyms);


      const language =
        normalize(data.language);


      // ------------------------------------------------
      // SEARCH ALL FIELDS
      // ------------------------------------------------

      if (

        id.includes(target) ||

        word.includes(target) ||

        meaning.includes(target) ||

        synonyms.includes(target) ||

        language.includes(target)

      ) {

        results.push({

          data:
            data,

          documentId:
            firebaseDoc.id

        });

      }

    }
  );


  // ----------------------------------------------------
  // SORT RESULTS BY ID
  // ----------------------------------------------------

  results.sort(
    (a, b) =>
      Number(a.data.id) -
      Number(b.data.id)
  );


  return results;

}


// ======================================================
// SEARCH BUTTON
// ======================================================

if (
  searchButton &&
  searchInput
) {

  searchInput.focus();


  searchButton.addEventListener(
    "click",
    async function () {

      const searchText =
        normalize(
          searchInput.value
        );


      // ------------------------------------------------
      // EMPTY SEARCH
      // ------------------------------------------------

      if (!searchText) {

        alert(
          "اكتب شيئًا للبحث."
        );

        return;

      }


      try {

        // ------------------------------------------------
        // NEW SEARCH
        // ------------------------------------------------

        if (
          searchText !==
          lastSearchText
        ) {

          searchResults =
            await searchFirebase(
              searchText
            );


          searchIndex =
            0;


          lastSearchText =
            searchText;

        }


        // ------------------------------------------------
        // NO RESULTS
        // ------------------------------------------------

        if (
          searchResults.length === 0
        ) {

          alert(
            "لم يتم العثور على نتائج."
          );

          return;

        }


        // ------------------------------------------------
        // CURRENT RESULT
        // ------------------------------------------------

        const result =
          searchResults[
            searchIndex
          ];


        // ------------------------------------------------
        // FILL FORM
        // ------------------------------------------------

        fillForm(
          result.data,
          result.documentId
        );


        // ------------------------------------------------
        // SEARCH RESULT MESSAGE
        // ------------------------------------------------

        if (searchResult) {

          searchResult.textContent =
            `تم العثور على النتيجة ${searchIndex + 1} من ${searchResults.length}`;

        }


        // ------------------------------------------------
        // NEXT RESULT
        // ------------------------------------------------

        searchIndex++;


        if (
          searchIndex >=
          searchResults.length
        ) {

          searchIndex =
            0;

        }


      } catch (error) {

        console.error(
          "Search error:",
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

      // ------------------------------------------------
      // PREVENT REGISTER OF EXISTING DATA
      // ------------------------------------------------

      if (isExistingData) {

        alert(
          "هذه الكلمة موجودة بالفعل.\nاستخدم Update أو Delete."
        );

        return;

      }


      // ------------------------------------------------
      // GET VALUES
      // ------------------------------------------------

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


      // ------------------------------------------------
      // VALIDATION
      // ------------------------------------------------

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


      // ------------------------------------------------
      // ONLY THREE LANGUAGES
      // ------------------------------------------------

      const allowedLanguages = [

        "English",
        "Urdu",
        "Hindi"

      ];


      if (
        !allowedLanguages.includes(
          language
        )
      ) {

        alert(
          "اللغة يجب أن تكون English أو Urdu أو Hindi."
        );

        return;

      }


      try {

        // ------------------------------------------------
        // CHECK DUPLICATE
        // ------------------------------------------------

        const existing =
          await searchFirebase(
            word
          );


        const exactMatch =
          existing.find(
            item =>
              normalize(
                item.data.word
              ) ===
              normalize(word)
          );


        if (exactMatch) {

          alert(
            `هذه الكلمة موجودة بالفعل.\nID: ${exactMatch.data.id}`
          );


          fillForm(
            exactMatch.data,
            exactMatch.documentId
          );


          return;

        }


        // ------------------------------------------------
        // GET NEW ID
        // ------------------------------------------------

        const newId =
          await getNextId();


        // ------------------------------------------------
        // SAVE TO FIREBASE
        // ------------------------------------------------

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
          "تم تسجيل البيانات بنجاح."
        );


        // ------------------------------------------------
        // CLEAR FORM
        // ------------------------------------------------

        await clearForm();


      } catch (error) {

        console.error(
          "Register error:",
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

      // ------------------------------------------------
      // NO SELECTED DOCUMENT
      // ------------------------------------------------

      if (!selectedDocumentId) {

        alert(
          "ابحث عن كلمة موجودة أولاً."
        );

        return;

      }


      // ------------------------------------------------
      // GET VALUES
      // ------------------------------------------------

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


      // ------------------------------------------------
      // VALIDATION
      // ------------------------------------------------

      if (!word || !meaning) {

        alert(
          "أكمل الكلمة والمعنى."
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
          "Update error:",
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


      // ------------------------------------------------
      // NO SELECTED DOCUMENT
      // ------------------------------------------------

      if (!selectedDocumentId) {

        alert(
          "ابحث عن كلمة موجودة أولاً."
        );

        return;

      }


      // ------------------------------------------------
      // CONFIRM
      // ------------------------------------------------

      const confirmed =
        confirm(
          "هل أنت متأكد من حذف هذه الكلمة؟"
        );


      if (!confirmed) {

        return;

      }


      try {

        const wordDocument =
          doc(
            db,
            "words",
            selectedDocumentId
          );


        await deleteDoc(
          wordDocument
        );


        alert(
          "تم حذف البيانات بنجاح."
        );


        await clearForm();


      } catch (error) {

        console.error(
          "Delete error:",
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
// CLEAR BUTTON
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
// RENDER TABLE
// ======================================================

function renderTable(
  rows
) {

  if (!dataTable) {

    return;

  }


  dataTable.innerHTML =
    "";


  rows.forEach(
    data => {

      const row =
        document.createElement(
          "tr"
        );


      const values = [

        data.id,

        data.word,

        data.meaning,

        data.synonyms,

        data.language

      ];


      values.forEach(
        value => {

          const cell =
            document.createElement(
              "td"
            );


          cell.textContent =
            value ?? "-";


          row.appendChild(
            cell
          );

        }
      );


      dataTable.appendChild(
        row
      );

    }
  );

}


// ======================================================
// SHOW ALL DATA
// ======================================================

if (
  showDataButton &&
  dataTable
) {

  showDataButton.addEventListener(
    "click",
    async function () {

      try {

        const snapshot =
          await getDocs(
            wordsCollection
          );


        // ------------------------------------------------
        // CLEAR TABLE
        // ------------------------------------------------

        dataTable.innerHTML =
          "";


        // ------------------------------------------------
        // EMPTY DATABASE
        // ------------------------------------------------

        if (snapshot.empty) {

          allTableData =
            [];


          alert(
            "لا توجد بيانات في قاعدة البيانات."
          );

          return;

        }


        // ------------------------------------------------
        // GET DATA
        // ------------------------------------------------

        const rows = [];


        snapshot.forEach(
          firebaseDoc => {

            rows.push(
              firebaseDoc.data()
            );

          }
        );


        // ------------------------------------------------
        // SORT BY ID
        // ------------------------------------------------

        rows.sort(
          (a, b) =>
            Number(a.id) -
            Number(b.id)
        );


        // ------------------------------------------------
        // SAVE ALL DATA
        // ------------------------------------------------

        allTableData =
          rows;


        // ------------------------------------------------
        // APPLY CURRENT FILTER
        // ------------------------------------------------

        let visibleRows =
          allTableData;


        if (
          languageFilter &&
          languageFilter.value !== "all"
        ) {

          const selectedLanguage =
            languageFilter.value;


          visibleRows =
            allTableData.filter(
              item =>
                normalize(
                  item.language
                ) ===
                normalize(
                  selectedLanguage
                )
            );

        }


        // ------------------------------------------------
        // RENDER
        // ------------------------------------------------

        renderTable(
          visibleRows
        );


      } catch (error) {

        console.error(
          "Show Data error:",
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
// LANGUAGE FILTER
// ======================================================

if (languageFilter) {

  languageFilter.addEventListener(
    "change",
    function () {

      // ------------------------------------------------
      // DATABASE NOT LOADED YET
      // ------------------------------------------------

      if (
        allTableData.length === 0
      ) {

        return;

      }


      const selectedLanguage =
        languageFilter.value;


      // ------------------------------------------------
      // ALL
      // ------------------------------------------------

      if (
        selectedLanguage ===
        "all"
      ) {

        renderTable(
          allTableData
        );

        return;

      }


      // ------------------------------------------------
      // FILTER
      // ------------------------------------------------

      const filteredRows =
        allTableData.filter(
          item =>
            normalize(
              item.language
            ) ===
            normalize(
              selectedLanguage
            )
        );


      renderTable(
        filteredRows
      );

    }
  );

}


// ======================================================
// DOWNLOAD PDF
// ======================================================

if (downloadPdfButton) {

  downloadPdfButton.addEventListener(
    "click",
    function () {

      // ------------------------------------------------
      // CHECK LIBRARY
      // ------------------------------------------------

      if (
        typeof html2pdf ===
        "undefined"
      ) {

        alert(
          "لم يتم تحميل مكتبة PDF."
        );

        return;

      }


      // ------------------------------------------------
      // CHECK DATA
      // ------------------------------------------------

      if (
        allTableData.length === 0
      ) {

        alert(
          "اضغط عرض أولاً."
        );

        return;

      }


      // ------------------------------------------------
      // GET LANGUAGE
      // ------------------------------------------------

      const selectedLanguage =
        languageFilter
          ? languageFilter.value
          : "all";


      // ------------------------------------------------
      // FILTER DATA
      // ------------------------------------------------

      let dataToDownload;


      if (
        selectedLanguage ===
        "all"
      ) {

        dataToDownload =
          allTableData;

      } else {

        dataToDownload =
          allTableData.filter(
            item =>
              normalize(
                item.language
              ) ===
              normalize(
                selectedLanguage
              )
          );

      }


      // ------------------------------------------------
      // NO DATA
      // ------------------------------------------------

      if (
        dataToDownload.length === 0
      ) {

        alert(
          "لا توجد كلمات لهذه اللغة."
        );

        return;

      }


      // ==================================================
      // CREATE PDF CONTAINER
      // ==================================================

      const pdfContainer =
        document.createElement(
          "div"
        );


      pdfContainer.style.padding =
        "20px";


      pdfContainer.style.background =
        "#ffffff";


      pdfContainer.style.color =
        "#000000";


      pdfContainer.style.direction =
        "rtl";


      pdfContainer.style.fontFamily =
        "Cairo, Arial, sans-serif";


      // ==================================================
      // TITLE
      // ==================================================

      const title =
        document.createElement(
          "h1"
        );


      if (
        selectedLanguage ===
        "all"
      ) {

        title.textContent =
          "Langdex - جميع الكلمات";

      } else {

        title.textContent =
          `Langdex - ${selectedLanguage}`;

      }


      title.style.textAlign =
        "center";


      title.style.marginBottom =
        "20px";


      pdfContainer.appendChild(
        title
      );


      // ==================================================
      // TABLE
      // ==================================================

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


      // ==================================================
      // HEADER
      // ==================================================

      const thead =
        document.createElement(
          "thead"
        );


      const headerRow =
        document.createElement(
          "tr"
        );


      const headers = [

        "ID",

        "الكلمة",

        "المعنى",

        "المرادف",

        "اللغة"

      ];


      headers.forEach(
        text => {

          const th =
            document.createElement(
              "th"
            );


          th.textContent =
            text;


          th.style.border =
            "1px solid #000";


          th.style.padding =
            "8px";


          th.style.textAlign =
            "center";


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


      // ==================================================
      // BODY
      // ==================================================

      const tbody =
        document.createElement(
          "tbody"
        );


      dataToDownload.forEach(
        data => {

          const row =
            document.createElement(
              "tr"
            );


          const values = [

            data.id,

            data.word,

            data.meaning,

            data.synonyms,

            data.language

          ];


          values.forEach(
            value => {

              const td =
                document.createElement(
                  "td"
                );


              td.textContent =
                value ?? "-";


              td.style.border =
                "1px solid #000";


              td.style.padding =
                "8px";


              td.style.textAlign =
                "right";


              td.style.verticalAlign =
                "top";


              row.appendChild(
                td
              );

            }
          );


          tbody.appendChild(
            row
          );

        }
      );


      table.appendChild(
        tbody
      );


      pdfContainer.appendChild(
        table
      );


      // ==================================================
      // ADD TEMPORARILY TO PAGE
      // ==================================================

      document.body.appendChild(
        pdfContainer
      );


      // ==================================================
      // FILE NAME
      // ==================================================

      let fileName;


      if (
        selectedLanguage ===
        "all"
      ) {

        fileName =
          "Langdex-All-Words.pdf";

      } else {

        fileName =
          `Langdex-${selectedLanguage}.pdf`;

      }


      // ==================================================
      // PDF OPTIONS
      // ==================================================

      const options = {

        margin:
          10,

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

      };


      // ==================================================
      // GENERATE PDF
      // ==================================================

      html2pdf()

        .set(options)

        .from(pdfContainer)

        .save()

        .then(
          function () {

            if (
              pdfContainer.parentNode
            ) {

              pdfContainer.parentNode
                .removeChild(
                  pdfContainer
                );

            }

          }
        )

        .catch(
          function (error) {

            console.error(
              "PDF error:",
              error
            );


            if (
              pdfContainer.parentNode
            ) {

              pdfContainer.parentNode
                .removeChild(
                  pdfContainer
                );

            }


            alert(
              "حدث خطأ أثناء إنشاء PDF."
            );

          }
        );

    }
  );

}


// ======================================================
// INITIAL ID
// ======================================================

if (idInput) {

  setNextId();

}