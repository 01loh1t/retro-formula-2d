# Retro Formula 2D

A 2D top-down Formula racing game with player accounts, saved lap times and live rankings.

Three tracks (Monza, Silverstone, Monaco), six teams, and a leaderboard shared by everyone
who plays. Built with vanilla HTML, CSS and JavaScript on the front end, Phaser 3 for the
game itself, and Node/Express with PostgreSQL behind it.

---

## What changed from the coursework version

The game, the look and the page layouts are the same. What moved is where the data lives.

| | Coursework version | This version |
|---|---|---|
| Accounts | `localStorage` in one browser | PostgreSQL, shared by everyone |
| Passwords | Stored as plain text | bcrypt hashes, never reversible |
| Login | A username in `sessionStorage` | Signed httpOnly cookie |
| Rankings | Only players on that one computer | Every player, sorted in the database |
| Lap times | Whatever the browser reported | Timed by the server and checked |
| Validation | In the browser only | Browser **and** server |

The reason for most of these is the same: once the site is online, anything running in the
browser belongs to the player, and some players will edit it. Every rule that decides
whether a lap counts now runs somewhere they cannot reach.

---

## Running it on your own machine

You need Node.js 18 or newer and a PostgreSQL database. You do not have to install
PostgreSQL locally — a free hosted one is quicker and means your local setup matches
production exactly.

**1. Get a database.** Sign up at [neon.com](https://neon.com) (free tier, no card) and
create a project. Copy the connection string it gives you, which looks like:

```
postgresql://user:password@ep-something.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

**2. Configure the app.**

```bash
cp .env.example .env
```

Open `.env` and paste your connection string into `DATABASE_URL`. Then generate a secret
for signing login cookies and paste it into `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**3. Add your assets.** Copy your `assets` folder into `public/assets/`. See
`public/assets/README.md` for the structure and two filename traps worth avoiding.

**4. Start it.**

```bash
npm install
npm start
```

Open <http://localhost:3000>. The database tables are created automatically on first run.

While developing, `npm run dev` restarts the server whenever you save a file.

---

## Deploying it

### GitHub Pages will not work for this

Worth saying plainly, since it is the obvious first thing to try. GitHub Pages only serves
static files. It cannot run Node, and it cannot talk to a database. The original coursework
version would have worked there; this one needs somewhere that runs a server.

Use GitHub to **store** the code, and one of the hosts below to **run** it.

### Render (free tier, straightforward)

1. Push this folder to a GitHub repository.
2. On [render.com](https://render.com), create a **New Web Service** and connect the repo.
3. Settings:
   - Build command: `npm install`
   - Start command: `npm start`
4. Under **Environment**, add:
   - `DATABASE_URL` — your Neon connection string
   - `JWT_SECRET` — the secret you generated
   - `NODE_ENV` — `production`
5. Deploy. Render gives you a `.onrender.com` address to test on.

Railway and Fly.io work the same way if you prefer them.

**One thing about the free tier:** it sleeps after inactivity, so the first visit after a
quiet spell takes 30 seconds or so to wake up. Fine for testing, worth paying to remove
before you tell people about it.

### Pointing your domain at it

Once you have bought the domain, add it under **Settings → Custom Domain** on Render and
create the DNS record it asks for at your registrar. HTTPS certificates are issued
automatically. Nothing in the code needs to change.

Do set `NODE_ENV=production` before going live — it is what makes the login cookie
HTTPS-only.

---

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

### Files

```
server/
  server.js          Express setup, static files, security headers, error handling
  db.js              Connection pool and the query helper
  schema.sql         Table definitions, run automatically on every start
  config.js          Valid tracks and teams, lap time limits  ← tune this one
  validation.js      Sign up rules, shared shape with the browser's checks
  middleware/auth.js Login cookies: signing, reading, requiring
  routes/auth.js     Register, log in, log out, who am I, save team
  routes/laps.js     Start a lap, submit a lap, personal stats
  routes/rankings.js The leaderboard query

public/
  index.html         Home page, sign up and login modals, track selection
  game.html          The game
  rankings.html      Leaderboard
  css_files/         Your stylesheet, unchanged
  js_files/
    api.js           Shared fetch wrapper used by every page
    registration_login.js
    script.js        Home page behaviour
    game_ui.js       Game page UI, personal stats, switch track
    game.js          Phaser game, Car class, lap timing
    rankings.js      Leaderboard table
    ui_effects.js    Smooth scrolling
  assets/            Your images, sounds and logos
```

### The database

Three tables. Personal bests and rankings are **calculated** from `lap_times` rather than
stored separately, so there is no second copy of the truth to drift out of sync.

- `users` — one row per account. Holds a bcrypt hash, never a password.
- `lap_times` — one row per completed lap.
- `lap_sessions` — one row per lap in progress, used for the timing check below.

---

## How lap times are protected

The browser measures the lap, and the browser belongs to the player. Someone who opens the
developer console can call the submit function with any number they like. So the server
runs its own clock alongside:

1. The car crosses the line to start a lap. The browser calls `POST /api/laps/start`, and
   the server writes down the current time and hands back a one-use session id.
2. The car crosses the line to finish. The browser sends its lap time and that session id.
3. The server compares the submitted time against the time it actually measured, and
   accepts the lap only if the two agree.

A submitted lap is rejected when:

- it is faster than `MIN_LAP_TIME` for that track,
- it is more than `CLOCK_TOLERANCE.behindServer` seconds faster than the server measured,
- the session id was already used, is unknown, or has expired,
- the lap took longer than `MAX_LAP_TIME`.

The team stored against a lap comes from the account, not from the browser, so nobody can
appear in the rankings under a team they never picked.

### What this does not do

It bounds cheating rather than eliminating it. `behindServer` is set to 2 seconds, which is
the slack needed to avoid rejecting honest laps from players on slow connections — and it
is therefore also the most anyone can shave off a lap undetected. On a 40-second lap that
is a 5% advantage.

Two things narrow that gap, in order of value:

1. **Set `MIN_LAP_TIME` per track properly** in `server/config.js`. Right now all three sit
   at a placeholder 10 seconds. Drive each track, take your best honest lap, and set the
   minimum just under it. This is the single most effective change you can make.
2. **Lower `behindServer`** once you see how your players' connections behave. Every second
   you remove is a second a cheat cannot use — but set it too low and honest players on bad
   networks start losing valid laps.

Eliminating it entirely would mean the server simulating the car and validating the whole
driving input stream, which is a much larger piece of work and not worth it at this scale.

Worth knowing: the invisible shortcut walls and the pixel-based track limits both still run
purely in the browser, so a determined player could disable them. The timing check is what
stops that turning into a leaderboard time, since cutting the track still has to produce a
lap that survives the minimum-time check.

---

## Tuning

Almost everything you will want to adjust is in `server/config.js`: valid tracks and teams,
minimum and maximum lap times, timing tolerance, and how long an abandoned lap session
lives before it expires.

Rate limits live at the top of `server/routes/auth.js` and `server/routes/laps.js`. The
current limits are 20 login attempts per 15 minutes and 10 new accounts per hour from one
address, which stops password guessing without getting in a real player's way.

---

## Things worth doing before you tell people about it

Not needed to deploy, but they will come up:

- **A way to reset a forgotten password.** Right now there is none, and you will get asked.
  It needs an email service, so it is a proper piece of work rather than a quick fix.
- **Confirm email addresses at sign up.** Nothing currently checks that an address is real.
- **A backup schedule for the database.** Neon and Render both offer this; turn it on before
  there is anything worth losing.
- **Set the per-track minimum lap times**, as above.
