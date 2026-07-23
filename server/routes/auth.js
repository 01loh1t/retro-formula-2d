// Account routes: register, log in, log out, and "who am I".

const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");

const db = require("../db");
const { validateRegistration } = require("../validation");
const { issueLoginCookie, clearLoginCookie, requireLogin } = require("../middleware/auth");

const router = express.Router();

// Slows down anyone trying thousands of passwords against an account.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts. Please wait a few minutes and try again." }
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many accounts created from this connection. Please try again later." }
});

// Shape of the user object sent to the browser. Note what is missing: the password hash,
// and the email, which the player's own browser does not need to display anything.
function publicUser(row) {
    return {
        id: row.id,
        username: row.username,
        fullName: row.full_name,
        team: row.team
    };
}

// ---------------------------------------------------------------------------
// POST /api/auth/register - create an account

router.post("/register", registerLimiter, async (req, res, next) => {
    try {
        const { fullname, age, email, username, password } = req.body || {};

        const { valid, errors } = validateRegistration({ fullname, age, email, username, password });
        if (!valid) {
            return res.status(400).json({ error: "Please fix the highlighted fields.", errors });
        }

        const cleanUsername = String(username).trim();
        const cleanEmail = String(email).trim();

        // The unique indexes on username_lower and email_lower are what actually guarantee
        // uniqueness. These lookups just produce a friendly message for the common case.
        const taken = await db.query(
            "SELECT username_lower, email_lower FROM users WHERE username_lower = $1 OR email_lower = $2",
            [cleanUsername.toLowerCase(), cleanEmail.toLowerCase()]
        );

        if (taken.rowCount > 0) {
            const fieldErrors = {};
            for (const row of taken.rows) {
                if (row.username_lower === cleanUsername.toLowerCase()) {
                    fieldErrors.username = "Username already taken. Please choose another.";
                }
                if (row.email_lower === cleanEmail.toLowerCase()) {
                    fieldErrors.email = "An account already exists with that email.";
                }
            }
            return res.status(409).json({ error: "Please fix the highlighted fields.", errors: fieldErrors });
        }

        // bcrypt turns the password into a hash that cannot be reversed. If the database
        // ever leaked, the passwords in it would still not be readable.
        const passwordHash = await bcrypt.hash(String(password), 12);

        const insert = await db.query(
            `INSERT INTO users (username, username_lower, full_name, age, email, email_lower, password_hash)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, username, full_name, team`,
            [
                cleanUsername,
                cleanUsername.toLowerCase(),
                String(fullname).trim(),
                Number(age),
                cleanEmail,
                cleanEmail.toLowerCase(),
                passwordHash
            ]
        );

        const user = insert.rows[0];

        // Registering logs the player straight in, same as the original behaviour.
        issueLoginCookie(res, user);

        res.status(201).json({ user: publicUser(user) });
    } catch (err) {
        // 23505 is Postgres for "unique constraint violated" - two people registering the
        // same username at the exact same moment lands here.
        if (err.code === "23505") {
            return res.status(409).json({
                error: "Please fix the highlighted fields.",
                errors: { username: "Username already taken. Please choose another." }
            });
        }
        next(err);
    }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login

router.post("/login", loginLimiter, async (req, res, next) => {
    try {
        const { username, password } = req.body || {};

        if (!username || !String(username).trim()) {
            return res.status(400).json({ error: "Please enter your username" });
        }
        if (!password) {
            return res.status(400).json({ error: "Please enter your password" });
        }

        const result = await db.query(
            "SELECT id, username, full_name, team, password_hash FROM users WHERE username_lower = $1",
            [String(username).trim().toLowerCase()]
        );

        const user = result.rows[0];

        // The same message is used whether the username or the password was wrong.
        // Saying which one was wrong would tell an attacker which usernames exist.
        if (!user) {
            // Hash a throwaway value anyway so a missing account does not answer noticeably
            // faster than a wrong password - that timing difference is itself a hint.
            await bcrypt.compare(String(password), "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
            return res.status(401).json({ error: "Wrong username or password" });
        }

        const passwordMatches = await bcrypt.compare(String(password), user.password_hash);
        if (!passwordMatches) {
            return res.status(401).json({ error: "Wrong username or password" });
        }

        issueLoginCookie(res, user);
        res.json({ user: publicUser(user) });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout

router.post("/logout", (req, res) => {
    clearLoginCookie(res);
    res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me - used on page load to decide what the page should show

router.get("/me", async (req, res, next) => {
    if (!req.user) {
        return res.json({ user: null });
    }

    try {
        const result = await db.query(
            "SELECT id, username, full_name, team FROM users WHERE id = $1",
            [req.user.id]
        );

        if (result.rowCount === 0) {
            // Account was deleted while the cookie was still valid.
            clearLoginCookie(res);
            return res.json({ user: null });
        }

        res.json({ user: publicUser(result.rows[0]) });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// PATCH /api/auth/me/team - saves the team the player picked in the modal

router.patch("/me/team", requireLogin, async (req, res, next) => {
    try {
        const { TEAMS } = require("../config");
        const team = String((req.body || {}).team || "").trim();

        if (!TEAMS.includes(team)) {
            return res.status(400).json({ error: "That is not one of the available teams." });
        }

        await db.query("UPDATE users SET team = $1 WHERE id = $2", [team, req.user.id]);
        res.json({ team });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
