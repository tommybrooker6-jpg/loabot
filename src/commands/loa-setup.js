const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  RoleSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
} = require('discord.js');
const { getConfig } = require('../storage');

function buildSetupMessage(guildId) {
  const config = getConfig(guildId);

  const embed = new EmbedBuilder()
    .setTitle('⚙️ LOA System Setup')
    .setDescription('Use the menus below to configure the LOA system for **FPS LAB**. Each selection saves instantly.')
    .addFields(
      {
        name: 'Staff roles (can request LOA)',
        value: config.staffRoles.length ? config.staffRoles.map((id) => `<@&${id}>`).join(', ') : '*Not set*',
      },
      {
        name: 'Approver roles (can approve/deny)',
        value: config.approverRoles.length ? config.approverRoles.map((id) => `<@&${id}>`).join(', ') : '*Not set*',
      },
      {
        name: 'LOA role (assigned on approval)',
        value: config.loaRole ? `<@&${config.loaRole}>` : '*Not set*',
      },
      {
        name: 'Review channel (requests posted here)',
        value: config.reviewChannel ? `<#${config.reviewChannel}>` : '*Not set*',
      },
    )
    .setColor(0x9146ff)
    .setFooter({ text: 'Only members with Manage Server can run this command.' });

  const staffRow = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId('loa_setup_staff_roles')
      .setPlaceholder('Select role(s) that can REQUEST an LOA')
      .setMinValues(1)
      .setMaxValues(10),
  );
  const approverRow = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId('loa_setup_approver_roles')
      .setPlaceholder('Select role(s) that can APPROVE/DENY an LOA')
      .setMinValues(1)
      .setMaxValues(10),
  );
  const loaRoleRow = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId('loa_setup_loa_role')
      .setPlaceholder('Select the role granted during an approved LOA')
      .setMinValues(1)
      .setMaxValues(1),
  );
  const channelRow = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('loa_setup_review_channel')
      .setPlaceholder('Select the channel where requests get posted for review')
      .addChannelTypes(ChannelType.GuildText)
      .setMinValues(1)
      .setMaxValues(1),
  );

  return { embeds: [embed], components: [staffRow, approverRow, loaRoleRow, channelRow] };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loa-setup')
    .setDescription('Configure who can request/approve LOAs and which role gets assigned')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const message = buildSetupMessage(interaction.guildId);
    await interaction.reply({ ...message, ephemeral: true });
  },
  buildSetupMessage,
};
