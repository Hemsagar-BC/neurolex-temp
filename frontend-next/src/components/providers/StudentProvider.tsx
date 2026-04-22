"use client";

import { useEffect } from "react";
import { useStudentStore } from "@/stores/studentStore";

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const loadFromLocalStorage = useStudentStore(
    (state) => state.loadFromLocalStorage
  );

  useEffect(() => {
    // Load student from localStorage on mount
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  return <>{children}</>;
}
