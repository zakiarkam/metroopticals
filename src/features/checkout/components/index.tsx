"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  Banknote,
  Landmark,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  ShoppingCart,
  Truck,
  User,
} from "lucide-react";

import { createOrder } from "@/features/orders/api/order-api";
import { useCachedSession } from "@/features/auth/hooks/use-cached-session";
import { useCart } from "@/features/cart/hooks/use-cart";
import { normalizeImageArray } from "@/lib/storageUtils";
import SiteContainer from "@/components/common/SiteContainer";
import PageHero from "@/components/common/PageHero";
import EmptyState from "@/components/common/EmptyState";
import { formatPrice } from "@/lib/utils/price";
import { inputClasses, textareaClasses } from "@/components/common/form";

const CHECKOUT_DRAFT_KEY = "metro_checkout_draft_v1";

/* ------------------------------ form atoms ------------------------------ */

/** One labelled text input. Extracted because checkout repeats it 16 times. */
function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="mb-2 block text-[12.5px] font-semibold text-dark"
      >
        {label}{" "}
        {required ? (
          <span className="text-red">*</span>
        ) : (
          <span className="font-normal text-dark-5">(optional)</span>
        )}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className={inputClasses}
      />
    </div>
  );
}

/** Titled card that groups a step of the form. */
function Panel({
  icon: Icon,
  title,
  description,
  children,
  className = "",
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-gray-3 bg-gray-2 shadow-2 ${className}`}
    >
      <div className="flex items-start gap-3.5 border-b border-gray-3 px-5 py-4 sm:px-6">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue/25 bg-blue/10 text-blue">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div>
          <h2 className="text-[15px] font-bold text-dark">{title}</h2>
          {description && (
            <p className="mt-0.5 text-[12.5px] text-dark-5">{description}</p>
          )}
        </div>
      </div>

      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

/* -------------------------------- page --------------------------------- */

type Details = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
};

const EMPTY_DETAILS: Details = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "",
  postalCode: "",
};

const PAYMENT_OPTIONS = [
  {
    value: "cod",
    label: "Cash on hand",
    hint: "Pay when you collect or on delivery.",
    icon: Banknote,
  },
  {
    value: "bank_transfer",
    label: "Bank transfer",
    hint: "We'll email the account details with your invoice.",
    icon: Landmark,
  },
];

const Checkout = () => {
  const router = useRouter();
  const { data: session, status } = useCachedSession();
  const { cartItems, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const shippingFee = 0;
  const shippingMethod = "standard";

  const [billingDetails, setBillingDetails] = useState<Details>(EMPTY_DETAILS);
  const [shippingDetails, setShippingDetails] =
    useState<Details>(EMPTY_DETAILS);

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

  const calculateSubtotal = () =>
    cartItems.reduce(
      (sum: number, item: { discountedPrice: number; quantity: number }) =>
        sum + item.discountedPrice * item.quantity,
      0,
    );

  const calculateTotal = () => calculateSubtotal();

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
        (typeof item.stock === "number" && item.stock === 0),
    );

    if (unavailableItems.length > 0) {
      toast.error(
        "Your cart contains unavailable items. Please remove them before checking out.",
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
        items: cartItems.map((item: any) => ({
          productId: item.productId ?? item.id, // Use productId if available, fallback to id
          quantity: item.quantity,
          price: item.discountedPrice,
          // Frozen onto the order line so the picking slip still names the
          // colourway after the product's colour list is edited.
          color: item.color || undefined,
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <>
        <PageHero
          eyebrow="Step 2 of 2"
          title="Checkout"
          crumbs={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]}
        />
        <section className="bg-gray-1 py-10 lg:py-14">
          <SiteContainer>
            <EmptyState
              icon={<ShoppingCart className="h-7 w-7" />}
              title="Your cart is empty"
              description="Add a frame to your cart before checking out."
              action={{
                label: "Continue shopping",
                href: "/shop-with-sidebar",
              }}
            />
          </SiteContainer>
        </section>
      </>
    );
  }

  /** Renders one address block; used for both billing and shipping. */
  const addressFields = (
    prefix: "billing" | "shipping",
    details: Details,
    setDetails: React.Dispatch<React.SetStateAction<Details>>,
  ) => {
    const set = (key: keyof Details) => (value: string) =>
      setDetails((prev) => ({ ...prev, [key]: value }));

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id={`${prefix}FirstName`}
          label="First name"
          required
          value={details.firstName}
          onChange={set("firstName")}
          autoComplete="given-name"
        />
        <Field
          id={`${prefix}LastName`}
          label="Last name"
          required
          value={details.lastName}
          onChange={set("lastName")}
          autoComplete="family-name"
        />
        <Field
          id={`${prefix}Email`}
          label="Email"
          type="email"
          required
          value={details.email}
          onChange={set("email")}
          autoComplete="email"
        />
        <Field
          id={`${prefix}Phone`}
          label="Phone"
          type="tel"
          required
          value={details.phone}
          onChange={set("phone")}
          autoComplete="tel"
        />
        <div className="sm:col-span-2">
          <Field
            id={`${prefix}Address`}
            label="Address"
            required
            value={details.address}
            onChange={set("address")}
            autoComplete="street-address"
          />
        </div>
        <Field
          id={`${prefix}City`}
          label="City"
          required
          value={details.city}
          onChange={set("city")}
          autoComplete="address-level2"
        />
        <Field
          id={`${prefix}PostalCode`}
          label="Postal code"
          value={details.postalCode}
          onChange={set("postalCode")}
          autoComplete="postal-code"
        />
        <div className="sm:col-span-2">
          <Field
            id={`${prefix}Country`}
            label="Country"
            value={details.country}
            onChange={set("country")}
            autoComplete="country-name"
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHero
        eyebrow="Step 2 of 2"
        title="Checkout"
        description="Confirm where the order goes and how you'd like to pay. Nothing is charged until we confirm your prescription."
        crumbs={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]}
      />

      <section className="bg-gray-1 py-10 lg:py-14">
        <SiteContainer>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8">
              {/* ------------------------ left column ------------------------ */}
              <div className="flex flex-col gap-6">
                <Panel
                  icon={User}
                  title="Billing details"
                  description="Who the invoice is made out to."
                >
                  {addressFields("billing", billingDetails, setBillingDetails)}

                  <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-gray-3 bg-gray-1 px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={sameAsBilling}
                      onChange={(e) => setSameAsBilling(e.target.checked)}
                      className="h-4 w-4 accent-blue-light"
                    />
                    <span className="text-[13.5px] font-medium text-dark">
                      Deliver to this address
                    </span>
                  </label>
                </Panel>

                {!sameAsBilling && (
                  <Panel
                    icon={MapPin}
                    title="Delivery address"
                    description="Where the finished glasses should be sent."
                  >
                    {addressFields(
                      "shipping",
                      shippingDetails,
                      setShippingDetails,
                    )}
                  </Panel>
                )}

                <Panel
                  icon={MessageSquare}
                  title="Order notes"
                  description="Prescription details, delivery instructions, anything else."
                >
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={5}
                    placeholder="e.g. My prescription is from January 2026  I'll email a photo. Please call before delivery."
                    className={textareaClasses}
                  />
                </Panel>
              </div>

              {/* ------------------------ right column ------------------------ */}
              <div className="flex flex-col gap-6 lg:sticky lg:top-32">
                <section className="overflow-hidden rounded-2xl border border-gray-3 bg-gray-2 shadow-2">
                  <div className="border-b border-gray-3 px-5 py-4 sm:px-6">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue">
                      Review
                    </p>
                    <h2 className="mt-1.5 text-lg font-bold text-dark">
                      Your order
                    </h2>
                  </div>

                  <ul className="divide-y divide-gray-3 px-5 sm:px-6">
                    {cartItems.map((item: any) => {
                      const previewImages = normalizeImageArray(
                        item.imgs?.previews ?? [],
                      );
                      const displayImage =
                        previewImages[0] || "/images/placeholder-product.svg";
                      const productUrl = `/shop-details/${
                        item.productId ?? item.id
                      }`;

                      return (
                        <li
                          key={item.id}
                          className="flex items-center gap-3.5 py-4"
                        >
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-3 bg-gray-1">
                            <Image
                              src={displayImage}
                              alt={item.title}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                            <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-blue px-1 text-[10px] font-bold text-white">
                              {item.quantity}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <Link
                              href={productUrl}
                              className="line-clamp-2 break-words text-[13px] font-medium capitalize text-dark transition-colors hover:text-blue"
                            >
                              {item.title}
                            </Link>
                            {item.color && (
                              <p className="mt-0.5 text-[12px] text-dark-4">
                                Colour: {item.color}
                              </p>
                            )}
                          </div>

                          <span className="shrink-0 text-[13.5px] font-semibold text-dark">
                            {formatPrice(item.discountedPrice * item.quantity)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="space-y-3 border-t border-gray-3 px-5 py-5 sm:px-6">
                    <div className="flex items-center justify-between text-[14px]">
                      <span className="text-dark-4">Subtotal</span>
                      <span className="font-semibold text-dark">
                        {formatPrice(calculateSubtotal())}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[14px]">
                      <span className="flex items-center gap-1.5 text-dark-4">
                        <Truck className="h-4 w-4" />
                        Delivery
                      </span>
                      <span className="font-semibold text-green">Free</span>
                    </div>

                    <div className="flex items-baseline justify-between rounded-xl border border-blue/25 bg-blue/[0.08] px-4 py-4">
                      <span className="text-[15px] font-bold text-dark">
                        Total
                      </span>
                      <span className="text-xl font-bold text-blue">
                        {formatPrice(calculateTotal())}
                      </span>
                    </div>
                  </div>
                </section>

                <Panel icon={Banknote} title="Payment method">
                  <div className="space-y-2.5">
                    {PAYMENT_OPTIONS.map(
                      ({ value, label, hint, icon: Icon }) => {
                        const active = paymentMethod === value;
                        return (
                          <label
                            key={value}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors ${
                              active
                                ? "border-blue bg-blue/[0.08]"
                                : "border-gray-3 bg-gray-1 hover:border-blue/50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="payment"
                              value={value}
                              checked={active}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                              className="mt-0.5 h-4 w-4 accent-blue-light"
                            />
                            <span className="min-w-0">
                              <span className="flex items-center gap-2 text-[13.5px] font-semibold text-dark">
                                <Icon className="h-4 w-4 text-blue" />
                                {label}
                              </span>
                              <span className="mt-0.5 block text-[12px] leading-relaxed text-dark-5">
                                {hint}
                              </span>
                            </span>
                          </label>
                        );
                      },
                    )}
                  </div>
                </Panel>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue text-[15px] font-bold text-white transition-colors hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-[18px] w-[18px] animate-spin" />
                        Placing order…
                      </>
                    ) : (
                      `Place order · ${formatPrice(calculateTotal())}`
                    )}
                  </button>

                  <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-dark-5">
                    <Lock className="h-3.5 w-3.5" />
                    Your details are stored securely and never shared
                  </p>
                </div>
              </div>
            </div>
          </form>
        </SiteContainer>
      </section>
    </>
  );
};

export default Checkout;
