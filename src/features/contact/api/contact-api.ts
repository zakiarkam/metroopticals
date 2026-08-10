import { useState } from "react";
import axiosInstance from "@/lib/axiosInstance";
import type { ContactFormInput } from "@/features/contact/validators/contact";

interface ContactFormResponse {
  message: string;
  contactMessage: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message: string;
    createdAt: Date;
  };
}

/**
 * Submit a contact form
 * Sends the form data to the backend which will:
 * 1. Save to database
 * 2. Send email notification to admin (hello@metroopticals.lk)
 * 3. Send WhatsApp notification to admin (+94712822821)
 */
export async function submitContactForm(
  data: ContactFormInput
): Promise<ContactFormResponse> {
  const response = await axiosInstance.post<ContactFormResponse>(
    "/contact",
    data
  );
  return response.data;
}

export const contactApi = {
  submitContact: async (data: ContactFormInput) => submitContactForm(data),
};

export default contactApi;

/**
 * Hook for using contact form submission in React components
 */
export const useContactForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (data: ContactFormInput) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await submitContactForm(data);
      setSuccess(true);
      return true;
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        "Failed to submit contact form";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    submit,
    isLoading,
    error,
    success,
    reset: () => {
      setError(null);
      setSuccess(false);
    },
  };
};
