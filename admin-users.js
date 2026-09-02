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

// التحقق من صلاحيات الأدمن أمنياً وطرد غير المعتمدين
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

// جلب وتحميل بيانات المستخدمين والكلمات واللغات
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
                    languages: new Set()
                });
            }
        });

        wordsSnap.forEach(docSnap => {
            const data = docSnap.data();
            const email = (data.userEmail || "").toLowerCase();
            const lang = data.language || "";

            if (email) {
                if (!usersMap.has(email)) {
                    usersMap.set(email, {
                        docId: null,
                        email: data.userEmail,
                        role: "user",
                        wordsCount: 0,
                        languages: new Set()
                    });
                }
                const userObj = usersMap.get(email);
                userObj.wordsCount++;
                if (lang) userObj.languages.add(lang);
            }
        });

        allUsersData = [...usersMap.values()];
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
        const langsArray = user.languages instanceof Set ? [...user.languages] : [];
        const langsOptionsHtml = langsArray.map(l => `<option value="${l}">${l}</option>`).join("");

        row.innerHTML = `
            <td style="text-align: center;">${index + 1}</td>
            <td>${user.email}</td>
            <td style="text-align: center;"><b>${user.role}</b></td>
            <td style="text-align: center;">${user.wordsCount} كلمة</td>
            <td style="text-align: center;">${langsArray.length > 0 ? langsArray.join("، ") : "-"}</td>
            <td style="text-align: center; display: flex; flex-direction: column; gap: 5px; align-items: center;">
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
    // 1. زر تحميل كلمات المستخدم كله PDF
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

                // توليد جدول مبسط وسريع للـ PDF
                let yPos = 20;
                pdf.setFontSize(16);
                pdf.text(`Langdex User Report: ${email}`, 105, yPos, { align: "center" });
                yPos += 15;

                pdf.setFontSize(10);
                userWords.forEach((item, idx) => {
                    if (yPos > 270) {
                        pdf.addPage();
                        yPos = 20;
                    }
                    pdf.text(`${idx + 1}. الكلمة: ${item.word || '-'} | المعنى: ${item.meaning || '-'} | اللغة: ${item.language || '-'}`, 15, yPos);
                    yPos += 8;
                });

                pdf.save(`Langdex-User-${email.split('@')[0]}.pdf`);
                showNotification("تم تحميل ملف الـ PDF بنجاح!");
            } catch (err) {
                console.error(err);
                showNotification("حدث خطأ أثناء تصدير الـ PDF.");
            }
        });
    });

    // 2. زر حذف تصنيف/لغة معينة للمستخدم
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

    // 3. زر حذف المستخدم تماماً
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
                // حذف كلماته أيضاً
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

// إضافة يوزر جديد (مع إنشاء الحساب بالباسورد في Auth وحفظه في users collection)
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
            // إنشاء المستخدم في النظام Authentication
            await createUserWithEmailAndPassword(auth, email, password);

            // حفظ بياناته في كوليكشن users
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

// التحقق الأمني عند تحميل الصفحة وطرد غير الأدمن
onAuthStateChanged(auth, async user => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    currentUser = user;

    const isAdmin = await verifyAdminPermission(user);
    if (!isAdmin) {
        alert("عذراً، هذه الصفحة مخصصة للمشرفين فقط!");
        window.location.href = "index.html";
        return;
    }

    await loadUsersData();
});
