// Shared server-side configuration.
// Anything the server has to trust (valid tracks, valid teams, lap limits) lives here
// rather than in the browser, because anything sent from the browser can be faked.

// The three tracks. Used to validate every incoming track name.
const TRACKS = ["monza", "silverstone", "monaco"];

// The six teams. Used to validate the team a player picks.
const TEAMS = [
    "mercedes",
    "redbull",
    "ferrari",
    "mclaren",
    "astonmartin",
    "audi"
];

// Fastest lap that is physically possible on each track, in seconds.
// A submitted lap below this is rejected outright.
//
// This is the strongest anti-cheat lever you have, and it is worth tuning. Drive each
// track a few times, take your best honest lap, and set the value a little under it.
// A minimum of 10s on a track where nobody has ever gone under 45s leaves a wide gap
// that a cheat can sit inside; a minimum of 40s closes it.
const MIN_LAP_TIME = {
    monza: 10,
    silverstone: 10,
    monaco: 10
};

// Slowest lap that will be recorded. Anything above this is treated as the player
// wandering off rather than setting a lap.
const MAX_LAP_TIME = 600;

// How far the lap time claimed by the browser is allowed to differ from the time the
// server measured between "lap started" and "lap submitted".
//
// What the server sees is:
//     serverElapsed = realLapTime + (latency of the submit request)
//                                 - (latency of the start request)
//
// so the gap between the two numbers is only the difference between two network trips,
// normally a fraction of a second.
//
// behindServer is the important one. It is how many seconds a player can quietly shave
// off a lap before the server notices, so it is kept as tight as real connections allow.
// Raising it to be forgiving of bad networks hands exactly that many seconds to anyone
// editing their lap time in the browser console.
//
// aheadOfServer covers the opposite case, where the "lap started" request was slow to
// arrive so the lap looks longer than the server's own measurement. Nobody cheats to
// look slower, so that side can afford to be generous.
const CLOCK_TOLERANCE = {
    aheadOfServer: 3,   // browser claims up to 3s MORE elapsed than the server saw
    behindServer: 2     // browser claims up to 2s LESS elapsed than the server saw
};

// A lap session (issued when the car first crosses the line) expires after this long.
const LAP_SESSION_MAX_AGE_MINUTES = 30;

module.exports = {
    TRACKS,
    TEAMS,
    MIN_LAP_TIME,
    MAX_LAP_TIME,
    CLOCK_TOLERANCE,
    LAP_SESSION_MAX_AGE_MINUTES
};
