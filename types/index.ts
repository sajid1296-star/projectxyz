export interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: 'USER' | 'ADMIN';
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  specifications: Record<string, any>;
  images: Image[];
  brand: Brand;
  category: Category;
  reviews: Review[];
  averageRating?: number;
  totalReviews?: number;
}

export interface Brand {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Image {
  id: string;
  url: string;
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  user: {
    name: string | null;
  };
  createdAt: Date;
}

export interface Order {
  id: string;
  status: OrderStatus;
  total: number;
  shippingAddress: ShippingAddress;
  shippingMethod: ShippingMethod;
  items: OrderItem[];
  createdAt: Date;
}

export interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    name: string;
  };
}

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type ShippingMethod = 'standard' | 'express';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
} 