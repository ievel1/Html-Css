// main.js

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

// Check Access Token Retrieval
console.log('Access Token:', accessToken);
console.log('Refresh Token:', refreshToken);

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

// Variables to track the current player
let isPlayingSpotify = false;
let currentTrackIndex = null; // For local songs
let player; // Spotify Player
let audioPlayer = document.getElementById('audio-player'); // Local audio player
let spotifyTrackDuration = 0; // For Spotify track duration
let playerState = null; // Store the latest Spotify player state

// Initialize the application after DOM is fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // Show the login button if not authenticated
  if (!accessToken) {
    document.getElementById('login-button').style.display = 'block';
  } else {
    document.getElementById('login-button').style.display = 'none';
    fetchPlaylists(); // Fetch playlists after authentication
  }

  // Event listener for the login button
  document.getElementById('login-button').addEventListener('click', () => {
    window.location.href = '/login';
  });

  // Initialize Spotify Player when SDK is ready
  window.onSpotifyWebPlaybackSDKReady = () => {
    if (accessToken) {
      initializePlayer();
    }
  };

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

  // Event listener for search button
  document.getElementById('search-button').addEventListener('click', async () => {
    const query = document.getElementById('search-input').value;
    if (query) {
      const results = await searchSpotify(query);
      displaySearchResults(results);
    }
  });

  // Event listeners for playback controls
  document.getElementById('play-pause-button').addEventListener('click', togglePlayPause);
  document.getElementById('next-button').addEventListener('click', nextTrack);
  document.getElementById('prev-button').addEventListener('click', previousTrack);

  // Volume Control
  const volumeControl = document.getElementById('volume-control');

  volumeControl.addEventListener('input', function () {
    const volume = volumeControl.value / 100;
    if (isPlayingSpotify && player) {
      player.setVolume(volume).then(() => {
        console.log(`Spotify volume set to ${volume}`);
      });
    } else if (audioPlayer) {
      audioPlayer.volume = volume;
      console.log(`Local audio volume set to ${volume}`);
    }
  });

  // Shuffle and Repeat Buttons
  const shuffleButton = document.getElementById('shuffle-button');
  const repeatButton = document.getElementById('repeat-button');

  shuffleButton.addEventListener('click', toggleShuffle);
  repeatButton.addEventListener('click', toggleRepeat);

  // Allow clicking on the progress bar to seek
  const progressBarContainer = document.querySelector('.progress');
  progressBarContainer.addEventListener('click', function (e) {
    const rect = this.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const totalWidth = rect.width;
    const percentage = offsetX / totalWidth;
    let position_ms;
    if (isPlayingSpotify && spotifyTrackDuration) {
      position_ms = percentage * spotifyTrackDuration;
      seek(position_ms);
    } else if (audioPlayer.duration) {
      position_ms = percentage * audioPlayer.duration * 1000;
      seek(position_ms);
    }
  });

  // Update progress bar every second
  setInterval(updateProgressBar, 1000);

  // Populate the song list
  const songList = document.getElementById('song-list');
  songs.forEach((song, index) => {
    const listItem = document.createElement('li');
    listItem.className = 'list-group-item list-group-item-action';
    listItem.textContent = song.title;
    listItem.onclick = () => playLocalSong(index);
    songList.appendChild(listItem);
  });

  // Event listener for local audio player time updates
  audioPlayer.addEventListener('timeupdate', updateProgressBar);

  // Event listener for play/pause changes in local audio player
  audioPlayer.addEventListener('play', () => updatePlayPauseButton(true));
  audioPlayer.addEventListener('pause', () => updatePlayPauseButton(false));
});

function initializePlayer() {
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
  player.addListener('player_state_changed', state => {
    console.log('Player state changed:', state);
    if (state) {
      playerState = state;
      const isPlaying = !state.paused;
      updatePlayPauseButton(isPlaying);
      spotifyTrackDuration = state.duration;
      updateProgressBar();
    }
  });

  // Ready
  player.addListener('ready', ({ device_id }) => {
    console.log('Ready with Device ID', device_id);
    window.device_id = device_id;
  });

  // Not Ready
  player.addListener('not_ready', ({ device_id }) => {
    console.log('Device ID has gone offline', device_id);
  });

  // Connect to the player!
  player.connect();
}

// Unified playback control functions
function play() {
  if (isPlayingSpotify) {
    player.resume().then(() => {
      updatePlayPauseButton(true);
    });
  } else if (audioPlayer) {
    audioPlayer.play();
    updatePlayPauseButton(true);
  }
}

