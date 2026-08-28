// ======================================================
// LANGDEX - FIREBASE + WIKTIONARY
// ======================================================

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc
} from
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// ======================================================
// FIREBASE CONFIG
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


const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const WORDS_COLLECTION = "words";


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
// STATE
// ======================================================

let selectedDocumentId = null;

let isExistingData = false;

let searchResults = [];

let searchIndex = 0;

let lastSearchText = "";


// ======================================================
// HELPERS
// ======================================================

function normalize(value) {

  return String(value ?? "")
    .trim()
    .toLowerCase();

}


function cleanText(value) {

  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

}


function uniqueValues(array) {

  return [
    ...new Set(
      array
        .map(cleanText)
        .filter(Boolean)
    )
  ];

}


// ======================================================
// NEXT ID
// ======================================================

async function getNextId() {

  try {

    const snapshot =
      await getDocs(
        collection(
          db,
          WORDS_COLLECTION
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

          maxId = id;

        }

      }
    );


    return maxId + 1;


  } catch (error) {

    console.error(
      "NEXT ID ERROR:",
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

  selectedDocumentId =
    null;

  isExistingData =
    false;

  searchResults = [];

  searchIndex = 0;

  lastSearchText = "";


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


  if (searchResult) {

    searchResult.textContent =
      "";

  }


  await setNextId();

}


// ======================================================
// PUT FIREBASE DATA INTO FORM
// ======================================================

function fillForm(data, documentId) {

  selectedDocumentId =
    documentId || null;

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

}


// ======================================================
// SET LANGUAGE
// ======================================================

function setLanguage(language) {

  if (!languageSelect) {
    return;
  }


  const target =
    normalize(language);


  for (
    let i = 0;
    i < languageSelect.options.length;
    i++
  ) {

    const option =
      languageSelect.options[i];

    if (
      normalize(option.value) ===
      target ||

      normalize(option.text) ===
      target
    ) {

      languageSelect.selectedIndex =
        i;

      return;

    }

  }


  // ----------------------------------------
  // Common language names
  // ----------------------------------------

  if (
    target.includes("english") ||
    target.includes("إنجليزي") ||
    target.includes("انجليزي")
  ) {

    selectLanguageByName(
      "English"
    );

    return;

  }


  if (
    target.includes("urdu") ||
    target.includes("أردو") ||
    target.includes("اردو")
  ) {

    selectLanguageByName(
      "Urdu"
    );

    return;

  }


  if (
    target.includes("hindi") ||
    target.includes("هندي") ||
    target.includes("هندى")
  ) {

    selectLanguageByName(
      "Hindi"
    );

  }

}


function selectLanguageByName(name) {

  if (!languageSelect) {
    return;
  }


  const target =
    normalize(name);


  for (
    let i = 0;
    i < languageSelect.options.length;
    i++
  ) {

    if (
      normalize(
        languageSelect.options[i].text
      ) === target
    ) {

      languageSelect.selectedIndex =
        i;

      return;

    }

  }

}


// ======================================================
// FIREBASE SEARCH
// ======================================================

async function searchFirebase(text) {

  const snapshot =
    await getDocs(
      collection(
        db,
        WORDS_COLLECTION
      )
    );


  const target =
    normalize(text);


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

          data:
            data

        });

      }

    }
  );


  return results;

}


// ======================================================
// WIKTIONARY
// ======================================================

async function searchWiktionary(word) {

  const encoded =
    encodeURIComponent(word.trim());


  // ----------------------------------------------------
  // English Wiktionary structured definition endpoint
  // ----------------------------------------------------

  const url =
    "https://en.wiktionary.org/api/rest_v1/page/definition/" +
    encoded;


  const response =
    await fetch(url);


  if (!response.ok) {

    throw new Error(
      "Wiktionary لم يجد الكلمة."
    );

  }


  const json =
    await response.json();


  return parseWiktionaryResult(
    json,
    word
  );

}


// ======================================================
// PARSE WIKTIONARY RESULT
// ======================================================

