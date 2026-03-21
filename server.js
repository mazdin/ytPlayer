const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── In-Memory State ────────────────────────────────────────────────────────
let queue = [];           // Array of { id, videoId, title, thumbnail, addedBy }
let currentIndex = -1;   // Index of currently playing video
let users = {};          // socketId -> { username }
let idCounter = 0;
let serviceEnabled = true; // Maintenance mode toggle

// ─── Admin Config ─────────────────────────────────────────────────────────────
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin1234'; // Change via env var

// ─── YouTube URL Utilities ───────────────────────────────────────────────────
function extractVideoId(url) {
  try {
    const urlObj = new URL(url);
    if (
      urlObj.hostname === 'www.youtube.com' ||
      urlObj.hostname === 'youtube.com' ||
      urlObj.hostname === 'm.youtube.com'
    ) {
      const v = urlObj.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    }
    if (urlObj.hostname === 'youtu.be') {
      const v = urlObj.pathname.slice(1).split('?')[0];
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    }
  } catch (_) {}
  return null;
}

function getYouTubeThumbnail(videoId) {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

// ─── REST API ────────────────────────────────────────────────────────────────
app.get('/api/state', (req, res) => {
  res.json({ queue, currentIndex });
});

// Public endpoint: cek status service
app.get('/api/status', (req, res) => {
  res.json({ serviceEnabled });
});

// Admin endpoint: toggle service ON/OFF
app.post('/api/admin/service', (req, res) => {
  const { secret, enabled } = req.body;
  if (secret !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Akses ditolak. Secret salah.' });
  }
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'Field "enabled" harus boolean.' });
  }
  serviceEnabled = enabled;
  // Broadcast perubahan ke semua client
  io.emit('service-status', { serviceEnabled });
  console.log(`[⚙] Service ${serviceEnabled ? 'ON' : 'OFF'} oleh admin.`);
  res.json({ success: true, serviceEnabled });
});

// ─── Socket.io ───────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  // Send current state on join (including service status)
  socket.emit('service-status', { serviceEnabled });
  socket.emit('sync-state', { queue, currentIndex });

  // ── Login ──
  socket.on('login', ({ username }) => {
    const name = (username || '').trim().slice(0, 32);
    if (!name) {
      socket.emit('login-error', 'Username tidak boleh kosong.');
      return;
    }
    users[socket.id] = { username: name };
    socket.emit('login-success', { username: name });
    io.emit('user-count', Object.keys(users).length);
    console.log(`[*] Login: ${name} (${socket.id})`);
  });

  // ── Add Video ──
  socket.on('add-video', ({ url }) => {
    const user = users[socket.id];
    if (!user) {
      socket.emit('add-error', 'Silakan login terlebih dahulu.');
      return;
    }

    const videoId = extractVideoId((url || '').trim());
    if (!videoId) {
      socket.emit('add-error', 'URL YouTube tidak valid. Contoh: https://youtube.com/watch?v=xxxxx');
      return;
    }

    // Prevent duplicates already in queue
    if (queue.some(v => v.videoId === videoId)) {
      socket.emit('add-error', 'Video ini sudah ada di dalam queue.');
      return;
    }

    const item = {
      id: ++idCounter,
      videoId,
      title: `Video (${videoId})`,  // Title updated after client loads player info
      thumbnail: getYouTubeThumbnail(videoId),
      addedBy: user.username,
    };

    queue.push(item);

    // If nothing is playing, start playing this video
    if (currentIndex === -1) {
      currentIndex = 0;
    }

    console.log(`[+] Queue add: ${videoId} by ${user.username}`);
    io.emit('queue-update', { queue, currentIndex });
    socket.emit('add-success');
  });

  // ── Update video title (from YouTube API metadata on client) ──
  socket.on('update-title', ({ videoId, title }) => {
    const item = queue.find(v => v.videoId === videoId);
    if (item && title) {
      item.title = title;
      io.emit('queue-update', { queue, currentIndex });
    }
  });

  // ── Video ended → play next ──
  socket.on('video-ended', () => {
    if (queue.length === 0) {
      currentIndex = -1;
      io.emit('queue-update', { queue, currentIndex });
      return;
    }

    // Remove the video that just ended
    queue.shift();

    if (queue.length > 0) {
      currentIndex = 0;
    } else {
      currentIndex = -1;
    }

    console.log(`[>] Next video. Queue length: ${queue.length}`);
    io.emit('queue-update', { queue, currentIndex });
  });

  // ── Skip (admin-like action from any user for now) ──
  socket.on('skip-video', () => {
    const user = users[socket.id];
    if (!user) return;

    if (queue.length === 0) return;

    queue.shift();
    currentIndex = queue.length > 0 ? 0 : -1;

    console.log(`[>>] Skipped by ${user.username}`);
    io.emit('queue-update', { queue, currentIndex });
  });

  // ── Remove from queue ──
  socket.on('remove-video', ({ id }) => {
    const user = users[socket.id];
    if (!user) return;

    const idx = queue.findIndex(v => v.id === id);
    if (idx === -1) return;

    // If removing currently playing video, treat as skip
    if (idx === currentIndex) {
      queue.splice(idx, 1);
      currentIndex = queue.length > 0 ? 0 : -1;
    } else if (idx < currentIndex) {
      queue.splice(idx, 1);
      currentIndex -= 1;
    } else {
      queue.splice(idx, 1);
    }

    io.emit('queue-update', { queue, currentIndex });
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('user-count', Object.keys(users).length);
    console.log(`[-] Disconnected: ${socket.id}`);
  });
});

// ─── Start Server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🎬 YouTube Queue Player running at http://localhost:${PORT}\n`);
});
