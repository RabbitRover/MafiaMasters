const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('endgame')
        .setDescription('End the current Mafia game as a draw (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction, activeSessions) {
        try {
            const channelId = interaction.channelId;
            
            // Check if there's an active game in this channel
            if (!activeSessions.has(channelId)) {
                return await interaction.reply({
                    content: '❌ There is no active Mafia game in this channel.',
                    flags: 64 // Ephemeral
                });
            }
            
            const gameSession = activeSessions.get(channelId);
            
            // Check if game is actually in progress
            if (gameSession.getGameState() === 'waiting') {
                return await interaction.reply({
                    content: '❌ The game has not started yet. Players are still joining.',
                    flags: 64 // Ephemeral
                });
            }
            
            if (gameSession.hasGameEnded()) {
                return await interaction.reply({
                    content: '❌ The game has already ended.',
                    flags: 64 // Ephemeral
                });
            }
            
            // End the game as a draw
            const drawResult = gameSession.endGameAsDraw();
            
            // Remove the session from active sessions
            activeSessions.delete(channelId);
            
            // Create draw announcement embed
            const drawEmbed = new EmbedBuilder()
                .setTitle('🤝 Game Ended - Draw')
                .setDescription('The game has been ended by an administrator.')
                .setColor(0x808080) // Gray color for draw
                .addFields(
                    { name: '📋 Result', value: 'No winners - Game declared a draw', inline: false },
                    { name: '👮 Ended By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setTimestamp();
            
            // Get all players and their roles for final display
            const allPlayers = gameSession.getAllPlayersWithRoles();
            let rolesText = '';
            
            for (const [userId, playerData] of allPlayers) {
                const nickname = gameSession.getPlayerNickname(userId);
                const roleAssignment = gameSession.getPlayerRole(userId);
                const roleIcon = getRoleIcon(roleAssignment?.role);
                const statusIcon = playerData.alive ? '💚' : '💀';
                
                rolesText += `${statusIcon} ${nickname} - ${roleIcon} ${roleAssignment?.role || 'Unknown'}\n`;
            }
            
            const rolesEmbed = new EmbedBuilder()
                .setTitle('📋 Final Player Roles')
                .setDescription(rolesText || 'No players found')
                .setColor(0x808080)
                .setTimestamp();
            
            // Add instruction to use command for new game
            const instructionEmbed = new EmbedBuilder()
                .setTitle('🎮 Start New Game')
                .setDescription('To start a new game, use the `/mafia start` command.')
                .setColor(0x00ff00)
                .setFooter({ text: 'Anyone can host a new game!' });
            
            // Send the draw announcement
            await interaction.reply({
                embeds: [drawEmbed, rolesEmbed, instructionEmbed],
                flags: 0 // Public message
            });
            
        } catch (error) {
            console.error('Error in endgame command:', error);
            
            try {
                await interaction.reply({
                    content: '❌ There was an error ending the game. Please try again.',
                    flags: 64 // Ephemeral
                });
            } catch (replyError) {
                console.error('Failed to send error reply:', replyError);
            }
        }
    }
};

/**
 * Get role icon for display
 * @param {string} role - The role name
 * @returns {string} - The role icon
 */
function getRoleIcon(role) {
    const roleIcons = {
        'MAYOR': '🏛️',
        'MAFIA': '🔫',
        'JESTER': '🃏',
        'EXECUTIONER': '⚔️',
        'SURVIVOR': '🛡️'
    };
    
    return roleIcons[role] || '❓';
}
