// ======================================================
// LANGDEX - SCRIPT.JS
// Firebase + Dictionary APIs
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
// FIREBASE CONFIG
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


const app =
  initializeApp(firebaseConfig);


const db =
  getFirestore(app);


// ======================================================
// COLLECTION
// ======================================================

const COLLECTION_NAME =
  "words";


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


// ======================================================
// DATA TABLE
// ======================================================

const showDataButton =
  document.querySelector(".show-data");

const dataTable =
  document.querySelector("#data-table");


// ======================================================
// STATE
// ======================================================

let selectedDocumentId = null;

let isExistingData = false;

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
// UNIQUE ARRAY
// ======================================================

function uniqueArray(array) {

  return [
    ...new Set(

      array
        .map(
          item =>
            String(item ?? "")
              .trim()
        )
        .filter(Boolean)

    )
  ];

}


// ======================================================
// SET LANGUAGE SELECT
// ======================================================

function setLanguage(language) {

  if (!languageSelect) {
    return;
  }


  const value =
    String(language ?? "")
      .trim()
      .toLowerCase();


  if (!value) {

    languageSelect.selectedIndex =
      0;

    return;

  }


  for (
    let i = 0;
    i < languageSelect.options.length;
    i++
  ) {

    const option =
      languageSelect.options[i];


    const text =
      normalize(option.text);


    const optionValue =
      normalize(option.value);


    if (

      text === value ||

      optionValue === value ||

      (
        value.includes("english") &&
        (
          text.includes("الإنجليزية") ||
          text.includes("انجليزية") ||
          text.includes("english")
        )
      ) ||

      (
        value.includes("urdu") &&
        (
          text.includes("الأردية") ||
          text.includes("اردية") ||
          text.includes("urdu")
        )
      ) ||

      (
        value.includes("hindi") &&
        (
          text.includes("الهندية") ||
          text.includes("هندية") ||
          text.includes("hindi")
        )
      ) ||

      (
        value.includes("arabic") &&
        (
          text.includes("العربية") ||
          text.includes("عربية") ||
          text.includes("arabic")
        )
      )

    ) {

      languageSelect.selectedIndex =
        i;

      return;

    }

  }


  // لو اللغة مش موجودة في القائمة
  // نحاول حسب اللغة المختصرة

  if (
    value === "en" ||
    value.startsWith("en-")
  ) {

    setLanguage("english");

    return;

  }


  if (
    value === "ur" ||
    value.startsWith("ur-")
  ) {

    setLanguage("urdu");

    return;

  }


  if (
    value === "hi" ||
    value.startsWith("hi-")
  ) {

    setLanguage("hindi");

    return;

  }


  if (
    value === "ar" ||
    value.startsWith("ar-")
  ) {

    setLanguage("arabic");

  }

}


// ======================================================
// GET LANGUAGE NAME
// ======================================================

function languageName(code) {

  const languages = {

    en: "الإنجليزية",

    ur: "الأردية",

    hi: "الهندية",

    ar: "العربية",

    fr: "الفرنسية",

    es: "الإسبانية",

    de: "الألمانية",

    it: "الإيطالية",

    tr: "التركية",

    fa: "الفارسية",

    ru: "الروسية",

    pt: "البرتغالية",

    bn: "البنغالية",

    id: "الإندونيسية",

    ms: "الملايوية"

  };


  return (
    languages[code] ||
    code ||
    "غير محددة"
  );

}


// ======================================================
// NEXT ID
// ======================================================

async function getNextId() {

  const snapshot =
    await getDocs(
      collection(
        db,
        COLLECTION_NAME
      )
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

        maxId =
          id;

      }

    }
  );


  return maxId + 1;

}


// ======================================================
// SET NEXT ID
// ======================================================

async function setNextId() {

  if (!idInput) {
    return;
  }


  try {

    idInput.value =
      await getNextId();

  } catch (error) {

    console.error(
      "ID ERROR:",
      error
    );

    idInput.value =
      "1";

  }

}


// ======================================================
// SEARCH FIREBASE
// ======================================================

async function findInFirebase(searchText) {

  const snapshot =
    await getDocs(
      collection(
        db,
        COLLECTION_NAME
      )
    );


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


      if (

        id.includes(target) ||

        word.includes(target) ||

        meaning.includes(target) ||

        synonyms.includes(target) ||

        language.includes(target)

      ) {

        results.push({

          documentId:
            firebaseDoc.id,

          ...data

        });

      }

    }
  );


  return results;

}


// ======================================================
// FILL FORM
// ======================================================

function fillForm(data) {

  selectedDocumentId =
    data.documentId ||
    null;


  isExistingData =
    Boolean(
      selectedDocumentId
    );


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

    setLanguage(
      data.language ?? ""
    );

  }


  updateGenerateButton();

}


