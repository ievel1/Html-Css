// Parse the URL hash to get access token
function getHashParams() {
  const hash = window.location.hash.substring(1);
  const params = {};
  const regex = /([^&;=]+)=?([^&;]*)/g;
  let e;
  while ((e = regex.exec(hash))) {
    params[e[1]] = decodeURIComponent(e[2]);
  }
  return params;
}

const params = getHashParams();
let accessToken = params.access_token;
let refreshToken = params.refresh_token;

const songs = [
  {
    title: 'Far Caspian - Finding My Way Home',
    audioFile: 'Finding_My_Way_Home.mp3',
    lyricsFile: 'finding_my_way_home.txt',
    imageFile: 'Finding.jpg',
    youtubeLink: 'https://www.youtube.com/watch?v=TxNjyTtCKAo',
  },
  {
    title: 'Yeat - Money So Big (InstrumentalTikTok Remix)',
    audioFile: 'Yeat - Money So Big (InstrumentalTikTok Remix).mp3',
    lyricsFile: 'money_so_big.txt',
    imageFile: 'money.jpg',
    youtubeLink: 'https://www.youtube.com/watch?v=TxNjyTtCKAo',
  },
  {
    title: 'MØ - Lean On',
    audioFile: 'Major Lazer & DJ Snake Ft. MØ - Lean On.mp3',
    lyricsFile: 'lean_on.txt',
    imageFile: 'KO.jpg',
    youtubeLink: 'https://www.youtube.com/watch?v=YqeW9_5kURI',
  },
  {
    title: 'ANOTR, Abel Balder - Relax My Eyes',
    audioFile: 'ANOTR, Abel Balder - Relax My Eyes.mp3',
    lyricsFile: 'relax_my_eyes.txt',
    imageFile: 'relax.jpg',
    youtubeLink: 'https://www.youtube.com/watch?v=3JZ4pnNtyxQ',
  },
  {
    title: 'Wolfgang Gartner - Push and Rise (PrototypeRaptor Bootleg Remix)',
    audioFile: 'Wolfgang Gartner - Push and Rise (PrototypeRaptor Bootleg Remix).mp3',
    lyricsFile: 'push_and_rise.txt',
    imageFile: 'push.jpg',
    youtubeLink: 'https://www.youtube.com/watch?v=2vjPBrBU-TM',
  },
  // ... add other songs ...
];

let player;

// Assign window.onSpotifyWebPlaybackSDKReady outside of any conditional block
window.onSpotifyWebPlaybackSDKReady = () => {
    if (accessToken) {
      document.getElementById('login-button').style.display = 'none';
  
      player = new Spotify.Player({
        name: 'Your Music Player',
        getOAuthToken: cb => { cb(accessToken); },
        volume: 0.5,
      });
  
      // Error handling
      player.addListener('initialization_error', ({ message }) => { console.error(message); });
      player.addListener('authentication_error', ({ message }) => {
        console.error(message);
        // Redirect to login if authentication fails
        window.location.href = '/login';
      });
      player.addListener('account_error', ({ message }) => { console.error(message); });
      player.addListener('playback_error', ({ message }) => {
        console.error('Playback error:', message);
      });
  
      // Playback status updates
      player.addListener('player_state_changed', state => { console.log(state); });
  
      // Ready
      player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        window.device_id = device_id;
  
        // Transfer playback to this device
        transferPlaybackHere();
      });
  
      // Connect to the player!
      player.connect();
  
      // Activate player element on user interaction
      document.getElementById('activate-player').addEventListener('click', () => {
        player.activateElement().then(() => {
          console.log('Player activated for autoplay');
        });
      });
    } else {
      // Show the login button if the user is not authenticated
      document.getElementById('login-button').style.display = 'block';
    }
  };

// Event listener for the login button
document.getElementById('login-button').addEventListener('click', () => {
  window.location.href = '/login';
});

// Initialize the application after DOM is fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // Populate the song list
  const songList = document.getElementById('song-list');
  songs.forEach((song, index) => {
    const listItem = document.createElement('li');
    listItem.className = 'list-group-item list-group-item-action';
    listItem.textContent = song.title;
    listItem.onclick = () => playSong(index);
    songList.appendChild(listItem);
  });

  // Show/Hide Lyrics functionality
  document.getElementById('toggle-lyrics').addEventListener('click', function () {
    const lyricsContainer = document.getElementById('lyrics-container');
    if (lyricsContainer.style.display === 'none') {
      lyricsContainer.style.display = 'block';
      this.textContent = 'Hide Lyrics';
    } else {
      lyricsContainer.style.display = 'none';
      this.textContent = 'Show Lyrics';
    }
  });
});

