// Lap timing routes.
//
// The problem this file solves: the browser measures the lap, but the browser belongs to
// the player, so a determined player could simply send "my lap was 0.4 seconds". So the
// server runs its own clock alongside.
//
//   1. Car crosses the line to start a lap  -> POST /api/laps/start
//      The server notes the time and hands back a one-use session id.
//   2. Car crosses the line to finish       -> POST /api/laps
//      The server checks how long it actually took, and only accepts a submitted time
//      that is consistent with what it measured.
//
// A player can still be slower than they claim by adding latency, but they cannot invent a
// lap faster than they really drove, which is what the rankings care about.

const express = require("express");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");

const db = require("../db");
const { requireLogin } = require("../middleware/auth");
const {
    TRACKS,
    MIN_LAP_TIME,
    MAX_LAP_TIME,
    CLOCK_TOLERANCE,
    LAP_SESSION_MAX_AGE_MINUTES
} = require("../config");

const router = express.Router();

// A lap takes tens of seconds, so this ceiling is far above normal play.
const lapLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Slow down - too many lap requests." }
});

// Loads a player's best time and last 5 laps on a track in one round trip.
async function loadTrackStats(userId, track) {
    const [best, recent] = await Promise.all([
        db.query(
            "SELECT MIN(lap_time) AS best FROM lap_times WHERE user_id = $1 AND track = $2",
            [userId, track]
        ),
        db.query(
            `SELECT lap_time FROM lap_times
             WHERE user_id = $1 AND track = $2
             ORDER BY created_at DESC, id DESC
             LIMIT 5`,
            [userId, track]
        )
    ]);

    const bestValue = best.rows[0].best;

    return {
        // Oldest first, so lap 1 sits at the top of the table like it did before.
        recentLapTimes: recent.rows.map((r) => Number(r.lap_time)).reverse(),
        bestLapTime: bestValue === null ? null : Number(bestValue)
    };
}

// ---------------------------------------------------------------------------
// POST /api/laps/start - the car has crossed the line, start timing

router.post("/start", requireLogin, lapLimiter, async (req, res, next) => {
    try {
        const track = String((req.body || {}).track || "").trim();

        if (!TRACKS.includes(track)) {
            return res.status(400).json({ error: "Unknown track." });
        }

        const sessionId = crypto.randomUUID();

        await db.query(
            "INSERT INTO lap_sessions (id, user_id, track) VALUES ($1, $2, $3)",
            [sessionId, req.user.id, track]
        );

        // Tidy up this player's abandoned sessions so the table does not grow forever.
        db.query(
            `DELETE FROM lap_sessions
             WHERE user_id = $1 AND started_at < NOW() - INTERVAL '${LAP_SESSION_MAX_AGE_MINUTES} minutes'`,
            [req.user.id]
        ).catch(() => { /* housekeeping only - never fail the request over it */ });

        res.status(201).json({ sessionId });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// POST /api/laps - the car has crossed the line again, submit the lap

router.post("/", requireLogin, lapLimiter, async (req, res, next) => {
    try {
        const { sessionId, lapTime, team } = req.body || {};
        const claimedTime = Number(lapTime);

        if (!sessionId || typeof sessionId !== "string") {
            return res.status(400).json({ error: "This lap was not started properly.", rejected: true });
        }

        if (!Number.isFinite(claimedTime) || claimedTime <= 0) {
            return res.status(400).json({ error: "Invalid lap time.", rejected: true });
        }

        // Claim the session and mark it used in a single statement. Doing both at once means
        // two requests racing with the same session id cannot both succeed - the second one
        // finds nothing to update.
        const claim = await db.query(
            `UPDATE lap_sessions
             SET used = TRUE
             WHERE id = $1 AND user_id = $2 AND used = FALSE
             RETURNING track, started_at`,
            [sessionId, req.user.id]
        );

        if (claim.rowCount === 0) {
            return res.status(409).json({ error: "That lap was already submitted.", rejected: true });
        }

        const { track, started_at: startedAt } = claim.rows[0];
        const serverElapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;

        // --- The checks -----------------------------------------------------

        if (claimedTime < MIN_LAP_TIME[track]) {
            return res.status(422).json({
                error: "Lap rejected: faster than this track allows.",
                rejected: true
            });
        }

        if (claimedTime > MAX_LAP_TIME) {
            return res.status(422).json({
                error: "Lap rejected: took too long to count.",
                rejected: true
            });
        }

        if (serverElapsed > MAX_LAP_TIME) {
            return res.status(422).json({
                error: "Lap rejected: this lap was left open too long.",
                rejected: true
            });
        }

        // The submitted time must line up with the time the server measured.
        const difference = serverElapsed - claimedTime;

        if (difference < -CLOCK_TOLERANCE.aheadOfServer) {
            // Claimed MORE elapsed time than the server saw pass. Not physically possible.
            return res.status(422).json({
                error: "Lap rejected: timing did not match the server.",
                rejected: true
            });
        }

        if (difference > CLOCK_TOLERANCE.behindServer) {
            // The server saw far more time pass than the lap claims - a lap left running,
            // a paused tab, or a lap time that was edited downwards.
            return res.status(422).json({
                error: "Lap rejected: timing did not match the server.",
                rejected: true
            });
        }

        // --- Accepted -------------------------------------------------------

        // Round to milliseconds. The column is NUMERIC(7,3) so this is what gets stored anyway.
        const finalTime = Math.round(claimedTime * 1000) / 1000;

        const before = await db.query(
            "SELECT MIN(lap_time) AS best FROM lap_times WHERE user_id = $1 AND track = $2",
            [req.user.id, track]
        );
        const previousBest = before.rows[0].best === null ? null : Number(before.rows[0].best);

        // The team stored on the lap is the one on the account, not one sent by the browser,
        // so the rankings always show the team the player actually had.
        const teamRow = await db.query("SELECT team FROM users WHERE id = $1", [req.user.id]);
        const lapTeam = teamRow.rows[0] ? teamRow.rows[0].team : null;

        await db.query(
            "INSERT INTO lap_times (user_id, track, team, lap_time) VALUES ($1, $2, $3, $4)",
            [req.user.id, track, lapTeam, finalTime]
        );

        const stats = await loadTrackStats(req.user.id, track);
        const isPersonalBest = previousBest === null || finalTime < previousBest;

        res.status(201).json({
            accepted: true,
            lapTime: finalTime,
            isPersonalBest,
            ...stats
        });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// GET /api/laps/me?track=monza - personal best and last 5 laps, for the game page

router.get("/me", requireLogin, async (req, res, next) => {
    try {
        const track = String(req.query.track || "").trim();

        if (!TRACKS.includes(track)) {
            return res.status(400).json({ error: "Unknown track." });
        }

        const stats = await loadTrackStats(req.user.id, track);
        res.json(stats);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
