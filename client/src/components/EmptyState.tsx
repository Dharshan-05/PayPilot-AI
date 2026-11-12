import React from 'react';
import { Search } from 'lucide-react';
import { SecondaryButton } from './SecondaryButton';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div role="status" className="py-10 px-4 text-center flex flex-col items-center justify-center">
    <div className="w-12 h-12 rounded-full bg-[#f2ece1] border border-[#e3dcd1] flex items-center justify-center text-[#6a665f] mb-3">
      <Search className="w-5 h-5" aria-hidden="true" />
    </div>
    <h3 className="text-[13.5px] font-semibold text-[#1c1b19]">{title}</h3>
    <p className="text-[11px] text-[#78736c] mt-1 max-w-[300px]">{description}</p>
    {actionLabel && onAction && (
      <div className="mt-4">
        <SecondaryButton onClick={onAction}>{actionLabel}</SecondaryButton>
      </div>
    )}
  </div>
);

export default EmptyState;
