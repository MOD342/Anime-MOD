export interface TriviaQuestion {
  id?: string;
  question: string;
  options: string[];
  correctIndex: number; // 0 to 3
  animeName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: any;
  author: string;
  likes: number;
  dislikes: number;
}
