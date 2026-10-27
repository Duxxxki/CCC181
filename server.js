require("dotenv").config();

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const pool = require("./db");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error(
        "JWT_SECRET must be configured with a strong random secret."
    );
}

// Verify the authentication token.
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Authentication required."
        });
    }

    const token = authHeader.slice(7);

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token."
        });
    }
}

// Allow only Admin accounts to continue.
function requireAdmin(req, res, next) {
    if (req.user.role !== "Admin") {
        return res.status(403).json({
            message: "Only Admin users can create accounts."
        });
    }

    next();
}

// Login endpoint for development and testing.
app.post("/api/login", async (req, res) => {
    try {
        const email = String(req.body.email || "")
            .trim()
            .toLowerCase();

        const password = req.body.password;

        if (!email || typeof password !== "string") {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        const result = await pool.query(
            `SELECT id, name, email, password_hash, role, status
             FROM users
             WHERE email = $1`,
            [email]
        );

        const user = result.rows[0];

        if (
            !user ||
            user.status !== "Active" ||
            !(await bcrypt.compare(password, user.password_hash))
        ) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        res.json({
            message: "Login successful.",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            message: "Unable to process login."
        });
    }
});

// Create user endpoint restricted to Admin accounts.
app.post(
    "/api/users",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const name = typeof req.body.name === "string"
                ? req.body.name.trim()
                : "";

            const email = typeof req.body.email === "string"
                ? req.body.email.trim().toLowerCase()
                : "";

            const password = req.body.password;
            const role = req.body.role;
            const status = req.body.status || "Active";

            if (!name || !email || typeof password !== "string") {
                return res.status(400).json({
                    message: "Name, email, and password are required."
                });
            }

            if (name.length > 100) {
                return res.status(400).json({
                    message: "Name must not exceed 100 characters."
                });
            }

            if (
                email.length > 255 ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
            ) {
                return res.status(400).json({
                    message: "Enter a valid email address."
                });
            }

            if (password.length < 12 || password.length > 72) {
                return res.status(400).json({
                    message: "Password must be between 12 and 72 characters."
                });
            }

            if (!["Admin", "Staff"].includes(role)) {
                return res.status(400).json({
                    message: "Role must be Admin or Staff."
                });
            }

            if (!["Active", "Inactive"].includes(status)) {
                return res.status(400).json({
                    message: "Status must be Active or Inactive."
                });
            }

            const existingUser = await pool.query(
                "SELECT id FROM users WHERE email = $1",
                [email]
            );

            if (existingUser.rowCount > 0) {
                return res.status(409).json({
                    message: "An account with this email already exists."
                });
            }

            const passwordHash = await bcrypt.hash(password, 12);

            const result = await pool.query(
                `INSERT INTO users
                    (name, email, password_hash, role, status)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id, name, email, role, status, created_at`,
                [name, email, passwordHash, role, status]
            );

            res.status(201).json({
                message: "User created successfully.",
                user: result.rows[0]
            });
        } catch (error) {
            if (error.code === "23505") {
                return res.status(409).json({
                    message: "An account with this email already exists."
                });
            }

            console.error("User creation error:", error);

            res.status(500).json({
                message: "Unable to create user."
            });
        }
    }
);

app.get("/api/health", (req, res) => {
    res.json({
        status: "OK"
    });
});

const PORT = Number(process.env.PORT || 3000);

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

module.exports = app;