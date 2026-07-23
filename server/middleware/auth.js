// Login sessions.
//
// When a player logs in the server signs a token containing their user id and sends it
// back as an httpOnly cookie. httpOnly means page JavaScript cannot read it, so a script
// injected into the page cannot steal the login.

const jwt = require("jsonwebtoken");

const COOKIE_NAME = "rf2d_token";
const TOKEN_LIFETIME = "7d";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.error("JWT_SECRET is missing or too short (needs 32+ characters).");
    console.error("Generate one with:  node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"");
    process.exit(1);
}

// Signs a token for a user and attaches it to the response as a cookie.
function issueLoginCookie(res, user) {
    const token = jwt.sign(
        { sub: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: TOKEN_LIFETIME }
    );

    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production", // HTTPS only once deployed
        maxAge: COOKIE_MAX_AGE,
        path: "/"
    });
}

// Removes the login cookie.
function clearLoginCookie(res) {
    res.clearCookie(COOKIE_NAME, { path: "/" });
}

// Reads the cookie if it is there and puts the player on req.user.
// Does not block the request, so it can be used on routes that work either way.
function attachUser(req, res, next) {
    const token = req.cookies ? req.cookies[COOKIE_NAME] : null;

    if (token) {
        try {
            const payload = jwt.verify(token, JWT_SECRET);
            req.user = { id: payload.sub, username: payload.username };
        } catch (err) {
            // Expired or tampered token - treat as logged out and bin the cookie.
            clearLoginCookie(res);
        }
    }

    next();
}

// Blocks the request unless the player is logged in.
function requireLogin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: "You need to be logged in to do that." });
    }
    next();
}

module.exports = { issueLoginCookie, clearLoginCookie, attachUser, requireLogin };
