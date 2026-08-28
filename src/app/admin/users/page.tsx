"use client";
import React, { useState } from "react";
import { BookUser, UsersRound } from "lucide-react";
import UsersTab from "@/features/users/components/admin/UsersTab";
import CustomersTab from "@/features/pos/components/CustomersTab";

type View = "accounts" | "customers";

/**
 * Two kinds of people, one screen: accounts that log in to the website, and
 * the customer book  walk-ins billed at the counter, who have no login.
 */
const UsersPage = () => {
  const [view, setView] = useState<View>("accounts");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [dateRange] = useState<string>("30");

  return (
    <section className="overflow-hidden py-4 sm:py-8 bg-gray-2 min-h-screen">
      <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-7.5">
          <div className="flex h-10 w-fit items-center rounded-full border border-gray-3 bg-gray-1 p-1">
            {(
              [
                ["accounts", "Website accounts", UsersRound],
                ["customers", "Customer book", BookUser],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setView(value)}
                className={`flex h-8 items-center gap-2 rounded-full px-4 text-custom-sm font-medium transition ${
                  view === value
                    ? "bg-gray-2 text-blue shadow-1"
                    : "text-body hover:text-dark"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-7.5">
            {view === "accounts" ? (
              <UsersTab
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                dateRange={dateRange}
              />
            ) : (
              <CustomersTab />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default UsersPage;
