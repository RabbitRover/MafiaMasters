class GameSession {
    constructor(hostId, channelId) {
        this.hostId = hostId;
        this.channelId = channelId;
        this.players = new Set(); // Use Set to prevent duplicate players
        this.playerUsernames = new Map(); // Store player usernames: playerId -> username
        this.maxPlayers = 5;
        this.gameState = 'waiting'; // waiting, ready, started, roles_assigned, day_phase, night_phase, game_ended
        this.createdAt = new Date();
        this.roleAssignments = {}; // Store role assignments: { playerId: { role, roleInfo, target?, targetRole? } }

        // Day phase voting system
        this.votes = new Map(); // voterId -> targetId
        this.mayorRevealed = false;
        this.alivePlayers = new Set(); // Track alive players
        this.gameWinner = null; // Store game winner
        this.eliminatedPlayer = null; // Store eliminated player info

        // Night phase system
        this.nightKillTarget = null; // Player marked for elimination by Mafia
        this.dayNumber = 1; // Track current day number
    }

    /**
     * Add a player to the game session
     * @param {string} userId - Discord user ID
     * @param {string} username - Discord username
     * @returns {boolean} - True if player was added, false if already in game
     */
    addPlayer(userId, username) {
        if (this.players.has(userId)) {
            return false; // Player already joined
        }

        if (this.players.size >= this.maxPlayers) {
            return false; // Game is full
        }

        this.players.add(userId);
        this.playerUsernames.set(userId, username);

        // Update game state if we have enough players
        if (this.players.size >= this.maxPlayers) {
            this.gameState = 'ready';
        }

        return true;
    }

    /**
     * Remove a player from the game session
     * @param {string} userId - Discord user ID
     * @returns {boolean} - True if player was removed
     */
    removePlayer(userId) {
        const removed = this.players.delete(userId);
        if (removed) {
            this.playerUsernames.delete(userId);
        }

        // Update game state if we no longer have enough players
        if (this.players.size < this.maxPlayers && this.gameState === 'ready') {
            this.gameState = 'waiting';
        }

        return removed;
    }

    /**
     * Check if a user is the host
     * @param {string} userId - Discord user ID
     * @returns {boolean}
     */
    isHost(userId) {
        return this.hostId === userId;
    }

    /**
     * Check if a user has joined the game
     * @param {string} userId - Discord user ID
     * @returns {boolean}
     */
    hasPlayer(userId) {
        return this.players.has(userId);
    }

    /**
     * Get current player count
     * @returns {number}
     */
    getPlayerCount() {
        return this.players.size;
    }

    /**
     * Check if game is ready to start
     * @returns {boolean}
     */
    isReady() {
        return this.gameState === 'ready';
    }

    /**
     * Start the game
     */
    startGame() {
        if (this.gameState === 'ready') {
            this.gameState = 'started';
            return true;
        }
        return false;
    }

    /**
     * Assign roles to all players
     * @param {Object} assignments - Role assignments from roles.js
     */
    assignRoles(assignments) {
        this.roleAssignments = assignments;
        this.gameState = 'roles_assigned';

        // Initialize alive players
        this.alivePlayers = new Set(this.players);
    }

    /**
     * Get role assignment for a specific player
     * @param {string} userId - Discord user ID
     * @returns {Object|null} Role assignment or null if not found
     */
    getPlayerRole(userId) {
        return this.roleAssignments[userId] || null;
    }

    /**
     * Get all role assignments
     * @returns {Object} All role assignments
     */
    getAllRoleAssignments() {
        return this.roleAssignments;
    }

    /**
     * Check if roles have been assigned
     * @returns {boolean}
     */
    hasRolesAssigned() {
        return this.gameState === 'roles_assigned';
    }

    /**
     * Get array of player IDs
     * @returns {Array<string>}
     */
    getPlayerIds() {
        return Array.from(this.players);
    }

    /**
     * Get array of player usernames
     * @returns {Array<string>}
     */
    getPlayerUsernames() {
        return Array.from(this.playerUsernames.values());
    }

    /**
     * Get username for a specific player
     * @param {string} userId - Discord user ID
     * @returns {string|null} Username or null if not found
     */
    getPlayerUsername(userId) {
        return this.playerUsernames.get(userId) || null;
    }

    /**
     * Start the day phase
     */
    startDayPhase() {
        this.gameState = 'day_phase';
        this.votes.clear();
    }

    /**
     * Cast a vote for a player
     * @param {string} voterId - ID of the player voting
     * @param {string} targetId - ID of the player being voted for
     * @returns {boolean} - True if vote was cast successfully
     */
    castVote(voterId, targetId) {
        if (!this.alivePlayers.has(voterId) || !this.alivePlayers.has(targetId)) {
            return false; // Can't vote if dead or vote for dead player
        }

        if (voterId === targetId) {
            return false; // Can't vote for yourself
        }

        this.votes.set(voterId, targetId);
        return true;
    }

    /**
     * Remove a vote
     * @param {string} voterId - ID of the player removing their vote
     * @returns {boolean} - True if vote was removed
     */
    removeVote(voterId) {
        return this.votes.delete(voterId);
    }

    /**
     * Get vote counts for all players
     * @returns {Map<string, number>} - Map of playerId -> vote count
     */
    getVoteCounts() {
        const voteCounts = new Map();

        // Initialize all alive players with 0 votes
        for (const playerId of this.alivePlayers) {
            voteCounts.set(playerId, 0);
        }

        // Count votes (Mayor gets double votes if revealed)
        for (const [voterId, targetId] of this.votes) {
            const currentCount = voteCounts.get(targetId) || 0;
            const voterRole = this.getPlayerRole(voterId);

            // Mayor gets double votes if revealed, otherwise normal vote
            const voteWeight = (voterRole?.role === 'MAYOR' && this.mayorRevealed) ? 2 : 1;
            voteCounts.set(targetId, currentCount + voteWeight);
        }

        return voteCounts;
    }

    /**
     * Get who voted for whom
     * @returns {Map<string, string>} - Map of voterId -> targetId
     */
    getVotes() {
        return new Map(this.votes);
    }

    /**
     * Reveal the Mayor
     * @param {string} mayorId - ID of the Mayor
     * @returns {boolean} - True if Mayor was revealed successfully
     */
    revealMayor(mayorId) {
        const playerRole = this.getPlayerRole(mayorId);
        if (playerRole?.role === 'MAYOR' && !this.mayorRevealed) {
            this.mayorRevealed = true;
            return true;
        }
        return false;
    }

    /**
     * Check if Mayor is revealed
     * @returns {boolean}
     */
    isMayorRevealed() {
        return this.mayorRevealed;
    }

    /**
     * Get the Mayor's ID
     * @returns {string|null} - Mayor's user ID or null if not found
     */
    getMayorId() {
        for (const [playerId, assignment] of Object.entries(this.roleAssignments)) {
            if (assignment.role === 'MAYOR') {
                return playerId;
            }
        }
        return null;
    }

    /**
     * Get alive players
     * @returns {Set<string>} - Set of alive player IDs
     */
    getAlivePlayers() {
        return new Set(this.alivePlayers);
    }

    /**
     * Get alive player usernames
     * @returns {Array<string>} - Array of alive player usernames
     */
    getAlivePlayerUsernames() {
        return Array.from(this.alivePlayers).map(id => this.getPlayerUsername(id));
    }

    /**
     * Process day phase elimination based on votes
     * @returns {Object} - Result object with elimination info and win conditions
     */
    processElimination() {
        const voteCounts = this.getVoteCounts();

        // Find player(s) with most votes
        let maxVotes = 0;
        let playersWithMaxVotes = [];

        for (const [playerId, voteCount] of voteCounts) {
            if (voteCount > maxVotes) {
                maxVotes = voteCount;
                playersWithMaxVotes = [playerId];
            } else if (voteCount === maxVotes && voteCount > 0) {
                playersWithMaxVotes.push(playerId);
            }
        }

        // Handle tie or no votes
        if (playersWithMaxVotes.length !== 1 || maxVotes === 0) {
            return {
                eliminated: null,
                reason: playersWithMaxVotes.length > 1 ? 'tie' : 'no_votes',
                tiedPlayers: playersWithMaxVotes,
                gameEnded: false,
                winner: null
            };
        }

        // Eliminate the player with most votes
        const eliminatedId = playersWithMaxVotes[0];
        const eliminatedRole = this.getPlayerRole(eliminatedId);
        const eliminatedUsername = this.getPlayerUsername(eliminatedId);

        this.alivePlayers.delete(eliminatedId);
        this.eliminatedPlayer = {
            id: eliminatedId,
            username: eliminatedUsername,
            role: eliminatedRole.role,
            roleInfo: eliminatedRole.roleInfo
        };

        // Check win conditions
        const winResult = this.checkWinConditions(eliminatedId, eliminatedRole);

        if (winResult.gameEnded) {
            this.gameState = 'game_ended';
            this.gameWinner = winResult;
        }

        return {
            eliminated: {
                id: eliminatedId,
                username: eliminatedUsername,
                role: eliminatedRole.role,
                roleInfo: eliminatedRole.roleInfo
            },
            reason: 'eliminated',
            gameEnded: winResult.gameEnded,
            winner: winResult.gameEnded ? winResult : null
        };
    }

    /**
     * Check win conditions after day phase elimination
     * @param {string} eliminatedId - ID of eliminated player
     * @param {Object} eliminatedRole - Role info of eliminated player
     * @returns {Object} - Win condition result
     */
    checkWinConditions(eliminatedId, eliminatedRole) {
        // Check if Jester was eliminated (Jester wins immediately)
        if (eliminatedRole.role === 'JESTER') {
            return {
                gameEnded: true,
                winners: [{
                    type: 'Jester',
                    playerId: eliminatedId,
                    username: this.getPlayerUsername(eliminatedId),
                    reason: 'Jester was lynched'
                }],
                winType: 'jester_lynched'
            };
        }

        // Check if Executioner's target was eliminated (Executioner wins immediately)
        for (const [playerId, assignment] of Object.entries(this.roleAssignments)) {
            if (assignment.role === 'EXECUTIONER' && assignment.target === eliminatedId) {
                // Executioner wins, check if Survivor also wins (if alive)
                const winners = [{
                    type: 'Executioner',
                    playerId: playerId,
                    username: this.getPlayerUsername(playerId),
                    reason: 'Executioner got their target lynched'
                }];

                // Add Survivor as co-winner if alive
                const survivorId = this.getSurvivorId();
                if (survivorId && this.alivePlayers.has(survivorId)) {
                    winners.push({
                        type: 'Survivor',
                        playerId: survivorId,
                        username: this.getPlayerUsername(survivorId),
                        reason: 'Survivor was alive at game end'
                    });
                }

                return {
                    gameEnded: true,
                    winners: winners,
                    winType: 'executioner_target_lynched'
                };
            }
        }

        // Check if Mafia was eliminated (Mayor wins)
        if (eliminatedRole.role === 'MAFIA') {
            const mayorId = this.getMayorId();
            if (mayorId && this.alivePlayers.has(mayorId)) {
                // Mayor wins, check if Survivor also wins (if alive)
                const winners = [{
                    type: 'Mayor',
                    playerId: mayorId,
                    username: this.getPlayerUsername(mayorId),
                    reason: 'Mayor eliminated the Mafia'
                }];

                // Add Survivor as co-winner if alive
                const survivorId = this.getSurvivorId();
                if (survivorId && this.alivePlayers.has(survivorId)) {
                    winners.push({
                        type: 'Survivor',
                        playerId: survivorId,
                        username: this.getPlayerUsername(survivorId),
                        reason: 'Survivor was alive at game end'
                    });
                }

                return {
                    gameEnded: true,
                    winners: winners,
                    winType: 'mayor_eliminated_mafia'
                };
            }
        }

        // Game continues
        return {
            gameEnded: false,
            winners: [],
            winType: null
        };
    }

    /**
     * Check win conditions after night phase elimination
     * @param {string|null} eliminatedId - ID of eliminated player (null if no kill)
     * @returns {Object} - Win condition result
     */
    checkNightWinConditions(eliminatedId) {
        if (!eliminatedId) {
            return { gameEnded: false, winners: [], winType: null };
        }

        const eliminatedRole = this.getPlayerRole(eliminatedId);

        // Check if Mayor was killed (Mafia wins)
        if (eliminatedRole.role === 'MAYOR') {
            const mafiaId = this.getMafiaId();
            if (mafiaId) {
                // Mafia wins, check if Survivor also wins (if alive)
                const winners = [{
                    type: 'Mafia',
                    playerId: mafiaId,
                    username: this.getPlayerUsername(mafiaId),
                    reason: 'Mafia killed the Mayor'
                }];

                // Add Survivor as co-winner if alive
                const survivorId = this.getSurvivorId();
                if (survivorId && this.alivePlayers.has(survivorId)) {
                    winners.push({
                        type: 'Survivor',
                        playerId: survivorId,
                        username: this.getPlayerUsername(survivorId),
                        reason: 'Survivor was alive at game end'
                    });
                }

                return {
                    gameEnded: true,
                    winners: winners,
                    winType: 'mafia_killed_mayor'
                };
            }
        }

        // Check if game should end with Survivor win
        return this.checkSurvivorWin();
    }

    /**
     * Check if Survivor should win (alive at end, unless Jester wins)
     * Note: Survivor only wins alongside other roles, not as standalone winner
     * @returns {Object} - Win condition result
     */
    checkSurvivorWin() {
        // Survivor doesn't win standalone - only wins with other roles at game end
        // This method is kept for potential future standalone Survivor win conditions
        return { gameEnded: false, winners: [], winType: null };
    }

    /**
     * Check if game is in day phase
     * @returns {boolean}
     */
    isDayPhase() {
        return this.gameState === 'day_phase';
    }

    /**
     * Check if game has ended
     * @returns {boolean}
     */
    hasGameEnded() {
        return this.gameState === 'game_ended';
    }

    /**
     * Get game winner information
     * @returns {Object|null} - Winner info or null if game hasn't ended
     */
    getGameWinner() {
        return this.gameWinner;
    }

    /**
     * Start the night phase
     */
    startNightPhase() {
        this.gameState = 'night_phase';
        this.nightKillTarget = null;
    }

    /**
     * Check if game is in night phase
     * @returns {boolean}
     */
    isNightPhase() {
        return this.gameState === 'night_phase';
    }

    /**
     * Get the Mafia player ID
     * @returns {string|null} - Mafia's user ID or null if not found
     */
    getMafiaId() {
        for (const [playerId, assignment] of Object.entries(this.roleAssignments)) {
            if (assignment.role === 'MAFIA' && this.alivePlayers.has(playerId)) {
                return playerId;
            }
        }
        return null;
    }

    /**
     * Set the night kill target (Mafia action)
     * @param {string} targetId - ID of the player to kill
     * @returns {boolean} - True if target was set successfully
     */
    setNightKillTarget(targetId) {
        if (!this.alivePlayers.has(targetId)) {
            return false; // Can't kill dead players
        }

        // Check if target is Executioner (cannot be killed at night)
        const targetRole = this.getPlayerRole(targetId);
        if (targetRole?.role === 'EXECUTIONER') {
            return false; // Executioner cannot be killed at night
        }

        this.nightKillTarget = targetId;
        return true;
    }

    /**
     * Get the current night kill target
     * @returns {string|null} - Target ID or null if no target set
     */
    getNightKillTarget() {
        return this.nightKillTarget;
    }

    /**
     * Process night phase elimination and role changes
     * @returns {Object} - Result object with elimination info and role changes
     */
    processNightElimination() {
        if (!this.nightKillTarget) {
            return {
                eliminated: null,
                reason: 'no_kill',
                roleChanges: [],
                gameEnded: false
            };
        }

        const eliminatedId = this.nightKillTarget;
        const eliminatedRole = this.getPlayerRole(eliminatedId);
        const eliminatedUsername = this.getPlayerUsername(eliminatedId);

        // Remove player from alive players
        this.alivePlayers.delete(eliminatedId);

        // Check if eliminated player was an Executioner's target
        const roleChanges = [];
        for (const [playerId, assignment] of Object.entries(this.roleAssignments)) {
            if (assignment.role === 'EXECUTIONER' && assignment.target === eliminatedId) {
                // Convert Executioner to Jester
                this.convertExecutionerToJester(playerId);
                roleChanges.push({
                    playerId: playerId,
                    username: this.getPlayerUsername(playerId),
                    oldRole: 'EXECUTIONER',
                    newRole: 'JESTER',
                    reason: 'Target was killed at night'
                });
            }
        }

        // Check win conditions after night elimination
        const winResult = this.checkNightWinConditions(eliminatedId);

        if (winResult.gameEnded) {
            this.gameState = 'game_ended';
            this.gameWinner = winResult;
        }

        return {
            eliminated: {
                id: eliminatedId,
                username: eliminatedUsername,
                role: eliminatedRole.role,
                roleInfo: eliminatedRole.roleInfo
            },
            reason: 'killed_by_mafia',
            roleChanges: roleChanges,
            gameEnded: winResult.gameEnded,
            winner: winResult.gameEnded ? winResult : null
        };
    }

    /**
     * Convert an Executioner to Jester
     * @param {string} executionerId - ID of the Executioner to convert
     */
    convertExecutionerToJester(executionerId) {
        if (this.roleAssignments[executionerId]?.role === 'EXECUTIONER') {
            const { getRole } = require('./roles');
            this.roleAssignments[executionerId] = {
                role: 'JESTER',
                roleInfo: getRole('JESTER'),
                target: null, // Remove target
                targetRole: null
            };
        }
    }

    /**
     * Get current day number
     * @returns {number}
     */
    getDayNumber() {
        return this.dayNumber;
    }

    /**
     * Increment day number (called when starting new day)
     */
    incrementDay() {
        this.dayNumber++;
    }

    /**
     * Get the Survivor's ID
     * @returns {string|null} - Survivor's user ID or null if not found
     */
    getSurvivorId() {
        for (const [playerId, assignment] of Object.entries(this.roleAssignments)) {
            if (assignment.role === 'SURVIVOR') {
                return playerId;
            }
        }
        return null;
    }

    /**
     * Check if there's an active Executioner (alive with a living target)
     * @returns {boolean}
     */
    hasActiveExecutioner() {
        for (const [playerId, assignment] of Object.entries(this.roleAssignments)) {
            if (assignment.role === 'EXECUTIONER' &&
                this.alivePlayers.has(playerId) &&
                assignment.target &&
                this.alivePlayers.has(assignment.target)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get all players and their roles for game end display
     * @returns {Array<Object>} - Array of player info with roles
     */
    getAllPlayersWithRoles() {
        const playersWithRoles = [];

        for (const [playerId, assignment] of Object.entries(this.roleAssignments)) {
            playersWithRoles.push({
                id: playerId,
                username: this.getPlayerUsername(playerId),
                role: assignment.role,
                roleInfo: assignment.roleInfo,
                isAlive: this.alivePlayers.has(playerId),
                target: assignment.target ? {
                    id: assignment.target,
                    username: this.getPlayerUsername(assignment.target)
                } : null
            });
        }

        return playersWithRoles;
    }

    /**
     * Reset the game state for a new game
     */
    resetGameState() {
        this.gameState = 'waiting';
        this.votes.clear();
        this.mayorRevealed = false;
        this.alivePlayers.clear();
        this.gameWinner = null;
        this.eliminatedPlayer = null;
        this.nightKillTarget = null;
        this.dayNumber = 1;
        this.roleAssignments = {};
        this.players.clear();
        this.playerUsernames.clear();
    }
}

module.exports = GameSession;
