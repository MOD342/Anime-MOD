import mongoose, { Document, Schema, Model } from 'mongoose';

// 1. واجهة الأنمي - Anime Interface
export interface IAnime extends Document {
  title: string;
  originalTitle?: string;
  description: string;
  posterUrl: string;
  bannerUrl?: string;
  status: 'ongoing' | 'completed' | 'upcoming';
  releaseYear: number;
  genres: string[];
  rating?: number;
  episodesCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// 2. تصميم المخطط - Anime Schema
const animeSchema = new Schema<IAnime>(
  {
    title: { type: String, required: true, trim: true, index: true },
    originalTitle: { type: String, trim: true },
    description: { type: String, required: true },
    posterUrl: { type: String, required: true },
    bannerUrl: { type: String },
    status: {
      type: String,
      enum: ['ongoing', 'completed', 'upcoming'],
      default: 'ongoing',
    },
    releaseYear: { type: Number, required: true, index: true },
    genres: [{ type: String, trim: true }],
    rating: { type: Number, min: 0, max: 10 },
    episodesCount: { type: Number, default: 0 },
  },
  {
    timestamps: true, // يضيف createdAt و updatedAt تلقائياً
  }
);

// تصدير كنموذج (Model)
export const Anime: Model<IAnime> = 
  mongoose.models.Anime || mongoose.model<IAnime>('Anime', animeSchema);
