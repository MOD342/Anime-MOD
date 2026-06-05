import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IStoreItem extends Document {
  name: string;
  description: string;
  type: 'avatar_frame' | 'profile_cover' | 'chat_title' | 'badge';
  price: number;
  imageUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const storeItemSchema = new Schema<IStoreItem>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['avatar_frame', 'profile_cover', 'chat_title', 'badge'], 
      required: true 
    },
    price: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, required: true },
    rarity: { 
      type: String, 
      enum: ['common', 'rare', 'epic', 'legendary'], 
      default: 'common' 
    },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const StoreItem: Model<IStoreItem> = mongoose.models.StoreItem || mongoose.model<IStoreItem>('StoreItem', storeItemSchema);
