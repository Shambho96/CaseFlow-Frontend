import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Task, TaskStatus } from '@/types';
import { tasks as mockTasks } from '@/mocks';

interface TaskContextValue {
  tasks: Task[];
  addTask: (t: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, newStatus: TaskStatus) => void;
  reorderTasks: (newTasks: Task[]) => void;
}

const TaskContext = createContext<TaskContextValue | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);

  const addTask = useCallback((t: Task) => {
    setTasks((prev) => [...prev, t]);
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const moveTask = useCallback((id: string, newStatus: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
  }, []);

  const reorderTasks = useCallback((newTasks: Task[]) => {
    setTasks(newTasks);
  }, []);

  return (
    <TaskContext.Provider value={{ tasks, addTask, updateTask, deleteTask, moveTask, reorderTasks }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTasks must be used within TaskProvider');
  return ctx;
}
