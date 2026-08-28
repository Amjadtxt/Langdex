/* =========================================================
   LANGDEX - COMPLETE SCRIPT
   Firebase + Search + Online Search
   English / Hindi / Urdu
   Arabic Meaning
   ========================================================= */


/* =========================
   FIREBASE
   ========================= */

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


/* =========================
   FIREBASE CONFIG
   ========================= */

const firebaseConfig = {
  apiKey: "AIzaSyCKshc43oZ6DYwfPheHH9CsraX3VpU2fjc",
  authDomain: "langdex.firebaseapp.com",
  projectId: "langdex",
  storageBucket: "langdex.firebasestorage.app",
  messagingSenderId: "819838317933",
  appId: "1:819838317933:web:cae7f4531ea32f958c5664",
  measurementId: "G-F60CC2CDCJ"
};


const app = initializeApp(firebaseConfig);

const db = getFirestore(app);


/* =========================
   COLLECTION
   ========================= */

const COLLECTION_NAME = "words";


/* =========================
   HTML ELEMENTS
   ========================= */

const searchInput =
  document.querySelector(".search-txt");

const searchButton =
  document.querySelector(".search-btn");

const form =
  document.querySelector(".form");

const inputs =
  form.querySelectorAll("input");

const idInput =
  inputs[0];

const wordInput =
  inputs[1];

const meaningInput =
  inputs[2];

const synonymsInput =
  inputs[3];

const languageSelect =
  form.querySelector("select");

const registerButton =
  document.querySelector(".reg");

const updateButton =
  document.querySelector(".upa");

const deleteButton =
  document.querySelector(".del");

const clearButton =
  document.querySelector(".cel");


/* =========================
   STATE
   ========================= */

let currentDocumentId = null;

let currentSearchText = "";

let currentResults = [];

let currentResultIndex = -1;


/* =========================
   LANGUAGE MAP
   ========================= */

const languages = {

  en: "الإنجليزية",

  hi: "الهندية",

  ur: "الأردية"

};


/* =========================
   CLEAN TEXT
   ========================= */

function cleanText(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }

  return String(value).trim();

}


/* =========================
   DETECT LANGUAGE
   ========================= */

function detectLanguage(word) {

  const text =
    cleanText(word);


  /* Hindi */

  if (
    /[\u0900-\u097F]/.test(text)
  ) {

    return "hi";

  }


  /* Urdu */

  if (
    /[\u0600-\u06FF]/.test(text)
  ) {

    return "ur";

  }


  /* English */

  if (
    /[A-Za-z]/.test(text)
  ) {

    return "en";

  }


  return null;

}


/* =========================
   SET LANGUAGE
   ========================= */

function setLanguage(code) {

  if (!languageSelect) {

    return;

  }


  const name =
    languages[code];


  if (!name) {

    return;

  }


  for (
    const option
    of languageSelect.options
  ) {

    if (
      option.textContent.trim() === name
    ) {

      option.selected = true;

      return;

    }

  }

}


/* =========================
   GET LANGUAGE
   ========================= */

function getLanguage() {

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


/* =========================
   TRANSLATION
   ========================= */

async function translate(
  text,
  source,
  target
) {

  const value =
    cleanText(text);


  if (!value) {

    return "";

  }


  if (source === target) {

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
        "Translation failed"
      );

    }


    const data =
      await response.json();


    return cleanText(
      data?.responseData?.translatedText
    );

  } catch (error) {

    console.error(
      "Translation error:",
      error
    );

    return "";

  }

}


/* =========================
   ENGLISH SYNONYMS
   ========================= */

async function getEnglishSynonyms(
  word
) {

  try {

    const url =
      "https://api.datamuse.com/words" +
      "?rel_syn=" +
      encodeURIComponent(word) +
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
      "Synonym error:",
      error
    );

    return [];

  }

}


/* =========================
   ONLINE ENGLISH
   ========================= */

async function getEnglishData(
  word
) {

  try {

    const url =
      "https://api.dictionaryapi.dev/api/v2/entries/en/" +
      encodeURIComponent(word);


    const response =
      await fetch(url);


    if (!response.ok) {

      return null;

    }


    const data =
      await response.json();


    const entry =
      data?.[0];


    if (!entry) {

      return null;

    }


    let definition = "";


    for (
      const meaning
      of entry.meanings || []
    ) {

      for (
        const item
        of meaning.definitions || []
      ) {

        if (
          item.definition
        ) {

          definition =
            item.definition;

          break;

        }

      }


      if (definition) {

        break;

      }

    }


    const arabicMeaning =
      await translate(
        definition,
        "en",
        "ar"
      );


    let synonyms = [];


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
        const item
        of meaning.definitions || []
      ) {

        if (
          Array.isArray(
            item.synonyms
          )
        ) {

          synonyms.push(
            ...item.synonyms
          );

        }

      }

    }


    if (
      synonyms.length === 0
    ) {

      synonyms =
        await getEnglishSynonyms(
          word
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
        entry.word || word,

      meaning:
        arabicMeaning,

      synonyms:
        synonyms.join(", "),

      language:
        "en"

    };

  } catch (error) {

    console.error(error);

    return null;

  }

}


