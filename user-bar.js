import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

const auth = getAuth();

const username = document.querySelector("#username");
const logoutButton = document.querySelector("#logout-btn");


// ===============================
// SHOW USERNAME
// ===============================

onAuthStateChanged(auth, (user) => {

    if (!user) return;

    const email = user.email || "";

    const name =
        email.split("@")[0];

    if (username) {
        username.textContent =
            `مرحباً، ${name}`;
    }

});


// ===============================
// LOGOUT
// ===============================

if (logoutButton) {

    logoutButton.addEventListener("click", async () => {

        try {

            await signOut(auth);

            window.location.replace("login.html");

        } catch (error) {

            console.error(
                "Logout Error:",
                error
            );

        }

    });

}