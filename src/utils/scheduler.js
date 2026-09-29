const storage = require('../storage');
const { updateActiveBoard, logCompletion } = require('./board');

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function runExpiryCheck(client) {
  const active = storage.getAllActiveRequests();
  const today = todayStr();

  for (const req of active) {
    if (req.endDate >= today) continue; // still within their LOA window

    try {
      const guild = await client.guilds.fetch(req.guildId);
      const config = storage.getConfig(req.guildId);
      const member = await guild.members.fetch(req.userId).catch(() => null);

      if (member && config.loaRole && member.roles.cache.has(config.loaRole)) {
        await member.roles.remove(config.loaRole).catch(() => null);
      }

      storage.updateRequest(req.guildId, req.id, { status: 'completed' });
      await updateActiveBoard(guild, config);
      await logCompletion(guild, config, req, false);
    } catch (err) {
      console.error(`Expiry check failed for request ${req.id}:`, err);
    }
  }
}

function startLoaExpiryCheck(client) {
  runExpiryCheck(client); // run once on boot in case the bot was offline when an LOA ended
  setInterval(() => runExpiryCheck(client), 60 * 60 * 1000); // then hourly
}

module.exports = { startLoaExpiryCheck };
