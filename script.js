import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================
   FIREBASE
========================= */

const firebaseConfig = {
  apiKey: "AIzaSyCKsh43O6DYwfPheHH9CsraX3VpU2fjc",
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
   GOOGLE APPS SCRIPT
========================= */

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxcWrYiajG8JfYibuc9bBFvDu3pWcGwNmX2fLXJEFWMW_90eHccNqW_4g7c-MvSnUU0lg/exec";


/* =========================
   FIRESTORE COLLECTION
========================= */

const COLLECTION_NAME = "words";


/* =========================
   ELEMENTS
========================= */

const formInputs =
  document.querySelectorAll(".form input");

const idInput = formInputs[0];
const wordInput = formInputs[1];
const meaningInput = formInputs[2];
const synonymInput = formInputs[3];

const languageSelect =
  document.querySelector(".form select");

const searchInput =
  document.querySelector(".search-txt");

const searchButton =
  document.querySelector(".search-btn");

const searchResult =
  document.querySelector(".search-result");

const saveButton =
  document.querySelector(".reg");

const updateButton =
  document.querySelector(".upa");

const deleteButton =
  document.querySelector(".del");

const clearButton =
  document.querySelector(".cel");


/* =========================
   CURRENT DOCUMENT
========================= */

let currentDocumentId = null;


/* =========================
   NORMALIZE
========================= */

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}


/* =========================
   GET NEXT ID
========================= */

async function getNextId() {

  try {

    const snapshot =
      await getDocs(
        collection(db, COLLECTION_NAME)
      );

    let maxId = 0;

    snapshot.forEach((item) => {

      const data = item.data();

      const id = Number(data.id);

      if (
        Number.isFinite(id) &&
        id > maxId
      ) {
        maxId = id;
      }

    });

    return maxId + 1;

  } catch (error) {

    console.error(error);

    return 1;
  }
}


/* =========================
   LOAD ID
========================= */

async function loadNextId() {

  if (currentDocumentId) {
    return;
  }

  idInput.value =
    await getNextId();
}


/* =========================
   FIREBASE SEARCH
========================= */

async function findWord(word) {

  const snapshot =
    await getDocs(
      collection(db, COLLECTION_NAME)
    );

  const target =
    normalize(word);

  const results = [];

  snapshot.forEach((item) => {

    const data = item.data();

    if (
      normalize(data.word) === target
    ) {

      results.push({
        documentId: item.id,
        ...data
      });

    }

  });

  return results;
}


/* =========================
   PUT DATA IN FORM
========================= */

function fillForm(data) {

  currentDocumentId =
    data.documentId || null;

  idInput.value =
    data.id ?? "";

  wordInput.value =
    data.word ?? "";

  meaningInput.value =
    data.meaning ?? "";

  synonymInput.value =
    data.synonyms ?? "";

  const language =
    data.language ?? "";

  for (
    let i = 0;
    i < languageSelect.options.length;
    i++
  ) {

    if (
      languageSelect.options[i].text.trim() ===
      language.trim()
    ) {

      languageSelect.selectedIndex = i;

      break;
    }

  }

}


/* =========================
   SEARCH
========================= */

async function searchWord() {

  const word =
    searchInput.value.trim();

  if (!word) {

    alert("اكتب كلمة للبحث أولاً.");

    return;
  }

  searchResult.textContent =
    "جاري البحث...";

  try {

    /*
      البحث أولاً في Firebase
    */

    const localResults =
      await findWord(word);


    /*
      الكلمة موجودة
    */

    if (localResults.length > 0) {

      fillForm(
        localResults[0]
      );

      searchResult.textContent =
        "تم العثور على الكلمة في قاعدة البيانات.";

      alert(
        "الكلمة موجودة بالفعل في قاعدة البيانات."
      );

      return;
    }


    /*
      الكلمة غير موجودة
      نذهب إلى Gemini
    */

    await searchWithGoogle(word);

  } catch (error) {

    console.error(error);

    searchResult.textContent =
      "";

    alert(
      "حدث خطأ أثناء البحث."
    );

  }

}


/* =========================
   GEMINI SEARCH
========================= */

