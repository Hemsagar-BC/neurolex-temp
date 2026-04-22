import { create } from "zustand";

export interface StudentProgress {
  soundMatch: { played: number; stars: number };
  flipIt: { played: number; stars: number };
  wordBuilder: { played: number; stars: number };
  reading: { minutes: number };
}

export interface Student {
  id: string;
  name: string;
  classCode: string;
  streak: number;
  lastSeen: number;
  progress: StudentProgress;
}

interface StudentStore {
  currentStudent: Student | null;
  setCurrentStudent: (student: Student | null) => void;
  loadFromLocalStorage: () => void;
  saveToLocalStorage: () => void;
  createStudent: (name: string, classCode: string) => Student;
  updateProgress: (gameKey: keyof StudentProgress, updates: any) => void;
}

export const useStudentStore = create<StudentStore>((set, get) => ({
  currentStudent: null,

  setCurrentStudent: (student) => set({ currentStudent: student }),

  loadFromLocalStorage: () => {
    try {
      const stored = localStorage.getItem("dl_current_student");
      if (stored) {
        set({ currentStudent: JSON.parse(stored) });
      }
    } catch (error) {
      console.error("Failed to load student from localStorage:", error);
    }
  },

  saveToLocalStorage: () => {
    const { currentStudent } = get();
    if (currentStudent) {
      localStorage.setItem("dl_current_student", JSON.stringify(currentStudent));
    }
  },

  createStudent: (name: string, classCode: string) => {
    const newStudent: Student = {
      id: "s" + Date.now(),
      name,
      classCode,
      streak: 0,
      lastSeen: Date.now(),
      progress: {
        soundMatch: { played: 0, stars: 0 },
        flipIt: { played: 0, stars: 0 },
        wordBuilder: { played: 0, stars: 0 },
        reading: { minutes: 0 },
      },
    };

    // Save to students array
    try {
      const students = JSON.parse(localStorage.getItem("dl_students") || "[]");
      students.push(newStudent);
      localStorage.setItem("dl_students", JSON.stringify(students));
    } catch {
      console.error("Failed to save student to array");
    }

    // Set as current
    set({ currentStudent: newStudent });
    localStorage.setItem("dl_current_student", JSON.stringify(newStudent));

    return newStudent;
  },

  updateProgress: (gameKey, updates) => {
    const { currentStudent } = get();
    if (!currentStudent) return;

    const updated: Student = {
      ...currentStudent,
      progress: {
        ...currentStudent.progress,
        [gameKey]: {
          ...currentStudent.progress[gameKey],
          ...updates,
        },
      },
      lastSeen: Date.now(),
    };

    set({ currentStudent: updated });
    localStorage.setItem("dl_current_student", JSON.stringify(updated));

    // Update in students array
    try {
      const students = JSON.parse(localStorage.getItem("dl_students") || "[]");
      const index = students.findIndex((s: Student) => s.id === updated.id);
      if (index !== -1) {
        students[index] = updated;
        localStorage.setItem("dl_students", JSON.stringify(students));
      }
    } catch {
      console.error("Failed to update student in array");
    }
  },
}));
