const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables
dotenv.config();

// Initialize the app
const app = express();
app.use(cors());
app.use(express.json());

// Connect to the database
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

db.connect((err) => {
    if (err) {
        console.error('Database connection error:', err.message);
        process.exit(1); // Stop the server on critical error
    } else {
        console.log('Connected to the database.');
    }
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'Token is missing.' });
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid token.' });
        }
        req.user = decoded; // Attach decoded token data to request
        next();
    });
};

// User login
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], (err, results) => {
        if (err) return res.status(500).json({ message: 'Server error.' });
        if (results.length === 0) return res.status(404).json({ message: 'User not found.' });

        const user = results[0];
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) return res.status(500).json({ message: 'Server error.' });
            if (!isMatch) return res.status(401).json({ message: 'Incorrect password.' });

            // Generate JWT
            const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.json({ message: 'Login successful.', token });
        });
    });
});

// Fetch all movies
app.get('/movies', verifyToken, (req, res) => {
    const query = 'SELECT * FROM films WHERE available_copies > 0';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ message: 'Server error.' });
        res.json(results);
    });
});

// Rent a movie
app.post('/rent', verifyToken, (req, res) => {
    const { filmId } = req.body;

    if (!filmId) {
        return res.status(400).json({ message: 'Film ID is required.' });
    }

    const checkRentalQuery = `
        SELECT COUNT(*) AS rentals_count 
        FROM rentals 
        WHERE user_id = ? AND return_date IS NULL;
    `;

    const checkDuplicateRentalQuery = `
        SELECT * 
        FROM rentals 
        WHERE user_id = ? AND film_id = ? AND return_date IS NULL;
    `;

    db.query(checkRentalQuery, [req.user.id], (err, rentalCountResults) => {
        if (err) return res.status(500).json({ message: 'Server error.' });

        if (rentalCountResults[0].rentals_count >= 5) {
            return res.status(400).json({ message: 'You cannot rent more than 5 movies at a time.' });
        }

        db.query(checkDuplicateRentalQuery, [req.user.id, filmId], (err, duplicateResults) => {
            if (err) return res.status(500).json({ message: 'Server error.' });

            if (duplicateResults.length > 0) {
                return res.status(400).json({ message: 'You have already rented this movie.' });
            }

            const checkAvailableCopiesQuery = 'SELECT * FROM films WHERE id = ?';
            db.query(checkAvailableCopiesQuery, [filmId], (err, filmResults) => {
                if (err) return res.status(500).json({ message: 'Server error.' });
                if (filmResults.length === 0) return res.status(404).json({ message: 'Film not found.' });

                const film = filmResults[0];
                if (film.available_copies <= 0) {
                    return res.status(400).json({ message: 'No available copies for this film.' });
                }

                const insertRentalQuery = `
                    INSERT INTO rentals (user_id, film_id, rental_date) 
                    VALUES (?, ?, NOW());
                `;

                const updateFilmCopiesQuery = `
                    UPDATE films SET available_copies = available_copies - 1 WHERE id = ?;
                `;

                db.query(insertRentalQuery, [req.user.id, filmId], (err) => {
                    if (err) return res.status(500).json({ message: 'Server error.' });

                    db.query(updateFilmCopiesQuery, [filmId], (err) => {
                        if (err) return res.status(500).json({ message: 'Server error.' });
                        res.status(200).json({ message: `Film "${film.title}" rented successfully.` });
                    });
                });
            });
        });
    });
});
// User registration
app.post('/register', (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    const queryCheckUser = 'SELECT * FROM users WHERE email = ?';
    db.query(queryCheckUser, [email], (err, results) => {
        if (err) return res.status(500).json({ message: 'Server error.' });
        if (results.length > 0) return res.status(409).json({ message: 'Email is already registered.' });

        bcrypt.hash(password, 10, (err, hash) => {
            if (err) return res.status(500).json({ message: 'Password hashing error.' });

            const queryInsertUser = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
            db.query(queryInsertUser, [name, email, hash], (err) => {
                if (err) return res.status(500).json({ message: 'Server error.' });
                res.status(201).json({ message: 'Registration successful.' });
            });
        });
    });
});
// Endpoint pour retourner un film
app.post('/return', verifyToken, (req, res) => {
    const { filmId } = req.body;

    if (!filmId) {
        return res.status(400).json({ message: 'Film ID manquant.' });
    }

    // Vérifier si l'utilisateur a réellement loué ce film
    const checkRentalQuery = `
        SELECT * 
        FROM rentals 
        WHERE user_id = ? AND film_id = ? AND return_date IS NULL;
    `;

    db.query(checkRentalQuery, [req.user.id, filmId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Erreur serveur.' });
        if (results.length === 0) return res.status(404).json({ message: 'Aucune location active trouvée pour ce film.' });

        // Mettre à jour la date de retour
        const updateRentalQuery = `
            UPDATE rentals 
            SET return_date = NOW() 
            WHERE user_id = ? AND film_id = ? AND return_date IS NULL;
        `;

        db.query(updateRentalQuery, [req.user.id, filmId], (err) => {
            if (err) return res.status(500).json({ message: 'Erreur lors de la mise à jour de la location.' });

            // Incrémenter le nombre de copies disponibles
            const incrementCopiesQuery = `
                UPDATE films 
                SET available_copies = available_copies + 1 
                WHERE id = ?;
            `;

            db.query(incrementCopiesQuery, [filmId], (err) => {
                if (err) return res.status(500).json({ message: 'Erreur lors de la mise à jour des copies disponibles.' });
                res.status(200).json({ message: 'Film retourné avec succès !' });
            });
        });
    });
});


// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
