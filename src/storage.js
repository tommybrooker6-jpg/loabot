const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

function ensureDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ guilds: {} }, null, 2));
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function ensureGuild(db, guildId) {
  if (!db.guilds[guildId]) {
    db.guilds[guildId] = {
      config: {
        staffRoles: [],
        approverRoles: [],
        loaRole: null,
        reviewChannel: null,
        logChannel: null,
        boardMessageId: null,
      },
      requests: [],
    };
  }
  return db.guilds[guildId];
}

function getConfig(guildId) {
  const db = readDb();
  return ensureGuild(db, guildId).config;
}

function updateConfig(guildId, partial) {
  const db = readDb();
  const guild = ensureGuild(db, guildId);
  guild.config = { ...guild.config, ...partial };
  writeDb(db);
  return guild.config;
}

function addRequest(guildId, request) {
  const db = readDb();
  const guild = ensureGuild(db, guildId);
  guild.requests.push(request);
  writeDb(db);
  return request;
}

function getRequest(guildId, requestId) {
  const db = readDb();
  const guild = ensureGuild(db, guildId);
  return guild.requests.find((r) => r.id === requestId);
}

function updateRequest(guildId, requestId, partial) {
  const db = readDb();
  const guild = ensureGuild(db, guildId);
  const req = guild.requests.find((r) => r.id === requestId);
  if (!req) return null;
  Object.assign(req, partial);
  writeDb(db);
  return req;
}

// Full history for one user (all statuses), newest first — powers /loa-history.
function getRequestsForUser(guildId, userId) {
  const db = readDb();
  const guild = ensureGuild(db, guildId);
  return guild.requests
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Currently-active LOAs for one server (used to render the live board).
function getActiveRequests(guildId) {
  const db = readDb();
  const guild = ensureGuild(db, guildId);
  return guild.requests.filter((r) => r.status === 'approved');
}

// Used by the expiry scheduler to find approved LOAs across every server.
function getAllActiveRequests() {
  const db = readDb();
  const results = [];
  for (const [guildId, guild] of Object.entries(db.guilds)) {
    for (const req of guild.requests) {
      if (req.status === 'approved') results.push({ guildId, ...req });
    }
  }
  return results;
}

module.exports = {
  getConfig,
  updateConfig,
  addRequest,
  getRequest,
  updateRequest,
  getRequestsForUser,
  getActiveRequests,
  getAllActiveRequests,
};
