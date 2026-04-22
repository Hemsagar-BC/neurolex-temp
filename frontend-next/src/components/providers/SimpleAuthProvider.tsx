"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const loadFromLocalStorage = useAuthStore((state) => state.loadFromLocalStorage);

  useEffect(() => {
    // Load auth state from localStorage on mount
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  return <>{children}</>;
}
