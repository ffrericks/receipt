const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const APP_USER = process.env.APP_USER || 'admin';
const APP_PASSWORD_HASH = process.env.APP_PASSWORD_HASH;

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Gebruikersnaam en wachtwoord zijn verplicht.' });
    }
    if (username !== APP_USER) {
      return res.status(401).json({ error: 'Onjuiste inloggegevens.' });
    }
    const valid = APP_PASSWORD_HASH
      ? await bcrypt.compare(password, APP_PASSWORD_HASH)
      : password === process.env.APP_PASSWORD;
    if (!valid) {
      return res.status(401).json({ error: 'Onjuiste inloggegevens.' });
    }
    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
