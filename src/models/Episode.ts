import mongoose, { Document, Schema, Model } from 'mongoose';

// 1. واجهة الحلقة - Episode Interface
export interface IEpisode extends Document {
  animeId: mongoose.Types.ObjectId;
  episodeNumber: number;
  title?: string;
  thumbnailUrl?: string;
  isFiller: boolean;
  views: number;
  releaseDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 2. تصميم المخطط - Episode Schema
const episodeSchema = new Schema<IEpisode>(
  {
    animeId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Anime', 
      required: true,
      index: true 
    },
    episodeNumber: { type: Number, required: true },
    title: { type: String, trim: true },
    thumbnailUrl: { type: String },
    isFiller: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    releaseDate: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// إضافة Index مركب لتسريع البحث عن حلقة محددة داخل أنمي معين
episodeSchema.index({ animeId: 1, episodeNumber: 1 }, { unique: true });

export const Episode: Model<IEpisode> = 
  mongoose.models.Episode || mongoose.model<IEpisode>('Episode', episodeSchema);
