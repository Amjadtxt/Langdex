// ======================================================
// LANGDEX - FIREBASE + WIKTAPI
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
// FIRESTORE
// ======================================================

const COLLECTION_NAME = "words";


// ======================================================
// WIKTAPI
// ======================================================

// No API key required
const WIKTAPI_BASE = "https://api.wiktapi.dev/v1";


// ======================================================
// FORM
// ======================================================

const form = document.querySelector(".form");

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
// VARIABLES
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
// CLEAN TEXT
// ======================================================

function cleanText(value) {

  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/\[\[|\]\]/g, "")
    .replace(/\{\{|\}\}/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

}


// ======================================================
// UNIQUE ARRAY
// ======================================================

function uniqueArray(array) {

  const result = [];

  const seen =
    new Set();

  for (const item of array) {

    const value =
      cleanText(item);

    if (!value) {
      continue;
    }

    const key =
      normalize(value);

    if (!seen.has(key)) {

      seen.add(key);

      result.push(value);

    }

  }

  return result;
}


// ======================================================
// LANGUAGE SELECT
// ======================================================

function setLanguage(language) {

  if (!languageSelect) {
    return;
  }

  const target =
    normalize(language);

  let found = false;

  for (
    let i = 0;
    i < languageSelect.options.length;
    i++
  ) {

    const option =
      languageSelect.options[i];

    const text =
      normalize(option.text);

    const value =
      normalize(option.value);

    if (
      text === target ||
      value === target
    ) {

      languageSelect.selectedIndex = i;

      found = true;

      break;
    }

  }


  if (found) {
    return;
  }


  // Handle Arabic / English language names

  if (
    target.includes("english") ||
    target.includes("إنجليزي") ||
    target.includes("الإنجليزية")
  ) {

    selectLanguageByName("English");

  }

  else if (
    target.includes("urdu") ||
    target.includes("أردي") ||
    target.includes("الأردية")
  ) {

    selectLanguageByName("Urdu");

  }

  else if (
    target.includes("hindi") ||
    target.includes("هندي") ||
    target.includes("الهندية")
  ) {

    selectLanguageByName("Hindi");

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

    const option =
      languageSelect.options[i];

    if (
      normalize(option.text) === target ||
      normalize(option.value) === target
    ) {

      languageSelect.selectedIndex = i;

      return;

    }

  }

}


// ======================================================
// GET NEXT ID
// ======================================================

