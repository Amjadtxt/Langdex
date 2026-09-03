// ======================================================
// LANGDEX - admin-users.js (With Logger Edition)
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
    addDoc,
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

// إنشاء شاشة التحميل وتثبيتها فوراً فوق كل عناصر الصفحة
const loaderOverlay = document.createElement("div");
loaderOverlay.id = "auth-loader-overlay";
loaderOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: #121212;
    color: #ffffff;
    z-index: 9999999999;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: 'Cairo', Arial, sans-serif;
    font-size: 20px;
    font-weight: bold;
    direction: rtl;
`;
loaderOverlay.textContent = "جاري التحميل...";

// إدراج شاشة التحميل في الـ DOM بمجرد قراءة السكربت
if (document.body) {
    document.body.appendChild(loaderOverlay);
} else {
    document.addEventListener("DOMContentLoaded", () => {
        document.body.appendChild(loaderOverlay);
    });
}

const wordsCollection = collection(db, "words");
const usersCollection = collection(db, "users");
const logsCollection = collection(db, "logs"); // 🌟 كوليكشن السجل

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

// ======================================================
// 🌟 تسجيل الأحداث في اللوج (Logs) — بشكل يسمح بالتراجع الحقيقي لاحقاً
// ======================================================
// action:         "add" | "update" | "delete" | "bulk_delete"
// collectionName: "users" أو "words" (حسب مين اتأثر فعلياً)
// targetDocId:    الـ document id بتاع العنصر (لو عملية مفردة)
// oldData:        نسخة من البيانات *قبل* التعديل/الحذف
// newData:        نسخة من البيانات *بعد* الإضافة/التعديل
// details:        نص وصفي مختصر يظهر في جدول اللوج
async function writeLog({ action, collectionName, targetDocId = null, oldData = null, newData = null, details = "" }) {
    try {
        await addDoc(logsCollection, {
            userName: currentUser?.email || "أدمن",
            uid: currentUser?.uid || null,
            action,
            collectionName,
            targetDocId,
            oldData,
            newData,
            details,
            role: "admin",
            undone: false, // 🌟 يتحول true بعد التراجع عنه
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("فشل تسجيل الحدث في اللوج:", error);
    }
}

// التحقق من صلاحيات الأدمن أمنياً
// 🌟 مهم: لازم يدور بالـ uid (مش الإيميل) عشان يتطابق مع دالة isAdmin() في Firestore Rules
// اللي بتفحص /users/{request.auth.uid}
async function verifyAdminPermission(user) {
    if (!user || !user.email) return false;
    const email = user.email.toLowerCase();

    if (ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === email)) {
        return true;
    }

    try {
        const userDocRef = doc(db, "users", user.uid);
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
                    docId: docSnap.id, // 🌟 هنا الـ docId ده هو الـ uid الفعلي (لو اتضاف بالطريقة الجديدة)
                    uid: docSnap.id,
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
            const lang = data.language || data.lang || "أخرى";
            const wordUid = data.uid || data.userId || null; // 🌟 لالتقاط uid صاحب الكلمة

            if (email) {
                if (!usersMap.has(email)) {
                    usersMap.set(email, {
                        docId: null,
                        uid: wordUid,
                        email: data.userEmail,
                        role: "user",
                        wordsCount: 0,
                        languagesMap: {}
                    });
                }
                const userObj = usersMap.get(email);
                if (!userObj.uid && wordUid) userObj.uid = wordUid; // 🌟 نكمّل الـ uid لو كان ناقص
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
                
                <div style="display: flex; gap: 3px; width: 100%;">
                    <select class="role-select-${index}" style="padding: 3px; font-size: 11px; width: 65%; margin:0;">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>مستخدم عادي (user)</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>مشرف (admin)</option>
                    </select>
                    <button class="upa btn-update-role" data-email="${user.email}" data-docid="${user.docId || ''}" data-uid="${user.uid || ''}" data-index="${index}" style="padding: 4px; font-size: 11px; width: 35%;">تحديث الرول</button>
                </div>

                <button class="upa btn-pdf-full" data-email="${user.email}" style="padding: 5px 10px; font-size: 11px; width: 100%;">تحميل PDF شامل (كل اللغات)</button>
                
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
            const uidAttr = this.getAttribute("data-uid");
            const index = this.getAttribute("data-index");
            const selectEl = document.querySelector(`.role-select-${index}`);
            const newRole = selectEl ? selectEl.value : "";

            if (!newRole) return;

            try {
                showNotification("جاري تحديث الرول للمستخدم...");

                // 🌟 لازم نستخدم الـ uid الحقيقي بتاع اليوزر (مش إيميل معدّل)
                // عشان يتطابق مع دالة isAdmin() في Firestore Rules اللي بتدور على /users/{uid}
                if (!docId || docId === "null" || docId === "") {
                    if (!uidAttr || uidAttr === "null" || uidAttr === "") {
                        showNotification("تعذّر تحديد المستخدم بدقة (لا يوجد uid مسجل له من قبل). لازم يكون له كلمة واحدة على الأقل أو مستند مسبق.");
                        return;
                    }
                    docId = uidAttr;
                }

                // 🌟 نجيب الرول القديم قبل التحديث عشان نقدر نرجعه
                const userObjLocal = allUsersData.find(u => u.email.toLowerCase() === email.toLowerCase());
                const oldRole = userObjLocal ? userObjLocal.role : "user";

                const userDocRef = doc(db, "users", docId);
                const docSnap = await getDoc(userDocRef);

                let wasNewDoc = false;
                if (docSnap.exists()) {
                    await updateDoc(userDocRef, { role: newRole });
                } else {
                    wasNewDoc = true;
                    await setDoc(userDocRef, {
                        email: email,
                        role: newRole,
                        createdAt: serverTimestamp()
                    });
                }

                // 🌟 تسجيل حدث تحديث الرول — التراجع عنه = رجّع oldRole على نفس الـ doc
                // (لو الـ doc اتعمل جديد بالكامل، التراجع يبقى حذفه تاني بدل الرجوع لرول قديم)
                await writeLog({
                    action: wasNewDoc ? "add" : "update",
                    collectionName: "users",
                    targetDocId: docId,
                    oldData: wasNewDoc ? null : { email, role: oldRole },
                    newData: { email, role: newRole },
                    details: wasNewDoc
                        ? `إنشاء صلاحية جديدة للمستخدم (${email}) كـ (${newRole})`
                        : `تغيير رول المستخدم (${email}) من (${oldRole}) إلى (${newRole})`
                });

                showNotification(`تم تحديث رول المستخدم (${email}) إلى (${newRole}) بنجاح!`);
                loadUsersData();
            } catch (err) {
                console.error(err);
                showNotification("حدث خطأ أثناء تحديث الرول.");
            }
        });
    });

    // 2. زر تحميل تقرير PDF شامل
    document.querySelectorAll(".btn-pdf-full").forEach(btn => {
        btn.addEventListener("click", async function () {
            const targetEmail = this.getAttribute("data-email").toLowerCase();
            try {
                showNotification(`جاري استخراج كل بيانات وسجلات المستخدم (${targetEmail}) للـ PDF...`);
                
                const snap = await getDocs(wordsCollection);
                const userWords = [];

                snap.forEach(d => {
                    const item = d.data();
                    const recordEmail = (item.userEmail || item.email || "").toLowerCase();

                    if (recordEmail === targetEmail) {
                        userWords.push({
                            word: item.word || item.term || item.title || "-",
                            meaning: item.meaning || item.translation || item.definition || "-",
                            synonym: item.synonym || item.synonyms || item.similar || "-",
                            language: item.language || item.lang || "أخرى"
                        });
                    }
                });

                if (userWords.length === 0) {
                    showNotification("لا توجد أي كلمات مسجلة لهذا المستخدم.");
                    return;
                }

                let rowsHtml = "";
                userWords.forEach((item, idx) => {
                    rowsHtml += `
                        <tr>
                            <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${idx + 1}</td>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${item.word}</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${item.meaning}</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${item.synonym}</td>
                            <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${item.language}</td>
                        </tr>
                    `;
                });

                const printWindow = window.open("", "_blank");
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html lang="ar" dir="rtl">
                    <head>
                        <meta charset="UTF-8">
                        <title>تقرير المستخدم - ${targetEmail}</title>
                        <style>
                            body { font-family: 'Cairo', Tahoma, Arial, sans-serif; padding: 20px; color: #333; direction: rtl; }
                            h2 { text-align: center; color: #2c3e50; margin-bottom: 5px; }
                            p { text-align: center; color: #7f8c8d; margin-top: 0; margin-bottom: 25px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                            th { background-color: #edfbff; color: black; padding: 10px; border: 1px solid #2c3e50; font-size: 14px; }
                            td { font-size: 13px; }
                            tr:nth-child(even) { background-color: #f9f9f9; }
                        </style>
                    </head>
                    <body>
                        <h2>Langdex - تقرير شامل لكلمات المستخدم</h2>
                        <p>البريد الإلكتروني: <b>${targetEmail}</b> | إجمالي الكلمات: <b>${userWords.length}</b></p>
                        <table>
                            <thead>
                                <tr>
                                    <th>م</th>
                                    <th>الكلمة / المصطلح</th>
                                    <th>المعنى / التفسير</th>
                                    <th>المرادف</th>
                                    <th>اللغة</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                        <script>
                            window.onload = function() {
                                window.print();
                            };
                        </script>
                    </body>
                    </html>
                `);
                printWindow.document.close();
                showNotification("تم فتح نافذة التقرير، اختر حفظ كـ PDF (Save as PDF) من نافذة الطباعة!");
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
                const deletedWordsOldData = []; // 🌟 نسخة كاملة من كل كلمة هتتمسح
                snap.forEach(d => {
                    deletedWordsOldData.push({ _documentId: d.id, ...d.data(), createdAt: null });
                    promises.push(deleteDoc(doc(db, "words", d.id)));
                });
                await Promise.all(promises);

                // 🌟 تسجيل حدث الحذف الجماعي — التراجع عنه = إعادة إضافة كل الكلمات دي
                await writeLog({
                    action: "bulk_delete",
                    collectionName: "words",
                    targetDocId: null,
                    oldData: deletedWordsOldData,
                    newData: null,
                    details: `حذف تصنيف "${selectedLang}" (${deletedWordsOldData.length} كلمة) للمستخدم (${email})`
                });

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

                let userDocIdUsed = null;
                let userDocOldData = null;

                // 🌟 نحدد الـ doc المطلوب حذفه: أولوية للـ docId الموجود فعلاً، وإلا الـ uid المعروف من كلماته
                const targetId = (userObj && userObj.docId) ? userObj.docId : (userObj && userObj.uid ? userObj.uid : null);

                if (targetId) {
                    userDocIdUsed = targetId;
                    const userDocRef = doc(db, "users", targetId);
                    const snap = await getDoc(userDocRef);
                    if (snap.exists()) {
                        userDocOldData = { ...snap.data() };
                        await deleteDoc(userDocRef);
                    }
                } else {
                    showNotification("تنبيه: لا يوجد مستند صلاحيات مسجل لهذا المستخدم في users، هيتم حذف كلماته فقط.");
                }

                const q = query(wordsCollection, where("userEmail", "==", email));
                const snap = await getDocs(q);
                const promises = [];
                const deletedWordsOldData = []; // 🌟 كل كلمات اليوزر قبل ما تتمسح
                snap.forEach(d => {
                    deletedWordsOldData.push({ _documentId: d.id, ...d.data(), createdAt: null });
                    promises.push(deleteDoc(doc(db, "words", d.id)));
                });
                await Promise.all(promises);

                // 🌟 تسجيل حدث حذف المستخدم بالكامل — التراجع عنه = إعادة إنشاء وثيقة اليوزر + كلماته
                // ملحوظة: التراجع لا يقدر يرجّع حساب الدخول (Auth) بتاعه، بيرجّع بس بيانات users و words
                await writeLog({
                    action: "delete_user_full",
                    collectionName: "users",
                    targetDocId: userDocIdUsed,
                    oldData: {
                        userDoc: userDocOldData ? { email, ...userDocOldData } : { email, role: "user" },
                        words: deletedWordsOldData
                    },
                    newData: null,
                    details: `حذف المستخدم (${email}) بالكامل مع ${deletedWordsOldData.length} كلمة (تنبيه: التراجع لا يعيد حساب الدخول Auth، فقط بيانات Firestore)`
                });

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
            // 🌟 استخدام createUserWithEmailAndPassword بيسجل الأدمن خروج تلقائياً ويدخل بحساب اليوزر الجديد
            // (سلوك معروف في Firebase Auth SDK على الـ client). لو ده بيسبب مشكلة، الحل الصح هو
            // استخدام Cloud Function بصلاحيات Admin SDK بدل ما ننشئ الحساب من المتصفح مباشرة.
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const newUid = userCredential.user.uid;

            const newUserData = {
                email: email,
                role: role,
                createdAt: serverTimestamp()
            };

            // 🌟 التخزين بالـ uid الحقيقي بدل الإيميل المعدّل عشان يتوافق مع isAdmin() في الـ Rules
            await setDoc(doc(db, "users", newUid), newUserData);

            // 🌟 تسجيل حدث إضافة مستخدم جديد
            // ملحوظة: التراجع هيقدر يمسح وثيقة الـ Firestore بس، مش حساب الـ Auth (يحتاج صلاحيات سيرفر)
            await writeLog({
                action: "add",
                collectionName: "users",
                targetDocId: newUid,
                oldData: null,
                newData: { ...newUserData, createdAt: null },
                details: `إضافة مستخدم جديد (${email}) بصلاحية (${role}) — تنبيه: التراجع لا يحذف حساب Auth`
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

// التحقق الأمني عند تحميل الصفحة وتحويل غير الأدمن فوراً
onAuthStateChanged(auth, async user => {
    if (!user) {
        if (loaderOverlay && loaderOverlay.parentNode) loaderOverlay.remove();
        window.location.replace("login.html");
        return;
    }
    currentUser = user;

    const isAdmin = await verifyAdminPermission(user);
    if (!isAdmin) {
        if (loaderOverlay && loaderOverlay.parentNode) loaderOverlay.remove();
        window.location.replace("index.html");
        return;
    }

    // لو أدمن: إزالة شاشة التحميل وعرض الصفحة وتحميل البيانات
    if (loaderOverlay && loaderOverlay.parentNode) {
        loaderOverlay.remove();
    }

    await loadUsersData();
});
