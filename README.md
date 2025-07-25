# Mafia Masters Discord Bot

A Discord bot for playing Mafia games in your server channels.

## Features

- `/start` - Start a new Mafia game session
- Interactive join/leave/start buttons
- Host-controlled game sessions
- Player management (5 players required)
- **Player list display** in lobby
- **Role assignment system** with 5 unique roles
- **Private role messages** sent via ephemeral messages
- **Day phase voting system** with elimination mechanics
- **Mayor reveal functionality** with double voting power
- **Night phase mechanics** with Mafia kills
- **Executioner protection** (cannot be killed at night)
- **Role conversion system** (Executioner → Jester)
- **Comprehensive win conditions** for all roles
- **Game end announcements** with role reveals

## Setup

### Prerequisites
- **Node.js 18.0.0 or higher** (recommended: 18.20.4 or 20.x)
- npm or yarn package manager
- A Discord application and bot token

### Node.js Version Issues
If you encounter `ReadableStream is not defined` errors:
1. **Update Node.js**: Use Node.js 18.20.4+ or 20.x
2. **Use nvm** (recommended):
   ```bash
   nvm install 18.20.4
   nvm use 18.20.4
   ```
3. **Check version**: `node --version` should show 18.x or higher

### Installation

1. **Clone this repository**
2. **Ensure correct Node.js version** (if using nvm):
   ```bash
   nvm use
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Test the installation**:
   ```bash
   npm test
   ```

3. Create a Discord application:
   - Go to https://discord.com/developers/applications
   - Click "New Application"
   - Go to the "Bot" section
   - Create a bot and copy the token
   - Copy the Application ID from the "General Information" section

4. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your bot token and client ID:
   ```
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_bot_client_id_here
   ```

5. Invite the bot to your server:
   - Go to the "OAuth2" > "URL Generator" section
   - Select "bot" and "applications.commands" scopes
   - Select necessary permissions (Send Messages, Use Slash Commands, etc.)
   - Use the generated URL to invite the bot

### Running the Bot

Development mode (with auto-restart):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Usage

1. Use `/start` in any channel to begin a new Mafia game
2. Players click the "Join" button to join the game (or "Leave" to leave)
3. The lobby shows all joined players in real-time
4. Once 5 players have joined, the host can click "Start" to begin
5. The bot assigns roles and provides a "Get My Role" button
6. Players click the button to receive their role privately via ephemeral message
7. **Day Phase begins** with voting buttons for each player
8. Players vote to eliminate someone (Mayor can reveal for double votes)
9. Host can end the day phase, or it auto-ends after 10 minutes
10. Elimination results are announced with win condition checks
11. **Night Phase begins** - Mafia receives kill options via ephemeral message
12. Mafia selects target (Executioner cannot be killed)
13. Night results announced, role changes processed
14. **Next day begins** - cycle continues until win condition met

## Available Roles & Win Conditions

### Town Roles
- **🏛️ Mayor** - Double voting power, can reveal for extra influence
  - *Win Condition*: **Wins if Mafia is voted out during day phase**
  - *Special*: Votes count as 2 when revealed

### Mafia Roles
- **🔫 Mafia** - Can kill players at night
  - *Win Condition*: **Wins if Mayor is killed at night**
  - *Special*: Cannot kill Executioner at night

### Neutral Roles
- **🃏 Jester** - Wants to be lynched to win
  - *Win Condition*: **Wins immediately if voted out during day phase**
  - *Priority*: Highest win priority (game ends instantly)
- **🛡️ Survivor** - Has protective vests, wins by surviving
  - *Win Condition*: **Wins alongside any other role if alive at game end**
  - *Exception*: Loses if Jester is voted out (Jester wins alone)
  - *Special*: Co-winner with Mayor/Mafia/Executioner victories
- **⚔️ Executioner** - Must get their assigned target lynched
  - *Win Condition*: **Wins immediately if target is voted out during day phase**
  - *Special*: Has a random target (Jester, Mafia, or Survivor)
  - *Protection*: Cannot be killed at night
  - *Role Change*: Becomes Jester if target dies at night

## Night Phase Mechanics

### Mafia Actions
- **🔪 Kill Selection**: Mafia receives ephemeral message with kill options
- **🛡️ Executioner Protection**: Executioner cannot be selected as target
- **⏭️ Skip Option**: Mafia can choose not to kill anyone
- **⏰ Time Limit**: 2 minutes to make decision

### Role Conversions
- **Executioner → Jester**: If Executioner's target is killed at night
- **Private Notification**: Converted player receives new role information
- **Immediate Effect**: Role change takes effect immediately

### Night Results
- **💀 Death Announcement**: Eliminated player's role is revealed
- **🔄 Role Changes**: Any conversions are announced publicly
- **🌅 Dawn Transition**: Automatic progression to next day phase

## Game End Mechanics

### Win Condition Priority
1. **🃏 Jester Win**: Immediate game end if Jester is lynched (wins alone)
2. **⚔️ Executioner Win**: Immediate game end if Executioner's target is lynched
3. **🏛️ Mayor Win**: Game ends if Mafia is voted out
4. **🔫 Mafia Win**: Game ends if Mayor is killed at night
5. **🛡️ Survivor Co-Win**: Wins alongside other roles if alive at game end

### Game End Announcement
- **🏆 Winner Declaration**: Clear announcement of who won and why
- **📋 Role Reveals**: All players' roles revealed publicly
- **📊 Game Statistics**: Days survived, elimination count, etc.
- **🧹 Session Cleanup**: Game state reset for potential new game

## Current Status

✅ Basic game lobby functionality
✅ Player join/leave system with buttons
✅ **Real-time player list** in lobby
✅ Host controls (host cannot leave)
✅ **Role assignment system**
✅ **5 unique roles**: Mayor, Mafia, Jester, Survivor, Executioner
✅ **Private role messages** via ephemeral messages
✅ **Executioner targeting system**
✅ **Interactive role distribution** with "Get My Role" button
✅ **Day phase voting system** with live vote counts
✅ **Mayor reveal mechanics** (double voting power)
✅ **Elimination processing** with tie handling
✅ **Win condition checking** (Jester, Executioner wins)
✅ **Host controls** for day phase management
✅ **Night phase mechanics** with Mafia kill system
✅ **Executioner protection** (immune to night kills)
✅ **Role conversion system** (Executioner → Jester when target dies)
✅ **Day/Night cycle** with automatic progression
✅ **Complete game loop** from start to finish
✅ **Comprehensive win conditions** for all 5 roles
✅ **Game end announcements** with role reveals and statistics
✅ **Session management** with proper cleanup
🚧 Rules and role information commands
🚧 Additional game modes and features

## Contributing

This is the first stage of development. Future features will include:
- Role assignment and game mechanics
- `/rules` command to view game rules
- `/roles` command to view available roles
- Full game flow implementation
