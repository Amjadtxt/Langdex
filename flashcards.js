// flashcards.js - نظام اختبارات الاختيار من متعدد بناءً على كلمات المستخدم

let userWords = [];
let currentIndex = 0;
let score = 0;
let answered = false;

document.addEventListener("DOMContentLoaded", () => {
  initQuiz();
  
  document.getElementById("nextQuizBtn").addEventListener("click", () => {
    currentIndex++;
    if (currentIndex < userWords.length) {
      loadQuestion();
    } else {
      showScoreScreen();
    }
  });
});

async function initQuiz() {
  try {
    userWords = await fetchUserWordsFromDatabase();

    if (!userWords || userWords.length === 0) {
      document.getElementById("questionTitle").innerText = "لا توجد كلمات مسجلة!";
      document.getElementById("questionSub").innerText = "أضف كلمات جديدة من لوحة التحكم لتبدأ الاختبار.";
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
    document.getElementById("questionTitle").innerText = "حدث خطأ بالتحميل";
  }
}

// دالة جلب كلمات المستخدم (تأكد من مطابقتها لطريقة جلب البيانات في مشروعك)
async function fetchUserWordsFromDatabase() {
  const storedData = localStorage.getItem("langdex_words"); 
  if (storedData) {
    return JSON.parse(storedData);
  }
  return [
    { word: "Book", meaning: "كتاب" },
    { word: "Maison", meaning: "منزل" },
    { word: "Kitap", meaning: "كتاب" },
    { word: "Water", meaning: "ماء" }
  ];
}

function loadQuestion() {
  answered = false;
  document.getElementById("nextQuizBtn").style.display = "none";
  
  const currentItem = userWords[currentIndex];
  const wordText = currentItem.word || currentItem.الكلمة;
  const correctMeaning = currentItem.meaning || currentItem.المعنى;

  document.getElementById("questionTitle").innerText = wordText;
  document.getElementById("quizProgress").innerText = `السؤال ${currentIndex + 1} من ${userWords.length}`;

  // تجهيز الاختيارات (الإجابة الصحيحة + 3 إجابات خاطئة عشوائية)
  let options = [correctMeaning];
  
  let wrongOptions = userWords
    .map(w => w.meaning || w.المعنى)
    .filter(m => m !== correctMeaning);

  wrongOptions.sort(() => Math.random() - 0.5);
  options = options.concat(wrongOptions.slice(0, 3));
  options.sort(() => Math.random() - 0.5);

  const container = document.getElementById("optionsContainer");
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

  document.getElementById("nextQuizBtn").style.display = "block";
}

function showScoreScreen() {
  document.getElementById("quizProgress").innerText = "انتهى الاختبار! 🎉";
  document.getElementById("questionTitle").innerText = `نتيجة اختبارك: ${score} من ${userWords.length}`;
  document.getElementById("questionSub").innerText = "أداء ممتاز! يمكنك إعادة الاختبار لتثبيت الكلمات أكثر.";
  
  document.getElementById("optionsContainer").innerHTML = `
    <button type="button" class="option-btn" style="background: #2980b9;" onclick="initQuiz()">إعادة الاختبار 🔄</button>
  `;
  document.getElementById("nextQuizBtn").style.display = "none";
}
