// ======================================================
// 🔔 أيقونة إشعارات ثابتة أسفل يمين الشاشة
// ======================================================

let bellBadge = null;
let currentNotifs = [];

function injectBellIcon() {
    if (document.querySelector("#notifyBellBtn")) return true;

    const bellBtn = document.createElement("button");
    bellBtn.id = "notifyBellBtn";
    bellBtn.type = "button";
    bellBtn.setAttribute(
        "style",
        "position:fixed !important; bottom:20px !important; right:20px !important; " +
        "background:#00bcd4 !important; border:none !important; border-radius:50% !important; " +
        "width:52px !important; height:52px !important; display:flex !important; " +
        "align-items:center !important; justify-content:center !important; cursor:pointer !important; " +
        "font-size:24px !important; color:#fff !important; z-index:2147483647 !important; " +
        "box-shadow:0 4px 14px rgba(0,0,0,0.35) !important; transition:transform .15s, background .2s !important;"
    );
    bellBtn.textContent = "🔔";
    bellBtn.addEventListener("mouseenter", () => {
        bellBtn.style.setProperty("background", "#008ba3", "important");
        bellBtn.style.setProperty("transform", "scale(1.06)", "important");
    });
    bellBtn.addEventListener("mouseleave", () => {
        bellBtn.style.setProperty("background", "#00bcd4", "important");
        bellBtn.style.setProperty("transform", "scale(1)", "important");
    });

    const badge = document.createElement("span");
    badge.id = "notifyBellBadge";
    badge.setAttribute(
        "style",
        "position:absolute !important; top:-4px !important; left:-4px !important; " +
        "background:#e74c3c !important; color:#fff !important; border-radius:50% !important; " +
        "min-width:19px !important; height:19px !important; font-size:11px !important; " +
        "display:none !important; align-items:center !important; justify-content:center !important; " +
        "padding:0 4px !important; font-family:Arial, sans-serif !important; " +
        "border:2px solid #fff !important; box-sizing:content-box !important;"
    );
    bellBtn.appendChild(badge);
    bellBadge = badge;

    document.body.appendChild(bellBtn);

    bellBtn.addEventListener("click", () => {
        showNotificationsPopup(currentNotifs);
    });

    return true;
}

function ensureBellInjected(attempt = 0) {
    if (!injectBellIcon() && attempt < 20) {
        setTimeout(() => ensureBellInjected(attempt + 1), 300);
    }
}

function updateBellBadge(count) {
    if (!bellBadge) return;
    if (count > 0) {
        bellBadge.textContent = count > 9 ? "9+" : String(count);
        bellBadge.style.setProperty("display", "flex", "important");
    } else {
        bellBadge.style.setProperty("display", "none", "important");
    }
}

ensureBellInjected();