function parseWiktionaryResult(data, originalWord) {

  const meanings = [];

  const synonyms = [];

  let detectedLanguage =
    "";


  /*
   * Wiktionary structured endpoint
   * عادةً يكون التنظيم:
   *
   * language
   *   partOfSpeech
   *      definitions
   */


  if (
    !data ||
    typeof data !== "object"
  ) {

    throw new Error(
      "بيانات Wiktionary غير صالحة."
    );

  }


  // ----------------------------------------------------
  // Loop languages
  // ----------------------------------------------------

  Object.keys(data).forEach(
    languageKey => {

      const languageData =
        data[languageKey];


      if (
        !Array.isArray(languageData)
      ) {
        return;
      }


      // Detect language
      if (!detectedLanguage) {

        detectedLanguage =
          convertLanguageCode(
            languageKey
          );

      }


      languageData.forEach(
        part => {

          if (!part) {
            return;
          }


          // --------------------------------------------
          // Definitions
          // --------------------------------------------

          if (
            Array.isArray(
              part.definitions
            )
          ) {

            part.definitions.forEach(
              definition => {

                if (
                  typeof definition ===
                  "string"
                ) {

                  meanings.push(
                    cleanDefinition(
                      definition
                    )
                  );

                }

                else if (
                  definition &&
                  definition.definition
                ) {

                  meanings.push(
                    cleanDefinition(
                      definition.definition
                    )
                  );

                }

              }
            );

          }


          // --------------------------------------------
          // Synonyms
          // --------------------------------------------

          if (
            Array.isArray(
              part.synonyms
            )
          ) {

            part.synonyms.forEach(
              synonym => {

                if (
                  typeof synonym ===
                  "string"
                ) {

                  synonyms.push(
                    cleanSynonym(
                      synonym
                    )
                  );

                }

                else if (
                  synonym &&
                  synonym.word
                ) {

                  synonyms.push(
                    cleanSynonym(
                      synonym.word
                    )
                  );

                }

              }
            );

          }

        }
      );

    }
  );


  const finalMeanings =
    uniqueValues(
      meanings
    ).slice(0, 8);


  const finalSynonyms =
    uniqueValues(
      synonyms
    ).slice(0, 12);


  /*
   * لو مفيش نتائج واضحة
   */

  if (
    finalMeanings.length === 0
  ) {

    throw new Error(
      "تم العثور على الصفحة ولكن لم يتم العثور على معاني واضحة."
    );

  }


  /*
   * Wiktionary English endpoint
   * قد يرجع اللغة المصدر كـ en.
   */

  if (!detectedLanguage) {

    detectedLanguage =
      "English";

  }


  return {

    word:
      originalWord,

    language:
      detectedLanguage,

    meaningArabic:
      finalMeanings,

    synonyms:
      finalSynonyms

  };

}


// ======================================================
// CLEAN DEFINITION
// ======================================================

function cleanDefinition(value) {

  let text =
    cleanText(value);


  // Remove wiki markup
  text =
    text.replace(
      /\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g,
      "$2"
    );


  // Remove templates
  text =
    text.replace(
      /\{\{[^{}]*\}\}/g,
      ""
    );


  // Remove HTML
  text =
    text.replace(
      /<[^>]*>/g,
      ""
    );


  // Remove leading numbering
  text =
    text.replace(
      /^\s*\d+[\.\)]\s*/,
      ""
    );


  return cleanText(
    text
  );

}


// ======================================================
// CLEAN SYNONYM
// ======================================================

function cleanSynonym(value) {

  let text =
    cleanText(value);


  text =
    text.replace(
      /\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g,
      "$2"
    );


  text =
    text.replace(
      /\{\{[^{}]*\}\}/g,
      ""
    );


  text =
    text.replace(
      /<[^>]*>/g,
      ""
    );


  return cleanText(
    text
  );

}


// ======================================================
// LANGUAGE CODE
// ======================================================

function convertLanguageCode(code) {

  const map = {

    en: "English",

    ur: "Urdu",

    hi: "Hindi",

    ar: "Arabic",

    fr: "French",

    de: "German",

    es: "Spanish",

    it: "Italian",

    tr: "Turkish",

    fa: "Persian",

    ru: "Russian",

    bn: "Bengali",

    zh: "Chinese",

    ja: "Japanese"

  };


  return (
    map[code] ||
    code ||
    "Unknown"
  );

}


// ======================================================
// SEARCH
// ======================================================