// ======================================================
// GENERATE BUTTON STATE
// ======================================================

function updateGenerateButton() {

  if (!generateButton) {
    return;
  }


  generateButton.disabled =
    isExistingData;


  generateButton.style.opacity =
    isExistingData
      ? "0.5"
      : "1";


  generateButton.style.cursor =
    isExistingData
      ? "not-allowed"
      : "pointer";

}


// ======================================================
// DICTIONARY API
// English
// ======================================================

async function getEnglishDictionary(word) {

  const url =
    "https://api.dictionaryapi.dev/api/v2/entries/en/" +
    encodeURIComponent(word);


  const response =
    await fetch(url);


  if (!response.ok) {

    throw new Error(
      "English dictionary did not find the word."
    );

  }


  const data =
    await response.json();


  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {

    throw new Error(
      "No English dictionary result."
    );

  }


  const entry =
    data[0];


  const meanings = [];

  const synonyms = [];


  if (
    Array.isArray(entry.meanings)
  ) {

    entry.meanings.forEach(
      meaning => {

        if (
          Array.isArray(
            meaning.definitions
          )
        ) {

          meaning.definitions.forEach(
            definition => {

              if (
                definition.definition
              ) {

                meanings.push(
                  definition.definition
                );

              }


              if (
                Array.isArray(
                  definition.synonyms
                )
              ) {

                synonyms.push(
                  ...definition.synonyms
                );

              }

            }
          );

        }


        if (
          Array.isArray(
            meaning.synonyms
          )
        ) {

          synonyms.push(
            ...meaning.synonyms
          );

        }

      }
    );

  }


  return {

    word:
      entry.word ||
      word,

    language:
      "الإنجليزية",

    englishMeanings:
      uniqueArray(
        meanings
      ).slice(0, 12),

    synonyms:
      uniqueArray(
        synonyms
      ).slice(0, 12)

  };

}


// ======================================================
// DATAMUSE SYNONYMS
// ======================================================

async function getDatamuseSynonyms(word) {

  const url =
    "https://api.datamuse.com/words" +
    "?rel_syn=" +
    encodeURIComponent(word) +
    "&max=12";


  const response =
    await fetch(url);


  if (!response.ok) {

    return [];

  }


  const data =
    await response.json();


  if (!Array.isArray(data)) {

    return [];

  }


  return uniqueArray(

    data.map(
      item =>
        item.word
    )

  ).slice(0, 12);

}


// ======================================================
// GOOGLE TRANSLATE FALLBACK
// Detect language + Arabic translation
// ======================================================

async function translateToArabic(word) {

  const url =
    "https://translate.googleapis.com/translate_a/single" +

    "?client=gtx" +

    "&sl=auto" +

    "&tl=ar" +

    "&dt=t" +

    "&dt=ld" +

    "&q=" +
    encodeURIComponent(word);


  const response =
    await fetch(url);


  if (!response.ok) {

    throw new Error(
      "Translation service unavailable."
    );

  }


  const data =
    await response.json();


  let translation = "";

  let detectedLanguage = "";


  // ----------------------------------------------------
  // Translation
  // ----------------------------------------------------

  if (
    Array.isArray(data[0])
  ) {

    data[0].forEach(
      part => {

        if (
          Array.isArray(part) &&
          part[0]
        ) {

          translation +=
            part[0] + " ";

        }

      }
    );

  }


  // ----------------------------------------------------
  // Language
  // ----------------------------------------------------

  if (data[2]) {

    detectedLanguage =
      data[2];

  }


  if (
    !detectedLanguage &&
    data.ld_result &&
    data.ld_result.srclangs
  ) {

    detectedLanguage =
      data.ld_result.srclangs[0];

  }


  return {

    language:
      detectedLanguage,

    languageName:
      languageName(
        detectedLanguage
      ),

    arabic:
      translation.trim()

  };

}


// ======================================================
// GET EXTRA ARABIC MEANINGS
// ======================================================

async function getArabicMeaning(word) {

  try {

    const result =
      await translateToArabic(word);


    if (!result.arabic) {

      return {

        language:
          result.language,

        languageName:
          result.languageName,

        meanings: []

      };

    }


    return {

      language:
        result.language,

      languageName:
        result.languageName,

      meanings:
        [result.arabic]

    };

  } catch (error) {

    console.warn(
      "Arabic translation failed:",
      error
    );


    return {

      language: "",

      languageName:
        "غير محددة",

      meanings: []

    };

  }

}


// ======================================================
// MAIN EXTERNAL SEARCH
// ======================================================

