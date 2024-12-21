// src/commands/start-session.ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { config } from '../config';

export const startSessionCommand = {
  data: new SlashCommandBuilder()
    .setName('start-session')
    .setDescription('Start an image generation session'),

  async execute(interaction: ChatInputCommandInteraction, sessionState: { active: boolean, start: () => void }) {
    if (!interaction.memberPermissions?.has('Administrator')) {
      await interaction.reply({
        content: 'Only administrators can start sessions!',
        ephemeral: true,
      });
      return;
    }

    if (sessionState.active) {
      await interaction.reply({
        content: 'A session is already active!',
        ephemeral: true,
      });
      return;
    }

    sessionState.start();
    await interaction.reply(`Session started! It will last for ${config.ama.durationMinutes} minutes.`);
  },
};