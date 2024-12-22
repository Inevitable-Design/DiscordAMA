import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  // ChannelType,
  // TextChannel,
} from 'discord.js';
import { Image } from '../models/schemas';
import { createAndMintCollage } from '../services/nftMinting';
import { config } from '../config';

export const mintCommand = {
  data: new SlashCommandBuilder()
    .setName('mint')
    .setDescription('Create and mint a collage of all session images as NFT'),

  async execute(interaction: ChatInputCommandInteraction) {
    // Check admin permissions
    if (!interaction.memberPermissions?.has('Administrator')) {
      await interaction.reply({
        content: 'Only administrators can mint NFTs!',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    try {
      // Get the session end time (now) and calculate start time
      const sessionEndTime = new Date();
      const sessionStartTime = new Date(sessionEndTime.getTime() - (60 * 100 * 24 * 5 * 60 * 1000));

      // Get all images from the session period
      const sessionImages = await Image.find({
        createdAt: {
          $gte: sessionStartTime,
          $lte: sessionEndTime
        }
      }).sort({ createdAt: 1 });

      if (sessionImages.length === 0) {
        await interaction.followUp('No images found from the session to create collage!');
        return;
      }

      // Extract image URLs
      const imageUrls = sessionImages.map(img => img.url);

      // Create collage and mint NFT
      const mintAddress = await createAndMintCollage(imageUrls, {
        startTime: sessionStartTime,
        endTime: sessionEndTime,
        totalImages: sessionImages.length
      });

      // Send results
      let resultsMessage = `**Session Collage NFT Created!**\n\n` +
        `Session Details:\n` +
        `• Total Images: ${sessionImages.length}\n` +
        `• Start Time: ${sessionStartTime.toISOString()}\n` +
        `• End Time: ${sessionEndTime.toISOString()}\n` +
        `• Duration: ${config.ama.durationMinutes} minutes\n\n` +
        `NFT Details:\n` +
        `• Mint Address: ${mintAddress}\n` +
        `• The NFT contains a collage of all ${sessionImages.length} images generated during this session.\n`;

      await interaction.followUp(resultsMessage);

    } catch (error) {
      console.error('Error in mint command:', error);
      await interaction.followUp('An error occurred while creating the collage NFT. Please check the logs.');
    }
  },
};