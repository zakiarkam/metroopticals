import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Billing = () => {
  return (
    <div className="">
      <h2 className="font-medium text-dark text-xl sm:text-2xl mb-5.5">
        Billing details
      </h2>

      <div className="bg-gray-2 shadow-1 rounded-[10px] p-4 sm:p-8.5 border border-gray-3">
        <div className="flex flex-col lg:flex-row gap-5 sm:gap-8 mb-5">
          <div className="w-full">
            <label htmlFor="firstName" className="block mb-2.5">
              First Name <span className="text-red">*</span>
            </label>

            <input
              type="text"
              name="firstName"
              id="firstName"
              placeholder="Jhon"
              className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
            />
          </div>

          <div className="w-full">
            <label htmlFor="lastName" className="block mb-2.5">
              Last Name <span className="text-red">*</span>
            </label>

            <input
              type="text"
              name="lastName"
              id="lastName"
              placeholder="Deo"
              className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
            />
          </div>
        </div>

        <div className="mb-5">
          <label htmlFor="companyName" className="block mb-2.5">
            Company Name
          </label>

          <input
            type="text"
            name="companyName"
            id="companyName"
            className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
          />
        </div>

        <div className="mb-5">
          <label htmlFor="countryName" className="block mb-2.5">
            Country/ Region
            <span className="text-red">*</span>
          </label>

          <Select defaultValue="0">
            <SelectTrigger>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Australia</SelectItem>
              <SelectItem value="1">America</SelectItem>
              <SelectItem value="2">England</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mb-5">
          <label htmlFor="address" className="block mb-2.5">
            Street Address
            <span className="text-red">*</span>
          </label>

          <input
            type="text"
            name="address"
            id="address"
            placeholder="House number and street name"
            className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
          />

          <div className="mt-5">
            <input
              type="text"
              name="address"
              id="addressTwo"
              placeholder="Apartment, suite, unit, etc. (optional)"
              className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
            />
          </div>
        </div>

        <div className="mb-5">
          <label htmlFor="town" className="block mb-2.5">
            Town/ City <span className="text-red">*</span>
          </label>

          <input
            type="text"
            name="town"
            id="town"
            className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
          />
        </div>

        <div className="mb-5">
          <label htmlFor="country" className="block mb-2.5">
            Country
          </label>

          <input
            type="text"
            name="country"
            id="country"
            className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
          />
        </div>

        <div className="mb-5">
          <label htmlFor="phone" className="block mb-2.5">
            Phone <span className="text-red">*</span>
          </label>

          <input
            type="text"
            name="phone"
            id="phone"
            className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
          />
        </div>

        <div className="mb-5.5">
          <label htmlFor="email" className="block mb-2.5">
            Email Address <span className="text-red">*</span>
          </label>

          <input
            type="email"
            name="email"
            id="email"
            className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
          />
        </div>

        <div>
          <label
            htmlFor="checkboxLabelTwo"
            className="text-dark flex cursor-pointer select-none items-center"
          >
            <div className="relative">
              <input
                type="checkbox"
                id="checkboxLabelTwo"
                className="sr-only"
              />
              <div className="mr-2 flex h-4 w-4 items-center justify-center rounded border border-gray-4">
                <span className="opacity-0">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="4"
                      y="4.00006"
                      width="16"
                      height="16"
                      rx="4"
                      fill="#C09C6C"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M16.3103 9.25104C16.471 9.41178 16.5612 9.62978 16.5612 9.85707C16.5612 10.0844 16.471 10.3024 16.3103 10.4631L12.0243 14.7491C11.8635 14.9098 11.6455 15.0001 11.4182 15.0001C11.191 15.0001 10.973 14.9098 10.8122 14.7491L8.24062 12.1775C8.08448 12.0158 7.99808 11.7993 8.00003 11.5745C8.00199 11.3498 8.09214 11.1348 8.25107 10.9759C8.41 10.8169 8.62499 10.7268 8.84975 10.7248C9.0745 10.7229 9.29103 10.8093 9.4527 10.9654L11.4182 12.931L15.0982 9.25104C15.2589 9.09034 15.4769 9.00006 15.7042 9.00006C15.9315 9.00006 16.1495 9.09034 16.3103 9.25104Z"
                      fill="white"
                    />
                  </svg>
                </span>
              </div>
            </div>
            Create an Account
          </label>
        </div>
      </div>
    </div>
  );
};

export default Billing;
