// flashcards.js - جلب الكلمات من Firebase Firestore (Collection: words)

import { db, auth } from './firebase-config.js'; // تأكد إن مسار ملف الـ firebase عندك مظبوط
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-firestore.js"; 
// (ملاحظة: لو مشروعك بيستورد فايرستور بطريقة تانية زي window.firebase أو SDK عادية ظبط الاستيراد حسب مشروعك)

let userWords = [];
let currentIndex = 0;
let score = 0;
let answered = false;

document.addEventListener("DOMContentLoaded", () => {
  initQuiz();
  
  const nextBtn = document.getElementById("nextQuizBtn");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      currentIndex++;
      if (currentIndex < userWords.length) {
        loadQuestion();
      } else {
        showScoreScreen();
      }
    });
  }
});

async function initQuiz() {
  try {
    document.getElementById("questionTitle").innerText = "جاري تحميل كلماتك...";
    document.getElementById("questionSub").innerText = "برجاء الانتظار قليلاً لحين جلب البيانات من قاعدة البيانات.";

    // جلب كلمات اليوزر من الفايربيز
    userWords = await fetchWordsFromFirestore();

    if (!userWords || userWords.length === 0) {
      document.getElementById("questionTitle").innerText = "لا توجد كلمات مسجلة لك!";
      document.getElementById("questionSub").innerText = "أضف كلمات جديدة من لوحة التحكم لتبدأ الاختبار.";
      document.getElementById("quizProgress").innerText = "0 / 0";
      document.getElementById("optionsContainer").innerHTML = "";
      return;
    }

    // خلط الكلمات عشوائياً لبدء الاختبار
    userWords.sort(() => Math.random() - 0.5);
    currentIndex = 0;
    score = 0;
    
    loadQuestion();
  } catch (error) {
    console.error("خطأ في جلب الكلمات من فايربيز:", error);
    document.getElementById("questionTitle").innerText = "حدث خطأ في الاتصال بقاعدة البيانات";
    document.getElementById("questionSub").innerText = "تأكد من اتصالك بالإنترنت وتسجيل الدخول.";
  }
}

// دالة سحب الكلمات من الـ collection اللي اسمها words في الـ Firestore
async function fetchWordsFromFirestore() {
  try {
    const currentUser = auth.currentUser;
    
    // مرجع للـ collection بتاعت الكلمات
    const wordsCollection = collection(db, "words");
    let q = wordsCollection;

    // لو عندك حقل بيربط الكلمة باليوزر (مثل userId أو userEmail أو username) بنعمل فلتر
    // لو الكلمات عامة أو مفيهاش فلتر لليوزر، هتجيب كل الجدول (عدل السطر حسب تصميم قاعدة البيانات عندك)
    if (currentUser) {
      // لو مخزن الـ uid أو الايميل مع كل كلمة:
      q = query(wordsCollection, where("userId", "==", currentUser.uid));
    }

    const querySnapshot = await getDocs(q);
    let wordsArray = [];

    querySnapshot.forEach((doc) => {
      wordsArray.push({ id: doc.id, ...doc.data() });
    });

    // لو الـ query اللي بفلتر اليوزر رجعت فاضية، نجرب نسحب كل الـ words كاحتياطي
    if (wordsArray.length === 0 && currentUser) {
      const allSnapshot = await getDocs(wordsCollection);
      allSnapshot.forEach((doc) => {
        const data = doc.data();
        // فلترة يدوية لو حقل اليوزر باسم تاني زي username أو email
        if (data.user === currentUser.email || data.username === currentUser.email || !data.userId) {
          wordsArray.push({ id: doc.id, ...data });
        }
      });
    }

    return wordsArray;
  } catch (err) {
    console.error("خطأ في الـ Query:", err);
    return [];
  }
}

function loadQuestion() {
  answered = false;
  const nextBtn = document.getElementById("nextQuizBtn");
  if (nextBtn) nextBtn.style.display = "none";
  
  const currentItem = userWords[currentIndex];
  if (!currentItem) return;

  // التعامل مع أسماء الحقول المختلفة في الـ Firestore (مثل word, الكلمة, meaning, المعنى)
  const wordText = currentItem.word || currentItem.الكلمة || currentItem.term || "-";
  const correctMeaning = currentItem.meaning || currentItem.المعنى || currentItem.definition || "-";

  document.getElementById("questionTitle").innerText = wordText;
  document.getElementById("quizProgress").innerText = `السؤال ${currentIndex + 1} من ${userWords.length}`;

  // تجهيز الاختيارات (الإجابة الصحيحة + 3 إجابات خاطئة من نفس كلمات اليوزر)
  let options = [correctMeaning];
  
  let wrongOptions = userWords
    .map(w => w.meaning || w.المعنى || w.definition)
    .filter(m => m && m !== correctMeaning);

  wrongOptions.sort(() => Math.random() - 0.5);
  options = options.concat(wrongOptions.slice(0, 3));
  options.sort(() => Math.random() - 0.5);

  const container = document.getElementById("optionsContainer");
  if (!container) return;
  container.innerHTML = "";

  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn";
    btn.innerText = opt;
    btn.onclick = () => checkAnswer(btn, opt, correctMeaning);
    container.appendChild(btn);
  });
}

function checkAnswer(selectedBtn, selectedOpt, correctOpt) {
  if (answered) return;
  answered = true;

  const allButtons = document.querySelectorAll(".option-btn");

  allButtons.forEach(btn => {
    if (btn.innerText === correctOpt) {
      btn.classList.add("correct");
    }
    if (btn === selectedBtn && selectedOpt !== correctOpt) {
      btn.classList.add("wrong");
    }
  });

  if (selectedOpt === correctOpt) {
    score++;
  }

  const nextBtn = document.getElementById("nextQuizBtn");
  if (nextBtn) nextBtn.style.display = "block";
}

function showScoreScreen() {
  document.getElementById("quizProgress").innerText = "انتهى الاختبار! 🎉";
  document.getElementById("questionTitle").innerText = `نتيجة اختبارك: ${score} من ${userWords.length}`;
  document.getElementById("questionSub").innerText = "أداء ممتاز! يمكنك إعادة الاختبار لتثبيت كلماتك أكثر.";
  
  const container = document.getElementById("optionsContainer");
  if (container) {
    container.innerHTML = `
      <button type="button" class="option-btn" style="background: #2980b9;" onclick="initQuiz()">إعادة الاختبار 🔄</button>
    `;
  }
  
  const nextBtn = document.getElementById("nextQuizBtn");
  if (nextBtn) nextBtn.style.display = "none";
}
