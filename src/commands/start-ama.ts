// src/commands/start-ama.ts:
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { config } from '../config';

export const startAmaCommand = {
  data: new SlashCommandBuilder()
    .setName('start-ama')
    .setDescription('Start an NFT AMA session'),

  async execute(interaction: ChatInputCommandInteraction, amaState: { active: boolean, start: () => void }) {
    if (!interaction.memberPermissions?.has('Administrator')) {
      await interaction.reply({
        content: 'Only administrators can start AMA sessions!',
        ephemeral: true,
      });
      return;
    }

    if (amaState.active) {
      await interaction.reply({
        content: 'An AMA session is already active!',
        ephemeral: true,
      });
      return;
    }

    amaState.start();
    await interaction.reply(`AMA session started! It will last for ${config.ama.durationMinutes} minutes.`);
  },
};