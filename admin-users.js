// ======================================================
// LANGDEX - admin-users.js (Full Enhanced Edition)
// ======================================================

import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs,
    getDoc,
    doc,
    setDoc,
    deleteDoc,
    updateDoc,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";


const firebaseConfig = {
    apiKey: "AIzaSyCKsh43cO6DYwfPheHH9CsraX3VpU2fjc",
    authDomain: "langdex.firebaseapp.com",
    projectId: "langdex",
    storageBucket: "langdex.firebasestorage.app",
    messagingSenderId: "819838317933",
    appId: "1:819838317933:web:cae7f4531ea32f958c5664",
    measurementId: "G-F60CC2CDCJ"
};

const ADMIN_EMAILS = ["amjadtxt@gmail.com"];

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const wordsCollection = collection(db, "words");
const usersCollection = collection(db, "users");

let currentUser = null;
let allUsersData = [];

// نظام الإشعارات المتناسق
function showNotification(message) {
    let notification = document.querySelector(".langdex-notification");
    if (!notification) {
        notification = document.createElement("div");
        notification.className = "langdex-notification";
        document.body.appendChild(notification);
    }
    notification.textContent = message;
    notification.style.cssText = `
        color: #FFFFFF; position: fixed; top: 25px; left: 50%; transform: translateX(-50%);
        z-index: 999999; padding: 12px 22px; border-radius: 10px; font-family: Cairo, Arial, sans-serif;
        font-size: 15px; font-weight: 600; text-align: center; max-width: 90%; background: #222;
        border: 1px solid rgba(255,255,255,0.25); box-shadow: 0 5px 20px rgba(0,0,0,0.3); opacity: 1;
    `;
    clearTimeout(notification._timer);
    notification._timer = setTimeout(() => {
        notification.style.transition = "opacity 0.3s";
        notification.style.opacity = "0";
        setTimeout(() => { if (notification) notification.remove(); }, 300);
    }, 3000);
}

// التحقق من صلاحيات الأدمن أمنياً
async function verifyAdminPermission(user) {
    if (!user || !user.email) return false;
    const email = user.email.toLowerCase();

    if (ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === email)) {
        return true;
    }

    try {
        const customDocId = email.replace(/[^a-zA-Z0-9]/g, "_");
        const userDocRef = doc(db, "users", customDocId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            if (data.role === "admin") return true;
        }
    } catch (err) {
        console.error("Admin role check error:", err);
    }

    return false;
}

// جلب وتحميل بيانات المستخدمين والكلمات وإحصائيات كل لغة
async function loadUsersData() {
    try {
        const usersSnap = await getDocs(usersCollection);
        const wordsSnap = await getDocs(wordsCollection);

        const usersMap = new Map();

        usersSnap.forEach(docSnap => {
            const data = docSnap.data();
            const email = data.email || "";
            if (email) {
                usersMap.set(email.toLowerCase(), {
                    docId: docSnap.id,
                    email: email,
                    role: data.role || "user",
                    wordsCount: 0,
                    languagesMap: {}
                });
            }
        });

        wordsSnap.forEach(docSnap => {
            const data = docSnap.data();
            const email = (data.userEmail || "").toLowerCase();
            const lang = data.language || "أخرى";

            if (email) {
                if (!usersMap.has(email)) {
                    usersMap.set(email, {
                        docId: null,
                        email: data.userEmail,
                        role: "user",
                        wordsCount: 0,
                        languagesMap: {}
                    });
                }
                const userObj = usersMap.get(email);
                userObj.wordsCount++;
                
                if (!userObj.languagesMap[lang]) {
                    userObj.languagesMap[lang] = 0;
                }
                userObj.languagesMap[lang]++;
            }
        });

        allUsersData = [...usersMap.values()];

        // **تثبيت الـ Admin في أول القائمة دائماً**
        allUsersData.sort((a, b) => {
            if (a.role === "admin" && b.role !== "admin") return -1;
            if (a.role !== "admin" && b.role === "admin") return 1;
            return 0;
        });

        renderUsersTable(allUsersData);
    } catch (error) {
        console.error("Error loading users:", error);
        showNotification("حدث خطأ أثناء تحميل البيانات.");
    }
}

