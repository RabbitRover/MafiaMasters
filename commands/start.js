const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const GameSession = require('../game/GameSession');
const { assignRoles, createRoleMessage } = require('../game/roles');

// Store active game sessions (in memory for now)
const activeSessions = new Map();

async function handleStartCommand(interaction, sessionsMap = activeSessions) {
        const channelId = interaction.channelId;
        const hostId = interaction.user.id;

        // Check if there's already an active game in this channel
        if (activeSessions.has(channelId)) {
            return await interaction.reply({
                content: '❌ There is already an active Mafia game in this channel!',
                flags: 64 // Ephemeral
            });
        }

        // Create new game session
        const gameSession = new GameSession(hostId, channelId);
        activeSessions.set(channelId, gameSession);

        // Create the initial embed and buttons
        const embed = await createGameEmbed(gameSession, interaction.guild);
        const row = createButtonRow(gameSession);

        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
}

// Handle button interactions
async function handleButtonInteraction(interaction) {
        const channelId = interaction.channelId;
        const userId = interaction.user.id;
        const gameSession = activeSessions.get(channelId);

        if (!gameSession) {
            return await interaction.reply({
                content: '❌ No active game found in this channel.',
                flags: 64 // Ephemeral
            });
        }

        if (interaction.customId === 'join_game') {
            // Handle join button
            if (gameSession.hasPlayer(userId)) {
                return await interaction.reply({
                    content: '❌ You have already joined this game!',
                    flags: 64 // Ephemeral
                });
            }

            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            const nickname = member ? (member.nickname || member.user.username) : interaction.user.username;
            const added = gameSession.addPlayer(userId, interaction.user.username, nickname);
            if (!added) {
                return await interaction.reply({
                    content: '❌ Unable to join the game. It might be full.',
                    flags: 64 // Ephemeral
                });
            }

            // Update the message with new player count
            const embed = await createGameEmbed(gameSession, interaction.guild);
            const row = createButtonRow(gameSession);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } else if (interaction.customId === 'leave_game') {
            // Handle leave button
            if (!gameSession.hasPlayer(userId)) {
                return await interaction.reply({
                    content: '❌ You are not in this game!',
                    flags: 64 // Ephemeral
                });
            }

            // Don't allow host to leave
            if (gameSession.isHost(userId)) {
                return await interaction.reply({
                    content: '❌ The host cannot leave the game! Use `/start` again to create a new game.',
                    flags: 64 // Ephemeral
                });
            }

            const removed = gameSession.removePlayer(userId);
            if (!removed) {
                return await interaction.reply({
                    content: '❌ Unable to leave the game.',
                    flags: 64 // Ephemeral
                });
            }

            // Update the message with new player count
            const embed = await createGameEmbed(gameSession, interaction.guild);
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
                    flags: 64 // Ephemeral
                });
            }

            if (!gameSession.isReady()) {
                return await interaction.reply({
                    content: '❌ Need exactly 5 players to start the game!',
                    flags: 64 // Ephemeral
                });
            }

            // Start the game
            gameSession.startGame();

            // Assign roles to all players
            const playerIds = gameSession.getPlayerIds();
            const roleAssignments = assignRoles(playerIds);
            gameSession.assignRoles(roleAssignments);

            const embed = new EmbedBuilder()
                .setTitle('🎭 Mafia Game Started!')
                .setDescription('The game has begun! Each player will receive their role assignment privately.')
                .setColor(0x00ff00)
                .addFields(
                    { name: '👥 Players', value: `${gameSession.getPlayerCount()}/${gameSession.maxPlayers}`, inline: true },
                    { name: '🎮 Status', value: 'Roles Assigned', inline: true }
                )
                .setTimestamp();

            await interaction.update({
                embeds: [embed],
                components: [] // Remove buttons
            });

            // Send role assignments to each player via ephemeral messages
            await sendRoleAssignments(interaction, gameSession);
        }
}

// Utility function to get active sessions (for cleanup or other commands)
function getActiveSessions() {
    return activeSessions;
}

// Clean up a session
function endSession(channelId) {
    return activeSessions.delete(channelId);
}

/**
 * Create the game embed with current status
 */
