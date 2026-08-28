/* =========================================================
   LANGDEX
   GitHub Pages + Firebase Firestore
   English / Hindi / Urdu
   Arabic Meaning
   ========================================================= */


/* =========================================================
   FIREBASE
   ========================================================= */

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


/* =========================================================
   FIREBASE CONFIG
   =========================================================
   حط بيانات Firebase بتاعتك هنا
   ========================================================= */

const firebaseConfig = {
  apiKey: "ضع_API_KEY_هنا",
  authDomain: "ضع_PROJECT_ID.firebaseapp.com",
  projectId: "ضع_PROJECT_ID_هنا",
  storageBucket: "ضع_STORAGE_BUCKET_هنا",
  messagingSenderId: "ضع_MESSAGING_SENDER_ID_هنا",
  appId: "ضع_APP_ID_هنا"
};


const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const COLLECTION_NAME = "words";


/* =========================================================
   GET HTML ELEMENTS
   ========================================================= */

/*
   حسب HTML بتاعك:

   search-txt  = البحث
   id          = ID

   باقي الـ inputs مفيش لهم classes
   لذلك هنجيبهم من داخل .form بالترتيب.

   0 = ID
   1 = WORD
   2 = MEANING
   3 = SYNONYMS
*/

const searchInput =
  document.querySelector(".search-txt");

const searchButton =
  document.querySelector(".search-btn");

const form =
  document.querySelector(".form");

const formInputs =
  form ? form.querySelectorAll("input") : [];

const idInput =
  formInputs[0];

const wordInput =
  formInputs[1];

const meaningInput =
  formInputs[2];

const synonymsInput =
  formInputs[3];

const languageSelect =
  form ? form.querySelector("select") : null;

const registerButton =
  document.querySelector(".reg");

const updateButton =
  document.querySelector(".upa");

const deleteButton =
  document.querySelector(".del");

const clearButton =
  document.querySelector(".cel");


/* =========================================================
   CURRENT STATE
   ========================================================= */

let currentDocumentId = null;

let currentDatabaseResults = [];

let currentSearchText = "";

let currentSearchIndex = -1;


/* =========================================================
   LANGUAGE MAP
   ========================================================= */

const languageNames = {

  en: "الإنجليزية",

  hi: "الهندية",

  ur: "الأردية"

};


/* =========================================================
   CLEAN TEXT
   ========================================================= */

function cleanText(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }

  return String(value).trim();

}


/* =========================================================
   DETECT LANGUAGE
   ========================================================= */

function detectLanguage(text) {

  const value =
    cleanText(text);


  /*
     Hindi / Devanagari
  */

  if (
    /[\u0900-\u097F]/.test(value)
  ) {

    return "hi";

  }


  /*
     Urdu / Arabic script

     ملاحظة:
     لو الكلمة عربية فعلًا سيتم اعتبارها Urdu
     لأن مشروعك حاليًا بيدعم English/Hindi/Urdu.
  */

  if (
    /[\u0600-\u06FF]/.test(value)
  ) {

    return "ur";

  }


  /*
     English
  */

  if (
    /[A-Za-z]/.test(value)
  ) {

    return "en";

  }


  return null;

}


/* =========================================================
   SET LANGUAGE SELECT
   ========================================================= */

function setLanguage(languageCode) {

  if (!languageSelect) {

    return;

  }


  const languageName =
    languageNames[languageCode];


  if (!languageName) {

    return;

  }


  for (
    const option
    of languageSelect.options
  ) {

    if (
      option.textContent.trim() ===
      languageName
    ) {

      languageSelect.value =
        option.value;

      return;

    }

  }

}


/* =========================================================
   GET SELECTED LANGUAGE
   ========================================================= */

function getSelectedLanguage() {

  if (!languageSelect) {

    return "";

  }


  const text =
    languageSelect.options[
      languageSelect.selectedIndex
    ]?.textContent.trim();


  if (
    text === "الإنجليزية"
  ) {

    return "en";

  }


  if (
    text === "الهندية"
  ) {

    return "hi";

  }


  if (
    text === "الأردية"
  ) {

    return "ur";

  }


  return "";

}


/* =========================================================
   TRANSLATE USING MYMEMORY
   ========================================================= */

async function translateText(
  text,
  source,
  target
) {

  const value =
    cleanText(text);


  if (!value) {

    return "";

  }


  if (
    source === target
  ) {

    return value;

  }


  try {

    const url =
      "https://api.mymemory.translated.net/get" +
      "?q=" +
      encodeURIComponent(value) +
      "&langpair=" +
      encodeURIComponent(
        source + "|" + target
      );


    const response =
      await fetch(url);


    if (!response.ok) {

      throw new Error(
        "Translation request failed"
      );

    }


    const data =
      await response.json();


    const result =
      data?.responseData?.translatedText;


    if (!result) {

      throw new Error(
        "No translation result"
      );

    }


    return cleanText(result);

  } catch (error) {

    console.error(
      "Translation error:",
      error
    );


    return "";

  }

}


