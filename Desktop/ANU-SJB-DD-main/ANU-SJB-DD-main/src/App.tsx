import React, { useState, useEffect } from 'react';
import { auth, signInWithGoogle, logout, db, storage } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Gavel, Briefcase, Archive, Bell, LogOut, Loader2, ShieldCheck, User as UserIcon, Moon, Sun, LayoutDashboard, FileSpreadsheet, Users, Menu, X as CloseIcon, Camera, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard';
import CaseFiling from './components/CaseFiling';
import PrecedentArchive from './components/PrecedentArchive';
import SummonsSystem from './components/SummonsSystem';
import UserManagement from './components/UserManagement';
import Onboarding from './components/Onboarding';
import EmailVerification from './components/EmailVerification';
import LegalDocuments from './components/LegalDocuments';

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

const LOGO_URL = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyuibvKEHr21xiuAzv9INF4eRFXpSiscqLOniZo5Fdsg&s=10";

function LogoIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <div className={`${className} rounded-lg overflow-hidden bg-white flex items-center justify-center p-0.5 shadow-sm border border-slate-100 dark:border-slate-800`}>
      <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'filing' | 'archive' | 'summons' | 'users'>('dashboard');
  const [pendingCaseId, setPendingCaseId] = useState<string | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showLegal, setShowLegal] = useState<'terms' | 'privacy' | null>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      const storageRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { photoURL }, { merge: true });
      setUser({ ...user, photoURL });
    } catch (error) {
      console.error("Avatar upload error:", error);
      alert("Failed to update avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

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
            if (firebaseUser.email === 'nobleaidoo5@gmail.com' && data.role !== 'judge') {
              await setDoc(userDocRef, { role: 'judge' }, { merge: true });
              setUser({ ...data, role: 'judge', uid: firebaseUser.uid, emailVerified: firebaseUser.emailVerified });
            } else {
              setUser({ ...data, uid: firebaseUser.uid, emailVerified: firebaseUser.emailVerified });
            }
            // Save identity hint for recognized login
            localStorage.setItem('last_known_user', data.displayName || 'Recognized Profile');
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-2xl border border-slate-100 dark:border-slate-800 p-2">
            <img src={LOGO_URL} alt="ANU" className="w-full h-full object-contain" />
          </div>
          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Verifying Protocol</p>
        </motion.div>
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
          <Onboarding
            user={user}
            onComplete={(studentId) => setUser({ ...user, hasCompletedOnboarding: true, studentId })}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLegal && (
          <LegalDocuments type={showLegal} onClose={() => setShowLegal(null)} />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar - Hidden on Mobile */}
      <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 sticky top-0 h-screen shrink-0 transition-colors">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <LogoIcon className="w-10 h-10" />
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
                  ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-lg'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl group relative">
            <label className="relative cursor-pointer shrink-0">
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={uploadingAvatar} />
              <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                {uploadingAvatar ? (
                  <Loader2 size={16} className="animate-spin text-emerald-600" />
                ) : user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={18} className="text-slate-400" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                  <Camera size={14} className="text-white" />
                </div>
              </div>
            </label>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{user.displayName}</p>
              <p className="text-[10px] text-slate-400 capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowLegal('terms')} className="flex-1 flex items-center justify-center h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-emerald-600 transition-colors border border-slate-100 dark:border-slate-700" title="Terms">
              <Scale size={18} />
            </button>
            <button onClick={toggleDarkMode} className="flex-1 flex items-center justify-center h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-600 transition-colors border border-slate-200 dark:border-slate-700">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={logout} className="flex-1 flex items-center justify-center h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 transition-colors border border-slate-200 dark:border-slate-700">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar - Hidden on Desktop */}
      <header className="md:hidden sticky top-0 z-40 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900 px-6 h-16 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <label className="relative cursor-pointer">
            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={uploadingAvatar} />
            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
              {uploadingAvatar ? (
                <Loader2 size={14} className="animate-spin text-emerald-600" />
              ) : user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={16} className="text-slate-400" />
              )}
            </div>
          </label>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white leading-none">ANU SJB</span>
            <span className="text-[8px] font-bold text-emerald-600 uppercase mt-0.5 tracking-tighter">{(user.displayName || 'Anonymous').split(' ')[0]}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggleDarkMode} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors">
            {darkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
          </button>
          <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
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
              {activeTab === 'archive' && <PrecedentArchive user={user} />}
              {activeTab === 'summons' && <SummonsSystem user={user} onViewCase={(id) => { setPendingCaseId(id); setActiveTab('dashboard'); }} />}
              {activeTab === 'users' && <UserManagement currentUser={user} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation - Hidden on Desktop */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900 px-2 py-3 flex justify-around items-center z-50 transition-colors">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center gap-1 px-4 transition-all ${
              activeTab === item.id
                ? 'text-emerald-600 dark:text-emerald-400'
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
              <motion.div layoutId="navTab" className="absolute bottom-0 w-8 h-1 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

function LandingPage({ onLogin }: { onLogin: () => void }) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [lastUser, setLastUser] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('last_known_user');
    if (saved) setLastUser(saved);
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await onLogin();
    } catch (e) {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
      <div className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,#10b98120_0%,transparent_40%)]" />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl w-full text-center relative z-10 flex flex-col items-center">
        <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden bg-white p-2 shadow-2xl mb-10 border border-slate-100 dark:border-slate-800">
          <img src={LOGO_URL} alt="ANU Logo" className="w-full h-full object-contain" />
        </div>

        {lastUser ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full mb-8 border border-emerald-100 dark:border-emerald-800 animate-in fade-in zoom-in">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="font-bold tracking-widest text-[10px] uppercase">Welcome Back, {lastUser.split(' ')[0]}</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl mb-8 shadow-xl">
            <span className="font-bold tracking-widest text-xs uppercase">Judicial Portal</span>
          </div>
        )}

        <h1 className="text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tight uppercase leading-none">ANU SJB DOCKET</h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg mb-12 font-medium max-w-sm">The high-security judicial ledger and secure petition management system for the Student Judicial Board.</p>

        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="group relative w-full max-w-xs py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs overflow-hidden transition-all hover:scale-[1.02] active:scale-95 shadow-2xl shadow-slate-200 dark:shadow-none disabled:opacity-70"
        >
          <span className="relative z-10 flex items-center justify-center gap-3">
            {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <img src="https://www.google.com/favicon.ico" alt="G" className="w-4 h-4" />}
            {isLoggingIn ? 'Authenticating...' : lastUser ? `Continue as ${lastUser.split(' ')[0]}` : 'Authenticate Identity'}
          </span>
        </button>
      </motion.div>
    </div>
  );
}
