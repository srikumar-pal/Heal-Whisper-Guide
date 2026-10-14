import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Plus,
  Bell,
  BellOff,
  ShieldAlert,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { PageId } from './Navigation';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  currentPage: PageId;
  onOpenQuickLog: () => void;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
}

const pageTitles: Record<PageId, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Clinical Health Dashboard',
    subtitle: 'Real-time physiological vitals, medication adherence, and proactive trends',
  },
  tracking: {
    title: 'MedPin Health Tracking',
    subtitle: 'Comprehensive logging and management of Blood Pressure, Blood Sugar, and Pulse',
  },
  charts: {
    title: 'Health Trends & Analytics',
    subtitle: 'Longitudinal charts, AHA/ADA target zones, and PDF/CSV clinical exports',
  },
  medications: {
    title: 'Medication Scheduler & Reminders',
    subtitle: 'Dose regimens, compliance tracking, and refill inventory management',
  },
  'voice-assistant': {
    title: 'MedDroid Voice Assistant',
    subtitle: 'Voice-interactive wellness guide with bilingual English and Bengali audio support',
  },
  'report-analyzer': {
    title: 'VADG Medical Report Analyzer',
    subtitle: 'Plain-language parsing of diagnostic labs, reference ranges, and physician questions',
  },
  'wellness-chat': {
    title: 'AI Wellness & Clinical Educator',
    subtitle: 'Evidence-informed health answers, terminology explanations, and triage alerts',
  },
  profile: {
    title: 'Profile & Clinical Preferences',
    subtitle: 'Personal physiological baseline, language, units, and privacy controls',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onOpenQuickLog,
  dateRange,
  onDateRangeChange,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [notificationState, setNotificationState] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationState(Notification.permission);
    } else {
      setNotificationState('unsupported');
    }
  }, []);

  const handleRequestNotification = async () => {
    if ('Notification' in window) {
      const res = await Notification.requestPermission();
      setNotificationState(res);
      if (res === 'granted') {
        new Notification('Heal-Whisper-Guide Notifications Active', {
          body: 'You will receive timely medication reminders on this device.',
        });
      }
    }
  };

  const showDateFilter = ['dashboard', 'charts', 'tracking'].includes(currentPage);
  const info = pageTitles[currentPage] || { title: 'Dashboard', subtitle: '' };

  return (
    <header className="bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-4 sticky top-0 z-30 flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>{info.title}</span>
          {currentPage === 'voice-assistant' && (
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
              Voice Active
            </span>
          )}
          {currentPage === 'report-analyzer' && (
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
              Vision Parser
            </span>
          )}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5 max-w-2xl">
          {info.subtitle}
        </p>
      </div>

      {/* Controls & Actions */}
      <div className="flex items-center flex-wrap gap-2.5 sm:gap-3 self-end md:self-auto">
        {/* Date Filter selector if on data pages */}
        {showDateFilter && (
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-teal-400" />
            <select
              value={dateRange}
              onChange={(e) => onDateRangeChange(e.target.value)}
              className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer pr-1"
            >
              <option value="7d" className="bg-slate-900 text-slate-200">Last 7 Days</option>
              <option value="14d" className="bg-slate-900 text-slate-200">Last 14 Days</option>
              <option value="30d" className="bg-slate-900 text-slate-200">Last 30 Days</option>
              <option value="90d" className="bg-slate-900 text-slate-200">Last 90 Days</option>
              <option value="all" className="bg-slate-900 text-slate-200">All Observations</option>
            </select>
          </div>
        )}

        {/* Notification permission pill */}
        {notificationState === 'default' && (
          <button
            onClick={handleRequestNotification}
            title="Enable browser medication alarms"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-amber-300 hover:bg-slate-700 text-xs transition-colors cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
            <span className="hidden sm:inline">Enable Alarms</span>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
        </button>

        {/* Quick Log Button */}
        <button
          onClick={onOpenQuickLog}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-semibold text-xs shadow-md shadow-teal-500/20 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Record Vital</span>
        </button>
      </div>
    </header>
  );
};
