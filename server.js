// server.js

const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const https = require('https');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const port = process.env.PORT || 8000;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", 'https://sdk.scdn.co'],
        scriptSrc: ["'self'", 'https://sdk.scdn.co'],
        connectSrc: ["'self'", 'https://api.spotify.com', 'https://sdk.scdn.co'],
        frameSrc: ["'self'", 'https://sdk.scdn.co'],
        imgSrc: ["'self'", 'data:', 'https://i.scdn.co'],
      },
    },
  })
);

// CORS middleware
app.use(cors());

// HTTP request logger
app.use(morgan('combined'));

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
});

app.use(limiter);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', authRoutes);
app.use('/', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).send({ error: 'Something went wrong!' });
});

// HTTPS server options
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
};

// Start HTTPS server
https.createServer(options, app).listen(port, () => {
  console.log(`Secure server running on port ${port}`);
});
