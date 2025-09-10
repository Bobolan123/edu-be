export class OrderInfoDto {
  id: string;
  totalPrice: number;
  status: string;
  paymentMethod: string;
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}
