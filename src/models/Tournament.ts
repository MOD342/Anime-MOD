import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ITournament extends Document {
  title: string;
  description: string;
  bannerUrl: string;
  gameType: 'trivia' | 'guessing' | 'voting';
  rewardCoins: number;
  rewardExp: number;
  startDate: Date;
  endDate: Date;
  status: 'upcoming' | 'active' | 'completed';
  participantsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const tournamentSchema = new Schema<ITournament>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    bannerUrl: { type: String, required: true },
    gameType: { type: String, enum: ['trivia', 'guessing', 'voting'], required: true },
    rewardCoins: { type: Number, required: true },
    rewardExp: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['upcoming', 'active', 'completed'], default: 'upcoming' },
    participantsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Tournament: Model<ITournament> = mongoose.models.Tournament || mongoose.model<ITournament>('Tournament', tournamentSchema);
