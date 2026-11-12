import React from 'react';
import {
  ArrowLeftRight,
  CreditCard,
  Sparkles,
  Search,
  PackageOpen,
  ShoppingBag,
  ReceiptText,
  FileText,
  Gift,
  ShieldCheck,
  Bot,
  BarChart2,
  Settings,
} from 'lucide-react';
import { ASSETS } from '../assets/images';
import type { NavItemId } from '../data/dashboard';
import type { TransactionItem } from '../data/transactions';

export const PayPalWordmark: React.FC = () => (
  <div className="flex items-center gap-[9px] select-none">
    <svg width="22" height="24" viewBox="0 0 24 26" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M17.6 3.2C16.5 2.0 14.5 1.5 11.9 1.5H4.8C4.1 1.5 3.5 2.0 3.4 2.7L0.6 20.3C0.5 20.8 0.9 21.3 1.4 21.3H5.6L6.7 14.3L6.6 14.8C6.7 14.1 7.3 13.6 8.0 13.6H10.8C15.9 13.6 19.8 11.5 20.9 5.6C21.0 5.2 21.0 4.8 21.0 4.4C20.6 3.9 20.1 3.5 17.6 3.2Z"
        fill="#FFFFFF"
      />
      <path
        d="M21.4 6.2C20.2 12.1 16.3 14.4 11.0 14.4H8.4L7.1 22.8H11.5C12.1 22.8 12.6 22.4 12.7 21.8L13.4 17.2C13.5 16.6 14.0 16.2 14.6 16.2H16.2C20.5 16.2 23.8 14.4 24.8 9.4C25.2 7.2 24.4 5.7 22.8 4.9C22.3 5.3 21.8 5.7 21.4 6.2Z"
        fill="#BEB9B0"
      />
    </svg>
    <span className="text-[#f7f2e8] font-bold text-[17.5px] tracking-[-0.02em] italic font-sans">
      PayPal
    </span>
  </div>
);

export const NavIcon: React.FC<{ id: NavItemId; active: boolean }> = ({ id, active }) => {
  const strokeColor = active ? '#181715' : '#c6c1b9';
  const props = { width: 16, height: 16, strokeWidth: 1.8, color: strokeColor, 'aria-hidden': true as const };

  switch (id) {
    case 'home':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? '#181715' : 'none'} stroke={strokeColor} strokeWidth="2" aria-hidden="true">
          <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" />
        </svg>
      );
    case 'send':
      return <ArrowLeftRight {...props} />;
    case 'request':
      return <CreditCard {...props} />;
    case 'add':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.8" aria-hidden="true">
          <path d="M12 2L22 12L12 22L2 12L12 2Z" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    case 'ai-shopping':
      return <Sparkles {...props} />;
    case 'discovery':
      return <Search {...props} />;
    case 'product-details':
      return <PackageOpen {...props} />;
    case 'checkout':
      return <ShoppingBag {...props} />;
    case 'transactions':
      return <ReceiptText {...props} />;
    case 'transaction-details':
      return <FileText {...props} />;
    case 'rewards':
      return <Gift {...props} />;
    case 'fraudguard':
      return <ShieldCheck {...props} />;
    case 'agents':
      return <Bot {...props} />;
    case 'analytics':
      return <BarChart2 {...props} />;
    case 'settings':
      return <Settings {...props} />;
  }
};

export const FourPointStar: React.FC<{ size?: number; className?: string }> = ({ size = 15, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <path d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2L12 2Z" />
  </svg>
);

export const TransactionAvatar: React.FC<{ brand: TransactionItem['brand']; size?: 'sm' | 'md' | 'lg' }> = ({
  brand,
  size = 'sm',
}) => {
  const dim =
    size === 'lg'
      ? 'w-[48px] h-[48px]'
      : size === 'md'
        ? 'w-[36px] h-[36px]'
        : 'w-[32px] h-[32px] 2xl:w-[36px] 2xl:h-[36px]';
  if (brand === 'apple') {
    return (
      <div className={`${dim} rounded-full bg-[#181816] flex items-center justify-center shrink-0`}>
        <svg width={size === 'lg' ? 20 : 14} height={size === 'lg' ? 22 : 16} viewBox="0 0 170 170" fill="#ffffff" aria-hidden="true">
          <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.13-1.9-14.34-6.08-3.69-3.03-7.61-7.83-11.77-14.4-5.93-9.28-10.76-20.03-14.48-32.27-3.72-12.24-5.58-23.62-5.58-34.14 0-12.86 3.21-23.38 9.64-31.54 6.43-8.16 14.62-12.42 24.57-12.78 4.81 0 10.29 1.48 16.44 4.44 6.15 2.96 10.12 4.49 11.91 4.61 1.34 0 5.76-1.79 13.25-5.37 7.16-3.24 13.36-4.58 18.62-4.02 13.75 1.12 24.1 6.54 31.04 16.27-12.3 7.49-18.34 17.89-18.12 31.2.22 10.4 4.11 19.06 11.66 26.00 5.21 4.86 11.45 7.77 18.71 8.72-1.5 4.41-3.32 8.94-5.48 13.58zM119.22 31.01c0 8.16-2.99 15.79-8.96 22.88-7.18 8.39-15.89 13.21-25.32 12.43-.19-.97-.29-2-.29-3.09 0-7.84 3.41-16.25 9.48-23.12 3.03-3.48 6.89-6.37 11.58-8.68 4.68-2.3 9.11-3.58 13.28-3.84.15 1.14.23 2.28.23 3.42z" />
        </svg>
      </div>
    );
  }
  if (brand === 'paypal') {
    return (
      <div className={`${dim} rounded-full bg-[#f4efe6] border border-[#e5ded3] flex items-center justify-center shrink-0`}>
        <svg width={size === 'lg' ? 20 : 15} height={size === 'lg' ? 22 : 17} viewBox="0 0 24 26" fill="none" aria-hidden="true">
          <path
            d="M17.6 3.2C16.5 2.0 14.5 1.5 11.9 1.5H4.8C4.1 1.5 3.5 2.0 3.4 2.7L0.6 20.3C0.5 20.8 0.9 21.3 1.4 21.3H5.6L6.7 14.3L6.6 14.8C6.7 14.1 7.3 13.6 8.0 13.6H10.8C15.9 13.6 19.8 11.5 20.9 5.6C21.0 5.2 21.0 4.8 21.0 4.4C20.6 3.9 20.1 3.5 17.6 3.2Z"
            fill="#003087"
          />
          <path
            d="M21.4 6.2C20.2 12.1 16.3 14.4 11.0 14.4H8.4L7.1 22.8H11.5C12.1 22.8 12.6 22.4 12.7 21.8L13.4 17.2C13.5 16.6 14.0 16.2 14.6 16.2H16.2C20.5 16.2 23.8 14.4 24.8 9.4C25.2 7.2 24.4 5.7 22.8 4.9C22.3 5.3 21.8 5.7 21.4 6.2Z"
            fill="#0079C1"
          />
        </svg>
      </div>
    );
  }
  if (brand === 'steam') {
    return (
      <div className={`${dim} rounded-full bg-[#181816] flex items-center justify-center shrink-0 overflow-hidden`}>
        <img src={ASSETS.txSteam} alt="Steam" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`${dim} rounded-full bg-[#2b2927] flex items-center justify-center shrink-0 overflow-hidden`}>
      <img src={ASSETS.txNetflix} alt="Netflix" className="w-full h-full object-cover" />
    </div>
  );
};