if (
  searchInput &&
  searchButton
) {

  searchButton.addEventListener(
    "click",
    async function () {

      const searchText =
        searchInput.value.trim();


      if (!searchText) {

        alert(
          "Please enter something to search."
        );

        return;

      }


      try {

        // ==================================================
        // FIREBASE FIRST
        // ==================================================

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


        // ==================================================
        // FIREBASE RESULTS
        // ==================================================

        if (
          searchResults.length > 0
        ) {

          const result =
            searchResults[
              searchIndex
            ];


          fillForm(
            result.data,
            result.documentId
          );


          searchIndex++;


          if (
            searchIndex >=
            searchResults.length
          ) {

            searchIndex = 0;

          }


          if (searchResult) {

            searchResult.textContent =
              "";

          }


          return;

        }


        // ==================================================
        // NOT IN FIREBASE
        // SEARCH WIKTIONARY
        // ==================================================

        const externalData =
          await searchWiktionary(
            searchText
          );


        // --------------------------------------------------
        // Put external data in form
        // --------------------------------------------------

        if (wordInput) {

          wordInput.value =
            externalData.word;

        }


        if (meaningInput) {

          /*
           * Wiktionary definitions غالباً باللغة
           * المصدر، لذلك نحافظ عليها بدل ما ندعي
           * أنها ترجمة عربية.
           */

          meaningInput.value =
            externalData
              .meaningArabic
              .join(" • ");

        }


        if (synonymsInput) {

          synonymsInput.value =
            externalData
              .synonyms
              .join(", ");

        }


        setLanguage(
          externalData.language
        );


        selectedDocumentId =
          null;

        isExistingData =
          false;


        /*
         * ID جديد
         */

        await setNextId();


        if (searchResult) {

          searchResult.textContent =
            "";

        }


      } catch (error) {

        console.error(
          "SEARCH ERROR:",
          error
        );


        if (searchResult) {

          searchResult.textContent =
            "";

        }


        alert(
          "لم نتمكن من الحصول على الكلمة."
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

      if (!wordInput || !meaningInput) {

        alert(
          "Form elements were not found."
        );

        return;

      }


      if (isExistingData) {

        alert(
          "This word already exists.\nUse Update or Delete."
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
          "Please enter a word."
        );

        return;

      }


      if (!meaning) {

        alert(
          "Please enter a meaning."
        );

        return;

      }


      if (!language) {

        alert(
          "Please choose a language."
        );

        return;

      }


      try {

        // ----------------------------------------------
        // Check duplicate
        // ----------------------------------------------

        const existing =
          await searchFirebase(
            word
          );


        const exact =
          existing.find(
            item =>
              normalize(
                item.data.word
              ) === normalize(word)
          );


        if (exact) {

          alert(
            `This word already exists with ID ${exact.data.id}.`
          );

          fillForm(
            exact.data,
            exact.documentId
          );

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
            WORDS_COLLECTION
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
          "Data registered successfully!"
        );


        // ----------------------------------------------
        // Clear everything except ID
        // ----------------------------------------------

        selectedDocumentId =
          null;

        isExistingData =
          false;

        searchResults =
          [];

        searchIndex =
          0;

        lastSearchText =
          "";


        wordInput.value =
          "";

        meaningInput.value =
          "";

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


        if (searchResult) {

          searchResult.textContent =
            "";

        }


        // new ID = old ID + 1
        if (idInput) {

          idInput.value =
            newId + 1;

        }


      } catch (error) {

        console.error(
          "REGISTER ERROR:",
          error
        );


        alert(
          "Error saving data: " +
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
          "Please search for a word first."
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
          "Please fill in WORD and MEANING."
        );

        return;

      }


      if (!language) {

        alert(
          "Please choose a language."
        );

        return;

      }


      try {

        const reference =
          doc(
            db,
            WORDS_COLLECTION,
            selectedDocumentId
          );


        await updateDoc(
          reference,
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
          "Data updated successfully!"
        );


        await clearForm();


      } catch (error) {

        console.error(
          "UPDATE ERROR:",
          error
        );


        alert(
          "Error updating data: " +
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
    async function () {

      if (!selectedDocumentId) {

        alert(
          "Please search for a word first."
        );

        return;

      }


      const confirmed =
        confirm(
          "Are you sure you want to delete this word?"
        );


      if (!confirmed) {
        return;
      }


      try {

        await deleteDoc(
          doc(
            db,
            WORDS_COLLECTION,
            selectedDocumentId
          )
        );


        alert(
          "Data deleted successfully!"
        );


        await clearForm();


      } catch (error) {

        console.error(
          "DELETE ERROR:",
          error
        );


        alert(
          "Error deleting data: " +
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
    async function () {

      await clearForm();

    }
  );

}


// ======================================================
// ENTER SEARCH
// ======================================================

if (searchInput) {

  searchInput.addEventListener(
    "keydown",
    function (event) {

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
            collection(
              db,
              WORDS_COLLECTION
            )
          );


        // ----------------------------------------------
        // Clear old rows
        // ----------------------------------------------

        dataTable.innerHTML =
          "";


        if (snapshot.empty) {

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


        // ----------------------------------------------
        // Sort by ID
        // ----------------------------------------------

        rows.sort(
          (a, b) =>
            Number(a.data.id || 0) -
            Number(b.data.id || 0)
        );


        // ----------------------------------------------
        // Render
        // ----------------------------------------------

        rows.forEach(
          item => {

            const data =
              item.data;


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
                  value === undefined ||
                  value === null ||
                  String(value).trim() === ""
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
          "Error loading data: " +
          error.message
        );

      }

    }
  );

}


// ======================================================
// START
// ======================================================

setNextId();