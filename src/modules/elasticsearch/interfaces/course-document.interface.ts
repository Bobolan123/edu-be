export interface CourseDocument {
  id: number;
  title: string;
  description: string;
  language: string;
  price: number;
  isActive: boolean;
  average_rating: number;
  total_reviews: number;
  date_created: Date;
  last_updated: Date;

  // Nested objects
  instructor: {
    id: number;
    name: string;
    email: string;
  };

  categories: Array<{
    id: number;
    name: string;
  }>;

  metadata: {
    language?: string;
    level?: string;
    whatYoullLearn?: string[];
  };

  // Computed fields for search
  sections_count?: number;
  lectures_count?: number;
  total_duration_seconds?: number;
}

export interface CourseSearchResult {
  documents: CourseDocument[];
  total: number;
  page: number;
  pageSize: number;
}
