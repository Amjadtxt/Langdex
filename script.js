// ======================================================
// LANGDEX - FIREBASE + WIKTAPI + MYMEMORY
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


// ======================================================
// INITIALIZE FIREBASE
// ======================================================

const app =
  initializeApp(firebaseConfig);

const db =
  getFirestore(app);


// ======================================================
// CONSTANTS
// ======================================================

const COLLECTION_NAME = "words";

const WIKTAPI_BASE =
  "https://api.wiktapi.dev/v1";

const MYMEMORY_BASE =
  "https://api.mymemory.translated.net/get";

const FREE_DICTIONARY_BASE =
  "https://api.dictionaryapi.dev/api/v2/entries/en";


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
  document.querySelector(
    ".search-section input"
  );

const searchButton =
  document.querySelector(".search-btn");


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
// NORMALIZE
// ======================================================

function normalize(value) {

  return String(value ?? "")
    .trim()
    .toLowerCase();

}


// ======================================================
// SAFE STRING
// ======================================================

function safeString(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }

  return String(value).trim();

}


// ======================================================
// UNIQUE ARRAY
// ======================================================

function uniqueArray(values) {

  const result = [];

  const seen =
    new Set();

  for (
    const value of values
  ) {

    const text =
      safeString(value);

    if (!text) {
      continue;
    }

    const key =
      normalize(text);

    if (
      !seen.has(key)
    ) {

      seen.add(key);

      result.push(text);

    }

  }

  return result;

}


// ======================================================
// LANGUAGE CODE
// ======================================================

function getLanguageCode(language) {

  const value =
    normalize(language);


  if (
    value === "english" ||
    value === "en"
  ) {

    return "en";

  }


  if (
    value === "urdu" ||
    value === "ur"
  ) {

    return "ur";

  }


  if (
    value === "hindi" ||
    value === "hi"
  ) {

    return "hi";

  }


  // Common languages

  const languages = {

    french: "fr",

    german: "de",

    spanish: "es",

    italian: "it",

    portuguese: "pt",

    russian: "ru",

    japanese: "ja",

    korean: "ko",

    chinese: "zh",

    arabic: "ar",

    turkish: "tr",

    persian: "fa",

    bengali: "bn",

    punjabi: "pa",

    dutch: "nl",

    polish: "pl",

    greek: "el"

  };


  return languages[value] || null;

}


// ======================================================
// LANGUAGE NAME
// ======================================================

function languageName(languageCode) {

  const code =
    normalize(languageCode);


  const languages = {

    en: "English",

    ur: "Urdu",

    hi: "Hindi",

    ar: "Arabic",

    fr: "French",

    de: "German",

    es: "Spanish",

    it: "Italian",

    pt: "Portuguese",

    ru: "Russian",

    ja: "Japanese",

    ko: "Korean",

    zh: "Chinese",

    fa: "Persian",

    bn: "Bengali",

    pa: "Punjabi",

    nl: "Dutch",

    pl: "Polish",

    el: "Greek",

    tr: "Turkish"

  };


  return (
    languages[code] ||
    language ||
    "Unknown"
  );

}


// ======================================================
// SET LANGUAGE SELECT
// ======================================================

function setLanguage(language) {

  if (!languageSelect) {
    return;
  }


  const wanted =
    normalize(language);


  let found = false;


  for (
    let i = 0;
    i < languageSelect.options.length;
    i++
  ) {

    const option =
      languageSelect.options[i];

    const optionText =
      normalize(option.text);

    const optionValue =
      normalize(option.value);


    if (
      optionText === wanted ||
      optionValue === wanted
    ) {

      languageSelect.selectedIndex =
        i;

      found = true;

      break;

    }

  }


  if (found) {
    return;
  }


  const code =
    getLanguageCode(language);


  if (!code) {
    return;
  }


  for (
    let i = 0;
    i < languageSelect.options.length;
    i++
  ) {

    const option =
      languageSelect.options[i];

    const optionText =
      normalize(option.text);


    if (
      optionText ===
      normalize(
        languageName(code)
      )
    ) {

      languageSelect.selectedIndex =
        i;

      break;

    }

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


    idInput.value =
      maxId + 1;


  } catch (error) {

    console.error(
      "Next ID error:",
      error
    );

    idInput.value = "1";

  }

}


// ======================================================
// GET ALL FIREBASE DATA
// ======================================================

