export interface Fabric {
  id: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  image?: string;
  barcode?: string;
  category?: string;
  season?: string; // صيفي، شتوي، ربيعي، كافة الفصول
}

export interface StoreSettings {
  whatsappNumber: string;
  storeName: string;
  storeTagline: string;
  announcementText: string;
  instagramHandle: string;
  defaultThobeMeters: number;
  hideOutOfStock: boolean;
  defaultSeason: 'all' | 'summer' | 'winter' | 'spring';
  headerVisible: boolean;
  seasonsOrder: ('winter' | 'summer' | 'spring')[];
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  whatsappNumber: "38244795",
  storeName: "نَسْجَة",
  storeTagline: "للأقمشة الرجالية وتفصيل الثياب",
  announcementText: "أقمشة رجالية فاخرة وتفصيل متقن لكافة مناطق البحرين والخليج",
  instagramHandle: "nasjah.bh",
  defaultThobeMeters: 3.5,
  hideOutOfStock: false,
  defaultSeason: "all",
  headerVisible: true,
  seasonsOrder: ['winter', 'summer', 'spring'],
};

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

export const CRITICAL_FABRIC_THRESHOLD = 3.5;

export const isOrderPaid = (order: { paymentStatus?: PaymentStatus | string; status?: OrderStatus | string }): boolean => {
  return order.paymentStatus !== 'قيد الدفع' && order.status !== 'ملغي';
};

export const isOrderValidRevenue = (order: { paymentStatus?: PaymentStatus | string; status?: OrderStatus | string }): boolean => {
  return order.paymentStatus !== 'قيد الدفع' && order.status !== 'ملغي';
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
