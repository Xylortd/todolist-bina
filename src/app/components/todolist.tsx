'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import toast, { Toaster } from 'react-hot-toast';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const windowsGray = '#c0c0c0';
const windowsLightGray = '#eaeaea';

const successColor = '#90EE90';
const errorColor = '#ff7f7f';
const upcomingColor = '#cfeeff';

const shadowInset = 'inset -2px -2px #fff, inset 2px 2px #808080';
const borderInset = '2px inset #aaa';
const buttonStyle = {
  backgroundColor: windowsLightGray,
  border: '2px outset #fff',
  padding: '4px 12px',
  fontFamily: 'Tahoma',
  cursor: 'pointer',
  marginBottom: '10px',
  marginRight: '5px',
};

const popupStyle = {
  fontFamily: 'Tahoma',
  background: windowsGray,
  border: '2px solid #000080',
  boxShadow: shadowInset,
  color: 'black',
};

type Task = {
  id: string;
  text: string;
  completed: boolean;
  deadline: string;
};

function XPWindow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="border"
      style={{
        borderColor: '#000080',
        borderWidth: '4px',
        backgroundColor: windowsGray,
        boxShadow: shadowInset,
        fontFamily: 'Tahoma, sans-serif',
        color: 'black',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(to right, #1d5fbf, #3a6ea5)',
          color: 'white',
          padding: '4px 10px',
          fontWeight: 'bold',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #000080',
        }}
      >
        <span>{title}</span>
        <span style={{ fontWeight: 'normal' }}>🗙</span>
      </div>
      <div className="p-4 overflow-y-auto max-h-[60vh]">{children}</div>
    </div>
  );
}

function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: 'fixed', bottom: 8, right: 12, background: windowsGray, padding: '4px 8px', border: borderInset, fontFamily: 'Tahoma', fontSize: '12px' }}>
      🕒 {time.toLocaleTimeString()}
    </div>
  );
}

