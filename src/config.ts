// src/config.ts
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  discord: {
    token: process.env.DISCORD_TOKEN!,
    channelId: process.env.CHANNEL_ID!,
  },
  mongodb: {
    uri: process.env.MONGODB_URI!,
  },
  ama: {
    durationMinutes: parseInt(process.env.AMA_DURATION_MINUTES!) || 60,
  },
};