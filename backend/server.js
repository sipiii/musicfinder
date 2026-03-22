const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const mysql = require('mysql');

const app = express();
app.use(cors());
app.use(express.json());

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
});