export default function TodoList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      const q = query(collection(db, 'tasks'), orderBy('deadline'));
      const querySnapshot = await getDocs(q);
      const tasksData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[];
      setTasks(tasksData);
      setLoading(false);
    };
    fetchTasks();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeRemaining: { [key: string]: string } = {};
      tasks.forEach((task) => {
        newTimeRemaining[task.id] = calculateTimeRemaining(task.deadline);
      });
      setTimeRemaining(newTimeRemaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [tasks]);

  const calculateTimeRemaining = (deadline: string): string => {
    const deadlineTime = new Date(deadline).getTime();
    const now = new Date().getTime();
    const difference = deadlineTime - now;
    if (difference <= 0) return '⛔ Waktu habis!';
    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    return `${hours}j ${minutes}m ${seconds}s`;
  };

  const addTask = async (): Promise<void> => {
    const { value: formValues } = await Swal.fire({
      title: '<div style="font-family: Tahoma; font-size: 16px;">📝 Tambahkan Tugas Baru</div>',
      html:
        '<input id="swal-input1" class="swal2-input" placeholder="Judul Tugas" style="font-family: Tahoma; border: 2px inset #ccc; background-color: #fff;">' +
        '<input id="swal-input2" type="datetime-local" class="swal2-input" style="font-family: Tahoma; border: 2px inset #ccc; background-color: #fff;">',
      background: windowsGray,
      showCancelButton: true,
      confirmButtonText: '✔️ Tambah',
      cancelButtonText: '❌ Batal',
      preConfirm: () => {
        const taskName = (document.getElementById('swal-input1') as HTMLInputElement)?.value;
        const deadline = (document.getElementById('swal-input2') as HTMLInputElement)?.value;
        if (!taskName || !deadline) {
          Swal.showValidationMessage('Tugas dan deadline tidak boleh kosong!');
          return;
        }
        return [taskName, deadline];
      },
    });

    if (!formValues) return;
    const [text, deadline] = formValues;

    const deadlineDate = new Date(deadline);
    if (deadlineDate < new Date()) {
      Swal.fire('⚠️ Error', 'Deadline tidak boleh di masa lalu', 'error');
      return;
    }

    const newTask: Omit<Task, 'id'> = { text, completed: false, deadline };
    const docRef = await addDoc(collection(db, 'tasks'), newTask);
    setTasks([...tasks, { id: docRef.id, ...newTask }]);
    toast.success('🟦 Tugas berhasil ditambahkan!', {
      style: popupStyle,
      icon: '📌',
      position: 'top-right',
    });
  };

  const deleteTask = async (id: string) => {
    const result = await Swal.fire({
      title: '<div style="font-family: Tahoma;">❓ Hapus Tugas</div>',
      text: 'Apakah kamu yakin ingin menghapus tugas ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d9534f',
      cancelButtonColor: '#aaa',
      confirmButtonText: '🗑️ Hapus',
      cancelButtonText: '❌ Batal',
      background: windowsGray,
      customClass: {
        popup: 'windows-popup',
      },
    });
  
    if (result.isConfirmed) {
      await deleteDoc(doc(db, 'tasks', id));
      setTasks(tasks.filter((task) => task.id !== id));
      toast.success('🗑️ Tugas dihapus', {
        style: popupStyle,
        position: 'top-right',
      });
    }
  };
  

  const toggleComplete = async (task: Task) => {
    const taskRef = doc(db, 'tasks', task.id);
    await updateDoc(taskRef, { completed: !task.completed });
    setTasks(tasks.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)));
    toast.success(`Tugas ${task.completed ? 'dibuka kembali' : 'diselesaikan'}`, {
      style: popupStyle,
      position: 'top-right',
    });
  };

  const editTask = async (task: Task) => {
    const formattedDeadline = new Date(task.deadline).toISOString().slice(0, 16);
    const { value: formValues } = await Swal.fire({
      title: '<div style="font-family: Tahoma; font-size: 16px;">✏️ Edit Tugas</div>',
      html:
        `<input id="swal-input1" class="swal2-input" value="${task.text}" style="font-family: Tahoma; border: 2px inset #ccc; background-color: #fff;">` +
        `<input id="swal-input2" type="datetime-local" class="swal2-input" value="${formattedDeadline}" style="font-family: Tahoma; border: 2px inset #ccc; background-color: #fff;">`,
      background: windowsGray,
      showCancelButton: true,
      confirmButtonText: '💾 Simpan',
      cancelButtonText: '❌ Batal',
      preConfirm: () => {
        const newText = (document.getElementById('swal-input1') as HTMLInputElement)?.value;
        const newDeadline = (document.getElementById('swal-input2') as HTMLInputElement)?.value;
        if (!newText || !newDeadline) {
          Swal.showValidationMessage('Tidak boleh kosong!');
          return;
        }
        return [newText, newDeadline];
      },
    });

    if (!formValues) return;
    const [newText, newDeadline] = formValues;

    const taskRef = doc(db, 'tasks', task.id);
    await updateDoc(taskRef, { text: newText, deadline: newDeadline });
    setTasks(tasks.map((t) => (t.id === task.id ? { ...t, text: newText, deadline: newDeadline } : t)));
    toast.success('📝 Tugas diperbarui', { style: popupStyle, position: 'top-right' });
  };

  return (
    <div
      className="max-w-2xl mx-auto mt-12"
      style={{
        backgroundImage: 'url(https://upload.wikimedia.org/wikipedia/en/6/6b/Windows_XP_Default_Wallpaper.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '100vh',
        padding: '20px',
        fontFamily: 'Tahoma, sans-serif',
      }}
    >
      <Toaster />
      <Clock />
      <XPWindow title="🧾 To-Do List">
        <button onClick={addTask} style={buttonStyle}>➕ Tambah Tugas</button>
        {loading ? (
          <p>⏳ Memuat tugas...</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <AnimatePresence>
              {tasks.map((task) => {
                const isOverdue = new Date(task.deadline) < new Date();
                const backgroundColor = task.completed
                  ? successColor
                  : isOverdue
                  ? errorColor
                  : upcomingColor;

                return (
                  <motion.li
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    style={{ backgroundColor, color: 'black', border: borderInset, padding: '8px', marginBottom: '8px' }}
                  >
                    <p
  onClick={() => toggleComplete(task)}
  style={{
    margin: 0,
    textDecoration: task.completed ? 'line-through' : 'none',
    fontWeight: task.completed ? 'normal' : 'bold',
    cursor: 'pointer',
  }}
>
  {task.text}
</p>

                    <p style={{ fontSize: '10px', marginTop: '4px' }}>
                      📅 {new Date(task.deadline).toLocaleString()}
                    </p>
                    <p style={{ fontSize: '10px', marginTop: '2px' }}>
                      {task.completed
                        ? '✅ Selesai'
                        : isOverdue
                        ? timeRemaining[task.id] || 'Menghitung...'
                        : `${timeRemaining[task.id] || 'Menghitung...'}`}
                    </p>
                    <div style={{ marginTop: '4px' }}>
                      <button onClick={() => editTask(task)} style={{ ...buttonStyle, backgroundColor: '#f0ad4e', color: 'white' }}>
                        ✏️ Edit
                      </button>
                      <button onClick={() => deleteTask(task.id)} style={{ ...buttonStyle, backgroundColor: '#d9534f', color: 'white' }}>
                        🗑️ Hapus
                      </button>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </XPWindow>
    </div>
  );
}
