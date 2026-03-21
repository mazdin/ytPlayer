# YouTube Queue Player — Walkthrough

## Apa yang Dibangun

Aplikasi web real-time multi-user untuk memutar video YouTube secara berurutan dari sebuah queue bersama, dilengkapi fitur admin untuk toggle ON/OFF service.

## Struktur Project

```
c:\Antigravity Project\YTPLAYER\
├── server.js              ← Express + Socket.io backend
├── package.json
├── node_modules/
└── public/
    ├── index.html         ← Login page
    ├── player.html        ← Main player page
    ├── admin.html         ← Admin panel (toggle service ON/OFF)
    ├── maintenance.html   ← Halaman gangguan
    ├── css/
    │   └── style.css      ← Premium dark UI
    └── js/
        └── app.js         ← YouTube IFrame API + Socket client
```

## Cara Menjalankan

```bash
cd "c:\Antigravity Project\YTPLAYER"
npm start
```

Buka browser → **http://localhost:3000**

---

## Fitur yang Diimplementasikan

| Requirement | Status |
|---|---|
| FR-01 Login (username-based) | ✅ |
| FR-02 Session management (sessionStorage) | ✅ |
| FR-03 Submit YouTube URL | ✅ |
| FR-04 Extract Video ID dari URL | ✅ |
| FR-05 Add to queue | ✅ |
| FR-06 Queue order (FIFO) | ✅ |
| FR-07 Queue display (semua user) | ✅ |
| FR-08 YouTube Player API | ✅ |
| FR-09 Auto-play next video | ✅ |
| FR-10 Empty queue state | ✅ |
| FR-11 Shared queue (multi-user) | ✅ |
| FR-12 Real-time update (Socket.io) | ✅ |
| Skip video | ✅ (bonus) |
| Remove video from queue | ✅ (bonus) |
| URL validation | ✅ |
| **Toggle ON/OFF Service (Admin)** | ✅ |

---

## Fitur Toggle ON/OFF Service

Admin dapat mengontrol apakah layanan aktif atau tidak melalui `/admin.html`. Ketika service **OFF**, semua pengguna otomatis diarahkan ke halaman "Mohon Maaf Service Sedang Gangguan".

### Halaman Baru

| Halaman | URL | Fungsi |
|---|---|---|
| Admin Settings | `/admin.html` | Toggle ON/OFF service dengan secret key |
| Maintenance | `/maintenance.html` | Tampil otomatis saat service OFF |

### 🔑 Cara Pakai Admin

1. Buka `http://localhost:3000/admin.html`
2. Masukkan **Admin Secret Key**: `admin1234`
3. Klik **Login Admin**
4. Gunakan **toggle switch** untuk mengubah status:
   - 🟢 **ON** → Aplikasi berjalan normal
   - 🔴 **OFF** → Semua user diarahkan ke halaman maintenance

> [!IMPORTANT]
> Secret key default adalah `admin1234`. Untuk menggantinya, jalankan server dengan env var: `ADMIN_SECRET=secretbaru node server.js`

### 🔧 Halaman Maintenance

Tampil otomatis saat service di-OFF-kan. Fitur:
- Animasi ikon 🔧 yang bergoyang
- Tombol **"Coba Lagi"** untuk memeriksa status ulang
- Redirect otomatis secara real-time saat admin mengaktifkan kembali service (via Socket.io)

### File yang Diubah

| File | Perubahan |
|---|---|
| `server.js` | Tambah `serviceEnabled` state, `ADMIN_SECRET`, endpoint `GET /api/status`, `POST /api/admin/service`, socket emit `service-status` |
| `public/maintenance.html` | **[BARU]** Halaman maintenance mode |
| `public/admin.html` | **[BARU]** Halaman admin panel |
| `public/index.html` | Cek `/api/status` saat load + listener `service-status` socket |
| `public/player.html` | Cek `/api/status` saat load |
| `public/js/app.js` | Listener `service-status` socket real-time |
| `public/css/style.css` | CSS untuk halaman maintenance dan admin |

---

## Screenshot Hasil Verifikasi

### Login Page
![Login Page](C:/Users/ESB-Safruddin Budi/.gemini/antigravity/brain/2a8e3a59-b2a2-4fbd-97d8-b9eb7290a5fa/login_page_v1_1773674968748.png)

### Player Page (Queue Kosong)
![Player Empty State](C:/Users/ESB-Safruddin Budi/.gemini/antigravity/brain/2a8e3a59-b2a2-4fbd-97d8-b9eb7290a5fa/player_empty_state_1773675028203.png)

### Setelah Submit 1 Video (Auto-play)
![Player One Video](C:/Users/ESB-Safruddin Budi/.gemini/antigravity/brain/2a8e3a59-b2a2-4fbd-97d8-b9eb7290a5fa/player_one_video_1773675042911.png)

### Queue dengan 2 Video
![Two Videos in Queue](C:/Users/ESB-Safruddin Budi/.gemini/antigravity/brain/2a8e3a59-b2a2-4fbd-97d8-b9eb7290a5fa/final_test_result_two_videos_1773675096460.png)

---

## Rekaman Browser

### Full Player Flow
![Full Player Flow Recording](C:/Users/ESB-Safruddin Budi/.gemini/antigravity/brain/2a8e3a59-b2a2-4fbd-97d8-b9eb7290a5fa/full_player_flow_1773674992311.webp)

### Demo Maintenance Mode (Toggle ON/OFF)
![Demo maintenance mode](C:/Users/ESB-Safruddin Budi/.gemini/antigravity/brain/4aab49d5-a90f-4e50-b889-84e41bb4fbe5/maintenance_mode_demo_1774010245079.webp)
