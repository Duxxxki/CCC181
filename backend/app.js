const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./db");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

        return res.status(200).json({
            message: "Login successful.",
            token,
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

// Handle unknown routes
app.use((req, res) => {
    res.status(404).json({
        message: "Route not found."
    });
});

module.exports = app;
