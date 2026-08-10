"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

interface PreviewSliderType {
  isModalPreviewOpen: boolean;
  openPreviewModal: () => void;
  closePreviewModal: () => void;
}

const PreviewSlider = createContext<PreviewSliderType | undefined>(undefined);

export const usePreviewSlider = () => {
  const context = useContext(PreviewSlider);
  if (!context) {
    throw new Error(
      "usePreviewSlider must be used within a PreviewSliderProvider"
    );
  }
  return context;
};

interface PreviewSliderProviderProps {
  children: ReactNode;
}

export const PreviewSliderProvider: React.FC<PreviewSliderProviderProps> = ({
  children,
}) => {
  const [isModalPreviewOpen, setIsModalOpen] = useState(false);

  const openPreviewModal = () => {
    setIsModalOpen(true);
  };

  const closePreviewModal = () => {
    setIsModalOpen(false);
  };

  return (
    <PreviewSlider.Provider
      value={{ isModalPreviewOpen, openPreviewModal, closePreviewModal }}
    >
      {children}
    </PreviewSlider.Provider>
  );
};
