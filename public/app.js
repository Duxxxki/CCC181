let authToken = null;

const message = document.getElementById("message");

function showMessage(text, isError = false) {
    message.textContent = text;
    message.style.color = isError ? "red" : "green";
}

// Admin login.
document.getElementById("loginForm").addEventListener(
    "submit",
    async function (event) {
        event.preventDefault();

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: document.getElementById("loginEmail").value,
                    password: document.getElementById("loginPassword").value
                })
            });

            const data = await response.json();

            if (!response.ok) {
                showMessage(data.message || "Login failed.", true);
                return;
            }

            authToken = data.token;

            showMessage(
                `Logged in as ${data.user.name} (${data.user.role}).`
            );
        } catch (error) {
            showMessage("Unable to connect to the server.", true);
        }
    }
);

// Create a new user.
document.getElementById("createUserForm").addEventListener(
    "submit",
    async function (event) {
        event.preventDefault();

        if (!authToken) {
            showMessage("Please log in as an Admin first.", true);
            return;
        }

        const user = {
            name: document.getElementById("name").value.trim(),
            email: document.getElementById("email").value.trim(),
            password: document.getElementById("password").value,
            role: document.getElementById("role").value,
            status: document.getElementById("status").value
        };

        if (!user.name || !user.email || !user.password) {
            showMessage("Please complete all required fields.", true);
            return;
        }

        if (user.password.length < 12 || user.password.length > 72) {
            showMessage(
                "Password must be between 12 and 72 characters.",
                true
            );
            return;
        }

        try {
            const response = await fetch("/api/users", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${authToken}`
                },
                body: JSON.stringify(user)
            });

            const data = await response.json();

            if (!response.ok) {
                showMessage(data.message || "User creation failed.", true);
                return;
            }

            showMessage(
                `User ${data.user.name} created successfully.`
            );

            document.getElementById("createUserForm").reset();
        } catch (error) {
            showMessage("Unable to connect to the server.", true);
        }
    }
);
