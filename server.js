require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Pusher = require('pusher');
const { db, initDB } = require('./db');

const app = express();

// ─── Pusher Config ──────────────────────────────────────────────────────────
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER || 'ap1',
  useTLS: true
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Admin Config ─────────────────────────────────────────────────────────────
const ADMIN_SECRET = (process.env.ADMIN_SECRET || 'admin1111').trim();

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

// ─── Helper: Broadcast State ────────────────────────────────────────────────
async function broadcastUpdate() {
  const queue = await db.getQueue();
  const currentIndex = queue.length > 0 ? 0 : -1;
  pusher.trigger('yt-player-channel', 'queue-update', { queue, currentIndex });
}

// ─── REST API ────────────────────────────────────────────────────────────────

// Get current state
app.get('/api/state', async (req, res) => {
  const queue = await db.getQueue();
  const currentIndex = queue.length > 0 ? 0 : -1;
  const serviceEnabled = await db.getServiceStatus();
  res.json({ queue, currentIndex, serviceEnabled });
});

app.get('/api/status', async (req, res) => {
  const serviceEnabled = await db.getServiceStatus();
  res.json({ serviceEnabled });
});

// Get frontend config (Pusher key)
app.get('/api/config', (req, res) => {
  res.json({
    pusherKey: process.env.PUSHER_KEY,
    pusherCluster: process.env.PUSHER_CLUSTER || 'ap1'
  });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, adminKey } = req.body;
  const name = (username || '').trim().slice(0, 32);
  if (!name) return res.status(400).json({ error: 'Username tidak boleh kosong.' });

  const role = (adminKey === ADMIN_SECRET) ? 'admin' : 'user';
  res.json({ username: name, role });
});

// Add Video
app.post('/api/add-video', async (req, res) => {
  const { url, username } = req.body;
  if (!username) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });

  const videoId = extractVideoId((url || '').trim());
  if (!videoId) return res.status(400).json({ error: 'URL YouTube tidak valid.' });

  const queue = await db.getQueue();
  if (queue.some(v => v.videoId === videoId)) {
    return res.status(400).json({ error: 'Video ini sudah ada di dalam queue.' });
  }

  await db.addVideo({
    videoId,
    title: `Video (${videoId})`,
    thumbnail: getYouTubeThumbnail(videoId),
    addedBy: username
  });

  await broadcastUpdate();
  res.json({ success: true });
});

// Update Title
app.post('/api/update-title', async (req, res) => {
  const { videoId, title } = req.body;
  if (videoId && title) {
    await db.updateTitle(videoId, title);
    await broadcastUpdate();
  }
  res.json({ success: true });
});

// Video Ended
app.post('/api/video-ended', async (req, res) => {
  await db.removeNext();
  await broadcastUpdate();
  res.json({ success: true });
});

// Admin: Skip
app.post('/api/admin/skip', async (req, res) => {
  const { adminKey } = req.body;
  if (adminKey !== ADMIN_SECRET) return res.status(403).json({ error: 'Unauthorized' });

  await db.removeNext();
  await broadcastUpdate();
  res.json({ success: true });
});

// Admin: Remove By ID
app.post('/api/admin/remove', async (req, res) => {
  const { adminKey, id } = req.body;
  if (adminKey !== ADMIN_SECRET) return res.status(403).json({ error: 'Unauthorized' });

  await db.removeById(id);
  await broadcastUpdate();
  res.json({ success: true });
});

// Admin: Toggle Service
app.post('/api/admin/service', async (req, res) => {
  const { secret, enabled } = req.body;
  if (secret !== ADMIN_SECRET) return res.status(403).json({ error: 'Akses ditolak.' });

  await db.setServiceStatus(enabled);
  pusher.trigger('yt-player-channel', 'service-status', { serviceEnabled: enabled });
  res.json({ success: true, serviceEnabled: enabled });
});

// ─── Initialize DB & Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

// On Vercel, we don't 'listen' like this, but this is for local testing
if (process.env.NODE_ENV !== 'production') {
  initDB().then(() => {
    app.listen(PORT, () => {
      console.log(`\n🎬 YouTube Queue Player running at http://localhost:${PORT}\n`);
    });
  });
} else {
  // On Vercel, init during first request or at top level if possible
  initDB().catch(err => console.error('DB Init Error:', err));
}

module.exports = app;