async function getAllWords() {

  const snapshot =
    await getDocs(
      collection(
        db,
        COLLECTION_NAME
      )
    );


  const results = [];


  snapshot.forEach(
    firebaseDoc => {

      results.push({

        documentId:
          firebaseDoc.id,

        data:
          firebaseDoc.data()

      });

    }
  );


  return results;

}


// ======================================================
// FIND EXACT WORD IN FIREBASE
// ======================================================

async function findExactWord(word) {

  const all =
    await getAllWords();


  const target =
    normalize(word);


  return all.filter(
    item =>
      normalize(
        item.data.word
      ) === target
  );

}


// ======================================================
// FILL FORM
// ======================================================

function fillForm(data) {

  if (!data) {
    return;
  }


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
// EXTRACT WIKTAPI SYNONYMS
// ======================================================

function extractSynonyms(entries) {

  const synonyms = [];


  if (!Array.isArray(entries)) {

    return synonyms;

  }


  for (
    const entry of entries
  ) {

    if (
      !Array.isArray(
        entry.synonyms
      )
    ) {

      continue;

    }


    for (
      const synonym of
      entry.synonyms
    ) {

      if (
        typeof synonym ===
        "string"
      ) {

        synonyms.push(
          synonym
        );

      } else if (
        synonym &&
        typeof synonym ===
        "object"
      ) {

        if (synonym.word) {

          synonyms.push(
            synonym.word
          );

        }

      }

    }

  }


  return uniqueArray(
    synonyms
  );

}


// ======================================================
// EXTRACT DEFINITIONS
// ======================================================

function extractDefinitions(entries) {

  const definitions = [];


  if (!Array.isArray(entries)) {

    return definitions;

  }


  for (
    const entry of
    entries
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

        if (
          typeof gloss ===
          "string"
        ) {

          definitions.push(
            gloss
          );

        }

      }

    }

  }


  return uniqueArray(
    definitions
  );

}


// ======================================================
// RECURSIVE ARABIC TRANSLATION FINDER
// ======================================================

function extractArabicTranslations(object) {

  const results = [];


  function walk(value) {

    if (!value) {
      return;
    }


    if (
      Array.isArray(value)
    ) {

      for (
        const item of value
      ) {

        walk(item);

      }

      return;

    }


    if (
      typeof value !==
      "object"
    ) {

      return;

    }


    const langCode =
      safeString(
        value.lang_code ||
        value.language_code ||
        value.langCode
      );


    const lang =
      normalize(
        value.lang ||
        value.language ||
        value.lang_name
      );


    const isArabic =
      langCode === "ar" ||
      lang.includes("arabic") ||
      lang.includes("العربية") ||
      lang.includes("عربي");


    if (isArabic) {

      const word =
        value.word ||
        value.term ||
        value.translation;


      if (
        typeof word ===
        "string"
      ) {

        results.push(
          word
        );

      }

    }


    for (
      const key in value
    ) {

      if (
        Object.prototype.hasOwnProperty
          .call(value, key)
      ) {

        walk(
          value[key]
        );

      }

    }

  }


  walk(object);


  return uniqueArray(
    results
  );

}


// ======================================================
// WIKTAPI REQUEST
// ======================================================

async function getFromWiktAPI(
  word,
  languageCode
) {

  const encodedWord =
    encodeURIComponent(
      word
    );


  let url =
    WIKTAPI_BASE +
    "/en/word/" +
    encodedWord;


  if (languageCode) {

    url +=
      "?lang=" +
      encodeURIComponent(
        languageCode
      );

  }


  const response =
    await fetch(url);


  if (!response.ok) {

    throw new Error(
      "WiktAPI HTTP " +
      response.status
    );

  }


  return await response.json();

}


// ======================================================
// WIKTAPI TRANSLATIONS REQUEST
// ======================================================

async function getWiktTranslations(
  word,
  languageCode
) {

  const encodedWord =
    encodeURIComponent(
      word
    );


  let url =
    WIKTAPI_BASE +
    "/en/word/" +
    encodedWord +
    "/translations";


  if (languageCode) {

    url +=
      "?lang=" +
      encodeURIComponent(
        languageCode
      );

  }


  const response =
    await fetch(url);


  if (!response.ok) {

    return null;

  }


  return await response.json();

}


// ======================================================
// TRANSLATE TO ARABIC - MYMEMORY
// ======================================================

