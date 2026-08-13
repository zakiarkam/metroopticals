// ========================= AdminDashboard.tsx =========================
"use client";

import React, { useState } from "react";
import DashboardTab from "./tabs/DashboardTab";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import { Button } from "@/components/ui/button";
// import { Search, Download } from "lucide-react";

const AdminDashboard: React.FC = () => {
  // const [searchTerm, setSearchTerm] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("30");

  return (
    <section className="overflow-hidden bg-gray-2 py-5 md:py-7">
      <div className="mx-auto w-full max-w-[1400px] px-3 md:px-4 lg:px-6">
        <div className="space-y-4">
          {/* Header / Controls (compact + responsive) */}
          <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-sm">
            <div className="px-3 py-2 md:px-4 md:py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-body">
                    Overview of performance, orders, and store health.
                  </p>
                  <h2 className="text-base md:text-lg font-semibold text-dark leading-tight">
                    Dashboard
                  </h2>
                </div>

                <div className="flex flex-col gap-2 w-full md:w-auto md:flex-row md:items-center">
                  {/* Search (kept, but compact + full-width on mobile) */}
                  {/* <div className="relative w-full md:w-[260px]">
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      type="text"
                      placeholder="Search…"
                      className="h-9 w-full rounded-lg border border-gray-3 bg-gray-1 pl-9 pr-3 text-xs md:text-sm text-dark placeholder:text-body focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/30"
                    />
                    <Search
                      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body"
                      aria-hidden="true"
                    />
                  </div> */}

                  <Select
                    value={dateRange}
                    onValueChange={(value) => setDateRange(value)}
                  >
                    <SelectTrigger className="h-9 w-full md:w-[190px]">
                      <SelectValue placeholder="Select date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                      <SelectItem value="365">Last 12 months</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Optional export placeholder (kept as UI only) */}
                  {/* <Button
                    type="button"
                    variant="outline"
                    className="h-9 w-full md:w-auto"
                    onClick={() => {}}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button> */}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <DashboardTab dateRange={dateRange} />
        </div>
      </div>
    </section>
  );
};

export default AdminDashboard;
