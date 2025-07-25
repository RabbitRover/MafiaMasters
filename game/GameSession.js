class GameSession {
    constructor(hostId, channelId) {
        this.hostId = hostId;
        this.channelId = channelId;
        this.players = new Set(); // Use Set to prevent duplicate players
        this.maxPlayers = 5;
        this.gameState = 'waiting'; // waiting, ready, started
        this.createdAt = new Date();
    }

    /**
     * Add a player to the game session
     * @param {string} userId - Discord user ID
     * @returns {boolean} - True if player was added, false if already in game
     */
    addPlayer(userId) {
        if (this.players.has(userId)) {
            return false; // Player already joined
        }
        
        if (this.players.size >= this.maxPlayers) {
            return false; // Game is full
        }

        this.players.add(userId);
        
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
     * Get array of player IDs
     * @returns {Array<string>}
     */
    getPlayerIds() {
        return Array.from(this.players);
    }
}

module.exports = GameSession;
