/**
 * Mafia game role definitions with win conditions and powers
 */

const ROLES = {
    MAYOR: {
        name: 'Mayor',
        emoji: '🏛️',
        alignment: 'Town',
        winCondition: 'Eliminate all Mafia members and harmful neutrals.',
        powers: [
            'Your vote counts as 2 votes during lynching.',
            'You can reveal yourself as Mayor at any time to gain voting power.',
            'If you reveal, you become a target for Mafia.'
        ],
        description: 'You are the Mayor, a powerful Town member with double voting power.'
    },
    
    MAFIA: {
        name: 'Mafia',
        emoji: '🔫',
        alignment: 'Mafia',
        winCondition: 'Eliminate all Town members and achieve numerical superiority.',
        powers: [
            'You can kill one player each night.',
            'You know who other Mafia members are (if any).',
            'You appear suspicious to investigative roles.'
        ],
        description: 'You are a member of the Mafia. Eliminate the Town to win.'
    },
    
    JESTER: {
        name: 'Jester',
        emoji: '🃏',
        alignment: 'Neutral Evil',
        winCondition: 'Get yourself lynched (voted out) during the day phase.',
        powers: [
            'If you are lynched, you win immediately.',
            'If you are killed at night, you do not win.',
            'You want to appear suspicious to get voted out.'
        ],
        description: 'You are the Jester. Your goal is to trick the Town into lynching you.'
    },
    
    SURVIVOR: {
        name: 'Survivor',
        emoji: '🛡️',
        alignment: 'Neutral Benign',
        winCondition: 'Survive until the end of the game.',
        powers: [
            'You have 4 vests that protect you from attacks.',
            'You can use one vest per night.',
            'You win with any faction as long as you survive.'
        ],
        description: 'You are a Survivor. Stay alive until the end to win.'
    },
    
    EXECUTIONER: {
        name: 'Executioner',
        emoji: '⚔️',
        alignment: 'Neutral Evil',
        winCondition: 'Get your target lynched (voted out) during the day phase.',
        powers: [
            'You have a specific target that you must get lynched.',
            'If your target dies at night, you become a Jester.',
            'You appear innocent to investigative roles.'
        ],
        description: 'You are the Executioner. Get your target lynched to win.',
        hasTarget: true
    }
};

/**
 * Get all available roles for assignment
 * @returns {Array<string>} Array of role keys
 */
function getAllRoles() {
    return Object.keys(ROLES);
}

/**
 * Get role information by key
 * @param {string} roleKey - The role key (e.g., 'MAYOR')
 * @returns {Object} Role information object
 */
function getRole(roleKey) {
    return ROLES[roleKey];
}

/**
 * Get possible targets for Executioner
 * @returns {Array<string>} Array of role keys that can be Executioner targets
 */
function getExecutionerTargets() {
    return ['JESTER', 'MAFIA', 'SURVIVOR'];
}

/**
 * Randomly assign roles to players
 * @param {Array<string>} playerIds - Array of Discord user IDs
 * @returns {Object} Object mapping player IDs to role assignments
 */
function assignRoles(playerIds) {
    if (playerIds.length !== 5) {
        throw new Error('Exactly 5 players required for role assignment');
    }

    // Get all available roles
    const availableRoles = getAllRoles();
    
    // Shuffle the roles array
    const shuffledRoles = [...availableRoles].sort(() => Math.random() - 0.5);
    
    // Create role assignments
    const assignments = {};
    const executionerTargets = getExecutionerTargets();
    
    for (let i = 0; i < playerIds.length; i++) {
        const playerId = playerIds[i];
        const roleKey = shuffledRoles[i];
        
        assignments[playerId] = {
            role: roleKey,
            roleInfo: getRole(roleKey)
        };
        
        // If this player is the Executioner, assign them a target
        if (roleKey === 'EXECUTIONER') {
            // Find players with roles that can be targets
            const possibleTargets = playerIds.filter((id, index) => {
                const targetRole = shuffledRoles[index];
                return executionerTargets.includes(targetRole) && id !== playerId;
            });
            
            if (possibleTargets.length > 0) {
                // Randomly select a target
                const targetId = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
                assignments[playerId].target = targetId;
                assignments[playerId].targetRole = shuffledRoles[playerIds.indexOf(targetId)];
            }
        }
    }
    
    return assignments;
}

/**
 * Create a formatted role message for a player
 * @param {Object} assignment - Player's role assignment
 * @param {string} targetUsername - Username of target (if applicable)
 * @returns {Object} Formatted embed for the role message
 */
function createRoleMessage(assignment, targetUsername = null) {
    const { role, roleInfo, target, targetRole } = assignment;
    
    let description = `${roleInfo.emoji} **${roleInfo.description}**\n\n`;
    
    // Add win condition
    description += `**🎯 Win Condition:**\n${roleInfo.winCondition}\n\n`;
    
    // Add powers
    description += `**⚡ Powers/Effects:**\n`;
    roleInfo.powers.forEach(power => {
        description += `• ${power}\n`;
    });
    
    // Add target information for Executioner
    if (role === 'EXECUTIONER' && target && targetUsername) {
        const targetRoleInfo = getRole(targetRole);
        description += `\n**🎯 Your Target:**\n`;
        description += `${targetRoleInfo.emoji} **${targetUsername}** (${targetRoleInfo.name})\n`;
        description += `You must get them lynched to win!`;
    }
    
    return {
        title: `${roleInfo.emoji} You are the ${roleInfo.name}!`,
        description: description,
        color: getColorForAlignment(roleInfo.alignment),
        footer: { text: `Alignment: ${roleInfo.alignment}` }
    };
}

/**
 * Get color for role alignment
 * @param {string} alignment - Role alignment
 * @returns {number} Hex color code
 */
function getColorForAlignment(alignment) {
    switch (alignment) {
        case 'Town': return 0x00ff00; // Green
        case 'Mafia': return 0xff0000; // Red
        case 'Neutral Evil': return 0xff8800; // Orange
        case 'Neutral Benign': return 0xffff00; // Yellow
        default: return 0x808080; // Gray
    }
}

module.exports = {
    ROLES,
    getAllRoles,
    getRole,
    getExecutionerTargets,
    assignRoles,
    createRoleMessage
};
