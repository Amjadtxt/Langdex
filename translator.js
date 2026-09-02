import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCKsh43cO6DYwfPheHH9CsraX3VpU2fjc",
    authDomain: "langdex.firebaseapp.com",
    projectId: "langdex",
    storageBucket: "langdex.firebasestorage.app",
    messagingSenderId: "819838317933",
    appId: "1:819838317933:web:cae7f4531ea32f958c5664",
    measurementId: "G-F60CC2CDCJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ربط الزر بالوظيفة بدل استخدام onclick في الـ HTML
document.addEventListener("DOMContentLoaded", () => {
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', handleTranslation);
    }
});

async function handleTranslation() {
    const btn = document.getElementById('generateBtn');
    const resultContainer = document.getElementById('resultContainer');
    const resultOutput = document.getElementById('resultOutput');
    const userRequest = document.getElementById('userRequest').value;
    const direction = document.getElementById('translationDirection').value;

    if (!userRequest.trim()) {
        alert("برجاء كتابة جملة أولاً!");
        return;
    }

    btn.disabled = true;
    btn.textContent = "جاري سحب القاموس والمعالجة الذكية...";
    resultContainer.style.display = 'none';

    try {
        const querySnapshot = await getDocs(collection(db, "words"));
        const wordsList = [];
        querySnapshot.forEach((doc) => {
            wordsList.push(doc.data());
        });

        const translatedSentence = await callAiModel(userRequest, direction, wordsList);

        resultOutput.textContent = translatedSentence;
        resultContainer.style.display = 'block';

    } catch (error) {
        console.error("خطأ:", error);
        alert("حدث خطأ أثناء الاتصال بقاعدة البيانات أو معالجة الطلب.");
    } finally {
        btn.disabled = false;
        btn.textContent = "ترجمة وتصريف الجملة";
    }
}

async function callAiModel(requestText, direction, words) {
    const apiKey = "YOUR_AI_API_KEY"; // حط مفتاح الـ OpenAI هنا

    let directionDescription = "";
    switch(direction) {
        case 'ar-to-hi': directionDescription = "من اللغة العربية إلى اللغة الهندية"; break;
        case 'hi-to-ar': directionDescription = "من اللغة الهندية إلى اللغة العربية"; break;
        case 'ar-to-ur': directionDescription = "من اللغة العربية إلى اللغة الأوردية"; break;
        case 'ur-to-ar': directionDescription = "من اللغة الأوردية إلى اللغة العربية"; break;
        case 'hi-to-ur': directionDescription = "من اللغة الهندية إلى اللغة الأوردية"; break;
        case 'ur-to-hi': directionDescription = "من اللغة الأوردية إلى اللغة الهندية"; break;
    }

    const systemPrompt = `أنت لغوي خبير ومتخصص في اللغات العربية، الهندية، والأوردو.
    هذه قاعدة بيانات الكلمات والمفردات المتاحة لدينا في النظام (كوليكشن words): ${JSON.stringify(words)}.
    مهمتك: ترجمة وصياغة الجملة المطلوبة ${directionDescription} بدقة شديدة.
    - التزم التام بقواعد النحو والتصريف الصحيحة للغة المستهدفة (الأزمنة، التذكير والتأنيث، والضمائر).
    - استعن بالقاموس المرفق من قاعدة البيانات للمفردات الأساسية والأفعال.
    - أظهر الجملة النهائية المترجمة فقط بدون أي مقدمات أو شرح إضافي.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: requestText }
            ]
        })
    });

    const data = await response.json();
    return data.choices[0].message.content;
}
