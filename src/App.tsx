/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navigation, PageId } from './components/Navigation';
import { Header } from './components/Header';
import { QuickLogModal } from './components/QuickLogModal';
import { AuthModal } from './components/AuthModal';
import { BrandLogo } from './components/BrandLogo';
import { api } from './services/api';
import { HealthRecord } from './types';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { HealthTrackingPage } from './pages/HealthTrackingPage';
import { ChartsPage } from './pages/ChartsPage';
import { MedicationsPage } from './pages/MedicationsPage';
import { MedDroidPage } from './pages/MedDroidPage';
import { ReportAnalyzerPage } from './pages/ReportAnalyzerPage';
import { WellnessChatPage } from './pages/WellnessChatPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [dateRange, setDateRange] = useState<string>('14d');
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // If initial auth session is verifying
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 space-y-4">
        <BrandLogo size="lg" />
        <div className="flex items-center gap-2 text-xs text-teal-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
          <span>Verifying encrypted telemetry session...</span>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show modern AuthModal
  if (!user) {
    return <AuthModal />;
  }

  const handleSaveVital = async (record: Partial<HealthRecord>) => {
    await api.addRecord(record);
    // trigger re-renders on active pages
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row antialiased">
      {/* Responsive Left Navigation */}
      <Navigation
        currentPage={currentPage}
        onSelectPage={setCurrentPage}
        onOpenQuickLog={() => setIsQuickLogOpen(true)}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentPage={currentPage}
          onOpenQuickLog={() => setIsQuickLogOpen(true)}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {currentPage === 'dashboard' && (
            <DashboardPage
              key={`dash_${refreshTrigger}`}
              onNavigate={setCurrentPage}
              onOpenQuickLog={() => setIsQuickLogOpen(true)}
              dateRange={dateRange}
            />
          )}

          {currentPage === 'tracking' && (
            <HealthTrackingPage
              key={`track_${refreshTrigger}`}
              onOpenQuickLog={() => setIsQuickLogOpen(true)}
              dateRange={dateRange}
            />
          )}

          {currentPage === 'charts' && (
            <ChartsPage
              key={`charts_${refreshTrigger}`}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          )}

          {currentPage === 'medications' && (
            <MedicationsPage key={`meds_${refreshTrigger}`} />
          )}

          {currentPage === 'voice-assistant' && <MedDroidPage />}

          {currentPage === 'report-analyzer' && <ReportAnalyzerPage />}

          {currentPage === 'wellness-chat' && <WellnessChatPage />}

          {currentPage === 'profile' && <ProfileSettingsPage />}
        </main>
      </div>

      {/* Global Quick Vital Log Modal */}
      <QuickLogModal
        isOpen={isQuickLogOpen}
        onClose={() => setIsQuickLogOpen(false)}
        onSaveRecord={handleSaveVital}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