async function searchWithGoogle(word) {

  searchResult.textContent =
    "جاري البحث في Google باستخدام Gemini...";


  const url =
    GOOGLE_SCRIPT_URL +
    "?word=" +
    encodeURIComponent(word);


  const response =
    await fetch(url);


  if (!response.ok) {

    throw new Error(
      "فشل الاتصال بـ Google."
    );

  }


  const result =
    await response.json();


  if (!result.success) {

    throw new Error(
      result.message ||
      "لم يتم العثور على نتيجة."
    );

  }


  let data = result.data;


  /*
    أحياناً Gemini يرجع JSON
    كنص داخل data
  */

  if (typeof data === "string") {

    try {

      data = JSON.parse(data);

    } catch (error) {

      console.error(
        "JSON غير صالح:",
        data
      );

      throw new Error(
        "Gemini أرسل نتيجة غير مفهومة."
      );

    }

  }


  /*
    تعبئة الفورم
  */

  wordInput.value =
    data.word || word;

  meaningInput.value =
    data.meaningArabic || "";

  if (
    Array.isArray(data.synonyms)
  ) {

    synonymInput.value =
      data.synonyms.join(", ");

  } else {

    synonymInput.value =
      data.synonyms || "";

  }


  /*
    اختيار اللغة
  */

  const language =
    data.language || "";

  let foundLanguage = false;

  for (
    let i = 0;
    i < languageSelect.options.length;
    i++
  ) {

    if (
      languageSelect.options[i].text.trim() ===
      language.trim()
    ) {

      languageSelect.selectedIndex =
        i;

      foundLanguage = true;

      break;
    }

  }


  /*
    لو Gemini رجع لغة مختلفة
    نحاول مطابقتها
  */

  if (!foundLanguage) {

    const lower =
      language.toLowerCase();

    if (
      lower.includes("english")
    ) {

      languageSelect.value =
        "الإنجليزية";

    } else if (
      lower.includes("urdu")
    ) {

      languageSelect.value =
        "الأردية";

    } else if (
      lower.includes("hindi")
    ) {

      languageSelect.value =
        "الهندية";
    }

  }


  /*
    الكلمة الجديدة
    لم تحفظ بعد
  */

  currentDocumentId = null;

  idInput.value =
    await getNextId();


  searchResult.textContent =
    "تم العثور على البيانات. راجعها ثم اضغط حفظ.";

  alert(
    "تم العثور على الكلمة وتعبئة البيانات.\nراجع البيانات ثم اضغط حفظ."
  );

}


/* =========================
   SAVE
========================= */

async function saveWord() {

  const word =
    wordInput.value.trim();

  const meaning =
    meaningInput.value.trim();

  const synonyms =
    synonymInput.value.trim();

  const language =
    languageSelect.value.trim();


  if (!word) {

    alert("اكتب الكلمة.");

    return;
  }


  if (!meaning) {

    alert("اكتب المعنى بالعربي.");

    return;
  }


  if (!language) {

    alert("اختر اللغة.");

    return;
  }


  try {

    /*
      منع تكرار الكلمة
    */

    const existing =
      await findWord(word);


    if (existing.length > 0) {

      alert(
        "الكلمة موجودة بالفعل.\nID: " +
        existing[0].id
      );

      fillForm(existing[0]);

      return;
    }


    const newId =
      await getNextId();


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


    idInput.value =
      newId;

    currentDocumentId = null;


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
      "ابحث عن كلمة موجودة أولاً."
    );

    return;
  }


  const word =
    wordInput.value.trim();

  const meaning =
    meaningInput.value.trim();

  const synonyms =
    synonymInput.value.trim();

  const language =
    languageSelect.value.trim();


  if (!word) {

    alert("اكتب الكلمة.");

    return;
  }


  if (!meaning) {

    alert("اكتب المعنى بالعربي.");

    return;
  }


  if (!language) {

    alert("اختر اللغة.");

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
        word: word,
        meaning: meaning,
        synonyms: synonyms,
        language: language
      }
    );


    alert(
      "تم تحديث الكلمة بنجاح."
    );


  } catch (error) {

    console.error(error);

    alert(
      "حدث خطأ أثناء التحديث."
    );

  }

}


/* =========================
   DELETE
========================= */

async function deleteWord() {

  if (!currentDocumentId) {

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
      "حدث خطأ أثناء الحذف."
    );

  }

}


/* =========================
   CLEAR
========================= */

async function clearForm() {

  currentDocumentId = null;

  idInput.value = "";
  wordInput.value = "";
  meaningInput.value = "";
  synonymInput.value = "";

  languageSelect.selectedIndex = 0;

  searchResult.textContent = "";

  await loadNextId();

}


/* =========================
   BUTTON EVENTS
========================= */

searchButton.addEventListener(
  "click",
  searchWord
);


saveButton.addEventListener(
  "click",
  saveWord
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
   ENTER
========================= */

searchInput.addEventListener(
  "keydown",
  function (event) {

    if (event.key === "Enter") {

      event.preventDefault();

      searchWord();

    }

  }
);


/* =========================
   START
========================= */

loadNextId();