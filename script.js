// ======================================================
// LANGDEX - COMPLETE SCRIPT
// Firebase + External Dictionary Sources
// NO GEMINI
// NO GOOGLE APPS SCRIPT
// NO CUSTOM API
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
// FIREBASE INITIALIZE
// ======================================================

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
// ELEMENTS
// ======================================================


// ---------- FORM ----------

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


// ---------- BUTTONS ----------

const registerButton =
  document.querySelector(".reg");


const updateButton =
  document.querySelector(".upa");


const deleteButton =
  document.querySelector(".del");


const clearButton =
  document.querySelector(".cel");


// ---------- SEARCH ----------

const searchInput =
  document.querySelector(".search-txt");


const searchButton =
  document.querySelector(".search-btn");


const searchResult =
  document.querySelector(".search-result");


// ---------- DATA PAGE ----------

const showDataButton =
  document.querySelector(".show-data");


const dataTable =
  document.querySelector("#data-table");


// ======================================================
// STATE
// ======================================================

let selectedDocumentId =
  null;


let isExistingData =
  false;


let searchResults =
  [];


let searchIndex =
  0;


let lastSearchText =
  "";


// ======================================================
// NORMALIZE
// ======================================================

function normalize(value) {

  return String(value ?? "")
    .trim()
    .toLowerCase();

}


// ======================================================
// UNIQUE
// ======================================================

function unique(values) {

  return [
    ...new Set(
      values
        .map(
          value =>
            String(value).trim()
        )
        .filter(Boolean)
    )
  ];

}


// ======================================================
// GENERATE BUTTON STATE
// ======================================================

function updateGenerateState() {

  const generateButton =
    document.querySelector(".gen");


  if (!generateButton)
    return;


  if (isExistingData) {

    generateButton.disabled =
      true;

    generateButton.style.opacity =
      "0.5";

    generateButton.style.cursor =
      "not-allowed";

  } else {

    generateButton.disabled =
      false;

    generateButton.style.opacity =
      "1";

    generateButton.style.cursor =
      "pointer";

  }

}


// ======================================================
// GET NEXT ID
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

        maxId = id;

      }

    }
  );


  return maxId + 1;

}


// ======================================================
// SET NEXT ID
// ======================================================

async function setNextId() {

  if (!idInput)
    return;


  try {

    idInput.value =
      await getNextId();

  } catch (error) {

    console.error(
      "NEXT ID ERROR:",
      error
    );

  }

}


// ======================================================
// CLEAR FORM
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


  if (wordInput)
    wordInput.value = "";


  if (meaningInput)
    meaningInput.value = "";


  if (synonymsInput)
    synonymsInput.value = "";


  if (languageSelect)
    languageSelect.selectedIndex = 0;


  if (searchInput)
    searchInput.value = "";


  if (searchResult)
    searchResult.textContent = "";


  updateGenerateState();


  await setNextId();

}


// ======================================================
// FIND EXACT WORD
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

          ...data

        });

      }

    }
  );


  return results;

}


// ======================================================
// PUT DATA INTO FORM
// ======================================================

function fillForm(data) {

  selectedDocumentId =
    data.documentId || null;


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

    if (
      Array.isArray(
        data.synonyms
      )
    ) {

      synonymsInput.value =
        data.synonyms.join(", ");

    } else {

      synonymsInput.value =
        data.synonyms ?? "";

    }

  }


  if (languageSelect) {

    const language =
      normalize(
        data.language
      );


    let found = false;


    for (
      let i = 0;
      i < languageSelect.options.length;
      i++
    ) {

      const option =
        languageSelect.options[i];


      if (

        normalize(
          option.value
        ) === language ||

        normalize(
          option.text
        ) === language

      ) {

        languageSelect.selectedIndex =
          i;

        found = true;

        break;

      }

    }


    if (!found) {

      languageSelect.selectedIndex =
        0;

    }

  }


  updateGenerateState();

}


// ======================================================
// SEARCH ALL FIREBASE DATA
// ======================================================

