const form = document.querySelector("#login-form");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const emailError = document.querySelector("#email-error");
const passwordError = document.querySelector("#password-error");
const formMessage = document.querySelector("#form-message");
const loginButton = document.querySelector("#login-button");
const togglePassword = document.querySelector("#toggle-password");

function clearErrors() {
    emailError.textContent = "";
    passwordError.textContent = "";
    formMessage.textContent = "";
    emailInput.removeAttribute("aria-invalid");
    passwordInput.removeAttribute("aria-invalid");
}

togglePassword.addEventListener("click", () => {
    const show = passwordInput.type === "password";
    passwordInput.type = show ? "text" : "password";
    togglePassword.textContent = show ? "Hide" : "Show";
    togglePassword.setAttribute("aria-label", show ? "Hide password" : "Show password");
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    let valid = true;

    if (!email) {
        emailError.textContent = "Enter your work email.";
        emailInput.setAttribute("aria-invalid", "true");
        valid = false;
    }
    if (!password) {
        passwordError.textContent = "Enter your password.";
        passwordInput.setAttribute("aria-invalid", "true");
        valid = false;
    }
    if (!valid) return;

    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();

        if (!response.ok) {
            formMessage.textContent = data.message || "Unable to log in. Please try again.";
            return;
        }

        window.location.assign(data.redirect || "/dashboard");
    } catch (error) {
        formMessage.textContent = "Could not connect to the server. Please try again.";
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Log In";
    }
});

