export interface Fabric {
  id: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  image?: string;
  barcode?: string;
  category?: string;
}

export type OrderStatus = 'قيد التجهيز' | 'جاهز للتسليم' | 'تم التسليم' | 'ملغي';
export type PaymentStatus = 'تم الدفع' | 'قيد الدفع';
export type PaymentMethod = 'بنفت بي' | 'نقداً' | 'بطاقة دفع' | 'أخرى';

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  details: string;
  price: number;
  total?: number;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod | string;
  deliveryMethod?: string;
  notes?: string;
  createdAt: number; // timestamp in ms
  fabricId?: string;
  fabricMeters?: number;
  fabricName?: string;
}

export const isOrderPaid = (order: { paymentStatus?: PaymentStatus | string }): boolean => {
  return order.paymentStatus !== 'قيد الدفع';
};

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  paymentMethod?: PaymentMethod | string;
  paidTo?: string;
  notes?: string;
  createdAt: number; // timestamp in ms
}
