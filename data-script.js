// تصدير PDF خاص ببيانات المستخدم المعروضة مع ضبط كامل للعرض والنصوص الطويلة والـ Padding
async function exportUserPdf() {
    if (!currentFilteredData || currentFilteredData.length === 0) {
        showNotification("لا توجد بيانات لتصديرها.");
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        doc.addFont("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf", "Roboto", "normal");
        doc.setFont("Roboto");

        doc.setFontSize(16);
        doc.text("Langdex - My Personal Words Report", 148, 12, { align: "center" });
        
        doc.setFontSize(10);
        doc.text(`Exported Date: ${new Date().toLocaleDateString()}`, 148, 18, { align: "center" });

        let y = 28;
        doc.setFontSize(10);

        // رأس الجدول
        doc.setFillColor(103, 128, 113);
        doc.rect(10, y, 277, 9, "F");
        doc.setTextColor(255, 255, 255);
        
        doc.text("ID", 14, y + 6);
        doc.text("الكلمة (Word)", 32, y + 6);
        doc.text("المعنى (Meaning)", 82, y + 6);
        doc.text("المرادف (Synonyms)", 152, y + 6);
        doc.text("اللغة (Lang)", 215, y + 6);
        doc.text("تاريخ التسجيل", 245, y + 6);

        y += 12; // مسافة رأسية مريحة بعد الرأس
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);

        currentFilteredData.forEach((item) => {
            const idStr = String(item.id || "-");
            const wordStr = String(item.word || "-");
            const meaningStr = String(item.meaning || "-");
            const synonymsStr = String(item.synonyms || "-");
            const langStr = String(item.language || "-");
            const dateStr = formatTimestamp(item.createdAt);

            // تقسيم النصوص الطويلة لسطور متعددة لمنع اختفائها وضمان ظهورها كاملة بالـ Padding المناسب
            const splitMeaning = doc.splitTextToSize(meaningStr, 65);
            const splitSynonyms = doc.splitTextToSize(synonymsStr, 58);
            const splitWord = doc.splitTextToSize(wordStr, 45);

            // حساب أقصى ارتفاع للسطور في هذا الصف بناءً على النص الأطول
            const maxLines = Math.max(splitMeaning.length, splitSynonyms.length, splitWord.length, 1);
            const rowHeight = maxLines * 6 + 4; // تظبيط الـ padding والارتفاع الديناميكي للرقم

            // التحقق من نهاية الصفحة لإضافة صفحة جديدة تلقائياً
            if (y + rowHeight > 190) {
                doc.addPage();
                y = 20;
            }

            // كتابة بيانات الصف مع الـ maxWidth المناسب لكل عمود
            doc.text(idStr, 14, y + 4);
            doc.text(splitWord, 32, y + 4);
            doc.text(splitMeaning, 82, y + 4);
            doc.text(splitSynonyms, 152, y + 4);
            doc.text(langStr, 215, y + 4, { maxWidth: 28 });
            doc.text(dateStr, 245, y + 4);

            y += rowHeight + 2; // مسافة فاصلة مريحة بين الصفوف
            doc.setDrawColor(220, 220, 220);
            doc.line(10, y - 2, 287, y - 2);
        });

        doc.save("my-langdex-words.pdf");
        showNotification("تم تصدير ملف الـ PDF الشخصي بنجاح!");
    } catch (error) {
        console.error("PDF Error:", error);
        showNotification("حدث خطأ أثناء تصدير الـ PDF.");
    }
}
