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

    let apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
        apiKey = prompt("أدخل مفتاح OpenAI API الخاص بك:");
        if (!apiKey || !apiKey.trim()) {
            alert("مفتاح الـ API مطلوب لتتم الترجمة!");
            return;
        }
        localStorage.setItem('openai_api_key', apiKey.trim());
    }

    btn.disabled = true;
    btn.textContent = "جاري سحب القاموس والمعالجة الذكية...";
    resultContainer.style.display = 'none';

    try {
        // 1. محاولة سحب الكلمات من الفايربيز
        const querySnapshot = await getDocs(collection(db, "words"));
        const wordsList = [];
        querySnapshot.forEach((doc) => {
            wordsList.path ? null : wordsList.push(doc.data()); // ضمان إضافة البيانات
        });
        
        // لو الكوليكشن فاضي أو حصلت مشكلة صامتة
        if (querySnapshot.empty) {
            alert("تنبيه: قاعدة البيانات (words) فارغة حالياً ولا تحتوي على كلمات!");
        }

        // 2. إرسال الطلب لـ OpenAI
        const translatedSentence = await callAiModel(userRequest, direction, wordsList, apiKey);

        resultOutput.textContent = translatedSentence;
        resultContainer.style.display = 'block';

    } catch (error) {
        // معالجة الأخطاء وإظهارها كرسالة واضحة للمستخدم
        if (error.code === 'permission-denied') {
            alert("❌ خطأ صلاحيات (Firebase): غير مسموح لك بقراءة الكلمات، تأكد أنك مسجل دخول.");
        } else if (error.message && error.message.includes("API")) {
            alert("❌ خطأ من OpenAI API: " + error.message + "\n(جرب مسح المفتاح المخزن وإدخاله من جديد)");
            localStorage.removeItem('openai_api_key'); // مسح المفتاح لو تالف
        } else {
            alert("❌ حدث خطأ غير متوقع: " + (error.message || error));
        }
    } finally {
        btn.disabled = false;
        btn.textContent = "ترجمة وتصريف الجملة";
    }
}
