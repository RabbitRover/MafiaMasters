class GameSession {
    constructor(hostId, channelId) {
        this.hostId = hostId;
        this.channelId = channelId;
        this.players = new Set(); // Use Set to prevent duplicate players
        this.playerUsernames = new Map(); // Store player usernames: playerId -> username
        this.maxPlayers = 5;
        this.gameState = 'waiting'; // waiting, ready, started, roles_assigned, day_phase, game_ended
        this.createdAt = new Date();
        this.roleAssignments = {}; // Store role assignments: { playerId: { role, roleInfo, target?, targetRole? } }

        // Day phase voting system
        this.votes = new Map(); // voterId -> targetId
        this.mayorRevealed = false;
        this.alivePlayers = new Set(); // Track alive players
        this.gameWinner = null; // Store game winner
        this.eliminatedPlayer = null; // Store eliminated player info
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
            this.gameWinner = winResult.winner;
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
            winner: winResult.winner,
            winReason: winResult.reason
        };
    }

    /**
     * Check win conditions after elimination
     * @param {string} eliminatedId - ID of eliminated player
     * @param {Object} eliminatedRole - Role info of eliminated player
     * @returns {Object} - Win condition result
     */
    checkWinConditions(eliminatedId, eliminatedRole) {
        // Check if Jester was eliminated (Jester wins)
        if (eliminatedRole.role === 'JESTER') {
            return {
                gameEnded: true,
                winner: 'Jester',
                winnerId: eliminatedId,
                reason: 'Jester was lynched'
            };
        }

        // Check if Executioner's target was eliminated (Executioner wins)
        for (const [playerId, assignment] of Object.entries(this.roleAssignments)) {
            if (assignment.role === 'EXECUTIONER' && assignment.target === eliminatedId) {
                return {
                    gameEnded: true,
                    winner: 'Executioner',
                    winnerId: playerId,
                    reason: 'Executioner got their target lynched'
                };
            }
        }

        // Game continues
        return {
            gameEnded: false,
            winner: null,
            reason: null
        };
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
}

module.exports = GameSession;
