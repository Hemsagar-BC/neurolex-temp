import { useStudentStore, type StudentProgress } from "@/stores/studentStore";

/**
 * Hook for easy student progress tracking in games and features
 *
 * Example:
 * ```tsx
 * const { student, updateGameProgress, incrementReading } = useStudentProgress();
 *
 * // After game completes
 * updateGameProgress("soundMatch", { stars: 5 });
 *
 * // After reading session
 * incrementReading(15); // +15 minutes
 * ```
 */
export const useStudentProgress = () => {
  const { currentStudent, updateProgress } = useStudentStore();

  return {
    // Current student data
    student: currentStudent,
    isLoggedIn: !!currentStudent,

    // Update game progress
    updateGameProgress: (
      gameKey: "soundMatch" | "flipIt" | "wordBuilder",
      updates: { played?: number; stars?: number }
    ) => {
      if (!currentStudent) return;

      const current = currentStudent.progress[gameKey];
      updateProgress(gameKey, {
        played: updates.played ?? current.played + 1,
        stars: updates.stars ?? current.stars,
      });
    },

    // Increment reading time
    incrementReading: (minutes: number) => {
      if (!currentStudent) return;
      updateProgress("reading", {
        minutes: currentStudent.progress.reading.minutes + minutes,
      });
    },

    // Get total games played
    getTotalGamesPlayed: () => {
      if (!currentStudent) return 0;
      const { soundMatch, flipIt, wordBuilder } = currentStudent.progress;
      return soundMatch.played + flipIt.played + wordBuilder.played;
    },

    // Get reading minutes
    getReadingMinutes: () => currentStudent?.progress.reading.minutes ?? 0,

    // Get specific game progress
    getGameProgress: (gameKey: keyof StudentProgress) => {
      return currentStudent?.progress[gameKey] ?? null;
    },
  };
};
