"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Archive, Inbox, Loader2, Mail, MailOpen, MessageCircle, Phone, Search } from "lucide-react";
import axiosInstance from "@/lib/axiosInstance";
import { Input } from "@/components/ui/input";
import Pagination from "@/components/ui/pagination";
import { Toast } from "@/lib/utils/toast";

type Message = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  status: "unread" | "read" | "archived";
  createdAt: string;
};

type Filter = "all" | "unread" | "read" | "archived";

const whatsappHref = (phone?: string | null) => {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits.startsWith("94") ? digits : `94${digits.replace(/^0+/, "")}`}`;
};

/**
 * Enquiries from the contact form, so an email outage can never lose one.
 * Opening a message marks it read; archive tidies it away without deleting.
 */
const MessagesTab: React.FC = () => {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Message[]>([]);
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const limit = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/admin/messages", {
        params: { page, limit, status: filter, search: debounced || undefined },
      });
      const data = response.data?.data ?? response.data;
      setRows(data.messages ?? []);
      setUnread(data.unread ?? 0);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch (error: any) {
      Toast.error(error?.response?.data?.message || "Messages could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [page, filter, debounced]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (message: Message, status: Message["status"]) => {
    try {
      await axiosInstance.patch(`/admin/messages/${message.id}`, { status });
      setRows((current) =>
        current.map((row) => (row.id === message.id ? { ...row, status } : row)),
      );
      if (message.status === "unread" && status !== "unread") setUnread((n) => Math.max(0, n - 1));
      if (message.status !== "unread" && status === "unread") setUnread((n) => n + 1);
    } catch (error: any) {
      Toast.error(error?.response?.data?.message || "That change could not be saved");
    }
  };

  const open = (message: Message) => {
    setOpenId((current) => (current === message.id ? null : message.id));
    if (message.status === "unread") void setStatus(message, "read");
  };

  return (
    <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-1">
      <div className="flex flex-wrap items-center gap-4 border-b border-gray-3 px-5 py-4">
        <div>
          <h3 className="flex items-center gap-2 text-custom-lg font-semibold text-dark">
            <Inbox className="h-4 w-4 text-blue" />
            Messages
          </h3>
          <p className="text-custom-xs text-body">
            {unread === 0 ? "Nothing unread" : `${unread} unread`} · {total} in this view
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, email or words"
              className="h-8 w-60 pl-10 text-custom-sm"
              aria-label="Search messages"
            />
          </div>
          <div className="flex h-8 items-center rounded-full border border-gray-3 bg-gray-1 p-1">
            {(["all", "unread", "read", "archived"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setFilter(value);
                  setPage(1);
                }}
                className={`h-7 rounded-full px-3 text-custom-xs font-medium capitalize transition ${
                  filter === value ? "bg-gray-2 text-blue shadow-1" : "text-body hover:text-dark"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 px-5 py-12 text-custom-sm text-body">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading messages…
        </div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-12 text-center text-custom-sm text-body">
          {filter === "unread" ? "Everything has been read." : "No messages here."}
        </div>
      ) : (
        <ul className="divide-y divide-gray-2">
          {rows.map((message) => {
            const isOpen = openId === message.id;
            const wa = whatsappHref(message.phone);
            return (
              <li key={message.id} className={message.status === "unread" ? "bg-blue-light-5/40" : ""}>
                <button
                  type="button"
                  onClick={() => open(message)}
                  className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-gray-1"
                >
                  <span className="mt-0.5 shrink-0 text-body">
                    {message.status === "unread" ? (
                      <Mail className="h-4 w-4 text-blue" />
                    ) : message.status === "archived" ? (
                      <Archive className="h-4 w-4" />
                    ) : (
                      <MailOpen className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-3">
                      <span className={`text-custom-sm ${message.status === "unread" ? "font-semibold text-dark" : "font-medium text-dark"}`}>
                        {message.name}
                      </span>
                      <span className="text-custom-xs text-body">{message.email}</span>
                      <span className="ml-auto text-custom-xs text-body">
                        {new Date(message.createdAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-custom-sm text-dark">
                      {message.subject || "(no subject)"}
                    </span>
                    {!isOpen && (
                      <span className="mt-0.5 block truncate text-custom-xs text-body">
                        {message.message}
                      </span>
                    )}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-2 bg-gray-1 px-5 py-4 pl-[52px]">
                    <p className="whitespace-pre-wrap text-custom-sm leading-relaxed text-dark">
                      {message.message}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <a
                        href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject || "your enquiry"}`)}`}
                        className="flex h-8 items-center gap-1.5 rounded-lg bg-blue px-3 text-custom-xs font-semibold text-white transition hover:bg-blue-dark"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Reply by email
                      </a>
                      {message.phone && (
                        <a
                          href={`tel:${message.phone}`}
                          className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-3 bg-gray-2 px-3 text-custom-xs font-medium text-dark transition hover:bg-gray-3"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {message.phone}
                        </a>
                      )}
                      {wa && (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-8 items-center gap-1.5 rounded-lg border border-green/30 bg-green-light-6 px-3 text-custom-xs font-medium text-green transition hover:bg-green-light-5"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                        </a>
                      )}
                      <span className="ml-auto flex items-center gap-2">
                        {message.status !== "unread" && (
                          <button
                            type="button"
                            onClick={() => setStatus(message, "unread")}
                            className="text-custom-xs font-medium text-body hover:text-dark"
                          >
                            Mark unread
                          </button>
                        )}
                        {message.status !== "archived" ? (
                          <button
                            type="button"
                            onClick={() => setStatus(message, "archived")}
                            className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-3 bg-gray-2 px-3 text-custom-xs font-medium text-dark transition hover:bg-gray-3"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            Archive
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setStatus(message, "read")}
                            className="text-custom-xs font-medium text-body hover:text-dark"
                          >
                            Restore
                          </button>
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="border-t border-gray-3 px-5 py-4">
          <Pagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={limit} onPageChange={setPage} showItemsPerPage={false} />
        </div>
      )}
    </div>
  );
};

export default MessagesTab;
