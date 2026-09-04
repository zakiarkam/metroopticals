import axiosInstance from "@/lib/axiosInstance";

export type PayHereCheckoutPayload = {
  /** The gateway URL the form posts to. */
  action: string;
  /** Hidden inputs, signed on the server. */
  fields: Record<string, string>;
  mode: "sandbox" | "live";
};

/** Asks the server to sign one attempt at paying an order. */
export const createPayHereSession = async (
  orderId: number,
): Promise<PayHereCheckoutPayload> => {
  const response = await axiosInstance.post("/payments/payhere/session", {
    orderId,
  });
  return response.data?.data ?? response.data;
};

/**
 * Hands the browser over to PayHere.
 *
 * A throwaway form rather than a link, because the gateway reads its
 * parameters from a POST body - a query string would put the customer's
 * details and the signature into browser history and server logs on the way.
 */
export const submitPayHereCheckout = (payload: PayHereCheckoutPayload) => {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = payload.action;
  form.style.display = "none";
  form.setAttribute("aria-hidden", "true");

  for (const [name, value] of Object.entries(payload.fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();

  // Submission is already in flight by now, so taking the element away cannot
  // stop it - but if it were ever refused (a policy that does not permit the
  // gateway's origin, say), the form would otherwise sit in the page holding
  // the customer's contact details and the signed hash.
  setTimeout(() => form.remove(), 2000);
};
