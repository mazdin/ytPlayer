/* ── YouTube Queue Player — Frontend App (Serverless Version) ───────────────── */
'use strict';

// ─── Auth Guard ──────────────────────────────────────────────────────────────
const username = sessionStorage.getItem('username');
const role     = sessionStorage.getItem('role') || 'user';
const adminKey = sessionStorage.getItem('adminKey'); // Optional

if (!username) {
  window.location.href = '/';
}

// ─── DOM refs ────────────────────────────────────────────────────────────────
const userCountEl      = document.getElementById('userCount');
const usernameDisplay  = document.getElementById('usernameDisplay');
const userAvatar       = document.getElementById('userAvatar');
const logoutBtn        = document.getElementById('logoutBtn');
const submitForm       = document.getElementById('submitForm');
const urlInput         = document.getElementById('urlInput');
const submitBtn        = document.getElementById('submitBtn');
const submitBtnText    = document.getElementById('submitBtnText');
const submitError      = document.getElementById('submitError');
const submitSuccess    = document.getElementById('submitSuccess');
const queueList        = document.getElementById('queueList');
const queueCount       = document.getElementById('queueCount');
const emptyState       = document.getElementById('emptyState');
const youtubePlayer    = document.getElementById('youtubePlayer');
const nowPlayingBar    = document.getElementById('nowPlayingBar');
const nowPlayingTitle  = document.getElementById('nowPlayingTitle');

// ─── Init User UI ─────────────────────────────────────────────────────────────
usernameDisplay.textContent = username;
userAvatar.textContent = username.charAt(0).toUpperCase();

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('username');
  sessionStorage.removeItem('adminKey');
  sessionStorage.removeItem('role');
  window.location.href = '/';
});

// ─── Pusher Real-time ────────────────────────────────────────────────────────
let pusher = null;
let channel = null;

async function initRealtime() {
  try {
    // 1. Get config
    const configRes = await fetch('/api/config');
    const { pusherKey, pusherCluster } = await configRes.json();

    if (!pusherKey) {
      console.error('Pusher key not found. Make sure .env is configured.');
      return;
    }

    // 2. Initialize Pusher
    pusher = new Pusher(pusherKey, { cluster: pusherCluster });
    channel = pusher.subscribe('yt-player-channel');

    // 3. Bind Events
    channel.bind('queue-update', ({ queue, currentIndex }) => {
      renderQueue(queue, currentIndex);
      syncPlayer(queue, currentIndex);
    });

    channel.bind('service-status', ({ serviceEnabled }) => {
      if (!serviceEnabled) window.location.replace('/maintenance.html');
    });

    // 4. Initial Sync
    const stateRes = await fetch('/api/state');
    const { queue, currentIndex, serviceEnabled } = await stateRes.json();
    
    if (!serviceEnabled) {
      window.location.replace('/maintenance.html');
      return;
    }

    renderQueue(queue, currentIndex);
    syncPlayer(queue, currentIndex);

  } catch (err) {
    console.error('Failed to initialize realtime:', err);
  }
}

initRealtime();

// ─── Submit Form ─────────────────────────────────────────────────────────────
submitForm.addEventListener('submit', async e => {
  e.preventDefault();
  const url = urlInput.value.trim();
  if (!url) return;

  hideMessages();
  submitBtn.disabled = true;
  submitBtnText.textContent = '...';

  try {
    const res = await fetch('/api/add-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, username })
    });
    const data = await res.json();

    if (res.ok) {
      urlInput.value = '';
      showSuccess();
    } else {
      showError(data.error || 'Gagal menambahkan video.');
    }
  } catch (err) {
    showError('Kesalahan koneksi ke server.');
  } finally {
    resetSubmitBtn();
  }
});

function resetSubmitBtn() {
  submitBtn.disabled = false;
  submitBtnText.textContent = 'Tambah';
}
function showError(msg) {
  submitError.textContent = msg;
  submitError.classList.remove('hidden');
  submitSuccess.classList.add('hidden');
}
function showSuccess() {
  submitSuccess.classList.remove('hidden');
  submitError.classList.add('hidden');
  setTimeout(() => submitSuccess.classList.add('hidden'), 3000);
}
function hideMessages() {
  submitError.classList.add('hidden');
  submitSuccess.classList.add('hidden');
}

