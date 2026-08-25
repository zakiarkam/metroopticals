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

