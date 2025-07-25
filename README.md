# Mafia Masters Discord Bot

A Discord bot for playing Mafia games in your server channels.

## Features

- `/start` - Start a new Mafia game session
- Interactive join/start buttons
- Host-controlled game sessions
- Player management (5 players required)

## Setup

### Prerequisites
- Node.js 16.0.0 or higher
- A Discord application and bot token

### Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
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
2. Players click the "Join" button to join the game
3. Once 5 players have joined, the host can click "Start" to begin
4. The bot will handle player management and prevent duplicates

## Current Status

✅ Basic game lobby functionality
✅ Player join/leave system
✅ Host controls
🚧 Role assignment (coming next)
🚧 Game mechanics (coming next)
🚧 Rules and role information commands

## Contributing

This is the first stage of development. Future features will include:
- Role assignment and game mechanics
- `/rules` command to view game rules
- `/roles` command to view available roles
- Full game flow implementation
