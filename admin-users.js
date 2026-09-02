    // 1. زر تحميل كلمات المستخدم كله PDF (مصحح ليدعم النصوص بشكل واضح)
    document.querySelectorAll(".btn-pdf").forEach(btn => {
        btn.addEventListener("click", async function () {
            const email = this.getAttribute("data-email");
            try {
                showNotification(`جاري تجهيز PDF لكلمات المستخدم (${email})...`);
                const q = query(wordsCollection, where("userEmail", "==", email));
                const snap = await getDocs(q);
                const userWords = [];
                snap.forEach(d => userWords.push(d.data()));

                if (userWords.length === 0) {
                    showNotification("لا توجد كلمات لهذا المستخدم لتصديرها.");
                    return;
                }

                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF("p", "mm", "a4");

                let yPos = 20;
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(14);
                pdf.text(`Langdex User Report`, 105, yPos, { align: "center" });
                yPos += 8;
                
                pdf.setFontSize(10);
                pdf.setFont("helvetica", "normal");
                pdf.text(`Email: ${email}`, 105, yPos, { align: "center" });
                yPos += 15;

                // ترسيم رأس الجدول
                pdf.setFillColor(103, 128, 113); // نفس لون التصميم #678071
                pdf.rect(15, yPos, 180, 8, "F");
                pdf.setTextColor(255, 255, 255);
                pdf.setFont("helvetica", "bold");
                pdf.text("No.", 20, yPos + 6);
                pdf.text("Word / Term", 45, yPos + 6);
                pdf.text("Meaning / Details", 100, yPos + 6);
                pdf.text("Lang", 175, yPos + 6);
                
                yPos += 10;
                pdf.setTextColor(0, 0, 0);
                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(9);

                userWords.forEach((item, idx) => {
                    if (yPos > 275) {
                        pdf.addPage();
                        yPos = 20;
                    }

                    const wordText = String(item.word || "-");
                    const meaningText = String(item.meaning || item.translation || "-");
                    const langText = String(item.language || "-");

                    pdf.text(String(idx + 1), 20, yPos);
                    pdf.text(wordText.substring(0, 25), 45, yPos);
                    pdf.text(meaningText.substring(0, 45), 100, yPos);
                    pdf.text(langText.substring(0, 15), 175, yPos);

                    yPos += 8;
                    
                    // خط فاصل خفيف بين الصفوف
                    pdf.setDrawColor(220, 220, 220);
                    pdf.line(15, yPos - 2, 195, yPos - 2);
                });

                pdf.save(`Langdex-User-${email.split('@')[0]}.pdf`);
                showNotification("تم تحميل ملف الـ PDF بنجاح!");
            } catch (err) {
                console.error(err);
                showNotification("حدث خطأ أثناء تصدير الـ PDF.");
            }
        });
    });
