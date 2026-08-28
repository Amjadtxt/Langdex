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
  apiKey: "AIzaSyCKsh43O6DYwfPheHH9CsraX3VpU2fjc",
  authDomain: "langdex.firebaseapp.com",
  projectId: "langdex",
  storageBucket: "langdex.firebasestorage.app",
  messagingSenderId: "819838317933",
  appId: "1:819838317933:web:cae7f4531ea32f958c5664",
  measurementId: "G-F60CC2CDC"
};


// ======================================================
// INITIALIZE FIREBASE
// ======================================================

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// ======================================================
// GOOGLE APPS SCRIPT
// ======================================================

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxcWrYiajG8JfYibuc9bBFvDu3pWcGwNmX2fLXJEFWMW_90eHccNqW_4g7c-MvSnUU0lg/exec";


// ======================================================
// COLLECTION
// ======================================================

const COLLECTION_NAME = "words";


// ======================================================
// FORM
// ======================================================

const form = document.querySelector(".form");

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

const generateButton =
  document.querySelector(".gen");


// ======================================================
// SEARCH
// ======================================================

const searchInput =
  document.querySelector(".search-txt") ||
  document.querySelector(".search-section input");

const searchButton =
  document.querySelector(".search-btn");

const searchResult =
  document.querySelector(".search-result");


// ======================================================
// SHOW DATA
// ======================================================

const showDataButton =
  document.querySelector(".show-data");

const dataTable =
  document.querySelector("#data-table");


// ======================================================
// VARIABLES
// ======================================================

let selectedDocumentId = null;

let isExistingData = false;

let searchResults = [];

let searchIndex = 0;

let lastSearchText = "";


// ======================================================
// GENERATE BUTTON STATE
// ======================================================

function updateGenerateButton() {

  if (!generateButton) {
    return;
  }

  if (isExistingData) {

    generateButton.disabled = true;

    generateButton.style.opacity = "0.5";

    generateButton.style.cursor =
      "not-allowed";

  } else {

    generateButton.disabled = false;

    generateButton.style.opacity = "1";

    generateButton.style.cursor =
      "pointer";
  }
}


// ======================================================
// GET NEXT ID
// ======================================================

async function setNextId() {

  if (!idInput) {
    return;
  }

  try {

    const snapshot =
      await getDocs(
        collection(
          db,
          COLLECTION_NAME
        )
      );

    let lastId = 0;

    snapshot.forEach(
      (firebaseDoc) => {

        const data =
          firebaseDoc.data();

        const currentId =
          Number(data.id);

        if (
          Number.isFinite(currentId) &&
          currentId > lastId
        ) {

          lastId =
            currentId;
        }
      }
    );

    idInput.value =
      lastId + 1;

  } catch (error) {

    console.error(error);

    alert(
      "حدث خطأ أثناء الحصول على الرقم التالي."
    );
  }
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

  updateGenerateButton();

  await setNextId();
}


// ======================================================
// INITIAL ID
// ======================================================

if (idInput) {
  setNextId();
}

updateGenerateButton();


// ======================================================
// CLEAR BUTTON
// ======================================================

if (clearButton) {

  clearButton.addEventListener(
    "click",
    async () => {

      await clearForm();

    }
  );
}


// ======================================================
// CHECK WORD IN FIREBASE
// ======================================================

async function findExactWord(word) {

  const snapshot =
    await getDocs(
      collection(
        db,
        COLLECTION_NAME
      )
    );

  const target =
    String(word)
      .trim()
      .toLowerCase();

  let result = null;

  snapshot.forEach(
    (firebaseDoc) => {

      const data =
        firebaseDoc.data();

      const databaseWord =
        String(
          data.word ?? ""
        )
        .trim()
        .toLowerCase();

      if (
        databaseWord === target
      ) {

        result = {

          data: data,

          documentId:
            firebaseDoc.id

        };
      }
    }
  );

  return result;
}


// ======================================================
// SEARCH
// ======================================================

