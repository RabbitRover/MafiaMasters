/**
 * Game rules and role information
 * Edit this file to customize rules and role descriptions
 */

const GAME_RULES = {
    title: "🎭 Mafia Game Rules",
    description: "Welcome to Mafia! Here's how to play:",
    sections: [
        {
            name: "🎯 Objective",
            value: "Each role has different win conditions. Work towards your goal while staying alive!"
        },
        {
            name: "🌅 Day Phase",
            value: "• All players vote to eliminate someone\n• Majority vote eliminates a player\n• Mayor's votes count as 4 when revealed\n• Use the skip button if you don't want to eliminate anyone"
        },
        {
            name: "🌙 Night Phase",
            value: "• Mafia chooses someone to eliminate\n• Executioner cannot be killed at night\n• Role conversions may occur\n• Results announced at dawn"
        },
        {
            name: "🏆 Win Conditions",
            value: "• **Jester**: Get voted out during day phase (wins alone)\n• **Executioner**: Get your target role voted out (game continues)\n• **Mayor**: Eliminate the Mafia during day phase\n• **Mafia**: Kill the Mayor at night\n• **Survivor**: Be alive when other roles win"
        },
        {
            name: "⚡ Special Rules",
            value: "• Executioner is immune to night kills\n• If Executioner's target dies at night, they become Jester\n• Survivor wins alongside other roles (except Jester)\n• Games continue until a final win condition is met"
        }
    ],
    color: 0x9932cc
};

const ROLE_INFO = {
    MAYOR: {
        title: "🏛️ Mayor",
        description: "The leader of the town with enhanced voting power.",
        details: [
            {
                name: "🎯 Win Condition",
                value: "Eliminate the Mafia during the day phase"
            },
            {
                name: "⚡ Special Abilities",
                value: "• Can reveal yourself to gain 4 votes instead of 1\n• Revealing makes you a target for Mafia\n• Strategic timing of reveal is crucial"
            },
            {
                name: "🎮 Strategy Tips",
                value: "• Don't reveal too early - you become a target\n• Use your reveal when votes are close\n• Try to identify and eliminate the Mafia"
            }
        ],
        color: 0x4169e1
    },
    MAFIA: {
        title: "🔫 Mafia",
        description: "The villain who eliminates players at night.",
        details: [
            {
                name: "🎯 Win Condition",
                value: "Kill the Mayor during the night phase"
            },
            {
                name: "⚡ Special Abilities",
                value: "• Choose someone to eliminate each night\n• Cannot kill the Executioner (they're protected)\n• Can skip your kill if desired"
            },
            {
                name: "🎮 Strategy Tips",
                value: "• Stay hidden during day phase\n• Target the Mayor to win instantly\n• Be careful not to seem too suspicious"
            }
        ],
        color: 0x8b0000
    },
    JESTER: {
        title: "🃏 Jester",
        description: "The trickster who wants to be eliminated.",
        details: [
            {
                name: "🎯 Win Condition",
                value: "Get voted out during the day phase (wins alone)"
            },
            {
                name: "⚡ Special Abilities",
                value: "• Highest win priority - game ends when you're lynched\n• Other players don't win with you\n• Can be converted from Executioner"
            },
            {
                name: "🎮 Strategy Tips",
                value: "• Act suspicious but not too obvious\n• Make yourself a target for voting\n• Don't be so obvious that people avoid voting you"
            }
        ],
        color: 0x800080
    },
    SURVIVOR: {
        title: "🛡️ Survivor",
        description: "The neutral player who wins by staying alive.",
        details: [
            {
                name: "🎯 Win Condition",
                value: "Be alive when any other role wins (except Jester)"
            },
            {
                name: "⚡ Special Abilities",
                value: "• Co-winner with Mayor, Mafia, or Executioner\n• Loses if Jester is voted out\n• No special powers, just survival"
            },
            {
                name: "🎮 Strategy Tips",
                value: "• Stay neutral and avoid suspicion\n• Help whichever side seems to be winning\n• Don't vote for the Jester if you can help it"
            }
        ],
        color: 0x228b22
    },
    EXECUTIONER: {
        title: "⚔️ Executioner",
        description: "The assassin with a specific target role to eliminate.",
        details: [
            {
                name: "🎯 Win Condition",
                value: "Get your target role voted out during day phase (game continues)"
            },
            {
                name: "⚡ Special Abilities",
                value: "• Immune to night kills\n• Has a specific target role (Jester/Mafia/Survivor)\n• Becomes Jester if target role dies at night"
            },
            {
                name: "🎮 Strategy Tips",
                value: "• Push for your target role to be voted out\n• Use your night immunity as a safe claim\n• If your target dies at night, you become Jester"
            }
        ],
        color: 0x696969
    }
};

module.exports = {
    GAME_RULES,
    ROLE_INFO
};
