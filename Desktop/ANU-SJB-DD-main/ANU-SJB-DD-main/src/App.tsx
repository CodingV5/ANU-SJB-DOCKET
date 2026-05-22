import React, { useState, useEffect } from 'react';
import { auth, signInWithGoogle, logout, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { LogIn, Gavel, Briefcase, Archive, Bell, LogOut, Loader2, ShieldCheck, User as UserIcon, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard';
import CaseFiling from './components/CaseFiling';
import PrecedentArchive from './components/PrecedentArchive';
import SummonsSystem from './components/SummonsSystem';
import UserManagement from './components/UserManagement';
import Onboarding from './components/Onboarding';
import EmailVerification from './components/EmailVerification';

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

import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'filing' | 'archive' | 'summons' | 'users'>('dashboard');
  const [pendingCaseId, setPendingCaseId] = useState<string | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false); // Default to light mode

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    // Add a temporary class to disable transitions for a moment to prevent "flash"
    // or keep them on for the smooth fade effect
    setDarkMode(!darkMode);
  };
  useEffect(() => {
    const saveToken = async (token: string, uid: string) => {
      try {
        const userDocRef = doc(db, 'users', uid);
        await setDoc(userDocRef, { fcmToken: token }, { merge: true });
        console.log('FCM Token saved to profile');
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
    // Initialize Mobile Native UI
    const initNative = async () => {
      if (!Capacitor.isNativePlatform()) {
        console.log('Native APIs not available in browser');
        return;
      }

      try {
        await StatusBar.setStyle({ style: Style.Light });
        await SplashScreen.hide();

        // Push Notifications
        const permission = await PushNotifications.requestPermissions();
        if (permission.receive === 'granted') {
          await PushNotifications.register();
        }

        PushNotifications.addListener('registration', (token) => {
          console.log('Push registration success');
          setPendingToken(token.value);
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('Error on registration: ' + JSON.stringify(error));
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push received: ' + JSON.stringify(notification));
        });

      } catch (e) {
        console.error('Error initializing native APIs:', e);
      }
    };
    initNative();

    // Handle Android Back Button
    const backListener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      // If we are on the dashboard and there's no history to go back to,
      // minimize or exit the app.
      if (activeTab === 'dashboard') {
        CapacitorApp.exitApp();
      } else {
        // If we are on any other tab, go back to the dashboard
        setActiveTab('dashboard');
      }
    });

    return () => {
      backListener.then(l => l.remove());
    };
  }, [activeTab]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          console.log("User authenticated:", firebaseUser.email);
          const userDocRef = doc(db, 'users', firebaseUser.uid);

          // Use a timeout or catch error for Firestore
          let userDoc;
          try {
            userDoc = await getDoc(userDocRef);
          } catch (e) {
            console.error("Firestore Read Error:", e);
            throw new Error("Database connection failed. Please check if Firestore is enabled in Firebase Console.");
          }

          if (!userDoc.exists()) {
            // New user registration
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
            const updatedUser = {
              ...data,
              uid: firebaseUser.uid,
              emailVerified: firebaseUser.emailVerified
            };

            // SECURITY: Only allow the hardcoded admin to self-promote to Judge.
            // All other users MUST be promoted by an existing Judge in the "Users" tab.
            if (firebaseUser.email === 'nobleaidoo5@gmail.com' && data.role !== 'judge') {
              await setDoc(userDocRef, { role: 'judge' }, { merge: true });
              setUser({ ...updatedUser, role: 'judge' });
            } else {
              setUser(updatedUser);
            }
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth State Error:", error);
        alert(error instanceof Error ? error.message : "An unexpected error occurred during secure connection.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-10 mt-2 text-indigo-600 animate-spin" />
        <p className="mt-4 text-slate-600 dark:text-slate-400 font-medium">Securing connection to ANU SJB DOCKET...</p>
      </div>
    );
  }

  if (!user) {
    return <LandingPage onLogin={signInWithGoogle} />;
  }

  if (!user.emailVerified) {
    return <EmailVerification user={user} onLogout={logout} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <AnimatePresence>
        {!user.hasCompletedOnboarding && (
          <Onboarding user={user} onComplete={() => setUser({ ...user, hasCompletedOnboarding: true })} />
        )}
      </AnimatePresence>
      {/* Navigation */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm">
              <Gavel className="text-white w-5 h-5" />
            </div>
            <div className="flex flex-col -space-y-1">
              <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                ANU SJB DOCKET
              </h1>
              <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] opacity-80">Judicial System</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            <NavBtn 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
              icon={<Briefcase size={16} />} 
              label={user.role === 'petitioner' ? 'My Cases' : 'Case Docket'} 
            />
            <NavBtn 
              active={activeTab === 'filing'} 
              onClick={() => setActiveTab('filing')} 
              icon={<ShieldCheck size={16} />} 
              label={user.role === 'petitioner' ? 'File Petition' : 'New Filing'} 
            />
            {(user.role === 'judge' || user.role === 'court_clerk') && (
              <>
                <NavBtn active={activeTab === 'archive'} onClick={() => setActiveTab('archive')} icon={<Archive size={16} />} label="Precedents" />
                <NavBtn active={activeTab === 'summons'} onClick={() => setActiveTab('summons')} icon={<Bell size={16} />} label="Summons" />
                <NavBtn active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<UserIcon size={16} />} label="Users" />
              </>
            )}
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user.displayName}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 capitalize font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{user.role}</span>
            </div>
            <button
              onClick={toggleDarkMode}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-full transition-all duration-500"
              title="Toggle Theme"
            >
              <motion.div
                initial={false}
                animate={{ rotate: darkMode ? 180 : 0, scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5 }}
              >
                {darkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
              </motion.div>
            </button>
            <button
              onClick={logout}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <Dashboard 
                user={user} 
                initialCaseId={pendingCaseId} 
                onModalClose={() => setPendingCaseId(null)} 
              />
            )}
            {activeTab === 'filing' && <CaseFiling user={user} onSuccess={() => setActiveTab('dashboard')} />}
            {(user.role === 'judge' || user.role === 'court_clerk') && (
              <>
                {activeTab === 'archive' && <PrecedentArchive />}
                {activeTab === 'summons' && (
                  <SummonsSystem 
                    user={user} 
                    onViewCase={(caseId) => {
                      setPendingCaseId(caseId);
                      setActiveTab('dashboard');
                    }} 
                  />
                )}
                {activeTab === 'users' && <UserManagement currentUser={user} />}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Footer Nav */}
      <div className="md:hidden sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around p-3 z-50 transition-colors">
        <MobileNavBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Briefcase size={20} />} />
        <MobileNavBtn active={activeTab === 'filing'} onClick={() => setActiveTab('filing')} icon={<ShieldCheck size={20} />} />
        {(user.role === 'judge' || user.role === 'court_clerk') && (
          <>
            <MobileNavBtn active={activeTab === 'archive'} onClick={() => setActiveTab('archive')} icon={<Archive size={20} />} />
            <MobileNavBtn active={activeTab === 'summons'} onClick={() => setActiveTab('summons')} icon={<Bell size={20} />} />
            <MobileNavBtn active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<UserIcon size={20} />} />
          </>
        )}
      </div>
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all relative group shadow-sm ${
        active 
          ? 'bg-slate-900 dark:bg-indigo-600 border-slate-900 dark:border-indigo-600 text-white shadow-xl shadow-slate-200 dark:shadow-indigo-900/20'
          : 'bg-white dark:bg-slate-800 border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white border'
      }`}
    >
      <div className={`${active ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'} transition-colors`}>
        {React.cloneElement(icon as React.ReactElement, { size: 16 })}
      </div>
      {label}
      {active && (
        <motion.div
          layoutId="activeNav"
          className="absolute inset-0 bg-slate-900 dark:bg-indigo-600 rounded-2xl -z-10"
        />
      )}
    </button>
  );
}