if (
  searchInput &&
  searchButton
) {

  searchInput.focus();

  searchButton.addEventListener(
    "click",
    async () => {

      const searchText =
        searchInput.value
          .trim()
          .toLowerCase();


      if (!searchText) {

        alert(
          "اكتب كلمة للبحث أولاً."
        );

        return;
      }


      try {

        /*
         * إذا كان البحث جديدًا
         */

        if (
          searchText !==
          lastSearchText
        ) {

          const snapshot =
            await getDocs(
              collection(
                db,
                COLLECTION_NAME
              )
            );


          searchResults = [];


          /*
           * البحث في جميع الحقول
           */

          snapshot.forEach(
            (firebaseDoc) => {

              const data =
                firebaseDoc.data();


              const id =
                String(
                  data.id ?? ""
                ).toLowerCase();


              const word =
                String(
                  data.word ?? ""
                ).toLowerCase();


              const meaning =
                String(
                  data.meaning ?? ""
                ).toLowerCase();


              const synonyms =
                String(
                  data.synonyms ?? ""
                ).toLowerCase();


              const language =
                String(
                  data.language ?? ""
                ).toLowerCase();


              if (

                id.includes(searchText) ||

                word.includes(searchText) ||

                meaning.includes(searchText) ||

                synonyms.includes(searchText) ||

                language.includes(searchText)

              ) {

                searchResults.push({

                  data: data,

                  documentId:
                    firebaseDoc.id

                });

              }

            }
          );


          searchIndex = 0;

          lastSearchText =
            searchText;
        }


        /*
         * لو Firebase لقى نتيجة
         */

        if (
          searchResults.length > 0
        ) {

          const result =
            searchResults[
              searchIndex
            ];


          const foundData =
            result.data;


          selectedDocumentId =
            result.documentId;


          isExistingData = true;


          updateGenerateButton();


          if (idInput) {

            idInput.value =
              foundData.id ?? "";

          }


          if (wordInput) {

            wordInput.value =
              foundData.word ?? "";

          }


          if (meaningInput) {

            meaningInput.value =
              foundData.meaning ?? "";

          }


          if (synonymsInput) {

            synonymsInput.value =
              foundData.synonyms ?? "";

          }


          if (languageSelect) {

            languageSelect.value =
              foundData.language ?? "";

          }


          if (searchResult) {

            searchResult.textContent =
              "تم العثور على الكلمة.";

          }


          searchIndex++;


          if (
            searchIndex >=
            searchResults.length
          ) {

            searchIndex = 0;

          }


          return;
        }


        /*
         * لا توجد في Firebase
         * نبحث خارجيًا
         */

        await searchExternal(
          searchText
        );

      } catch (error) {

        console.error(
          "Search error:",
          error
        );

        if (searchResult) {
          searchResult.textContent = "";
        }

        alert(
          "لم نتمكن من الحصول على بيانات الكلمة."
        );
      }

    }
  );
}


// ======================================================
// SEARCH EXTERNAL
// ======================================================

async function searchExternal(word) {

  const url =
    GOOGLE_SCRIPT_URL +
    "?word=" +
    encodeURIComponent(word);


  const response =
    await fetch(url);


  if (!response.ok) {

    throw new Error(
      "Google Apps Script Error"
    );
  }


  const result =
    await response.json();


  if (!result.success) {

    throw new Error(
      result.message ||
      "Search failed"
    );
  }


  let data =
    result.data;


  /*
   * Google Apps Script قد يرجع
   * JSON كنص
   */

  if (
    typeof data === "string"
  ) {

    data =
      parseGeminiJSON(data);
  }


  if (
    !data ||
    typeof data !== "object"
  ) {

    throw new Error(
      "Invalid data"
    );
  }


  /*
   * الكلمة
   */

  if (wordInput) {

    wordInput.value =
      data.word || word;
  }


  /*
   * المعاني العربية المتعددة
   */

  if (meaningInput) {

    meaningInput.value =
      formatMeanings(
        data.meaningArabic
      );
  }


  /*
   * المرادفات الكثيرة
   */

  if (synonymsInput) {

    synonymsInput.value =
      formatSynonyms(
        data.synonyms
      );
  }


  /*
   * اللغة التي حددها Gemini
   */

  if (languageSelect) {

    setLanguage(
      data.language
    );
  }


  /*
   * البيانات جديدة
   */

  selectedDocumentId = null;

  isExistingData = false;

  updateGenerateButton();


  /*
   * ID الجديد
   */

  await setNextId();


  if (searchResult) {

    searchResult.textContent =
      "تم تجهيز البيانات للحفظ.";

  }

}


