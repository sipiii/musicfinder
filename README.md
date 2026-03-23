# MusicFinder

A web-based music browser that uses YouTube search, with user accounts, favorites, resume times, and profile pictures — all persisted in MySQL.

## Tech Stack

- **Frontend:** React + Vite (port 5173)
- **Backend:** Express.js (port 3000)
- **Database:** MySQL
- **Auth:** HttpOnly cookie-based session (`express-session`)

## Setup

### 1. Database

Create the database and run the initial schema. You can use the SQL below:

```sql
CREATE DATABASE IF NOT EXISTS music_finder;
USE music_finder;

-- Tables are auto-created by the server on startup.
-- If you are migrating from a previous version, apply these migrations:

-- Add profile_pic column to users (if upgrading)
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_pic LONGTEXT;

-- Recreate songs table with new columns (if upgrading from old schema)
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS frontend_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS videoId VARCHAR(50),
  ADD COLUMN IF NOT EXISTS sourceType VARCHAR(20) DEFAULT 'youtube',
  ADD COLUMN IF NOT EXISTS artwork TEXT;

-- Add UNIQUE constraint to songs (if upgrading)
ALTER TABLE songs ADD UNIQUE KEY IF NOT EXISTS uq_user_song (userId, frontend_id);

-- Recreate favorites to use frontend_song_id (if upgrading)
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS frontend_song_id VARCHAR(100);
ALTER TABLE favorites ADD UNIQUE KEY IF NOT EXISTS uq_user_fav (userId, frontend_song_id);

-- Add UNIQUE constraint to resume_times (if upgrading)
ALTER TABLE resume_times ADD COLUMN IF NOT EXISTS frontend_song_id VARCHAR(100);
ALTER TABLE resume_times ADD UNIQUE KEY IF NOT EXISTS uq_user_resume (userId, frontend_song_id);
```

> **Fresh install:** Tables are created automatically when the backend starts.

### 2. Backend

```bash
cd backend
npm install
npm start
```

The server runs on **http://localhost:3000**.

#### Environment variables (optional)

You can configure the backend with environment variables:

| Variable         | Default           | Description              |
|-----------------|-------------------|--------------------------|
| `DB_HOST`       | `localhost`       | MySQL host               |
| `DB_USER`       | `root`            | MySQL user               |
| `DB_PASS`       | *(empty)*         | MySQL password           |
| `DB_NAME`       | `music_finder`    | MySQL database name      |
| `DB_PORT`       | `3306`            | MySQL port               |
| `SESSION_SECRET`| `musicfinder_dev_secret` | Session secret key |
| `FRONTEND_URL`  | `http://localhost:5173` | Frontend URL for CORS |

### 3. Frontend

```bash
npm install
npm run dev
```

The app runs on **http://localhost:5173**.

## Authentication

- Uses **HttpOnly cookie-based sessions** (`express-session`)
- No data is stored in `localStorage` or `sessionStorage`
- Session cookie is set on login/register and destroyed on logout
- Refresh keeps you logged in (cookie persists for 7 days)

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/logout` | Logout (destroys session) |
| `GET`  | `/api/auth/me` | Get current user info |

### Songs
| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/songs` | Get all songs for logged-in user |
| `POST` | `/api/songs` | Add or update a song |
| `DELETE` | `/api/songs/:frontendId` | Delete a song |

### Favorites
| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/favorites` | Get favorite song IDs |
| `POST` | `/api/favorites` | Add a favorite |
| `DELETE` | `/api/favorites/:frontendSongId` | Remove a favorite |

### Resume Times
| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/resume-times` | Get all resume times as `{id: seconds}` |
| `POST` | `/api/resume-time` | Save/update a resume time (upsert) |

### User Profile
| Method | Path | Description |
|--------|------|-------------|
| `PUT`  | `/api/users/me/profile-pic` | Save profile picture (base64 DataURL) |
| `PATCH` | `/api/users/me` | Update username and/or password |
| `DELETE` | `/api/users/me` | Delete account and all associated data |