async function translateToArabic(
  text,
  sourceLanguage
) {

  const cleanText =
    safeString(text);


  if (!cleanText) {
    return "";
  }


  const sourceCode =
    sourceLanguage ||
    "en";


  const url =
    MYMEMORY_BASE +
    "?q=" +
    encodeURIComponent(
      cleanText.substring(
        0,
        450
      )
    ) +
    "&langpair=" +
    encodeURIComponent(
      sourceCode + "|ar"
    );


  try {

    const response =
      await fetch(url);


    if (!response.ok) {

      return "";

    }


    const data =
      await response.json();


    if (
      data &&
      data.responseData &&
      data.responseData.translatedText
    ) {

      return safeString(
        data.responseData
          .translatedText
      );

    }


    return "";

  } catch (error) {

    console.warn(
      "Translation fallback failed:",
      error
    );

    return "";

  }

}


// ======================================================
// TRANSLATE MANY DEFINITIONS
// ======================================================

async function translateDefinitions(
  definitions,
  languageCode
) {

  const translated = [];


  // Don't translate if already Arabic

  if (
    languageCode === "ar"
  ) {

    return uniqueArray(
      definitions
    ).slice(0, 6);

  }


  for (
    const definition of
    definitions.slice(0, 6)
  ) {

    const result =
      await translateToArabic(
        definition,
        languageCode
      );


    if (result) {

      translated.push(
        result
      );

    }

  }


  return uniqueArray(
    translated
  ).slice(0, 6);

}


// ======================================================
// ENGLISH DICTIONARY API
// ======================================================

async function getEnglishDictionary(
  word
) {

  const url =
    FREE_DICTIONARY_BASE +
    "/" +
    encodeURIComponent(
      word
    );


  const response =
    await fetch(url);


  if (!response.ok) {

    throw new Error(
      "English Dictionary HTTP " +
      response.status
    );

  }


  const data =
    await response.json();


  return data;

}


// ======================================================
// EXTRACT ENGLISH DEFINITIONS
// ======================================================

function extractEnglishDefinitions(
  data
) {

  const definitions = [];


  if (!Array.isArray(data)) {

    return definitions;

  }


  for (
    const entry of data
  ) {

    if (
      !Array.isArray(
        entry.meanings
      )
    ) {

      continue;

    }


    for (
      const meaning of
      entry.meanings
    ) {

      if (
        !Array.isArray(
          meaning.definitions
        )
      ) {

        continue;

      }


      for (
        const definition of
        meaning.definitions
      ) {

        if (
          definition &&
          definition.definition
        ) {

          definitions.push(
            definition.definition
          );

        }

      }

    }

  }


  return uniqueArray(
    definitions
  );

}


// ======================================================
// EXTRACT ENGLISH SYNONYMS
// ======================================================

