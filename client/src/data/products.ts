import { ASSETS } from '../assets/images';

export type ProductCategory =
  | 'Recommended for you'
  | 'Best Deals'
  | 'Price Drops'
  | 'PayPal Rewards';

export interface ProductPick {
  id: string;
  sku?: string;
  name: string;
  brand: string;
  category: ProductCategory;
  backendCategory?: string;
  price: string;
  numericPrice: number;
  originalPrice: string;
  savings: string;
  rating: string;
  reviewsCount: number;
  rewardPoints: string;
  cashbackText: string;
  image: string;
  summary: string;
  inventory?: number;
  isAvailable?: boolean;
  badge?: string;
  whyRecommended?: string[];
  tradeoffs?: string[];
  warranty?: string;
  features?: string[];
}

export const AI_PRODUCT_PICKS: ProductPick[] = [
  {
    id: 'prod-1',
    name: 'MacBook Air 13" (M3, 16GB RAM, 512GB SSD)',
    brand: 'Apple',
    category: 'Recommended for you',
    price: '$849.00',
    numericPrice: 849,
    originalPrice: '$1,099.00',
    savings: 'Save $250',
    rating: '4.9 ★',
    reviewsCount: 1420,
    rewardPoints: '+1,698 pts',
    cashbackText: '3% PayPal Cashback',
    image: ASSETS.prodLaptop,
    summary: 'Best ultraportable laptop under $900 — 18-hour battery life, Liquid Retina display, verified lowest price in 90 days.',
  },
  {
    id: 'prod-2',
    name: 'Sony WH-1000XM5 Wireless Noise-Canceling Headphones',
    brand: 'Sony',
    category: 'Best Deals',
    price: '$298.00',
    numericPrice: 298,
    originalPrice: '$399.99',
    savings: 'Save $102',
    rating: '4.8 ★',
    reviewsCount: 985,
    rewardPoints: '+894 pts',
    cashbackText: '5% Audio Cashback',
    image: ASSETS.prodHeadphones,
    summary: 'Industry-leading 8-microphone active noise cancellation with 30-hour battery and multipoint Bluetooth.',
  },
  {
    id: 'prod-3',
    name: 'Apple Watch Series 10 (GPS, 45mm Jet Black)',
    brand: 'Apple',
    category: 'Price Drops',
    price: '$349.00',
    numericPrice: 349,
    originalPrice: '$429.00',
    savings: 'Save $80',
    rating: '4.9 ★',
    reviewsCount: 760,
    rewardPoints: '+1,047 pts',
    cashbackText: '4% PayPal Rewards',
    image: ASSETS.prodWatch,
    summary: 'Thinnest Apple Watch ever with wide-angle OLED display, sleep apnea notifications, and fast charging.',
  },
  {
    id: 'prod-4',
    name: 'ASUS ROG Zephyrus G14 OLED Creator Laptop',
    brand: 'ASUS',
    category: 'PayPal Rewards',
    price: '$899.00',
    numericPrice: 899,
    originalPrice: '$1,199.00',
    savings: 'Save $300',
    rating: '4.8 ★',
    reviewsCount: 512,
    rewardPoints: '+2,697 pts',
    cashbackText: '6% Bonus Points',
    image: ASSETS.prodLaptop,
    summary: '3K 120Hz OLED display, Ryzen 9 processor, compact aluminum chassis under $900 after instant PayPal rebate.',
  },
];
