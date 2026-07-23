-- Database schema for Retro Formula 2D.
-- This file is run automatically on server start, so it is safe to run repeatedly.

-- Player accounts.
-- Passwords are never stored. Only a bcrypt hash is kept.
CREATE TABLE IF NOT EXISTS users (
    id             SERIAL PRIMARY KEY,
    username       TEXT        NOT NULL,
    username_lower TEXT        NOT NULL UNIQUE,  -- enforces case-insensitive uniqueness
    full_name      TEXT        NOT NULL,
    age            INTEGER     NOT NULL CHECK (age BETWEEN 1 AND 100),
    email          TEXT        NOT NULL,
    email_lower    TEXT        NOT NULL UNIQUE,
    password_hash  TEXT        NOT NULL,
    team           TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Every completed lap, one row each.
-- Personal bests and rankings are derived from this table, so nothing can drift out of sync.
CREATE TABLE IF NOT EXISTS lap_times (
    id         BIGSERIAL PRIMARY KEY,
    user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    track      TEXT         NOT NULL,
    team       TEXT,
    lap_time   NUMERIC(7,3) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Fast lookup for the rankings table (best time per track).
CREATE INDEX IF NOT EXISTS lap_times_track_time_idx
    ON lap_times (track, lap_time);

-- Fast lookup for a player's own recent laps on a track.
CREATE INDEX IF NOT EXISTS lap_times_user_track_idx
    ON lap_times (user_id, track, created_at DESC);

-- Issued when a car crosses the line to START a lap, and consumed when the lap is
-- submitted. This is what lets the server time the lap itself instead of trusting
-- whatever number the browser sends.
CREATE TABLE IF NOT EXISTS lap_sessions (
    id         UUID PRIMARY KEY,
    user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    track      TEXT        NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    used       BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS lap_sessions_started_at_idx
    ON lap_sessions (started_at);