function MobileNavBtn({ active, onClick, icon }: { active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-xl scale-110 transition-colors ${active ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-400 dark:text-slate-500'}`}
    >
      {icon}
    </button>
  );
}

function LandingPage({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden flex flex-col items-center justify-center relative p-6 transition-colors duration-300">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-slate-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white/80 dark:bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-slate-200 dark:border-white/10 text-center relative z-10 shadow-2xl"
      >
        <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-indigo-500/20 shadow-lg">
          <Gavel className="text-white w-8 h-8" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">ANU SJB DOCKET</h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg mb-8 leading-relaxed">
          The official judicial registry and secure petition processing platform for the ANU SJB DOCKET.
        </p>

        <button
          onClick={onLogin}
          className="w-full h-14 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all duration-300 transform hover:scale-[1.02] active:scale-95 shadow-xl"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Access Portal
        </button>

        <p className="mt-8 text-xs text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest">
          End-to-End Encryption • Biometric Auth Ready • immutability
        </p>
      </motion.div>

      <div className="mt-12 flex gap-8 text-slate-400 dark:text-slate-500/60 font-medium z-10">
        <span className="flex items-center gap-1.5"><ShieldCheck size={16} /> Secure Portal</span>
        <span className="flex items-center gap-1.5"><Archive size={16} /> Legal Archive</span>
        <span className="flex items-center gap-1.5"><Bell size={16} /> Auto Summons</span>
      </div>
    </div>
  );
}
