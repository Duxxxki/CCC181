const welcomeHeading = document.querySelector("#welcome-heading");
const roleLabel = document.querySelector("#role-label");
const userManagementLink = document.querySelector("#user-management-link");
const logoutButton = document.querySelector("#logout-button");
const dashboardMessage = document.querySelector("#dashboard-message");

const createUserPanel = document.querySelector("#create-user-panel");
const createUserForm = document.querySelector("#create-user-form");
const newFullName = document.querySelector("#new-full-name");
const newEmail = document.querySelector("#new-email");
const newPassword = document.querySelector("#new-password");
const createUserMessage = document.querySelector("#create-user-message");
const createUserButton = document.querySelector("#create-user-button");

async function loadCurrentUser() {
    try {
        const response = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (response.status === 401) {
            window.location.replace("/login.html");
            return;
        }
        if (!response.ok) throw new Error("Could not load user session.");

        const { user } = await response.json();
        welcomeHeading.textContent = `Welcome, ${user.full_name}`;
        roleLabel.textContent = `System role: ${user.role}`;
        if (user.role === "admin") {
            userManagementLink.hidden = false;
            createUserPanel.hidden = false;
        }
    } catch (error) {
        roleLabel.textContent = "";
        dashboardMessage.textContent = "Could not load your account. Please log in again.";
    }
}

function showCreateUserMessage(text, success = false) {
    createUserMessage.textContent = text;
    createUserMessage.classList.toggle("success", success);
}

createUserForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showCreateUserMessage("");

    const fullName = newFullName.value.trim();
    const email = newEmail.value.trim();
    const password = newPassword.value;

    if (!fullName || !email || !password) {
        showCreateUserMessage("Full name, email, and password are required.");
        return;
    }
    if (password.length < 12) {
        showCreateUserMessage("Password must be at least 12 characters long.");
        return;
    }

    createUserButton.disabled = true;
    createUserButton.textContent = "Creating...";

    try {
        const response = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ fullName, email, password })
        });
        const data = await response.json().catch(() => ({}));

        if (response.status === 401) {
            window.location.replace("/login.html");
            return;
        }
        if (!response.ok) {
            showCreateUserMessage(data.message || `Unable to create account (${response.status}).`);
            return;
        }

        showCreateUserMessage(`Account created for ${data.user.email}.`, true);
        createUserForm.reset();
    } catch (error) {
        showCreateUserMessage("Could not connect to the server. Please try again.");
    } finally {
        createUserButton.disabled = false;
        createUserButton.textContent = "Create Account";
    }
});

logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
        const response = await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "same-origin"
        });
        if (response.ok) {
            window.location.replace("/login.html");
            return;
        }
        dashboardMessage.textContent = "Unable to log out. Please try again.";
    } catch (error) {
        dashboardMessage.textContent = "Could not connect to the server. Please try again.";
    } finally {
        logoutButton.disabled = false;
    }
});

loadCurrentUser();