/* =========================
   ONLINE HINDI / URDU
   ========================= */

async function getIndicData(
  word,
  language
) {

  try {

    /*
       الكلمة الأصلية
       → عربي
    */

    const arabicMeaning =
      await translate(
        word,
        language,
        "ar"
      );


    /*
       الكلمة الأصلية
       → English
       عشان نقدر نجيب synonyms
    */

    const englishWord =
      await translate(
        word,
        language,
        "en"
      );


    let synonyms = "";


    if (englishWord) {

      const englishSynonyms =
        await getEnglishSynonyms(
          englishWord
        );


      if (
        englishSynonyms.length > 0
      ) {

        synonyms =
          await translate(
            englishSynonyms.join(", "),
            "en",
            language
          );

      }

    }


    return {

      word:
        word,

      meaning:
        arabicMeaning,

      synonyms:
        synonyms,

      language:
        language

    };

  } catch (error) {

    console.error(error);

    return null;

  }

}


/* =========================
   ONLINE SEARCH
   ========================= */

async function searchOnline(
  word
) {

  const language =
    detectLanguage(word);


  if (!language) {

    alert(
      "لم أستطع تحديد لغة الكلمة."
    );

    return null;

  }


  if (
    language === "en"
  ) {

    return await getEnglishData(
      word
    );

  }


  return await getIndicData(
    word,
    language
  );

}


/* =========================
   GET ALL DATABASE DATA
   ========================= */

async function getDatabaseData() {

  try {

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

        results.push({

          documentId:
            item.id,

          ...item.data()

        });

      }
    );


    return results;

  } catch (error) {

    console.error(error);

    alert(
      "حدث خطأ أثناء الاتصال بقاعدة البيانات."
    );

    return [];

  }

}


/* =========================
   SEARCH DATABASE
   ========================= */

async function searchDatabase(
  word
) {

  const value =
    cleanText(word).toLowerCase();


  const data =
    await getDatabaseData();


  return data.filter(
    item =>
      cleanText(
        item.word
      ).toLowerCase() === value
  );

}


/* =========================
   GET NEXT ID
   ========================= */

async function getNextId() {

  const data =
    await getDatabaseData();


  let maxId = 0;


  data.forEach(
    item => {

      const number =
        Number(item.id);


      if (
        Number.isFinite(number) &&
        number > maxId
      ) {

        maxId = number;

      }

    }
  );


  return maxId + 1;

}


/* =========================
   FILL FORM
   ========================= */

function fillForm(
  data
) {

  if (!data) {

    return;

  }


  idInput.value =
    data.id ?? "";


  wordInput.value =
    data.word ?? "";


  meaningInput.value =
    data.meaning ?? "";


  synonymsInput.value =
    data.synonyms ?? "";


  setLanguage(
    data.language
  );


  currentDocumentId =
    data.documentId || null;

}


/* =========================
   SEARCH BUTTON
   ========================= */

async function handleSearch() {

  const word =
    cleanText(
      searchInput.value
    );


  if (!word) {

    alert(
      "اكتب كلمة للبحث."
    );

    return;

  }


  /*
     نفس الكلمة:
     اعرض النتيجة التالية
  */

  if (
    currentSearchText ===
    word.toLowerCase() &&
    currentResults.length > 0
  ) {

    currentResultIndex++;


    if (
      currentResultIndex <
      currentResults.length
    ) {

      fillForm(
        currentResults[
          currentResultIndex
        ]
      );


      alert(
        "تم عرض النتيجة التالية."
      );

      return;

    }


    /*
       خلصت نتائج Firebase
    */

    alert(
      "لا توجد نتائج أخرى لهذه الكلمة."
    );

    return;

  }


  /*
     بحث جديد
  */

  currentSearchText =
    word.toLowerCase();


  currentResultIndex =
    -1;


  currentResults =
    await searchDatabase(
      word
    );


  /*
     موجودة
  */

  if (
    currentResults.length > 0
  ) {

    currentResultIndex =
      0;


    fillForm(
      currentResults[0]
    );


    alert(
      "الكلمة موجودة بالفعل في قاعدة البيانات.\nيمكنك تحديثها أو حذفها، ولا يمكنك حفظها مرة أخرى."
    );


    return;

  }


  /*
     غير موجودة
     → Online
  */

  alert(
    "الكلمة غير موجودة في قاعدة البيانات.\nجاري البحث عنها على الإنترنت..."
  );


  const onlineData =
    await searchOnline(
      word
    );


  if (!onlineData) {

    alert(
      "لم أجد معلومات كافية عن هذه الكلمة."
    );

    return;

  }


  /*
     تعبئة الفورم
  */

  wordInput.value =
    onlineData.word;


  meaningInput.value =
    onlineData.meaning;


  synonymsInput.value =
    onlineData.synonyms;


  setLanguage(
    onlineData.language
  );


  currentDocumentId =
    null;


  const nextId =
    await getNextId();


  idInput.value =
    nextId;


  alert(
    "تم العثور على الكلمة.\nتم وضع المعنى بالعربية والمرادفات في الفورم.\nيمكنك الآن حفظها."
  );

}


