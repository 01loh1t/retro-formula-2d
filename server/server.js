// Retro Formula 2D - web server.
//
// This single server does two jobs:
//   1. Serves the website itself (the HTML, CSS, JavaScript and assets in /public)
//   2. Serves the API the website talks to (everything under /api)
//
// Keeping both in one place means there is one thing to deploy and no cross-origin setup.

require("dotenv").config();

const path = require("path");
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");

const db = require("./db");
const { attachUser } = require("./middleware/auth");

const authRoutes = require("./routes/auth");
const lapRoutes = require("./routes/laps");
const rankingRoutes = require("./routes/rankings");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "..", "public");

// Hosts like Render put a proxy in front of the app. Without this, Express thinks every
// request arrived over plain HTTP and refuses to set the secure login cookie.
app.set("trust proxy", 1);

// ---------------------------------------------------------------------------
// Security and parsing middleware

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                // Phaser is loaded from the jsDelivr CDN by game.html.
                scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "blob:"],
                mediaSrc: ["'self'"],
                connectSrc: ["'self'"],
                objectSrc: ["'none'"],
                frameAncestors: ["'none'"]
            }
        },
        // Phaser reads pixels back off a canvas for the track-limits check, which browsers
        // block under the strictest cross-origin isolation settings.
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" }
    })
);

app.use(compression());
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(attachUser);

// ---------------------------------------------------------------------------
// API routes

app.use("/api/auth", authRoutes);
app.use("/api/laps", lapRoutes);
app.use("/api/rankings", rankingRoutes);

// Used by hosting platforms to check the app is alive.
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Anything else under /api is a mistake, and should say so in JSON rather than
// falling through and returning the home page HTML.
app.use("/api", (req, res) => {
    res.status(404).json({ error: "Not found." });
});

// ---------------------------------------------------------------------------
// The website itself

app.use(
    express.static(PUBLIC_DIR, {
        extensions: ["html"],           // /rankings serves rankings.html
        maxAge: "1h",
        setHeaders(res, filePath) {
            // HTML is never cached, so a deploy shows up immediately rather than
            // players sitting on a stale page.
            if (filePath.endsWith(".html")) {
                res.setHeader("Cache-Control", "no-cache");
            }
        }
    })
);

// Unknown page - send the home page rather than a bare error.
app.use((req, res) => {
    res.status(404).sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// ---------------------------------------------------------------------------
// Error handling
//
// The real error is logged for you, while the player gets a plain message. Error details
// can leak table names and file paths, which is free reconnaissance for an attacker.

app.use((err, req, res, next) => {
    console.error("Request failed:", req.method, req.originalUrl, "-", err.message);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: "Something went wrong on our side. Please try again." });
});

// ---------------------------------------------------------------------------
// Start up

async function start() {
    try {
        await db.initSchema();
    } catch (err) {
        console.error("Could not prepare the database:", err.message);
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log(`Retro Formula 2D running on http://localhost:${PORT}`);
    });
}

start();
