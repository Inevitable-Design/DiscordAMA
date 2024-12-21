import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Metaplex } from '@metaplex-foundation/js';
import { config } from '../config';

export async function mintNFT(imageUrl: string, prompt: string): Promise<string> {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const wallet = Keypair.fromSecretKey(
    Buffer.from(config.solana.privateKey, 'base64')
  );

  const metaplex = new Metaplex(connection).use(wallet);

  try {
    const { nft } = await metaplex.nfts().create({
      uri: imageUrl,
      name: `AMA NFT: ${prompt.substring(0, 32)}`,
      sellerFeeBasisPoints: 500,
    });

    return nft.address.toBase58();
  } catch (error) {
    console.error('Error minting NFT:', error);
    throw new Error('Failed to mint NFT');
  }
}