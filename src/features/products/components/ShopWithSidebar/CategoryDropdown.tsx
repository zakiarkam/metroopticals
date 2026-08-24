"use client";

import React, { useMemo, useState } from "react";
import { Category } from "@/features/categories/types/category";

interface CategoryDropdownProps {
  categories: Category[];
  selectedCategories: string[];
  onCategoryChange: (slugs: string[]) => void;
}

const CategoryItem = React.memo(function CategoryItem({
  category,
  isSelected,
  onSelect,
  isChild = false,
  hasChildren = false,
  isExpanded = true,
  onToggleExpand,
}: {
  category: Category;
  isSelected: boolean;
  onSelect: () => void;
  isChild?: boolean;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const productCount = category.productCount ?? 0;

  return (
    <div className="flex items-center justify-between w-full gap-1">
      {hasChildren && onToggleExpand && (
        <button
          type="button"
          onClick={onToggleExpand}
          className="p-0.5 hover:text-blue ease-out duration-200 flex-shrink-0"
          aria-label="Toggle brands"
        >
          <svg
            className={`ease-out duration-200 ${isExpanded ? "rotate-180" : ""}`}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M4.43057 8.51192C4.70014 8.19743 5.17361 8.161 5.48811 8.43057L12 14.0122L18.5119 8.43057C18.8264 8.16101 19.2999 8.19743 19.5695 8.51192C19.839 8.82642 19.8026 9.29989 19.4881 9.56946L12.4881 15.5695C12.2072 15.8102 11.7928 15.8102 11.5119 15.5695L4.51192 9.56946C4.19743 9.29989 4.161 8.82641 4.43057 8.51192Z"
              fill="currentColor"
            />
          </svg>
        </button>
      )}
      {!hasChildren && !isChild && <div className="w-5" />}

      <button
        type="button"
        className={`group flex items-center justify-between flex-1 ease-out duration-200 hover:text-blue ${
          isSelected ? "text-blue" : "text-dark"
        } ${isChild ? "text-left text-custom-sm" : "text-left"}`}
        onClick={onSelect}
      >
        <div className="flex items-center gap-1.5">
          <div
            className={`flex items-center justify-center rounded w-4 h-4 border ${
              isSelected ? "border-blue bg-blue" : "bg-gray-2 border-gray-3"
            }`}
          >
            <svg
              className={isSelected ? "block" : "hidden"}
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="none"
            >
              <path
                d="M8.33317 2.5L3.74984 7.08333L1.6665 5"
                stroke="white"
                strokeWidth="1.94437"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <span className={`capitalize ${isChild ? "text-body" : ""}`}>
            {category.name}
          </span>
        </div>

        {productCount > 0 && (
          <span
            className={`text-[11px] font-medium duration-200 ease-out ${
              isSelected ? "text-blue" : "text-dark-5"
            }`}
          >
            {productCount}
          </span>
        )}
      </button>
    </div>
  );
});

export default function CategoryDropdown({
  categories,
  selectedCategories,
  onCategoryChange,
}: CategoryDropdownProps) {
  const [open, setOpen] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(
    new Set(categories.filter((cat) => !cat.parentId).map((cat) => cat.id))
  );

  const toggleCategoryExpand = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const rootCategories = useMemo(
    () => categories.filter((category) => !category.parentId),
    [categories]
  );

  const childrenByParentId = useMemo(() => {
    const map = new Map<number, Category[]>();
    categories.forEach((category) => {
      if (!category.parentId) return;
      const list = map.get(category.parentId) ?? [];
      list.push(category);
      map.set(category.parentId, list);
    });
    return map;
  }, [categories]);

  const parentById = useMemo(() => {
    const map = new Map<number, Category>();
    categories.forEach((category) => {
      map.set(category.id, category);
    });
    return map;
  }, [categories]);

  const orphanBrandies = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.parentId &&
          !categories.some((parent) => parent.id === category.parentId)
      ),
    [categories]
  );

  const handleCategorySelect = (category: Category) => {
    const isParent = !category.parentId;
    const next = new Set(selectedCategories);

    if (isParent) {
      const childSlugs = (childrenByParentId.get(category.id) || []).map(
        (item) => item.slug
      );

      if (next.has(category.slug)) {
        next.delete(category.slug);
        childSlugs.forEach((slug) => next.delete(slug));
      } else {
        childSlugs.forEach((slug) => next.delete(slug));
        next.add(category.slug);
      }

      onCategoryChange(Array.from(next));
      return;
    }

    const parent = category.parentId
      ? parentById.get(category.parentId)
      : undefined;
    const parentSlug = parent?.slug;
    const siblingSlugs = category.parentId
      ? (childrenByParentId.get(category.parentId) || []).map(
          (item) => item.slug
        )
      : [];

    if (parentSlug && next.has(parentSlug)) {
      next.delete(parentSlug);
      siblingSlugs.forEach((slug) => next.delete(slug));
      siblingSlugs
        .filter((slug) => slug !== category.slug)
        .forEach((slug) => next.add(slug));

      onCategoryChange(Array.from(next));
      return;
    }

    if (next.has(category.slug)) {
      next.delete(category.slug);
    } else {
      next.add(category.slug);
    }

    onCategoryChange(Array.from(next));
  };

  return (
    <div className="rounded-2xl border border-gray-3 bg-gray-2 px-4 shadow-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group flex w-full items-center justify-between py-4"
      >
        <p className="text-[13.5px] font-bold uppercase tracking-[0.1em] text-dark">
          Category
        </p>
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-gray-3 text-dark-4 transition-colors group-hover:border-blue group-hover:text-blue">
          <svg
            className={`fill-current duration-200 ease-out ${open ? "rotate-180" : ""}`}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M4.43057 8.51192C4.70014 8.19743 5.17361 8.161 5.48811 8.43057L12 14.0122L18.5119 8.43057C18.8264 8.16101 19.2999 8.19743 19.5695 8.51192C19.839 8.82642 19.8026 9.29989 19.4881 9.56946L12.4881 15.5695C12.2072 15.8102 11.7928 15.8102 11.5119 15.5695L4.51192 9.56946C4.19743 9.29989 4.161 8.82641 4.43057 8.51192Z"
              fill=""
            />
          </svg>
        </span>
      </button>

      <div
        className={`flex-col gap-2.5 border-t border-gray-3 py-4 ${
          open ? "flex" : "hidden"
        }`}
      >
        {categories.length === 0 ? (
          <p className="text-[13px] text-dark-5">No categories available</p>
        ) : (
          <>
            {rootCategories.map((category) => {
              const brands = categories.filter(
                (item) => item.parentId === category.id
              );
              const isExpanded = expandedCategories.has(category.id);

              return (
                <div key={category.id} className="space-y-2">
                  <CategoryItem
                    category={category}
                    isSelected={selectedCategories.includes(category.slug)}
                    onSelect={() => handleCategorySelect(category)}
                    hasChildren={brands.length > 0}
                    isExpanded={isExpanded}
                    onToggleExpand={() => toggleCategoryExpand(category.id)}
                  />

                  {brands.length > 0 && isExpanded && (
                    <div className="ml-5 flex flex-col gap-1 border-l border-gray-3 pl-3">
                      {brands.map((sub) => {
                        const isSelected =
                          selectedCategories.includes(sub.slug) ||
                          selectedCategories.includes(category.slug);

                        return (
                          <CategoryItem
                            key={sub.id}
                            category={sub}
                            isSelected={isSelected}
                            onSelect={() => handleCategorySelect(sub)}
                            isChild
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {orphanBrandies.length > 0 && (
              <div className="space-y-2 border-t border-gray-3 pt-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-dark-5">
                  Brands
                </p>
                {orphanBrandies.map((sub) => (
                  <CategoryItem
                    key={sub.id}
                    category={sub}
                    isSelected={selectedCategories.includes(sub.slug)}
                    onSelect={() => handleCategorySelect(sub)}
                    isChild
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
