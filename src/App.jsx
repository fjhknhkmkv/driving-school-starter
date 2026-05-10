
// App.jsx content placeholder - will paste actual code manually after download
import React, { useEffect, useState, useMemo } from "react";
import { motion, useScroll } from "framer-motion";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import logo from "./image/dry.png";
import hero from "./image/1.png";
import h from "./image/2.jpg";
import o from "./image/3.png";
import r from "./image/4.png";
import drivingVideo from "./image/1.mp4";




import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail, 
  onAuthStateChanged,
  collection,
  getDocs,
  addDoc,
  setDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  where,
} from "./firebase";

import { deleteDoc } from "firebase/firestore";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";

// Helper functions
const formatTimestamp = (ts) => {
  if (!ts) return "N/A";
  const seconds = ts.seconds ?? (ts._seconds ?? null);
  if (!seconds) return "N/A";
  return new Date(seconds * 1000).toLocaleString();
};
const tsToDateKey = (ts) => {
  if (!ts) return null;
  const seconds = ts.seconds ?? (ts._seconds ?? null);
  if (!seconds) return null;
  const d = new Date(seconds * 1000);
  return d.toISOString().split("T")[0];
};

// --- HARD-CODED LESSON QUESTIONS (5 MCQ + 2 short Q) ---
// keyed by lesson order (number)
const LESSON_QUESTIONS = {
  1: {
    mcq: [
      { q: "What is the first thing to do before starting the engine?", options: ["Adjust seat & mirrors", "Turn key immediately", "Honk", "Switch on lights"], correctIndex: 0 },
      { q: "When should you use indicators?", options: ["Before turning", "After turning", "Only on highways", "Never"], correctIndex: 0 },
      { q: "Seatbelt helps to:", options: ["Improve radio reception", "Protect during crash", "Increase speed", "Reduce tyre wear"], correctIndex: 1 },
      { q: "Red traffic light means:", options: ["Go", "Stop", "Slow down", "Overtake"], correctIndex: 1 },
      { q: "Check mirrors to:", options: ["See behind you", "See the sky", "Only when parked", "Adjust radio"], correctIndex: 0 },
    ],
    short: [
      "Explain how to check your mirrors before moving off.",
      "Describe the steps to adjust your seat for safe driving."
    ]
  },
  2: {
    mcq: [
      { q: "Parallel parking is usually performed on which side of the road?", options: ["Left", "Right", "Either depending on country", "Middle of street"], correctIndex: 2 },
      { q: "When parking uphill without curb, wheels should be:", options: ["Turn away from curb", "Turn towards curb", "Stay straight", "Doesn't matter"], correctIndex: 0 },
      { q: "Before reversing you should:", options: ["Check mirrors and blind spot", "Close eyes", "Honk only", "Turn radio off"], correctIndex: 0 },
      { q: "Handbrake is used to:", options: ["Keep stationary when parked", "Accelerate", "Sound horn", "Wash windshield"], correctIndex: 0 },
      { q: "When leaving parking spot, check:", options: ["Pedestrians", "Mirrors", "Blind spot", "All of the above"], correctIndex: 3 },
    ],
    short: [
      "Write step-by-step how you perform a reverse parking manoeuvre.",
      "What safety checks should you do before leaving a parked car?"
    ]
  }
};

// Auth Hook
function useAuthUser() {
  const [user, setUser] = useState(null);
  const [userMeta, setUserMeta] = useState(null); // name, phone, email
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser({ uid: u.uid, email: u.email });
        try {
          const userDoc = await getDocs(collection(db, "users"));
          const docData = userDoc.docs.find((d) => d.id === u.uid);
          if (docData) setUserMeta(docData.data());
        } catch (e) {
          console.error("Failed to load user meta:", e);
        }
      } else {
        setUser(null);
        setUserMeta(null);
      }
    });
    return () => unsub();
  }, []);
  return { user, userMeta };
}

