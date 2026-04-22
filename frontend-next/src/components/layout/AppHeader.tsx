"use client";

import { usePathname } from "next/navigation";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { useAuthStore } from "@/stores/authStore";
import ActivityTimer from "@/components/ActivityTimer";

// Map of paths to activity names - ONLY pages where students DO activities
const ACTIVITY_MAP: Record<string, { name: string; type: "game" | "task" }> = {
  "/reading": { name: "📖 Reading Assistant", type: "task" },
  "/lecture": { name: "🎙️ Lecture Recording", type: "task" },
  "/handwriting": { name: "✏️ Handwriting Analysis", type: "task" },
  "/generator": { name: "📝 Content Generator", type: "task" },
  "/analytics": { name: "📊 Analytics", type: "task" },
  "/games": { name: "🎮 Games Hub", type: "task" },
  "/games/sound-builder": { name: "🎵 Sound Builder", type: "game" },
  "/games/dot-connector": { name: "🎯 Dot Connector", type: "game" },
  "/games/clap-trap": { name: "👏 Clap Trap", type: "game" },
  "/games/monoline": { name: "📍 Monoline", type: "game" },
  "/games/stroop": { name: "🎨 Stroop", type: "game" },
  "/games/nback": { name: "🔢 N-Back", type: "game" },
  "/onboarding": { name: "✅ Assessment", type: "task" },
  // NOTE: Dashboard is NOT included - no timer there
};

export default function AppHeader() {
  const pathname = usePathname();
  const { currentStudent } = useAuthStore();

  // Find the activity for current path
  const currentActivity = ACTIVITY_MAP[pathname];

  // Call hook unconditionally (before any returns)
  const { formattedTime } = useActivityTracker(
    currentActivity?.name || "",
    pathname,
    currentActivity?.type || "task"
  );

  // Don't show timer on public pages or if no activity found
  if (!currentStudent || !currentActivity) {
    return null;
  }

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground/70">
          {currentStudent.name}
        </div>
        <ActivityTimer formattedTime={formattedTime} currentActivity={currentActivity.name} />
      </div>
    </div>
  );
}
