// src/commands/generate.ts
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { generateImage } from '../services/imageGeneration';
import { Image, User } from '../models/schemas';
import { config } from '../config';

export const generateCommand = {
  data: new SlashCommandBuilder()
    .setName('generate')
    .setDescription('Create an AI-generated image')
    .addStringOption((option) =>
      option
        .setName('prompt')
        .setDescription('Enter a description for the AI to generate an image')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (interaction.channelId !== config.discord.channelId) {
      await interaction.reply({
        content: 'This command can only be used in the designated channel!',
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
        upvotes: 0,
        downvotes: 0,
      });

      // Save the initial image and message reference
      await newImage.save();
      user.images.push(newImage);
      await user.save();

    } catch (error) {
      console.error('Error in generate command:', error);
      await interaction.followUp('An error occurred. Please try again later.');
    }
  },
};