async function searchAllFirebase(
  searchText
) {

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


      /*
       * Search EVERYTHING
       */

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
// EXTERNAL ENGLISH DICTIONARY
// ======================================================

async function searchEnglish(word) {

  const url =
    "https://api.dictionaryapi.dev/api/v2/entries/en/" +
    encodeURIComponent(word);


  const response =
    await fetch(url);


  if (!response.ok) {

    throw new Error(
      "English dictionary: word not found."
    );

  }


  return await response.json();

}


// ======================================================
// PARSE ENGLISH
// ======================================================

function parseEnglish(data, word) {

  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {

    throw new Error(
      "No dictionary result."
    );

  }


  const entry =
    data[0];


  const meanings =
    [];


  const synonyms =
    [];


  if (
    Array.isArray(
      entry.meanings
    )
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
      "English",

    meanings:
      unique(meanings)
        .slice(0, 8),

    synonyms:
      unique(synonyms)
        .slice(0, 12)

  };

}


// ======================================================
// TRANSLATE MEANING TO ARABIC
// ======================================================

async function translateToArabic(text) {

  const url =
    "https://api.mymemory.translated.net/get" +
    "?q=" +
    encodeURIComponent(text) +
    "&langpair=en|ar";


  try {

    const response =
      await fetch(url);


    if (!response.ok)
      return text;


    const data =
      await response.json();


    return (
      data?.responseData?.translatedText ||
      text
    );

  } catch (error) {

    console.error(
      "TRANSLATION ERROR:",
      error
    );


    return text;

  }

}


// ======================================================
// EXTERNAL SEARCH
// ======================================================

async function searchExternal(word) {

  /*
   * Try English dictionary.
   */

  try {

    const data =
      await searchEnglish(
        word
      );


    const parsed =
      parseEnglish(
        data,
        word
      );


    const arabicMeanings =
      [];


    /*
     * Translate several meanings.
     */

    for (
      const meaning of
      parsed.meanings.slice(0, 6)
    ) {

      const arabic =
        await translateToArabic(
          meaning
        );


      if (arabic) {

        arabicMeanings.push(
          arabic
        );

      }

    }


    return {

      word:
        parsed.word,

      language:
        parsed.language,

      meaning:
        unique(
          arabicMeanings
        ).join(" — "),

      synonyms:
        parsed.synonyms.join(", ")

    };

  } catch (error) {

    console.log(
      "External search failed:",
      error.message
    );

  }


  throw new Error(
    "لم يتم العثور على الكلمة في المصادر المتاحة."
  );

}


// ======================================================
// SEARCH
// ======================================================

async function searchWord() {

  if (!searchInput)
    return;


  const text =
    searchInput.value.trim();


  if (!text) {

    alert(
      "اكتب كلمة للبحث."
    );

    return;

  }


  /*
   * SEARCH FIREBASE
   */

  try {

    if (
      normalize(text) !==
      normalize(lastSearchText)
    ) {

      searchResults =
        await searchAllFirebase(
          text
        );


      searchIndex =
        0;


      lastSearchText =
        text;

    }


    /*
     * Firebase results
     */

    if (
      searchResults.length > 0
    ) {

      const result =
        searchResults[
          searchIndex
        ];


      fillForm(
        result
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
          "تم العثور على البيانات في قاعدة البيانات.";

      }


      return;

    }

  } catch (error) {

    console.error(
      "FIREBASE SEARCH ERROR:",
      error
    );

  }


  /*
   * EXTERNAL DICTIONARY
   */

  try {

    if (searchResult) {

      searchResult.textContent =
        "جارٍ البحث في القاموس...";

    }


    const result =
      await searchExternal(
        text
      );


    /*
     * New word
     */

    selectedDocumentId =
      null;


    isExistingData =
      false;


    updateGenerateState();


    if (wordInput)
      wordInput.value =
        result.word;


    if (meaningInput)
      meaningInput.value =
        result.meaning;


    if (synonymsInput)
      synonymsInput.value =
        result.synonyms;


    if (languageSelect) {

      for (
        let i = 0;
        i < languageSelect.options.length;
        i++
      ) {

        const option =
          languageSelect.options[i];


        if (
          normalize(
            option.value
          ) ===
          normalize(
            result.language
          ) ||

          normalize(
            option.text
          ) ===
          normalize(
            result.language
          )
        ) {

          languageSelect.selectedIndex =
            i;

          break;

        }

      }

    }


    await setNextId();


    if (searchResult) {

      searchResult.textContent =
        "تم العثور على الكلمة. راجع البيانات ثم اضغط Register.";

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


// ======================================================
// REGISTER
// ======================================================

if (registerButton) {

  registerButton.addEventListener(
    "click",
    async () => {

      if (isExistingData) {

        alert(
          "الكلمة موجودة بالفعل.\nاستخدم Update أو Delete."
        );

        return;

      }


      const word =
        wordInput?.value.trim() ||
        "";


      const meaning =
        meaningInput?.value.trim() ||
        "";


      const synonyms =
        synonymsInput?.value.trim() ||
        "";


      const language =
        languageSelect?.value.trim() ||
        "";


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


      try {

        /*
         * Check duplicate
         */

        const existing =
          await findExactWord(
            word
          );


        if (
          existing.length > 0
        ) {

          fillForm(
            existing[0]
          );


          alert(
            "الكلمة موجودة بالفعل."
          );

          return;

        }


        /*
         * Get new ID
         */

        const newId =
          await getNextId();


        /*
         * Save
         */

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


        /*
         * IMPORTANT
         *
         * Clear EVERYTHING
         * except ID.
         *
         * ID = old ID + 1
         */

        if (wordInput)
          wordInput.value = "";


        if (meaningInput)
          meaningInput.value = "";


        if (synonymsInput)
          synonymsInput.value = "";


        if (languageSelect)
          languageSelect.selectedIndex = 0;


        if (searchInput)
          searchInput.value = "";


        if (searchResult)
          searchResult.textContent = "";


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


        if (idInput)
          idInput.value =
            newId + 1;


        updateGenerateState();

      } catch (error) {

        console.error(
          "REGISTER ERROR:",
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
    async () => {

      if (!selectedDocumentId) {

        alert(
          "ابحث عن كلمة موجودة أولاً."
        );

        return;

      }


      const word =
        wordInput?.value.trim() ||
        "";


      const meaning =
        meaningInput?.value.trim() ||
        "";


      const synonyms =
        synonymsInput?.value.trim() ||
        "";


      const language =
        languageSelect?.value.trim() ||
        "";


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


        /*
         * Clear everything
         * and generate next ID.
         */

        await clearForm();

      } catch (error) {

        console.error(
          "UPDATE ERROR:",
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
    async () => {

      if (!selectedDocumentId) {

        alert(
          "ابحث عن كلمة أولاً."
        );

        return;

      }


      const confirmed =
        confirm(
          "هل أنت متأكد من حذف هذه الكلمة؟"
        );


      if (!confirmed)
        return;


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
          "حدث خطأ أثناء الحذف:\n" +
          error.message
        );

      }

    }
  );

}


// ======================================================
// CLEAR
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
// SEARCH BUTTON
// ======================================================

if (searchButton) {

  searchButton.addEventListener(
    "click",
    searchWord
  );

}


// ======================================================
// ENTER SEARCH
// ======================================================

if (searchInput) {

  searchInput.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        searchWord();

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
         * Clear previous table.
         */

        dataTable.innerHTML =
          "";


        if (snapshot.empty) {

          return;

        }


        const rows =
          [];


        snapshot.forEach(
          firebaseDoc => {

            rows.push({

              documentId:
                firebaseDoc.id,

              ...firebaseDoc.data()

            });

          }
        );


        /*
         * Sort by ID.
         */

        rows.sort(
          (a, b) =>
            Number(a.id) -
            Number(b.id)
        );


        /*
         * Display.
         */

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


                /*
                 * Handle empty data.
                 */

                if (
                  value === null ||
                  value === undefined ||
                  value === ""
                ) {

                  cell.textContent =
                    "-";

                } else if (
                  Array.isArray(value)
                ) {

                  cell.textContent =
                    value.join(", ");

                } else {

                  cell.textContent =
                    String(value);

                }


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
          "حدث خطأ أثناء عرض البيانات:\n" +
          error.message
        );

      }

    }
  );

}


// ======================================================
// START
// ======================================================

setExistingStateOnStart();


// ======================================================
// START STATE
// ======================================================

function setExistingStateOnStart() {

  selectedDocumentId =
    null;

  isExistingData =
    false;

  updateGenerateState();

  setNextId();

}