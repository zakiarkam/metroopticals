"use client";
import React, { useMemo } from "react";
import Image from "next/image";
import { Order } from "@/features/orders/types/order";
import { siteConfig } from "@/config/site";

interface OrderReceiptProps {
  order: Order;
  companyInfo?: {
    name: string;
    logo?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  footerText?: string;
  itemsPerPage?: number;
}

const OrderReceipt = React.forwardRef<HTMLDivElement, OrderReceiptProps>(
  ({ order, companyInfo, footerText, itemsPerPage = 8 }, ref) => {
    const defaultCompanyInfo = {
      name: "Metro Opticals",
      address: "No 1, Main Street, Colombo, Sri Lanka.",
      phone: "011 234 5678",
      email: "hello@metroopticals.lk",
      website: "metroopticals.lk",
      logo: "/images/logo/logo.png",
      ...companyInfo,
    };

    const formatPrice = (price: number) => {
      return `Rs ${new Intl.NumberFormat("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price)}`;
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const formatPaymentMethod = (value?: string | null) =>
      (value || "").replace(/_/g, " ").toUpperCase();

    const isBankTransfer =
      (order.paymentMethod || "").toLowerCase().replace(/_/g, " ") ===
      "bank transfer";

    const formatPhoneHref = (phone: string) =>
      `tel:${phone.replace(/[^\d+]/g, "")}`;

    const formatEmailHref = (email: string) => `mailto:${email}`;

    const formatSingleLineAddress = (
      name: string,
      address: string,
      city: string,
      postal: string,
      country: string,
      phone: string,
      email: string
    ) => {
      return (
        <>
          {name} | {address}, {city} {postal}, {country} |{" "}
          <a
            href={formatPhoneHref(phone)}
            className="text-inherit no-underline hover:underline"
          >
            {phone}
          </a>{" "}
          |{" "}
          <a
            href={formatEmailHref(email)}
            className="text-inherit no-underline hover:underline"
          >
            {email}
          </a>
        </>
      );
    };

    // Calculate totals
    const calculateDiscount = (item: any) => {
      if (item.discountedPrice && item.price) {
        return (item.price - item.discountedPrice) * item.quantity;
      }
      return 0;
    };

    const totalDiscount = order.items.reduce(
      (sum: number, item: any) => sum + calculateDiscount(item),
      0
    );

    // Paginate items
    const pages = useMemo(() => {
      const pageArray = [];
      for (let i = 0; i < order.items.length; i += itemsPerPage) {
        pageArray.push(order.items.slice(i, i + itemsPerPage));
      }
      return pageArray.length > 0 ? pageArray : [[]];
    }, [order.items, itemsPerPage]);

    const bankingDetailsLines = (
      <div className="banking-lines">
        <div>{siteConfig.banking.accountName}</div>
        <div>Account Number: {siteConfig.banking.accountNumber}</div>
        <div>Bank: {siteConfig.banking.bank}</div>
        <div>Branch: {siteConfig.banking.branch}</div>
      </div>
    );

    return (
      <>
        <style jsx global>{`
          @media print {
            @page {
              size: A5 landscape;
              margin: 8mm;
            }

            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
              margin: 0 !important;
              padding: 0 !important;
            }

            .no-print {
              display: none !important;
            }

            .receipt-container {
              width: 100%;
              margin: 0;
              padding: 0;
              background: white;
            }

            .print-page {
              page-break-after: always;
              width: 100%;
              display: flex;
              flex-direction: column;
              min-height: 100vh;
            }

            .print-page:last-child {
              page-break-after: avoid;
            }

            .page-header {
              flex-shrink: 0;
            }

            .page-content {
              flex-grow: 1;
            }

            .page-footer {
              flex-shrink: 0;
              margin-top: auto;
            }
          }

          @media screen {
            .receipt-container {
              max-width: 210mm;
              background: white;
              margin: 0 auto;
            }

            .print-page {
              background: white;
              padding: 15px;
              margin-bottom: 20px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
          }

          .receipt-container {
            font-family:
              -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 8pt;
            line-height: 1.3;
            color: #000;
          }

          .header-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 6px;
            margin-bottom: 6px;
            border-bottom: 1.5px solid #000;
          }

          .company-block {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
          }

          .company-logo {
            width: 50px;
            height: 50px;
            flex-shrink: 0;
          }

          .company-details h1 {
            font-size: 14pt;
            font-weight: 700;
            margin: 0 0 2px 0;
            color: #000;
          }

          .company-details p {
            font-size: 7pt;
            margin: 1px 0;
            color: #333;
          }

          .receipt-header-info {
            text-align: right;
            flex-shrink: 0;
          }

          .receipt-header-info h2 {
            font-size: 16pt;
            font-weight: 700;
            margin: 0 0 3px 0;
            color: #000;
          }

          .receipt-header-info p {
            font-size: 7pt;
            margin: 1px 0;
            color: #333;
          }

          .address-section {
            margin-bottom: 6px;
          }

          .address-row {
            font-size: 7pt;
            line-height: 1.5;
            color: #000;
            padding: 2px 0;
          }

          .address-label {
            font-weight: 700;
            text-transform: uppercase;
            font-size: 7.5pt;
            margin-right: 6px;
            letter-spacing: 0.3px;
          }

          .address-content {
            color: #000;
          }

          /* ✅ Ensures banking details are multi-line */
          .banking-lines div {
            display: block;
            margin-top: 1px;
          }

          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
          }

          .items-table thead {
            background: white;
            border-bottom: 1px solid #666;
            position: relative;
          }

          .items-table th {
            padding: 4px 6px;
            font-size: 7.5pt;
            font-weight: 700;
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            color: #000;
          }

          .items-table th:first-child {
            width: 20px;
            text-align: center;
          }

          .items-table th:nth-child(3) {
            width: 75px;
          }

          .items-table th:nth-child(4) {
            width: 35px;
            text-align: center;
          }

          .items-table th:nth-child(5),
          .items-table th:nth-child(6),
          .items-table th:nth-child(7),
          .items-table th:nth-child(8) {
            width: 60px;
            text-align: right;
          }

          .items-table tbody tr {
            border-bottom: 1px solid #e8e8e8;
          }

          .items-table tbody tr:last-child {
            border-bottom: 1px solid #666;
          }

          .items-table td {
            padding: 4px 6px;
            font-size: 7pt;
            color: #000;
          }

          .items-table td:first-child {
            text-align: center;
            color: #666;
            font-weight: 500;
          }

          .items-table .product-title {
            font-weight: 600;
            color: #000;
            font-size: 7.5pt;
          }

          .items-table .category {
            color: #555;
            font-size: 6.5pt;
          }

          .items-table td:nth-child(4) {
            text-align: center;
            font-weight: 600;
          }

          .items-table td:nth-child(5),
          .items-table td:nth-child(6),
          .items-table td:nth-child(7),
          .items-table td:nth-child(8) {
            text-align: right;
            font-size: 7pt;
          }

          .items-table td:nth-child(8) {
            font-weight: 700;
          }

          .items-table .discount-amount {
            color: #c00;
          }

          .summary-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 6px;
          }

          .payment-methods {
            display: flex;
            flex-direction: column;
            gap: 3px;
            flex: 1;
          }

          .method-box {
            font-size: 7pt;
            color: #000;
          }

          .method-box strong {
            color: #000;
            text-transform: uppercase;
            font-size: 7.5pt;
            font-weight: 700;
            margin-right: 4px;
          }

          .totals-section {
            width: 200px;
          }

          .totals-table {
            width: 100%;
            border-collapse: collapse;
          }

          .totals-table tr {
            border-bottom: 1px solid #e8e8e8;
          }

          .totals-table tr.total-row {
            border-top: 1.5px solid #000;
            border-bottom: none;
          }

          .totals-table td {
            padding: 3px 8px;
            font-size: 7.5pt;
          }

          .totals-table td:first-child {
            text-align: left;
            color: #333;
          }

          .totals-table td:last-child {
            text-align: right;
            font-weight: 600;
            color: #000;
          }

          .totals-table tr.total-row td {
            padding: 5px 8px;
            font-size: 9pt;
            font-weight: 700;
            color: #000;
            background: #f5f5f5;
          }

          .totals-table .discount-row td {
            color: #c00;
          }

          .notes-section {
            margin-bottom: 6px;
            font-size: 7pt;
            padding: 3px 0;
            border-top: 1px solid #e8e8e8;
            padding-top: 4px;
          }

          .notes-section strong {
            font-size: 7.5pt;
            color: #000;
            font-weight: 700;
            text-transform: uppercase;
            margin-right: 4px;
          }

          .footer-section {
            border-top: 1.5px solid #000;
            padding-top: 5px;
            text-align: center;
            font-size: 7pt;
            color: #333;
          }

          .footer-section p {
            margin: 2px 0;
          }

          .footer-section .thank-you {
            font-size: 8pt;
            font-weight: 700;
            color: #000;
            margin-bottom: 2px;
          }

          .page-info {
            text-align: center;
            font-size: 6.5pt;
            color: #999;
            padding-top: 3px;
            margin-top: 3px;
            border-top: 1px solid #e8e8e8;
          }

          .continuation-note {
            text-align: center;
            font-size: 7pt;
            color: #666;
            padding: 4px 0;
            font-style: italic;
          }
        `}</style>

        <div ref={ref} className="receipt-container">
          {pages.map((pageItems, pageIndex) => (
            <div key={pageIndex} className="print-page">
              {/* Header on Every Page */}
              <div className="page-header">
                <div className="header-section">
                  <div className="company-block">
                    {defaultCompanyInfo.logo && (
                      <div className="company-logo">
                        <Image
                          src={defaultCompanyInfo.logo}
                          alt={defaultCompanyInfo.name}
                          width={50}
                          height={50}
                          sizes="50px"
                          unoptimized
                          className="h-full w-full object-contain"
                        />
                      </div>
                    )}
                    <div className="company-details">
                      <h1>{defaultCompanyInfo.name}</h1>
                      <p>{defaultCompanyInfo.address}</p>
                      <p>
                        <a
                          href={formatPhoneHref(defaultCompanyInfo.phone)}
                          className="text-inherit no-underline hover:underline"
                        >
                          {defaultCompanyInfo.phone}
                        </a>{" "}
                        |{" "}
                        <a
                          href={formatEmailHref(defaultCompanyInfo.email)}
                          className="text-inherit no-underline hover:underline"
                        >
                          {defaultCompanyInfo.email}
                        </a>
                      </p>
                    </div>
                  </div>
                  <div className="receipt-header-info">
                    <h2>INVOICE</h2>
                    <p>#{order.orderNumber}</p>
                    <p>{formatDate(order.createdAt)}</p>
                  </div>
                </div>

                {/* Address & Banking Info - Only on Page 1 */}
                {pageIndex === 0 && (
                  <div className="address-section">
                    <div className="address-row">
                      <span className="address-label">Bill To:</span>
                      <span className="address-content">
                        {formatSingleLineAddress(
                          order.billingName,
                          order.billingAddress,
                          order.billingCity,
                          order.billingPostalCode,
                          order.billingCountry,
                          order.billingPhone,
                          order.billingEmail
                        )}
                      </span>
                    </div>
                    <div className="address-row">
                      <span className="address-label">Ship To:</span>
                      <span className="address-content">
                        {formatSingleLineAddress(
                          order.shippingName,
                          order.shippingAddress,
                          order.shippingCity,
                          order.shippingPostalCode,
                          order.shippingCountry,
                          order.shippingPhone,
                          order.shippingEmail
                        )}
                      </span>
                    </div>
                    <div className="address-row">
                      <span className="address-label">Banking Details:</span>
                      <span>
                        {siteConfig.banking.accountName} | Account Number:{" "}
                        {siteConfig.banking.accountNumber} | Bank:{" "}
                        {siteConfig.banking.bank} | Branch:{" "}
                        {siteConfig.banking.branch}
                      </span>
                      <div className="address-content">
                        {/* {bankingDetailsLines} */}
                      </div>
                    </div>
                  </div>
                )}

                {/* Continuation Note on Page 2+ */}
                {pageIndex > 0 && (
                  <div className="continuation-note">
                    (Continuation of Order #{order.orderNumber})
                  </div>
                )}
              </div>

              {/* Page Content - Items Table */}
              <div className="page-content">
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Product</th>
                      <th>SKU Code</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Disc.</th>
                      <th>Net</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item, itemIndex) => {
                      const originalPrice = item.price;
                      const netPrice = item.discountedPrice || item.price;
                      const discount = item.discountedPrice
                        ? item.price - item.discountedPrice
                        : 0;
                      const globalIndex =
                        pageIndex * itemsPerPage + itemIndex + 1;

                      return (
                        <tr key={item.id}>
                          <td>{globalIndex}</td>
                          <td>
                            <div className="product-title">
                              {item.product.title}
                            </div>
                          </td>
                          <td className="category">
                            {item.product.slug || "-"}
                          </td>
                          <td>{item.quantity}</td>
                          <td>{formatPrice(originalPrice)}</td>
                          <td className="discount-amount">
                            {discount > 0 ? `-${formatPrice(discount)}` : "-"}
                          </td>
                          <td>{formatPrice(netPrice)}</td>
                          <td>{formatPrice(netPrice * item.quantity)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer on Every Page */}
              <div className="page-footer">
                {/* Summary - Only on Last Page */}
                {pageIndex === pages.length - 1 && (
                  <div className="summary-section">
                    <div className="payment-methods">
                      <div className="method-box">
                        <strong>Payment:</strong>
                        {formatPaymentMethod(order.paymentMethod)}
                      </div>

                      {/* ✅ FIXED: Banking Details now shown in separate lines */}
                      {/* {isBankTransfer && (
                        <div className="method-box">
                          <strong>Banking Details:</strong>
                          {bankingDetailsLines}
                        </div>
                      )} */}

                      <div className="method-box">
                        <strong>Status:</strong>
                        {order.status}
                      </div>
                    </div>

                    <div className="totals-section">
                      <table className="totals-table">
                        <tbody>
                          <tr>
                            <td>Subtotal:</td>
                            <td>{formatPrice(order.subtotal)}</td>
                          </tr>
                          {totalDiscount > 0 && (
                            <tr className="discount-row">
                              <td>Total Discount:</td>
                              <td>-{formatPrice(totalDiscount)}</td>
                            </tr>
                          )}
                          <tr className="total-row">
                            <td>TOTAL:</td>
                            <td>{formatPrice(order.totalAmount)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Notes - Only on Last Page */}
                {pageIndex === pages.length - 1 && order.notes && (
                  <div className="notes-section">
                    <strong>Note:</strong>
                    {order.notes}
                  </div>
                )}

                {/* Company Footer */}
                <div className="footer-section">
                  <p className="thank-you">
                    {footerText || "Thank you for your business!"}
                  </p>
                  <p>
                    Questions? Contact{" "}
                    <a
                      href={formatEmailHref(defaultCompanyInfo.email)}
                      className="text-inherit no-underline hover:underline"
                    >
                      {defaultCompanyInfo.email}
                    </a>{" "}
                    •{" "}
                    <a
                      href={formatPhoneHref(defaultCompanyInfo.phone)}
                      className="text-inherit no-underline hover:underline"
                    >
                      {defaultCompanyInfo.phone}
                    </a>{" "}
                    • {defaultCompanyInfo.website}
                  </p>
                  <div className="page-info">
                    Page {pageIndex + 1} of {pages.length}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }
);

OrderReceipt.displayName = "OrderReceipt";

export default OrderReceipt;