async function getNextId() {

  try {

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

          maxId = id;

        }

      }
    );

    return maxId + 1;

  }

  catch (error) {

    console.error(
      "getNextId error:",
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
// FIND WORD IN FIREBASE
// ======================================================

async function findWordInFirebase(word) {

  const snapshot =
    await getDocs(
      collection(
        db,
        COLLECTION_NAME
      )
    );

  const target =
    normalize(word);

  const results = [];

  snapshot.forEach(
    firebaseDoc => {

      const data =
        firebaseDoc.data();

      if (
        normalize(data.word) ===
        target
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
// PUT FIREBASE DATA IN FORM
// ======================================================

function fillFirebaseForm(result) {

  const data =
    result.data;

  selectedDocumentId =
    result.documentId;

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

    setLanguage(
      data.language ?? ""
    );

  }

}


// ======================================================
// WIKTAPI REQUEST
// ======================================================

async function wiktApiRequest(
  word,
  languageCode
) {

  const url =
    WIKTAPI_BASE +
    "/ar/word/" +
    encodeURIComponent(word) +
    "?lang=" +
    encodeURIComponent(languageCode);


  const response =
    await fetch(
      url,
      {
        method: "GET"
      }
    );


  if (!response.ok) {

    return null;

  }


  const data =
    await response.json();


  if (
    !data ||
    !Array.isArray(data.entries) ||
    data.entries.length === 0
  ) {

    return null;

  }


  return data;

}


// ======================================================
// GET ENTRIES FROM WIKTAPI
// ======================================================

function getUsefulEntries(data) {

  if (
    !data ||
    !Array.isArray(data.entries)
  ) {

    return [];

  }


  return data.entries.filter(
    entry => {

      return (
        entry &&
        Array.isArray(entry.senses)
      );

    }
  );

}


// ======================================================
// EXTRACT ARABIC MEANINGS
// ======================================================

function extractMeanings(data) {

  const entries =
    getUsefulEntries(data);

  const meanings = [];


  for (const entry of entries) {

    if (
      !Array.isArray(entry.senses)
    ) {
      continue;
    }


    for (
      const sense of entry.senses
    ) {

      if (
        !sense ||
        !Array.isArray(sense.glosses)
      ) {

        continue;

      }


      for (
        const gloss of sense.glosses
      ) {

        const text =
          cleanText(gloss);

        if (text) {

          meanings.push(text);

        }

      }

    }

  }


  return uniqueArray(meanings);

}


// ======================================================
// EXTRACT SYNONYMS
// ======================================================

function extractSynonyms(data) {

  const entries =
    getUsefulEntries(data);

  const synonyms = [];


  for (const entry of entries) {

    // Some WiktAPI entries can contain synonyms

    if (
      Array.isArray(entry.synonyms)
    ) {

      for (
        const synonym of entry.synonyms
      ) {

        if (
          typeof synonym === "string"
        ) {

          synonyms.push(
            synonym
          );

        }

        else if (
          synonym &&
          synonym.word
        ) {

          synonyms.push(
            synonym.word
          );

        }

      }

    }


    // Also inspect senses

    if (
      !Array.isArray(entry.senses)
    ) {
      continue;
    }


    for (
      const sense of entry.senses
    ) {

      if (
        !sense
      ) {
        continue;
      }


      if (
        Array.isArray(
          sense.synonyms
        )
      ) {

        for (
          const synonym of
          sense.synonyms
        ) {

          if (
            typeof synonym === "string"
          ) {

            synonyms.push(
              synonym
            );

          }

          else if (
            synonym &&
            synonym.word
          ) {

            synonyms.push(
              synonym.word
            );

          }

        }

      }

    }

  }


  return uniqueArray(
    synonyms
  );

}


// ======================================================
// DETECT LANGUAGE
// ======================================================

async function detectLanguage(word) {

  // We query the Arabic edition because
  // we want Arabic definitions.

  const languages = [

    {
      code: "en",
      name: "English"
    },

    {
      code: "ur",
      name: "Urdu"
    },

    {
      code: "hi",
      name: "Hindi"
    }

  ];


  // Query all three at once

  const requests =
    languages.map(
      async language => {

        try {

          const data =
            await wiktApiRequest(
              word,
              language.code
            );

          return {

            language:
              language,

            data:
              data

          };

        }

        catch (error) {

          console.error(
            "WiktAPI language error:",
            language.code,
            error
          );

          return {

            language:
              language,

            data:
              null

          };

        }

      }
    );


  const results =
    await Promise.all(
      requests
    );


  // Find first language with entries

  for (
    const result of results
  ) {

    if (
      result.data &&
      Array.isArray(
        result.data.entries
      ) &&
      result.data.entries.length > 0
    ) {

      return result;

    }

  }


  return null;

}


// ======================================================
// SEARCH WIKTAPI
// ======================================================

async function searchWiktAPI(word) {

  const detected =
    await detectLanguage(word);


  if (!detected) {

    throw new Error(
      "لم نتمكن من العثور على الكلمة في القاموس."
    );

  }


  const language =
    detected.language;

  const data =
    detected.data;


  let meanings =
    extractMeanings(data);


  let synonyms =
    extractSynonyms(data);


  // If Arabic definitions are unavailable,
  // use the English Wiktionary edition
  // as a fallback for the word itself.

  if (meanings.length === 0) {

    try {

      const fallbackUrl =
        WIKTAPI_BASE +
        "/en/word/" +
        encodeURIComponent(word) +
        "?lang=" +
        encodeURIComponent(
          language.code
        );


      const response =
        await fetch(
          fallbackUrl
        );


      if (response.ok) {

        const fallbackData =
          await response.json();

        const fallbackEntries =
          getUsefulEntries(
            fallbackData
          );


        const fallbackMeanings = [];


        for (
          const entry of fallbackEntries
        ) {

          if (
            !Array.isArray(
              entry.senses
            )
          ) {
            continue;
          }


          for (
            const sense of
            entry.senses
          ) {

            if (
              !sense ||
              !Array.isArray(
                sense.glosses
              )
            ) {
              continue;
            }


            for (
              const gloss of
              sense.glosses
            ) {

              const value =
                cleanText(gloss);

              if (value) {

                fallbackMeanings.push(
                  value
                );

              }

            }

          }

        }


        meanings =
          uniqueArray(
            fallbackMeanings
          );

      }

    }

    catch (error) {

      console.error(
        "WiktAPI fallback error:",
        error
      );

    }

  }


  // Limit the displayed amount

  meanings =
    meanings.slice(
      0,
      10
    );


  synonyms =
    synonyms.slice(
      0,
      10
    );


  return {

    word:
      word,

    language:
      language.name,

    languageCode:
      language.code,

    meaningArabic:
      meanings,

    synonyms:
      synonyms

  };

}


// ======================================================
// PUT WIKTAPI DATA IN FORM
// ======================================================

async function fillWiktForm(word) {

  const data =
    await searchWiktAPI(word);


  if (!data) {

    throw new Error(
      "لم يتم العثور على الكلمة."
    );

  }


  if (wordInput) {

    wordInput.value =
      data.word;

  }


  if (meaningInput) {

    meaningInput.value =
      data.meaningArabic.join(
        " | "
      );

  }


  if (synonymsInput) {

    synonymsInput.value =
      data.synonyms.join(
        ", "
      );

  }


  setLanguage(
    data.language
  );


  selectedDocumentId =
    null;

  isExistingData =
    false;


  await setNextId();

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
    async () => {

      const searchText =
        searchInput.value.trim();


      if (!searchText) {

        alert(
          "Please enter something to search."
        );

        return;

      }


      try {

        // =================================================
        // FIRST: SEARCH FIREBASE
        // =================================================

        const firebaseResults =
          await findWordInFirebase(
            searchText
          );


        if (
          firebaseResults.length > 0
        ) {

          searchResults =
            firebaseResults;

          searchIndex = 0;

          lastSearchText =
            normalize(searchText);


          fillFirebaseForm(
            firebaseResults[0]
          );


          if (searchResult) {

            searchResult.textContent =
              "";

          }


          return;

        }


        // =================================================
        // SECOND: WIKTAPI
        // =================================================

        await fillWiktForm(
          searchText
        );


        if (searchResult) {

          searchResult.textContent =
            "";

        }


      }

      catch (error) {

        console.error(
          "Search error:",
          error
        );


        if (searchResult) {

          searchResult.textContent =
            "";

        }


        alert(
          error.message ||
          "لم نتمكن من العثور على الكلمة."
        );

      }

    }
  );


  // =====================================================
  // ENTER SEARCH
  // =====================================================

  searchInput.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        searchButton.click();

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
    async () => {

      // -----------------------------------------------
      // DO NOT REGISTER EXISTING WORD
      // -----------------------------------------------

      if (isExistingData) {

        alert(
          "This word already exists.\n\nUse UPDATE or DELETE."
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
          "Please enter the word."
        );

        return;

      }


      if (!meaning) {

        alert(
          "Please enter the meaning."
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

        // ---------------------------------------------
        // CHECK DUPLICATE
        // ---------------------------------------------

        const existing =
          await findWordInFirebase(
            word
          );


        if (
          existing.length > 0
        ) {

          alert(
            "This word already exists.\nID: " +
            existing[0].data.id
          );


          fillFirebaseForm(
            existing[0]
          );

          return;

        }


        // ---------------------------------------------
        // GET NEXT ID
        // ---------------------------------------------

        const newId =
          await getNextId();


        // ---------------------------------------------
        // SAVE
        // ---------------------------------------------

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


        // ---------------------------------------------
        // CLEAR EVERYTHING EXCEPT ID
        // ---------------------------------------------

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


        // ID becomes last ID + 1

        if (idInput) {

          idInput.value =
            newId + 1;

        }


        alert(
          "Data registered successfully!"
        );

      }

      catch (error) {

        console.error(
          "Register error:",
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
    async () => {

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


      try {

        const reference =
          doc(
            db,
            COLLECTION_NAME,
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


        // Clear everything except next ID

        await clearForm();

      }

      catch (error) {

        console.error(
          "Update error:",
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
    async () => {

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
            COLLECTION_NAME,
            selectedDocumentId
          )
        );


        alert(
          "Data deleted successfully!"
        );


        await clearForm();

      }

      catch (error) {

        console.error(
          "Delete error:",
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
// CLEAR
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


        // Clear table body

        dataTable.innerHTML =
          "";


        if (snapshot.empty) {

          alert(
            "There is no data in the database."
          );

          return;

        }


        const rows = [];


        snapshot.forEach(
          firebaseDoc => {

            rows.push({

              documentId:
                firebaseDoc.id,

              data:
                firebaseDoc.data()

            });

          }
        );


        // =================================================
        // SORT BY ID
        // =================================================

        rows.sort(
          (a, b) => {

            return (
              Number(a.data.id) -
              Number(b.data.id)
            );

          }
        );


        // =================================================
        // CREATE TABLE
        // =================================================

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
                  value !== undefined &&
                  value !== null &&
                  String(value).trim() !== ""
                    ? value
                    : "-";


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

      catch (error) {

        console.error(
          "Show data error:",
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

if (idInput) {

  setNextId();

}