async function createGameEmbed(gameSession, guild) {
    // Get host username
    let hostUsername = 'Unknown';
    try {
        const hostMember = await guild.members.fetch(gameSession.hostId);
        hostUsername = hostMember.user.username;
    } catch (error) {
        console.error('Error fetching host member:', error);
    }

    // Create joined players list
    let joinedPlayersList = 'None';
    if (gameSession.getPlayerCount() > 0) {
        const playerUsernames = gameSession.getPlayerUsernames();
        joinedPlayersList = playerUsernames.join(', ');

        // Truncate if too long
        if (joinedPlayersList.length > 1000) {
            joinedPlayersList = joinedPlayersList.substring(0, 997) + '...';
        }
    }

    const embed = new EmbedBuilder()
        .setTitle('🎭 Mafia Game Lobby')
        .setDescription('A new Mafia game is starting! Click "Join" to participate.')
        .setColor(0x0099ff)
        .addFields(
            { name: '👑 Host', value: hostUsername, inline: true },
            { name: '👥 Players', value: `${gameSession.getPlayerCount()}/${gameSession.maxPlayers}`, inline: true },
            { name: '🎮 Status', value: gameSession.isReady() ? 'Ready to Start!' : 'Waiting for Players', inline: true },
            { name: '📋 Joined Players', value: joinedPlayersList, inline: false }
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
        // Show join and leave buttons when waiting for players
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('join_game')
                .setLabel('Join Game')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('👋'),
            new ButtonBuilder()
                .setCustomId('leave_game')
                .setLabel('Leave Game')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('👋')
                .setDisabled(gameSession.getPlayerCount() === 0) // Disable if no players
        );
    }

    return row;
}

/**
 * Send role assignments to all players via ephemeral messages
 * @param {Interaction} interaction - The Discord interaction
 * @param {GameSession} gameSession - The game session
 */
async function sendRoleAssignments(interaction, gameSession) {
    // Send role assignment announcement
    const roleEmbed = new EmbedBuilder()
        .setTitle('🎭 Roles have been assigned!')
        .setDescription('Each player will receive their role information privately. The day phase will begin shortly!')
        .setColor(0x9932cc)
        .setTimestamp();

    await interaction.followUp({
        embeds: [roleEmbed],
        flags: 0 // Public message
    });

    // Create role assignment button for each player to get their role privately
    const roleButton = new ButtonBuilder()
        .setCustomId('get_role')
        .setLabel('Get My Role')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎭');

    const roleRow = new ActionRowBuilder().addComponents(roleButton);

    // Send role assignment message with button
    const roleMessage = await interaction.followUp({
        embeds: [roleEmbed],
        components: [roleRow],
        flags: 0 // Public message
    });

    // Set up role distribution collector
    const roleCollector = roleMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000 // 5 minutes
    });

    const playersWhoGotRoles = new Set();

    roleCollector.on('collect', async (roleInteraction) => {
        const userId = roleInteraction.user.id;

        // Check if user is in the game
        if (!gameSession.hasPlayer(userId)) {
            await roleInteraction.reply({
                content: '❌ You are not in this game!',
                flags: 64 // Ephemeral
            });
            return;
        }

        // Check if player already got their role
        if (playersWhoGotRoles.has(userId)) {
            await roleInteraction.reply({
                content: '❌ You already received your role!',
                flags: 64 // Ephemeral
            });
            return;
        }

        // Get player's role assignment
        const assignment = gameSession.getPlayerRole(userId);
        if (!assignment) {
            await roleInteraction.reply({
                content: '❌ Role assignment error!',
                flags: 64 // Ephemeral
            });
            return;
        }

        // Create role message embed
        const roleEmbed = createRoleMessage(assignment);

        // Send role to player via ephemeral message
        await roleInteraction.reply({
            embeds: [roleEmbed],
            flags: 64 // Ephemeral
        });

        playersWhoGotRoles.add(userId);

        // Check if all players have received their roles
        if (playersWhoGotRoles.size === gameSession.getPlayerCount()) {
            // All players have their roles, start day phase
            roleCollector.stop();

            // Wait a moment then start day phase
            setTimeout(async () => {
                await startDayPhase(interaction, gameSession);
            }, 2000);
        }
    });

    roleCollector.on('end', async () => {
        // Disable the role button
        roleButton.setDisabled(true);
        await roleMessage.edit({
            embeds: [roleEmbed],
            components: [roleRow]
        });

        // If not all players got roles, start day phase anyway
        if (playersWhoGotRoles.size < gameSession.getPlayerCount()) {
            setTimeout(async () => {
                await startDayPhase(interaction, gameSession);
            }, 1000);
        }
    });

    // Start day phase after a short delay
    setTimeout(async () => {
        await startDayPhase(interaction, gameSession);
    }, 3000); // 3 second delay
}

