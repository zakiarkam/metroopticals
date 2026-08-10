"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import AddAdvertisementDialog from "./modals/AddAdvertisementDialog";
import DeleteAlertDialog from "@/components/modals/DeleteAlertDialog";
import Pagination from "@/components/ui/pagination";
import { deleteAdvertisement } from "@/features/advertisements/api/advertisement-api";
import { Advertisement, AdvertisementPlacement } from "@/features/advertisements/types/advertisement";
import { Toast } from "@/lib/utils/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import EditAdvertisementDialog from "./modals/EditAdvertisementDialog";
import AdvertisementStatusDialog from "./modals/AdvertisementStatusDialog";
import { useGetAdvertisementsQuery } from "@/store/services/api";

type PlacementFilterValue = "all" | AdvertisementPlacement;

type AdvertisementsTabProps = {
  dateRange: string;
};

function truncate15(text?: string | null) {
  const s = (text || "").trim();
  if (!s) return "";
  return s.length > 20 ? `${s.slice(0, 20)}…` : s;
}

const AdvertisementsTab: React.FC<AdvertisementsTabProps> = ({ dateRange }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [searchTerm, setSearchTerm] = useState("");
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [placementFilter, setPlacementFilter] =
    useState<PlacementFilterValue>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adToDelete, setAdToDelete] = useState<Advertisement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(localSearchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [localSearchTerm]);

  const queryParams = useMemo(
    () => ({
      search: searchTerm,
      page: currentPage,
      limit,
      status: statusFilter === "all" ? undefined : statusFilter,
      placement: placementFilter === "all" ? undefined : placementFilter,
    }),
    [searchTerm, currentPage, limit, statusFilter, placementFilter]
  );

  const {
    data: cachedAds,
    isLoading,
    error,
    refetch: refetchAds,
  } = useGetAdvertisementsQuery(queryParams, { refetchOnFocus: true });

  const advertisements = cachedAds?.advertisements || [];
  const totalPages = cachedAds?.pagination.totalPages || 1;
  const totalAds = cachedAds?.pagination.total || 0;

  useEffect(() => {
    if (!error) return;
    const message =
      (error as any)?.data?.message ||
      (error as any)?.data ||
      (error as any)?.error ||
      "Failed to load advertisements";
    Toast.error(message);
  }, [error]);

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
  };

  const handleEditClick = (ad: Advertisement) => {
    setSelectedAd(ad);
    setIsEditDialogOpen(true);
  };

  const handleStatusClick = (ad: Advertisement) => {
    setSelectedAd(ad);
    setIsStatusDialogOpen(true);
  };

  const handleAdsChanged = useCallback(() => {
    refetchAds();
  }, [refetchAds]);

  const handleDeleteClick = (ad: Advertisement) => {
    setAdToDelete(ad);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!adToDelete) return;

    setIsDeleting(true);
    const toastId = Toast.loading(`Deleting "${adToDelete.title}"...`);

    try {
      await deleteAdvertisement(adToDelete.id);

      Toast.update(toastId, {
        render: "Advertisement deleted successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });

      handleAdsChanged();
      setDeleteDialogOpen(false);
      setAdToDelete(null);
    } catch (error: any) {
      console.error("Failed to delete advertisement:", error);

      Toast.update(toastId, {
        render:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to delete advertisement. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getPlacementBadge = (placement: string) => {
    const badges: Record<string, string> = {
      hero: "bg-blue-light-5 text-blue border border-blue/20",
      promobanner: "bg-green-light-5 text-green border border-green/20",
      countdown: "bg-orange-light-5 text-orange border border-orange/20",
    };
    return badges[placement] || "bg-gray-2 text-dark-3 border border-gray-3";
  };

  const getStatusPill = (status: string) => {
    return status === "active"
      ? "bg-green-light-6 text-green border border-green/20 hover:bg-green-light-5"
      : "bg-gray-2 text-dark-3 border border-gray-3 hover:bg-gray-3";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Responsive controls: stack vertically on mobile, horizontally on md+
  return (
    <div className="space-y-7.5">
      <div className="rounded-xl border border-gray-3 bg-white shadow-1">
        <div className="flex flex-wrap items-center gap-4 border-b border-gray-3 px-5 py-4">
          <div>
            <h3 className="text-custom-lg font-semibold text-dark">
              Advertisements
            </h3>
            <p className="text-custom-xs text-body">{totalAds} total ads</p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Input
                type="text"
                placeholder="Search ads..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="h-8 w-64 pl-10"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-body pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Status Filter */}
            <div className="flex h-8 items-center rounded-full border border-gray-3 bg-gray-1 p-1">
              {["all", "active", "inactive"].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatusFilter(filter as typeof statusFilter)}
                  className={`h-7 rounded-full px-3 text-custom-xs font-medium transition ${
                    statusFilter === filter
                      ? "bg-white text-blue shadow-1"
                      : "text-body hover:text-dark"
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            {/* Placement Filter */}
            <Select
              value={placementFilter}
              onValueChange={(value) =>
                setPlacementFilter(value as PlacementFilterValue)
              }
            >
              <SelectTrigger className="w-[150px] h-8">
                <SelectValue placeholder="All Placements" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Placements</SelectItem>
                <SelectItem value="hero">Hero</SelectItem>
                <SelectItem value="promobanner">Promo Banner</SelectItem>
                <SelectItem value="countdown">Countdown</SelectItem>
              </SelectContent>
            </Select>

            <Button
              className="h-8 bg-blue hover:bg-blue-dark"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 4V16"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M4 10H16"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Add Advertisement
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[600px] md:min-w-[1100px]">
            <div className="grid grid-cols-[80px_2fr_1fr_1fr_120px_100px_100px_120px] gap-4 border-b border-gray-3 px-3 md:px-5 py-3 text-custom-xs uppercase text-body tracking-wide">
              <span>Image</span>
              <span>Title</span>
              <span>Placement</span>
              <span>Period</span>
              <span>Priority</span>
              <span>Stats</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            {isLoading && advertisements.length === 0 ? (
              <div className="px-3 md:px-5 py-10 text-center text-custom-sm text-body">
                Loading advertisements...
              </div>
            ) : advertisements.length === 0 ? (
              <div className="px-3 md:px-5 py-10 text-center text-custom-sm text-body">
                No advertisements found. Create your first ad to get started.
              </div>
            ) : (
              advertisements.map((ad) => {
                const product = ad.product;
                const hasDiscount =
                  typeof product?.discountedPrice === "number" &&
                  product.discountedPrice < product.price;
                const displayPrice = product
                  ? hasDiscount
                    ? product.discountedPrice ?? product.price
                    : product.price
                  : undefined;
                const displayTitle = truncate15(product?.title || ad.title);
                const displayLink = ad.link ? truncate15(ad.link) : "";

                return (
                  <div
                    key={ad.id}
                    className="grid grid-cols-[80px_2fr_1fr_1fr_120px_100px_100px_120px] gap-4 px-3 md:px-5 py-4 text-custom-sm border-b border-gray-2 last:border-0 items-center hover:bg-gray-1 transition"
                  >
                    <div className="relative h-12 w-16 rounded-md overflow-hidden bg-gray-2">
                      <Image
                        src={ad.imageUrl}
                        alt={ad.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-dark truncate">
                        {displayTitle}
                      </p>
                      {displayPrice && (
                        <p className="text-custom-xs text-body">
                          Rs {displayPrice.toLocaleString()}
                          {hasDiscount && product && (
                            <span className="ml-2 text-[10px] text-dark-4 line-through">
                              Rs {product.price.toLocaleString()}
                            </span>
                          )}
                        </p>
                      )}
                      {ad.link && (
                        <a
                          href={ad.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-custom-xs text-blue hover:underline truncate block"
                        >
                          {displayLink}
                        </a>
                      )}
                    </div>
                    <div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-custom-xs font-medium capitalize ${getPlacementBadge(
                          ad.placement
                        )}`}
                      >
                        {ad.placement}
                      </span>
                      <p className="text-custom-xs text-body mt-1">
                        Slot {ad.slot ?? 1}
                      </p>
                    </div>
                    <div className="text-custom-xs text-body">
                      <p>{formatDate(ad.startDate)}</p>
                      <p>to {formatDate(ad.endDate)}</p>
                    </div>
                    <div className="text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-blue-light-5 px-3 py-1 text-custom-sm font-semibold text-blue">
                        {ad.priority}
                      </span>
                    </div>
                    <div className="text-custom-xs">
                      <p className="text-body">
                        Views:{" "}
                        <span className="text-dark font-medium">
                          {ad.viewCount}
                        </span>
                      </p>
                      <p className="text-body">
                        Clicks:{" "}
                        <span className="text-dark font-medium">
                          {ad.clickCount}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-custom-xs font-medium capitalize transition items-center gap-1 group min-h-[24px] border-0 ${getStatusPill(
                          ad.status
                        )}`}
                        title="Click to change status"
                        onClick={() => handleStatusClick(ad)}
                      >
                        <span>{ad.status}</span>
                        <svg
                          className="h-3 w-3 transition"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M4 6L8 10L12 6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-blue hover:bg-blue-50 hover:text-blue-dark transition h-8 w-8"
                        title="Edit"
                        onClick={() => handleEditClick(ad)}
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M14.166 2.5C14.3849 2.28113 14.6447 2.10752 14.9307 1.98906C15.2167 1.87061 15.5232 1.80957 15.8327 1.80957C16.1422 1.80957 16.4487 1.87061 16.7347 1.98906C17.0206 2.10752 17.2805 2.28113 17.4993 2.5C17.7182 2.71887 17.8918 2.97871 18.0103 3.26468C18.1287 3.55064 18.1898 3.85714 18.1898 4.16667C18.1898 4.47619 18.1287 4.78269 18.0103 5.06866C17.8918 5.35462 17.7182 5.61446 17.4993 5.83333L6.24935 17.0833L1.66602 18.3333L2.91602 13.75L14.166 2.5Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red hover:bg-red-50 hover:text-red-dark transition h-8 w-8"
                        title="Delete"
                        onClick={() => handleDeleteClick(ad)}
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M2.5 5H4.16667H17.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M15.8333 5V16.6667C15.8333 17.5 15 18.3333 14.1667 18.3333H5.83333C5 18.3333 4.16667 17.5 4.16667 16.6667V5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pagination */}
        {!isLoading && advertisements.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalAds}
            itemsPerPage={limit}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={handleLimitChange}
            showItemsPerPage={true}
            itemsPerPageOptions={[6, 12, 24, 48, 96]}
          />
        )}
      </div>

      <AddAdvertisementDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={handleAdsChanged}
      />

      <EditAdvertisementDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedAd(null);
        }}
        onSuccess={handleAdsChanged}
        advertisement={selectedAd}
      />

      <AdvertisementStatusDialog
        isOpen={isStatusDialogOpen}
        onClose={() => {
          setIsStatusDialogOpen(false);
          setSelectedAd(null);
        }}
        onSuccess={handleAdsChanged}
        advertisementId={selectedAd?.id || null}
        advertisementTitle={selectedAd?.title || ""}
        currentStatus={selectedAd?.status || "inactive"}
      />

      <DeleteAlertDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setAdToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Advertisement"
        description="Are you sure you want to delete this advertisement? This action cannot be undone."
        itemName={adToDelete?.title}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default AdvertisementsTab;