/* =========================================================
   GET ENGLISH SYNONYMS
   ========================================================= */

async function getEnglishSynonyms(
  englishWord
) {

  try {

    const url =
      "https://api.datamuse.com/words" +
      "?rel_syn=" +
      encodeURIComponent(
        englishWord
      ) +
      "&max=8";


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


    return data
      .map(item =>
        cleanText(item.word)
      )
      .filter(Boolean)
      .slice(0, 8);


  } catch (error) {

    console.error(
      "Synonyms error:",
      error
    );


    return [];

  }

}


/* =========================================================
   GET ONLINE WORD DATA
   ========================================================= */

async function getOnlineWord(
  word
) {

  const cleanWord =
    cleanText(word);


  if (!cleanWord) {

    alert(
      "اكتب كلمة الأول."
    );

    return null;

  }


  /*
     تحديد اللغة
  */

  const language =
    detectLanguage(
      cleanWord
    );


  if (!language) {

    alert(
      "مش قادر أحدد لغة الكلمة."
    );

    return null;

  }


  /*
     ============================================
     English
     ============================================
  */

  if (
    language === "en"
  ) {

    /*
       Dictionary API
    */

    try {

      const dictionaryUrl =
        "https://api.dictionaryapi.dev/api/v2/entries/en/" +
        encodeURIComponent(
          cleanWord
        );


      const response =
        await fetch(
          dictionaryUrl
        );


      if (!response.ok) {

        alert(
          "ملقتش الكلمة في القاموس الأونلاين."
        );

        return null;

      }


      const data =
        await response.json();


      const entry =
        data?.[0];


      if (!entry) {

        alert(
          "ملقتش بيانات للكلمة."
        );

        return null;

      }


      /*
         أول تعريف
      */

      let englishMeaning =
        "";


      for (
        const meaning
        of entry.meanings || []
      ) {

        for (
          const definition
          of meaning.definitions || []
        ) {

          if (
            definition.definition
          ) {

            englishMeaning =
              definition.definition;

            break;

          }

        }


        if (englishMeaning) {

          break;

        }

      }


      /*
         ترجمة المعنى للعربي
      */

      const arabicMeaning =
        await translateText(
          englishMeaning,
          "en",
          "ar"
        );


      /*
         Synonyms
      */

      let synonyms =
        [];


      for (
        const meaning
        of entry.meanings || []
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


        for (
          const definition
          of meaning.definitions || []
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


      /*
         لو القاموس مفيهوش synonyms
         نستخدم Datamuse
      */

      if (
        synonyms.length === 0
      ) {

        synonyms =
          await getEnglishSynonyms(
            cleanWord
          );

      }


      synonyms =
        [
          ...new Set(
            synonyms
              .map(cleanText)
              .filter(Boolean)
          )
        ]
        .slice(0, 8);


      return {

        word:
          entry.word ||
          cleanWord,

        meaning:
          arabicMeaning ||
          "لم يتم العثور على معنى عربي.",

        synonyms:
          synonyms.join(", "),

        language:
          "en"

      };

    } catch (error) {

      console.error(error);

      alert(
        "حصل خطأ أثناء البحث عن الكلمة على الإنترنت."
      );

      return null;

    }

  }


  /*
     ============================================
     Hindi / Urdu
     ============================================
  */

  try {

    /*
       نحول الكلمة للإنجليزية
       عشان نقدر نبحث عن synonyms.
    */

    const englishWord =
      await translateText(
        cleanWord,
        language,
        "en"
      );


    /*
       نجيب معنى عربي مباشر
       من اللغة الأصلية.
    */

    const arabicMeaning =
      await translateText(
        cleanWord,
        language,
        "ar"
      );


    /*
       نحاول نجيب synonyms
       عن طريق الإنجليزية.
    */

    let synonyms = [];


    if (englishWord) {

      const englishSynonyms =
        await getEnglishSynonyms(
          englishWord
        );


      /*
         نرجع المرادفات
         للغة الأصلية.
      */

      if (
        englishSynonyms.length > 0
      ) {

        const translatedSynonyms =
          await translateText(
            englishSynonyms.join(", "),
            "en",
            language
          );


        if (
          translatedSynonyms
        ) {

          synonyms =
            translatedSynonyms;

        }

      }

    }


    return {

      word:
        cleanWord,

      meaning:
        arabicMeaning ||
        "لم يتم العثور على معنى عربي.",

      synonyms:
        synonyms,

      language:
        language

    };


  } catch (error) {

    console.error(error);

    alert(
      "حصل خطأ أثناء البحث عن الكلمة."
    );

    return null;

  }

}


/* =========================================================
   GET NEXT ID
   ========================================================= */

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
      item => {

        const data =
          item.data();


        const numericId =
          Number(data.id);


        if (
          Number.isFinite(
            numericId
          ) &&
          numericId > maxId
        ) {

          maxId =
            numericId;

        }

      }
    );


    return maxId + 1;


  } catch (error) {

    console.error(error);

    alert(
      "حصل خطأ أثناء تحديد الـ ID."
    );

    return 1;

  }

}


