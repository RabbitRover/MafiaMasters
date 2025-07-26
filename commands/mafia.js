const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GAME_RULES, ROLE_INFO } = require('../game/gameInfo.js');
const GameSession = require('../game/GameSession.js');

// Import the start game functionality
const { handleStartCommand } = require('./start.js');

// Store active game sessions
const activeSessions = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mafia')
        .setDescription('Mafia game commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a new Mafia game'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('rules')
                .setDescription('Show the game rules'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('mayor')
                .setDescription('Show information about the Mayor role'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('mafia')
                .setDescription('Show information about the Mafia role'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('jester')
                .setDescription('Show information about the Jester role'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('survivor')
                .setDescription('Show information about the Survivor role'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('executioner')
                .setDescription('Show information about the Executioner role')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'start') {
            // Handle start game command
            await handleStartCommand(interaction, activeSessions);
        } else if (subcommand === 'rules') {
            // Show game rules
            const rulesEmbed = new EmbedBuilder()
                .setTitle(GAME_RULES.title)
                .setDescription(GAME_RULES.description)
                .setColor(GAME_RULES.color)
                .setTimestamp();

            // Add each rule section
            for (const section of GAME_RULES.sections) {
                rulesEmbed.addFields({
                    name: section.name,
                    value: section.value,
                    inline: false
                });
            }

            await interaction.reply({
                embeds: [rulesEmbed],
                flags: 64 // Ephemeral
            });
        } else {
            // Handle role information commands
            const roleKey = subcommand.toUpperCase();
            const roleInfo = ROLE_INFO[roleKey];

            if (!roleInfo) {
                await interaction.reply({
                    content: '❌ Role information not found!',
                    flags: 64 // Ephemeral
                });
                return;
            }

            const roleEmbed = new EmbedBuilder()
                .setTitle(roleInfo.title)
                .setDescription(roleInfo.description)
                .setColor(roleInfo.color)
                .setTimestamp();

            // Add each detail section
            for (const detail of roleInfo.details) {
                roleEmbed.addFields({
                    name: detail.name,
                    value: detail.value,
                    inline: false
                });
            }

            await interaction.reply({
                embeds: [roleEmbed],
                flags: 64 // Ephemeral
            });
        }
    },
};
