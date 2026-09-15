import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange
}) => {
  const [jumpToPage, setJumpToPage] = useState('');

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    if (currentPage > 3) {
      pages.push('...');
    }
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) {
      pages.push('...');
    }
    pages.push(totalPages);
    return pages;
  };

  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpToPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setJumpToPage('');
    }
  };

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col xl:flex-row items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#0B0D14] px-5 py-3 shadow-lg">
      <div className="text-xs text-[#A1A1AA] flex items-center gap-3 w-full xl:w-auto justify-between xl:justify-start">
        <div>
          Showing <span className="font-bold text-white">{startIndex}–{endIndex}</span> of{' '}
          <span className="font-bold text-white">{totalItems}</span> videos
        </div>
        
        {totalPages > 1 && (
          <form onSubmit={handleJumpToPage} className="flex items-center space-x-2">
            <span className="hidden sm:inline">Go to page:</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={jumpToPage}
              onChange={(e) => setJumpToPage(e.target.value)}
              placeholder="#"
              className="w-14 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-center text-white placeholder-[#71717A] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!jumpToPage || isNaN(parseInt(jumpToPage, 10)) || parseInt(jumpToPage, 10) < 1 || parseInt(jumpToPage, 10) > totalPages}
              className="rounded-lg bg-indigo-500 p-1.5 text-white disabled:opacity-50 hover:bg-indigo-400 transition-colors"
            >
              <ArrowRight className="h-3 w-3" />
            </button>
          </form>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center space-x-1 sm:space-x-1.5 bg-white/5 p-1 rounded-xl border border-white/5 w-full xl:w-auto justify-center overflow-x-auto">
          {/* First page button */}
          {totalPages > 4 && (
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="rounded-lg p-2 text-xs font-semibold text-[#A1A1AA] hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
              aria-label="First page"
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          )}

          {/* Previous page button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center space-x-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {/* Dynamic Page numbers */}
          {getPageNumbers().map((p, idx) =>
            p === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-xs text-[#71717A]">
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={`h-8 min-w-[32px] rounded-lg px-2 text-xs font-bold transition-all ${
                  currentPage === p
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                    : 'text-[#A1A1AA] hover:bg-white/10 hover:text-white'
                }`}
              >
                {p}
              </button>
            )
          )}

          {/* Next page button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center space-x-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          {/* Last page button */}
          {totalPages > 4 && (
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="rounded-lg p-2 text-xs font-semibold text-[#A1A1AA] hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
              aria-label="Last page"
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