/* =========================================================
   SET NEXT ID
   ========================================================= */

async function setNextId() {

  if (!idInput) {

    return;

  }


  idInput.value =
    await getNextId();

}


/* =========================================================
   SEARCH DATABASE
   ========================================================= */

async function searchDatabase(
  word
) {

  try {

    const searchWord =
      cleanText(
        word
      ).toLowerCase();


    const snapshot =
      await getDocs(
        collection(
          db,
          COLLECTION_NAME
        )
      );


    const results = [];


    snapshot.forEach(
      item => {

        const data =
          item.data();


        const databaseWord =
          cleanText(
            data.word
          ).toLowerCase();


        if (
          databaseWord ===
          searchWord
        ) {

          results.push({

            documentId:
              item.id,

            ...data

          });

        }

      }
    );


    results.sort(
      (a, b) =>
        Number(a.id || 0) -
        Number(b.id || 0)
    );


    return results;


  } catch (error) {

    console.error(error);

    alert(
      "حصل خطأ أثناء البحث في قاعدة البيانات."
    );

    return [];

  }

}


/* =========================================================
   FILL FORM
   ========================================================= */

function fillForm(
  data
) {

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


  setLanguage(
    data.language
  );


  currentDocumentId =
    data.documentId || null;

}


/* =========================================================
   SEARCH
   ========================================================= */

async function searchWord() {

  const value =
    cleanText(
      searchInput?.value
    );


  if (!value) {

    alert(
      "اكتب كلمة للبحث."
    );

    return;

  }


  /*
     لو نفس الكلمة واتعرضت نتيجة قبل كده
     نجيب النتيجة اللي بعدها.
  */

  if (
    currentSearchText ===
    value.toLowerCase() &&
    currentDatabaseResults.length > 0
  ) {

    currentSearchIndex++;


    if (
      currentSearchIndex <
      currentDatabaseResults.length
    ) {

      fillForm(
        currentDatabaseResults[
          currentSearchIndex
        ]
      );


      alert(
        "تم عرض النتيجة التالية."
      );

      return;

    }

  }


  /*
     بحث جديد
  */

  currentSearchText =
    value.toLowerCase();


  currentSearchIndex =
    -1;


  currentDatabaseResults =
    await searchDatabase(
      value
    );


  /*
     =========================================
     موجودة في Firebase
     =========================================
  */

  if (
    currentDatabaseResults.length > 0
  ) {

    currentSearchIndex =
      0;


    fillForm(
      currentDatabaseResults[0]
    );


    alert(
      "الكلمة موجودة بالفعل في قاعدة البيانات.\nلا يمكنك حفظها مرة أخرى.\nيمكنك تحديثها أو حذفها."
    );


    return;

  }


  /*
     =========================================
     غير موجودة → Online
     =========================================
  */

  const onlineData =
    await getOnlineWord(
      value
    );


  if (!onlineData) {

    return;

  }


  /*
     نملأ الفورم
  */

  if (wordInput) {

    wordInput.value =
      onlineData.word;

  }


  if (meaningInput) {

    meaningInput.value =
      onlineData.meaning;

  }


  if (synonymsInput) {

    synonymsInput.value =
      onlineData.synonyms;

  }


  setLanguage(
    onlineData.language
  );


  /*
     كلمة جديدة
  */

  currentDocumentId =
    null;


  await setNextId();


  alert(
    "الكلمة غير موجودة في قاعدة البيانات.\nتم جلب بياناتها من الإنترنت ويمكنك الآن حفظها."
  );

}


/* =========================================================
   CHECK DUPLICATE
   ========================================================= */

async function checkDuplicate(
  word
) {

  return await searchDatabase(
    word
  );

}


/* =========================================================
   REGISTER
   ========================================================= */

