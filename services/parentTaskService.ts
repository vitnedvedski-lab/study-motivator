import AsyncStorage from '@react-native-async-storage/async-storage';
import { ParentTask } from '../types';

const STORAGE_KEY = 'study-motivator-parent-tasks-v1';

const readAll = async (): Promise<ParentTask[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ParentTask[];
  } catch {
    return [];
  }
};

const writeAll = async (tasks: ParentTask[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
};

export class ParentTaskService {
  static async getTasks(childId: string, cabinetId: string): Promise<ParentTask[]> {
    const tasks = await readAll();
    return tasks
      .filter((task) => task.childId === childId && task.cabinetId === cabinetId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  static async createTask(data: Omit<ParentTask, 'id' | 'status' | 'createdAt'>): Promise<ParentTask> {
    const tasks = await readAll();
    const task: ParentTask = {
      ...data,
      id: `task_${Date.now()}`,
      status: 'active',
      createdAt: Date.now(),
    };
    await writeAll([task, ...tasks]);
    return task;
  }

  static async completeTask(taskId: string): Promise<void> {
    const tasks = await readAll();
    await writeAll(tasks.map((task) =>
      task.id === taskId ? { ...task, status: 'completed', completedAt: Date.now() } : task
    ));
  }

  static async deleteTask(taskId: string): Promise<void> {
    const tasks = await readAll();
    await writeAll(tasks.filter((task) => task.id !== taskId || task.status !== 'active'));
  }
}
