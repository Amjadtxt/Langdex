// flashcards.js - نظام الاختبارات بكلمات المستخدم الحقيقية

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
    // جلب كلمات المستخدم الحالي
    userWords = await fetchUserWordsFromDatabase();

    if (!userWords || userWords.length === 0) {
      document.getElementById("questionTitle").innerText = "لا توجد كلمات مسجلة!";
      document.getElementById("questionSub").innerText = "قم بإضافة كلمات جديدة من لوحة التحكم الخاصة بك أولاً لتبدأ الاختبار.";
      document.getElementById("quizProgress").innerText = "0 / 0";
      return;
    }

    // خلط الكلمات عشوائياً
    userWords.sort(() => Math.random() - 0.5);
    currentIndex = 0;
    score = 0;
    
    loadQuestion();
  } catch (error) {
    console.error("خطأ في جلب كلمات الاختبار:", error);
    document.getElementById("questionTitle").innerText = "حدث خطأ في تحميل الكلمات";
    document.getElementById("questionSub").innerText = "تأكد من تسجيل الدخول أو وجود بيانات مسجلة.";
  }
}

// دالة جلب كلمات المستخدم المسجل
async function fetchUserWordsFromDatabase() {
  // 1. لو بتخزنهم في الـ localStorage مؤقتاً أثناء الجلسة:
  const storedData = localStorage.getItem("langdex_words") || localStorage.getItem("user_words"); 
  if (storedData) {
    try {
      const parsed = JSON.parse(storedData);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch(e) {}
  }

  // 2. لو بتجيبهم من الـ API أو السيرفر الخاص بك (عدل الرابط حسب مشروعك):
  try {
    const response = await fetch('/api/user/words'); // أو المسار الصحيح عندك
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (e) {
    // لو الـ API مش شغال بنرجع مصفوفة فارغة عشان نتعامل معاها
  }

  // لو مفيش خالص، رجع مصفوفة فارغة عشان يظهر تنبيه للمستخدم
  return [];
}

function loadQuestion() {
  answered = false;
  const nextBtn = document.getElementById("nextQuizBtn");
  if (nextBtn) nextBtn.style.display = "none";
  
  const currentItem = userWords[currentIndex];
  if (!currentItem) return;

  const wordText = currentItem.word || currentItem.الكلمة || "-";
  const correctMeaning = currentItem.meaning || currentItem.المعنى || "-";

  document.getElementById("questionTitle").innerText = wordText;
  document.getElementById("quizProgress").innerText = `السؤال ${currentIndex + 1} من ${userWords.length}`;

  // تجهيز الاختيارات (الإجابة الصحيحة + 3 إجابات خاطئة من كلمات المستخدم نفسه)
  let options = [correctMeaning];
  
  let wrongOptions = userWords
    .map(w => w.meaning || w.المعنى)
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
