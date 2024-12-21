// src/index.ts
import {
  ChannelType,
    Client,
    Events,
    GatewayIntentBits,
    REST,
    Routes,
    TextChannel,
  } from 'discord.js';
  import mongoose from 'mongoose';
  import { config } from './config';
  import { generateCommand } from './commands/generate';
  import { startSessionCommand } from './commands/start-session';
  import { Image } from './models/schemas';
  
// src/index.ts (only the sessionState part needs to change)
const sessionState = {
  active: false,
  timeout: null as NodeJS.Timeout | null,
  start: async function() {
    this.active = true;
    console.log('Session started');
    
    this.timeout = setTimeout(async () => {
      this.active = false;
      console.log('Session ending, updating final votes...');

      // Get all images created during this session
      const sessionImages = await Image.find({
        createdAt: { $gte: new Date(Date.now() - config.ama.durationMinutes * 60 * 1000) }
      });

      // Fetch final reaction counts for each image
      for (const image of sessionImages) {
        try {
          const channel = await client.channels.fetch(config.discord.channelId);
          if (!channel?.isTextBased()) continue;

          const message = await channel.messages.fetch(image.messageId);
          
          // Get reaction counts
          const upvoteReaction = message.reactions.cache.find(r => r.emoji.name === '👍');
          const downvoteReaction = message.reactions.cache.find(r => r.emoji.name === '👎');
          
          // Update the counts (subtract 1 to account for bot's own reaction)
          image.upvotes = (upvoteReaction?.count ?? 1) - 1;
          image.downvotes = (downvoteReaction?.count ?? 1) - 1;
          await image.save();
          
          console.log(`Updated votes for image ${image.messageId}: ${image.upvotes} upvotes, ${image.downvotes} downvotes`);
        } catch (error) {
          console.error(`Error updating votes for image ${image.messageId}:`, error);
        }
      }

      // Get top 10 images by upvotes
      const topImages = await Image.find({
        createdAt: { $gte: new Date(Date.now() - config.ama.durationMinutes * 60 * 1000) }
      })
      .sort({ upvotes: -1 })
      .limit(10);

      // Send results to the channel
      try {
        const channel = await client.channels.fetch(config.discord.channelId);
        if (channel?.type === ChannelType.GuildText) {
          const textChannel = channel as TextChannel;
          let resultsMessage = '**Session Results**\nTop 10 Images:\n\n';
          for (let i = 0; i < topImages.length; i++) {
            const image = topImages[i];
            resultsMessage += `${i + 1}. Prompt: "${image.prompt}"\n` +
                            `   👍 ${image.upvotes} | 👎 ${image.downvotes}\n` +
                            `   ${image.url}\n\n`;
          }
          await textChannel.send(resultsMessage);
        }
      } catch (error) {
        console.error('Error sending results:', error);
      }

      console.log('Session ended, votes updated');
    }, config.ama.durationMinutes * 60 * 1000);
  }
};

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
    ],
  });
  
  async function connectDB() {
    try {
      await mongoose.connect(config.mongodb.uri);
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      process.exit(1);
    }
  }
  
  async function registerCommands() {
    const commands = [
      generateCommand.data.toJSON(),
      startSessionCommand.data.toJSON(),
    ];
  
    const rest = new REST().setToken(config.discord.token);
  
    try {
      console.log('Started refreshing application (/) commands.');
  
      await rest.put(
        Routes.applicationCommands(client.user!.id),
        { body: commands },
      );
  
      console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
      console.error('Error registering slash commands:', error);
    }
  }
  
  client.once(Events.ClientReady, () => {
    console.log('Discord bot is ready!');
    connectDB();
    registerCommands();
  });
  
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
  
    switch (interaction.commandName) {
      case 'generate':
        if (!sessionState.active) {
          await interaction.reply({
            content: 'No session is currently active!',
            ephemeral: true,
          });
          return;
        }
        await generateCommand.execute(interaction);
        break;
  
      case 'start-session':
        await startSessionCommand.execute(interaction, sessionState);
        break;
    }
  });
  
  client.login(config.discord.token);