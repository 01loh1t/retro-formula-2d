// Rankings route - the leaderboard for a track.

const express = require("express");
const db = require("../db");
const { TRACKS } = require("../config");

const router = express.Router();

// GET /api/rankings?track=monza&search=lohit
//
// Returns every player who has set a lap on the track, fastest first.
// Sorting and filtering happen in the database rather than the browser, so the page works
// the same whether there are 10 players or 100,000 and no one's data is sent to a browser
// that has no reason to see it.
router.get("/", async (req, res, next) => {
    try {
        const track = String(req.query.track || "").trim();

        if (!TRACKS.includes(track)) {
            return res.status(400).json({ error: "Unknown track." });
        }

        const search = String(req.query.search || "").trim();

        // Escape the wildcards so a username containing % or _ is searched literally.
        const pattern = "%" + search.replace(/[\\%_]/g, "\\$&") + "%";

        // DISTINCT ON keeps one row per player - their fastest lap - along with the team
        // they were driving for it. The outer query then orders those bests overall.
        const result = await db.query(
            `SELECT username, team, lap_time
             FROM (
                 SELECT DISTINCT ON (l.user_id)
                        l.user_id, u.username, l.team, l.lap_time
                 FROM lap_times l
                 JOIN users u ON u.id = l.user_id
                 WHERE l.track = $1
                   AND u.username ILIKE $2
                 ORDER BY l.user_id, l.lap_time ASC, l.created_at ASC
             ) best_per_player
             ORDER BY lap_time ASC
             LIMIT 500`,
            [track, pattern]
        );

        res.json({
            track,
            rankings: result.rows.map((row) => ({
                username: row.username,
                team: row.team,
                bestLapTime: Number(row.lap_time)
            }))
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
