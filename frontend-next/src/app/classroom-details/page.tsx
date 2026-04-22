"use client";

import { Fragment, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore, type Student, type Classroom } from "@/stores/authStore";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Copy,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import StudentActivityDetails from "@/components/StudentActivityDetails";

function ClassroomDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTeacher, getTeacherClassrooms, getClassroomStudents } =
    useAuthStore();

  const classroomId = searchParams.get("id");
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [studentActivityTotals, setStudentActivityTotals] = useState<Record<string, number>>({});

  const formatDurationSeconds = (seconds: number): string => {
    if (seconds <= 0) return "-";
    return `${seconds}s`;
  };

  useEffect(() => {
    if (!currentTeacher) {
      router.replace("/teacher-login");
      return;
    }

    if (!classroomId) {
      router.replace("/teacher-dashboard");
      return;
    }

    // Get classroom details
    const classrooms = getTeacherClassrooms(currentTeacher.id);
    const found = classrooms.find((c) => c.id === classroomId);

    if (found) {
      setClassroom(found);
      const classStudents = getClassroomStudents(found.code);
      setStudents(classStudents);
    }

    setIsHydrated(true);
  }, [currentTeacher, classroomId, router, getTeacherClassrooms, getClassroomStudents]);

  useEffect(() => {
    if (students.length === 0) {
      setStudentActivityTotals({});
      return;
    }

    const totals: Record<string, number> = {};

    students.forEach((student) => {
      try {
        const storedData = localStorage.getItem(`dl_student_${student.id}_activities`);
        if (!storedData) {
          totals[student.id] = 0;
          return;
        }

        const parsedActivities = JSON.parse(storedData) as Record<string, { totalTime?: number }>;
        totals[student.id] = Object.values(parsedActivities).reduce(
          (sum, activity) => sum + (activity.totalTime || 0),
          0
        );
      } catch (error) {
        console.error(`Failed to load activity total for student ${student.id}:`, error);
        totals[student.id] = 0;
      }
    });

    setStudentActivityTotals(totals);
  }, [students]);

  const handleCopyLink = () => {
    if (classroom) {
      navigator.clipboard.writeText(classroom.link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (!isHydrated || !classroom) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-violet-300 border-t-violet-600 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen home-page">
      {/* Header */}
      <div className="border-b border-border bg-accent/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/teacher-dashboard"
              className="flex items-center gap-2 text-violet-600 hover:text-violet-700 font-semibold"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Link>
          </div>

          <h1 className="text-3xl font-black text-foreground mb-2">
            {classroom.name}
          </h1>

          {/* Shareable Link Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
          >
            <p className="text-sm font-semibold text-muted-foreground mb-2">
              Shareable Link for Students:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-background border border-border rounded-lg font-mono text-sm break-all">
                {classroom.link}
              </code>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCopyLink}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap"
              >
                {copiedLink ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Students Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <Users className="w-5 h-5" />
            <h2 className="text-xl font-bold text-foreground">
              Students ({students.length})
            </h2>
          </div>

          {students.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground font-semibold">
                No students have joined yet
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Share the link above with your students
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-accent/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Last Seen
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Visit Duration (seconds)
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Activity
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => {
                    const durationSeconds = studentActivityTotals[student.id] || 0;

                    return (
                      <Fragment key={student.id}>
                      <motion.tr
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="border-b border-border hover:bg-accent/50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-foreground">
                          {student.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {new Date(student.lastActive).toLocaleDateString(
                            undefined,
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-foreground">
                          {formatDurationSeconds(durationSeconds)}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground align-top">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedStudentId((current) =>
                                current === student.id ? null : student.id
                              )
                            }
                            className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors"
                          >
                            <ChevronDown
                              className={`w-3 h-3 transition-transform ${
                                expandedStudentId === student.id ? "rotate-180" : ""
                              }`}
                            />
                            {expandedStudentId === student.id ? "Hide details" : "View details"}
                          </button>
                        </td>
                      </motion.tr>
                      {expandedStudentId === student.id && (
                        <tr>
                          <td colSpan={4} className="px-6 pb-6 pt-0 bg-background/60">
                            <StudentActivityDetails
                              studentId={student.id}
                              studentName={student.name}
                            />
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function ClassroomDetails() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-violet-300 border-t-violet-600 rounded-full"
          />
        </div>
      }
    >
      <ClassroomDetailsContent />
    </Suspense>
  );
}
