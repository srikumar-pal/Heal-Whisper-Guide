import React from 'react';
import {
  LayoutDashboard,
  Activity,
  LineChart,
  Pill,
  Mic,
  FileText,
  Bot,
  UserCog,
  LogOut,
  PhoneCall,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Menu,
  X,
  Plus,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../context/AuthContext';

export type PageId =
  | 'dashboard'
  | 'tracking'
  | 'charts'
  | 'medications'
  | 'voice-assistant'
  | 'report-analyzer'
  | 'wellness-chat'
  | 'profile';

interface NavigationProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  onOpenQuickLog: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentPage,
  onSelectPage,
  onOpenQuickLog,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const { user, logout, systemStatus } = useAuth();

  const navItems: { id: PageId; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string; category: string }[] = [
    { id: 'dashboard', label: 'Main Dashboard', icon: LayoutDashboard, category: 'Core' },
    { id: 'tracking', label: 'Health Tracking', icon: Activity, badge: 'MedPin', category: 'Core' },
    { id: 'charts', label: 'History & Charts', icon: LineChart, category: 'Core' },
    { id: 'medications', label: 'Medicines & Doses', icon: Pill, category: 'Care' },
    { id: 'voice-assistant', label: 'MedDroid Voice AI', icon: Mic, badge: 'Voice', category: 'AI Intelligence' },
    { id: 'report-analyzer', label: 'VADG Report Analyzer', icon: FileText, badge: 'VADG', category: 'AI Intelligence' },
    { id: 'wellness-chat', label: 'AI Wellness Guide', icon: Bot, category: 'AI Intelligence' },
    { id: 'profile', label: 'Profile & Settings', icon: UserCog, category: 'Account' },
  ];

  const categories = ['Core', 'Care', 'AI Intelligence', 'Account'];

  const handleNavClick = (id: PageId) => {
    onSelectPage(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-slate-900 border-r border-slate-800/80 min-h-screen p-4 select-none shrink-0 sticky top-0 h-screen overflow-y-auto">
        {/* Brand Header */}
        <div className="px-2 py-3 border-b border-slate-800/60 mb-3">
          <BrandLogo size="md" />
        </div>

        {/* Quick Action Button */}
        <div className="mb-4 px-1">
          <button
            onClick={onOpenQuickLog}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-semibold text-sm shadow-lg shadow-teal-500/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Quick Log Reading</span>
          </button>
        </div>

        {/* Nav list with categories */}
        <div className="flex-1 space-y-4">
          {categories.map((cat) => {
            const items = navItems.filter((i) => i.category === cat);
            return (
              <div key={cat} className="space-y-1">
                <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase px-3">
                  {cat}
                </span>
                <nav className="space-y-0.5 mt-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group cursor-pointer ${
                          isActive
                            ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-sm shadow-teal-500/5'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`w-4 h-4 transition-colors ${
                              isActive
                                ? 'text-teal-400'
                                : 'text-slate-400 group-hover:text-slate-200'
                            }`}
                          />
                          <span>{item.label}</span>
                        </div>

                        {item.badge && (
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                              isActive
                                ? 'bg-teal-400/20 text-teal-300'
                                : 'bg-slate-800 text-slate-400 group-hover:text-slate-300'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        {/* System & Emergency Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800/70 space-y-3">
          {/* AI Status Pill */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800/60 text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${systemStatus?.geminiConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-slate-300 text-[11px] font-medium">
                {systemStatus?.geminiConfigured ? 'Gemini 3.8 Active' : 'AI Offline (Rules Engine)'}
              </span>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-teal-400/70" />
          </div>

          {/* Emergency Hotline Reference */}
          <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-medium">
              <PhoneCall className="w-3.5 h-3.5 text-rose-400" />
              <span>Emergency Help</span>
            </div>
            <span className="font-mono font-bold text-rose-300">911 / 112</span>
          </div>

          {/* User Profile Bar */}
          {user && (
            <div className="flex items-center justify-between pt-1 px-1">
              <div
                onClick={() => onSelectPage('profile')}
                className="flex items-center gap-2.5 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs ring-1 ring-teal-400/30">
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-slate-200 truncate">{user.name}</span>
                  <span className="text-[10px] text-slate-400 truncate">{user.email}</span>
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Top Navigation & Drawer */}
      <div className="lg:hidden w-full bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <BrandLogo size="sm" showSubtitle={false} />

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenQuickLog}
            className="p-2 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            <span>Log</span>
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:bg-slate-800 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex">
          <div className="w-4/5 max-w-sm bg-slate-900 border-r border-slate-800 min-h-screen p-5 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <BrandLogo size="sm" />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium ${
                        isActive
                          ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              {user && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-xs">
                      {user.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-slate-200">{user.name}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs flex items-center gap-1"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}
    </>
  );
};
