import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'moderator' | 'admin';
  level: number;
  exp: number;
  coins: number;
  avatarUrl: string;
  coverUrl: string;
  titles: string[];
  activeTitle: string;
  isBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
    level: { type: Number, default: 1 },
    exp: { type: Number, default: 0 },
    coins: { type: Number, default: 500 }, // مكافأة البداية
    avatarUrl: { type: String, default: '/default-avatar.png' },
    coverUrl: { type: String, default: '/default-cover.png' },
    titles: [{ type: String }],
    activeTitle: { type: String, default: 'مبتدئ' },
    isBanned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
