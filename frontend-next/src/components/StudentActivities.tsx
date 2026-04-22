"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Gamepad2, BookOpen } from "lucide-react";

interface StudentActivitySummary {
  activityName: string;
  totalTime: number; // seconds
  count: number;
  scores?: number[];
  averageScore?: number;
}

interface StudentActivitiesProps {
  studentId: string;
  studentName: string;
}

export default function StudentActivities({ studentId, studentName }: StudentActivitiesProps) {
  const [activities, setActivities] = useState<StudentActivitySummary[]>([]);
  const [totalTime, setTotalTime] = useState(0);

  useEffect(() => {
    try {
      const activitiesData = JSON.parse(
        localStorage.getItem(`dl_student_${studentId}_activities`) || "{}"
      );

      const summary: StudentActivitySummary[] = Object.entries(activitiesData).map(
        ([name, data]: [string, any]) => ({
          activityName: name,
          totalTime: data.totalTime || 0,
          count: data.count || 0,
          scores: data.scores || [],
          averageScore: data.scores ? Math.round(data.scores.reduce((a: number, b: number) => a + b, 0) / data.scores.length) : undefined,
        })
      );

      const total = summary.reduce((acc, act) => acc + act.totalTime, 0);
      setTotalTime(total);
      setActivities(summary.sort((a, b) => b.totalTime - a.totalTime));
    } catch (error) {
      console.error("Failed to load activities:", error);
    }
  }, [studentId]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  if (activities.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>No activity data yet for {studentName}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-6"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Activity Details</h3>
          <p className="text-sm text-muted-foreground">
            Total time: <span className="font-semibold">{formatTime(totalTime)}</span>
          </p>
        </div>
        <Clock className="h-6 w-6 text-violet-600" />
      </div>

      <div className="space-y-3">
        {activities.map((activity, idx) => (
          <motion.div
            key={activity.activityName}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center justify-between rounded-lg bg-accent/30 p-4"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {activity.activityName.includes("game") ? (
                  <Gamepad2 className="h-4 w-4 text-amber-600" />
                ) : (
                  <BookOpen className="h-4 w-4 text-blue-600" />
                )}
                <span className="font-semibold text-foreground">{activity.activityName}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {activity.count} {activity.count === 1 ? "session" : "sessions"}
                {activity.averageScore && ` • Avg Score: ${activity.averageScore}`}
              </div>
            </div>

            <div className="text-right">
              <div className="font-mono font-bold text-foreground">
                {formatTime(activity.totalTime)}
              </div>
              <div className="text-xs text-muted-foreground">
                {((activity.totalTime / totalTime) * 100).toFixed(0)}%
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
