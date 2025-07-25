const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
require('dotenv').config();

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Create a collection to store commands
client.commands = new Collection();

// Import commands
const startCommand = require('./commands/start');
client.commands.set(startCommand.data.name, startCommand);

// When the client is ready, run this code
client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);
    
    // Register slash commands
    await registerSlashCommands();
});

// Handle slash command interactions
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error('Error executing command:', error);
            
            const errorMessage = {
                content: '❌ There was an error while executing this command!',
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    } else if (interaction.isButton()) {
        // Handle button interactions
        try {
            // Route button interactions to the start command handler
            if (interaction.customId === 'join_game' || interaction.customId === 'start_game') {
                await startCommand.handleButtonInteraction(interaction);
            }
        } catch (error) {
            console.error('Error handling button interaction:', error);
            
            const errorMessage = {
                content: '❌ There was an error while processing your action!',
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }
});

// Handle errors
client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Register slash commands with Discord
async function registerSlashCommands() {
    const commands = [];
    
    // Add all command data
    client.commands.forEach(command => {
        commands.push(command.data.toJSON());
    });

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('🔄 Started refreshing application (/) commands.');

        // Register commands globally (takes up to 1 hour to propagate)
        // For faster testing, you can register to a specific guild instead
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('❌ Error registering slash commands:', error);
    }
}

// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
