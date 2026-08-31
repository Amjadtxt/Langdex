// ======================================================
// LANGDEX - SCRIPT.JS
// Firebase + Register / Update / Delete / Search
// Show Data + Dynamic Language Filter + Clear Filter
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
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};


// ======================================================
// FIREBASE
// ======================================================

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const wordsCollection = collection(db, "words");


// ======================================================
// FORM ELEMENTS
// ======================================================

const form =
  document.querySelector(".form");

let idInput = null;
let wordInput = null;
let meaningInput = null;
let synonymsInput = null;
let languageSelect = null;

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

let isExistingData = false;

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
// GET NEXT ID
// ======================================================

async function getNextId() {

  try {

    const snapshot =
      await getDocs(
        wordsCollection
      );

    let maxId = 0;

    snapshot.forEach(
      firebaseDoc => {

        const data =
          firebaseDoc.data();

        const id =
          Number(data.id);

        if (
          Number.isFinite(id) &&
          id > maxId
        ) {

          maxId = id;

        }

      }
    );

    return maxId + 1;

  } catch (error) {

    console.error(
      "Get next ID error:",
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

  isExistingData = false;

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

    languageSelect.value =
      data.language ?? "";

  }

}


// ======================================================
// GET ALL WORDS
// ======================================================

async function getAllWords() {

  const snapshot =
    await getDocs(
      wordsCollection
    );

  const rows = [];

  snapshot.forEach(
    firebaseDoc => {

      const data =
        firebaseDoc.data();

      rows.push({

        ...data,

        _documentId:
          firebaseDoc.id

      });

    }
  );


  rows.sort(
    (a, b) =>
      Number(a.id) -
      Number(b.id)
  );


  return rows;

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


        if (
          allTableData.length === 0
        ) {

          renderTable([]);

          alert(
            "لا توجد بيانات."
          );

          return;

        }


        // ----------------------------------------------
        // APPLY CURRENT FILTER
        // ----------------------------------------------

        renderFilteredTable();


      } catch (error) {

        console.error(
          "Show data error:",
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
// RENDER TABLE
// ======================================================

function renderTable(rows) {

  if (!dataTable) {
    return;
  }


  dataTable.innerHTML = "";


  rows.forEach(
    data => {

      const row =
        document.createElement("tr");


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
            document.createElement("td");


          cell.textContent =
            value || "-";


          row.appendChild(cell);

        }
      );


      dataTable.appendChild(row);

    }
  );

}


// ======================================================
// DYNAMIC LANGUAGE FILTER
// ======================================================
//
// IMPORTANT:
//
// لا توجد هنا قائمة ثابتة للغات.
//
// الـvalue المختار من الـselect
// يتم مقارنته مباشرة مع language
// الموجودة في Firebase.
//
// يعني لو أضفت:
// French
//
// أو:
// German
//
// أو:
// Spanish
//
// أو أي لغة أخرى:
//
// الفلتر يشتغل تلقائيًا.
//
// ======================================================

function renderFilteredTable() {

  if (!languageFilter) {

    renderTable(
      allTableData
    );

    return;

  }


  const selectedLanguage =
    languageFilter.value.trim();


  // ----------------------------------------------
  // ALL LANGUAGES
  // ----------------------------------------------

  if (
    !selectedLanguage ||
    selectedLanguage === "all"
  ) {

    renderTable(
      allTableData
    );

    return;

  }


  // ----------------------------------------------
  // FILTER
  // ----------------------------------------------

  const filteredData =
    allTableData.filter(
      item => {

        const firebaseLanguage =
          normalize(
            item.language
          );

        const selected =
          normalize(
            selectedLanguage
          );


        return (
          firebaseLanguage ===
          selected
        );

      }
    );


  // ----------------------------------------------
  // DISPLAY
  // ----------------------------------------------

  renderTable(
    filteredData
  );

}


// ======================================================
// LANGUAGE FILTER EVENT
// ======================================================

if (languageFilter) {

  languageFilter.addEventListener(
    "change",
    function () {

      // لو البيانات لسه متحملتش
      if (
        allTableData.length === 0
      ) {

        return;

      }


      renderFilteredTable();

    }
  );

}


// ======================================================
// CLEAR FILTER
// ======================================================

if (clearFilterButton) {

  clearFilterButton.addEventListener(
    "click",
    function () {

      // ----------------------------------------------
      // RESET SELECT
      // ----------------------------------------------

      if (languageFilter) {

        languageFilter.value =
          "all";

      }


      // ----------------------------------------------
      // SHOW ALL DATA
      // ----------------------------------------------

      renderTable(
        allTableData
      );

    }
  );

}


// ======================================================
// SEARCH
// ======================================================

async function searchFirebase(
  searchText
) {

  const rows =
    await getAllWords();

  const target =
    normalize(
      searchText
    );


  return rows.filter(
    item => {

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

    }
  );

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

        // --------------------------------------------
        // NEW SEARCH
        // --------------------------------------------

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


        // --------------------------------------------
        // NO RESULTS
        // --------------------------------------------

        if (
          searchResults.length === 0
        ) {

          alert(
            "لم يتم العثور على نتائج."
          );

          return;

        }


        // --------------------------------------------
        // CURRENT RESULT
        // --------------------------------------------

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

        // --------------------------------------------
        // CHECK DUPLICATE
        // --------------------------------------------

        const allWords =
          await getAllWords();


        const duplicate =
          allWords.find(
            item =>
              normalize(
                item.word
              ) ===
              normalize(
                word
              )
          );


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


        // --------------------------------------------
        // NEW ID
        // --------------------------------------------

        const newId =
          await getNextId();


        // --------------------------------------------
        // SAVE
        // --------------------------------------------

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

      if (!selectedDocumentId) {

        alert(
          "ابحث عن كلمة موجودة أولاً."
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


      if (!selectedDocumentId) {

        alert(
          "ابحث عن كلمة موجودة أولاً."
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
// PDF
// ======================================================

if (downloadPdfButton) {

  downloadPdfButton.addEventListener(
    "click",
    async function () {

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

        // --------------------------------------------
        // LOAD DATA IF NECESSARY
        // --------------------------------------------

        if (
          allTableData.length === 0
        ) {

          allTableData =
            await getAllWords();

        }


        if (
          allTableData.length === 0
        ) {

          alert(
            "لا توجد بيانات."
          );

          return;

        }


        // --------------------------------------------
        // GET CURRENT FILTER
        // --------------------------------------------

        let rows =
          allTableData;


        if (languageFilter) {

          const selected =
            languageFilter.value.trim();


          if (
            selected &&
            selected !== "all"
          ) {

            rows =
              allTableData.filter(
                item =>
                  normalize(
                    item.language
                  ) ===
                  normalize(
                    selected
                  )
              );

          }

        }


        if (rows.length === 0) {

          alert(
            "لا توجد بيانات لهذه اللغة."
          );

          return;

        }


        // --------------------------------------------
        // CREATE PDF CONTAINER
        // --------------------------------------------

        const container =
          document.createElement("div");


        container.style.padding =
          "20px";

        container.style.background =
          "#ffffff";

        container.style.color =
          "#000000";

        container.style.direction =
          "rtl";

        container.style.fontFamily =
          "Cairo, Arial, sans-serif";


        const title =
          document.createElement("h1");


        title.textContent =
          "Langdex - البيانات";


        title.style.textAlign =
          "center";


        container.appendChild(
          title
        );


        // --------------------------------------------
        // TABLE
        // --------------------------------------------

        const table =
          document.createElement("table");


        table.style.width =
          "100%";

        table.style.borderCollapse =
          "collapse";


        // --------------------------------------------
        // HEADER
        // --------------------------------------------

        const headers = [

          "ID",
          "الكلمة",
          "المعنى",
          "المرادف",
          "اللغة"

        ];


        const thead =
          document.createElement("thead");


        const headerRow =
          document.createElement("tr");


        headers.forEach(
          text => {

            const th =
              document.createElement("th");


            th.textContent =
              text;


            th.style.border =
              "1px solid #000";

            th.style.padding =
              "8px";

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


        // --------------------------------------------
        // BODY
        // --------------------------------------------

        const tbody =
          document.createElement("tbody");


        rows.forEach(
          data => {

            const row =
              document.createElement("tr");


            [

              data.id,
              data.word,
              data.meaning,
              data.synonyms,
              data.language

            ].forEach(
              value => {

                const td =
                  document.createElement("td");


                td.textContent =
                  value || "-";


                td.style.border =
                  "1px solid #000";

                td.style.padding =
                  "8px";


                row.appendChild(td);

              }
            );


            tbody.appendChild(row);

          }
        );


        table.appendChild(
          tbody
        );


        container.appendChild(
          table
        );


        document.body.appendChild(
          container
        );


        // --------------------------------------------
        // PDF
        // --------------------------------------------

        await html2pdf()
          .set({

            margin: 10,

            filename:
              "Langdex-Data.pdf",

            image: {

              type: "jpeg",

              quality: 0.98

            },

            html2canvas: {

              scale: 2,

              useCORS: true

            },

            jsPDF: {

              unit: "mm",

              format: "a4",

              orientation:
                "landscape"

            }

          })
          .from(container)
          .save();


        container.remove();


      } catch (error) {

        console.error(
          "PDF error:",
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
// START
// ======================================================

if (idInput) {

  setNextId();

}