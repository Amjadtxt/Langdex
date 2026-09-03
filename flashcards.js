// flashcards.js - ملف منفصل لجلب وعرض كلمات المستخدم الحالي في الفلاش كاردز

let userWords = [];
let currentIndex = 0;

document.addEventListener("DOMContentLoaded", () => {
  initFlashcards();
  
  // تفعيل أزرار التحكم والضغط على الكارد
  document.getElementById("flashcard").addEventListener("click", toggleCard);
  document.getElementById("flipBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleCard();
  });
  document.getElementById("nextBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    nextCard();
  });
});

async function initFlashcards() {
  try {
    // استبدل هذا السطر بطريقة جلب البيانات الخاصة ببرنامجك (مثلاً من الـ API أو قاعدة البيانات)
    // المشابهة للطريقة التي تستخدمها في جلب الجدول في admin.js
    userWords = await fetchUserWordsFromDatabase();

    if (!userWords || userWords.length === 0) {
      document.getElementById("cardWord").innerText = "لا توجد كلمات مسجلة!";
      document.getElementById("quizProgress").innerText = "قم بإضافة كلمات جديدة من لوحة التحكم أولاً";
      document.getElementById("nextBtn").style.display = "none";
      document.getElementById("flipBtn").style.display = "none";
      return;
    }

    loadCard();
  } catch (error) {
    console.error("خطأ في تحميل الكلمات:", error);
    document.getElementById("cardWord").innerText = "حدث خطأ بالتحميل";
  }
}

// دالة افتراضية لجلب كلمات اليوزر الحالي (قم بتعديلها لتتطابق مع دالة جلب البيانات لديك)
async function fetchUserWordsFromDatabase() {
  // مثال: لو كنت تخزن البيانات في LocalStorage أو تطلبها عبر Fetch API لليوزر الحالي
  // const response = await fetch('/api/user-words');
  // return await response.json();
  
  // كمثال تجريبي مبني على بياناتك: تأكد من ربطها بالبيانات الحقيقية للمستخدم الفاتح
  const storedData = localStorage.getItem("langdex_words"); 
  if (storedData) {
    return JSON.parse(storedData);
  }
  
  // بيانات افتراضية في حال لم تجد شيء
  return [
    { word: "مثال", meaning: "Example", synonym: "نموذج", lang: "العربية / الإنجليزية" }
  ];
}

function loadCard() {
  if (userWords.length === 0) return;
  
  const card = userWords[currentIndex];
  document.getElementById('cardWord').innerText = card.word || card.الكلمة || "-";
  document.getElementById('cardMeaning').innerText = card.meaning || card.المعنى || "-";
  document.getElementById('cardSynonym').innerText = "المرادف: " + (card.synonym || card.المرادف || "-");
  document.getElementById('cardLang').innerText = "اللغة: " + (card.lang || card.اللغة || "-");
  document.getElementById('quizProgress').innerText = `الكلمة ${currentIndex + 1} من ${userWords.length}`;
  
  document.getElementById('flashcard').classList.remove('flipped');
}

function toggleCard() {
  if (userWords.length === 0) return;
  document.getElementById('flashcard').classList.toggle('flipped');
}

function nextCard() {
  if (userWords.length === 0) return;
  currentIndex = (currentIndex + 1) % userWords.length;
  loadCard();
}
