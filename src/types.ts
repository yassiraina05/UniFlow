export interface User {
  id: string | number;
  email: string;
  name: string;
  avatar_url?: string;
  settings: UserSettings;
}

export interface UserSettings {
  theme?: 'light' | 'dark';
  accentColor?: string;
  sidebarCollapsed?: boolean;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  folder: string;
  createdAt: string;
  updatedAt: string;
  cover_url?: string;
  attachments?: Attachment[];
}

export interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface Todo {
  id: number;
  task: string;
  completed: boolean;
  dueDate?: string;
}

export interface Budget {
  id: number;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
}

export interface Reminder {
  id: number;
  title: string;
  remindAt: string;
  priority: 'High' | 'Medium' | 'Low';
  completed: boolean;
}
