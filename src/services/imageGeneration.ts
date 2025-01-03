// src/services/imageGeneration.ts
import axios from 'axios';
import {config} from '../config'

export async function generateImage(prompt: string): Promise<string> {
  try {
    const response = await axios.post(
      config.imgGenUrl,
      {
        prompt,
        twice: false,
        compile: false,
        h: 512,
        w: 512,
        override: 'False',
      }
    );

    return response.data.img;
  } catch (error) {
    console.error('Error generating image:', error);
    throw new Error('Failed to generate image');
  }
}