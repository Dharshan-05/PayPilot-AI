import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}) => (
  <div className="flex items-center justify-between pt-3 border-t border-[#efe9de] text-[11px] text-[#6a665f]">
    <span>
      Showing page <strong className="text-[#1c1b19]">{currentPage}</strong> of{' '}
      <strong className="text-[#1c1b19]">{Math.max(1, totalPages)}</strong> ({totalItems} records)
    </span>
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="h-[28px] px-2.5 rounded-full bg-[#f4efe5] hover:bg-[#ebe4d8] disabled:opacity-40 border border-[#dfd8cd] text-[#1c1b19] font-medium flex items-center gap-1 cursor-pointer"
      >
        <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
        Prev
      </button>
      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="h-[28px] px-2.5 rounded-full bg-[#f4efe5] hover:bg-[#ebe4d8] disabled:opacity-40 border border-[#dfd8cd] text-[#1c1b19] font-medium flex items-center gap-1 cursor-pointer"
      >
        Next
        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  </div>
);

export default Pagination;
