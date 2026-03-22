const express = require('express');
const mysql = require('mysql');

const app = express();
const PORT = process.env.PORT || 3000;

// MySQL connection setup
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'music_finder'
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database.');
});

app.get('/', (req, res) => {
    res.send('Welcome to the Music Finder API!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
