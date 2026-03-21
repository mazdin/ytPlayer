/* ── YouTube Queue Player — Frontend App ──────────────────────────────────── */
'use strict';

// ─── Auth Guard ──────────────────────────────────────────────────────────────
const username = sessionStorage.getItem('username');
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
  window.location.href = '/';
});

// ─── Socket.io ───────────────────────────────────────────────────────────────
const socket = io();

socket.on('connect', () => {
  // Re-login after reconnect if session exists
  socket.emit('login', { username });
});

socket.on('user-count', count => {
  userCountEl.textContent = `${count} online`;
});

// Real-time maintenance mode: redirect if admin turns service OFF
socket.on('service-status', ({ serviceEnabled }) => {
  if (!serviceEnabled) window.location.replace('/maintenance.html');
});

socket.on('sync-state', ({ queue, currentIndex }) => {
  renderQueue(queue, currentIndex);
  syncPlayer(queue, currentIndex);
});

socket.on('queue-update', ({ queue, currentIndex }) => {
  renderQueue(queue, currentIndex);
  syncPlayer(queue, currentIndex);
});

socket.on('add-success', () => {
  urlInput.value = '';
  showSuccess();
  resetSubmitBtn();
});

socket.on('add-error', msg => {
  showError(msg);
  resetSubmitBtn();
});

// ─── Submit Form ─────────────────────────────────────────────────────────────
submitForm.addEventListener('submit', e => {
  e.preventDefault();
  const url = urlInput.value.trim();
  if (!url) return;

  hideMessages();
  submitBtn.disabled = true;
  submitBtnText.textContent = '...';
  socket.emit('add-video', { url });
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
          ${playing ? `<button class="icon-btn skip" onclick="skipVideo()" title="Skip">⏭</button>` : ''}
          <button class="icon-btn danger" onclick="removeVideo(${item.id})" title="Hapus">✕</button>
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
window.skipVideo = function () {
  socket.emit('skip-video');
};
window.removeVideo = function (id) {
  socket.emit('remove-video', { id });
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
  // YT.PlayerState.ENDED = 0
  if (event.data === YT.PlayerState.ENDED) {
    socket.emit('video-ended');
  }
}

function onPlayerError(event) {
  console.warn('YouTube player error:', event.data);
  // Auto-skip on unplayable video
  setTimeout(() => socket.emit('video-ended'), 1500);
}

// ─── Sync Player with Queue State ─────────────────────────────────────────────
function syncPlayer(queue, currentIndex) {
  if (queue.length === 0 || currentIndex < 0) {
    // Show empty state
    emptyState.classList.remove('hidden');
    youtubePlayer.classList.add('hidden');
    nowPlayingBar.classList.add('hidden');
    currentVideoId = null;
    return;
  }

  const video = queue[currentIndex];
  if (!video) return;

  // Only load if video changed
  if (video.videoId !== currentVideoId) {
    loadVideo(video.videoId);
  }

  // Update now-playing bar
  nowPlayingBar.classList.remove('hidden');
  nowPlayingTitle.textContent = video.title;
}

// ─── Fetch Video Title via oEmbed ─────────────────────────────────────────────
function fetchVideoTitle(videoId) {
  const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  fetch(oEmbedUrl)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && data.title) {
        socket.emit('update-title', { videoId, title: data.title });
        nowPlayingTitle.textContent = data.title;
        // Update queue item title locally too
        const el = document.getElementById(`title-${findQueueItemIdByVideoId(videoId)}`);
        if (el) el.textContent = data.title;
      }
    })
    .catch(() => {/* Silently fail — title stays as Video ID */});
}

function findQueueItemIdByVideoId(videoId) {
  const el = document.querySelector(`[data-video-id="${videoId}"]`);
  return el ? el.dataset.id : null;
}