async function playSong(index) {
  const song = songs[index];
  const songTitle = document.getElementById('song-title');
  const lyrics = document.getElementById('lyrics');
  const albumCover = document.getElementById('album-cover');
  const youtubeLink = document.getElementById('youtube-link');
  const spotifyLink = document.getElementById('spotify-link');
  const audioPlayer = document.getElementById('audio-player');
  const audioSource = document.getElementById('audio-source');
  const nowPlaying = document.getElementById('now-playing');

  songTitle.textContent = song.title;
  nowPlaying.textContent = song.title;

  // Fetch lyrics
  try {
    const response = await fetch(`/lyrics/${song.lyricsFile}`);
    if (response.ok) {
      const text = await response.text();
      lyrics.textContent = text;
    } else {
      lyrics.textContent = 'Lyrics not found.';
    }
  } catch (error) {
    lyrics.textContent = 'Error loading lyrics.';
    console.error(error);
  }

  // Update album cover
  albumCover.src = `/images/${song.imageFile}`;

  // Update YouTube link
  youtubeLink.href = song.youtubeLink;

  // Hide Spotify link
  spotifyLink.style.display = 'none';

  // Play the local song
  audioSource.src = `/music/${song.audioFile}`;
  audioPlayer.load();
  audioPlayer.play();
  // Show the local audio player
  audioPlayer.style.display = 'block';
}

function transferPlaybackHere() {
    const device_id = window.device_id;
    fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      body: JSON.stringify({
        device_ids: [device_id],
        play: true,
      }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    })
    .then(() => {
      console.log('Transfer playback to this device');
    })
    .catch(error => {
      console.error('Error transferring playback:', error);
    });
}


// Modify the player 'ready' event listener
player.addListener('ready', ({ device_id }) => {
    console.log('Ready with Device ID', device_id);
    window.device_id = device_id;
  
    // Transfer playback to this device
    transferPlaybackHere();
  });
  
  // Activate player element on user interaction
  document.getElementById('activate-player').addEventListener('click', () => {
    player.activateElement().then(() => {
      console.log('Player activated for autoplay');
    });
  });
  
  // Add 'playback_error' listener
  player.addListener('playback_error', ({ message }) => {
    console.error('Playback error:', message);
  });
// Function to play Spotify tracks from search results
function playSpotifyTrack(track) {
    if (accessToken && window.device_id) {
      // Update UI elements
      document.getElementById('song-title').textContent = track.name;
      document.getElementById('now-playing').textContent = track.name;
      document.getElementById('current-artist').textContent = track.artists.map(artist => artist.name).join(', ');
      document.getElementById('album-cover').src = track.album.images[0]?.url || '';
      document.getElementById('youtube-link').href = `https://www.youtube.com/results?search_query=${encodeURIComponent(track.name + ' ' + track.artists[0].name)}`;
      document.getElementById('spotify-link').href = track.external_urls.spotify;
      document.getElementById('spotify-link').style.display = 'inline';
  
      // Hide local audio player
      document.getElementById('audio-player').style.display = 'none';
  
      // Play the track via Spotify
      fetch(`https://api.spotify.com/v1/me/player/play?device_id=${window.device_id}`, {
        method: 'PUT',
        body: JSON.stringify({ uris: [track.uri] }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      })
      .then(response => {
        if (!response.ok) {
          // If response is not OK, parse the error message
          return response.json().then(errData => {
            console.error('Error playing track:', errData);
            alert(`Error playing track: ${errData.error.message}`);
          });
        } else {
          console.log('Playback started successfully');
        }
      })
      .catch(error => console.error('Error playing track:', error));
    } else {
      console.error('Cannot play track: Missing access token or device ID.');
    }
  }


function refreshAccessToken() {
  fetch(`/refresh_token?refresh_token=${refreshToken}`)
    .then(response => response.json())
    .then(data => {
      accessToken = data.access_token;
      console.log('Access token refreshed');
    })
    .catch(error => console.error('Error refreshing token:', error));
}

// Search Spotify function
async function searchSpotify(query) {
  const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (response.ok) {
    const data = await response.json();
    return data.tracks.items; // Returns an array of track objects
  } else {
    console.error('Error searching Spotify:', response.statusText);
    return [];
  }
}

// Event listener for search button
document.getElementById('search-button').addEventListener('click', async () => {
  const query = document.getElementById('search-input').value;
  if (query) {
    const results = await searchSpotify(query);
    displaySearchResults(results);
  }
});

// Display search results
function displaySearchResults(tracks) {
  const searchResults = document.getElementById('search-results');
  searchResults.innerHTML = ''; // Clear previous results

  if (tracks.length === 0) {
    const listItem = document.createElement('li');
    listItem.className = 'list-group-item';
    listItem.textContent = 'No results found.';
    searchResults.appendChild(listItem);
    return;
  }

  tracks.forEach(track => {
    const listItem = document.createElement('li');
    listItem.className = 'list-group-item list-group-item-action';

    listItem.innerHTML = `
      <div>
        <strong>${track.name}</strong> by ${track.artists.map(artist => artist.name).join(', ')}
      </div>
    `;

    listItem.onclick = () => {
      playSpotifyTrack(track);
    };

    searchResults.appendChild(listItem);
  });
}

// Refresh the token every 50 minutes
if (refreshToken) {
  setInterval(refreshAccessToken, 50 * 60 * 1000);
}