# YouTube Queue Player -- Software Requirement Specification (SRS)

## 1. Project Overview

### 1.1 Purpose

Dokumen ini menjelaskan kebutuhan sistem untuk aplikasi **YouTube Queue
Player**, yaitu aplikasi web yang memungkinkan pengguna menambahkan URL
video YouTube ke dalam antrean (queue) dan memutar video tersebut secara
otomatis berdasarkan urutan antrean.

### 1.2 System Description

Aplikasi ini memungkinkan pengguna:

-   Login ke sistem
-   Menginput URL YouTube
-   Menambahkan video ke dalam queue
-   Memutar video secara otomatis
-   Mengelola antrean video

Aplikasi ini dapat diakses oleh banyak pengguna melalui browser.

------------------------------------------------------------------------

# 2. System Objectives

Tujuan utama aplikasi:

-   Memungkinkan pengguna memutar video YouTube secara otomatis dari
    antrean
-   Menyediakan sistem queue video
-   Mendukung multi-user
-   Memutar video secara berurutan tanpa intervensi manual

------------------------------------------------------------------------

# 3. System Architecture (High Level)

Client (Browser) │ ▼ Frontend Web Application │ ▼ Backend API Server │ ▼
Queue Management │ ▼ YouTube Player API

------------------------------------------------------------------------

# 4. User Roles

## 4.1 User

User dapat:

-   Login ke aplikasi
-   Menambahkan URL YouTube
-   Melihat daftar queue
-   Menonton video yang sedang diputar

## 4.2 Admin (Optional)

Admin dapat:

-   Menghapus video dari queue
-   Skip video
-   Mengatur antrean video

------------------------------------------------------------------------

# 5. Functional Requirements

## 5.1 Authentication

### FR-01 Login

Sistem harus memungkinkan pengguna login ke aplikasi.

### FR-02 Session Management

Sistem harus menjaga session login pengguna selama penggunaan aplikasi.

------------------------------------------------------------------------

## 5.2 Submit YouTube URL

### FR-03 Submit Video

User dapat menambahkan URL video YouTube ke dalam queue.

Contoh URL:

https://youtube.com/watch?v=xxxx\
https://youtu.be/xxxx

### FR-04 Extract Video ID

Sistem harus mengekstrak **Video ID** dari URL YouTube.

Contoh:

URL:\
https://youtube.com/watch?v=abcd1234

Video ID:\
abcd1234

------------------------------------------------------------------------

## 5.3 Queue Management

### FR-05 Add Queue

Video yang di-submit user akan ditambahkan ke antrean.

### FR-06 Queue Order

Video harus diputar sesuai urutan antrean.

Contoh Queue:

1.  Video A\
2.  Video B\
3.  Video C

### FR-07 Queue Display

Sistem harus menampilkan daftar antrean video kepada semua pengguna.

------------------------------------------------------------------------

## 5.4 Video Player

### FR-08 Video Playback

Sistem harus memutar video menggunakan **YouTube Player API**.

### FR-09 Auto Play Next

Jika video selesai diputar, sistem harus otomatis memutar video
berikutnya dalam queue.

### FR-10 Empty Queue

Jika queue kosong, player harus menampilkan status:

No video in queue

------------------------------------------------------------------------

## 5.5 Multi User

### FR-11 Shared Queue

Queue video harus dapat dilihat oleh semua pengguna yang sedang online.

### FR-12 Real-time Update

Queue harus diperbarui secara real-time saat user menambahkan video.

------------------------------------------------------------------------

# 6. Non Functional Requirements

## 6.1 Performance

-   Sistem harus mampu menangani minimal **100 user aktif secara
    bersamaan**
-   Waktu respon submit video ≤ **2 detik**

## 6.2 Availability

Aplikasi harus dapat diakses melalui browser modern:

-   Chrome
-   Firefox
-   Edge
-   Safari

------------------------------------------------------------------------

## 6.3 Security

-   Sistem harus memvalidasi URL YouTube
-   Sistem harus mencegah input URL yang tidak valid

------------------------------------------------------------------------

# 7. UI Requirements

Halaman utama harus memiliki komponen berikut:

## 7.1 Video Player

Area untuk memutar video YouTube.

## 7.2 Submit Form

Form input untuk menambahkan video.

Contoh:

\[ Paste YouTube URL \]\
\[ Submit \]

## 7.3 Queue List

Daftar antrean video.

Contoh:

Queue

1.  Video Title A\
2.  Video Title B\
3.  Video Title C

------------------------------------------------------------------------

# 8. Technology Stack (Recommended)

## Frontend

-   HTML
-   CSS
-   JavaScript
-   React (optional)

## Backend

-   Node.js
-   Express.js

## Realtime Communication

-   Socket.io

## Database (Optional)

-   Redis
-   SQLite
-   MongoDB

------------------------------------------------------------------------

# 9. Future Enhancements

Fitur yang dapat ditambahkan di masa depan:

-   Upvote / Downvote video
-   Skip video
-   Remove video from queue
-   Limit video per user
-   Anti spam system
-   Playlist support
-   Mobile responsive UI

------------------------------------------------------------------------

# 10. Example Queue Flow

User A submit video\
↓\
Video masuk queue\
↓\
Player memutar video pertama\
↓\
Video selesai\
↓\
Player otomatis memutar video berikutnya

------------------------------------------------------------------------

# 11. Success Criteria

Aplikasi dianggap berhasil jika:

-   User dapat submit URL YouTube
-   Video masuk ke queue
-   Video diputar otomatis
-   Queue berjalan berurutan
-   Multi-user dapat melihat queue yang sama

------------------------------------------------------------------------

# End of Document
