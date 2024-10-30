// routes/apiRoutes.js

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// Search endpoint
router.get('/search', async (req, res) => {
  const query = req.query.q;
  const authHeader = req.headers.authorization;

  if (!query || !authHeader) {
    return res.status(400).send({ error: 'Missing query or access token' });
  }

  const access_token = authHeader.split(' ')[1];

  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
    query
  )}&type=track&limit=10`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      res.send(data);
    } else {
      let errorData;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
      } else {
        errorData = { error: await response.text() };
      }

      console.error('Spotify API Error:', response.status, errorData);
      res.status(response.status).send(errorData);
    }
  } catch (error) {
    console.error('Error in /search:', error);
    res.status(500).send({ error: 'Failed to search' });
  }
});

// Playlists endpoint
router.get('/playlists', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(400).send({ error: 'Missing access token' });
  }

  const access_token = authHeader.split(' ')[1];
  const url = 'https://api.spotify.com/v1/me/playlists';

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      res.send(data);
    } else {
      let errorData;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
      } else {
        errorData = { error: await response.text() };
      }

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        errorData = {
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
        };
      }

      console.error('Spotify API Error:', response.status, errorData);
      res.status(response.status).send(errorData);
    }
  } catch (error) {
    console.error('Error in /playlists:', error);
    res.status(500).send({ error: 'Failed to fetch playlists' });
  }
});

module.exports = router;
