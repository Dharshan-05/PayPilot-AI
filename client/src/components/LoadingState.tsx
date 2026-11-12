import React from 'react';

export interface LoadingStateProps {
  rows?: number;
  label?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  rows = 3,
  label = 'Loading content...',
}) => (
  <div className="space-y-3 py-4" aria-busy="true" aria-label={label}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-11 rounded-[12px] bg-[#efe8dc] animate-pulse" />
    ))}
  </div>
);

export default LoadingState;
