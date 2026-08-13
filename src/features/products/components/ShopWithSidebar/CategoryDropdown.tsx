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

          <span className={isChild ? "text-body" : ""}>{category.name}</span>
        </div>

        {productCount > 0 && (
          <span
            className={`inline-flex rounded-[30px] text-custom-xs px-2 ease-out duration-200 group-hover:text-white group-hover:bg-blue ${
              isSelected ? "text-white bg-blue" : "bg-gray-2 text-dark"
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
    <div className="bg-gray-2 shadow-sm rounded-xl border border-gray-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between py-3 px-4 ${open ? "shadow-filter" : ""}`}
      >
        <p className="text-dark font-medium">Category</p>
        <span
          className={`text-dark ease-out duration-200 ${open ? "rotate-180" : ""}`}
        >
          <svg
            className="fill-current"
            width="24"
            height="24"
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

      <div className={`flex-col gap-3 py-4 px-4 ${open ? "flex" : "hidden"}`}>
        {categories.length === 0 ? (
          <p className="text-sm text-gray-400">No categories available</p>
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
                    <div className="ml-5 flex flex-col gap-1 border-l border-gray-2 pl-3">
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
              <div className="space-y-2 border-t border-gray-2 pt-4">
                <p className="text-custom-xs uppercase tracking-wide text-body">
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