async function searchExternalDictionary(word) {

  // ----------------------------------------------------
  // 1. Try English dictionary
  // ----------------------------------------------------

  try {

    const english =
      await getEnglishDictionary(
        word
      );


    let synonyms =
      english.synonyms;


    // --------------------------------------------------
    // Add Datamuse synonyms
    // --------------------------------------------------

    try {

      const datamuse =
        await getDatamuseSynonyms(
          word
        );


      synonyms =
        uniqueArray([
          ...synonyms,
          ...datamuse
        ]);

    } catch (error) {

      console.warn(
        "Datamuse failed:",
        error
      );

    }


    // --------------------------------------------------
    // Translate English definitions
    // --------------------------------------------------

    const arabicMeanings = [];


    for (
      const definition
      of english.englishMeanings.slice(0, 8)
    ) {

      try {

        const translated =
          await translateText(
            definition
          );


        if (translated) {

          arabicMeanings.push(
            translated
          );

        }

      } catch (error) {

        console.warn(
          "Definition translation failed:",
          error
        );

      }

    }


    return {

      word:
        english.word,

      language:
        "الإنجليزية",

      meanings:
        uniqueArray(
          arabicMeanings
        ),

      synonyms:
        uniqueArray(
          synonyms
        )

    };

  } catch (englishError) {

    console.log(
      "Not found in English dictionary."
    );

  }


  // ----------------------------------------------------
  // 2. Other languages
  // ----------------------------------------------------

  const translated =
    await getArabicMeaning(
      word
    );


  return {

    word:
      word,

    language:
      translated.languageName,

    languageCode:
      translated.language,

    meanings:
      translated.meanings,

    synonyms:
      []

  };

}


// ======================================================
// TRANSLATE TEXT TO ARABIC
// ======================================================

async function translateText(text) {

  const url =
    "https://translate.googleapis.com/translate_a/single" +

    "?client=gtx" +

    "&sl=auto" +

    "&tl=ar" +

    "&dt=t" +

    "&q=" +
    encodeURIComponent(text);


  const response =
    await fetch(url);


  if (!response.ok) {

    return "";

  }


  const data =
    await response.json();


  if (
    !Array.isArray(data[0])
  ) {

    return "";

  }


  let result = "";


  data[0].forEach(
    part => {

      if (
        Array.isArray(part) &&
        part[0]
      ) {

        result +=
          part[0] + " ";

      }

    }
  );


  return result.trim();

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
    async function() {

      const text =
        searchInput.value.trim();


      if (!text) {

        alert(
          "اكتب كلمة للبحث أولاً."
        );

        return;

      }


      try {

        // ----------------------------------------------
        // Firebase first
        // ----------------------------------------------

        if (
          text !== lastSearchText
        ) {

          searchResults =
            await findInFirebase(
              text
            );

          searchIndex =
            0;

          lastSearchText =
            text;

        }


        // ----------------------------------------------
        // Firebase results
        // ----------------------------------------------

        if (
          searchResults.length > 0
        ) {

          const result =
            searchResults[
              searchIndex
            ];


          fillForm(result);


          searchIndex++;


          if (
            searchIndex >=
            searchResults.length
          ) {

            searchIndex = 0;

          }


          return;

        }


        // ----------------------------------------------
        // External dictionaries
        // ----------------------------------------------

        const result =
          await searchExternalDictionary(
            text
          );


        // ----------------------------------------------
        // Put external result
        // into form
        // ----------------------------------------------

        if (wordInput) {

          wordInput.value =
            result.word ||
            text;

        }


        if (meaningInput) {

          meaningInput.value =
            result.meanings.join(
              " — "
            );

        }


        if (synonymsInput) {

          synonymsInput.value =
            result.synonyms.join(
              ", "
            );

        }


        if (languageSelect) {

          setLanguage(
            result.language
          );

        }


        // New data
        selectedDocumentId =
          null;

        isExistingData =
          false;


        await setNextId();


        updateGenerateButton();


      } catch (error) {

        console.error(
          "SEARCH ERROR:",
          error
        );


        alert(
          "لم نتمكن من الحصول على الكلمة."
        );

      }

    }
  );

}


// ======================================================
// ENTER SEARCH
// ======================================================

