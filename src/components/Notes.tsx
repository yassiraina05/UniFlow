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
  Tag,
  Image as ImageIcon,
  Music,
  File as FileIcon,
  Paperclip,
  X,
  Upload
} from 'lucide-react';
import { Note, User } from '../types';
import { supabase } from '../supabaseClient';

interface NotesProps {
  user: User;
  token: string;
}

export default function Notes({ user, token }: NotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [folders, setFolders] = useState<string[]>(['General', 'University', 'Personal', 'Ideas']);
  const [activeFolder, setActiveFolder] = useState<string>('All');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isAddingFolder, setIsAddingFolder] = useState(false);

  useEffect(() => {
    fetchNotes();
    const savedFolders = localStorage.getItem('user_folders');
    if (savedFolders) setFolders(JSON.parse(savedFolders));
  }, [user.id]);

  // Debounced update for content and title
  useEffect(() => {
    if (!activeNote) return;
    const timer = setTimeout(() => {
      const original = notes.find(n => n.id === activeNote.id);
      if (original && (original.title !== activeNote.title || original.content !== activeNote.content)) {
        updateNote(activeNote.id, { title: activeNote.title, content: activeNote.content });
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [activeNote?.title, activeNote?.content]);

  const addFolder = () => {
    try {
      if (!newFolderName.trim() || folders.includes(newFolderName)) return;
      const updated = [...folders, newFolderName];
      setFolders(updated);
      localStorage.setItem('user_folders', JSON.stringify(updated));
      setNewFolderName('');
      setIsAddingFolder(false);
    } catch (err) {
      console.error('Error adding folder:', err);
    }
  };

  const deleteFolder = (folderName: string) => {
    if (folderName === 'General') return;
    const updated = folders.filter(f => f !== folderName);
    setFolders(updated);
    localStorage.setItem('user_folders', JSON.stringify(updated));
    if (activeFolder === folderName) setActiveFolder('All');
    
    // Update local notes state to move them to General
    setNotes(notes.map(n => n.folder === folderName ? { ...n, folder: 'General' } : n));
    // Note: In a real app, you'd also update the DB for all notes in this folder
  };

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching notes:', error);
      return;
    }

    // Map snake_case to camelCase if needed, but our types match the DB mostly
    const formattedNotes = data.map(n => ({
      ...n,
      createdAt: n.created_at,
      updatedAt: n.updated_at
    }));

    setNotes(formattedNotes);
    if (formattedNotes.length > 0 && !activeNote) {
      setActiveNote(formattedNotes[0]);
    }
  };

  const createNote = async () => {
    console.log('Creating note...');
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert([{ 
          user_id: user.id,
          title: 'Untitled Note', 
          content: '', 
          folder: activeFolder === 'All' ? 'General' : activeFolder
        }])
        .select()
        .single();

      if (error) throw error;

      const newNote = { 
        ...data, 
        createdAt: data.created_at, 
        updatedAt: data.updated_at,
        attachments: data.attachments || []
      };
      setNotes([newNote, ...notes]);
      setActiveNote(newNote);
    } catch (error) {
      console.error('Error creating note:', error);
      alert('Failed to create note. Please try again.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'attachment') => {
    const file = e.target.files?.[0];
    if (!file || !activeNote) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const uuid = Math.random().toString(36).substring(2);
      const featureName = 'notes';
      const itemId = activeNote.id.toString();
      const filePath = `${user.id}/${featureName}/${itemId}/${uuid}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('app-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get signed URL for immediate display
      const { data: signedData, error: signedError } = await supabase.storage
        .from('app-files')
        .createSignedUrl(filePath, 3600); // 1 hour

      if (signedError) throw signedError;

      if (type === 'cover') {
        // Delete old cover if exists
        if (activeNote.cover_url && !activeNote.cover_url.startsWith('http')) {
           await supabase.storage.from('app-files').remove([activeNote.cover_url]);
        }
        
        await updateNote(activeNote.id, { cover_url: filePath });
        setActiveNote({ ...activeNote, cover_url: signedData.signedUrl });
      } else {
        const newAttachment = {
          id: uuid,
          name: file.name,
          url: filePath, // Store the PATH in DB
          type: file.type,
          size: file.size
        };
        const updatedAttachments = [...(activeNote.attachments || []), newAttachment];
        await updateNote(activeNote.id, { attachments: updatedAttachments });
        
        // Update active note with signed URL for display
        const updatedWithSigned = updatedAttachments.map(a => 
          a.id === uuid ? { ...a, url: signedData.signedUrl } : a
        );
        setActiveNote({ ...activeNote, attachments: updatedWithSigned });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Upload failed. Make sure the "app-files" bucket exists and is private.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = async (attachmentId: string) => {
    if (!activeNote) return;
    const attachment = activeNote.attachments?.find(a => a.id === attachmentId);
    if (!attachment) return;

    try {
      // Delete from storage
      await supabase.storage.from('app-files').remove([attachment.url]);
      
      const updatedAttachments = (activeNote.attachments || []).filter(a => a.id !== attachmentId);
      await updateNote(activeNote.id, { attachments: updatedAttachments });
      setActiveNote({ ...activeNote, attachments: updatedAttachments });
    } catch (error) {
      console.error('Error removing attachment:', error);
    }
  };

  const updateNote = async (id: number, updates: Partial<Note>) => {
    setIsSaving(true);
    try {
      const dbUpdates: any = { ...updates };
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.folder !== undefined) dbUpdates.folder = updates.folder;
      if (updates.cover_url !== undefined) dbUpdates.cover_url = updates.cover_url;
      if (updates.attachments !== undefined) dbUpdates.attachments = updates.attachments;
      dbUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('notes')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
      
      setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: dbUpdates.updated_at } : n));
    } catch (error) {
      console.error('Error updating note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteNote = async (id: number) => {
    const noteToDelete = notes.find(n => n.id === id);
    
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting note:', error);
      return;
    }

    // Cleanup storage
    if (noteToDelete) {
      const pathsToDelete: string[] = [];
      if (noteToDelete.cover_url && !noteToDelete.cover_url.startsWith('http')) {
        pathsToDelete.push(noteToDelete.cover_url);
      }
      if (noteToDelete.attachments) {
        noteToDelete.attachments.forEach(a => {
          if (!a.url.startsWith('http')) pathsToDelete.push(a.url);
        });
      }
      if (pathsToDelete.length > 0) {
        await supabase.storage.from('app-files').remove(pathsToDelete);
      }
    }

    setNotes(notes.filter(n => n.id !== id));
    if (activeNote?.id === id) setActiveNote(null);
  };

  // Handle signed URLs for active note
  useEffect(() => {
    const getSignedUrls = async () => {
      if (!activeNote) return;
      
      let updated = false;
      const newActiveNote = { ...activeNote };

      if (activeNote.cover_url && !activeNote.cover_url.startsWith('http')) {
        const { data } = await supabase.storage.from('app-files').createSignedUrl(activeNote.cover_url, 3600);
        if (data) {
          newActiveNote.cover_url = data.signedUrl;
          updated = true;
        }
      }

      if (activeNote.attachments && activeNote.attachments.length > 0) {
        const paths = activeNote.attachments.filter(a => !a.url.startsWith('http')).map(a => a.url);
        if (paths.length > 0) {
          const { data } = await supabase.storage.from('app-files').createSignedUrls(paths, 3600);
          if (data) {
            newActiveNote.attachments = activeNote.attachments.map(a => {
              const signed = data.find(s => s.path === a.url);
              return signed ? { ...a, url: signed.signedUrl } : a;
            });
            updated = true;
          }
        }
      }

      if (updated) {
        setActiveNote(newActiveNote);
      }
    };

    getSignedUrls();
  }, [activeNote?.id]);

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
              <div key={f} className="group flex items-center gap-1">
                <button 
                  onClick={() => setActiveFolder(f)}
                  className={`flex-1 flex items-center gap-3 p-2 rounded-xl text-sm font-medium transition-colors ${activeFolder === f ? 'bg-accent text-white' : 'hover:bg-app-bg'}`}
                >
                  <Folder size={16} /> {f}
                </button>
                {f !== 'General' && (
                  <button 
                    onClick={() => deleteFolder(f)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
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
                  }}
                  className="text-2xl font-serif italic font-bold bg-transparent border-none focus:outline-none flex-1"
                  placeholder="Note Title"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="p-2 hover:bg-app-bg rounded-xl transition-colors cursor-pointer text-app-text/60 hover:text-accent">
                  <ImageIcon size={20} />
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'cover')} />
                </label>
                <label className="p-2 hover:bg-app-bg rounded-xl transition-colors cursor-pointer text-app-text/60 hover:text-accent">
                  <Paperclip size={20} />
                  <input type="file" className="hidden" accept=".jpg,.png,.jpeg,.pdf,.mp3" onChange={(e) => handleFileUpload(e, 'attachment')} />
                </label>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-app-bg rounded-full text-xs font-bold text-app-text/40">
                  {isSaving || isUploading ? <span className="animate-pulse">{isUploading ? 'Uploading...' : 'Saving...'}</span> : <><Save size={14} /> Saved</>}
                </div>
                <button 
                  onClick={() => deleteNote(activeNote.id)}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {activeNote.cover_url && (
                <div className="relative group w-full h-48 overflow-hidden">
                  <img src={activeNote.cover_url} alt="Cover" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => {
                      setActiveNote({ ...activeNote, cover_url: '' });
                      updateNote(activeNote.id, { cover_url: '' });
                    }}
                    className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <div className="p-8 space-y-6">
                <textarea 
                  value={activeNote.content}
                  onChange={(e) => {
                    const newContent = e.target.value;
                    setActiveNote({ ...activeNote, content: newContent });
                  }}
                  className="w-full min-h-[300px] bg-transparent border-none focus:outline-none resize-none text-lg leading-relaxed text-app-text/80 font-medium"
                  placeholder="Start writing your thoughts..."
                />

                {activeNote.attachments && activeNote.attachments.length > 0 && (
                  <div className="pt-8 border-t border-border-subtle">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-app-text/40 mb-4">Attachments</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeNote.attachments.map(file => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-app-bg rounded-xl group border border-transparent hover:border-border-subtle transition-all">
                          <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 bg-card rounded-lg flex items-center justify-center text-accent">
                              {file.type.includes('image') ? <ImageIcon size={18} /> : 
                               file.type.includes('audio') ? <Music size={18} /> : 
                               <FileIcon size={18} />}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-sm font-bold truncate">{file.name}</p>
                              <p className="text-[10px] text-app-text/40 font-bold uppercase tracking-widest">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </a>
                          <button 
                            onClick={() => removeAttachment(file.id)}
                            className="p-2 text-app-text/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
