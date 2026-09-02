// ======================================================
// LANGDEX - admin-users.js (Full Secure Management Edition)
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
    onAuthStateChanged
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

const ADMIN_EMAILS = ["amjadtxt@gmail.com"]; // الإيميلات الرئيسية المعتمدة كأدمن

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const wordsCollection = collection(db, "words");
const usersCollection = collection(db, "users");

let currentUser = null;
let allUsersData = [];

// ======================================================
// NOTIFICATION SYSTEM
// ======================================================
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

// ======================================================
// SECURE ADMIN CHECK (FROM FIREBASE + EMAILS)
// ======================================================
async function verifyAdminPermission(user) {
    if (!user || !user.email) return false;

    const email = user.email.toLowerCase();

    // 1. التحقق من القائمة الثابتة الأساسية للإيميلات
    if (ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === email)) {
        return true;
    }

    // 2. التحقق من قاعدة البيانات (كوليكشن users) لمعرفة ما إذا كان الرول الخاص به admin
    try {
        const customDocId = email.replace(/[^a-zA-Z0-9]/g, "_");
        const userDocRef = doc(db, "users", customDocId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            if (data.role === "admin") {
                return true;
            }
        }
    } catch (err) {
        console.error("Error checking admin role from Firebase:", err);
    }

    return false;
}

// ======================================================
// LOAD AND RENDER USERS
// ======================================================
async function loadUsersData() {
    try {
        const usersSnap = await getDocs(usersCollection);
        const wordsSnap = await getDocs(wordsCollection);

        const usersMap = new Map();

        // جلب المستخدمين من كوليكشن users
        usersSnap.forEach(docSnap => {
            const data = docSnap.data();
            const email = data.email || "";
            if (email) {
                usersMap.set(email.toLowerCase(), {
                    docId: docSnap.id,
                    email: email,
                    role: data.role || "user",
                    userId: data.userId || "",
                    wordsCount: 0,
                    languages: new Set()
                });
            }
        });

        // جلب وربط الكلمات واللغات من كوليكشن words
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
                        userId: data.userId || "",
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
        console.error("Error loading users data:", error);
        showNotification("حدث خطأ أثناء تحميل بيانات المستخدمين.");
    }
}

function renderUsersTable(usersList) {
    const tableBody = document.querySelector("#users-table-body");
    if (!tableBody) return;

    if (usersList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">لا توجد نتائج مطابقة.</td></tr>`;
        return;
    }

    tableBody.innerHTML = "";

    usersList.forEach((user, index) => {
        const row = document.createElement("tr");
        const langsArray = user.languages instanceof Set ? [...user.languages] : [];

        row.innerHTML = `
            <td style="text-align: center;">${index + 1}</td>
            <td>${user.email}</td>
            <td style="text-align: center;"><b>${user.role}</b></td>
            <td style="text-align: center;">${user.wordsCount} كلمة</td>
            <td style="text-align: center;">${langsArray.length > 0 ? langsArray.join("، ") : "-"}</td>
            <td style="text-align: center;">
                <button class="action-btn btn-delete-records" data-email="${user.email}">حذف السجلات</button>
                <button class="action-btn btn-delete-user" data-email="${user.email}">حذف المستخدم</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    setupActionButtons();
}

function setupActionButtons() {
    // حذف سجلات الكلمات للمستخدم
    document.querySelectorAll(".btn-delete-records").forEach(btn => {
        btn.addEventListener("click", async function () {
            const email = this.getAttribute("data-email");
            if (!confirm(`هل أنت متأكد من حذف جميع كلمات وسجلات المستخدم (${email})؟`)) return;

            try {
                showNotification("جاري حذف السجلات...");
                const q = query(wordsCollection, where("userEmail", "==", email));
                const snap = await getDocs(q);
                const promises = [];
                snap.forEach(d => promises.push(deleteDoc(doc(db, "words", d.id))));
                await Promise.all(promises);
                showNotification("تم حذف سجلات الكلمات بنجاح.");
                loadUsersData();
            } catch (err) {
                console.error(err);
                showNotification("حدث خطأ أثناء حذف السجلات.");
            }
        });
    });

    // حذف المستخدم من النظام بالكامل
    document.querySelectorAll(".btn-delete-user").forEach(btn => {
        btn.addEventListener("click", async function () {
            const email = this.getAttribute("data-email");
            if (!confirm(`هل أنت متأكد من حذف المستخدم (${email}) تماماً من النظام؟`)) return;

            try {
                showNotification("جاري حذف المستخدم...");
                const userObj = allUsersData.find(u => u.email.toLowerCase() === email.toLowerCase());
                if (userObj && userObj.docId) {
                    await deleteDoc(doc(db, "users", userObj.docId));
                }
                showNotification("تم حذف المستخدم بنجاح.");
                loadUsersData();
            } catch (err) {
                console.error(err);
                showNotification("حدث خطأ أثناء حذف المستخدم.");
            }
        });
    });
}

// إضافة مستخدم جديد وتحديد الرول في كوليكشن users
const addUserBtn = document.querySelector("#add-user-btn");
if (addUserBtn) {
    addUserBtn.addEventListener("click", async function () {
        const emailInput = document.querySelector("#new-user-email");
        const roleSelect = document.querySelector("#new-user-role");

        const email = emailInput ? emailInput.value.trim() : "";
        const role = roleSelect ? roleSelect.value : "";

        if (!email || !role) {
            showNotification("يرجى إدخال البريد الإلكتروني واختيار الرول.");
            return;
        }

        try {
            showNotification("جاري إضافة المستخدم...");
            const customDocId = email.replace(/[^a-zA-Z0-9]/g, "_");
            await setDoc(doc(db, "users", customDocId), {
                email: email,
                role: role,
                createdAt: serverTimestamp()
            });

            showNotification("تمت إضافة المستخدم بنجاح!");
            emailInput.value = "";
            roleSelect.selectedIndex = 0;
            loadUsersData();
        } catch (err) {
            console.error(err);
            showNotification("حدث خطأ أثناء إضافة المستخدم.");
        }
    });
}

// البحث في المستخدمين
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

// ======================================================
// AUTH STATE & SECURITY GUARD (ACCESS CONTROL)
// ======================================================
onAuthStateChanged(auth, async user => {
    if (!user) {
        // إذا لم يكن مسجل دخول، طرده إلى صفحة تسجيل الدخول
        window.location.href = "login.html";
        return;
    }

    currentUser = user;

    // التحقق من صلاحيات الأدمن (من القائمة أو من قاعدة بيانات فايربيز)
    const isAdmin = await verifyAdminPermission(user);

    if (!isAdmin) {
        // إذا لم يكن أدمناً، قم بطرده فوراً إلى الصفحة الرئيسية
        alert("عذراً، هذه الصفحة مخصصة للمشرفين (الأدمن) فقط!");
        window.location.href = "index.html";
        return;
    }

    // إذا كان أدمناً مأذوناً له، قم بتحميل لوحة التحكم والبيانات بنجاح
    await loadUsersData();
});
