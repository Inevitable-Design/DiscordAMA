// src/commands/nft.ts:
import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    MessageReaction,
  } from 'discord.js';
  import { generateImage } from '../services/imageGeneration';
  import { Image, User } from '../models/schemas';
  import { config } from '../config';
  
  export const nftCommand = {
    data: new SlashCommandBuilder()
      .setName('nft')
      .setDescription('Create an AI-generated image for NFT minting')
      .addStringOption((option) =>
        option
          .setName('prompt')
          .setDescription('Enter a description for the AI to generate an image')
          .setRequired(true)
      ),
  
    async execute(interaction: ChatInputCommandInteraction) {
      // Check if command is used in the correct channel
      if (interaction.channelId !== config.discord.channelId) {
        await interaction.reply({
          content: 'This command can only be used in the designated AMA channel!',
          ephemeral: true,
        });
        return;
      }
  
      await interaction.deferReply();
  
      try {
        const prompt = interaction.options.getString('prompt', true);
        const userId = interaction.user.id;
  
        let user = await User.findOne({ discordId: userId });
        if (!user) {
          user = new User({ discordId: userId, images: [] });
          await user.save();
        }
  
        const imageUrl = await generateImage(prompt);
        
        if (!imageUrl || imageUrl === '420') {
          await interaction.followUp('Error creating image. Please try again.');
          return;
        }
  
        const message = await interaction.followUp(imageUrl);
        await message.react('👍');
        await message.react('👎');
  
        const newImage = new Image({
          url: imageUrl,
          prompt,
          userId,
          messageId: message.id,
        });
  
        const filter = (reaction: MessageReaction) =>
          ['👍', '👎'].includes(reaction.emoji.name ?? '');
          
        const collector = message.createReactionCollector({
          filter,
          time: 30000,
        });
  
        collector.on('collect', (reaction) => {
          if (reaction.emoji.name === '👍') {
            newImage.upvotes += 1;
          } else if (reaction.emoji.name === '👎') {
            newImage.downvotes += 1;
          }
        });
  
        collector.on('end', async () => {
          await newImage.save();
          user.images.push(newImage);
          await user.save();
        });
      } catch (error) {
        console.error('Error in nft command:', error);
        await interaction.followUp('An error occurred. Please try again later.');
      }
    },
  };