const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const pasteService = require('./services/paste.service');
const { removeExpiredPastes } = require('./services/cleanup.service');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'webUI'));

app.use('/', require('./routes'));

// Error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    
    const response = {
        success: false,
        message: 'Internal Server Error',
    };
    
    if (process.env.NODE_ENV === 'development') {
        response.error = err.message;
    }
    
    res.status(500).json(response);
};

const PORT = process.env.PORT || 3000;
const CLEANUP_INTERVAL_MINS = process.env.CLEANUP_INTERVAL_MINS || 1;
const cleanupInterval = CLEANUP_INTERVAL_MINS * 30 * 1000;

// Server setup and listen
const startServer = () => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        setInterval(removeExpiredPastes, cleanupInterval);
    });
};

app.use(errorHandler);

startServer();
