const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loa-panel')
    .setDescription('Post the LOA request panel in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📋 LOA REQUEST')
      .setDescription(
        "Need some time away from **FPS LAB**? Submit an LOA request using the button below.\n\n" +
          '**You\'ll be asked for:**\n' +
          "> 📅 **Start Date** — When your LOA begins\n" +
          "> 📅 **End Date** — When you'll return\n" +
          '> 📝 **Reason** — Why you need the LOA\n\n' +
          '**Please note**\n' +
          '> All requests must be approved by staff leadership.\n' +
          '> Unapproved inactivity may result in an activity warning.',
      )
      .setColor(0x992d22)
      .setFooter({ text: 'FPS LAB • Staff Management' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('request_loa').setLabel('Request LOA').setEmoji('📝').setStyle(ButtonStyle.Primary),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
