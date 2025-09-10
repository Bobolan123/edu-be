export interface IUser {
  id: number;
  email: string;
  role: {
    id: number;
    name: string;
  };
  name: string;
  avatar_url?: string;
  permissions?: {
    id: number;
    action: string;
  }[];
}
