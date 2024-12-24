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
  solana: {
    privateKey: process.env.SOLANA_PRIVATE_KEY!, // This will be base58 encoded
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  },
  imgGenUrl: process.env.IMAGE_GEN_URL,
};