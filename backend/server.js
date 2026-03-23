const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const cors = require('cors');
const session = require('express-session');

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
    console.error('ERROR: SESSION_SECRET environment variable is required in production.');
    process.exit(1);
}

app.use(session({
    secret: process.env.SESSION_SECRET || 'musicfinder_dev_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
}));

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'music_finder',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306
});

db.connect(err => {
    if (err) throw err;
    console.log('MySQL Connected!');
    initTables();
});

function initTables() {
    const queries = [
        `CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            profile_pic LONGTEXT
        )`,
        `CREATE TABLE IF NOT EXISTS songs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            frontend_id VARCHAR(100) NOT NULL,
            title TEXT,
            artist TEXT,
            videoId VARCHAR(50),
            sourceType VARCHAR(20) DEFAULT 'youtube',
            artwork TEXT,
            UNIQUE KEY uq_user_song (userId, frontend_id)
        )`,
        `CREATE TABLE IF NOT EXISTS favorites (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            frontend_song_id VARCHAR(100) NOT NULL,
            UNIQUE KEY uq_user_fav (userId, frontend_song_id)
        )`,
        `CREATE TABLE IF NOT EXISTS resume_times (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            frontend_song_id VARCHAR(100) NOT NULL,
            resume_time DOUBLE NOT NULL DEFAULT 0,
            UNIQUE KEY uq_user_resume (userId, frontend_song_id)
        )`
    ];

    queries.forEach((sql, i) => {
        db.query(sql, (err) => {
            if (err) console.error(`Table init error (query ${i}):`, err);
        });
    });
    console.log('Tables ready.');
}

// Auth middleware
function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
}

// ===== AUTH ROUTES =====

app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username already exists' });
                return res.status(500).json({ error: 'Database error' });
            }
            req.session.userId = result.insertId;
            res.status(201).json({ ok: true, user: { id: result.insertId, username } });
        });
    } catch {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!results.length) return res.status(401).json({ error: 'Invalid username or password' });
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid username or password' });
        req.session.userId = user.id;
        res.json({ ok: true, user: { id: user.id, username: user.username, profile_pic: user.profile_pic || null } });
    });
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ ok: true });
    });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
    db.query('SELECT id, username, profile_pic FROM users WHERE id = ?', [req.session.userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!results.length) return res.status(404).json({ error: 'User not found' });
        res.json(results[0]);
    });
});

// ===== USER PROFILE ROUTES =====

app.put('/api/users/me/profile-pic', requireAuth, (req, res) => {
    const { profile_pic } = req.body;
    db.query('UPDATE users SET profile_pic = ? WHERE id = ?', [profile_pic || null, req.session.userId], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ ok: true });
    });
});

app.patch('/api/users/me', requireAuth, async (req, res) => {
    const { username, password } = req.body;
    const updates = [];
    const values = [];
    if (username) { updates.push('username = ?'); values.push(username); }
    if (password) {
        const hashed = await bcrypt.hash(password, 10);
        updates.push('password = ?');
        values.push(hashed);
    }
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
    values.push(req.session.userId);
    db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values, (err) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username already exists' });
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ ok: true });
    });
});

app.delete('/api/users/me', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const sql = `
        DELETE FROM resume_times WHERE userId = ?;
        DELETE FROM favorites WHERE userId = ?;
        DELETE FROM songs WHERE userId = ?;
        DELETE FROM users WHERE id = ?;
    `;
    db.query(sql, [userId, userId, userId, userId], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        req.session.destroy(() => res.json({ ok: true }));
    });
});

// ===== SONGS ROUTES =====

app.get('/api/songs', requireAuth, (req, res) => {
    db.query('SELECT frontend_id AS id, title, artist, videoId, sourceType, artwork FROM songs WHERE userId = ?',
        [req.session.userId], (err, results) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json(results);
        });
});

app.post('/api/songs', requireAuth, (req, res) => {
    const { id: frontend_id, title, artist, videoId, sourceType, artwork } = req.body;
    if (!frontend_id) return res.status(400).json({ error: 'Song id required' });
    const sql = `INSERT INTO songs (userId, frontend_id, title, artist, videoId, sourceType, artwork)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE title=VALUES(title), artist=VALUES(artist),
                     artwork=VALUES(artwork), videoId=VALUES(videoId), sourceType=VALUES(sourceType)`;
    db.query(sql, [req.session.userId, frontend_id, title || '', artist || '', videoId || '', sourceType || 'youtube', artwork || ''],
        (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.status(201).json({ ok: true });
        });
});

app.delete('/api/songs/:frontendId', requireAuth, (req, res) => {
    const frontendId = decodeURIComponent(req.params.frontendId);
    const userId = req.session.userId;
    db.query('DELETE FROM songs WHERE userId = ? AND frontend_id = ?', [userId, frontendId], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        db.query('DELETE FROM favorites WHERE userId = ? AND frontend_song_id = ?', [userId, frontendId], () => {});
        db.query('DELETE FROM resume_times WHERE userId = ? AND frontend_song_id = ?', [userId, frontendId], () => {});
        res.json({ ok: true });
    });
});

// ===== FAVORITES ROUTES =====

app.get('/api/favorites', requireAuth, (req, res) => {
    db.query('SELECT frontend_song_id FROM favorites WHERE userId = ?', [req.session.userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results.map(r => r.frontend_song_id));
    });
});

app.post('/api/favorites', requireAuth, (req, res) => {
    const { frontendSongId } = req.body;
    if (!frontendSongId) return res.status(400).json({ error: 'frontendSongId required' });
    db.query('INSERT IGNORE INTO favorites (userId, frontend_song_id) VALUES (?, ?)',
        [req.session.userId, frontendSongId], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.status(201).json({ ok: true });
        });
});

app.delete('/api/favorites/:frontendSongId', requireAuth, (req, res) => {
    const frontendSongId = decodeURIComponent(req.params.frontendSongId);
    db.query('DELETE FROM favorites WHERE userId = ? AND frontend_song_id = ?',
        [req.session.userId, frontendSongId], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ ok: true });
        });
});

// ===== RESUME TIME ROUTES =====

app.get('/api/resume-times', requireAuth, (req, res) => {
    db.query('SELECT frontend_song_id, resume_time FROM resume_times WHERE userId = ?',
        [req.session.userId], (err, results) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            const map = {};
            results.forEach(r => { map[r.frontend_song_id] = r.resume_time; });
            res.json(map);
        });
});

app.post('/api/resume-time', requireAuth, (req, res) => {
    const { frontendSongId, resume_time } = req.body;
    if (!frontendSongId) return res.status(400).json({ error: 'frontendSongId required' });
    const sql = `INSERT INTO resume_times (userId, frontend_song_id, resume_time) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE resume_time = VALUES(resume_time)`;
    db.query(sql, [req.session.userId, frontendSongId, resume_time || 0], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.status(201).json({ ok: true });
    });
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
