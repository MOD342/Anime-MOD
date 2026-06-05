import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IComment extends Document {
  userId: mongoose.Types.ObjectId;
  targetId: mongoose.Types.ObjectId; // id of Anime or Episode
  targetType: 'Anime' | 'Episode';
  text: string;
  likes: number;
  isSpoiler: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    targetType: { type: String, enum: ['Anime', 'Episode'], required: true },
    text: { type: String, required: true, maxlength: 1000 },
    likes: { type: Number, default: 0 },
    isSpoiler: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Comment: Model<IComment> = mongoose.models.Comment || mongoose.model<IComment>('Comment', commentSchema);
