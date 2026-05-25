import React, { useState, useEffect } from 'react';
import { auth, signInWithGoogle, logout, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Gavel, Briefcase, Archive, Bell, LogOut, Loader2, ShieldCheck, User as UserIcon, Moon, Sun, LayoutDashboard, FileSpreadsheet, Users, Menu, X as CloseIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard';
import CaseFiling from './components/CaseFiling';
import PrecedentArchive from './components/PrecedentArchive';
import SummonsSystem from './components/SummonsSystem';
import UserManagement from './components/UserManagement';
import Onboarding from './components/Onboarding';
import EmailVerification from './components/EmailVerification';

import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export type UserRole = 'petitioner' | 'judge' | 'court_clerk';

interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL: string;
  hasCompletedOnboarding?: boolean;
  emailVerified: boolean;
  studentId?: string;
}

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'filing' | 'archive' | 'summons' | 'users'>('dashboard');
  const [pendingCaseId, setPendingCaseId] = useState<string | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const saveToken = async (token: string, uid: string) => {
      try {
        const userDocRef = doc(db, 'users', uid);
        await setDoc(userDocRef, { fcmToken: token }, { merge: true });
      } catch (e) {
        console.error('Error saving FCM token:', e);
      }
    };

    if (user?.uid && pendingToken) {
      saveToken(pendingToken, user.uid);
      setPendingToken(null);
    }
  }, [user, pendingToken]);

  useEffect(() => {
    const initNative = async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        await StatusBar.setStyle({ style: darkMode ? Style.Dark : Style.Light });
        await SplashScreen.hide();
        const permission = await PushNotifications.requestPermissions();
        if (permission.receive === 'granted') await PushNotifications.register();
        PushNotifications.addListener('registration', (token) => setPendingToken(token.value));
      } catch (e) {
        console.error('Native init error:', e);
      }
    };
    initNative();

    const backListener = CapacitorApp.addListener('backButton', () => {
      if (activeTab === 'dashboard') {
        CapacitorApp.exitApp();
      } else {
        setActiveTab('dashboard');
      }
    });

    return () => {
      backListener.then(l => l.remove());
    };
  }, [activeTab, darkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          let userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            const role: UserRole = firebaseUser.email === 'nobleaidoo5@gmail.com' ? 'judge' : 'petitioner';
            const newUser: AppUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'Anonymous',
              role: role,
              photoURL: firebaseUser.photoURL || '',
              hasCompletedOnboarding: false,
              emailVerified: firebaseUser.emailVerified,
            };
            await setDoc(userDocRef, newUser);
            setUser(newUser);
          } else {
            const data = userDoc.data() as AppUser;
            setUser({ ...data, uid: firebaseUser.uid, emailVerified: firebaseUser.emailVerified });
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth State Error:", error);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) return <LandingPage onLogin={signInWithGoogle} />;
  if (!user.emailVerified) return <EmailVerification user={user} onLogout={logout} />;

  const navItems = [
    { id: 'dashboard', label: 'Docket', icon: <LayoutDashboard size={20} /> },
    { id: 'filing', label: 'File', icon: <FileSpreadsheet size={20} /> },
    { id: 'archive', label: 'History', icon: <Archive size={20} />, roles: ['judge', 'court_clerk'] },
    { id: 'summons', label: 'Summons', icon: <Bell size={20} />, roles: ['judge', 'court_clerk'] },
    { id: 'users', label: 'Staff', icon: <Users size={20} />, roles: ['judge', 'court_clerk'] },
  ].filter(item => !item.roles || item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <AnimatePresence>
        {!user.hasCompletedOnboarding && (
          <Onboarding user={user} onComplete={() => setUser({ ...user, hasCompletedOnboarding: true })} />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar - Hidden on Mobile */}
      <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 sticky top-0 h-screen shrink-0 transition-colors">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="bg-slate-900 dark:bg-indigo-600 p-1.5 rounded-lg shadow-lg">
            <Gavel className="text-white w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white leading-none">ANU SJB</h1>
            <p className="text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-1">Judicial Portal</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === item.id
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
            <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
              <UserIcon size={14} className="text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{user.displayName}</p>
              <p className="text-[10px] text-slate-400 capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="flex-1 flex items-center justify-center h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-colors border border-slate-200 dark:border-slate-700">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={logout} className="flex-1 flex items-center justify-center h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 transition-colors border border-slate-200 dark:border-slate-700">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar - Hidden on Desktop */}
      <header className="md:hidden sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-900 px-6 h-16 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-2">
          <Gavel className="text-indigo-600 w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">ANU SJB</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area - Full screen width on mobile, offset by sidebar on desktop */}
      <main className="flex-1 relative overflow-x-hidden min-h-[calc(100vh-4rem)] md:h-screen overflow-y-auto custom-scrollbar transition-colors">
        <div className="max-w-5xl mx-auto px-6 py-8 md:p-12 pb-32 md:pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <Dashboard user={user} initialCaseId={pendingCaseId} onModalClose={() => setPendingCaseId(null)} />}
              {activeTab === 'filing' && <CaseFiling user={user} onSuccess={() => setActiveTab('dashboard')} />}
              {activeTab === 'archive' && <PrecedentArchive />}
              {activeTab === 'summons' && <SummonsSystem user={user} onViewCase={(id) => { setPendingCaseId(id); setActiveTab('dashboard'); }} />}
              {activeTab === 'users' && <UserManagement currentUser={user} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation - Hidden on Desktop */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-900 px-2 py-3 flex justify-around items-center z-50 transition-colors">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center gap-1 px-4 py-1 transition-all ${
              activeTab === item.id
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-400 dark:text-slate-600'
            }`}
          >
            <motion.div
              animate={{ scale: activeTab === item.id ? 1.15 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {item.icon}
            </motion.div>
            <span className="text-[9px] font-bold uppercase tracking-tighter">{item.label}</span>
            {activeTab === item.id && (
              <motion.div layoutId="navTab" className="absolute bottom-0 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

function LandingPage({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-sm w-full"
      >
        <div className="w-20 h-20 bg-slate-900 dark:bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl">
          <Gavel className="text-white w-10 h-10" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">ANU SJB DOCKET</h1>
        <p className="text-slate-500 dark:text-slate-400 text-base font-medium mb-12 leading-relaxed">Official protocol terminal for secure student judicial board management.</p>

        <button
          onClick={onLogin}
          className="w-full h-16 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl dark:shadow-none"
        >
          <img src="https://www.google.com/favicon.ico" alt="G" className="w-4 h-4" />
          Authenticate Profile
        </button>

        <div className="mt-12 grid grid-cols-3 gap-4">
          <div className="h-px bg-slate-200 dark:bg-slate-900 my-auto" />
          <span className="text-[10px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest">Protocol v2.0</span>
          <div className="h-px bg-slate-200 dark:bg-slate-900 my-auto" />
        </div>
      </motion.div>
    </div>
  );
}