// ─── Queue Renderer ──────────────────────────────────────────────────────────
function renderQueue(queue, currentIndex) {
  queueCount.textContent = queue.length;

  if (queue.length === 0) {
    queueList.innerHTML = '<div class="queue-empty"><span>Queue masih kosong...</span></div>';
    return;
  }

  queueList.innerHTML = queue.map((item, idx) => {
    const playing = idx === currentIndex;
    return `
      <div class="queue-item ${playing ? 'is-playing' : ''}" data-id="${item.id}" data-video-id="${item.videoId}">
        <div class="queue-pos">${playing ? '▶' : idx + 1}</div>
        <img class="queue-thumb" 
             src="${item.thumbnail}" 
             alt="${escapeHtml(item.title)}"
             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2256%22 height=%2242%22%3E%3Crect fill=%22%23242433%22 width=%2256%22 height=%2242%22/%3E%3Ctext x=%2250%25%22 y=%2255%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%235c5c7a%22 font-size=%2214%22%3E▶%3C/text%3E%3C/svg%3E'"
        />
        <div class="queue-info">
          <div class="queue-item-title" id="title-${item.id}">${escapeHtml(item.title)}</div>
          <div class="queue-item-meta">oleh ${escapeHtml(item.addedBy)}</div>
        </div>
        <div class="queue-item-actions">
          ${(playing && role === 'admin') ? `<button class="icon-btn skip" onclick="skipVideo()" title="Skip">⏭</button>` : ''}
          ${(role === 'admin') ? `<button class="icon-btn danger" onclick="removeVideo(${item.id})" title="Hapus">✕</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Update now-playing title in player bar
  if (currentIndex >= 0 && queue[currentIndex]) {
    nowPlayingTitle.textContent = queue[currentIndex].title;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Queue Actions ────────────────────────────────────────────────────────────
window.skipVideo = async function () {
  await fetch('/api/admin/skip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminKey })
  });
};

window.removeVideo = async function (id) {
  await fetch('/api/admin/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminKey, id })
  });
};

// ─── YouTube IFrame Player ───────────────────────────────────────────────────
let ytPlayer = null;
let currentVideoId = null;
let ytApiReady = false;
let pendingVideoId = null;

// Called by YouTube IFrame API when ready
window.onYouTubeIframeAPIReady = function () {
  ytApiReady = true;
  if (pendingVideoId) {
    loadVideo(pendingVideoId);
    pendingVideoId = null;
  }
};

function loadVideo(videoId) {
  if (!ytApiReady) {
    pendingVideoId = videoId;
    return;
  }

  // Show player, hide empty state
  emptyState.classList.add('hidden');
  youtubePlayer.classList.remove('hidden');
  nowPlayingBar.classList.remove('hidden');

  if (!ytPlayer) {
    ytPlayer = new YT.Player('youtubePlayer', {
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        playsinline: 1,
      },
      events: {
        onReady: (e) => {
          e.target.playVideo();
          fetchVideoTitle(videoId);
        },
        onStateChange: onPlayerStateChange,
        onError: onPlayerError,
      }
    });
  } else {
    ytPlayer.loadVideoById(videoId);
    fetchVideoTitle(videoId);
  }

  currentVideoId = videoId;
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED) {
    fetch('/api/video-ended', { method: 'POST' });
  }
}

function onPlayerError(event) {
  console.warn('YouTube player error:', event.data);
  setTimeout(() => fetch('/api/video-ended', { method: 'POST' }), 1500);
}

// ─── Sync Player with Queue State ─────────────────────────────────────────────
function syncPlayer(queue, currentIndex) {
  if (queue.length === 0 || currentIndex < 0) {
    emptyState.classList.remove('hidden');
    youtubePlayer.classList.add('hidden');
    nowPlayingBar.classList.add('hidden');
    currentVideoId = null;
    return;
  }

  const video = queue[currentIndex];
  if (!video) return;

  if (video.videoId !== currentVideoId) {
    loadVideo(video.videoId);
  }

  nowPlayingBar.classList.remove('hidden');
  nowPlayingTitle.textContent = video.title;
}

// ─── Fetch Video Title ────────────────────────────────────────────────────────
function fetchVideoTitle(videoId) {
  const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  fetch(oEmbedUrl)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && data.title) {
        fetch('/api/update-title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId, title: data.title })
        });
        nowPlayingTitle.textContent = data.title;
        const el = document.getElementById(`title-${findQueueItemIdByVideoId(videoId)}`);
        if (el) el.textContent = data.title;
      }
    })
    .catch(() => {});
}

function findQueueItemIdByVideoId(videoId) {
  const el = document.querySelector(`[data-video-id="${videoId}"]`);
  return el ? el.dataset.id : null;
}