/**
 * Start the day phase with voting
 * @param {Interaction} interaction - The Discord interaction
 * @param {GameSession} gameSession - The game session
 */
async function startDayPhase(interaction, gameSession) {
    gameSession.startDayPhase();

    const dayEmbed = createDayPhaseEmbed(gameSession);
    const voteButtons = createVoteButtons(gameSession);

    const dayMessage = await interaction.followUp({
        embeds: [dayEmbed],
        components: voteButtons,
        flags: 0 // Public message
    });

    // Create collector for voting buttons
    const filter = (buttonInteraction) => {
        const userId = buttonInteraction.user.id;
        // Allow host to interact even if eliminated (for end day button)
        if (gameSession.isHost(userId)) {
            return gameSession.hasPlayer(userId);
        }
        // Other players must be alive and in game
        return gameSession.hasPlayer(userId) && gameSession.getAlivePlayers().has(userId);
    };

    const collector = dayMessage.createMessageComponentCollector({
        filter,
        time: 600000 // 10 minutes
    });

    // Store collector reference on the message for manual stopping
    dayMessage.collector = collector;

    // Set up 3-minute auto-timer for day phase end
    const autoEndTimer = setTimeout(async () => {
        if (!gameSession.hasGameEnded() && gameSession.isDayPhase()) {
            try {
                await dayMessage.edit({
                    content: '⏰ **Day phase auto-ended after 3 minutes!**',
                    embeds: [dayMessage.embeds[0]],
                    components: [] // Remove all buttons
                });

                // Create a fake interaction for processing day end
                const fakeInteraction = {
                    ...interaction,
                    reply: async (options) => {
                        return await interaction.followUp(options);
                    },
                    followUp: async (options) => {
                        return await interaction.followUp(options);
                    }
                };

                await processDayPhaseEnd(fakeInteraction, gameSession, dayMessage);
                collector.stop();
            } catch (error) {
                console.error('Error in auto day end:', error);
            }
        }
    }, 180000); // 3 minutes

    collector.on('collect', async (buttonInteraction) => {
        await handleDayPhaseInteraction(buttonInteraction, gameSession, dayMessage);
    });

    collector.on('end', async () => {
        // Clear the auto-end timer
        clearTimeout(autoEndTimer);

        // Auto-end day phase if time runs out
        if (gameSession.isDayPhase()) {
            await processDayPhaseEnd(interaction, gameSession, dayMessage);
        }
    });
}

/**
 * Handle day phase button interactions
 * @param {ButtonInteraction} interaction - The button interaction
 * @param {GameSession} gameSession - The game session
 * @param {Message} dayMessage - The day phase message
 */
async function handleDayPhaseInteraction(interaction, gameSession, dayMessage) {
    const userId = interaction.user.id;
    const customId = interaction.customId;

    if (customId.startsWith('vote_')) {
        // Handle voting
        const targetId = customId.replace('vote_', '');

        if (gameSession.castVote(userId, targetId)) {
            const targetNickname = gameSession.getPlayerNickname(targetId);
            await interaction.reply({
                content: `✅ You voted for **${targetNickname}**`,
                flags: 64 // Ephemeral
            });
        } else {
            await interaction.reply({
                content: '❌ Unable to cast vote',
                flags: 64 // Ephemeral
            });
        }

    } else if (customId === 'reveal_mayor') {
        // Handle Mayor reveal
        if (gameSession.revealMayor(userId)) {
            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            const nickname = member ? (member.nickname || member.user.username) : interaction.user.username;
            await interaction.reply({
                content: `🏛️ **${nickname}** has revealed as the Mayor! Their votes now count as 4!`,
                flags: 0 // Public message
            });
        } else {
            await interaction.reply({
                content: '❌ Only the Mayor can use this button',
                flags: 64 // Ephemeral
            });
        }

    } else if (customId === 'skip_vote') {
        // Handle skip vote
        gameSession.addSkipVote(userId);
        await interaction.reply({
            content: '⏭️ You chose to skip voting this round',
            flags: 64 // Ephemeral
        });

    } else if (customId === 'end_day') {
        // Handle day phase end (host only - even if eliminated)
        if (gameSession.isHost(userId)) {
            // Reply to the interaction first
            await interaction.reply({
                content: '⏰ Ending day phase...',
                flags: 64 // Ephemeral
            });

            await processDayPhaseEnd(interaction, gameSession, dayMessage);
            // Stop the collector to prevent further interactions
            if (dayMessage.collector) {
                dayMessage.collector.stop();
            }
            return; // Don't update the message again
        } else {
            await interaction.reply({
                content: '❌ Only the host can end the day phase',
                flags: 64 // Ephemeral
            });
        }
    }

    // Update the day phase message with current vote counts
    if (!gameSession.hasGameEnded()) {
        const updatedEmbed = createDayPhaseEmbed(gameSession);
        const updatedButtons = createVoteButtons(gameSession);

        await dayMessage.edit({
            embeds: [updatedEmbed],
            components: updatedButtons
        }).catch(console.error);
    }
}

