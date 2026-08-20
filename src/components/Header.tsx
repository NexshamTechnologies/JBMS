import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Clock,
  ShieldCheck,
  ChevronDown,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
interface HeaderProps {
  activeTab: string;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  theme,
  toggleTheme
}) => {
  const { user, userRole, signOut } = useAuth();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

const displayName =
  user?.profile.name ||
  user?.user.email?.split("@")[0] ||
  "User";

  const initials: string = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }) + ', ' + now.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short'
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="bg-[#0a0a0a] border-b border-white/10 text-[#d1d1d1] sticky top-0 z-30 shadow-md">
      <div className="px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Jai Shiv Trading" className="h-11 w-auto object-contain rounded-lg shadow-md" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base lg:text-lg tracking-wider text-white italic font-serif leading-tight">
                JAI SHIV <span className="not-italic font-sans font-black text-blue-600 dark:text-blue-500">TRADING</span>
              </h1>
            </div>
            <p className="text-[10px] text-[#d1d1d1]/50 hidden sm:block">
              Business Management System
            </p>
          </div>
        </div>

        {/* Right Utility Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Clock */}
          <div className="hidden xl:flex items-center gap-2 text-[11px] uppercase tracking-wider text-[#d1d1d1]/70 bg-[#141414] px-3.5 py-1.5 rounded-full border border-white/10">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>{currentTime || 'Loading...'}</span>
          </div>



          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 text-[#d1d1d1]/70 hover:text-white hover:bg-white/5 rounded-full transition-all duration-300 hover:rotate-12 active:scale-95 flex items-center justify-center"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-slate-700" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {/* User Profile Menu */}
          <div className="relative flex items-center gap-2.5 pl-2 border-l border-white/10" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-xl px-2 py-1 transition hover:bg-white/5 active:scale-95"
            >
              <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                {initials}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-white leading-tight">{displayName}</p>
                <p className="text-[10px] text-[#d1d1d1]/50 flex items-center gap-1 uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" /> {userRole}
                </p>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#d1d1d1]/40 transition-transform duration-200 hidden lg:block ${
                  profileOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown menu */}
            {profileOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-64 rounded-2xl shadow-2xl z-50 overflow-hidden bg-[#141414] border border-white/10"
              >
                {/* User info strip */}
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-xs font-bold text-white truncate">{displayName}</p>
                  <p className="text-[11px] text-[#d1d1d1]/50 truncate mt-0.5">{user?.user.email}</p>
                  <div className="mt-2 flex items-center gap-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-extrabold px-2.5 py-1 rounded-full border border-blue-500/20 uppercase tracking-widest w-fit">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    <span>Role: {userRole}</span>
                  </div>
                </div>


                {/* Actions */}
                <div className="p-2">
                  <button
                    onClick={async () => { setProfileOpen(false); await signOut(); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
