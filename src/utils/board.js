const { EmbedBuilder } = require('discord.js');
const storage = require('../storage');
const { formatDMY, humanDuration } = require('./dates');

function daysBetween(start, end) {
  const ms = new Date(end) - new Date(start);
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1; // inclusive of both days
}

function buildBoardEmbed(activeRequests) {
  const embed = new EmbedBuilder().setTitle('📌 Active LOAs').setColor(0x3498db).setTimestamp();

  if (!activeRequests.length) {
    embed.setDescription('🟢 No staff are currently on LOA.');
    return embed;
  }

  embed.setDescription(`🟡 **${activeRequests.length}** staff member(s) currently on LOA:`);
  for (const req of activeRequests) {
    embed.addFields({
      name: '\u200B',
      value: `<@${req.userId}> — until **${formatDMY(req.endDate)}** (approved by <@${req.reviewedBy}>)`,
    });
  }
  return embed;
}

// Creates the board message once, then edits that same message forever after
// so the channel doesn't fill up with reposts every time an LOA starts or ends.
async function updateActiveBoard(guild, config) {
  if (!config.logChannel) return;
  const channel = await guild.channels.fetch(config.logChannel).catch(() => null);
  if (!channel) return;

  const embed = buildBoardEmbed(storage.getActiveRequests(guild.id));

  let message = null;
  if (config.boardMessageId) {
    message = await channel.messages.fetch(config.boardMessageId).catch(() => null);
  }

  if (message) {
    await message.edit({ embeds: [embed] }).catch(() => null);
    return;
  }

  const newMessage = await channel.send({ embeds: [embed] }).catch(() => null);
  if (newMessage) {
    storage.updateConfig(guild.id, { boardMessageId: newMessage.id });
    newMessage.pin().catch(() => null); // harmless if the bot lacks Manage Messages
  }
}

// One permanent, never-edited entry per approval — the audit trail.
async function logApproval(guild, config, request, reviewerId) {
  if (!config.logChannel) return;
  const channel = await guild.channels.fetch(config.logChannel).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('✅ LOA Approved')
    .setColor(0x2ecc71)
    .addFields(
      { name: 'Staff Member', value: `<@${request.userId}>`, inline: true },
      { name: 'Approved By', value: `<@${reviewerId}>`, inline: true },
      { name: '\u200B', value: '\u200B', inline: true },
      { name: 'Start Date', value: formatDMY(request.startDate), inline: true },
      { name: 'End Date', value: formatDMY(request.endDate), inline: true },
      { name: 'Duration', value: `${daysBetween(request.startDate, request.endDate)} day(s)`, inline: true },
      { name: 'Reason', value: request.reason },
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => null);
}

// One permanent, never-edited entry when an LOA finishes — either on schedule or ended early.
async function logCompletion(guild, config, request, endedEarly) {
  if (!config.logChannel) return;
  const channel = await guild.channels.fetch(config.logChannel).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('🏁 LOA Completed')
    .setColor(0x95a5a6)
    .addFields(
      { name: 'Staff Member', value: `<@${request.userId}>`, inline: true },
      { name: 'Approved By', value: request.reviewedBy ? `<@${request.reviewedBy}>` : 'Unknown', inline: true },
      { name: '\u200B', value: '\u200B', inline: true },
      { name: 'Start Date', value: formatDMY(request.startDate), inline: true },
      { name: 'End Date', value: formatDMY(request.endDate), inline: true },
      { name: 'Duration Requested', value: `${daysBetween(request.startDate, request.endDate)} day(s)`, inline: true },
      { name: 'Reason', value: request.reason },
      {
        name: 'Actual Time on LOA',
        value: request.reviewedAt
          ? humanDuration(request.reviewedAt, request.endedAt || new Date().toISOString())
          : 'Unknown',
        inline: true,
      },
      {
        name: 'Ended',
        value: endedEarly ? '⏹️ Early — LOA role removed manually' : '✅ On schedule (end date reached)',
      },
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => null);
}

// One permanent, never-edited entry per denial — kept in the log channel, not the review channel.
async function logDenial(guild, config, request, reviewerId, denyReason) {
  if (!config.logChannel) return;
  const channel = await guild.channels.fetch(config.logChannel).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('❌ LOA Denied')
    .setColor(0xe74c3c)
    .addFields(
      { name: 'Staff Member', value: `<@${request.userId}>`, inline: true },
      { name: 'Denied By', value: `<@${reviewerId}>`, inline: true },
      { name: '\u200B', value: '\u200B', inline: true },
      { name: 'Start Date', value: formatDMY(request.startDate), inline: true },
      { name: 'End Date', value: formatDMY(request.endDate), inline: true },
      { name: '\u200B', value: '\u200B', inline: true },
      { name: 'Reason for LOA', value: request.reason },
      { name: 'Denial Reason', value: denyReason || 'No reason given' },
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => null);
}

module.exports = { updateActiveBoard, logApproval, logDenial, logCompletion };