/**
 * Create the day phase embed with vote counts
 * @param {GameSession} gameSession - The game session
 * @returns {EmbedBuilder} - The day phase embed
 */
function createDayPhaseEmbed(gameSession) {
    const voteCounts = gameSession.getVoteCounts();
    const votes = gameSession.getVotes();
    const alivePlayers = gameSession.getAlivePlayers();

    // Create vote count display
    let voteCountText = '';
    for (const playerId of alivePlayers) {
        const nickname = gameSession.getPlayerNickname(playerId);
        const voteCount = voteCounts.get(playerId) || 0;
        voteCountText += `**${nickname}**: ${voteCount} vote${voteCount !== 1 ? 's' : ''}\n`;
    }

    if (!voteCountText) {
        voteCountText = 'No votes cast yet';
    }

    // Create vote details display (who voted for whom)
    let voteDetailsText = '';
    const skipVotes = gameSession.getSkipVotes();

    // Show regular votes
    for (const [voterId, targetId] of votes) {
        const voterName = gameSession.getPlayerNickname(voterId);
        const targetName = gameSession.getPlayerNickname(targetId);
        const voterRole = gameSession.getPlayerRole(voterId);
        const voteWeight = (voterRole?.role === 'MAYOR' && gameSession.isMayorRevealed()) ? ' (4 votes)' : '';
        voteDetailsText += `${voterName} → ${targetName}${voteWeight}\n`;
    }

    // Show skip votes
    for (const voterId of skipVotes) {
        const voterName = gameSession.getPlayerNickname(voterId);
        voteDetailsText += `${voterName} → Skip\n`;
    }

    if (votes.size === 0 && skipVotes.size === 0) {
        voteDetailsText = 'No votes cast yet';
    }

    const embed = new EmbedBuilder()
        .setTitle(`☀️ Day ${gameSession.getDayNumber()} - Voting Time!`)
        .setDescription('Vote to eliminate a player. The player with the most votes will be eliminated.')
        .setColor(0xffaa00)
        .addFields(
            { name: '🗳️ Vote Counts', value: voteCountText, inline: false },
            { name: '📊 Vote Details', value: voteDetailsText, inline: false },
            { name: '👥 Alive Players', value: `${alivePlayers.size} players remaining`, inline: true }
        )
        .setFooter({ text: 'Vote wisely! Majority rules.' })
        .setTimestamp();

    // Add Mayor status if revealed
    if (gameSession.isMayorRevealed()) {
        const mayorId = gameSession.getMayorId();
        const mayorNickname = gameSession.getPlayerNickname(mayorId);
        embed.addFields({
            name: '🏛️ Mayor Revealed',
            value: `**${mayorNickname}** is the Mayor (votes count as 4)`,
            inline: false
        });
    }

    return embed;
}

/**
 * Create vote buttons for all alive players
 * @param {GameSession} gameSession - The game session
 * @returns {Array<ActionRowBuilder>} - Array of button rows
 */
function createVoteButtons(gameSession) {
    const alivePlayers = Array.from(gameSession.getAlivePlayers());
    const rows = [];

    // Create vote buttons (max 5 buttons per row)
    const voteButtons = [];
    for (const playerId of alivePlayers) {
        const nickname = gameSession.getPlayerNickname(playerId);
        voteButtons.push(
            new ButtonBuilder()
                .setCustomId(`vote_${playerId}`)
                .setLabel(`Vote ${nickname}`)
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗳️')
        );
    }

    // Split buttons into rows (max 5 per row)
    for (let i = 0; i < voteButtons.length; i += 5) {
        const row = new ActionRowBuilder();
        row.addComponents(voteButtons.slice(i, i + 5));
        rows.push(row);
    }

    // Add special action buttons in a separate row
    const actionRow = new ActionRowBuilder();

    // Mayor reveal button (only if Mayor hasn't revealed yet)
    if (!gameSession.isMayorRevealed()) {
        actionRow.addComponents(
            new ButtonBuilder()
                .setCustomId('reveal_mayor')
                .setLabel('Reveal as Mayor')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🏛️')
        );
    }

    // Skip vote button
    actionRow.addComponents(
        new ButtonBuilder()
            .setCustomId('skip_vote')
            .setLabel('Skip Voting')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⏭️')
    );

    // End day button (host only)
    actionRow.addComponents(
        new ButtonBuilder()
            .setCustomId('end_day')
            .setLabel('End Day Phase')
            .setStyle(ButtonStyle.Success)
            .setEmoji('⏰')
    );

    rows.push(actionRow);

    return rows;
}

