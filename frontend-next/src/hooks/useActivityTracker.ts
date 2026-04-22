import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";

export interface ActivityRecord {
  activityName: string;
  activityType: "game" | "task";
  path: string;
  startTime: number;
  endTime: number;
  duration: number;
  score?: number;
  gameType?: string;
  timestamp: number;
}

export const useActivityTracker = (activityName: string, activityPath: string, activityType: "game" | "task" = "task") => {
  const { currentStudent } = useAuthStore();
  const startTimeRef = useRef<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousPathRef = useRef<string>(activityPath);

  // Reset timer when path changes
  useEffect(() => {
    if (previousPathRef.current !== activityPath) {
      // Save previous activity before switching
      if (startTimeRef.current > 0 && previousPathRef.current) {
        saveActivity();
      }
      // Reset timer for new path
      setElapsedSeconds(0);
      startTimeRef.current = Date.now();
      previousPathRef.current = activityPath;
    }
  }, [activityPath]);

  // Start timer on component mount
  useEffect(() => {
    if (!currentStudent) return;

    startTimeRef.current = Date.now();

    // Update elapsed time every second
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [currentStudent]);

  // Save activity when component unmounts
  useEffect(() => {
    return () => {
      if (currentStudent && startTimeRef.current > 0) {
        saveActivity();
      }
    };
  }, [currentStudent]);

  const saveActivity = (score?: number) => {
    if (!currentStudent || startTimeRef.current === 0) return;

    const endTime = Date.now();
    const duration = Math.floor((endTime - startTimeRef.current) / 1000);

    // Don't save if duration is less than 1 second
    if (duration < 1) return;

    const activity: ActivityRecord = {
      activityName,
      activityType,
      path: activityPath,
      startTime: startTimeRef.current,
      endTime,
      duration,
      score,
      timestamp: Date.now(),
    };

    try {
      const activities = JSON.parse(localStorage.getItem("dl_student_activities") || "[]") as ActivityRecord[];
      activities.push(activity);
      localStorage.setItem("dl_student_activities", JSON.stringify(activities));

      // Also update student's activity summary
      const studentActivities = JSON.parse(localStorage.getItem(`dl_student_${currentStudent.id}_activities`) || "{}");
      if (!studentActivities[activityName]) {
        studentActivities[activityName] = { totalTime: 0, count: 0, scores: [] };
      }
      studentActivities[activityName].totalTime += duration;
      studentActivities[activityName].count += 1;
      if (score !== undefined) {
        studentActivities[activityName].scores.push(score);
      }
      localStorage.setItem(`dl_student_${currentStudent.id}_activities`, JSON.stringify(studentActivities));
    } catch (error) {
      console.error("Failed to save activity:", error);
    }

    startTimeRef.current = 0;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return {
    elapsedSeconds,
    formattedTime: formatTime(elapsedSeconds),
    saveActivity,
  };
};

