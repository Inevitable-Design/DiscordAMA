// src/services/nftMinting.ts
import { Connection, Keypair } from '@solana/web3.js';
import { Metaplex, bundlrStorage, keypairIdentity, toMetaplexFile } from '@metaplex-foundation/js';
import  bs58  from 'bs58';
import axios from 'axios';
import { config } from '../config';

export async function downloadImage(url: string): Promise<Buffer> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }
  
  export async function mintNFT(
    imageUrl: string, 
    prompt: string,
    upvotes: number,
    downvotes: number
  ): Promise<string> {
    try {
      // Connect to Solana
      const connection = new Connection(config.solana.rpcUrl);
      
      // Create wallet from private key
      const privateKeyBytes = bs58.decode(config.solana.privateKey);
      const wallet = Keypair.fromSecretKey(privateKeyBytes);
  
      // Initialize Metaplex
      const metaplex = Metaplex.make(connection)
      .use(bundlrStorage())
      .use(keypairIdentity(wallet));
  
      // Download and prepare the image
      const imageBuffer = await downloadImage(imageUrl);
      const file = toMetaplexFile(imageBuffer, 'image.png');
  
      // Upload the image
      const imageUri = await metaplex.storage().upload(file);
  
      // Prepare metadata
      const netScore = upvotes - downvotes;
      const metadata = {
        name: `AI Generated Art #${Date.now()}`,
        description: `Prompt: ${prompt}\nUpvotes: ${upvotes}\nDownvotes: ${downvotes}\nNet Score: ${netScore}`,
        image: imageUri,
        attributes: [
          {
            trait_type: 'Upvotes',
            value: upvotes.toString()
          },
          {
            trait_type: 'Downvotes',
            value: downvotes.toString()
          },
          {
            trait_type: 'Net Score',
            value: netScore.toString()
          }
        ]
      };
  
      // Upload metadata
      const metadataUri = await metaplex.storage().uploadJson(metadata);
  
      // Create NFT
      const { nft } = await metaplex.nfts().create({
        uri: metadataUri,
        name: metadata.name,
        sellerFeeBasisPoints: 500, // 5% royalty
      });
  
      return nft.address.toString();
    } catch (error) {
      console.error('Error minting NFT:', error);
      throw error;
    }
  }