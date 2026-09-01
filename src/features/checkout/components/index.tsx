"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  AlertCircle,
  Banknote,
  CreditCard,
  Landmark,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  User,
} from "lucide-react";

import { createOrder } from "@/features/orders/api/orders-api";
import {
  createPayHereSession,
  submitPayHereCheckout,
} from "@/features/checkout/api/payhere-api";
import {
  ONLINE_PAYMENT_FEE_LABEL,
  onlinePaymentFee,
  roundMoney,
} from "@/features/checkout/utils/payment-fee";
import type {
  FulfilmentMethodValue,
  PaymentMethodValue,
} from "@/features/checkout/constants/payment";
import { useCachedSession } from "@/features/auth/hooks/use-cached-session";
import { useCart } from "@/features/cart/hooks/use-cart";
import { normalizeImageArray } from "@/lib/storageUtils";
import SiteContainer from "@/components/common/SiteContainer";
import PageHero from "@/components/common/PageHero";
import EmptyState from "@/components/common/EmptyState";
import { formatPrice } from "@/lib/utils/price";
import { inputClasses, textareaClasses } from "@/components/common/form";
import { siteConfig } from "@/config/site";

const CHECKOUT_DRAFT_KEY = "metro_checkout_draft_v1";

/** Build-time switches, so a gateway that is off never shows a dead option. */
const PAYHERE_ENABLED = process.env.NEXT_PUBLIC_PAYHERE_ENABLED === "true";
const PAYHERE_SANDBOX =
  process.env.NEXT_PUBLIC_PAYHERE_MODE?.trim().toLowerCase() !== "live";

/* ------------------------------ form atoms ------------------------------ */

