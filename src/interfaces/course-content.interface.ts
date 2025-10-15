export interface VideoContent {
  videoUrl: string;
  thumbnailUrl?: string;
  cloudinaryPublicId: string;
  quality: { resolution: string; url: string }[];
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
}

export interface QuizContent {
  questions: QuizQuestion[];
  passingScore: number; // 0-100 
  allowMultipleAttempts: boolean;
}
