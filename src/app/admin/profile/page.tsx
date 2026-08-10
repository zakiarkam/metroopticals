"use client";
import React, { useState } from "react";
import { useCachedSession } from "@/features/auth/hooks/use-cached-session";
import { useRouter } from "next/navigation";
import ProfileTab from "@/features/dashboard/components/admin/tabs/ProfileTab";

const AdminProfilePage = () => {
  const { data: session, status } = useCachedSession();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  React.useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/log-in?redirect=/admin/profile");
      return;
    }

    if (session?.user) {
      setFormData({
        name: session.user.name || "",
        email: session.user.email || "",
      });
    }
  }, [session, status, router]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMemberSince = () => {
    if (!session?.user?.createdAt) {
      return new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    return new Date(session.user.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue border-r-transparent"></div>
          <p className="mt-4 text-custom-sm text-body">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <section className="overflow-hidden py-6 sm:py-8 bg-gray-2">
      <div className="max-w-[1400px] w-full mx-auto px-3 sm:px-6 lg:px-8">
        <ProfileTab />
      </div>
    </section>
  );
};

export default AdminProfilePage;