/** One labelled text input. Extracted because checkout repeats it 14 times. */
function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  autoComplete,
  error,
  className = "",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  className?: string;
}) {
  return (
    <div className={`w-full ${className}`}>
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
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={inputClasses}
      />
      {error && (
        <p
          id={`${id}-error`}
          className="mt-1.5 flex items-center gap-1 text-[12px] font-medium text-red"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/** Titled card that groups a step of the form. */
function Panel({
  step,
  icon: Icon,
  title,
  description,
  children,
  className = "",
}: {
  step?: number;
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
        <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue/25 bg-blue/10 text-blue">
          <Icon className="h-[18px] w-[18px]" />
          {step !== undefined && (
            <span className="absolute -right-1.5 -top-1.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-blue text-[10px] font-bold text-white">
              {step}
            </span>
          )}
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

/** A big, tappable radio card — used for fulfilment and for payment. */
function ChoiceCard({
  name,
  value,
  checked,
  onSelect,
  icon: Icon,
  title,
  hint,
  badge,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onSelect: (value: string) => void;
  icon: React.ElementType;
  title: string;
  hint: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors ${
        checked
          ? "border-blue bg-blue/[0.08]"
          : "border-gray-3 bg-gray-1 hover:border-blue/50"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={(e) => onSelect(e.target.value)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-blue-light"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-dark">
          <Icon className="h-4 w-4 shrink-0 text-blue" />
          {title}
          {badge}
        </span>
        <span className="mt-0.5 block text-[12px] leading-relaxed text-dark-5">
          {hint}
        </span>
        {children}
      </span>
    </label>
  );
}

const FreeBadge = () => (
  <span className="rounded-full bg-green/15 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-green">
    Free
  </span>
);

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

type Errors = Record<string, string>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^[+()\d][\d\s()+-]{8,19}$/;

const Checkout = () => {
  const router = useRouter();
  const { data: session, status } = useCachedSession();
  const { cartItems, clearCart } = useCart();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodValue>("cod");
  const [fulfilment, setFulfilment] =
    useState<FulfilmentMethodValue>("standard");

  const [billingDetails, setBillingDetails] = useState<Details>(EMPTY_DETAILS);
  const [shippingDetails, setShippingDetails] =
    useState<Details>(EMPTY_DETAILS);

  /** "Deliver to this address" — unticked reveals a separate delivery address. */
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [isClient, setIsClient] = useState(false);

  const isDelivery = fulfilment === "standard";
  /** Only ask for a delivery address when one is actually needed. */
  const needsDeliveryAddress = isDelivery && !sameAsBilling;

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
      if (draft?.fulfilment === "pickup" || draft?.fulfilment === "standard") {
        setFulfilment(draft.fulfilment);
      }
      // A method the site no longer offers — the gateway switched off since
      // the draft was saved — falls back rather than sticking on a dead option.
      if (
        draft?.paymentMethod === "cod" ||
        draft?.paymentMethod === "bank_transfer" ||
        (draft?.paymentMethod === "payhere" && PAYHERE_ENABLED)
      ) {
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
  }, [session]);

  useEffect(() => {
    if (!isClient || typeof window === "undefined") return;
    const draft = {
      billingDetails,
      shippingDetails,
      sameAsBilling,
      notes,
      paymentMethod,
      fulfilment,
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
    fulfilment,
    isClient,
  ]);

  // Switching between delivery and collection, or revealing the separate
  // delivery address, changes which fields are required — so the errors from
  // the previous shape are no longer about anything the form is asking for.
  useEffect(() => {
    setErrors({});
  }, [fulfilment, sameAsBilling]);

  /* ------------------------------ totals ------------------------------ */

  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum: number, item: { discountedPrice: number; quantity: number }) =>
          sum + item.discountedPrice * item.quantity,
        0,
      ),
    [cartItems],
  );

  // Previewed with the same function the server charges with, so the figure
  // here and the figure on the invoice cannot drift apart.
  const paymentFee = onlinePaymentFee(subtotal, paymentMethod);
  const total = roundMoney(subtotal + paymentFee);

  /* ---------------------------- validation ---------------------------- */

  const validate = useCallback((): Errors => {
    const next: Errors = {};
    const b = billingDetails;

    if (!b.firstName.trim()) next.billingFirstName = "Enter your first name";
    if (!b.lastName.trim()) next.billingLastName = "Enter your last name";
    if (!EMAIL_PATTERN.test(b.email.trim()))
      next.billingEmail = "Enter a valid email address";
    if (!PHONE_PATTERN.test(b.phone.trim()))
      next.billingPhone = "Enter a valid phone number";

    // An address is only demanded when something is actually being sent. For
    // collection the invoice is handed over at the counter.
    if (isDelivery) {
      if (!b.address.trim()) next.billingAddress = "Enter your address";
      if (!b.city.trim()) next.billingCity = "Enter your city";
    }

    if (needsDeliveryAddress) {
      const s = shippingDetails;
      if (!s.firstName.trim())
        next.shippingFirstName = "Enter who the delivery is for";
      if (!PHONE_PATTERN.test(s.phone.trim()))
        next.shippingPhone = "Enter a phone number for the delivery";
      if (!s.address.trim()) next.shippingAddress = "Enter the delivery address";
      if (!s.city.trim()) next.shippingCity = "Enter the delivery city";
    }

    return next;
  }, [billingDetails, shippingDetails, isDelivery, needsDeliveryAddress]);

  /* ------------------------------ submit ------------------------------ */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    // A line asking for more than is left is as unbuyable as one that is out
    // of stock — the order would only fail on the stock check at the far end,
    // after the address form had been filled in.
    const unavailableItems = cartItems.filter(
      (item: any) =>
        item.status === "INACTIVE" ||
        item.status === "OUT_OF_STOCK" ||
        (typeof item.stock === "number" &&
          (item.stock === 0 || item.quantity > item.stock)),
    );

    if (unavailableItems.length > 0) {
      const names = unavailableItems
        .map((item: any) => item.title)
        .filter(Boolean)
        .join(", ");
      toast.error(
        names
          ? `Not available in the quantity ordered: ${names}. Adjust or remove these before checking out.`
          : "Your cart contains unavailable items. Please remove them before checking out.",
      );
      return;
    }

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error("Please check the highlighted fields");
      document
        .querySelector('[aria-invalid="true"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);

    try {
      const delivery = needsDeliveryAddress ? shippingDetails : billingDetails;
      const billingName =
        `${billingDetails.firstName} ${billingDetails.lastName}`.trim();
      const deliveryName =
        `${delivery.firstName} ${delivery.lastName}`.trim() || billingName;

      const orderData = {
        items: cartItems.map((item: any) => ({
          productId: item.productId ?? item.id,
          quantity: item.quantity,
          price: item.discountedPrice,
          // Frozen onto the order line so the picking slip still names the
          // colourway after the product's colour list is edited.
          color: item.color || undefined,
        })),
        paymentMethod,
        shippingMethod: fulfilment,
        notes,
        billingName,
        billingEmail: billingDetails.email.trim(),
        billingPhone: billingDetails.phone.trim(),
        billingAddress: billingDetails.address.trim(),
        billingCity: billingDetails.city.trim(),
        billingCountry: billingDetails.country.trim(),
        billingPostalCode: billingDetails.postalCode.trim(),
        // Left blank for collection: the server clears the delivery columns
        // anyway, and sending an address for an order nobody is delivering
        // only invites a courier label that should not exist.
        shippingName: deliveryName,
        shippingEmail: billingDetails.email.trim(),
        shippingPhone: (delivery.phone || billingDetails.phone).trim(),
        shippingAddress: isDelivery ? delivery.address.trim() : "",
        shippingCity: isDelivery ? delivery.city.trim() : "",
        shippingCountry: isDelivery ? delivery.country.trim() : "",
        shippingPostalCode: isDelivery ? delivery.postalCode.trim() : "",
      };

      const result = await createOrder(orderData);
      const orderId = result.order.id;

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(CHECKOUT_DRAFT_KEY);
      }

      if (paymentMethod === "payhere") {
        // The cart is deliberately left alone: nothing has been paid yet, and
        // a shopper whose card is declined should still have their basket.
        const checkout = await createPayHereSession(orderId);
        toast.loading("Taking you to the secure payment page…", {
          duration: 4000,
        });
        submitPayHereCheckout(checkout);
        return; // the browser is leaving the site
      }

      await clearCart();
      toast.success("Order placed successfully!");
      router.push(`/order-confirmation?orderId=${orderId}`);
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(
        error?.response?.data?.message ||
          "We couldn't place your order. Please try again.",
      );
      setIsSubmitting(false);
    }
  };

  /* ------------------------------ render ------------------------------ */

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

  const addressFields = (
    prefix: "billing" | "shipping",
    details: Details,
    setDetails: React.Dispatch<React.SetStateAction<Details>>,
    addressRequired: boolean,
  ) => {
    const set = (key: keyof Details) => (value: string) =>
      setDetails((prev) => ({ ...prev, [key]: value }));
    const err = (key: string) => errors[`${prefix}${key}`];

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id={`${prefix}FirstName`}
          label="First name"
          required
          value={details.firstName}
          onChange={set("firstName")}
          autoComplete="given-name"
          error={err("FirstName")}
        />
        <Field
          id={`${prefix}LastName`}
          label="Last name"
          required={prefix === "billing"}
          value={details.lastName}
          onChange={set("lastName")}
          autoComplete="family-name"
          error={err("LastName")}
        />
        {prefix === "billing" && (
          <Field
            id="billingEmail"
            label="Email"
            type="email"
            required
            value={details.email}
            onChange={set("email")}
            autoComplete="email"
            error={err("Email")}
          />
        )}
        <Field
          id={`${prefix}Phone`}
          label="Phone"
          type="tel"
          required
          value={details.phone}
          onChange={set("phone")}
          autoComplete="tel"
          placeholder="07X XXX XXXX"
          error={err("Phone")}
        />
        <Field
          id={`${prefix}Address`}
          label="Address"
          required={addressRequired}
          value={details.address}
          onChange={set("address")}
          autoComplete="street-address"
          error={err("Address")}
          className="sm:col-span-2"
        />
        <Field
          id={`${prefix}City`}
          label="City"
          required={addressRequired}
          value={details.city}
          onChange={set("city")}
          autoComplete="address-level2"
          error={err("City")}
        />
        <Field
          id={`${prefix}PostalCode`}
          label="Postal code"
          value={details.postalCode}
          onChange={set("postalCode")}
          autoComplete="postal-code"
        />
      </div>
    );
  };

  return (
    <>
      <PageHero
        eyebrow="Step 2 of 2"
        title="Checkout"
        description="Confirm where the order goes and how you'd like to pay. Prices are in Sri Lankan rupees and delivery is free island-wide."
        crumbs={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]}
      />

      <section className="bg-gray-1 py-10 lg:py-14">
        <SiteContainer>
          {/* Island-wide free delivery, stated once, above everything. */}
          <div className="mb-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-2xl border border-green/25 bg-green/[0.07] px-5 py-3.5 text-center">
            <span className="inline-flex items-center gap-2 text-[13.5px] font-bold text-dark">
              <Truck className="h-[18px] w-[18px] text-green" />
              Free island-wide delivery
            </span>
            <span className="text-[12.5px] text-dark-4">
              On every order, anywhere in Sri Lanka — or collect free at our
              Nawalapitiya store.
            </span>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8">
              {/* ------------------------ left column ------------------------ */}
              <div className="flex flex-col gap-6">
                <Panel
                  step={1}
                  icon={User}
                  title="Your details"
                  description="Who the invoice is made out to, and how we reach you."
                >
                  {addressFields(
                    "billing",
                    billingDetails,
                    setBillingDetails,
                    isDelivery,
                  )}
                </Panel>

                <Panel
                  step={2}
                  icon={Truck}
                  title="How would you like to get it?"
                  description="Delivery is free anywhere in Sri Lanka."
                >
                  <div className="space-y-2.5">
                    <ChoiceCard
                      name="fulfilment"
                      value="standard"
                      checked={isDelivery}
                      onSelect={(value) =>
                        setFulfilment(value as FulfilmentMethodValue)
                      }
                      icon={Truck}
                      title="Deliver to my address"
                      hint="Island-wide, 2–5 working days once your glasses are ready."
                      badge={<FreeBadge />}
                    />
                    <ChoiceCard
                      name="fulfilment"
                      value="pickup"
                      checked={!isDelivery}
                      onSelect={(value) =>
                        setFulfilment(value as FulfilmentMethodValue)
                      }
                      icon={Store}
                      title="Collect from our store"
                      hint={siteConfig.contact.address}
                      badge={<FreeBadge />}
                    />
                  </div>

                  {isDelivery ? (
                    <>
                      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-gray-3 bg-gray-1 px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={sameAsBilling}
                          onChange={(e) => setSameAsBilling(e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-blue-light"
                        />
                        <span className="min-w-0">
                          <span className="block text-[13.5px] font-semibold text-dark">
                            Deliver to the address above
                          </span>
                          <span className="mt-0.5 block text-[12px] text-dark-5">
                            Untick this if the order should go somewhere else —
                            a workplace, or a relative&apos;s house.
                          </span>
                        </span>
                      </label>

                      {needsDeliveryAddress && (
                        <div className="mt-5 rounded-xl border border-blue/25 bg-blue/[0.05] p-4 sm:p-5">
                          <p className="mb-4 flex items-center gap-2 text-[13px] font-bold text-dark">
                            <MapPin className="h-4 w-4 text-blue" />
                            Deliver instead to
                          </p>
                          {addressFields(
                            "shipping",
                            shippingDetails,
                            setShippingDetails,
                            true,
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="mt-4 rounded-xl border border-gray-3 bg-gray-1 px-4 py-3.5">
                      <p className="text-[13px] font-semibold text-dark">
                        We&apos;ll message you when it&apos;s ready
                      </p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-dark-5">
                        Bring your order number to {siteConfig.contact.address}{" "}
                        Orders are held for 30 days. Call {siteConfig.contact.phone}{" "}
                        if you need longer.
                      </p>
                    </div>
                  )}
                </Panel>

                <Panel
                  step={3}
                  icon={MessageSquare}
                  title="Order notes"
                  description="Prescription details, delivery instructions, anything else."
                >
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={5}
                    maxLength={1000}
                    placeholder="e.g. My prescription is from January 2026 — I'll email a photo. Please call before delivery."
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
                        {formatPrice(subtotal)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[14px]">
                      <span className="flex items-center gap-1.5 text-dark-4">
                        {isDelivery ? (
                          <Truck className="h-4 w-4" />
                        ) : (
                          <Store className="h-4 w-4" />
                        )}
                        {isDelivery ? "Island-wide delivery" : "Store collection"}
                      </span>
                      <span className="font-semibold text-green">Free</span>
                    </div>

                    {paymentFee > 0 && (
                      <div className="flex items-center justify-between text-[14px]">
                        <span className="flex items-center gap-1.5 text-dark-4">
                          <CreditCard className="h-4 w-4" />
                          {ONLINE_PAYMENT_FEE_LABEL}
                        </span>
                        <span className="font-semibold text-dark">
                          {formatPrice(paymentFee)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-baseline justify-between rounded-xl border border-blue/25 bg-blue/[0.08] px-4 py-4">
                      <span className="text-[15px] font-bold text-dark">
                        Total
                      </span>
                      <span className="text-xl font-bold text-blue">
                        {formatPrice(total)}
                      </span>
                    </div>
                  </div>
                </section>

                <Panel icon={Banknote} title="Payment method">
                  <div className="space-y-2.5">
                    <ChoiceCard
                      name="payment"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onSelect={(value) =>
                        setPaymentMethod(value as PaymentMethodValue)
                      }
                      icon={Banknote}
                      title="Cash on hand"
                      hint="Pay when you collect, or to the courier on delivery."
                    />
                    <ChoiceCard
                      name="payment"
                      value="bank_transfer"
                      checked={paymentMethod === "bank_transfer"}
                      onSelect={(value) =>
                        setPaymentMethod(value as PaymentMethodValue)
                      }
                      icon={Landmark}
                      title="Bank transfer"
                      hint="We'll email the account details with your invoice."
                    />
                    {PAYHERE_ENABLED && (
                      <ChoiceCard
                        name="payment"
                        value="payhere"
                        checked={paymentMethod === "payhere"}
                        onSelect={(value) =>
                          setPaymentMethod(value as PaymentMethodValue)
                        }
                        icon={CreditCard}
                        title="Pay online"
                        hint={`Visa, Mastercard, Amex and mobile wallets, through PayHere. A ${ONLINE_PAYMENT_FEE_LABEL.toLowerCase()} applies.`}
                      >
                        <span className="mt-2.5 block">
                          <Image
                            src="https://www.payhere.lk/downloads/images/payhere_long_banner.png"
                            alt="Cards and wallets accepted through PayHere"
                            width={340}
                            height={38}
                            unoptimized
                            className="h-auto w-full max-w-[280px]"
                          />
                        </span>
                      </ChoiceCard>
                    )}
                  </div>

                  {PAYHERE_ENABLED &&
                    PAYHERE_SANDBOX &&
                    paymentMethod === "payhere" && (
                      <p className="mt-3 rounded-lg border border-orange/30 bg-orange/10 px-3.5 py-2.5 text-[12px] font-medium text-dark">
                        Sandbox mode — test cards only. No real money moves.
                      </p>
                    )}
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
                        {paymentMethod === "payhere"
                          ? "Opening secure payment…"
                          : "Placing order…"}
                      </>
                    ) : paymentMethod === "payhere" ? (
                      `Pay securely · ${formatPrice(total)}`
                    ) : (
                      `Place order · ${formatPrice(total)}`
                    )}
                  </button>

                  <div className="mt-3 space-y-1.5 text-center">
                    <p className="flex items-center justify-center gap-1.5 text-[11.5px] text-dark-5">
                      <Lock className="h-3.5 w-3.5" />
                      Your details are stored securely and never shared
                    </p>
                    {paymentMethod === "payhere" && (
                      <p className="flex items-center justify-center gap-1.5 text-[11.5px] text-dark-5">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Card details are entered on PayHere — we never see them
                      </p>
                    )}
                    <p className="text-[11.5px] text-dark-5">
                      By placing this order you agree to our{" "}
                      <Link
                        href="/terms"
                        className="font-semibold text-blue underline-offset-2 hover:underline"
                      >
                        terms
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/refund-policy"
                        className="font-semibold text-blue underline-offset-2 hover:underline"
                      >
                        refund policy
                      </Link>
                      .
                    </p>
                  </div>
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
