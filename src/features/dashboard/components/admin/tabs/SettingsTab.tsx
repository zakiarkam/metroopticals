"use client";
import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SettingsTab: React.FC = () => {
  const [storeOpen, setStoreOpen] = useState(true);
  const [autoCapture, setAutoCapture] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);
  const [reviewAutoPublish, setReviewAutoPublish] = useState(false);

  return (
    <div className="space-y-7.5">
      <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-1">
        <div className="border-b border-gray-3 px-5 py-4">
          <h3 className="text-custom-lg font-semibold text-dark">
            Store preferences
          </h3>
          <p className="text-custom-xs text-body">
            Configure core storefront options, checkout, and customer
            experience.
          </p>
        </div>

        <div className="space-y-5 p-5 text-custom-sm text-dark">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Storefront status</p>
              <p className="text-custom-xs text-body">
                Toggle to temporarily disable ordering while keeping the site
                visible.
              </p>
            </div>
            <label className="inline-flex items-center gap-3">
              <span className="text-custom-xs text-body">
                {storeOpen ? "Live" : "Paused"}
              </span>
              <input
                type="checkbox"
                className="h-5 w-10 cursor-pointer accent-blue"
                checked={storeOpen}
                onChange={(event) => setStoreOpen(event.target.checked)}
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-gray-3 pt-5">
            <div>
              <p className="font-medium">Automatic payment capture</p>
              <p className="text-custom-xs text-body">
                Capture payments automatically once an order is placed.
              </p>
            </div>
            <label className="inline-flex items-center gap-3">
              <span className="text-custom-xs text-body">
                {autoCapture ? "Enabled" : "Manual"}
              </span>
              <input
                type="checkbox"
                className="h-5 w-10 cursor-pointer accent-blue"
                checked={autoCapture}
                onChange={(event) => setAutoCapture(event.target.checked)}
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-gray-3 pt-5">
            <div>
              <p className="font-medium">Review auto-publish</p>
              <p className="text-custom-xs text-body">
                Automatically publish product reviews meeting moderation rules.
              </p>
            </div>
            <label className="inline-flex items-center gap-3">
              <span className="text-custom-xs text-body">
                {reviewAutoPublish ? "Enabled" : "Requires approval"}
              </span>
              <input
                type="checkbox"
                className="h-5 w-10 cursor-pointer accent-blue"
                checked={reviewAutoPublish}
                onChange={(event) => setReviewAutoPublish(event.target.checked)}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-1">
        <div className="border-b border-gray-3 px-5 py-4">
          <h3 className="text-custom-lg font-semibold text-dark">
            Notification channels
          </h3>
          <p className="text-custom-xs text-body">
            Decide how your team stays informed about critical events.
          </p>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-3 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-dark">Email alerts</p>
                <p className="text-custom-xs text-body">
                  Send order updates and weekly performance summaries.
                </p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 accent-blue"
                checked={emailNotifications}
                onChange={(event) =>
                  setEmailNotifications(event.target.checked)
                }
              />
            </div>
            <div className="space-y-3 text-custom-xs text-body">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-blue"
                  defaultChecked
                />
                Daily digest
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-blue"
                  defaultChecked
                />
                Low inventory alerts
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="h-4 w-4 accent-blue" />
                Promotion approvals
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-gray-3 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-dark">SMS / Push</p>
                <p className="text-custom-xs text-body">
                  Real-time alerts for escalations and VIP orders.
                </p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 accent-blue"
                checked={smsNotifications}
                onChange={(event) => setSmsNotifications(event.target.checked)}
              />
            </div>
            <div className="space-y-3 text-custom-xs text-body">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-blue"
                  defaultChecked
                />
                Critical order delays
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="h-4 w-4 accent-blue" />
                High value purchase alerts
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="h-4 w-4 accent-blue" />
                Fraud review required
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-1">
        <div className="border-b border-gray-3 px-5 py-4">
          <h3 className="text-custom-lg font-semibold text-dark">
            Checkout & policy
          </h3>
          <p className="text-custom-xs text-body">
            Fine-tune customer checkout, tax, and policy visibility.
          </p>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-custom-sm text-dark">
              Checkout message
              <input
                type="text"
                defaultValue="Free carbon-neutral shipping over Rs 120."
                className="rounded-lg border border-gray-3 bg-gray-1 px-4 py-2.5 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
              />
            </label>

            <label className="flex flex-col gap-2 text-custom-sm text-dark">
              Tax region defaults
              <Select defaultValue="United States">
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="United States">United States</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                  <SelectItem value="European Union">European Union</SelectItem>
                  <SelectItem value="Australia">Australia</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-custom-sm text-dark">
              Return policy URL
              <input
                type="url"
                defaultValue="https://yourstore.com/policies/returns"
                className="rounded-lg border border-gray-3 bg-gray-1 px-4 py-2.5 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
              />
            </label>
            <label className="flex flex-col gap-2 text-custom-sm text-dark">
              Support email
              <input
                type="email"
                defaultValue="support@yourstore.com"
                className="rounded-lg border border-gray-3 bg-gray-1 px-4 py-2.5 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-1">
        <div className="border-b border-gray-3 px-5 py-4">
          <h3 className="text-custom-lg font-semibold text-dark">
            Security controls
          </h3>
          <p className="text-custom-xs text-body">
            Keep your admin secure with session limits and multi-factor auth.
          </p>
        </div>

        <div className="space-y-5 p-5 text-custom-sm text-dark">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Two-factor authentication</p>
              <p className="text-custom-xs text-body">
                Require OTP verification for all administrator sign-ins.
              </p>
            </div>
            <label className="inline-flex items-center gap-3">
              <span className="text-custom-xs text-body">
                {twoFactor ? "Required" : "Optional"}
              </span>
              <input
                type="checkbox"
                className="h-5 w-10 cursor-pointer accent-blue"
                checked={twoFactor}
                onChange={(event) => setTwoFactor(event.target.checked)}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-custom-sm text-dark">
              Session timeout
              <Select defaultValue="30 minutes">
                <SelectTrigger>
                  <SelectValue placeholder="Select timeout" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30 minutes">30 minutes</SelectItem>
                  <SelectItem value="1 hour">1 hour</SelectItem>
                  <SelectItem value="4 hours">4 hours</SelectItem>
                  <SelectItem value="24 hours">24 hours</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label className="flex flex-col gap-2 text-custom-sm text-dark">
              Admin invitations expire
              <Select defaultValue="7 days">
                <SelectTrigger>
                  <SelectValue placeholder="Select expiry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7 days">7 days</SelectItem>
                  <SelectItem value="14 days">14 days</SelectItem>
                  <SelectItem value="30 days">30 days</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <button className="inline-flex items-center gap-2 rounded-lg border border-blue bg-blue px-5 py-2.5 text-custom-sm font-medium text-white transition hover:bg-blue-dark">
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4.16669 10H15.8334"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M10 4.16666L15.8333 9.99999L10 15.8333"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
