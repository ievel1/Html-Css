// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI || 'https://localhost:8000/callback';

// Login route
router.get('/login', (req, res) => {
  const scopes = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-read-playback-state',
    'user-modify-playback-state',
    'playlist-read-private',
    'playlist-read-collaborative',
  ].join(' ');

  res.redirect(
    'https://accounts.spotify.com/authorize' +
      '?response_type=code' +
      '&client_id=' +
      encodeURIComponent(client_id) +
      '&scope=' +
      encodeURIComponent(scopes) +
      '&redirect_uri=' +
      encodeURIComponent(redirect_uri)
  );
});

// Callback route
router.get('/callback', async (req, res, next) => {
  const code = req.query.code || null;

  const authOptions = {
    method: 'POST',
    body: new URLSearchParams({
      code: code,
      redirect_uri: redirect_uri,
      grant_type: 'authorization_code',
    }),
    headers: {
      Authorization:
        'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', authOptions);
    const body = await response.json();

    if (response.ok) {
      const access_token = body.access_token;
      const refresh_token = body.refresh_token;

      // Pass the tokens in the query parameters to the client
      res.redirect(
        '/html/lyrics.html#' +
          'access_token=' +
          access_token +
          '&refresh_token=' +
          refresh_token
      );
    } else {
      res.redirect(
        '/html/lyrics.html#error=' + encodeURIComponent(body.error_description)
      );
    }
  } catch (error) {
    console.error('Error in /callback:', error);
    res.redirect('/html/lyrics.html#error=invalid_token');
  }
});

// Token refresh route
router.get('/refresh_token', async (req, res) => {
  const refresh_token = req.query.refresh_token;
  const authOptions = {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refresh_token,
    }),
    headers: {
      Authorization:
        'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', authOptions);
    const body = await response.json();

    if (response.ok) {
      const access_token = body.access_token;
      res.send({ access_token: access_token });
    } else {
      res.status(response.status).send(body);
    }
  } catch (error) {
    console.error('Error in /refresh_token:', error);
    res.status(500).send({ error: 'Failed to refresh token' });
  }
});

module.exports = router;