if (searchInput) {

  searchInput.addEventListener(
    "keydown",
    function(event) {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        if (searchButton) {

          searchButton.click();

        }

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
    async function() {

      // ------------------------------------------------
      // Existing data
      // ------------------------------------------------

      if (isExistingData) {

        alert(
          "الكلمة موجودة بالفعل. استخدم تحديث أو حذف."
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
          "لم يتم العثور على معنى للكلمة."
        );

        return;

      }


      try {

        // ----------------------------------------------
        // Duplicate check
        // ----------------------------------------------

        const existing =
          await findInFirebase(
            word
          );


        const exact =
          existing.find(
            item =>
              normalize(
                item.word
              ) ===
              normalize(word)
          );


        if (exact) {

          alert(
            "الكلمة موجودة بالفعل."
          );

          fillForm(exact);

          return;

        }


        // ----------------------------------------------
        // New ID
        // ----------------------------------------------

        const newId =
          await getNextId();


        // ----------------------------------------------
        // Save
        // ----------------------------------------------

        await addDoc(

          collection(
            db,
            COLLECTION_NAME
          ),

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
          "تم حفظ الكلمة بنجاح."
        );


        // ----------------------------------------------
        // CLEAR EVERYTHING
        // EXCEPT ID
        // ----------------------------------------------

        selectedDocumentId =
          null;

        isExistingData =
          false;


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


        if (languageSelect) {

          languageSelect.selectedIndex =
            0;

        }


        if (searchInput) {

          searchInput.value =
            "";

        }


        searchResults =
          [];

        searchIndex =
          0;

        lastSearchText =
          "";


        // ID = last ID + 1

        if (idInput) {

          idInput.value =
            newId + 1;

        }


        selectedDocumentId =
          null;

        isExistingData =
          false;


        updateGenerateButton();

      } catch (error) {

        console.error(
          "SAVE ERROR:",
          error
        );


        alert(
          "حدث خطأ أثناء حفظ البيانات."
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
    async function() {

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


      if (!word || !meaning) {

        alert(
          "أكمل الكلمة والمعنى."
        );

        return;

      }


      try {

        await updateDoc(

          doc(
            db,
            COLLECTION_NAME,
            selectedDocumentId
          ),

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


        // Clear all except next ID

        selectedDocumentId =
          null;

        isExistingData =
          false;


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


        if (languageSelect) {

          languageSelect.selectedIndex =
            0;

        }


        searchResults =
          [];

        searchIndex =
          0;

        lastSearchText =
          "";


        await setNextId();


        updateGenerateButton();

      } catch (error) {

        console.error(
          "UPDATE ERROR:",
          error
        );


        alert(
          "حدث خطأ أثناء تحديث البيانات."
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
    async function() {

      if (!selectedDocumentId) {

        alert(
          "ابحث عن كلمة موجودة أولاً."
        );

        return;

      }


      const confirmed =
        confirm(
          "هل أنت متأكد من حذف الكلمة؟"
        );


      if (!confirmed) {
        return;
      }


      try {

        await deleteDoc(

          doc(
            db,
            COLLECTION_NAME,
            selectedDocumentId
          )

        );


        alert(
          "تم حذف الكلمة بنجاح."
        );


        await clearForm();

      } catch (error) {

        console.error(
          "DELETE ERROR:",
          error
        );


        alert(
          "حدث خطأ أثناء حذف البيانات."
        );

      }

    }
  );

}


// ======================================================
// CLEAR
// ======================================================

async function clearForm() {

  selectedDocumentId =
    null;

  isExistingData =
    false;


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


  if (languageSelect) {

    languageSelect.selectedIndex =
      0;

  }


  if (searchInput) {

    searchInput.value =
      "";

  }


  searchResults =
    [];

  searchIndex =
    0;

  lastSearchText =
    "";


  updateGenerateButton();


  await setNextId();

}


// ======================================================
// CLEAR BUTTON
// ======================================================

if (clearButton) {

  clearButton.addEventListener(
    "click",
    clearForm
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
    async function() {

      try {

        const snapshot =
          await getDocs(
            collection(
              db,
              COLLECTION_NAME
            )
          );


        dataTable.innerHTML =
          "";


        if (snapshot.empty) {

          alert(
            "لا توجد بيانات."
          );

          return;

        }


        const rows = [];


        snapshot.forEach(
          firebaseDoc => {

            rows.push({

              data:
                firebaseDoc.data(),

              documentId:
                firebaseDoc.id

            });

          }
        );


        // ------------------------------------------------
        // SORT BY ID
        // ------------------------------------------------

        rows.sort(
          (a, b) => {

            return (
              Number(
                a.data.id
              ) -
              Number(
                b.data.id
              )
            );

          }
        );


        // ------------------------------------------------
        // CREATE ROWS
        // ------------------------------------------------

        rows.forEach(
          item => {

            const data =
              item.data;


            const row =
              document.createElement(
                "tr"
              );


            const values = [

              data.id ?? "-",

              data.word ?? "-",

              data.meaning ?? "-",

              data.synonyms ?? "-",

              data.language ?? "-"

            ];


            values.forEach(
              value => {

                const cell =
                  document.createElement(
                    "td"
                  );


                cell.textContent =
                  value === ""
                    ? "-"
                    : String(value);


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

      } catch (error) {

        console.error(
          "SHOW DATA ERROR:",
          error
        );


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

setNextId();

updateGenerateButton();