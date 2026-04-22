"use client";

import { usePathname } from "next/navigation";
import AlphabetRain from "@/components/common/AlphabetRain";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import AccessibilityToolbar from "@/components/common/AccessibilityToolbar";
import ReadingRuler from "@/components/common/ReadingRuler";
import { Toaster } from "@/components/ui/sonner";

// Pages where the sidebar should NOT appear
const PUBLIC_PATHS = ["/", "/login", "/signup"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showSidebar = !PUBLIC_PATHS.includes(pathname);

  return (
    <>
      <AlphabetRain />
      <div className="relative z-10 flex h-dvh flex-col overflow-hidden md:h-screen md:flex-row">
        {showSidebar && <AppSidebar />}
        <main className="min-h-0 flex-1 overflow-y-auto flex flex-col">
          <AppHeader />
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
      <AccessibilityToolbar />
      <ReadingRuler />
      <Toaster richColors position="top-right" />
    </>
  );
}