function pause() {
  if (isPlayingSpotify) {
    player.pause().then(() => {
      updatePlayPauseButton(false);
    });
  } else if (audioPlayer) {
    audioPlayer.pause();
    updatePlayPauseButton(false);
  }
}

function togglePlayPause() {
  if (isPlayingSpotify) {
    player.getCurrentState().then(state => {
      if (!state) {
        console.error('User is not playing music through the Web Playback SDK');
        return;
      }
      if (state.paused) {
        play();
      } else {
        pause();
      }
    });
  } else if (audioPlayer) {
    if (audioPlayer.paused) {
      play();
    } else {
      pause();
    }
  }
}

function nextTrack() {
  if (isPlayingSpotify) {
    player.nextTrack().then(() => {
      console.log('Skipped to next Spotify track');
    });
  } else {
    if (currentTrackIndex !== null && currentTrackIndex < songs.length - 1) {
      playLocalSong(currentTrackIndex + 1);
    }
  }
}

function previousTrack() {
  if (isPlayingSpotify) {
    player.previousTrack().then(() => {
      console.log('Went back to previous Spotify track');
    });
  } else {
    if (currentTrackIndex !== null && currentTrackIndex > 0) {
      playLocalSong(currentTrackIndex - 1);
    }
  }
}

function seek(position_ms) {
  if (isPlayingSpotify) {
    player.seek(position_ms).then(() => {
      console.log(`Seeked to ${position_ms}ms in Spotify track`);
    });
  } else if (audioPlayer) {
    audioPlayer.currentTime = position_ms / 1000;
  }
}

function updateProgressBar() {
  if (isPlayingSpotify && playerState && spotifyTrackDuration) {
    const progress = (playerState.position / spotifyTrackDuration) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
  } else if (audioPlayer && audioPlayer.duration) {
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
  }
}

function updatePlayPauseButton(isPlaying) {
  const playPauseButton = document.getElementById('play-pause-button');
  const icon = playPauseButton.querySelector('i');
  if (isPlaying) {
    icon.classList.remove('fa-play');
    icon.classList.add('fa-pause');
  } else {
    icon.classList.remove('fa-pause');
    icon.classList.add('fa-play');
  }
}

// Function to play local songs
async function playLocalSong(index) {
  currentTrackIndex = index;
  isPlayingSpotify = false;

  const song = songs[index];
  const songTitle = document.getElementById('song-title');
  const lyrics = document.getElementById('lyrics');
  const albumCover = document.getElementById('album-cover');
  const youtubeLink = document.getElementById('youtube-link');
  const spotifyLink = document.getElementById('spotify-link');
  const audioSource = document.getElementById('audio-source');
  const nowPlaying = document.getElementById('now-playing');

  songTitle.textContent = song.title;
  nowPlaying.textContent = song.title;
  document.getElementById('current-artist').textContent = '';

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

  // Update background image
  updateBackgroundImage(`/images/${song.imageFile}`);

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

  // Update play/pause button
  updatePlayPauseButton(true);

  // Pause Spotify playback if needed
  if (player) {
    player.pause().then(() => {
      console.log('Spotify playback paused');
    });
  }

  // Event listener for when the local song ends
  audioPlayer.onended = () => {
    if (currentTrackIndex < songs.length - 1) {
      playLocalSong(currentTrackIndex + 1);
    } else {
      updatePlayPauseButton(false);
    }
  };
}

// Function to play Spotify tracks from search results
function playSpotifyTrack(track) {
  if (accessToken && window.device_id) {
    isPlayingSpotify = true;
    currentTrackIndex = null; // Reset local track index

    // Update UI elements
    document.getElementById('song-title').textContent = track.name;
    document.getElementById('now-playing').textContent = track.name;
    document.getElementById('current-artist').textContent = track.artists.map(artist => artist.name).join(', ');
    document.getElementById('album-cover').src = track.album.images[0] ? track.album.images[0].url : '';
    document.getElementById('youtube-link').href = `https://www.youtube.com/results?search_query=${encodeURIComponent(track.name + ' ' + track.artists[0].name)}`;
    document.getElementById('spotify-link').href = track.external_urls.spotify;
    document.getElementById('spotify-link').style.display = 'inline';

    // Update background image
    const albumImageUrl = track.album.images[0] ? track.album.images[0].url : '';
    updateBackgroundImage(albumImageUrl);

    // Hide local audio player
    audioPlayer.style.display = 'none';

    // Update spotifyTrackDuration
    spotifyTrackDuration = track.duration_ms;

    // Activate player element on user interaction if needed
    player.activateElement().then(() => {
      console.log('Player activated for autoplay');

      // Transfer playback to this device
      transferPlaybackHere().then(() => {
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
      });
    });

    // Update play/pause button
    updatePlayPauseButton(true);

    // Pause local audio if needed
    if (!audioPlayer.paused) {
      audioPlayer.pause();
    }
  } else {
    console.error('Cannot play track: Missing access token or device ID.');
    alert('Cannot play track: Missing access token or device ID.');
  }
}

