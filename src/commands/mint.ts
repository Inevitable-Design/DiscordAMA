// src/commands/mint.ts
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { Image } from "../models/schemas";
import { mintNFT } from "../services/nftMinting";
//   import { config } from '../config';

export const mintCommand = {
  data: new SlashCommandBuilder()
    .setName("mint")
    .setDescription("Mint top upvoted images as NFTs")
    .addIntegerOption((option) =>
      option
        .setName("number")
        .setDescription("Number of top images to mint")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(50)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    // Check admin permissions
    if (!interaction.memberPermissions?.has("Administrator")) {
      await interaction.reply({
        content: "Only administrators can mint NFTs!",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    try {
      const numberOfImages = interaction.options.getInteger("number", true);

      // Get top images by net score (upvotes - downvotes)
      const topImages = await Image.aggregate([
        {
          $addFields: {
            netScore: { $subtract: ["$upvotes", "$downvotes"] },
          },
        },
        {
          $sort: { netScore: -1 },
        },
        {
          $limit: numberOfImages,
        },
      ]);

      if (topImages.length === 0) {
        await interaction.followUp("No images found to mint!");
        return;
      }

      let successfulMints = 0;
      let mintedAddresses: string[] = [];

      // Mint each image
      for (const image of topImages) {
        try {
          const mintAddress = await mintNFT(
            image.url,
            image.prompt,
            image.upvotes,
            image.downvotes
          );
          successfulMints++;
          mintedAddresses.push(mintAddress);
        } catch (error) {
          console.error(`Failed to mint NFT for image ${image.url}:`, error);
        }
      }

      // Send results
      let resultsMessage =
        `**Minting Results**\n` +
        `Successfully minted ${successfulMints}/${topImages.length} NFTs\n\n`;

      for (let i = 0; i < mintedAddresses.length; i++) {
        const image = topImages[i];
        const netScore = image.upvotes - image.downvotes;
        resultsMessage +=
          `${i + 1}. Prompt: "${image.prompt}"\n` +
          `   👍 ${image.upvotes} | 👎 ${image.downvotes} | Net Score: ${netScore}\n` +
          `   Mint Address: ${mintedAddresses[i]}\n` +
          `   Original Image: ${image.url}\n\n`;
      }

      await interaction.followUp(resultsMessage);
    } catch (error) {
      console.error("Error in mint command:", error);
      await interaction.followUp(
        "An error occurred while minting NFTs. Please check the logs."
      );
    }
  },
};