// Private route component
const PrivateRoute = ({ user, children }) => {
  if (!user) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  const { user, userMeta } = useAuthUser();

  // Auth form
  const [mode, setMode] = useState("login"); // login | register
  const [role, setRole] = useState("student");
  const [name, setName] = useState(""); // new
  const [phone, setPhone] = useState(""); // new
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Data
  const [allUsers, setAllUsers] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Lesson form temporary state (student answers stored here before submit)
  // shape: { [lessonId]: { mcq: [selectedIndex,...], short: [text,...] } }
  const [lessonAnswers, setLessonAnswers] = useState({});

  useEffect(() => {
    // Load lessons if empty and set up realtime listeners
    const loadLessons = async () => {
      const snap = await getDocs(collection(db, "lessons"));
      if (snap.empty) {
        await addDoc(collection(db, "lessons"), {
          title: "Lesson 1 - Basics",
          content: "Introduction to controls and traffic rules.",
          order: 1,
        });
        await addDoc(collection(db, "lessons"), {
          title: "Lesson 2 - Parking",
          content: "How to park safely.",
          order: 2,
        });
      }
      const fresh = await getDocs(query(collection(db, "lessons"), orderBy("order")));
      setLessons(fresh.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    const loadUsers = async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Failed to load users:", err);
      }
    };
    loadLessons();
    loadUsers();
  

    // realtime listeners
    const unsubAvail = onSnapshot(query(collection(db, "availability"), orderBy("date")), (snap) =>
      setAvailability(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubBookings = onSnapshot(query(collection(db, "bookings"), orderBy("date")), (snap) =>
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubProgress = onSnapshot(collection(db, "progress"), (snap) =>
      setProgress(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    loadLessons().catch(console.error);
    return () => {
      try { unsubAvail(); } catch {}
      try { unsubBookings(); } catch {}
      try { unsubProgress(); } catch {}
    };
},[]);

const getStudentName = (studentId) => {
  const student = allUsers.find(u => u.id === studentId);
  return student ? student.name : studentId; // fallback to ID if name not found
};

  // Chart data for student (only approved lessons)
  const chartData = useMemo(() => {
    if (!user) return [];
    const userProgress = progress.filter((p) => p.studentId === user.uid && p.approved);
    return userProgress.map((p) => {
      const lesson = lessons.find((l) => l.id === p.lessonId);
      return { lesson: lesson ? lesson.title : p.lessonId, score: Number(p.score) || 0 };
    });
  }, [progress, lessons, user]);

  // Dates marked on calendar (availability)
  const markedDates = useMemo(() => {
    const setDates = new Set();
    availability.forEach((a) => {
      if (typeof a.date === "string") setDates.add(a.date);
      else if (a.date && a.date.seconds) setDates.add(tsToDateKey(a.date));
      else if (a.createdAt && a.createdAt.seconds) setDates.add(tsToDateKey(a.createdAt));
    });
    return setDates;
  }, [availability]);

  // --- Auth actions ---

const doRegister = async () => {

  if (!name || !email || !phone || !password) {
    return alert("Fill all fields");
  }

  // Password validation
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  if (!passwordRegex.test(password)) {
    return alert(
      "Password must be at least 8 characters and include uppercase, lowercase and number"
    );
  }

  try {

    const res = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Save user data
    await setDoc(doc(db, "users", res.user.uid), {
      name,
      email,
      phone,
      role,
    });

    // Send verification email
    await sendEmailVerification(res.user);

    alert(
      "Registered successfully. Verification email sent. Please verify your email before login."
    );

    setMode("login");

    setName("");
    setPhone("");
    setEmail("");
    setPassword("");

  } catch (error) {
    alert(error.message);
  }
};

const doLogin = async () => {

  if (!email || !password) {
    return alert("Enter email and password");
  }

  try {

    const res = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Reload user
    await res.user.reload();

    // Check email verification
    if (!res.user.emailVerified) {

      await signOut(auth);

      return alert(
        "Please verify your email before logging in."
      );
    }

    setEmail("");
    setPassword("");

  } catch (error) {
    alert(error.message);
  }
};

const doLogout = async () => await signOut(auth);


// Forgot password
const doForgotPassword = async () => {

  if (!email) {
    return alert("Enter your email first");
  }

  try {

    await sendPasswordResetEmail(auth, email);

    alert("Password reset email sent");

  } catch (error) {

    alert(error.message);

  }
};
  // --- Availability & booking logic ---

  // Create availability (instructor)
  const addAvailability = async (dateObj, slot = "09:00") => {
    if (!user) return alert("Login as instructor first");
    if (userMeta?.role !== "instructor") return alert("Only instructors can add availability");
    const dateKey = dateObj.toISOString().split("T")[0];
    await addDoc(collection(db, "availability"), {
      instructorId: user.uid,
      date: dateKey,
      slot,
      createdAt: new Date(),
    });
  };

  // Book an availability (student)
  const bookAvailability = async (availDoc) => {
    if (!user) return alert("Login as student first");
    if (userMeta?.role !== "student") return alert("Only students can book");
    // Check if availability already has a booking
    const isBooked = bookings.some((b) => b.availId === availDoc.id && b.status === "booked");
    if (isBooked) return alert("Sorry — this slot is already booked.");
    // create booking
    await addDoc(collection(db, "bookings"), {
      availId: availDoc.id,
      studentId: user.uid,
      studentName: userMeta?.name || "Unknown Student",
      studentEmail: userMeta?.email || "",
      instructorId: availDoc.instructorId,
      date: availDoc.date,
      slot: availDoc.slot,
      status: "booked",
      lessonId: lessons?.[0]?.id || null,
      createdAt: new Date(),
    });
    alert("Booked!");
  };

  // Cancel booking (student can cancel their own booking)
  const cancelBooking = async (b) => {
    if (!user) return alert("Login first");
    if (b.studentId !== user.uid && userMeta?.role !== "instructor") return alert("Not allowed");
    await updateDoc(doc(db, "bookings", b.id), { status: "cancelled" });
  };

  // Instructor approves or rejects a student's progress
  const approveProgress = async (p) => {
    if (!user) return alert("Login as instructor");
    if (userMeta?.role !== "instructor") return alert("Only instructors can approve");
    await updateDoc(doc(db, "progress", p.id), { approved: true, rejected: false, reviewedBy: user.uid, reviewedAt: new Date() });
  };
  const rejectProgress = async (p) => {
    if (!user) return alert("Login as instructor");
    if (userMeta?.role !== "instructor") return alert("Only instructors can reject");
    await updateDoc(doc(db, "progress", p.id), { approved: false, rejected: true, reviewedBy: user.uid, reviewedAt: new Date() });
  };

  // tileClassName for calendar
  const tileClassName = ({ date, view }) => {
    if (view === "month") {
      const key = date.toISOString().split("T")[0];
      if (markedDates.has(key)) return "border-2 border-indigo-300 bg-indigo-50 rounded-md";
    }
    return null;
  };

  // Helper: is availability booked?
  const isAvailBooked = (avail) => bookings.some((b) => b.availId === avail.id && b.status === "booked");

  // Helper: find booking for avail
  const bookingForAvail = (avail) => bookings.find((b) => b.availId === avail.id && b.status === "booked");

  const [newSlot, setNewSlot] = useState("09:00");

  const editAvailability = async (id) => {
    const newTime = prompt("Enter new time (HH:mm):");
    if (!newTime) return;
    await updateDoc(doc(db, "availability", id), { slot: newTime });
  };

  const deleteAvailability = async (id) => {
    if (!window.confirm("Delete this time slot?")) return;
    try {
      await deleteDoc(doc(db, "availability", id));
      alert("Time slot deleted successfully!");
    } catch (e) {
      console.error("Failed to delete availability:", e);
      alert("Failed to delete. Check console for errors.");
    }
  };

  // Scroll progress bar component
  function ScrollProgress() {
    const { scrollYProgress } = useScroll();
    return (
      <motion.div
        style={{ scaleX: scrollYProgress }}
        className="fixed top-0 left-0 right-0 h-1 bg-[#45b1cb] origin-left z-50"
      />
    );
  }

  // --- Student: submit lesson answers ---
  // Calculate mcq score and store answers object with mcq indexes and short texts
  const submitLessonAnswers = async (lesson) => {
    if (!user) return alert("Please login");
    const answersForLesson = lessonAnswers[lesson.id];
    if (!answersForLesson) return alert("Please answer the questions before submitting");

    // Validate MCQ answers count
    const qSet = LESSON_QUESTIONS[lesson.order];
    if (!qSet) return alert("Questions not found for this lesson");
    const mcqAns = answersForLesson.mcq || [];
    if (mcqAns.length !== qSet.mcq.length) return alert("Please answer all MCQs");

    // calculate score
    let correct = 0;
    qSet.mcq.forEach((mq, idx) => {
      if (mcqAns[idx] === mq.correctIndex) correct++;
    });
    const score = Math.round((correct / qSet.mcq.length) * 100);

    await addDoc(collection(db, "progress"), {
      studentId: user.uid,
      lessonId: lesson.id,
      answers: {
        mcq: mcqAns,
        short: answersForLesson.short || []
      },
      score,
      approved: false,
      rejected: false,
      timestamp: new Date(),
    });

    alert(`Submitted. Your MCQ score: ${score}%. Waiting for instructor approval.`);
    // Clear local answers for that lesson
    setLessonAnswers(prev => {
      const copy = { ...prev };
      delete copy[lesson.id];
      return copy;
    });
  };

  // --- Helper: student's completed (approved) lessons IDs ---
  const completedLessonsIds = useMemo(() => {
    if (!user) return [];
    return progress.filter(p => p.studentId === user.uid && p.approved).map(p => p.lessonId);
  }, [progress, user]);

  // --- Helper: find progress entry for student+lesson (latest) ---
  const findStudentProgress = (studentId, lessonId) => {
    // return latest progress doc for student+lesson (if multiple submissions)
    const list = progress.filter(p => p.studentId === studentId && p.lessonId === lessonId);
    if (list.length === 0) return null;
    return list.sort((a, b) => (new Date(b.timestamp || 0) - new Date(a.timestamp || 0)))[0];
  };

  // Footer component
  const Footer = () => (
    <footer className="bg-[#000000] text-white p-6 mt-12">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-6">
        <div>
          <h3 className="font-bold text-lg text-[#45b1cb]">D R Y Driving School</h3>
          <p>Learn safe driving with us!</p>
        </div>
        <div>
          <h4 className="font-semibold">Contact</h4>
          <p>Phone: +61 0481196311</p>
          <p>Email: dryauto777@gmail.com</p>
          <p>Address: Casuarina, Darwin, NT</p>
        </div>
      </div>
    </footer>
  );

  return (
    <Router>
      <ScrollProgress />

      <div
        className="min-h-screen bg-cover bg-center"
        style={{ backgroundImage: `url(${o})` }}
      >
        {/* Navbar */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-6xl mx-auto mb-6">
          <div className="bg-[#000000] rounded-2xl shadow-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Logo + Title */}
            <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
              <img src={logo} alt="Company Logo" className="h-24 w-24 object-contain" />
              <div>
                <h1 className="text-3xl font-extrabold text-[#45b1cb]">D R Y Driving School</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/" className="text-sm text-gray-200 hover:underline">Home</Link>
              <Link to="/dashboard" className="text-sm text-gray-200 hover:underline">Dashboard</Link>

              {!user ? (
                <div className="flex items-center gap-2">
                  <Link to="/auth" className="bg-[#45b1cb] text-black px-3 py-1 rounded">Login / Register</Link>
                </div>
              ) : (
                <>
                  <div className="text-sm text-[#45b1cb]">Hello, <span className="font-medium">{userMeta?.name || user.email}</span></div>
                  <button onClick={doLogout} className="bg-red-500 text-white px-3 py-1 rounded shadow hover:bg-red-600">Logout</button>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Routes */}
        <Routes>
          {/* Home page */}
          <Route path="/" element={
            <div className="max-w-6xl mx-auto space-y-12">
              {/* Hero */}
              <section className="relative rounded-2xl overflow-hidden shadow-lg h-[600px]">
                <div className="absolute inset-0">
                  <video src={drivingVideo} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0" />
                </div>

                <motion.div
                  className="relative z-10 text-top r py-28 px-6"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true, amount: 0.3 }}
                >
                  {/* You can place hero content here */}
                </motion.div>
              </section>

              {/* Services */}
              <section className="py-12">
                <h2 className="text-3xl font-bold text-center mb-8 text-[#45b1cb]">Our Services</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { title: "Beginner Lessons", img: hero, desc: "Start from basics" },
                    { title: "Refresher Lessons", img: h, desc: "Brush up your skills" },
                    { title: "Test Prep", img: r, desc: "Pass your test confidently" },
                  ].map((s, i) => (
                    <motion.div
                      key={i}
                      className="rounded-lg overflow-hidden shadow-lg bg-white"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: i * 0.15 }}
                      viewport={{ once: true, amount: 0.3 }}
                    >
                      <img src={s.img} alt={s.title} className="w-full h-40 object-cover" loading="lazy" />
                      <div className="p-4">
                        <h3 className="font-semibold text-lg mb-1 text-gray-800">{s.title}</h3>
                        <p className="text-sm text-gray-600">{s.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* About */}
              <section className="py-12 bg-gray-50 rounded-2xl p-8">
                <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
                  <h2 className="text-3xl font-bold text-[#45b1cb] mb-4 text-center">About Us</h2>
                  <p className="max-w-3xl mx-auto text-gray-700 text-center">
                    We are experienced instructors who help learners build safe driving habits and pass their tests.
                  </p>
                </motion.div>
              </section>

              {/* Contact / CTA */}
              <section className="py-12 text-center">
                <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
                  <h2 className="text-2xl text-[#45b1cb] font-bold mb-3">Ready to start?</h2>
                  <p className="mb-4 text-gray-600">Book your first lesson or contact us for more information.</p>
                  <Link to="/auth" className="inline-block bg-[#45b1cb] text-black px-5 py-3 rounded-lg font-semibold hover:brightness-95 transition">Login / Register</Link>
                </motion.div>
              </section>
            </div>
          } />

          {/* Auth page (separate) */}
          <Route path="/auth" element={
            <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow">
              <h2 className="text-xl font-semibold mb-4 text-[#45b1cb]">Login or Register</h2>

              {!user ? (
                <div className="space-y-3">
                  <select value={role} onChange={(e) => setRole(e.target.value)} className="border rounded px-2 py-1">
                    <option value="student">Student</option>
                    <option value="instructor">Instructor</option>
                  </select>

                  {mode === "register" && (
                    <>
                      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-2 py-1 w-full" />
                      <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="border rounded px-2 py-1 w-full" />
                    </>
                  )}

                  <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="border rounded px-2 py-1 w-full" />
                  <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="border rounded px-2 py-1 w-full" />

                  {mode === "register" ? (
                    <div className="flex gap-2">
                      <button onClick={doRegister} className="bg-black-500 text-[#45b1cb] px-4 py-2 rounded">Register</button>
                      <button onClick={() => setMode("login")} className="px-4 py-2 border rounded">Back to login</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={doLogin} className="bg-blue-600 text-white px-4 py-2 rounded">Login</button>
                      <button onClick={() => setMode("register")} className="px-4 py-2 border rounded">Create account</button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p>You're already logged in as <strong>{userMeta?.name || user.email}</strong>.</p>
                  <button onClick={doLogout} className="mt-3 bg-red-500 text-white px-4 py-2 rounded">Logout</button>
                </div>
              )}
            </div>
          }/>

          {/* Dashboard */}
          <Route path="/dashboard" element={
            <PrivateRoute user={user}>
              <div className="max-w-6xl mx-auto">
                <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Calendar & Availability */}
                  <section className="col-span-1 bg-white rounded-xl p-4 shadow hover:shadow-lg transition">
                    <h2 className="text-lg font-semibold text-[#45b1cb] mb-3">Availability Calendar</h2>
                    <Calendar onChange={setCalendarDate} value={calendarDate} tileClassName={tileClassName} />
                    <div className="mt-3">
                      
                        {/* Availability Management for Instructor */}
 
                        {user && userMeta?.role === "instructor" && (
                      <div className="bg-white rounded-xl p-4 shadow mt-4">
                      <h3 className="text-lg font-semibold mb-2 text-[#45b1cb]">Manage Availability</h3>
                       <div className="flex gap-2 mb-3">
                      <input
                      type="time"
                    value={newSlot}
                   onChange={(e) => setNewSlot(e.target.value)}
                   className="border rounded px-2 py-1"/>
                   <button
                    onClick={() => addAvailability(calendarDate, newSlot)}
                  className="px-3 py-2 bg-[#45b1cb] text-black rounded hover:scale-105 transition">
                    Add Time
                   </button>
            </div>

                 <ul className="space-y-2">
                {availability
                .filter((a) => a.date === calendarDate.toISOString().split("T")[0])
                .map((a) => (
                  <li key={a.id} className="flex justify-between items-center border p-2 rounded">
                   <span>{a.slot}</span>
                <div className="flex gap-2">
              <button
                onClick={() => editAvailability(a.id)}
                className="px-2 py-1 text-sm bg-yellow-400 text-black rounded"
              >
                Edit
              </button>
              <button
                onClick={() => deleteAvailability(a.id)}
                className="px-2 py-1 text-sm bg-red-500 text-white rounded"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
    </ul>
  </div>
)}


                      
                        <div className="text-sm text-gray-500">Login as instructor to add availability</div>
                      
                    </div>

                    {/* Simple list of availability for selected date */}
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Slots on {calendarDate.toISOString().split("T")[0]}</h3>
                      <ul className="space-y-2">
                        {availability
                          .filter(a => a.date === (typeof a.date === "string" ? a.date : a.date))
                          .filter(a => a.date === calendarDate.toISOString().split("T")[0])
                          .map((a) => {
                            const booked = isAvailBooked(a);
                            const booking = bookingForAvail(a);
                            return (
                              <li key={a.id} className="flex justify-between items-center bg-gray-50 rounded p-2">
                                <div>
                                  <div className="font-medium">{a.slot}</div>
                                  <div className="text-xs text-gray-400">{a.instructorId === user?.uid ? "Your slot" : "Instructor slot"}</div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {booked ? (
                                    <>
                                      <span className="text-sm text-red-500">Booked</span>
                                      {userMeta?.role === "instructor" && a.instructorId === user?.uid && booking ? (
                                        <div className="text-xs text-gray-600">
                                          Student: {booking.studentName} <div className="text-xs">{booking.createdAt ? formatTimestamp(booking.createdAt) : ''}</div>
                                        </div>
                                      ) : null}
                                    </>
                                  ) : (
                                    <>
                                      {user && userMeta?.role === "student" ? (
                                        <button onClick={() => bookAvailability(a)} className="px-2 py-1 bg-green-500 text-white rounded">Book</button>
                                      ) : (
                                        <span className="text-sm text-gray-500">Available</span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        {availability.filter(a=>a.date === calendarDate.toISOString().split("T")[0]).length === 0 && <li className="text-sm text-gray-400">No slots yet</li>}
                      </ul>
                    </div>
                  </section>

                  {/* Lessons & Charts */}
                  <section className="col-span-1 lg:col-span-2 space-y-6">
                    {/* Lessons */}
                    <div className="bg-white rounded-xl p-4 shadow hover:shadow-lg transition">
                      <h2 className="text-lg font-semibold text-[#45b1cb] mb-3">Lessons</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {lessons.map((l) => {
                          // determine student view/lock status
                          const studentProgress = user ? progress.find(p => p.studentId === user.uid && p.lessonId === l.id) : null;
                          // find previous lesson id
                          const prevIndex = lessons.findIndex(x => x.id === l.id) - 1;
                          const prevLessonId = prevIndex >= 0 ? lessons[prevIndex].id : null;
                          const prevApproved = !prevLessonId || progress.some(p => p.studentId === user?.uid && p.lessonId === prevLessonId && p.approved);

                          return (
                          <motion.div key={l.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="p-3 rounded-lg bg-white shadow hover:shadow-md transition-transform">
                            <h3 className="font-semibold text-gray-800">{l.title}</h3>
                            <p className="text-sm text-gray-600">{l.content}</p>

                            {/* Student view: show form if allowed */}
                            {user && userMeta?.role === "student" && (
                              <div className="mt-3">
                                {/* If already submitted -> show status */}
                                {studentProgress ? (
                                  <div className="p-2 rounded bg-gray-50">
                                    <div className="text-sm">Status: {studentProgress.approved ? "Approved ✅" : studentProgress.rejected ? "Rejected ❌" : "Pending ⏳"}</div>
                                    <div className="text-xs text-gray-500">Submitted: {formatTimestamp(studentProgress.timestamp)}</div>
                                    {/* If rejected, allow resubmit */}
                                    {studentProgress.rejected && <div className="mt-2 text-sm text-red-600">Your submission was rejected. You may resubmit below.</div>}
                                  </div>
                                ) : (
                                  <>
                                    {!prevApproved ? (
                                      <div className="text-sm text-red-500 mt-2">Locked — wait for instructor approval on previous lesson</div>
                                    ) : (
                                      <div className="mt-2">
                                        {/* render MCQs and short Q from LESSON_QUESTIONS based on lesson.order */}
                                        {LESSON_QUESTIONS[l.order]?.mcq.map((mq, i) => (
                                          <div key={i} className="mb-2">
                                            <div className="font-medium">{i+1}. {mq.q}</div>
                                            <div className="flex flex-col mt-1">
                                              {mq.options.map((opt, j) => {
                                                const checked = (lessonAnswers[l.id]?.mcq || [])[i] === j;
                                                return (
                                                  <label key={j} className="inline-flex items-center gap-2">
                                                    <input
                                                      type="radio"
                                                      name={`lesson-${l.id}-mcq-${i}`}
                                                      checked={checked}
                                                      onChange={() => setLessonAnswers(prev => {
                                                        const prevFor = prev[l.id] || { mcq: Array(mq.options.length).fill(null), short: Array((LESSON_QUESTIONS[l.order]?.short?.length || 2)).fill("") };
                                                        const newMcq = prevFor.mcq ? [...prevFor.mcq] : Array(mq.options.length).fill(null);
                                                        newMcq[i] = j;
                                                        return { ...prev, [l.id]: { ...prevFor, mcq: newMcq } };
                                                      })}
                                                    />
                                                    <span className="text-sm">{opt}</span>
                                                  </label>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        ))}

                                        {LESSON_QUESTIONS[l.order]?.short.map((sq, k) => (
                                          <div key={k} className="mb-3">
                                            <div className="font-medium">{LESSON_QUESTIONS[l.order].mcq.length + k + 1}. {sq}</div>
                                            <textarea
                                              rows={3}
                                              value={(lessonAnswers[l.id]?.short || [])[k] || ""}
                                              onChange={(e) => setLessonAnswers(prev => {
                                                const prevFor = prev[l.id] || { mcq: Array(LESSON_QUESTIONS[l.order].mcq.length).fill(null), short: Array(LESSON_QUESTIONS[l.order].short.length).fill("") };
                                                const newShort = prevFor.short ? [...prevFor.short] : Array(LESSON_QUESTIONS[l.order].short.length).fill("");
                                                newShort[k] = e.target.value;
                                                return { ...prev, [l.id]: { ...prevFor, short: newShort } };
                                              })}
                                              className="w-full border rounded px-2 py-1"
                                            />
                                          </div>
                                        ))}

                                        <div className="flex gap-2">
                                          <button onClick={() => submitLessonAnswers(l)} className="px-3 py-1 bg-[#45b1cb] text-black rounded">Submit Answers</button>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}

                            {/* Instructor: show nothing on lesson card itself; instructor views submissions below in Progress & Approvals */}
                          </motion.div>
                        )})}
                      </div>
                    </div>

                    {/* Progress Chart & Approvals */}
                    <div className="bg-white rounded-xl p-4 shadow hover:shadow-lg transition">
                      <h2 className="text-lg font-semibold text-[#45b1cb] mb-3">Progress & Approvals</h2>

                      {/* Chart (students only) */}
                      {userMeta?.role === "student" && (
                        <>
                          {chartData.length === 0 ? (
                            <div className="text-sm text-gray-500 mb-4">No approved progress yet — get approvals to populate chart.</div>
                          ) : (
                            <div style={{ width: "100%", height: 200 }} className="mb-4">
                              <ResponsiveContainer>
                                <LineChart data={chartData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="lesson" />
                                  <YAxis domain={[0, 100]} />
                                  <Tooltip />
                                  <Line type="monotone" dataKey="score" stroke="#6D28D9" strokeWidth={3} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </>
                      )}

                      {/* Progress list with Approve/Reject for instructors */}
                      <ul className="space-y-2">
                        {progress.length === 0 && <li className="text-sm text-gray-400">No submissions yet</li>}
                        {progress.map((p) => {
                          const lessonObj = lessons.find(l => l.id === p.lessonId) || { title: `Lesson (${p.lessonId})`, order: null };
                          const qSet = lessonObj.order ? LESSON_QUESTIONS[lessonObj.order] : null;
                          return (
                          <li key={p.id} className="flex flex-col bg-gray-50 p-3 rounded">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="text-sm font-medium">Lesson: {lessonObj.title} — Score: {p.score}%</div>
                                <div className="text-xs text-gray-500">Submitted: {formatTimestamp(p.timestamp)}</div>
                                <div className="text-xs">Status: {p.approved ? "Approved" : p.rejected ? "Rejected" : "Pending"}</div>
                                {userMeta?.role === "instructor" && <div className="text-xs text-gray-600">Student: {getStudentName(p.studentId)}</div>
}
                              </div>

                              <div className="flex flex-col gap-2">
                                {userMeta?.role === "instructor" && !p.approved && !p.rejected ? (
                                  <>
                                    <button onClick={() => approveProgress(p)} className="px-2 py-1 bg-indigo-600 text-white text-sm rounded">Approve</button>
                                    <button onClick={() => rejectProgress(p)} className="px-2 py-1 bg-red-500 text-white text-sm rounded">Reject</button>
                                  </>
                                ) : null}
                                {userMeta?.role === "student" && p.studentId === user?.uid && (
                                  <div className="text-xs text-gray-600">{p.approved ? "Approved" : p.rejected ? "Rejected" : "Pending"}</div>
                                )}
                                <button 
  onClick={async () => {
    if (!user || userMeta?.role !== "instructor") return alert("Not allowed");
    if (window.confirm("Are you sure you want to delete this progress?")) {
      try {
        await deleteDoc(doc(db, "progress", p.id));
        alert("Progress deleted");
      } catch (e) {
        console.error(e);
        alert("Failed to delete progress");
      }
    }
  }} 
  className="px-2 py-1 bg-gray-400 text-white text-sm rounded"
>
  Clear
</button>
 
  
                              </div>
                            </div>

                            {/* Submitted answers (visible to instructor; student sees own answers) */}
                            <div className="mt-3 border-t pt-2 text-sm">
                              <div className="font-semibold mb-1">MCQ Answers</div>
                              {qSet?.mcq?.map((mq, idx) => {
                                const selIndex = p.answers?.mcq?.[idx];
                                const selText = typeof selIndex === "number" ? mq.options[selIndex] : "(no answer)";
                                const correct = mq.correctIndex === selIndex;
                                return (
                                  <div key={idx} className="flex justify-between">
                                    <div>{idx + 1}. {mq.q}</div>
                                    <div className={correct ? "text-green-600" : "text-red-600"}>{selText}</div>
                                  </div>
                                );
                              })}

                              <div className="font-semibold mt-2 mb-1">Short Answers</div>
                              {qSet?.short?.map((sq, sidx) => (
                                <div key={sidx} className="mb-1">
                                  <div className="text-xs text-gray-600">{sq}</div>
                                  <div className="text-sm">{p.answers?.short?.[sidx] || "(no answer)"}</div>
                                </div>
                              ))}
                            </div>
                          </li>
                        )})}
                      </ul>
                    </div>
                  </section>
                </main>
                <Footer />
              </div>
            </PrivateRoute>
          }/>
        </Routes>
      </div>
    </Router>
  );
}






