const express = require('express');
<<<<<<< HEAD
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const cors = require('cors');
=======
const cors = require('cors');
const bcrypt = require('bcrypt');
const mysql = require('mysql');
>>>>>>> 49bbe436d7010f53c84c690a9067d1f319ea8fe4

const app = express();
app.use(cors());
app.use(express.json());

<<<<<<< HEAD
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'music_finder',
    port: 3306
});

db.connect(err => {
    if (err) throw err;
    console.log('MySQL Connected!');
});

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err, result) => {
        if (err) return res.status(500).send(err);
        res.status(201).send('User registered successfully');
    });
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) return res.status(500).send(err);
        if (!results.length) return res.status(401).send('Username or password is incorrect');
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).send('Username or password is incorrect');
        res.send('Login successful');
    });
});

// Songs management routes
app.get('/api/songs/:userId', (req, res) => {
    const { userId } = req.params;
    db.query('SELECT * FROM songs WHERE userId = ?', [userId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.post('/api/songs', (req, res) => {
    const { userId, title, artist } = req.body;
    db.query('INSERT INTO songs (userId, title, artist) VALUES (?, ?, ?)', [userId, title, artist], (err, result) => {
        if (err) return res.status(500).send(err);
        res.status(201).send('Song added');
    });
});

app.delete('/api/songs/:songId', (req, res) => {
    const { songId } = req.params;
    db.query('DELETE FROM songs WHERE id = ?', [songId], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send('Song deleted');
    });
});

// Favorites routes
app.get('/api/favorites/:userId', (req, res) => {
    const { userId } = req.params;
    db.query('SELECT * FROM favorites WHERE userId = ?', [userId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.post('/api/favorites', (req, res) => {
    const { userId, songId } = req.body;
    db.query('INSERT INTO favorites (userId, songId) VALUES (?, ?)', [userId, songId], (err, result) => {
        if (err) return res.status(500).send(err);
        res.status(201).send('Favorite added');
    });
});

app.delete('/api/favorites/:userId/:songId', (req, res) => {
    const { userId, songId } = req.params;
    db.query('DELETE FROM favorites WHERE userId = ? AND songId = ?', [userId, songId], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send('Favorite deleted');
    });
});

// Resume time routes
app.get('/api/resume-time/:userId/:songId', (req, res) => {
    const { userId, songId } = req.params;
    db.query('SELECT resume_time FROM resume_times WHERE userId = ? AND songId = ?', [userId, songId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.post('/api/resume-time', (req, res) => {
    const { userId, songId, resume_time } = req.body;
    db.query('INSERT INTO resume_times (userId, songId, resume_time) VALUES (?, ?, ?)', [userId, songId, resume_time], (err, result) => {
        if (err) return res.status(500).send(err);
        res.status(201).send('Resume time added');
    });
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
=======
// MySQL connection
const db = mysql.createConnection({
   host: 'localhost',
   user: 'yourUsername',
   password: 'yourPassword',
   database: 'music_finder'
});

db.connect((err) => {
   if(err) throw err;
   console.log('Connected to music_finder database');
});

// Routes
// Auth Routes
app.post('/api/auth/register', (req, res) => {
    // Handle registration
});

app.post('/api/auth/login', (req, res) => {
    // Handle login
});

// Songs Routes
app.route('/api/songs')
    .get((req, res) => {
        // Get all songs
    })
    .post((req, res) => {
        // Add a new song
    })
    .delete((req, res) => {
        // Delete a song
    });

// Favorites Routes
app.route('/api/favorites')
    .get((req, res) => {
        // Get all favorites
    })
    .post((req, res) => {
        // Add a favorite
    })
    .delete((req, res) => {
        // Delete a favorite
    });

// Resume Time Routes
app.route('/api/resume-time')
    .get((req, res) => {
        // Get resume time
    })
    .post((req, res) => {
        // Set resume time
    });

// Health check
app.get('/api/health', (req, res) => {
    res.send('API is healthy');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
>>>>>>> 49bbe436d7010f53c84c690a9067d1f319ea8fe4
});