export interface IUser {
  id: number;
  email: string;
  role: {
    id: number;
    name: string;
  };
  name: string;
  permissions?: {
    id: number;
    action:string
  }[];
}