/**
 * Process the end of day phase and handle elimination
 * @param {Interaction} interaction - The Discord interaction
 * @param {GameSession} gameSession - The game session
 * @param {Message} dayMessage - The day phase message
 */
async function processDayPhaseEnd(interaction, gameSession, dayMessage) {
    const eliminationResult = gameSession.processElimination();

    // Stop the collector to prevent further interactions
    if (dayMessage.collector) {
        dayMessage.collector.stop();
    }

    // Disable all buttons
    const disabledRows = createVoteButtons(gameSession).map(row => {
        const newRow = new ActionRowBuilder();
        row.components.forEach(button => {
            newRow.addComponents(
                ButtonBuilder.from(button).setDisabled(true)
            );
        });
        return newRow;
    });

    // Update the day message with disabled buttons
    await dayMessage.edit({
        embeds: [createDayPhaseEmbed(gameSession)],
        components: disabledRows
    }).catch(console.error);

    // Create elimination result embed
    let resultEmbed;

    if (eliminationResult.eliminated) {
        const eliminated = eliminationResult.eliminated;
        resultEmbed = new EmbedBuilder()
            .setTitle('⚰️ Elimination Results')
            .setDescription(`**${eliminated.username}** has been eliminated!`)
            .setColor(0xff0000)
            .addFields(
                { name: '🎭 Role Revealed', value: `${eliminated.roleInfo.emoji} **${eliminated.roleInfo.name}**`, inline: true },
                { name: '⚖️ Alignment', value: eliminated.roleInfo.alignment, inline: true }
            )
            .setTimestamp();

        // Check for Executioner win (game continues) - announce but don't end game
        if (eliminationResult.executionerWin) {
            const executioner = eliminationResult.executionerWin;
            resultEmbed.addFields({
                name: '🎯 Executioner Victory!',
                value: `**${executioner.username}** wins as Executioner!\n*${executioner.reason}*\n\n*Game continues...*`,
                inline: false
            });
            resultEmbed.setColor(0xffd700);
        }

        // Check for game end
        if (eliminationResult.gameEnded) {
            const winResult = eliminationResult.winner;
            const winners = winResult.winners;

            let winText = '';
            for (const winner of winners) {
                winText += `**${winner.username}** (${winner.type}) wins!\n*${winner.reason}*\n`;
            }

            resultEmbed.addFields({
                name: '🏆 Game Over!',
                value: winText,
                inline: false
            });

            resultEmbed.setColor(0x00ff00);
        }

    } else {
        // No elimination (tie or no votes)
        const reason = eliminationResult.reason === 'tie' ? 'Vote tie' : 'No votes cast';
        resultEmbed = new EmbedBuilder()
            .setTitle('🤝 No Elimination')
            .setDescription(`${reason} - no one was eliminated today.`)
            .setColor(0xffaa00)
            .setTimestamp();

        if (eliminationResult.reason === 'tie' && eliminationResult.tiedPlayers.length > 0) {
            const tiedNames = eliminationResult.tiedPlayers
                .map(id => gameSession.getPlayerUsername(id))
                .join(', ');
            resultEmbed.addFields({
                name: '🤝 Tied Players',
                value: tiedNames,
                inline: false
            });
        }
    }

    // Send elimination results
    await interaction.followUp({
        embeds: [resultEmbed],
        flags: 0 // Public message
    });

    // If game ended, show final results and clean up
    if (eliminationResult.gameEnded) {
        await announceGameEnd(interaction, gameSession);

        // Remove the game session after a delay to allow players to see results
        setTimeout(() => {
            activeSessions.delete(gameSession.channelId);
        }, 60000); // 60 seconds
    } else {
        // Game continues - start night phase after a short delay
        setTimeout(async () => {
            if (!gameSession.hasGameEnded()) {
                await startNightPhase(interaction, gameSession);
            }
        }, 5000); // 5 second delay before night phase
    }
}

