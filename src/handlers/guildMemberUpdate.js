const storage = require('../storage');
const { updateActiveBoard, logCompletion } = require('../utils/board');

module.exports = async function guildMemberUpdate(oldMember, newMember) {
  try {
    const config = storage.getConfig(newMember.guild.id);
    if (!config.loaRole) return;

    const hadRole = oldMember.roles.cache.has(config.loaRole);
    const hasRole = newMember.roles.cache.has(config.loaRole);
    if (!hadRole || hasRole) return; // only care about the LOA role being taken away

    const active = storage.getActiveRequests(newMember.guild.id).find((r) => r.userId === newMember.id);
    if (!active) return; // role was removed but there's no bot-tracked LOA to close out

    storage.updateRequest(newMember.guild.id, active.id, {
      status: 'completed',
      endedEarly: true,
      endedAt: new Date().toISOString(),
    });

    await updateActiveBoard(newMember.guild, config);
    await logCompletion(newMember.guild, config, active, true);
  } catch (err) {
    console.error('guildMemberUpdate (LOA) error:', err);
  }
};
