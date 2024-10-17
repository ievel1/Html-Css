const express = require('express');
const cors = require('cors');
const path = require('path'); // For serving static files
require('dotenv').config(); // Load environment variables

const app = express();
const port = 8000; // You can choose any available port

const client_id = process.env.SPOTIFY_CLIENT_ID; // Spotify Client ID from .env
const client_secret = process.env.SPOTIFY_CLIENT_SECRET; // Spotify Client Secret from .env
const redirect_uri = 'http://localhost:8000/callback'; // Ensure this matches your Spotify app settings

app.use(cors());

// Serve static files from your project folders
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/html', express.static(path.join(__dirname, 'html')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/javascript', express.static(path.join(__dirname, 'javascript')));
app.use('/lyrics', express.static(path.join(__dirname, 'lyrics')));
app.use('/music', express.static(path.join(__dirname, 'music')));

// Spotify Authentication Routes

// Login route
app.get('/login', (req, res) => {
  const scopes = 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state';
  res.redirect('https://accounts.spotify.com/authorize' +
    '?response_type=code' +
    '&client_id=' + encodeURIComponent(client_id) +
    '&scope=' + encodeURIComponent(scopes) +
    '&redirect_uri=' + encodeURIComponent(redirect_uri));
});

// Callback route
app.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  
  const authOptions = {
    method: 'POST',
    body: new URLSearchParams({
      code: code,
      redirect_uri: redirect_uri,
      grant_type: 'authorization_code',
    }),
    headers: {
      'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
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
      res.redirect('/html/lyrics.html#' +
        'access_token=' + access_token +
        '&refresh_token=' + refresh_token);
    } else {
      res.redirect('/html/lyrics.html#error=' + encodeURIComponent(body.error_description));
    }
  } catch (error) {
    console.error(error);
    res.redirect('/html/lyrics.html#error=invalid_token');
  }
});

// Token refresh route
app.get('/refresh_token', async (req, res) => {
  const refresh_token = req.query.refresh_token;
  const authOptions = {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refresh_token,
    }),
    headers: {
      'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', authOptions);
    const body = await response.json();

    if (response.ok) {
      const access_token = body.access_token;
      res.send({ 'access_token': access_token });
    } else {
      res.status(response.status).send(body);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to refresh token' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
