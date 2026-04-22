"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Clock, CheckCircle, Target } from "lucide-react";
import type { ActivityRecord } from "@/hooks/useActivityTracker";

interface StudentActivitySummary {
  [activityName: string]: {
    totalTime: number;
    count: number;
    lastVisit: number;
    assessmentPassed?: boolean;
    score?: number;
  };
}

interface StudentActivityDetailsProps {
  studentId: string;
  studentName: string;
}

export default function StudentActivityDetails({
  studentId,
  studentName,
}: StudentActivityDetailsProps) {
  const [activities, setActivities] = useState<StudentActivitySummary>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [assessmentReports, setAssessmentReports] = useState<ActivityRecord[]>([]);

  useEffect(() => {
    // Load activity data from localStorage
    const storedData = localStorage.getItem(
      `dl_student_${studentId}_activities`
    );
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        setActivities(parsed);
      } catch (error) {
        console.error("Failed to parse activity data:", error);
      }
    }

    // Load all activities to find assessment reports
    const allActivities = localStorage.getItem("dl_student_activities");
    if (allActivities) {
      try {
        const activities: ActivityRecord[] = JSON.parse(allActivities);
        const studentAssessments = activities.filter(
          (a) =>
            a.path === `/onboarding` &&
            localStorage
              .getItem("dl_current_student")
              ?.includes(studentId)
        );
        setAssessmentReports(studentAssessments);
      } catch (error) {
        console.error("Failed to load assessments:", error);
      }
    }
  }, [studentId]);

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes < 60) return `${minutes}m ${secs}s`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getTotalActivityTime = (): number => {
    return Object.values(activities).reduce(
      (sum, activity) => sum + activity.totalTime,
      0
    );
  };

  const activityList = Object.entries(activities)
    .sort((a, b) => b[1].totalTime - a[1].totalTime)
    .slice(0, 5); // Show top 5 activities

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-lg border border-border bg-accent/30 p-4"
    >
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left font-semibold text-foreground hover:text-violet-600 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-violet-600" />
          <div>
            <p>Activity Summary</p>
            <p className="text-xs text-muted-foreground font-normal">
              Total time: {formatDuration(getTotalActivityTime())}
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4 space-y-3 border-t border-border pt-4"
          >
            {/* Activity Duration Breakdown */}
            {activityList.length > 0 ? (
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                  Top Activities
                </h4>
                <div className="space-y-2">
                  {activityList.map(([name, data]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between p-2 rounded-lg bg-background/50 hover:bg-background transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {data.count} visit{data.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-violet-600">
                          {formatDuration(data.totalTime)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {((data.totalTime / getTotalActivityTime()) * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No activity data yet
              </p>
            )}

            {/* Assessment Reports */}
            {assessmentReports.length > 0 && (
              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Assessment Reports
                </h4>
                <div className="space-y-2">
                  {assessmentReports.map((report, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Assessment Completed
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(report.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {report.score !== undefined && (
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-600">
                            {report.score}%
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
