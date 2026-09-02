// ======================================================
// DOWNLOAD PDF (Lightning Fast & Independent of Table Display)
// ======================================================

if (downloadPdfButton) {
    downloadPdfButton.addEventListener("click", async function () {
        if (!currentUser) {
            showNotification("يجب تسجيل الدخول أولاً.");
            return;
        }

        try {
            showNotification("جاري جلب البيانات وتجهيز ملف الـ PDF فوراً...");

            // جلب البيانات مباشرة بغض النظر عن ما إذا كانت معروضة في الجدول أم لا
            const freshRows = await getAllWords();
            let selectedLanguage = languageFilter ? languageFilter.value.trim() : "all";
            let rows = freshRows;

            if (selectedLanguage !== "all" && selectedLanguage !== "") {
                rows = freshRows.filter(item => normalize(item.language) === normalize(selectedLanguage));
            }

            if (rows.length === 0) {
                showNotification("لا توجد بيانات لتحميلها.");
                return;
            }

            const isAdmin = isCurrentUserAdmin();
            const selectedLanguageText = (languageFilter && languageFilter.options[languageFilter.selectedIndex])
                ? languageFilter.options[languageFilter.selectedIndex].textContent
                : "جميع اللغات";

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF("p", "mm", "a4");

            const chunkSize = 30; // 30 صف في كل صفحة
            const totalChunks = Math.ceil(rows.length / chunkSize);

            // عنصر مخفي واحد نهائي للرسم السريع
            const printArea = document.createElement("div");
            printArea.style.cssText = `
                position: fixed;
                top: -9999px;
                left: -9999px;
                width: 800px;
                background: #ffffff;
                color: #000000;
                padding: 20px;
                font-family: Cairo, Arial, sans-serif;
                direction: rtl;
                z-index: -9999;
            `;
            document.body.appendChild(printArea);

            for (let i = 0; i < totalChunks; i++) {
                const chunkRows = rows.slice(i * chunkSize, (i + 1) * chunkSize);

                printArea.innerHTML = `
                    <div style="text-align: center; margin-bottom: 15px;">
                        <h2 style="margin:0; font-size: 20px; color: #000;">Langdex Report ${isAdmin ? '(Admin All Data)' : ''}</h2>
                        <p style="margin:3px 0; font-size: 13px; color: #333;">اللغة: ${selectedLanguageText} (صفحة ${i + 1} من ${totalChunks})</p>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px; color: #000; background: #ffffff;">
                        <thead>
                            <tr style="background-color: #b5b5b5;">
                                <th style="border: 1px solid #333; padding: 5px; width: 8%;">#</th>
                                <th style="border: 1px solid #333; padding: 5px; width: 22%;">الكلمة</th>
                                <th style="border: 1px solid #333; padding: 5px; width: 28%;">المعنى</th>
                                <th style="border: 1px solid #333; padding: 5px; width: 18%;">المرادف</th>
                                <th style="border: 1px solid #333; padding: 5px; width: 14%;">اللغة</th>
                                ${isAdmin ? '<th style="border: 1px solid #333; padding: 5px; width: 10%;">المستخدم</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>
                            ${chunkRows.map((item, idx) => `
                                <tr>
                                    <td style="border: 1px solid #333; padding: 4px; text-align: center;">${(i * chunkSize) + idx + 1}</td>
                                    <td style="border: 1px solid #333; padding: 4px;">${item.word || '-'}</td>
                                    <td style="border: 1px solid #333; padding: 4px;">${item.meaning || '-'}</td>
                                    <td style="border: 1px solid #333; padding: 4px;">${item.synonyms || '-'}</td>
                                    <td style="border: 1px solid #333; padding: 4px; text-align: center;">${item.language || '-'}</td>
                                    ${isAdmin ? `<td style="border: 1px solid #333; padding: 4px; text-align: center;">${item.userEmail || item.username || '-'}</td>` : ''}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;

                // تقليل وقت الانتظار إلى الحد الأدنى المطلق لضمان السرعة القصوى مع الكميات الهائلة
                await new Promise(resolve => setTimeout(resolve, 10));

                const canvas = await html2canvas(printArea, {
                    scale: 1.25, // ضبط مقياس دقة متوازن للسرعة والوضوح
                    backgroundColor: "#ffffff",
                    useCORS: true,
                    logging: false
                });

                const imgData = canvas.toDataURL("image/jpeg", 0.8);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                if (i > 0) {
                    pdf.addPage();
                }

                pdf.addImage(imgData, "JPEG", 0, 10, pdfWidth, pdfHeight);
            }
            
            printArea.remove();

            const safeLanguage = selectedLanguageText.replace(/[\\/:*?"<>|]/g, "-");
            pdf.save(`Langdex-${safeLanguage}.pdf`);

            showNotification("تم تحميل ملف الـ PDF بسرعة فائقة بنجاح!");
        } catch (error) {
            console.error("PDF Export Error:", error);
            showNotification("حدث خطأ أثناء تصدير الـ PDF.");
        }
    });
}
