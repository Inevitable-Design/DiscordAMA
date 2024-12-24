import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';
import { Metaplex, bundlrStorage, toMetaplexFile, keypairIdentity } from '@metaplex-foundation/js';
import  bs58  from 'bs58';
import { createCollage } from './collageCreator';
import { config } from '../config';


// src/services/nftMinting.ts
export async function createAndMintCollage(
  imageUrls: string[],
  sessionDetails: {
    startTime: Date;
    endTime: Date;
    totalImages: number;
  }
): Promise<string> {
  try {
    // Create the collage
    const collageOptions = {
      width: 3000,    // High resolution for NFT
      height: 3000,   // Square format
      outputPath: './output'  // Save to output folder
    };

    const collageBuffer = await createCollage(imageUrls, collageOptions);

    // Connect to Solana
    const connection = new Connection(clusterApiUrl("mainnet-beta"));

    // Create wallet from private key
    const privateKeyBytes = bs58.decode(config.solana.privateKey);
    const wallet = Keypair.fromSecretKey(privateKeyBytes);

    // Initialize Metaplex
    const metaplex = Metaplex.make(connection)
      .use(bundlrStorage())
      .use(keypairIdentity(wallet));

    // Create Metaplex file from collage buffer
    const file = toMetaplexFile(collageBuffer, 'collage.png');

    // Upload the collage
    const imageUri = await metaplex.storage().upload(file);

    // Format date for metadata
    const startDate = sessionDetails.startTime.toISOString();
    const endDate = sessionDetails.endTime.toISOString();

    // Prepare metadata
    const metadata = {
      name: `AMA Session Collage ${startDate.split('T')[0]}`,
      description: `Collection of AI-generated images from AMA session\n` +
                  `Session Start: ${startDate}\n` +
                  `Session End: ${endDate}\n` +
                  `Total Images: ${sessionDetails.totalImages}\n` +
                  `This NFT represents a collage of all images generated during the session.`,
      image: imageUri,
      attributes: [
        {
          trait_type: 'Session Date',
          value: startDate.split('T')[0]
        },
        {
          trait_type: 'Number of Images',
          value: sessionDetails.totalImages.toString()
        },
        {
          trait_type: 'Session Duration (minutes)',
          value: Math.round((sessionDetails.endTime.getTime() - sessionDetails.startTime.getTime()) / 60000).toString()
        }
      ]
    };

    // Upload metadata
    console.log('Uploading metadata:', metadata);
    const metadataUri = await metaplex.storage().uploadJson(metadata);
    console.log('Metadata uploaded:', metadataUri);

    // Create NFT
    const { nft } = await metaplex.nfts().create({
      uri: metadataUri,
      name: metadata.name,
      sellerFeeBasisPoints: 500, // 5% royalty
    });

    return nft.address.toString();
  } catch (error) {
    console.error('Error in createAndMintCollage:', error);
    throw error;
  }
}