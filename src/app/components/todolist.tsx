'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
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

type Task = {
  id: string;
  text: string;
  completed: boolean;
  deadline: string;
};

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

    if (difference <= 0) return 'Waktu habis!';

    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return `${hours}j ${minutes}m ${seconds}s`;
  };

  const addTask = async (): Promise<void> => {
    const { value: formValues } = await Swal.fire({
      title: 'Tambahkan tugas baru',
      html:
        '<input id="swal-input1" class="swal2-input" placeholder="Nama tugas">' +
        '<input id="swal-input2" type="datetime-local" class="swal2-input">',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Tambah',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const taskName = (document.getElementById('swal-input1') as HTMLInputElement)?.value;
        const deadline = (document.getElementById('swal-input2') as HTMLInputElement)?.value;
  
        if (!taskName || !deadline) {
          Swal.showValidationMessage('Nama tugas dan deadline tidak boleh kosong!');
          return;
        }
  
        return [taskName, deadline];
      },
    });
  
    if (!formValues) return;
  
    const [text, deadline] = formValues;
    const deadlineDate = new Date(deadline);
  
    if (deadlineDate < new Date()) {
      Swal.fire('Error', 'Deadline tidak boleh di masa lalu', 'error');
      return;
    }
  
    const newTask: Omit<Task, 'id'> = {
      text,
      completed: false,
      deadline,
    };
  
    const docRef = await addDoc(collection(db, 'tasks'), newTask);
    setTasks([...tasks, { id: docRef.id, ...newTask }]);
    Swal.fire('Sukses!', 'Tugas berhasil ditambahkan.', 'success');
  };

  const toggleTask = async (id: string): Promise<void> => {
    const updatedTasks = tasks.map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    const taskRef = doc(db, 'tasks', id);
    await updateDoc(taskRef, {
      completed: updatedTasks.find((task) => task.id === id)?.completed,
    });
  };

  const deleteTask = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'tasks', id));
    setTasks(tasks.filter((task) => task.id !== id));
    Swal.fire('Berhasil!', 'Tugas berhasil dihapus.', 'success');
  };

  const editTask = async (task: Task): Promise<void> => {
    const { value: formValues } = await Swal.fire({
      title: 'Edit Tugas',
      html: `
        <input id="swal-input1" class="swal2-input" value="${task.text}">
        <input id="swal-input2" type="datetime-local" class="swal2-input" value="${task.deadline}">
      `,
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        return [
          (document.getElementById('swal-input1') as HTMLInputElement).value,
          (document.getElementById('swal-input2') as HTMLInputElement).value,
        ];
      },
    });

    if (formValues) {
      const [newText, newDeadline] = formValues;
      const taskRef = doc(db, 'tasks', task.id);
      await updateDoc(taskRef, {
        text: newText,
        deadline: newDeadline,
      });
      setTasks(tasks.map(t => t.id === task.id ? { ...t, text: newText, deadline: newDeadline } : t));
      Swal.fire('Berhasil!', 'Tugas berhasil diperbarui.', 'success');
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-12 p-6 bg-white shadow-2xl rounded-3xl border border-gray-200 dark:bg-gray-900 dark:border-gray-700 transition-all">
      <h1 className="text-4xl font-extrabold text-center text-emerald-600 dark:text-emerald-400 mb-8 drop-shadow">✨ To-Do List ✨</h1>
      <div className="flex justify-center mb-8">
        <button
          onClick={addTask}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3 rounded-full shadow-lg hover:scale-105 transition-transform duration-200 hover:border-2 hover:border-white
 hover:cursor-pointer"
        >
          ➕ Tambah Tugas
        </button>
      </div>
      {loading ? (
        <p className="text-center text-gray-500 dark:text-gray-400 animate-pulse">Memuat tugas...</p>
      ) : (
        <ul className="space-y-4">
          <AnimatePresence>
            {tasks.map((task) => {
              const timeLeft = calculateTimeRemaining(task.deadline);
              const isExpired = timeLeft === 'Waktu habis!';
              const taskColor = task.completed
  ? 'bg-[#0f1e12] text-green-400 border-green-500 shadow-[0_0_10px_#00ff00] hover:shadow-[0_0_20px_#00ff00]'
  : isExpired
  ? 'bg-[#2c0f0f] text-red-400 border-red-500 shadow-[0_0_10px_#ff0000] hover:shadow-[0_0_20px_#ff0000]'
  : 'bg-[#1e1a0f] text-yellow-300 border-yellow-500 shadow-[0_0_10px_#ffff00] hover:shadow-[0_0_20px_#ffff00]';


              return (
                <motion.li
  key={task.id}
  initial={{ opacity: 0, y: -10 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, x: -20 }}
  transition={{ duration: 0.3 }}
  className={`border-l-4 px-5 py-4 rounded-md font-mono transition-all duration-300 ${taskColor}`}
>
  <div className="flex justify-between items-start">
    <span
      onClick={() => toggleTask(task.id)}
      className={`cursor-pointer flex items-center gap-2 w-2/3 transition-all duration-200 ${
        task.completed ? 'line-through text-green-500' : 'pipboy-glow'
      }`}
    >
      {task.completed && <span>✅</span>}
      {!task.completed && isExpired && <span>❌</span>}
      {!task.completed && !isExpired && <span>⏳</span>}
      {task.text}
    </span>

              
    <div className="flex space-x-2">
      <button
        onClick={() => editTask(task)}
        className="text-[10px] px-2 py-1 bg-[#0f380f] text-[#9bbc0f] border-2 border-[#9bbc0f] shadow-[2px_2px_0_#183c1a] hover:scale-105 transition hover:cursor-pointer"
      >
        Edit
      </button>
      <button
        onClick={() => deleteTask(task.id)}
        className="text-[10px] px-2 py-1 bg-[#380f0f] text-[#9bbc0f] border-2 border-[#bc0f0f] shadow-[2px_2px_0_#183c1a] hover:scale-105 transition hover:cursor-pointer"
      >
        Hapus
      </button>
    </div>
  </div>
  <p className="text-[10px] mt-2">📅 {new Date(task.deadline).toLocaleString()}</p>
  <p className="text-[10px] mt-1">
    {task.completed ? '✅ Selesai' : `⏳ ${timeRemaining[task.id] || 'Menghitung...'}`}
  </p>
</motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
