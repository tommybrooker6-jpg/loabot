const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const storage = require('../storage');
const { memberHasAnyRole } = require('../utils/permissions');
const { buildSetupMessage } = require('../commands/loa-setup');
const { updateActiveBoard, logApproval, logDenial } = require('../utils/board');
const { parseDMY, formatDMY } = require('../utils/dates');

module.exports = async function interactionCreate(interaction, client) {
  try {
    // ---- Slash commands ----
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      return command.execute(interaction);
    }

    // ---- /loa-setup role & channel selects ----
    if (interaction.isRoleSelectMenu() || interaction.isChannelSelectMenu()) {
      switch (interaction.customId) {
        case 'loa_setup_staff_roles':
          storage.updateConfig(interaction.guildId, { staffRoles: interaction.values });
          break;
        case 'loa_setup_approver_roles':
          storage.updateConfig(interaction.guildId, { approverRoles: interaction.values });
          break;
        case 'loa_setup_loa_role':
          storage.updateConfig(interaction.guildId, { loaRole: interaction.values[0] });
          break;
        case 'loa_setup_review_channel':
          storage.updateConfig(interaction.guildId, { reviewChannel: interaction.values[0] });
          break;
        case 'loa_setup_log_channel':
          storage.updateConfig(interaction.guildId, { logChannel: interaction.values[0] });
          break;
        default:
          return;
      }
      const refreshed = buildSetupMessage(interaction.guildId);
      return interaction.update(refreshed);
    }

    // ---- "Request LOA" button on the public panel ----
    if (interaction.isButton() && interaction.customId === 'request_loa') {
      const config = storage.getConfig(interaction.guildId);

      if (!config.staffRoles.length || !config.approverRoles.length || !config.loaRole || !config.reviewChannel) {
        return interaction.reply({
          content: "⚠️ The LOA system isn't fully configured yet. Ask an admin to run `/loa-setup`.",
          ephemeral: true,
        });
      }
      if (!memberHasAnyRole(interaction.member, config.staffRoles)) {
        return interaction.reply({
          content: "❌ You don't have a role that's permitted to request LOA.",
          ephemeral: true,
        });
      }

      const modal = new ModalBuilder().setCustomId('loa_request_modal').setTitle('📋 LOA Request — FPS LAB');
      const startInput = new TextInputBuilder()
        .setCustomId('start_date')
        .setLabel('Start Date (DD/MM/YYYY)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('01/10/2026')
        .setMinLength(10)
        .setMaxLength(10)
        .setRequired(true);
      const endInput = new TextInputBuilder()
        .setCustomId('end_date')
        .setLabel('End Date (DD/MM/YYYY)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('08/10/2026')
        .setMinLength(10)
        .setMaxLength(10)
        .setRequired(true);
      const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Reason for LOA')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('e.g. Family emergency, medical, personal time')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(startInput),
        new ActionRowBuilder().addComponents(endInput),
        new ActionRowBuilder().addComponents(reasonInput),
      );
      return interaction.showModal(modal);
    }

    // ---- LOA request modal submission ----
    if (interaction.isModalSubmit() && interaction.customId === 'loa_request_modal') {
      const startDate = parseDMY(interaction.fields.getTextInputValue('start_date'));
      const endDate = parseDMY(interaction.fields.getTextInputValue('end_date'));
      const reason = interaction.fields.getTextInputValue('reason').trim();

      if (!startDate || !endDate) {
        return interaction.reply({
          content: '❌ Dates must be real calendar dates in `DD/MM/YYYY` format (e.g. `01/10/2026`). Click **Request LOA** again and re-enter them.',
          ephemeral: true,
        });
      }
      if (endDate < startDate) {
        return interaction.reply({
          content: "❌ End date can't be before the start date. Click **Request LOA** again to retry.",
          ephemeral: true,
        });
      }

      const config = storage.getConfig(interaction.guildId);
      const request = {
        id: `${interaction.user.id}-${Date.now()}`,
        userId: interaction.user.id,
        startDate, // stored as ISO (YYYY-MM-DD) so sorting/expiry checks stay correct
        endDate,
        reason,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      storage.addRequest(interaction.guildId, request);

      const embed = new EmbedBuilder()
        .setTitle('📋 New LOA Request')
        .addFields(
          { name: 'Staff Member', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Status', value: '🟡 Pending', inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
          { name: 'Start Date', value: formatDMY(startDate), inline: true },
          { name: 'End Date', value: formatDMY(endDate), inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
          { name: 'Reason', value: reason },
        )
        .setColor(0xe6b800)
        .setFooter({ text: `Request ID: ${request.id}` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`loa_approve_${request.id}`).setLabel('Approve').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`loa_deny_${request.id}`).setLabel('Deny').setStyle(ButtonStyle.Danger),
      );

      const approverMentions = config.approverRoles.map((id) => `<@&${id}>`).join(' ');

      const channel = await interaction.guild.channels.fetch(config.reviewChannel).catch(() => null);
      if (channel) {
        const sentMessage = await channel
          .send({
            content: `${approverMentions} — new LOA request awaiting review`,
            embeds: [embed],
            components: [row],
            allowedMentions: { roles: config.approverRoles }, // pings the approver roles even if they aren't set to "mentionable"
          })
          .catch(() => null);
        if (sentMessage) {
          storage.updateRequest(interaction.guildId, request.id, { reviewMessageId: sentMessage.id });
        }
      }

      return interaction.reply({ content: '✅ Your LOA request has been submitted for review.', ephemeral: true });
    }

    // ---- Approve / Deny buttons ----
    if (interaction.isButton() && (interaction.customId.startsWith('loa_approve_') || interaction.customId.startsWith('loa_deny_'))) {
      const isApprove = interaction.customId.startsWith('loa_approve_');
      const requestId = interaction.customId.replace(isApprove ? 'loa_approve_' : 'loa_deny_', '');
      const config = storage.getConfig(interaction.guildId);

      if (!memberHasAnyRole(interaction.member, config.approverRoles)) {
        return interaction.reply({ content: "❌ You don't have permission to review LOA requests.", ephemeral: true });
      }

      const request = storage.getRequest(interaction.guildId, requestId);
      if (!request) {
        return interaction.reply({ content: "⚠️ Couldn't find that request (it may have been deleted).", ephemeral: true });
      }
      if (request.status !== 'pending') {
        return interaction.reply({ content: `⚠️ This request has already been ${request.status}.`, ephemeral: true });
      }

      if (!isApprove) {
        // Deny asks for a reason first — nothing is changed until that modal is submitted.
        const denyModal = new ModalBuilder().setCustomId(`loa_deny_reason_${requestId}`).setTitle('Deny LOA Request');
        const reasonInput = new TextInputBuilder()
          .setCustomId('deny_reason')
          .setLabel('Reason (optional)')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Let them know why, or leave this blank')
          .setMaxLength(300)
          .setRequired(false);
        denyModal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        return interaction.showModal(denyModal);
      }

      storage.updateRequest(interaction.guildId, requestId, {
        status: 'approved',
        reviewedBy: interaction.user.id,
        reviewedAt: new Date().toISOString(),
      });

      const member = await interaction.guild.members.fetch(request.userId).catch(() => null);
      if (member && config.loaRole) {
        await member.roles.add(config.loaRole).catch(() => null);
      }
      const approvedRequest = storage.getRequest(interaction.guildId, requestId);
      await logApproval(interaction.guild, config, approvedRequest, interaction.user.id);
      await updateActiveBoard(interaction.guild, config);
      // Approved requests are cleared out of the review channel entirely.
      await interaction.deferUpdate();
      await interaction.message.delete().catch(() => null);

      if (member) {
        member
          .send(
            `✅ Your LOA request (${formatDMY(request.startDate)} → ${formatDMY(request.endDate)}) was **approved**. You've been given the LOA role.`,
          )
          .catch(() => null); // ignore users with DMs closed
      }
    }

    // ---- Deny reason modal submission ----
    if (interaction.isModalSubmit() && interaction.customId.startsWith('loa_deny_reason_')) {
      const requestId = interaction.customId.slice('loa_deny_reason_'.length);
      const config = storage.getConfig(interaction.guildId);

      if (!memberHasAnyRole(interaction.member, config.approverRoles)) {
        return interaction.reply({ content: "❌ You don't have permission to review LOA requests.", ephemeral: true });
      }

      const request = storage.getRequest(interaction.guildId, requestId);
      if (!request) {
        return interaction.reply({ content: "⚠️ Couldn't find that request (it may have been deleted).", ephemeral: true });
      }
      if (request.status !== 'pending') {
        return interaction.reply({ content: `⚠️ This request has already been ${request.status}.`, ephemeral: true });
      }

      const denyReason = interaction.fields.getTextInputValue('deny_reason').trim() || 'No reason given';

      storage.updateRequest(interaction.guildId, requestId, {
        status: 'denied',
        reviewedBy: interaction.user.id,
        reviewedAt: new Date().toISOString(),
        denyReason,
      });

      const deniedRequest = storage.getRequest(interaction.guildId, requestId);
      await logDenial(interaction.guild, config, deniedRequest, interaction.user.id, denyReason);

      // Remove the original request from the review channel — the modal submission is a
      // separate interaction from the button click, so it can't just delete interaction.message.
      if (config.reviewChannel && request.reviewMessageId) {
        const reviewChannel = await interaction.guild.channels.fetch(config.reviewChannel).catch(() => null);
        if (reviewChannel) {
          const originalMessage = await reviewChannel.messages.fetch(request.reviewMessageId).catch(() => null);
          if (originalMessage) await originalMessage.delete().catch(() => null);
        }
      }

      const member = await interaction.guild.members.fetch(request.userId).catch(() => null);
      if (member) {
        member
          .send(
            `❌ Your LOA request (${formatDMY(request.startDate)} → ${formatDMY(request.endDate)}) was **denied**.\nReason: ${denyReason}`,
          )
          .catch(() => null);
      }

      return interaction.reply({ content: '❌ Request denied.', ephemeral: true });
    }
  } catch (err) {
    console.error('Interaction error:', err);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      interaction.reply({ content: '⚠️ Something went wrong handling that.', ephemeral: true }).catch(() => null);
    }
  }
};
