import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, doc, updateDoc, orderBy } from 'firebase/firestore';
import { Users, Shield, User as UserIcon, Mail, Check, Loader2, Search } from 'lucide-react';
import { motion } from 'motion/react';

interface AppUser {
  uid: string;
  email: string;
  role: 'petitioner' | 'judge' | 'court_clerk';
  displayName?: string;
  studentId?: string;
}

export default function UserManagement({ currentUser }: { currentUser: any }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('email'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (userId: string, newRole: AppUser['role']) => {
    setUpdating(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    } finally {
      setUpdating(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roles: AppUser['role'][] = ['petitioner', 'court_clerk', 'judge'];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-8 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-4">
            <div className="bg-slate-900 dark:bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-slate-100 dark:shadow-indigo-900/20">
              <Users className="text-white" size={28} />
            </div>
            Personnel Registry
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Manage secure access levels and individual judicial authorizations</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" size={18} />
          <input 
            type="text" 
            placeholder="Search credentials..."
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm shadow-sm text-slate-900 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-8 py-5 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Authenticated Profile</th>
                <th className="px-8 py-5 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Security Clearance</th>
                <th className="px-8 py-5 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 text-right">Role Authorization Matrix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-300 dark:text-slate-600 group-hover:border-indigo-100 dark:group-hover:border-indigo-900 group-hover:text-indigo-400 dark:group-hover:text-indigo-500 transition-all shadow-sm">
                        <UserIcon size={24} />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{user.displayName || 'UNIDENTIFIED'}</p>
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-widest">{user.studentId || 'NO ID ASSIGNED'}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-tighter flex items-center gap-1.5 opacity-70">
                            <Mail size={10} /> {user.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 shadow-sm ${
                      user.role === 'judge' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800' :
                      user.role === 'court_clerk' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' :
                      'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700'
                    }`}>
                      {user.role === 'judge' && <Shield size={12} />}
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-2 justify-end">
                      {roles.map((role) => (
                        <button
                          key={role}
                          onClick={() => handleRoleChange(user.uid, role)}
                          disabled={updating === user.uid || user.role === role}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border-2 ${
                            user.role === role 
                              ? 'bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-indigo-600 shadow-md cursor-default'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-indigo-50 dark:hover:shadow-indigo-900/10 hover:shadow-lg'
                          } disabled:opacity-50 active:scale-95`}
                        >
                          {user.role === role && <Check size={12} />}
                          {updating === user.uid && user.role !== role ? <Loader2 className="animate-spin" size={12} /> : null}
                          {role.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-8 py-20 text-center">
                    <Search className="mx-auto text-slate-200 dark:text-slate-700 mb-4" size={48} />
                    <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest text-xs">No records matching "{searchTerm}"</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
