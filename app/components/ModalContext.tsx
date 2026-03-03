"use client";

import { createContext, useContext, useState } from "react";

interface ModalContextType {
  message: string | null;
  showModal: (msg: string) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const showModal = (msg: string) => setMessage(msg);
  const closeModal = () => setMessage(null);

  return (
    <ModalContext.Provider value={{ message, showModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) throw new Error("useModal must be inside ModalProvider");
  return context;
}