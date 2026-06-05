import mongoose, { Document, Schema, Model } from 'mongoose';

// 1. واجهة السيرفر - Server Interface
export interface IServer extends Document {
  episodeId: mongoose.Types.ObjectId;
  name: string;
  url: string;
  type: 'iframe' | 'direct' | 'hls';
  quality: 'SD' | 'HD' | 'FHD' | '4K';
  language: 'subbed' | 'dubbed'; // مترجم أو مدبلج
  createdAt: Date;
  updatedAt: Date;
}

// 2. تصميم المخطط - Server Schema
const serverSchema = new Schema<IServer>(
  {
    episodeId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Episode', 
      required: true,
      index: true
    },
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    type: {
      type: String,
      enum: ['iframe', 'direct', 'hls'], // iframe (مضمن), direct (mp4), hls (m3u8)
      required: true,
    },
    quality: {
      type: String,
      enum: ['SD', 'HD', 'FHD', '4K'],
      default: 'FHD',
    },
    language: {
      type: String,
      enum: ['subbed', 'dubbed'],
      default: 'subbed',
    },
  },
  {
    timestamps: true,
  }
);

export const Server: Model<IServer> = 
  mongoose.models.Server || mongoose.model<IServer>('Server', serverSchema);
