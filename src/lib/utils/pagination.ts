export type PageItem = number | "...";

type PaginationConfig = {
  currentPage: number;
  totalPages: number;
  maxPagesToShow?: number;
};

export function getTruncatedPageNumbers({
  currentPage,
  totalPages,
  maxPagesToShow = 5,
}: PaginationConfig): PageItem[] {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safeCurrentPage = Math.min(
    Math.max(1, currentPage || 1),
    safeTotalPages
  );
  const safeMaxPages = Math.max(5, maxPagesToShow);

  if (safeTotalPages <= safeMaxPages) {
    return Array.from({ length: safeTotalPages }, (_, i) => i + 1);
  }

  const siblingCount = Math.max(1, Math.floor((safeMaxPages - 3) / 2));
  const leftSiblingIndex = Math.max(safeCurrentPage - siblingCount, 2);
  const rightSiblingIndex = Math.min(
    safeCurrentPage + siblingCount,
    safeTotalPages - 1
  );

  const showLeftDots = leftSiblingIndex > 2;
  const showRightDots = rightSiblingIndex < safeTotalPages - 1;

  const pages: PageItem[] = [1];

  if (showLeftDots) {
    pages.push("...");
  } else {
    for (let i = 2; i < leftSiblingIndex; i++) {
      pages.push(i);
    }
  }

  for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
    pages.push(i);
  }

  if (showRightDots) {
    pages.push("...");
  } else {
    for (let i = rightSiblingIndex + 1; i < safeTotalPages; i++) {
      pages.push(i);
    }
  }

  pages.push(safeTotalPages);

  return pages;
}
