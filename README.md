# Retro Formula 2D

A 2D top-down Formula racing game with player accounts, server-timed lap records, and a global leaderboard shared by everyone who plays.

Three tracks (Monza, Silverstone, Monaco), six teams, and rankings that update live across every player. Built as a browser game with a real backend behind it: vanilla HTML/CSS/JS and Phaser 3 on the front end, Node/Express and PostgreSQL on the server.

> **Note:** This started as a coursework project that ran entirely in the browser. I rebuilt it into a full client–server application, which meant solving the hard part of any online game: **you cannot trust anything the player's browser tells you.** The sections below on authentication and anti-cheat are where most of that work went.

<!--
  TIP: Add a screenshot or GIF here — it has more impact than anything else in this file.
  Record 5–10 seconds of gameplay, save it as docs/demo.gif, and uncomment:

  ![Gameplay demo](docs/demo.gif)
-->

## Highlights

- **Server-authoritative lap timing** — the server runs its own clock for every lap and rejects times the browser couldn't actually have produced, so the leaderboard can't be faked from the dev console.
- **Proper authentication** — passwords stored as bcrypt hashes (never plain text), sessions carried in a signed, httpOnly cookie rather than browser storage.
- **One shared source of truth** — accounts, lap times, and rankings all live in PostgreSQL, so every player competes on the same leaderboard instead of a per-browser one.
- **Validation on both sides** — the browser checks input for a fast response; the server re-checks everything, because browser rules belong to the player.

## Features

- Three distinct tracks and six selectable teams
- Account registration and login
- Personal best times and per-track stats
- A global leaderboard sorted in the database across all players
- Rate limiting to block password guessing and account spam

## Tech stack

| Layer | Used |
|---|---|
| Game engine | Phaser 3 |
| Front end | Vanilla HTML, CSS, JavaScript |
| Server | Node.js, Express |
| Database | PostgreSQL |
| Auth | bcrypt, signed httpOnly cookies (JWT) |

## How it fits together

```
Browser                          Server                        Database
───────                          ──────                        ────────
index.html    ──── fetch ────>   /api/auth/register  ────>     users
game.html                        /api/auth/login
rankings.html                    /api/auth/me
                                 /api/auth/me/team
Phaser game   ──── fetch ────>   /api/laps/start     ────>     lap_sessions
                                 /api/laps           ────>     lap_times
                                 /api/laps/me
rankings.js   ──── fetch ────>   /api/rankings       ────>     lap_times + users
```

## How lap times are protected

The browser measures the lap, and the browser belongs to the player. Anyone who opens the developer console can call the submit function with any number they like. So the server keeps its own clock:

1. The car crosses the line to start a lap. The browser calls `POST /api/laps/start`; the server records the current time and returns a one-use session id.
2. The car crosses the line to finish. The browser sends its lap time and that session id.
3. The server compares the submitted time against the time it actually measured, and accepts the lap only if the two agree.

A lap is rejected when it is faster than the track's minimum, more than the clock tolerance ahead of the server's own measurement, longer than the maximum, or tied to a session id that was already used, unknown, or expired. The team recorded against a lap comes from the account, not the browser, so nobody appears under a team they never picked.

This **bounds** cheating rather than eliminating it: the tolerance that keeps honest players on slow connections from being wrongly rejected is also the most anyone can shave off undetected. Closing that gap entirely would mean simulating the car server-side, which is a much larger piece of work than this project's scale justifies — a tradeoff I made deliberately rather than by omission.

## Running it locally

You need Node.js 18+ and a PostgreSQL database. You don't have to install PostgreSQL — a free hosted one is quicker and makes your local setup match production.

1. **Get a database.** Sign up at [neon.com](https://neon.com) (free tier, no card) and create a project. Copy the connection string, which looks like:
   ```
   postgresql://user:password@ep-something.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

2. **Configure the app.**
   ```
   cp .env.example .env
   ```
   Paste your connection string into `DATABASE_URL`, then generate a cookie-signing secret and paste it into `JWT_SECRET`:
   ```
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

3. **Add your assets.** Copy your assets folder into `public/assets/` (see `public/assets/README.md` for the structure).

4. **Start it.**
   ```
   npm install
   npm start
   ```
   Open `http://localhost:3000`. Tables are created automatically on first run. During development, `npm run dev` restarts the server on save.

## Deploying

GitHub Pages won't work — it only serves static files and can't run Node or reach a database. Use GitHub to store the code and a host that runs a server to run it.

**On [Render](https://render.com) (free tier):**

1. Push this folder to a GitHub repo.
2. Create a new **Web Service** and connect the repo.
3. Build command `npm install`, start command `npm start`.
4. Add environment variables: `DATABASE_URL`, `JWT_SECRET`, and `NODE_ENV=production`.
5. Deploy.

Railway and Fly.io work the same way. Note the free tier sleeps after inactivity, so the first visit after a quiet spell takes ~30 seconds to wake. Setting `NODE_ENV=production` is what makes the login cookie HTTPS-only.

## Project structure

```
server/
  server.js          Express setup, static files, security headers, error handling
  db.js              Connection pool and query helper
  schema.sql         Table definitions, run on every start
  config.js          Valid tracks and teams, lap time limits
  validation.js      Sign-up rules, shared shape with the browser's checks
  middleware/auth.js Login cookies: signing, reading, requiring
  routes/            auth.js, laps.js, rankings.js

public/
  index.html         Home page, sign up / login, track selection
  game.html          The game
  rankings.html      Leaderboard
  css_files/         Stylesheets
  js_files/          api.js, game.js (Phaser + lap timing), rankings.js, and page UI
  assets/            Images, sounds, logos
```

The database uses three tables. Personal bests and rankings are calculated from `lap_times` rather than stored separately, so there's no second copy of the truth to drift out of sync: `users` (one row per account, holds a bcrypt hash), `lap_times` (one row per completed lap), and `lap_sessions` (one row per lap in progress, used for the timing check).

## Roadmap

- Per-track minimum lap times tuned to real honest laps (currently a placeholder)
- Password reset (needs an email service)
- Email confirmation at sign-up
- Scheduled database backups

## License

Released under the **GNU General Public License v3.0** — see [`LICENSE`](LICENSE). You're welcome to read and learn from this code; anything built on it must remain open-source under the same license.
