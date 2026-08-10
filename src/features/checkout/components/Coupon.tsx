import React from "react";

const Coupon = () => {
  return (
    <div className="bg-white shadow-1 rounded-[10px] mt-7.5">
      <div className="border-b border-gray-3 py-5 px-4 sm:px-8.5">
        <h3 className="font-medium text-xl text-dark">Have any Coupon Code?</h3>
      </div>

      <div className="py-8 px-4 sm:px-8.5">
        <div className="flex gap-4">
          <input
            type="text"
            name="coupon"
            id="coupon"
            placeholder="Enter coupon code"
            className="rounded-lg border-2 border-gray-200 bg-white placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
          />

          <button
            type="submit"
            className="inline-flex font-medium text-white bg-blue py-3 px-6 rounded-md ease-out duration-200 hover:bg-blue-dark"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default Coupon;
