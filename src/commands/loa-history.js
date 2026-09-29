const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const storage = require('../storage');
const { memberHasAnyRole } = require('../utils/permissions');
const { formatDMY, humanDuration } = require('../utils/dates');

const HISTORY_LIMIT = 10;

function statusLine(request) {
  switch (request.status) {
    case 'pending':
      return '🟡 Pending review';
    case 'denied':
      return `❌ Denied by <@${request.reviewedBy}>`;
    case 'approved':
      return `🟢 Currently on LOA — approved by <@${request.reviewedBy}> (${humanDuration(
        request.reviewedAt,
        new Date().toISOString(),
      )} so far)`;
    case 'completed':
      return `✅ Completed — approved by <@${request.reviewedBy}>, held for ${humanDuration(
        request.reviewedAt,
        request.endedAt || request.reviewedAt,
      )}${request.endedEarly ? ' (ended early)' : ''}`;
    default:
      return request.status;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loa-history')
    .setDescription("View a staff member's LOA history")
    .addUserOption((option) =>
      option.setName('user').setDescription("Whose history to view (defaults to you)").setRequired(false),
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const config = storage.getConfig(interaction.guildId);

    if (target.id !== interaction.user.id && !memberHasAnyRole(interaction.member, config.approverRoles)) {
      return interaction.reply({
        content: "❌ You don't have permission to view another member's LOA history.",
        ephemeral: true,
      });
    }

    const allRequests = storage.getRequestsForUser(interaction.guildId, target.id);
    const requests = allRequests.slice(0, HISTORY_LIMIT);

    const embed = new EmbedBuilder()
      .setTitle(`📜 LOA History — ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0x3498db)
      .setTimestamp();

    if (!requests.length) {
      embed.setDescription('No LOA requests on record.');
    } else {
      for (const request of requests) {
        embed.addFields({
          name: `${formatDMY(request.startDate)} → ${formatDMY(request.endDate)}`,
          value: `${statusLine(request)}\nReason: ${request.reason}${
            request.status === 'denied' && request.denyReason ? `\nDenial reason: ${request.denyReason}` : ''
          }`,
        });
      }
      if (allRequests.length > HISTORY_LIMIT) {
        embed.setFooter({ text: `Showing the ${HISTORY_LIMIT} most recent requests of ${allRequests.length} total.` });
      }
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