/**
 * Start the night phase
 * @param {Interaction} interaction - The Discord interaction
 * @param {GameSession} gameSession - The game session
 */
async function startNightPhase(interaction, gameSession) {
    gameSession.startNightPhase();

    const mafiaId = gameSession.getMafiaId();

    // If Mafia is dead, skip night phase and go to next day
    if (!mafiaId) {
        await skipNightPhase(interaction, gameSession);
        return;
    }

    const alivePlayers = gameSession.getAlivePlayers();

    // Create kill buttons for all alive players (including Mafia to hide identity)
    const killButtons = [];
    for (const playerId of alivePlayers) {
        const nickname = gameSession.getPlayerNickname(playerId);
        const playerRole = gameSession.getPlayerRole(playerId);

        // Only Mafia cannot be killed (disabled), Executioner is clickable but immune
        const isExecutioner = playerRole?.role === 'EXECUTIONER';
        const isMafia = playerId === mafiaId;
        const isDisabled = isMafia; // Only disable Mafia button

        let buttonLabel, buttonStyle, buttonEmoji;
        if (isMafia) {
            buttonLabel = `${nickname}`;
            buttonStyle = ButtonStyle.Secondary;
            buttonEmoji = '🚫';
        } else {
            buttonLabel = `Kill ${nickname}`;
            buttonStyle = ButtonStyle.Danger;
            buttonEmoji = '🔪';
        }

        killButtons.push(
            new ButtonBuilder()
                .setCustomId(`night_kill_${playerId}`)
                .setLabel(buttonLabel)
                .setStyle(buttonStyle)
                .setEmoji(buttonEmoji)
                .setDisabled(isDisabled)
        );
    }

    // Add skip kill button
    killButtons.push(
        new ButtonBuilder()
            .setCustomId('night_skip')
            .setLabel('Skip Kill')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⏭️')
    );

    // Create action rows (max 5 buttons per row)
    const rows = [];
    for (let i = 0; i < killButtons.length; i += 5) {
        const row = new ActionRowBuilder().addComponents(killButtons.slice(i, i + 5));
        rows.push(row);
    }

    // Send night phase announcement with kill buttons
    const nightEmbed = new EmbedBuilder()
        .setTitle('🌙 Night Phase')
        .setDescription('The town sleeps... but evil lurks in the shadows.\n\n🔫 **Mafia**: Choose your target below, or skip your kill.')
        .setColor(0x2c2f33)
        .addFields(
            { name: '👥 Alive Players', value: `${alivePlayers.size} players remaining`, inline: true },
            { name: '📅 Day', value: `Day ${gameSession.getDayNumber()}`, inline: true }
        )
        .setTimestamp();

    const nightMessage = await interaction.followUp({
        embeds: [nightEmbed],
        components: rows,
        flags: 0 // Public message
    });

    // Create collector that only allows Mafia to interact
    const filter = (buttonInteraction) => {
        return buttonInteraction.user.id === mafiaId;
    };

    const collector = nightMessage.createMessageComponentCollector({
        filter,
        time: 120000 // 2 minutes
    });

    collector.on('collect', async (buttonInteraction) => {
        await handleMafiaKillAction(buttonInteraction, gameSession);

        // Disable all buttons after action is taken
        const disabledRows = rows.map(row => {
            const newRow = new ActionRowBuilder();
            row.components.forEach(button => {
                newRow.addComponents(ButtonBuilder.from(button).setDisabled(true));
            });
            return newRow;
        });

        await nightMessage.edit({
            embeds: [nightEmbed],
            components: disabledRows
        });

        collector.stop();
    });

    collector.on('end', async () => {
        // Process night results
        setTimeout(async () => {
            await processNightPhaseEnd(interaction, gameSession, nightMessage);
        }, 2000);
    });
}



/**
 * Handle Mafia kill action
 * @param {ButtonInteraction} interaction - The button interaction
 * @param {GameSession} gameSession - The game session
 */
