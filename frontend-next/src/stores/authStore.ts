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
  createdAt: number;
  lastActive: number;
  progress: StudentProgress;
  streak: number;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

export interface Classroom {
  id: string;
  name: string;
  code: string;
  teacherId: string;
  createdAt: number;
  students: string[]; // Array of student IDs
  link: string;
}

export interface AuthState {
  // Current logged-in user
  currentStudent: Student | null;
  currentTeacher: Teacher | null;

  // Auth methods
  loginStudent: (name: string, classCode: string) => void;
  loginTeacher: (name: string, email: string) => void;
  logoutStudent: () => void;
  logoutTeacher: () => void;

  // Progress tracking
  updateStudentProgress: (gameKey: keyof StudentProgress, updates: any) => void;

  // Classroom management
  createClassroom: (name: string, teacherId: string) => Classroom;
  getTeacherClassrooms: (teacherId: string) => Classroom[];
  getClassroomStudents: (classroomCode: string) => Student[];
  addStudentToClassroom: (studentId: string, classroomCode: string) => void;

  // Load from localStorage
  loadFromLocalStorage: () => void;

  // Get all students in a class (for teacher)
  getClassStudents: (classCode: string) => Student[];
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentStudent: null,
  currentTeacher: null,

  loginStudent: (name: string, classCode: string) => {
    const classrooms = JSON.parse(
      localStorage.getItem("dl_classrooms") || "[]"
    ) as Classroom[];

    // Validate that the class code exists
    const classroom = classrooms.find((c) => c.code === classCode);
    if (!classroom) {
      throw new Error("Invalid class code. Please check and try again.");
    }

    const students = JSON.parse(
      localStorage.getItem("dl_students") || "[]"
    ) as Student[];

    // Check if student already exists
    let student = students.find(
      (s) => s.name.toLowerCase() === name.toLowerCase() && s.classCode === classCode
    );

    // Create new student if not found
    if (!student) {
      student = {
        id: "s" + Date.now(),
        name,
        classCode,
        createdAt: Date.now(),
        lastActive: Date.now(),
        streak: 0,
        progress: {
          soundMatch: { played: 0, stars: 0 },
          flipIt: { played: 0, stars: 0 },
          wordBuilder: { played: 0, stars: 0 },
          reading: { minutes: 0 },
        },
      };
      students.push(student);
      localStorage.setItem("dl_students", JSON.stringify(students));

      // Add student to classroom
      if (!classroom.students.includes(student.id)) {
        classroom.students.push(student.id);
        localStorage.setItem("dl_classrooms", JSON.stringify(classrooms));
      }
    }

    // Update last active
    student.lastActive = Date.now();
    const index = students.findIndex((s) => s.id === student!.id);
    if (index !== -1) {
      students[index] = student;
      localStorage.setItem("dl_students", JSON.stringify(students));
    }

    set({ currentStudent: student });
    localStorage.setItem("dl_current_student", JSON.stringify(student));
  },

  loginTeacher: (name: string, email: string) => {
    const teachers = JSON.parse(
      localStorage.getItem("dl_teachers") || "[]"
    ) as Teacher[];

    // Check if teacher exists by email
    let teacher = teachers.find((t) => t.email === email);

    // Create new teacher if not found
    if (!teacher) {
      teacher = {
        id: "t" + Date.now(),
        name,
        email,
        createdAt: Date.now(),
      };
      teachers.push(teacher);
      localStorage.setItem("dl_teachers", JSON.stringify(teachers));
    }

    set({ currentTeacher: teacher });
    localStorage.setItem("dl_current_teacher", JSON.stringify(teacher));
  },

  logoutStudent: () => {
    // Clear current student login data
    localStorage.removeItem("dl_current_student");
    // Clear session activity tracking
    localStorage.removeItem("dl_student_activity_session");
    set({ currentStudent: null });
  },

  logoutTeacher: () => {
    // Clear current teacher login data
    localStorage.removeItem("dl_current_teacher");
    // Clear session data
    localStorage.removeItem("dl_teacher_session");
    set({ currentTeacher: null });
  },

  updateStudentProgress: (gameKey, updates) => {
    const { currentStudent } = get();
    if (!currentStudent) return;

    const students = JSON.parse(
      localStorage.getItem("dl_students") || "[]"
    ) as Student[];

    const updated: Student = {
      ...currentStudent,
      progress: {
        ...currentStudent.progress,
        [gameKey]: {
          ...currentStudent.progress[gameKey],
          ...updates,
        },
      },
      lastActive: Date.now(),
    };

    set({ currentStudent: updated });
    localStorage.setItem("dl_current_student", JSON.stringify(updated));

    // Update in students array
    const index = students.findIndex((s) => s.id === updated.id);
    if (index !== -1) {
      students[index] = updated;
      localStorage.setItem("dl_students", JSON.stringify(students));
    }
  },

  createClassroom: (name: string, teacherId: string) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const classroom: Classroom = {
      id: "c" + Date.now(),
      name,
      code,
      teacherId,
      createdAt: Date.now(),
      students: [],
      link: `${typeof window !== "undefined" ? window.location.origin : ""}?join=${code}`,
    };

    const classrooms = JSON.parse(
      localStorage.getItem("dl_classrooms") || "[]"
    ) as Classroom[];
    classrooms.push(classroom);
    localStorage.setItem("dl_classrooms", JSON.stringify(classrooms));

    return classroom;
  },

  getTeacherClassrooms: (teacherId: string) => {
    const classrooms = JSON.parse(
      localStorage.getItem("dl_classrooms") || "[]"
    ) as Classroom[];
    return classrooms.filter((c) => c.teacherId === teacherId);
  },

  getClassroomStudents: (classroomCode: string) => {
    const students = JSON.parse(
      localStorage.getItem("dl_students") || "[]"
    ) as Student[];
    return students.filter((s) => s.classCode === classroomCode);
  },

  addStudentToClassroom: (studentId: string, classroomCode: string) => {
    const classrooms = JSON.parse(
      localStorage.getItem("dl_classrooms") || "[]"
    ) as Classroom[];
    const classroom = classrooms.find((c) => c.code === classroomCode);
    if (classroom && !classroom.students.includes(studentId)) {
      classroom.students.push(studentId);
      localStorage.setItem("dl_classrooms", JSON.stringify(classrooms));
    }
  },

  loadFromLocalStorage: () => {
    const student = localStorage.getItem("dl_current_student");
    const teacher = localStorage.getItem("dl_current_teacher");

    if (student) {
      try {
        set({ currentStudent: JSON.parse(student) });
      } catch (error) {
        console.error("Failed to load student from localStorage:", error);
      }
    }

    if (teacher) {
      try {
        set({ currentTeacher: JSON.parse(teacher) });
      } catch (error) {
        console.error("Failed to load teacher from localStorage:", error);
      }
    }
  },

  getClassStudents: (classCode: string) => {
    const students = JSON.parse(
      localStorage.getItem("dl_students") || "[]"
    ) as Student[];
    return students.filter((s) => s.classCode === classCode);
  },
}));
