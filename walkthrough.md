# YouTube Queue Player: Modern Migration Walkthrough

Proyek ini telah berhasil dimigrasikan dari aplikasi *monolith-stateful* menjadi arsitektur modern berorientasi *serverless* yang siap dideploy di **Vercel**.

---

## 🛠️ Stack Teknologi Terbaru

| Komponen | Teknologi | Deskripsi |
|---|---|---|
| **Runtime** | Node.js (Vercel Functions) | Berjalan sebagai serverless functions yang efisien. |
| **Framework** | Express.js | Digunakan sebagai routing engine dan API handler. |
| **Real-time** | **Pusher Channels** | Menggantikan Socket.io untuk sinkronisasi antrean instan tanpa server persisten. |
| **Database** | **Turso (libSQL)** | Database SQLite di cloud untuk persistensi antrean video. |
| **Frontend** | Vanilla JS + Pusher SDK | Interaksi cepat tanpa overhead framework besar. |
| **Styling** | Modern CSS Variables | Desain premium dengan Dark Mode bawaan. |

---

## 🏗️ Detail Implementasi Utama

### 1. [Backend (server.js)](/server.js)
- **Stateless API**: Semua state (antrean) kini diambil dari database Turso setiap kali request masuk.
- **Pusher Integration**: Setiap perubahan data (tambah/hapus/skip video) memicu *event* Pusher yang akan didengar oleh semua browser aktif.

### 2. [Database Layer (db.js)](/db.js)
- Mengelola skema tabel `queue` dan `settings`.
- Menyimpan status *Maintenance Mode* secara persisten di database.
- Menyediakan metode `pushQueue` dan `clearQueue` untuk manipulasi data.

### 3. [Konfigurasi Vercel (vercel.json)](/vercel.json)
- Menggunakan `"handle": "filesystem"` untuk memisahkan file statis (CSS/JS/HTML) dengan logika backend secara otomatis.
- Mengarahkan semua request API (`/api/*`) dan catch-all route ke `server.js`.

### 4. [Frontend (app.js)](/public/js/app.js)
- **Auto-Sync**: Menggunakan listener Pusher untuk mendeteksi `queue-update` secara real-time.
- **Presence Status**: Menampilkan indikator **"● Synced Real-time"** saat terkoneksi ke layanan cloud.
- **Admin Roles**: Logika otentikasi berbasis *session* yang memastikan kontrol (Skip/Remove) hanya muncul untuk pemilik kunci admin.

---

## 🚀 Panduan Deployment & Variabel lingkungan

### Kredensial yang Diperlukan (Dashboard Vercel)

> [!IMPORTANT]
> Masukkan variabel berikut di Dashboard Vercel agar aplikasi dapat terhubung ke layanan eksternal:

```env
# Database (Dapatkan di turso.tech)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_token

# Real-time (Dapatkan di pusher.com)
PUSHER_APP_ID=your_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=ap1

# Security
ADMIN_SECRET=your_admin_password
```

---

## ✅ Verifikasi Hasil

- **Styling**: Tampilan sudah bersifat responsif dan menggunakan UI premium dark theme.
- **Persistensi**: Video yang ditambahkan akan tetap ada meskipun server restart atau di-deploy ulang.
- **Real-time**: Buka browser di dua perangkat berbeda; perubahan antrean di satu perangkat akan langsung muncul di perangkat lainnya dalam hitungan milidetik.

> [!TIP]
> Jika setelah deploy tampilan terlihat kosong atau pecah, lakukan **Hard Refresh (Ctrl + F5)** di browser untuk membersihkan cache file lama.
