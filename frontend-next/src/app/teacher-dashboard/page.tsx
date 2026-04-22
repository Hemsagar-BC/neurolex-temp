"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, type Classroom } from "@/stores/authStore";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LogOut,
  Plus,
  Copy,
  CheckCircle,
  Users,
  ArrowLeft,
} from "lucide-react";

export default function TeacherDashboard() {
  const router = useRouter();
  const { currentTeacher, logoutTeacher, getTeacherClassrooms, createClassroom, getClassroomStudents } =
    useAuthStore();

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [classroomName, setClassroomName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentTeacher) {
      router.replace("/teacher-login");
    } else {
      setIsHydrated(true);
      const teacherClassrooms = getTeacherClassrooms(currentTeacher.id);
      setClassrooms(teacherClassrooms);
    }
  }, [currentTeacher, router, getTeacherClassrooms]);

  const handleLogout = () => {
    logoutTeacher();
    router.push("/");
  };

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classroomName.trim() || !currentTeacher) return;

    setIsCreating(true);
    try {
      const newClassroom = createClassroom(classroomName.trim(), currentTeacher.id);
      setClassrooms([...classrooms, newClassroom]);
      setClassroomName("");
      setShowAddForm(false);
    } catch (error) {
      console.error("Error creating classroom:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = (classroom: Classroom) => {
    navigator.clipboard.writeText(classroom.link);
    setCopiedId(classroom.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isHydrated || !currentTeacher) {
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-foreground">
                My Classrooms
              </h1>
              <p className="text-muted-foreground mt-1">
                Welcome, {currentTeacher.name}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold transition-all shadow-md"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Add Classroom Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          {!showAddForm ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-3 px-8 py-4 bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              <Plus className="w-6 h-6" />
              Add Classroom
            </motion.button>
          ) : (
            <div className="glass-card rounded-2xl p-6">
              <form onSubmit={handleCreateClassroom} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Classroom Name
                  </label>
                  <input
                    type="text"
                    value={classroomName}
                    onChange={(e) => setClassroomName(e.target.value)}
                    placeholder="e.g., Math 101, English Literature"
                    className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all bg-background text-foreground"
                    disabled={isCreating}
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isCreating || !classroomName.trim()}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                  >
                    {isCreating ? "Creating..." : "Create"}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setClassroomName("");
                    }}
                    className="px-6 py-2 border border-border hover:bg-accent text-foreground font-semibold rounded-lg transition-all"
                  >
                    Cancel
                  </motion.button>
                </div>
              </form>
            </div>
          )}
        </motion.div>

        {/* Classrooms Grid */}
        {classrooms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h3 className="text-xl font-bold text-foreground mb-2">
              No classrooms yet
            </h3>
            <p className="text-muted-foreground">
              Create your first classroom to get started!
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {classrooms.map((classroom, idx) => {
              const studentsInClass = getClassroomStudents(classroom.code);
              return (
                <motion.div
                  key={classroom.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="glass-card rounded-2xl p-6 flex flex-col"
                >
                  {/* Header */}
                  <h3 className="text-xl font-bold text-foreground mb-4">
                    {classroom.name}
                  </h3>

                  {/* Stats */}
                  <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>
                      <span className="font-bold text-foreground">
                        {studentsInClass.length}
                      </span>{" "}
                      students
                    </span>
                  </div>

                  {/* Code */}
                  <div className="mb-4 p-3 bg-accent/50 rounded-lg">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                      Class Code
                    </p>
                    <p className="font-mono font-bold text-foreground">
                      {classroom.code}
                    </p>
                  </div>

                  {/* Link Section */}
                  <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <p className="text-xs font-semibold text-emerald-700 mb-2">
                      Share with Students
                    </p>
                    <div className="flex gap-2">
                      <code className="flex-1 text-xs px-2 py-1 bg-background border border-border rounded font-mono break-all">
                        {classroom.link.replace("http://", "").replace("https://", "")}
                      </code>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleCopyLink(classroom)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded transition-all flex items-center gap-1 whitespace-nowrap"
                      >
                        {copiedId === classroom.id ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>

                  {/* View Button */}
                  <Link
                    href={`/classroom-details?id=${classroom.id}`}
                    className="w-full py-2 px-4 bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all text-center"
                  >
                    View Students
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Back Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-12"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-accent transition-all font-semibold text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