function renderUsersTable(usersList) {
    const tableBody = document.querySelector("#users-table-body");
    if (!tableBody) return;

    if (usersList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">لا توجد بيانات مطابقة.</td></tr>`;
        return;
    }

    tableBody.innerHTML = "";

    usersList.forEach((user, index) => {
        const row = document.createElement("tr");
        
        const langsArray = Object.keys(user.languagesMap);
        const langsOptionsHtml = langsArray.map(l => `<option value="${l}">${l} (${user.languagesMap[l]} كلمة)</option>`).join("");

        let langStatsHtml = "-";
        if (langsArray.length > 0) {
            langStatsHtml = langsArray.map(l => `<span style="display:inline-block; background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; margin:2px; font-size:11px;">${l}: <b>${user.languagesMap[l]}</b></span>`).join(" ");
        }

        row.innerHTML = `
            <td style="text-align: center;">${index + 1}</td>
            <td>${user.email}</td>
            <td style="text-align: center;"><b>${user.role}</b></td>
            <td style="text-align: center;">${user.wordsCount} كلمة</td>
            <td style="text-align: center;">${langStatsHtml}</td>
            <td style="text-align: center; display: flex; flex-direction: column; gap: 6px; align-items: center;">
                
                <!-- تحديث الرول -->
                <div style="display: flex; gap: 3px; width: 100%;">
                    <select class="role-select-${index}" style="padding: 3px; font-size: 11px; width: 65%; margin:0;">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>مستخدم عادي (user)</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>مشرف (admin)</option>
                    </select>
                    <button class="upa btn-update-role" data-email="${user.email}" data-docid="${user.docId || ''}" data-index="${index}" style="padding: 4px; font-size: 11px; width: 35%;">تحديث الرول</button>
                </div>

                <button class="upa btn-pdf" data-email="${user.email}" style="padding: 5px 10px; font-size: 11px; width: 100%;">تحميل PDF كلمات الشخص</button>
                
                <div style="display: flex; gap: 3px; width: 100%;">
                    <select class="lang-select-${index}" style="padding: 3px; font-size: 11px; width: 60%; margin:0;">
                        <option value="" disabled selected>اختر لغة للحذف</option>
                        ${langsOptionsHtml}
                    </select>
                    <button class="del btn-delete-lang" data-email="${user.email}" data-index="${index}" style="padding: 5px; font-size: 11px; width: 40%;">حذف تصنيف</button>
                </div>

                <button class="del btn-delete-user" data-email="${user.email}" style="padding: 5px; font-size: 11px; width: 100%; background-color: #b71c1c;">حذف المستخدم نهائياً</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    setupActionEvents();
}

function setupActionEvents() {
    // 1. زر تحديث صلاحية الرول للمستخدم
    document.querySelectorAll(".btn-update-role").forEach(btn => {
        btn.addEventListener("click", async function () {
            const email = this.getAttribute("data-email");
            let docId = this.getAttribute("data-docid");
            const index = this.getAttribute("data-index");
            const selectEl = document.querySelector(`.role-select-${index}`);
            const newRole = selectEl ? selectEl.value : "";

            if (!newRole) return;

            try {
                showNotification("جاري تحديث الرول للمستخدم...");
                
                if (!docId || docId === "null" || docId === "") {
                    docId = email.replace(/[^a-zA-Z0-9]/g, "_");
                }

                const userDocRef = doc(db, "users", docId);
                const docSnap = await getDoc(userDocRef);

                if (docSnap.exists()) {
                    await updateDoc(userDocRef, { role: newRole });
                } else {
                    await setDoc(userDocRef, {
                        email: email,
                        role: newRole,
                        createdAt: serverTimestamp()
                    });
                }

                showNotification(`تم تحديث رول المستخدم (${email}) إلى (${newRole}) بنجاح!`);
                loadUsersData();
            } catch (err) {
                console.error(err);
                showNotification("حدث خطأ أثناء تحديث الرول.");
            }
        });
    });

    // 2. زر تحميل كلمات المستخدم كله PDF
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

                pdf.setFillColor(103, 128, 113);
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

    // 3. زر حذف تصنيف/لغة معينة للمستخدم
    document.querySelectorAll(".btn-delete-lang").forEach(btn => {
        btn.addEventListener("click", async function () {
            const email = this.getAttribute("data-email");
            const index = this.getAttribute("data-index");
            const selectEl = document.querySelector(`.lang-select-${index}`);
            const selectedLang = selectEl ? selectEl.value : "";

            if (!selectedLang) {
                showNotification("الرجاء اختيار اللغة/التصنيف المراد حذفه أولاً.");
                return;
            }

            if (!confirm(`هل أنت متأكد من حذف جميع كلمات تصنيف (${selectedLang}) الخاصة بالمستخدم (${email})؟`)) return;

            try {
                showNotification("جاري حذف التصنيف...");
                const q = query(wordsCollection, where("userEmail", "==", email), where("language", "==", selectedLang));
                const snap = await getDocs(q);
                const promises = [];
                snap.forEach(d => promises.push(deleteDoc(doc(db, "words", d.id))));
                await Promise.all(promises);

                showNotification(`تم حذف كلمات تصنيف (${selectedLang}) بنجاح.`);
                loadUsersData();
            } catch (err) {
                console.error(err);
                showNotification("حدث خطأ أثناء حذف التصنيف.");
            }
        });
    });

    // 4. زر حذف المستخدم تماماً
    document.querySelectorAll(".btn-delete-user").forEach(btn => {
        btn.addEventListener("click", async function () {
            const email = this.getAttribute("data-email");
            if (!confirm(`هل أنت متأكد من حذف المستخدم (${email}) من النظام؟`)) return;

            try {
                showNotification("جاري الحذف...");
                const userObj = allUsersData.find(u => u.email.toLowerCase() === email.toLowerCase());
                if (userObj && userObj.docId) {
                    await deleteDoc(doc(db, "users", userObj.docId));
                }
                const q = query(wordsCollection, where("userEmail", "==", email));
                const snap = await getDocs(q);
                const promises = [];
                snap.forEach(d => promises.push(deleteDoc(doc(db, "words", d.id))));
                await Promise.all(promises);

                showNotification("تم حذف المستخدم وكل سجلاته بنجاح.");
                loadUsersData();
            } catch (err) {
                console.error(err);
                showNotification("حدث خطأ أثناء الحذف.");
            }
        });
    });
}

// إضافة يوزر جديد
const addUserBtn = document.querySelector("#add-user-btn");
if (addUserBtn) {
    addUserBtn.addEventListener("click", async function () {
        const emailInput = document.querySelector("#new-user-email");
        const passwordInput = document.querySelector("#new-user-password");
        const roleSelect = document.querySelector("#new-user-role");

        const email = emailInput ? emailInput.value.trim() : "";
        const password = passwordInput ? passwordInput.value.trim() : "";
        const role = roleSelect ? roleSelect.value : "";

        if (!email || !password || !role) {
            showNotification("الرجاء إدخال البريد، كلمة المرور، وتحديد الرول.");
            return;
        }

        try {
            showNotification("جاري إنشاء وإضافة المستخدم...");
            await createUserWithEmailAndPassword(auth, email, password);

            const customDocId = email.replace(/[^a-zA-Z0-9]/g, "_");
            await setDoc(doc(db, "users", customDocId), {
                email: email,
                role: role,
                createdAt: serverTimestamp()
            });

            showNotification("تمت إضافة المستخدم بنجاح!");
            emailInput.value = "";
            passwordInput.value = "";
            roleSelect.selectedIndex = 0;
            loadUsersData();
        } catch (err) {
            console.error(err);
            showNotification("حدث خطأ أثناء إضافة المستخدم (ربما البريد مستخدم مسبقاً أو الرمز قصير).");
        }
    });
}

// البحث
const searchInput = document.querySelector("#search-user-input");
if (searchInput) {
    searchInput.addEventListener("input", function () {
        const term = this.value.trim().toLowerCase();
        if (!term) {
            renderUsersTable(allUsersData);
            return;
        }
        const filtered = allUsersData.filter(u => u.email.toLowerCase().includes(term));
        renderUsersTable(filtered);
    });
}

// التحقق الأمني عند تحميل الصفحة وتحويل غير الأدمن فوراً بدون تنبيه
onAuthStateChanged(auth, async user => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    currentUser = user;

    const isAdmin = await verifyAdminPermission(user);
    if (!isAdmin) {
        window.location.href = "index.html"; // تحويل فوري وصامت
        return;
    }

    await loadUsersData();
});
