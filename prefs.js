// ======================================================
// LANGDEX - prefs.js
// تفضيلات المستخدم (محلية لكل متصفح) + دوال تطبيقها الفعلي على الواجهة
// مستخدم في: settings.js, index-script.js, data-script.js
// ======================================================

export const PREFS_KEY = "langdex_prefs";

export function getPrefs() {
    try {
        return JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
    } catch {
        return {};
    }
}

export function savePrefs(prefs) {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

let darkStyleEl = null;

// بيحقن/يشيل ستايل شيت فعلي للوضع الداكن — مش مجرد class فاضي
export function applyDarkMode(enabled) {
    if (enabled) {
        if (!darkStyleEl) {
            darkStyleEl = document.createElement("style");
            darkStyleEl.id = "langdex-dark-mode-style";
            darkStyleEl.textContent = `
                body { background:#14181a !important; color:#e6e6e6 !important; }
                header, nav.bar { background:#1c2124 !important; }
                .search-section, .data-section, .login-form, .settings-section { background:#33413a !important; }
                .table-container table { background: rgba(255,255,255,0.05) !important; }
                th { background: rgba(0,0,0,0.4) !important; }
                input:not([type="checkbox"]), select, textarea {
                    background:#20262a !important; color:#e6e6e6 !important; border-color:#3a4247 !important;
                }
            `;
            document.head.appendChild(darkStyleEl);
        }
    } else if (darkStyleEl) {
        darkStyleEl.remove();
        darkStyleEl = null;
    }
}

// تُستدعى في بداية أي صفحة عشان تطبّق الوضع الداكن المحفوظ فورًا
export function applyPrefsGlobally() {
    const prefs = getPrefs();
    applyDarkMode(!!prefs.darkMode);
    return prefs;
}

export function isNotifyEnabled() {
    return getPrefs().notify !== false;
}

// null = من غير حد أقصى (اعرض الكل)
export function getResultsPerPage() {
    const n = parseInt(getPrefs().resultsPerPage, 10);
    if (!n || n <= 0 || n >= 100) return null;
    return n;
}

export function getPdfOrientation() {
    return getPrefs().pdfOrientation === "landscape" ? "landscape" : "portrait";
}

export function getDefaultLang() {
    return getPrefs().defaultLang || "all";
}