async function handleMafiaKillAction(interaction, gameSession) {
    const customId = interaction.customId;

    if (customId === 'night_skip') {
        // Mafia chose to skip kill
        await interaction.reply({
            content: '⏭️ You chose to skip your kill tonight.',
            flags: 64 // Ephemeral
        });
        return;
    }

    if (customId.startsWith('night_kill_')) {
        const targetId = customId.replace('night_kill_', '');
        const targetRole = gameSession.getPlayerRole(targetId);
        const targetNickname = gameSession.getPlayerNickname(targetId);

        // Check if target is Executioner (immune to night kills)
        if (targetRole?.role === 'EXECUTIONER') {
            await interaction.reply({
                content: `🛡️ You attempted to eliminate **${targetNickname}**, but they were protected and survived the night.`,
                flags: 64 // Ephemeral
            });
            // Don't set a kill target - no one dies
            return;
        }

        if (gameSession.setNightKillTarget(targetId)) {
            await interaction.reply({
                content: `🔪 You have chosen to eliminate **${targetNickname}** tonight.`,
                flags: 64 // Ephemeral
            });
        } else {
            await interaction.reply({
                content: '❌ Unable to target that player.',
                flags: 64 // Ephemeral
            });
        }
    }
}

/**
 * Process the end of night phase
 * @param {Interaction} interaction - The Discord interaction
 * @param {GameSession} gameSession - The game session
 * @param {Message} nightMessage - The night phase message
 */
async function processNightPhaseEnd(interaction, gameSession, nightMessage) {
    const nightResult = gameSession.processNightElimination();

    // Update night message to show it's ended
    const endedNightEmbed = new EmbedBuilder()
        .setTitle('🌅 Dawn Breaks')
        .setDescription('The night is over. The town awakens to discover what happened...')
        .setColor(0xffa500)
        .setTimestamp();

    await nightMessage.edit({
        embeds: [endedNightEmbed],
        components: [] // Remove any components
    }).catch(console.error);

    // Create night results embed
    let resultEmbed;

    if (nightResult.eliminated) {
        const eliminated = nightResult.eliminated;
        resultEmbed = new EmbedBuilder()
            .setTitle('💀 Night Results')
            .setDescription(`**${eliminated.username}** was found dead!`)
            .setColor(0x8b0000)
            .addFields(
                { name: '🎭 Role Revealed', value: `${eliminated.roleInfo.emoji} **${eliminated.roleInfo.name}**`, inline: true },
                { name: '⚖️ Alignment', value: eliminated.roleInfo.alignment, inline: true },
                { name: '🔪 Cause of Death', value: 'Eliminated by the Mafia', inline: false }
            )
            .setTimestamp();

        // Check for game end due to night elimination
        if (nightResult.gameEnded && nightResult.winner) {
            const winResult = nightResult.winner;
            let winText = '';
            for (const winner of winResult.winners) {
                winText += `**${winner.username}** (${winner.type}) wins!\n*${winner.reason}*\n`;
            }

            resultEmbed.addFields({
                name: '🏆 Game Over!',
                value: winText,
                inline: false
            });

            resultEmbed.setColor(0x00ff00);
        }
    } else {
        resultEmbed = new EmbedBuilder()
            .setTitle('🌅 Peaceful Night')
            .setDescription('No one was eliminated during the night.')
            .setColor(0x90ee90)
            .setTimestamp();
    }

    // Handle role changes (Executioner -> Jester)
    if (nightResult.roleChanges.length > 0) {
        for (const roleChange of nightResult.roleChanges) {
            resultEmbed.addFields({
                name: '🔄 Role Change',
                value: `**${roleChange.username}** is now a **Jester**!\n*${roleChange.reason}*`,
                inline: false
            });

            // Send private message to the converted player
            try {
                const convertedPlayer = await interaction.guild.members.fetch(roleChange.playerId);
                const newAssignment = gameSession.getPlayerRole(roleChange.playerId);
                const roleEmbed = createRoleMessage(newAssignment);

                await convertedPlayer.send({
                    content: '🔄 **Your role has changed!**',
                    embeds: [new EmbedBuilder()
                        .setTitle(roleEmbed.title)
                        .setDescription(roleEmbed.description)
                        .setColor(roleEmbed.color)
                        .setFooter(roleEmbed.footer)
                        .setTimestamp()
                    ]
                });
            } catch (error) {
                console.error('Could not send role change message:', error);
            }
        }
    }

    // Send night results
    await interaction.followUp({
        embeds: [resultEmbed],
        flags: 0 // Public message
    });

    // Check if game ended due to night elimination
    if (nightResult.gameEnded) {
        await announceGameEnd(interaction, gameSession);

        // Remove the game session after a delay
        setTimeout(() => {
            activeSessions.delete(gameSession.channelId);
        }, 60000); // 60 seconds
    } else {
        // Start next day phase after a short delay
        setTimeout(async () => {
            if (!gameSession.hasGameEnded()) {
                gameSession.incrementDay();
                await startDayPhase(interaction, gameSession);
            }
        }, 3000); // 3 second delay before next day
    }
}

