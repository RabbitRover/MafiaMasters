class GameSession {
    constructor(hostId, channelId) {
        this.hostId = hostId;
        this.channelId = channelId;
        this.players = new Set(); // Use Set to prevent duplicate players
        this.playerUsernames = new Map(); // Store player usernames: playerId -> username
        this.maxPlayers = 5;
        this.gameState = 'waiting'; // waiting, ready, started, roles_assigned
        this.createdAt = new Date();
        this.roleAssignments = {}; // Store role assignments: { playerId: { role, roleInfo, target?, targetRole? } }
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
}

module.exports = GameSession;
