require("dotenv").config();
const bcrypt = require("bcrypt");
const pool = require("./db");

async function seedAdmin() {
    const name = process.env.INITIAL_ADMIN_NAME;
    const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.INITIAL_ADMIN_PASSWORD;

    if (!name || !email || !password) {
        throw new Error("INITIAL_ADMIN_NAME, INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set in .env.");
    }
    if (password.length < 12) {
        throw new Error("INITIAL_ADMIN_PASSWORD must be at least 12 characters.");
    }

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
        console.log("An account with this email already exists. Nothing changed.");
        return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query(
        `INSERT INTO users (full_name, email, password_hash, role, status)
         VALUES ($1, $2, $3, 'admin', 'active')`,
        [name, email, passwordHash]
    );
    console.log(`Initial admin created: ${email}`);
}

seedAdmin()
    .catch((error) => {
        console.error("Seeding failed:", error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());