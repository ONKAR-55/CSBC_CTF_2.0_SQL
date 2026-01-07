const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const path = require('path');

const app = express();
const db = new sqlite3.Database(':memory:');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'simple-ctf-key', resave: false, saveUninitialized: true }));

// --- DATABASE SETUP ---
db.serialize(() => {
    db.run("CREATE TABLE users (id INTEGER, username TEXT, password TEXT, role TEXT)");
    // Admin has a long password to prevent brute force
    db.run("INSERT INTO users VALUES (1, 'admin', 'complex_hidden_pass_2026', 'admin')");
});

// --- ROUTES ---

// 1. Landing Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/land.html'));
});

// 2. Login Page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/login.html'));
});

// 3. Vulnerable Login Logic
app.post('/auth', (req, res) => {
    const { username, password } = req.body;

    // VULNERABLE TO SQLi
    const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

    db.get(query, (err, row) => {
        if (err) {
            res.status(500).send("Database Error: " + err.message);
        } else if (row) {
            req.session.user = row.username;
            req.session.role = row.role;
            res.redirect('/main');
        } else {
            res.send("Invalid credentials. <a href='/login'>Try again</a>");
        }
    });
});

// 4. Admin Dashboard (Where the flag is hidden in headers)
app.get('/main', (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    // SNEAKY: The flag is NOT in the HTML body. 
    // It is sent as a custom HTTP response header.
    if (req.session.role === 'admin') {
        res.setHeader('X-Flag-Internal', 'CSBC{SQLi_and_res_Master_2026}');
    }

    res.sendFile(path.join(__dirname, 'public/main.html'));
});

app.listen(3000, () => console.log('Challenge active on http://localhost:3000'));