// src/models/schemas.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IImage extends Document {
  url: string;
  prompt: string;
  upvotes: number;
  downvotes: number;
  userId: string;
  messageId: string;
  createdAt: Date;
}

export interface IUser extends Document {
  discordId: string;
  images: IImage[];
}

const ImageSchema = new Schema({
  url: { type: String, required: true },
  prompt: { type: String, required: true },
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  userId: { type: String, required: true },
  messageId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const UserSchema = new Schema({
  discordId: { type: String, required: true, unique: true },
  images: [ImageSchema],
});

export const Image = mongoose.model<IImage>('Image', ImageSchema);
export const User = mongoose.model<IUser>('User', UserSchema);