function transferPlaybackHere() {
  const device_id = window.device_id;
  return fetch('https://api.spotify.com/v1/me/player', {
    method: 'PUT',
    body: JSON.stringify({
      device_ids: [device_id],
      play: false,
    }),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  })
  .then(response => {
    if (response.ok) {
      console.log('Transfer playback to this device');
    } else {
      console.error('Error transferring playback:', response.statusText);
    }
  })
  .catch(error => {
    console.error('Error transferring playback:', error);
  });
}

// Function to refresh the access token
function refreshAccessToken() {
  fetch(`/refresh_token?refresh_token=${refreshToken}`)
    .then(response => response.json())
    .then(data => {
      accessToken = data.access_token;
      console.log('Access token refreshed');
    })
    .catch(error => console.error('Error refreshing token:', error));
}

// Refresh the token every 50 minutes
if (refreshToken) {
  setInterval(refreshAccessToken, 50 * 60 * 1000);
}

// Client-Side Error Handling:
function displayError(message) {
  const searchResults = document.getElementById('search-results');
  searchResults.innerHTML = `<li class="list-group-item text-danger">${message}</li>`;
}

// Update the searchSpotify function
async function searchSpotify(query) {
  const response = await fetch(`/search?q=${encodeURIComponent(query)}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (response.ok) {
    const data = await response.json();
    return data.tracks.items; // Returns an array of track objects
  } else {
    const errorData = await response.json();
    console.error('Error searching Spotify:', errorData);
    displayError(`Error: ${errorData.error.message}`);
    return [];
  }
}

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

// Update background image function
function updateBackgroundImage(imageUrl) {
  const mainContainer = document.getElementById('main-container');
  mainContainer.style.backgroundImage = `url('${imageUrl}')`;
}

// Fetch user's playlists
async function fetchPlaylists() {
  const response = await fetch('/playlists', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (response.ok) {
    const data = await response.json();
    displayPlaylists(data.items);
  } else {
    const errorData = await response.json();
    console.error('Error fetching playlists:', errorData);
  }
}

// Display playlists
function displayPlaylists(playlists) {
  const playlistList = document.getElementById('playlist-list');
  playlistList.innerHTML = '';

  playlists.forEach(playlist => {
    const listItem = document.createElement('li');
    listItem.className = 'list-group-item list-group-item-action';

    listItem.innerHTML = `
      <div>
        <strong>${playlist.name}</strong> (${playlist.tracks.total} tracks)
      </div>
    `;

    listItem.onclick = () => {
      fetchPlaylistTracks(playlist.id, playlist.name);
    };

    playlistList.appendChild(listItem);
  });
}

// Fetch playlist tracks
async function fetchPlaylistTracks(playlistId, playlistName) {
  const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (response.ok) {
    const data = await response.json();
    displayPlaylistTracks(data.items, playlistName);
  } else {
    const errorData = await response.json();
    console.error('Error fetching playlist tracks:', errorData);
  }
}

// Display playlist tracks
function displayPlaylistTracks(tracks, playlistName) {
  const searchResults = document.getElementById('search-results');
  searchResults.innerHTML = ''; // Clear previous results

  if (tracks.length === 0) {
    const listItem = document.createElement('li');
    listItem.className = 'list-group-item';
    listItem.textContent = 'No tracks found in this playlist.';
    searchResults.appendChild(listItem);
    return;
  }

  // Display the playlist name
  const header = document.createElement('h4');
  header.textContent = `Playlist: ${playlistName}`;
  searchResults.appendChild(header);

  tracks.forEach(item => {
    const track = item.track;
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

// Toggle shuffle
function toggleShuffle() {
  if (isPlayingSpotify && player) {
    const state = playerState && playerState.shuffle ? 'false' : 'true';
    fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${state}&device_id=${window.device_id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }).then(() => {
      console.log('Shuffle toggled');
    });
  } else {
    // Implement shuffle for local songs if desired
  }
}

// Toggle repeat
function toggleRepeat() {
  if (isPlayingSpotify && player) {
    const state = playerState && playerState.repeat_mode === 0 ? 'context' : 'off';
    fetch(`https://api.spotify.com/v1/me/player/repeat?state=${state}&device_id=${window.device_id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }).then(() => {
      console.log('Repeat toggled');
    });
  } else {
    // Implement repeat for local songs if desired
  }
}
