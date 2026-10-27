const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./db");

const app = express();
app.use(express.static(path.join(__dirname, "../frontend")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const cookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
};

// Check JWT configuration
if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing from the .env file.");
}

// Test route
app.get("/", (req, res) => {
    res.status(200).json({
        message: "JH Studios Workflow Management System API is running."
    });
});

// US-1: Create Employee Account
app.post("/api/users", async (req, res) => {
    try {
                // Admin only: verify the logged-in user
        let currentUser;
        try {
            const payload = jwt.verify(req.cookies.token, process.env.JWT_SECRET, {
                algorithms: ["HS256"]
            });
            const adminResult = await pool.query(
                "SELECT role, status FROM users WHERE id = $1",
                [payload.id]
            );
            currentUser = adminResult.rows[0];
        } catch (authError) {
            return res.status(401).json({ message: "Not authenticated." });
        }

        if (!currentUser || currentUser.status !== "active") {
            return res.status(401).json({ message: "Not authenticated." });
        }
        if (currentUser.role !== "admin") {
            return res.status(403).json({ message: "Only administrators can create accounts." });
        }
        const fullName = req.body.fullName?.trim();
        const email = req.body.email?.trim().toLowerCase();
        const password = req.body.password;

        // Validate required fields
        if (!fullName || !email || !password) {
            return res.status(400).json({
                message: "Full name, email, and password are required."
            });
        }

        // Validate name
        if (fullName.length > 150) {
            return res.status(400).json({
                message: "Full name must not exceed 150 characters."
            });
        }

        // Validate email
        if (
            email.length > 255 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            return res.status(400).json({
                message: "Please enter a valid email address."
            });
        }

        // Validate password
        if (typeof password !== "string" || password.length < 12) {
            return res.status(400).json({
                message: "Password must be at least 12 characters long."
            });
        }

        // Hash password before saving
        const passwordHash = await bcrypt.hash(password, 12);

        // Save employee account
        const result = await pool.query(
            `INSERT INTO users (full_name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, full_name, email, role, status, created_at`,
            [fullName, email, passwordHash]
        );

        return res.status(201).json({
            message: "Employee account created successfully.",
            user: result.rows[0]
        });

    } catch (error) {
        // Handle duplicate email
        if (error.code === "23505") {
            return res.status(409).json({
                message: "An account with this email already exists."
            });
        }

        console.error("Account creation error:", error.message);

        return res.status(500).json({
            message: "An unexpected error occurred."
        });
    }
});

// US-3: Login with JWT
app.post("/api/auth/login", async (req, res) => {
    try {
        const email = req.body.email?.trim().toLowerCase();
        const password = req.body.password;

        // Validate required fields
        if (!email || typeof password !== "string" || !password) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        // Find user by email
        const result = await pool.query(
            `SELECT id, full_name, email, password_hash, role, status
             FROM users
             WHERE email = $1`,
            [email]
        );

        const user = result.rows[0];

        // Reject unknown email or incorrect password
        if (
            !user ||
            !(await bcrypt.compare(password, user.password_hash))
        ) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        // Reject inactive accounts
        if (user.status !== "active") {
            return res.status(403).json({
                message: "Your account is inactive. Please contact an administrator."
            });
        }

        // Generate signed JWT
        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h",
                algorithm: "HS256"
            }
        );

        // Store JWT in an httpOnly cookie (used by dashboard.js)
        res.cookie("token", token, { ...cookieOptions, maxAge: 60 * 60 * 1000 });

        return res.status(200).json({
            message: "Login successful.",
            redirect: "/dashboard",
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            message: "An unexpected error occurred."
        });
    }
});

// Current user (used by dashboard.js)
app.get("/api/auth/me", async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: "Not authenticated." });
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ["HS256"]
        });

        const result = await pool.query(
            `SELECT id, full_name, email, role, status
             FROM users WHERE id = $1`,
            [payload.id]
        );
        const user = result.rows[0];

        if (!user || user.status !== "active") {
            return res.status(401).json({ message: "Not authenticated." });
        }

        res.set("Cache-Control", "no-store");
        return res.status(200).json({ user });
    } catch (error) {
        return res.status(401).json({ message: "Not authenticated." });
    }
});

// Logout
app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token", cookieOptions);
    res.status(200).json({ message: "Logged out." });
});

// Pages without .html
app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dashboard.html"));
});
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

// Handle unknown routes
app.use((req, res) => {
    res.status(404).json({
        message: "Route not found."
    });
});

module.exports = app;