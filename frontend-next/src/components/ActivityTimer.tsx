"use client";

import { motion } from "framer-motion";
import { Clock } from "lucide-react";

interface ActivityTimerProps {
  formattedTime: string;
  currentActivity: string;
}

export default function ActivityTimer({ formattedTime, currentActivity }: ActivityTimerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-violet-600 animate-pulse" />
        <span className="text-sm font-semibold text-foreground">
          {currentActivity}
        </span>
      </div>
      <span className="text-sm font-mono font-bold text-violet-600 min-w-[3rem] text-right">
        {formattedTime}
      </span>
    </motion.div>
  );
}