// ======================================================
// PARSE GEMINI JSON
// ======================================================

function parseGeminiJSON(text) {

  let clean =
    String(text)
      .trim();


  clean =
    clean.replace(
      /^```json\s*/i,
      ""
    );


  clean =
    clean.replace(
      /^```\s*/i,
      ""
    );


  clean =
    clean.replace(
      /```\s*$/i,
      ""
    );


  const first =
    clean.indexOf("{");


  const last =
    clean.lastIndexOf("}");


  if (
    first !== -1 &&
    last !== -1
  ) {

    clean =
      clean.substring(
        first,
        last + 1
      );
  }


  try {

    return JSON.parse(
      clean
    );

  } catch (error) {

    console.error(
      "Gemini JSON:",
      clean
    );

    throw new Error(
      "Invalid JSON"
    );
  }
}


// ======================================================
// FORMAT MEANINGS
// ======================================================

function formatMeanings(value) {

  if (
    Array.isArray(value)
  ) {

    return value
      .filter(
        item => item
      )
      .join("، ");

  }

  return String(
    value || ""
  );
}


// ======================================================
// FORMAT SYNONYMS
// ======================================================

function formatSynonyms(value) {

  if (
    Array.isArray(value)
  ) {

    return value
      .filter(
        item => item
      )
      .join(", ");

  }

  return String(
    value || ""
  );
}


// ======================================================
// SET LANGUAGE
// ======================================================

function setLanguage(language) {

  if (
    !language ||
    !languageSelect
  ) {

    return;
  }


  const value =
    String(language)
      .trim()
      .toLowerCase();


  /*
   * المطابقة المباشرة
   */

  for (
    let i = 0;
    i < languageSelect.options.length;
    i++
  ) {

    const option =
      languageSelect.options[i];

    const text =
      option.text
        .trim()
        .toLowerCase();


    if (
      text === value
    ) {

      languageSelect.selectedIndex =
        i;

      return;
    }
  }


  /*
   * English
   */

  if (
    value.includes("english") ||
    value.includes("إنجليزي") ||
    value.includes("الإنجليزية")
  ) {

    languageSelect.value =
      "الإنجليزية";

    return;
  }


  /*
   * Urdu
   */

  if (
    value.includes("urdu") ||
    value.includes("أردو") ||
    value.includes("الأردية")
  ) {

    languageSelect.value =
      "الأردية";

    return;
  }


  /*
   * Hindi
   */

  if (
    value.includes("hindi") ||
    value.includes("هندي") ||
    value.includes("الهندية")
  ) {

    languageSelect.value =
      "الهندية";

    return;
  }
}


// ======================================================
// REGISTER / SAVE
// ======================================================

if (registerButton) {

  registerButton.addEventListener(
    "click",
    async () => {

      /*
       * لا تسمح بحفظ نتيجة موجودة
       */

      if (isExistingData) {

        alert(
          "الكلمة موجودة بالفعل.\nاستخدم تحديث أو حذف."
        );

        return;
      }


      if (
        !wordInput ||
        !meaningInput
      ) {

        alert(
          "تعذر العثور على حقول البيانات."
        );

        return;
      }


      const word =
        wordInput.value.trim();


      const meaning =
        meaningInput.value.trim();


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
          "اكتب المعنى بالعربي."
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

        /*
         * منع التكرار
         */

        const existing =
          await findExactWord(
            word
          );


        if (existing) {

          alert(
            "الكلمة موجودة بالفعل في قاعدة البيانات."
          );

          selectedDocumentId =
            existing.documentId;

          isExistingData = true;

          updateGenerateButton();

          return;
        }


        /*
         * ID جديد
         */

        const newId =
          await getNextIdForSave();


        /*
         * الحفظ
         */

        await addDoc(
          collection(
            db,
            COLLECTION_NAME
          ),
          {

            id: newId,

            word: word,

            meaning: meaning,

            synonyms: synonyms,

            language: language

          }
        );


        /*
         * نجاح الحفظ
         */

        alert(
          "تم حفظ الكلمة بنجاح."
        );


        /*
         * مسح كل الحقول
         * ما عدا ID
         */

        wordInput.value = "";

        meaningInput.value = "";

        if (synonymsInput) {
          synonymsInput.value = "";
        }

        if (languageSelect) {
          languageSelect.selectedIndex = 0;
        }


        selectedDocumentId = null;

        isExistingData = false;


        /*
         * ID التالي
         */

        if (idInput) {

          idInput.value =
            newId + 1;

        }


        /*
         * تنظيف البحث
         */

        if (searchInput) {
          searchInput.value = "";
        }

        if (searchResult) {
          searchResult.textContent = "";
        }

        searchResults = [];

        searchIndex = 0;

        lastSearchText = "";


        updateGenerateButton();


      } catch (error) {

        console.error(
          "Save error:",
          error
        );

        alert(
          "حدث خطأ أثناء حفظ الكلمة."
        );
      }

    }
  );
}


// ======================================================
// GET NEXT ID FOR SAVE
// ======================================================

async function getNextIdForSave() {

  const snapshot =
    await getDocs(
      collection(
        db,
        COLLECTION_NAME
      )
    );


  let lastId = 0;


  snapshot.forEach(
    (firebaseDoc) => {

      const data =
        firebaseDoc.data();


      const currentId =
        Number(data.id);


      if (
        Number.isFinite(currentId) &&
        currentId > lastId
      ) {

        lastId =
          currentId;
      }

    }
  );


  return lastId + 1;
}


// ======================================================
// UPDATE
// ======================================================

if (updateButton) {

  updateButton.addEventListener(
    "click",
    async () => {

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
          "اكتب المعنى بالعربي."
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

        const wordDocument =
          doc(
            db,
            COLLECTION_NAME,
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
          "تم تحديث الكلمة بنجاح."
        );


        await clearForm();


      } catch (error) {

        console.error(error);

        alert(
          "حدث خطأ أثناء تحديث الكلمة."
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
    async () => {

      if (!selectedDocumentId) {

        alert(
          "ابحث عن كلمة موجودة أولاً."
        );

        return;
      }


      const confirmDelete =
        confirm(
          "هل أنت متأكد من حذف هذه الكلمة؟"
        );


      if (!confirmDelete) {
        return;
      }


      try {

        const wordDocument =
          doc(
            db,
            COLLECTION_NAME,
            selectedDocumentId
          );


        await deleteDoc(
          wordDocument
        );


        alert(
          "تم حذف الكلمة بنجاح."
        );


        await clearForm();


      } catch (error) {

        console.error(error);

        alert(
          "حدث خطأ أثناء حذف الكلمة."
        );
      }

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
    async () => {

      try {

        const snapshot =
          await getDocs(
            collection(
              db,
              COLLECTION_NAME
            )
          );


        /*
         * لا نغير طريقة عرض الجدول
         */

        dataTable.innerHTML =
          "";


        if (snapshot.empty) {

          alert(
            "لا توجد بيانات في قاعدة البيانات."
          );

          return;
        }


        const rows = [];


        snapshot.forEach(
          (firebaseDoc) => {

            rows.push(
              firebaseDoc.data()
            );

          }
        );


        /*
         * ترتيب ID
         */

        rows.sort(
          (a, b) =>
            Number(a.id) -
            Number(b.id)
        );


        /*
         * إنشاء الصفوف
         */

        rows.forEach(
          (data) => {

            const row =
              document.createElement("tr");


            const idCell =
              document.createElement("td");


            const wordCell =
              document.createElement("td");


            const meaningCell =
              document.createElement("td");


            const synonymsCell =
              document.createElement("td");


            const languageCell =
              document.createElement("td");


            idCell.textContent =
              data.id ?? "-";


            wordCell.textContent =
              data.word ?? "-";


            meaningCell.textContent =
              data.meaning ?? "-";


            synonymsCell.textContent =
              data.synonyms ?? "-";


            languageCell.textContent =
              data.language ?? "-";


            row.appendChild(
              idCell
            );


            row.appendChild(
              wordCell
            );


            row.appendChild(
              meaningCell
            );


            row.appendChild(
              synonymsCell
            );


            row.appendChild(
              languageCell
            );


            dataTable.appendChild(
              row
            );

          }
        );


      } catch (error) {

        console.error(error);

        alert(
          "حدث خطأ أثناء عرض البيانات."
        );
      }

    }
  );
}


// ======================================================
// START
// ======================================================

updateGenerateButton();