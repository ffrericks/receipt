require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./models');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1); // vertrouw proxy headers van Nginx/NPM
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Te veel inlogpogingen. Probeer het over 15 minuten opnieuw.' }
});

app.use('/api/auth/login', loginLimiter);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/receipts', require('./routes/receipts'));
app.use('/api/stores', require('./routes/stores'));
app.use('/api/presets', require('./routes/presets'));
app.use('/api/n8n', require('./routes/n8n'));
app.use('/api/stats', require('./routes/stats'));

app.use(errorHandler);

sequelize.authenticate()
  .then(() => {
    console.log('Database verbinding OK');
    return sequelize.sync({ alter: false });
  })
  .then(() => {
    app.listen(PORT, () => console.log(`Backend draait op poort ${PORT}`));
  })
  .catch(err => {
    console.error('Database verbinding mislukt:', err);
    process.exit(1);
  });