/* =========================
   REGISTER
   ========================= */

async function registerWord() {

  /*
     ممنوع Generate/Hفظ
     لو الكلمة موجودة
  */

  if (currentDocumentId) {

    alert(
      "لا يمكنك حفظ هذه الكلمة لأنها موجودة بالفعل.\nاستخدم تحديث أو حذف."
    );

    return;

  }


  const word =
    cleanText(
      wordInput.value
    );


  const meaning =
    cleanText(
      meaningInput.value
    );


  const synonyms =
    cleanText(
      synonymsInput.value
    );


  const language =
    getLanguage();


  if (!word) {

    alert(
      "اكتب الكلمة."
    );

    return;

  }


  if (!meaning) {

    alert(
      "اكتب المعنى بالعربية."
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
     منع التكرار
  */

  const duplicate =
    await searchDatabase(
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

    const id =
      await getNextId();


    await addDoc(
      collection(
        db,
        COLLECTION_NAME
      ),
      {

        id:
          id,

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


    idInput.value =
      id;


    currentDocumentId =
      null;


    alert(
      "تم حفظ الكلمة بنجاح."
    );


  } catch (error) {

    console.error(error);

    alert(
      "حدث خطأ أثناء حفظ الكلمة."
    );

  }

}


/* =========================
   UPDATE
   ========================= */

async function updateWord() {

  if (!currentDocumentId) {

    alert(
      "اختر كلمة موجودة في قاعدة البيانات أولًا."
    );

    return;

  }


  const word =
    cleanText(
      wordInput.value
    );


  const meaning =
    cleanText(
      meaningInput.value
    );


  const synonyms =
    cleanText(
      synonymsInput.value
    );


  const language =
    getLanguage();


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

    const reference =
      doc(
        db,
        COLLECTION_NAME,
        currentDocumentId
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
      "تم تحديث الكلمة بنجاح."
    );


  } catch (error) {

    console.error(error);

    alert(
      "حدث خطأ أثناء تحديث الكلمة."
    );

  }

}


/* =========================
   DELETE
   ========================= */

async function deleteWord() {

  if (!currentDocumentId) {

    alert(
      "اختر كلمة من قاعدة البيانات أولًا."
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
      "حدث خطأ أثناء حذف الكلمة."
    );

  }

}


/* =========================
   CLEAR
   ========================= */

async function clearForm() {

  idInput.value =
    "";


  wordInput.value =
    "";


  meaningInput.value =
    "";


  synonymsInput.value =
    "";


  searchInput.value =
    "";


  languageSelect.selectedIndex =
    0;


  currentDocumentId =
    null;


  currentSearchText =
    "";


  currentResults =
    [];


  currentResultIndex =
    -1;


  const nextId =
    await getNextId();


  idInput.value =
    nextId;

}


/* =========================
   EVENTS
   ========================= */

searchButton.addEventListener(
  "click",
  handleSearch
);


registerButton.addEventListener(
  "click",
  registerWord
);


updateButton.addEventListener(
  "click",
  updateWord
);


deleteButton.addEventListener(
  "click",
  deleteWord
);


clearButton.addEventListener(
  "click",
  clearForm
);


/* =========================
   ENTER SEARCH
   ========================= */

searchInput.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Enter"
    ) {

      event.preventDefault();

      handleSearch();

    }

  }
);


/* =========================
   START
   ========================= */

(async function start() {

  try {

    const nextId =
      await getNextId();


    idInput.value =
      nextId;

  } catch (error) {

    console.error(error);

  }

})();