/**
 * Announce game end with winners and all player roles
 * @param {Interaction} interaction - The Discord interaction
 * @param {GameSession} gameSession - The game session
 */
async function announceGameEnd(interaction, gameSession) {
    const gameWinner = gameSession.getGameWinner();
    const allPlayers = gameSession.getAllPlayersWithRoles();

    // Create winner announcement embed
    const winnerEmbed = new EmbedBuilder()
        .setTitle('🎉 Game Over!')
        .setColor(0xffd700)
        .setTimestamp();

    // Add winner information
    let winnerText = '';
    for (const winner of gameWinner.winners) {
        winnerText += `🏆 **${winner.username}** (${winner.type})\n`;
        winnerText += `*${winner.reason}*\n\n`;
    }

    winnerEmbed.setDescription(winnerText);

    // Create player roles embed
    const rolesEmbed = new EmbedBuilder()
        .setTitle('📋 Final Player Roles')
        .setColor(0x0099ff)
        .setTimestamp();

    let rolesText = '';
    for (const player of allPlayers) {
        const statusEmoji = player.isAlive ? '💚' : '💀';
        const roleEmoji = player.roleInfo.emoji;

        rolesText += `${statusEmoji} **${player.username}** - ${roleEmoji} ${player.roleInfo.name}`;

        // Add target information for Executioner
        if (player.role === 'EXECUTIONER' && player.targetRole) {
            rolesText += ` (Target: ${player.targetRoleInfo.name})`;
        }

        rolesText += '\n';
    }

    rolesEmbed.setDescription(rolesText);

    // Create "Start New Game" button
    const startNewButton = new ButtonBuilder()
        .setCustomId('start_new_game')
        .setLabel('Start New Game')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🎮');

    const buttonRow = new ActionRowBuilder().addComponents(startNewButton);

    // Send embeds with start new game button
    const gameEndMessage = await interaction.followUp({
        embeds: [winnerEmbed, rolesEmbed],
        components: [buttonRow],
        flags: 0 // Public message
    });

    // Set up collector for start new game button
    const collector = gameEndMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000 // 5 minutes
    });

    collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.customId === 'start_new_game') {
            // Anyone can start a new game
            await buttonInteraction.reply({
                content: '🎮 Starting a new game...',
                flags: 64 // Ephemeral
            });

            // Create a new game session with the button clicker as host
            const channelId = buttonInteraction.channelId;
            const hostId = buttonInteraction.user.id;

            // Remove old game session
            activeSessions.delete(channelId);

            // Create new game session
            const newGameSession = new GameSession(hostId, channelId);
            activeSessions.set(channelId, newGameSession);

            // Create the initial embed and buttons for new lobby
            const embed = await createGameEmbed(newGameSession, buttonInteraction.guild);
            const row = createButtonRow(newGameSession);

            // Send new lobby message
            await buttonInteraction.followUp({
                embeds: [embed],
                components: [row],
                flags: 0 // Public message
            });

            // Stop the collector
            collector.stop();
        }
    });

    collector.on('end', () => {
        // Disable the button after timeout
        startNewButton.setDisabled(true);
        gameEndMessage.edit({
            embeds: [winnerEmbed, rolesEmbed],
            components: [buttonRow]
        }).catch(console.error);
    });

    // Reset game state (optional - for potential restart functionality)
    // gameSession.resetGameState();
}

/**
 * Skip night phase when Mafia is dead
 * @param {Interaction} interaction - The Discord interaction
 * @param {GameSession} gameSession - The game session
 */
async function skipNightPhase(interaction, gameSession) {
    const skipEmbed = new EmbedBuilder()
        .setTitle('🌅 Night Skipped')
        .setDescription('The Mafia is no longer active. The night passes peacefully.')
        .setColor(0x90ee90)
        .setTimestamp();

    await interaction.followUp({
        embeds: [skipEmbed],
        flags: 0 // Public message
    });

    // Start next day phase after a short delay
    setTimeout(async () => {
        if (!gameSession.hasGameEnded()) {
            gameSession.incrementDay();
            await startDayPhase(interaction, gameSession);
        }
    }, 3000); // 3 second delay before next day
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start')
        .setDescription('Start a new Mafia game session'),

    async execute(interaction) {
        await handleStartCommand(interaction, activeSessions);
    },

    handleStartCommand,
    handleButtonInteraction,
    getActiveSessions,
    endSession
};
