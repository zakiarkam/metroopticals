"use client";
import { createOrder } from "@/features/orders/api/order-api";
import { useCachedSession } from "@/features/auth/hooks/use-cached-session";
import { useCart } from "@/features/cart/hooks/use-cart";
import { normalizeImageArray } from "@/lib/storageUtils";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import SiteContainer from "@/components/common/SiteContainer";

const CHECKOUT_DRAFT_KEY = "metro_checkout_draft_v1";

const Checkout = () => {
  const router = useRouter();
  const { data: session, status } = useCachedSession();
  const { cartItems, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const shippingFee = 0;
  const shippingMethod = "standard";

  const [billingDetails, setBillingDetails] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    postalCode: "",
  });

  const [shippingDetails, setShippingDetails] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    postalCode: "",
  });

  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [notes, setNotes] = useState("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/log-in?redirect=/checkout");
    }
  }, [status, router]);

  useEffect(() => {
    setIsClient(true);
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CHECKOUT_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft?.billingDetails) setBillingDetails(draft.billingDetails);
      if (draft?.shippingDetails) setShippingDetails(draft.shippingDetails);
      if (typeof draft?.sameAsBilling === "boolean") {
        setSameAsBilling(draft.sameAsBilling);
      }
      if (typeof draft?.notes === "string") setNotes(draft.notes);
      if (typeof draft?.paymentMethod === "string") {
        setPaymentMethod(draft.paymentMethod);
      }
    } catch (error) {
      console.warn("Failed to load checkout draft:", error);
    }
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    const nameParts = session.user.name?.split(" ") ?? [];
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    setBillingDetails((prev) => ({
      ...prev,
      firstName: prev.firstName || firstName,
      lastName: prev.lastName || lastName,
      email: prev.email || session.user.email || "",
      phone: prev.phone || session.user.phone || "",
      address: prev.address || session.user.address || "",
      city: prev.city || session.user.city || "",
      country: prev.country || session.user.country || "",
      postalCode: prev.postalCode || session.user.postalCode || "",
    }));

    if (sameAsBilling) {
      setShippingDetails((prev) => ({
        ...prev,
        firstName: prev.firstName || firstName,
        lastName: prev.lastName || lastName,
        email: prev.email || session.user.email || "",
        phone: prev.phone || session.user.phone || "",
        address: prev.address || session.user.address || "",
        city: prev.city || session.user.city || "",
        country: prev.country || session.user.country || "",
        postalCode: prev.postalCode || session.user.postalCode || "",
      }));
    }
  }, [session, sameAsBilling]);

  useEffect(() => {
    if (!isClient || typeof window === "undefined") return;
    const draft = {
      billingDetails,
      shippingDetails,
      sameAsBilling,
      notes,
      paymentMethod,
    };
    try {
      window.localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
    } catch (error) {
      console.warn("Failed to save checkout draft:", error);
    }
  }, [
    billingDetails,
    shippingDetails,
    sameAsBilling,
    notes,
    paymentMethod,
    isClient,
  ]);

  const calculateSubtotal = () => {
    return cartItems.reduce(
      (sum, item) => sum + item.discountedPrice * item.quantity,
      0
    );
  };

  const calculateTotal = () => {
    return calculateSubtotal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    // Check for unavailable items
    const unavailableItems = cartItems.filter(
      (item: any) =>
        item.status === "INACTIVE" ||
        item.status === "OUT_OF_STOCK" ||
        (typeof item.stock === "number" && item.stock === 0)
    );

    if (unavailableItems.length > 0) {
      toast.error(
        "Your cart contains unavailable items. Please remove them before checking out."
      );
      return;
    }

    // Validation
    if (
      !billingDetails.firstName ||
      !billingDetails.email ||
      !billingDetails.phone
    ) {
      toast.error("Please fill in all required billing fields");
      return;
    }

    if (
      !sameAsBilling &&
      (!shippingDetails.firstName || !shippingDetails.address)
    ) {
      toast.error("Please fill in all required shipping fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const shipping = sameAsBilling ? billingDetails : shippingDetails;

      const orderData = {
        items: cartItems.map((item) => ({
          productId: item.productId ?? item.id, // Use productId if available, fallback to id
          quantity: item.quantity,
          price: item.discountedPrice,
        })),
        // Shipping fee/method temporarily disabled in checkout UI.
        shippingFee,
        paymentMethod,
        shippingMethod,
        notes,
        billingName: `${billingDetails.firstName} ${billingDetails.lastName}`,
        billingEmail: billingDetails.email,
        billingPhone: billingDetails.phone,
        billingAddress: billingDetails.address,
        billingCity: billingDetails.city,
        billingCountry: billingDetails.country,
        billingPostalCode: billingDetails.postalCode,
        shippingName: `${shipping.firstName} ${shipping.lastName}`,
        shippingEmail: shipping.email || billingDetails.email,
        shippingPhone: shipping.phone || billingDetails.phone,
        shippingAddress: shipping.address,
        shippingCity: shipping.city,
        shippingCountry: shipping.country,
        shippingPostalCode: shipping.postalCode,
      };

      const result = await createOrder(orderData);

      await clearCart();
      toast.success("Order placed successfully!");
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(CHECKOUT_DRAFT_KEY);
      }
      router.push(`/order-confirmation?orderId=${result.order.id}`);
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.response?.data?.message || "Failed to place order");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue"></div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <>
        <section className="py-8 bg-gradient-to-b from-gray-50 to-gray-1">
          <SiteContainer className="text-center">
            <h2 className="text-2xl font-bold text-dark mb-4">
              Your cart is empty
            </h2>
            <p className="text-body mb-6">
              Add items to your cart before checking out.
            </p>
            <button
              onClick={() => router.push("/shop-with-sidebar")}
              className="inline-flex font-bold text-white bg-gradient-to-r from-blue to-blue-dark py-3.5 px-8 rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              Continue Shopping
            </button>
          </SiteContainer>
        </section>
      </>
    );
  }

  return (
    <>
      <section className="overflow-hidden py-8 bg-gradient-to-b from-gray-50 to-gray-100">
        <SiteContainer>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              {/* Left Column */}
              <div className="lg:flex-[0.65] w-full">
                {/* Billing Details */}
                <div className="bg-gradient-to-br from-gray-2 to-gray-50 shadow-lg border border-gray-200 rounded-2xl p-5 sm:p-6 lg:p-8">
                  <h2 className="font-bold text-dark text-2xl sm:text-3xl mb-5 bg-gradient-to-r from-blue to-blue-dark bg-clip-text text-transparent">
                    Billing Details
                  </h2>

                  <div className="flex flex-col lg:flex-row gap-4 mb-4">
                    <div className="w-full">
                      <label
                        htmlFor="firstName"
                        className="block mb-2 font-medium text-dark text-sm"
                      >
                        First Name <span className="text-red">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={billingDetails.firstName}
                        onChange={(e) =>
                          setBillingDetails({
                            ...billingDetails,
                            firstName: e.target.value,
                          })
                        }
                        className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
                      />
                    </div>

                    <div className="w-full">
                      <label
                        htmlFor="lastName"
                        className="block mb-2 font-medium text-dark text-sm"
                      >
                        Last Name <span className="text-red">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={billingDetails.lastName}
                        onChange={(e) =>
                          setBillingDetails({
                            ...billingDetails,
                            lastName: e.target.value,
                          })
                        }
                        className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
                      />
                    </div>
                  </div>

                  <div className="mb-5">
                    <label htmlFor="email" className="block mb-2.5">
                      Email <span className="text-red">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={billingDetails.email}
                      onChange={(e) =>
                        setBillingDetails({
                          ...billingDetails,
                          email: e.target.value,
                        })
                      }
                      className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
                    />
                  </div>

                  <div className="mb-5">
                    <label htmlFor="phone" className="block mb-2.5">
                      Phone <span className="text-red">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={billingDetails.phone}
                      onChange={(e) =>
                        setBillingDetails({
                          ...billingDetails,
                          phone: e.target.value,
                        })
                      }
                      className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
                    />
                  </div>

                  <div className="mb-5">
                    <label htmlFor="address" className="block mb-2.5">
                      Address <span className="text-red">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={billingDetails.address}
                      onChange={(e) =>
                        setBillingDetails({
                          ...billingDetails,
                          address: e.target.value,
                        })
                      }
                      className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
                    />
                  </div>

                  <div className="flex flex-col lg:flex-row gap-5 sm:gap-8 mb-5">
                    <div className="w-full">
                      <label htmlFor="city" className="block mb-2.5">
                        City <span className="text-red">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={billingDetails.city}
                        onChange={(e) =>
                          setBillingDetails({
                            ...billingDetails,
                            city: e.target.value,
                          })
                        }
                        className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
                      />
                    </div>

                    <div className="w-full">
                      <label htmlFor="postalCode" className="block mb-2.5">
                        Postal Code{" "}
                        <span className="text-dark-4 text-xs">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={billingDetails.postalCode}
                        onChange={(e) =>
                          setBillingDetails({
                            ...billingDetails,
                            postalCode: e.target.value,
                          })
                        }
                        className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
                      />
                    </div>
                  </div>

                  <div className="mb-5">
                    <label htmlFor="country" className="block mb-2.5">
                      Country{" "}
                      <span className="text-dark-4 text-xs">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={billingDetails.country}
                      onChange={(e) =>
                        setBillingDetails({
                          ...billingDetails,
                          country: e.target.value,
                        })
                      }
                      className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
                    />
                  </div>

                  <label className="flex items-center gap-2 mt-5">
                    <input
                      type="checkbox"
                      checked={sameAsBilling}
                      onChange={(e) => setSameAsBilling(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-3 text-blue focus:ring-2 focus:ring-blue/20"
                    />
                    <span className="text-custom-sm text-dark">
                      Shipping address same as billing
                    </span>
                  </label>
                </div>

                {!sameAsBilling && (
                  <div className="bg-gradient-to-br from-gray-2 to-gray-50 shadow-lg border border-gray-200 rounded-2xl p-5 sm:p-6 lg:p-8 mt-6">
                    <h2 className="font-bold text-dark text-2xl sm:text-3xl mb-5 bg-gradient-to-r from-blue to-blue-dark bg-clip-text text-transparent">
                      Shipping Details
                    </h2>

                    <div className="flex flex-col lg:flex-row gap-4 mb-4">
                      <div className="w-full">
                        <label
                          htmlFor="shippingFirstName"
                          className="block mb-2 font-medium text-dark text-sm"
                        >
                          First Name <span className="text-red">*</span>
                        </label>
                        <input
                          id="shippingFirstName"
                          type="text"
                          required
                          value={shippingDetails.firstName}
                          onChange={(e) =>
                            setShippingDetails({
                              ...shippingDetails,
                              firstName: e.target.value,
                            })
                          }
                          className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
                        />
                      </div>

                      <div className="w-full">
                        <label
                          htmlFor="shippingLastName"
                          className="block mb-2 font-medium text-dark text-sm"
                        >
                          Last Name <span className="text-red">*</span>
                        </label>
                        <input
                          id="shippingLastName"
                          type="text"
                          required
                          value={shippingDetails.lastName}
                          onChange={(e) =>
                            setShippingDetails({
                              ...shippingDetails,
                              lastName: e.target.value,
                            })
                          }
                          className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
                        />
                      </div>
                    </div>

                    <div className="mb-5">
                      <label htmlFor="shippingEmail" className="block mb-2.5">
                        Email <span className="text-red">*</span>
                      </label>
                      <input
                        id="shippingEmail"
                        type="email"
                        required
                        value={shippingDetails.email}
                        onChange={(e) =>
                          setShippingDetails({
                            ...shippingDetails,
                            email: e.target.value,
                          })
                        }
                        className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
                      />
                    </div>

                    <div className="mb-5">
                      <label htmlFor="shippingPhone" className="block mb-2.5">
                        Phone <span className="text-red">*</span>
                      </label>
                      <input
                        id="shippingPhone"
                        type="tel"
                        required
                        value={shippingDetails.phone}
                        onChange={(e) =>
                          setShippingDetails({
                            ...shippingDetails,
                            phone: e.target.value,
                          })
                        }
                        className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
                      />
                    </div>

                    <div className="mb-5">
                      <label htmlFor="shippingAddress" className="block mb-2.5">
                        Address <span className="text-red">*</span>
                      </label>
                      <input
                        id="shippingAddress"
                        type="text"
                        required
                        value={shippingDetails.address}
                        onChange={(e) =>
                          setShippingDetails({
                            ...shippingDetails,
                            address: e.target.value,
                          })
                        }
                        className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
                      />
                    </div>

                    <div className="flex flex-col lg:flex-row gap-5 sm:gap-8 mb-5">
                      <div className="w-full">
                        <label htmlFor="shippingCity" className="block mb-2.5">
                          City <span className="text-red">*</span>
                        </label>
                        <input
                          id="shippingCity"
                          type="text"
                          required
                          value={shippingDetails.city}
                          onChange={(e) =>
                            setShippingDetails({
                              ...shippingDetails,
                              city: e.target.value,
                            })
                          }
                          className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
                        />
                      </div>

                      <div className="w-full">
                        <label
                          htmlFor="shippingPostalCode"
                          className="block mb-2.5"
                        >
                          Postal Code{" "}
                          <span className="text-dark-4 text-xs">(optional)</span>
                        </label>
                        <input
                          id="shippingPostalCode"
                          type="text"
                          value={shippingDetails.postalCode}
                          onChange={(e) =>
                            setShippingDetails({
                              ...shippingDetails,
                              postalCode: e.target.value,
                            })
                          }
                          className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
                        />
                      </div>
                    </div>

                    <div className="mb-5">
                      <label htmlFor="shippingCountry" className="block mb-2.5">
                        Country{" "}
                        <span className="text-dark-4 text-xs">(optional)</span>
                      </label>
                      <input
                        id="shippingCountry"
                        type="text"
                        value={shippingDetails.country}
                        onChange={(e) =>
                          setShippingDetails({
                            ...shippingDetails,
                            country: e.target.value,
                          })
                        }
                        className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
                      />
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="bg-gradient-to-br from-gray-2 to-gray-50 shadow-lg border border-gray-200 rounded-2xl p-5 sm:p-6 mt-6">
                  <label
                    htmlFor="notes"
                    className="block mb-2 font-medium text-dark text-sm"
                  >
                    Order Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={5}
                    placeholder="Notes about your order, e.g. special notes for delivery."
                    className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full p-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10 resize-none"
                  />
                </div>
              </div>

              {/* Right Column - Order Summary */}
              <div className="w-full lg:flex-[0.35]">
                <div className="bg-gradient-to-br from-gray-2 to-gray-50 shadow-lg border border-gray-200 rounded-2xl">
                  <div className="border-b border-gray-200 bg-gradient-to-r from-blue-light-5 to-blue-light-4 py-4 px-5 sm:px-6 rounded-t-2xl">
                    <h3 className="font-bold text-xl text-dark">Your Order</h3>
                  </div>

                  <div className="pt-2.5 pb-8.5 px-4 sm:px-8.5">
                    <div className="flex items-center justify-between py-5 border-b border-gray-3">
                      <h4 className="font-medium text-dark">Product</h4>
                      <h4 className="font-medium text-dark">Subtotal</h4>
                    </div>

                    {cartItems.map((item) => {
                      const previewImages = normalizeImageArray(
                        item.imgs?.previews ?? []
                      );
                      const displayImage =
                        previewImages[0] || "/images/placeholder-product.jpg";
                      const productUrl = item.productId
                        ? `/shop-details/${item.productId}`
                        : `/shop-details/${item.id}`;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between py-5 border-b border-gray-3"
                        >
                          <div className="flex items-center gap-3">
                            <Image
                              src={displayImage}
                              alt={item.title}
                              width={50}
                              height={50}
                              className="rounded"
                            />
                            <div>
                              <p className="text-dark capitalize">
                                <Link
                                  href={productUrl}
                                  className="hover:text-blue"
                                >
                                  {item.title && item.title.length > 20
                                    ? `${item.title.substring(0, 20)}..`
                                    : item.title}
                                </Link>
                              </p>
                              <p className="text-custom-xs text-body">
                                Qty: {item.quantity}
                              </p>
                            </div>
                          </div>
                          <p className="text-dark text-sm">
                            Rs -{" "}
                            {(item.discountedPrice * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      );
                    })}

                    {/* Shipping fee temporarily disabled in checkout UI. */}

                    <div className="flex items-center justify-between pt-5">
                      <p className="font-medium text-lg text-dark">Total</p>
                      <p className="font-medium text-lg text-blue">
                        Rs - {calculateTotal().toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Shipping Method temporarily disabled in checkout UI. */}

                {/* Payment Method */}
                <div className="bg-gradient-to-br from-gray-2 to-gray-50 shadow-lg border border-gray-200 rounded-2xl p-5 sm:p-6 mt-6">
                  <h3 className="font-bold text-lg text-dark mb-4">
                    Payment Method
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="payment"
                        value="cod"
                        checked={paymentMethod === "cod"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="h-4 w-4"
                      />
                      <span>Cash on Hand</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="payment"
                        value="bank_transfer"
                        checked={paymentMethod === "bank_transfer"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="h-4 w-4"
                      />
                      <span>Bank Transfer</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center font-bold text-white bg-gradient-to-r from-blue to-blue-dark py-3.5 px-6 rounded-lg ease-out duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] mt-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSubmitting ? "Processing..." : "Place Order"}
                </button>
              </div>
            </div>
          </form>
        </SiteContainer>
      </section>
    </>
  );
};

export default Checkout;
