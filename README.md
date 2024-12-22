# Discord AI Image Generation & NFT Minting Bot

A Discord that creates an interactive environment where users can participate in time-limited image generation AMA sessions. During these sessions, users can create AI-generated images using text prompts, vote on their favorites, and ultimately have the collection minted as an NFT on the Solana blockchain as a singular collage/mosaic.

## Features

- **Timed Sessions**: Administrators can start time-limited image generation sessions
- **AI Image Generation**: Users can generate images using text prompts
- **Voting System**: Community voting through Discord reactions (👍 and 👎)
- **Collage Creation**: Automatically creates a collage of all session images
- **NFT Minting**: Mints the session collage as an NFT on Eclipse
- **MongoDB Integration**: Stores all image data and voting results
- **Permission System**: Admin-only controls for session management

## Prerequisites

- Node.js (v16 or higher)
- MongoDB database
- Eclipse supported wallet with Native Tokens for minting
- Discord Bot Token
- Discord Developer Application with proper permissions

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd discord-nft-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
DISCORD_TOKEN=your_discord_bot_token
MONGODB_URI=your_mongodb_uri
CHANNEL_ID=your_channel_id
SOLANA_PRIVATE_KEY=your_base58_private_key
SOLANA_RPC_URL=your_preferred_rpc_url
AMA_DURATION_MINUTES=60
```

4. Build the project:
```bash
npm run build
```

## Project Structure

```
src/
├── commands/
│   ├── generate.ts
│   ├── mint.ts
│   └── start-session.ts
├── models/
│   └── schemas.ts
├── services/
│   ├── imageGeneration.ts
│   ├── nftMinting.ts
│   └── collageCreator.ts
├── config.ts
└── index.ts
```

## Commands

### 1. `/start-session`
- **Description**: Starts a new image generation session
- **Usage**: `/start-session`
- **Permission**: Admin only
- **Effect**: Initiates a timed session where users can generate images

### 2. `/generate`
- **Description**: Generates an AI image based on a text prompt
- **Usage**: `/generate prompt:<your prompt>`
- **Permission**: All users during active session
- **Effect**: Creates and posts an AI-generated image that can be voted on

### 3. `/mint`
- **Description**: Creates a collage of session images and mints it as NFT
- **Usage**: `/mint`
- **Permission**: Admin only
- **Effect**: Generates a collage and mints it on Eclipse

## Configuration Options

In `config.ts`:
- **Discord Settings**
  - Token and Channel ID
  - Command permissions
- **MongoDB Settings**
  - Database connection URI
- **Eclipse Settings**
  - RPC URL
  - Private key handling
- **Session Settings**
  - Duration
  - Image limits

## Development

1. Start in development mode:
```bash
npm run dev
```

2. Watch for changes:
```bash
npm run watch
```

3. Run tests:
```bash
npm test
```

## Technical Details

### Image Generation
- Uses external AI service for image generation
- Supports various prompt types
- Image size: 512x512 pixels

### Collage Creation
- Uses Sharp library for image processing
- Creates optimal grid layout
- No empty spaces or gaps
- Maintains image quality

### NFT Minting
- Network: Exlipse
- Uses Metaplex for NFT creation
- Includes session metadata
- Sets 5% royalty fee (can be changed at `src\services\nftMinting.ts`)

### Database Schema

**Image Schema:**
```typescript
{
  url: string,
  prompt: string,
  upvotes: number,
  downvotes: number,
  userId: string,
  messageId: string,
  createdAt: Date
}
```

**User Schema:**
```typescript
{
  discordId: string,
  images: [ImageSchema]
}
```

## Deployment

1. Build the project:
```bash
npm run build
```

2. Start in production:
```bash
npm start
```

For PM2:
```bash
pm2 start npm --name "discord-nft-bot" -- start
```

## Error Handling

The bot includes comprehensive error handling for:
- Discord API issues
- Database connection problems
- Image generation failures
- NFT minting errors
- Invalid user input

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please:
1. Check existing issues
2. Create a new issue with detailed description
3. Join our Discord community

## Security

- Never share your private keys
- Keep `.env` file secure
- Regularly update dependencies
- Monitor bot permissions