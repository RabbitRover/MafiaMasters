const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GameSession = require('../game/GameSession');

// Store active game sessions (in memory for now)
const activeSessions = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start')
        .setDescription('Start a new Mafia game session'),

    async execute(interaction) {
        const channelId = interaction.channelId;
        const hostId = interaction.user.id;

        // Check if there's already an active game in this channel
        if (activeSessions.has(channelId)) {
            return await interaction.reply({
                content: '❌ There is already an active Mafia game in this channel!',
                ephemeral: true
            });
        }

        // Create new game session
        const gameSession = new GameSession(hostId, channelId);
        activeSessions.set(channelId, gameSession);

        // Create the initial embed and buttons
        const embed = createGameEmbed(gameSession, interaction.user.username);
        const row = createButtonRow(gameSession);

        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
    },

    // Handle button interactions
    async handleButtonInteraction(interaction) {
        const channelId = interaction.channelId;
        const userId = interaction.user.id;
        const gameSession = activeSessions.get(channelId);

        if (!gameSession) {
            return await interaction.reply({
                content: '❌ No active game found in this channel.',
                ephemeral: true
            });
        }

        if (interaction.customId === 'join_game') {
            // Handle join button
            if (gameSession.hasPlayer(userId)) {
                return await interaction.reply({
                    content: '❌ You have already joined this game!',
                    ephemeral: true
                });
            }

            const added = gameSession.addPlayer(userId);
            if (!added) {
                return await interaction.reply({
                    content: '❌ Unable to join the game. It might be full.',
                    ephemeral: true
                });
            }

            // Update the message with new player count
            const embed = createGameEmbed(gameSession, interaction.guild.members.cache.get(gameSession.hostId)?.user.username || 'Unknown');
            const row = createButtonRow(gameSession);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } else if (interaction.customId === 'start_game') {
            // Handle start button
            if (!gameSession.isHost(userId)) {
                return await interaction.reply({
                    content: '❌ Only the host can start the game!',
                    ephemeral: true
                });
            }

            if (!gameSession.isReady()) {
                return await interaction.reply({
                    content: '❌ Need exactly 5 players to start the game!',
                    ephemeral: true
                });
            }

            // Start the game
            gameSession.startGame();

            const embed = new EmbedBuilder()
                .setTitle('🎭 Mafia Game Started!')
                .setDescription('The game has begun! Roles are being assigned...')
                .setColor(0x00ff00)
                .addFields(
                    { name: '👥 Players', value: `${gameSession.getPlayerCount()}/${gameSession.maxPlayers}`, inline: true },
                    { name: '🎮 Status', value: 'Game Started', inline: true }
                )
                .setTimestamp();

            await interaction.update({
                embeds: [embed],
                components: [] // Remove buttons
            });

            // TODO: Implement role assignment and game logic
            await interaction.followUp({
                content: '🚧 Role assignment and game mechanics will be implemented in the next phase!',
                ephemeral: false
            });
        }
    },

    // Utility function to get active sessions (for cleanup or other commands)
    getActiveSessions() {
        return activeSessions;
    },

    // Clean up a session
    endSession(channelId) {
        return activeSessions.delete(channelId);
    }
};

/**
 * Create the game embed with current status
 */
function createGameEmbed(gameSession, hostUsername) {
    const embed = new EmbedBuilder()
        .setTitle('🎭 Mafia Game Lobby')
        .setDescription('A new Mafia game is starting! Click "Join" to participate.')
        .setColor(0x0099ff)
        .addFields(
            { name: '👑 Host', value: hostUsername, inline: true },
            { name: '👥 Players', value: `${gameSession.getPlayerCount()}/${gameSession.maxPlayers}`, inline: true },
            { name: '🎮 Status', value: gameSession.isReady() ? 'Ready to Start!' : 'Waiting for Players', inline: true }
        )
        .setFooter({ text: 'Need 5 players to start the game' })
        .setTimestamp();

    return embed;
}

/**
 * Create button row based on game state
 */
function createButtonRow(gameSession) {
    const row = new ActionRowBuilder();

    if (gameSession.isReady()) {
        // Show start button when ready
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('start_game')
                .setLabel('Start Game')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🚀')
        );
    } else {
        // Show join button when waiting for players
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('join_game')
                .setLabel('Join Game')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('👋')
        );
    }

    return row;
}
