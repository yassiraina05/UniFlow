import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Folder, 
  FileText, 
  ChevronRight, 
  MoreVertical,
  Save,
  Clock,
  Tag
} from 'lucide-react';
import { Note } from '../types';

interface NotesProps {
  token: string;
}

export default function Notes({ token }: NotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [folders, setFolders] = useState<string[]>(['General', 'University', 'Personal', 'Ideas']);
  const [activeFolder, setActiveFolder] = useState<string>('All');
  const [isSaving, setIsSaving] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isAddingFolder, setIsAddingFolder] = useState(false);

  useEffect(() => {
    fetchNotes();
    const savedFolders = localStorage.getItem('user_folders');
    if (savedFolders) setFolders(JSON.parse(savedFolders));
  }, [token]);

  const addFolder = () => {
    if (!newFolderName.trim() || folders.includes(newFolderName)) return;
    const updated = [...folders, newFolderName];
    setFolders(updated);
    localStorage.setItem('user_folders', JSON.stringify(updated));
    setNewFolderName('');
    setIsAddingFolder(false);
  };

  const fetchNotes = async () => {
    const res = await fetch('/api/notes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setNotes(data);
    if (data.length > 0 && !activeNote) {
      setActiveNote(data[0]);
    }
  };

  const createNote = async () => {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title: 'Untitled Note', content: '', folder: activeFolder === 'All' ? 'General' : activeFolder })
    });
    const newNote = await res.json();
    setNotes([newNote, ...notes]);
    setActiveNote(newNote);
  };

  const updateNote = async (id: number, updates: Partial<Note>) => {
    setIsSaving(true);
    await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ ...activeNote, ...updates })
    });
    setNotes(notes.map(n => n.id === id ? { ...n, ...updates } : n));
    setIsSaving(false);
  };

  const deleteNote = async (id: number) => {
    await fetch(`/api/notes/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setNotes(notes.filter(n => n.id !== id));
    if (activeNote?.id === id) setActiveNote(null);
  };

  const filteredNotes = activeFolder === 'All' 
    ? notes 
    : notes.filter(n => n.folder === activeFolder);

  return (
    <div className="flex h-full gap-8">
      {/* Folders & List */}
      <div className="w-80 flex flex-col gap-6">
        <div className="bg-card p-4 rounded-3xl border border-border-subtle shadow-sm">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-app-text/40">Folders</h3>
            <button 
              onClick={() => setIsAddingFolder(!isAddingFolder)}
              className="p-1 hover:bg-app-bg rounded-lg transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
          
          <AnimatePresence>
            {isAddingFolder && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mb-4 px-2 overflow-hidden"
              >
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Folder name..."
                    className="flex-1 text-xs p-2 bg-app-bg rounded-lg focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && addFolder()}
                  />
                  <button onClick={addFolder} className="p-2 bg-accent text-white rounded-lg"><Plus size={14} /></button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1">
            <button 
              onClick={() => setActiveFolder('All')}
              className={`w-full flex items-center gap-3 p-2 rounded-xl text-sm font-medium transition-colors ${activeFolder === 'All' ? 'bg-accent text-white' : 'hover:bg-app-bg'}`}
            >
              <Folder size={16} /> All Notes
            </button>
            {folders.map(f => (
              <button 
                key={f}
                onClick={() => setActiveFolder(f)}
                className={`w-full flex items-center gap-3 p-2 rounded-xl text-sm font-medium transition-colors ${activeFolder === f ? 'bg-accent text-white' : 'hover:bg-app-bg'}`}
              >
                <Folder size={16} /> {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-card rounded-3xl border border-border-subtle shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border-subtle flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-app-text/40">Notes</h3>
            <button onClick={createNote} className="p-2 bg-accent text-white rounded-xl hover:shadow-lg transition-all">
              <Plus size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredNotes.map(note => (
              <button
                key={note.id}
                onClick={() => setActiveNote(note)}
                className={`w-full text-left p-4 rounded-2xl transition-all ${activeNote?.id === note.id ? 'bg-app-bg ring-1 ring-border-subtle' : 'hover:bg-app-bg/50'}`}
              >
                <h4 className="font-bold text-sm mb-1 truncate">{note.title || 'Untitled'}</h4>
                <p className="text-xs text-app-text/40 line-clamp-2 leading-relaxed">{note.content || 'No content yet...'}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-app-text/5 rounded-full text-app-text/40">
                    {note.folder}
                  </span>
                  <span className="text-[10px] text-app-text/20 flex items-center gap-1">
                    <Clock size={10} /> {new Date(note.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-card rounded-3xl border border-border-subtle shadow-sm overflow-hidden flex flex-col">
        {activeNote ? (
          <>
            <div className="p-6 border-b border-border-subtle flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center gap-4 flex-1">
                <input 
                  type="text" 
                  value={activeNote.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setActiveNote({ ...activeNote, title: newTitle });
                    updateNote(activeNote.id, { title: newTitle });
                  }}
                  className="text-2xl font-serif italic font-bold bg-transparent border-none focus:outline-none flex-1"
                  placeholder="Note Title"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-app-bg rounded-full text-xs font-bold text-app-text/40">
                  {isSaving ? <span className="animate-pulse">Saving...</span> : <><Save size={14} /> Saved</>}
                </div>
                <button 
                  onClick={() => deleteNote(activeNote.id)}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 p-8">
              <textarea 
                value={activeNote.content}
                onChange={(e) => {
                  const newContent = e.target.value;
                  setActiveNote({ ...activeNote, content: newContent });
                  updateNote(activeNote.id, { content: newContent });
                }}
                className="w-full h-full bg-transparent border-none focus:outline-none resize-none text-lg leading-relaxed text-app-text/80 font-medium"
                placeholder="Start writing your thoughts..."
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-app-text/20 p-12 text-center">
            <div className="w-20 h-20 bg-app-bg rounded-full flex items-center justify-center mb-6">
              <FileText size={40} />
            </div>
            <h3 className="text-xl font-bold text-app-text/40 mb-2">No Note Selected</h3>
            <p className="max-w-xs">Select a note from the list or create a new one to start your productivity flow.</p>
            <button 
              onClick={createNote}
              className="mt-8 px-6 py-3 bg-accent text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Plus size={20} /> Create New Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