function extractEnglishSynonyms(
  data
) {

  const synonyms = [];


  if (!Array.isArray(data)) {

    return synonyms;

  }


  for (
    const entry of data
  ) {

    if (
      !Array.isArray(
        entry.meanings
      )
    ) {

      continue;

    }


    for (
      const meaning of
      entry.meanings
    ) {

      if (
        Array.isArray(
          meaning.synonyms
        )
      ) {

        synonyms.push(
          ...meaning.synonyms
        );

      }


      if (
        Array.isArray(
          meaning.definitions
        )
      ) {

        for (
          const definition of
          meaning.definitions
        ) {

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

      }

    }

  }


  return uniqueArray(
    synonyms
  );

}


// ======================================================
// BUILD EXTERNAL RESULT
// ======================================================

async function buildExternalResult(
  word
) {

  let selectedLanguage =
    languageSelect
      ? languageSelect.value.trim()
      : "";


  let languageCode =
    getLanguageCode(
      selectedLanguage
    );


  let wiktData = null;


  // ====================================================
  // TRY WIKTAPI
  // ====================================================

  try {

    wiktData =
      await getFromWiktAPI(
        word,
        languageCode
      );

  } catch (error) {

    console.warn(
      "WiktAPI language request failed:",
      error
    );


    // Try without language filter

    try {

      wiktData =
        await getFromWiktAPI(
          word,
          null
        );

    } catch (secondError) {

      console.warn(
        "WiktAPI general request failed:",
        secondError
      );

    }

  }


  // ====================================================
  // CHECK WIKTAPI DATA
  // ====================================================

  if (
    wiktData &&
    Array.isArray(
      wiktData.entries
    ) &&
    wiktData.entries.length > 0
  ) {

    const entries =
      wiktData.entries;


    // -----------------------------------------------
    // Find best language entry
    // -----------------------------------------------

    let selectedEntry =
      entries[0];


    if (languageCode) {

      const matching =
        entries.find(
          entry =>
            normalize(
              entry.lang_code
            ) ===
            normalize(
              languageCode
            )
        );


      if (matching) {

        selectedEntry =
          matching;

      }

    }


    const detectedLanguage =
      selectedEntry.lang_code ||
      languageCode ||
      "";


    const detectedName =
      selectedEntry.lang ||
      languageName(
        detectedLanguage
      );


    // -----------------------------------------------
    // Definitions
    // -----------------------------------------------

    let definitions =
      extractDefinitions(
        [selectedEntry]
      );


    // -----------------------------------------------
    // Synonyms
    // -----------------------------------------------

    let synonyms =
      extractSynonyms(
        [selectedEntry]
      );


    // -----------------------------------------------
    // Arabic translations directly from WiktAPI
    // -----------------------------------------------

    let arabicMeanings =
      extractArabicTranslations(
        wiktData
      );


    // -----------------------------------------------
    // Try translation endpoint
    // -----------------------------------------------

    if (
      arabicMeanings.length === 0
    ) {

      try {

        const translations =
          await getWiktTranslations(
            word,
            detectedLanguage
          );


        if (translations) {

          arabicMeanings =
            extractArabicTranslations(
              translations
            );

        }

      } catch (error) {

        console.warn(
          "WiktAPI translations failed:",
          error
        );

      }

    }


    // -----------------------------------------------
    // Translate definitions if needed
    // -----------------------------------------------

    if (
      arabicMeanings.length === 0 &&
      definitions.length > 0
    ) {

      arabicMeanings =
        await translateDefinitions(
          definitions,
          detectedLanguage
        );

    }


    // -----------------------------------------------
    // Final Wikt result
    // -----------------------------------------------

    if (
      arabicMeanings.length > 0 ||
      definitions.length > 0
    ) {

      return {

        word:
          safeString(
            selectedEntry.word
          ) ||
          word,

        language:
          detectedName,

        meaningArabic:
          uniqueArray(
            arabicMeanings
          ).slice(0, 6),

        synonyms:
          uniqueArray(
            synonyms
          ).slice(0, 8)

      };

    }

  }


  // ====================================================
  // ENGLISH FALLBACK
  // ====================================================

  let englishData = null;


  try {

    englishData =
      await getEnglishDictionary(
        word
      );

  } catch (error) {

    console.warn(
      "English Dictionary failed:",
      error
    );

  }


  if (englishData) {

    const definitions =
      extractEnglishDefinitions(
        englishData
      );


    const synonyms =
      extractEnglishSynonyms(
        englishData
      );


    const meaningsArabic =
      await translateDefinitions(
        definitions,
        "en"
      );


    if (
      meaningsArabic.length > 0
    ) {

      return {

        word:
          word,

        language:
          "English",

        meaningArabic:
          meaningsArabic,

        synonyms:
          synonyms.slice(0, 8)

      };

    }

  }


  // ====================================================
  // NOTHING FOUND
  // ====================================================

  throw new Error(
    "لم يتم العثور على بيانات كافية للكلمة."
  );

}


// ======================================================
// EXTERNAL SEARCH
// ======================================================

async function searchExternalWord(
  word
) {

  try {

    const result =
      await buildExternalResult(
        word
      );


    if (!result) {

      throw new Error(
        "No result"
      );

    }


    return result;

  } catch (error) {

    console.error(
      "External dictionary error:",
      error
    );


    throw error;

  }

}


// ======================================================
// SEARCH
// ======================================================

if (
  searchInput &&
  searchButton
) {

  searchInput.addEventListener(
    "keydown",
    event => {

      if (
        event.key ===
        "Enter"
      ) {

        event.preventDefault();

        searchButton.click();

      }

    }
  );


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


      const normalizedSearch =
        normalize(
          searchText
        );


      try {

        // =================================================
        // NEW SEARCH
        // =================================================

        if (
          normalizedSearch !==
          lastSearchText
        ) {

          searchResults = [];

          searchIndex = 0;


          // -----------------------------------------------
          // FIREBASE FIRST
          // -----------------------------------------------

          const firebaseResults =
            await getAllWords();


          for (
            const item of
            firebaseResults
          ) {

            const data =
              item.data;


            const id =
              normalize(
                data.id
              );

            const word =
              normalize(
                data.word
              );

            const meaning =
              normalize(
                data.meaning
              );

            const synonyms =
              normalize(
                data.synonyms
              );

            const language =
              normalize(
                data.language
              );


            if (

              id.includes(
                normalizedSearch
              ) ||

              word.includes(
                normalizedSearch
              ) ||

              meaning.includes(
                normalizedSearch
              ) ||

              synonyms.includes(
                normalizedSearch
              ) ||

              language.includes(
                normalizedSearch
              )

            ) {

              searchResults.push({

                source:
                  "firebase",

                documentId:
                  item.documentId,

                data:
                  data

              });

            }

          }


          // -----------------------------------------------
          // IF FIREBASE FOUND EXACT WORD
          // DON'T GO OUTSIDE
          // -----------------------------------------------

          const exactFirebase =
            searchResults.find(
              result =>
                normalize(
                  result.data.word
                ) ===
                normalizedSearch
            );


          if (exactFirebase) {

            searchResults = [
              exactFirebase
            ];

          }


          // -----------------------------------------------
          // IF WORD NOT FOUND IN FIREBASE
          // SEARCH EXTERNAL
          // -----------------------------------------------

          if (
            searchResults.length === 0
          ) {

            const external =
              await searchExternalWord(
                searchText
              );


            searchResults.push({

              source:
                "external",

              documentId:
                null,

              data:
                external

            });

          }


          lastSearchText =
            normalizedSearch;

          searchIndex = 0;

        }


        // =================================================
        // NO RESULTS
        // =================================================

        if (
          searchResults.length === 0
        ) {

          alert(
            "No results found."
          );

          return;

        }


        // =================================================
        // CURRENT RESULT
        // =================================================

        const result =
          searchResults[
            searchIndex
          ];


        if (
          !result
        ) {

          searchIndex = 0;

          return;

        }


        // =================================================
        // FIREBASE RESULT
        // =================================================

        if (
          result.source ===
          "firebase"
        ) {

          selectedDocumentId =
            result.documentId;

          isExistingData =
            true;

          fillForm(
            result.data
          );

        }


        // =================================================
        // EXTERNAL RESULT
        // =================================================

        else {

          selectedDocumentId =
            null;

          isExistingData =
            false;

          fillForm(
            result.data
          );


          if (idInput) {

            await setNextId();

          }

        }


        // =================================================
        // NEXT RESULT
        // =================================================

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
    async () => {

      if (
        isExistingData
      ) {

        alert(
          "This word already exists.\nUse UPDATE or DELETE."
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
          "Please choose the language."
        );

        return;

      }


      try {

        // -----------------------------------------------
        // CHECK DUPLICATE
        // -----------------------------------------------

        const existing =
          await findExactWord(
            word
          );


        if (
          existing.length > 0
        ) {

          alert(
            "This word already exists with ID " +
            existing[0].data.id
          );

          selectedDocumentId =
            existing[0].documentId;

          isExistingData =
            true;

          fillForm(
            existing[0].data
          );

          return;

        }


        // -----------------------------------------------
        // NEW ID
        // -----------------------------------------------

        const all =
          await getAllWords();


        let maxId = 0;


        for (
          const item of all
        ) {

          const id =
            Number(
              item.data.id
            );


          if (
            Number.isFinite(id) &&
            id > maxId
          ) {

            maxId = id;

          }

        }


        const newId =
          maxId + 1;


        // -----------------------------------------------
        // SAVE
        // -----------------------------------------------

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


        // -----------------------------------------------
        // SUCCESS
        // -----------------------------------------------

        alert(
          "Data registered successfully!"
        );


        // -----------------------------------------------
        // CLEAR EVERYTHING EXCEPT ID
        // -----------------------------------------------

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


        if (searchInput) {

          searchInput.value =
            "";

        }


        // EXACTLY NEW ID = LAST ID + 1

        if (idInput) {

          idInput.value =
            newId + 1;

        }


      } catch (error) {

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

      if (
        !selectedDocumentId
      ) {

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
          "Please choose the language."
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
          "Data updated successfully!"
        );


        await clearForm();


      } catch (error) {

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

      if (
        !selectedDocumentId
      ) {

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


      } catch (error) {

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


  searchResults =
    [];

  searchIndex =
    0;

  lastSearchText =
    "";


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


  await setNextId();

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


        dataTable.innerHTML =
          "";


        if (
          snapshot.empty
        ) {

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


        // -----------------------------------------------
        // SORT BY ID
        // -----------------------------------------------

        rows.sort(
          (a, b) =>
            Number(
              a.data.id
            ) -
            Number(
              b.data.id
            )
        );


        // -----------------------------------------------
        // CREATE TABLE
        // -----------------------------------------------

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
                  safeString(
                    value
                  ) || "-";


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
// INITIALIZE
// ======================================================

if (idInput) {

  setNextId();

}