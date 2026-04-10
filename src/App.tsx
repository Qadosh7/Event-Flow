import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { Timer } from './components/Timer';
import { AgendaItemCard } from './components/AgendaItemCard';
import { AgendaItem, Event } from './types';
import { Plus, LogIn, LogOut, Calendar as CalendarIcon, Settings, Trash2 } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [isAddingItem, setIsAddingItem] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setEvents([]);
      setSelectedEvent(null);
      return;
    }

    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const evts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      setEvents(evts);
      if (evts.length > 0 && !selectedEvent) {
        const firstEvt = evts[0];
        setSelectedEvent(firstEvt);
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!selectedEvent) {
      setAgenda([]);
      return;
    }

    const q = query(collection(db, `events/${selectedEvent.id}/agenda`), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AgendaItem));
      setAgenda(items);
      
      // Find first non-completed item
      const firstActive = items.findIndex(item => !item.isCompleted);
      setActiveItemIndex(firstActive !== -1 ? firstActive : 0);
    });

    return () => unsubscribe();
  }, [selectedEvent]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      toast.success('Successfully logged in!');
    } catch (error) {
      console.error(error);
      toast.error('Login failed');
    }
  };

  const handleLogout = () => auth.signOut();

  const createEvent = async () => {
    if (!user) return;
    const name = prompt('Event Name:');
    if (!name) return;

    try {
      await addDoc(collection(db, 'events'), {
        name,
        ownerId: user.uid,
        createdAt: serverTimestamp()
      });
      toast.success('Event created!');
    } catch (error) {
      toast.error('Failed to create event');
    }
  };

  const addAgendaItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEvent) return;

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const duration = parseInt(formData.get('duration') as string);
    const type = formData.get('type') as AgendaItem['type'];
    const presenter = formData.get('presenter') as string;

    try {
      await addDoc(collection(db, `events/${selectedEvent.id}/agenda`), {
        title,
        duration,
        type,
        presenter,
        order: agenda.length,
        isCompleted: false,
        eventId: selectedEvent.id
      });
      setIsAddingItem(false);
      toast.success('Item added to agenda');
    } catch (error) {
      toast.error('Failed to add item');
    }
  };

  const toggleComplete = async (id: string) => {
    if (!selectedEvent) return;
    const item = agenda.find(i => i.id === id);
    if (!item) return;

    try {
      await updateDoc(doc(db, `events/${selectedEvent.id}/agenda`, id), {
        isCompleted: !item.isCompleted
      });
    } catch (error) {
      toast.error('Update failed');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !selectedEvent) return;

    const oldIndex = agenda.findIndex(i => i.id === (active.id as string));
    const newIndex = agenda.findIndex(i => i.id === ((over as any).id as string));

    const newAgenda = arrayMove(agenda, oldIndex, newIndex);
    setAgenda(newAgenda);

    // Update orders in Firestore
    try {
      if (!selectedEvent) return;
      const eventId = (selectedEvent as any).id;
      const updates = newAgenda.map((item: any, index) => 
        updateDoc(doc(db, 'events', eventId, 'agenda', item.id), { order: index })
      );
      await Promise.all(updates);
    } catch (error) {
      toast.error('Failed to sync order');
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await deleteDoc(doc(db, 'events', id));
      if (selectedEvent?.id === id) setSelectedEvent(null);
      toast.success('Event deleted');
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
        <div className="text-center max-w-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-8"
          >
            <div className="w-20 h-20 bg-emerald-500 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/20">
              <CalendarIcon size={40} className="text-white" />
            </div>
            <h1 className="text-5xl font-display font-bold tracking-tight mb-4">EventFlow</h1>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Manage your event agendas dynamically with real-time timers and drag-and-drop scheduling.
            </p>
          </motion.div>
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-zinc-900 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-zinc-200 transition-all transform hover:scale-[1.02] active:scale-95"
          >
            <LogIn size={24} /> Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  const activeItem = agenda[activeItemIndex];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col lg:flex-row">
      <Toaster position="top-center" theme="dark" />
      
      {/* Sidebar */}
      <aside className="w-full lg:w-80 border-r border-zinc-900 p-6 flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <CalendarIcon size={18} className="text-white" />
            </div>
            <span className="font-display font-bold text-xl">EventFlow</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors">
            <LogOut size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">My Events</h2>
            <button 
              onClick={createEvent}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
          
          <div className="space-y-2">
            {events.map(evt => (
              <div 
                key={evt.id}
                className={cn(
                  "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all",
                  selectedEvent?.id === evt.id ? "bg-emerald-500/10 text-emerald-400" : "hover:bg-zinc-900 text-zinc-400"
                )}
                onClick={() => setSelectedEvent(evt)}
              >
                <span className="font-medium truncate">{evt.name}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteEvent(evt.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-900 flex items-center gap-3">
          <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border border-zinc-800" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{user.displayName}</p>
            <p className="text-xs text-zinc-500 truncate">{user.email}</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
        {!selectedEvent ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4 text-zinc-700">
              <CalendarIcon size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Event Selected</h2>
            <p className="text-zinc-500">Select or create an event to start managing your agenda.</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <h1 className="text-4xl font-display font-bold tracking-tight mb-2">{selectedEvent.name}</h1>
                <p className="text-zinc-500">Live Agenda Management</p>
              </div>
              
              {activeItem && (
                <div className="flex items-center gap-4 px-6 py-3 bg-zinc-900 rounded-2xl border border-zinc-800">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Current Session</p>
                    <p className="font-bold">{activeItem.title}</p>
                  </div>
                </div>
              )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
              {/* Timer Section */}
              <div className="lg:col-span-2 space-y-8">
                <Timer 
                  title={activeItem?.title || "No Active Item"}
                  initialMinutes={activeItem?.duration || 0}
                  onComplete={() => {
                    if (activeItem) toggleComplete(activeItem.id);
                    toast.success('Session completed!');
                  }}
                />
                
                <div className="glass p-6 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Controls</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setIsAddingItem(true)}
                      className="flex items-center justify-center gap-2 p-3 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors"
                    >
                      <Plus size={18} /> Add Item
                    </button>
                    <button className="flex items-center justify-center gap-2 p-3 bg-zinc-800 text-zinc-300 rounded-xl font-bold text-sm hover:bg-zinc-700 transition-colors">
                      <Settings size={18} /> Settings
                    </button>
                  </div>
                </div>
              </div>

              {/* Agenda List */}
              <div className="lg:col-span-3 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Agenda</h3>
                  <span className="text-xs text-zinc-500">{agenda.length} items</span>
                </div>

                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext 
                    items={agenda.map(i => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {agenda.map((item, index) => (
                        <AgendaItemCard 
                          key={item.id} 
                          item={item} 
                          isActive={index === activeItemIndex}
                          onToggleComplete={toggleComplete}
                        />
                      ))}
                      {agenda.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-zinc-900 rounded-3xl">
                          <p className="text-zinc-600">Your agenda is empty.</p>
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Item Modal */}
      <AnimatePresence>
        {isAddingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingItem(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 rounded-3xl p-8 border border-zinc-800 shadow-2xl"
            >
              <h2 className="text-2xl font-display font-bold mb-6">Add Agenda Item</h2>
              <form onSubmit={addAgendaItem} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Title</label>
                  <input 
                    name="title" 
                    required 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Presentation Title"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Duration (min)</label>
                    <input 
                      name="duration" 
                      type="number" 
                      required 
                      defaultValue="30"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Type</label>
                    <select 
                      name="type" 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="presentation">Presentation</option>
                      <option value="break">Break</option>
                      <option value="lunch">Lunch</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Presenter (Optional)</label>
                  <input 
                    name="presenter" 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Name of speaker"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAddingItem(false)}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors"
                  >
                    Add Item
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