async function registerWord() {

  /*
     ممنوع الحفظ لو النتيجة الحالية
     جاية من Firebase.
  */

  if (currentDocumentId) {

    alert(
      "هذه الكلمة موجودة بالفعل في قاعدة البيانات.\nاستخدم تحديث أو حذف بدل الحفظ."
    );

    return;

  }


  const word =
    cleanText(
      wordInput?.value
    );

  const meaning =
    cleanText(
      meaningInput?.value
    );

  const synonyms =
    cleanText(
      synonymsInput?.value
    );

  const language =
    getSelectedLanguage();


  if (!word) {

    alert(
      "اكتب الكلمة الأول."
    );

    return;

  }


  if (!meaning) {

    alert(
      "المعنى غير موجود."
    );

    return;

  }


  if (!language) {

    alert(
      "اختر لغة الكلمة."
    );

    return;

  }


  /*
     منع التكرار مرة ثانية
     حتى لو المستخدم عدل الكلمة يدويًا.
  */

  const duplicate =
    await checkDuplicate(
      word
    );


  if (
    duplicate.length > 0
  ) {

    const duplicateId =
      duplicate[0].id ??
      "غير معروف";


    alert(
      `الكلمة موجودة بالفعل.\nرقم الـ ID: ${duplicateId}`
    );


    fillForm(
      duplicate[0]
    );


    return;

  }


  try {

    const newId =
      await getNextId();


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


    if (idInput) {

      idInput.value =
        newId;

    }


    currentDocumentId =
      null;


    alert(
      "تم حفظ الكلمة بنجاح."
    );


  } catch (error) {

    console.error(error);

    alert(
      "حصل خطأ أثناء حفظ الكلمة."
    );

  }

}


/* =========================================================
   UPDATE
   ========================================================= */

async function updateWord() {

  if (!currentDocumentId) {

    alert(
      "مفيش كلمة محددة للتحديث."
    );

    return;

  }


  const word =
    cleanText(
      wordInput?.value
    );

  const meaning =
    cleanText(
      meaningInput?.value
    );

  const synonyms =
    cleanText(
      synonymsInput?.value
    );

  const language =
    getSelectedLanguage();


  if (!word) {

    alert(
      "الكلمة لا يمكن أن تكون فارغة."
    );

    return;

  }


  if (!meaning) {

    alert(
      "المعنى لا يمكن أن يكون فارغًا."
    );

    return;

  }


  if (!language) {

    alert(
      "اختر لغة الكلمة."
    );

    return;

  }


  try {

    const wordRef =
      doc(
        db,
        COLLECTION_NAME,
        currentDocumentId
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
      "تم تحديث الكلمة بنجاح."
    );


  } catch (error) {

    console.error(error);

    alert(
      "حصل خطأ أثناء تحديث الكلمة."
    );

  }

}


/* =========================================================
   DELETE
   ========================================================= */

async function deleteWord() {

  if (!currentDocumentId) {

    alert(
      "اختار كلمة موجودة في قاعدة البيانات الأول."
    );

    return;

  }


  const answer =
    confirm(
      "هل أنت متأكد أنك تريد حذف هذه الكلمة؟"
    );


  if (!answer) {

    return;

  }


  try {

    await deleteDoc(
      doc(
        db,
        COLLECTION_NAME,
        currentDocumentId
      )
    );


    alert(
      "تم حذف الكلمة بنجاح."
    );


    await clearForm();


  } catch (error) {

    console.error(error);

    alert(
      "حصل خطأ أثناء حذف الكلمة."
    );

  }

}


/* =========================================================
   CLEAR
   ========================================================= */

async function clearForm() {

  if (idInput) {

    idInput.value =
      "";

  }


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


  if (searchInput) {

    searchInput.value =
      "";

  }


  if (languageSelect) {

    languageSelect.selectedIndex =
      0;

  }


  currentDocumentId =
    null;

  currentDatabaseResults =
    [];

  currentSearchText =
    "";

  currentSearchIndex =
    -1;


  await setNextId();

}


/* =========================================================
   BUTTON EVENTS
   ========================================================= */

if (searchButton) {

  searchButton.addEventListener(
    "click",
    searchWord
  );

}


if (registerButton) {

  registerButton.addEventListener(
    "click",
    registerWord
  );

}


if (updateButton) {

  updateButton.addEventListener(
    "click",
    updateWord
  );

}


if (deleteButton) {

  deleteButton.addEventListener(
    "click",
    deleteWord
  );

}


if (clearButton) {

  clearButton.addEventListener(
    "click",
    clearForm
  );

}


/* =========================================================
   ENTER TO SEARCH
   ========================================================= */

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


/* =========================================================
   START
   ========================================================= */

setNextId();