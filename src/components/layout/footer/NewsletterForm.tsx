"use client";

import React, { useState } from "react";
import { Check, Loader2, Mail } from "lucide-react";

/**
 * Footer newsletter sign-up.
 *
 * The field used to post nowhere — a required input and a Subscribe button
 * with no handler, which looks exactly like a working form. There is no
 * subscriber table, so the address is sent through the contact endpoint and
 * lands in the shop's inbox as a sign-up request. That is a real destination,
 * and the confirmation only appears once the request succeeds.
 */
export default function NewsletterForm({
  placeholder,
  buttonLabel,
}: {
  placeholder?: string;
  buttonLabel?: string;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(
    "idle"
  );

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === "sending") return;

    setState("sending");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Newsletter subscriber",
          email: email.trim(),
          subject: "Newsletter subscription",
          message: `Please add ${email.trim()} to the Metro Opticals mailing list.`,
        }),
      });

      if (!response.ok) throw new Error("Subscription failed");
      setState("done");
      setEmail("");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <p
        role="status"
        className="flex items-center gap-2.5 rounded-xl bg-white px-5 py-4 text-[14px] font-semibold text-dark"
      >
        <Check className="h-5 w-5 text-green" aria-hidden />
        You&apos;re on the list — watch your inbox for new arrivals.
      </p>
    );
  }

  return (
    <div>
      <form
        onSubmit={submit}
        className="flex w-full items-center gap-2 rounded-xl bg-white p-2 shadow-sm"
        aria-label="Newsletter sign-up"
      >
        <Mail className="ml-2 h-5 w-5 shrink-0 text-dark-4" aria-hidden />
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={placeholder || "Your email address"}
          aria-label="Email address"
          className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2.5 text-[14px] text-dark placeholder:text-dark-5 focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-dark px-5 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-dark-2 disabled:opacity-70"
        >
          {state === "sending" && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          )}
          {buttonLabel || "Subscribe"}
        </button>
      </form>

      {state === "error" && (
        <p role="alert" className="mt-2 text-[12.5px] font-semibold text-red-dark">
          That didn&apos;t go through. Please try again, or email us directly.
        </p>
      )}
    </div>
  );
}
