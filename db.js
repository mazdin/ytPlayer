const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initDB() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      videoId TEXT NOT NULL,
      title TEXT NOT NULL,
      thumbnail TEXT NOT NULL,
      addedBy TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Initialize serviceEnabled if not exists
  await client.execute({
    sql: 'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
    args: ['serviceEnabled', 'true']
  });
}

const db = {
  async getQueue() {
    const rs = await client.execute('SELECT * FROM queue ORDER BY id ASC');
    return rs.rows;
  },

  async addVideo(video) {
    await client.execute({
      sql: 'INSERT INTO queue (videoId, title, thumbnail, addedBy) VALUES (?, ?, ?, ?)',
      args: [video.videoId, video.title, video.thumbnail, video.addedBy]
    });
  },

  async updateTitle(videoId, title) {
    await client.execute({
      sql: 'UPDATE queue SET title = ? WHERE videoId = ?',
      args: [title, videoId]
    });
  },

  async removeNext() {
    const next = await this.getNextVideo();
    if (next) {
      await client.execute({
        sql: 'DELETE FROM queue WHERE id = ?',
        args: [next.id]
      });
    }
    return next;
  },

  async removeById(id) {
    await client.execute({
      sql: 'DELETE FROM queue WHERE id = ?',
      args: [id]
    });
  },

  async getNextVideo() {
    const rs = await client.execute('SELECT * FROM queue ORDER BY id ASC LIMIT 1');
    return rs.rows[0] || null;
  },

  async getServiceStatus() {
    const rs = await client.execute({
      sql: 'SELECT value FROM settings WHERE key = ?',
      args: ['serviceEnabled']
    });
    return rs.rows[0]?.value === 'true';
  },

  async setServiceStatus(enabled) {
    await client.execute({
      sql: 'UPDATE settings SET value = ? WHERE key = ?',
      args: [enabled ? 'true' : 'false', 'serviceEnabled']
    });
  },

  async clearQueue() {
    await client.execute('DELETE FROM queue');
  }
};

module.exports = { db, initDB };
