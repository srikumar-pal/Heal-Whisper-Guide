import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Info,
  CheckCircle2,
  Sliders,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Heart,
  Droplets,
  Activity,
  PhoneCall,
  Clock,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { HealthRecord } from '../types';
import {
  HealthTrendAlert,
  TrendAlertConfig,
  DEFAULT_TREND_CONFIG,
  SENSITIVITY_PRESETS,
  evaluateHealthTrends,
} from '../utils/trendAlertEngine';

interface TrendAlertsSectionProps {
  records: HealthRecord[];
  userId: string;
  onOpenQuickLog?: () => void;
}

export const TrendAlertsSection: React.FC<TrendAlertsSectionProps> = ({
  records,
  userId,
  onOpenQuickLog,
}) => {
  // Config state with localStorage persistence
  const configStorageKey = `heal_whisper_trend_config_${userId}`;
  const dismissedStorageKey = `heal_whisper_dismissed_alerts_${userId}`;

  const [config, setConfig] = useState<TrendAlertConfig>(() => {
    try {
      const saved = localStorage.getItem(configStorageKey);
      if (saved) {
        return { ...DEFAULT_TREND_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      // fallback
    }
    return DEFAULT_TREND_CONFIG;
  });

  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(dismissedStorageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // fallback
    }
    return [];
  });

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'urgent' | 'blood_pressure' | 'blood_sugar' | 'pulse'>('all');

  // Save config
  const handleUpdateConfig = (newConfig: TrendAlertConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem(configStorageKey, JSON.stringify(newConfig));
    } catch (e) {
      console.warn('Failed to save trend config:', e);
    }
  };

  // Dismiss alert
  const handleDismissAlert = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      localStorage.setItem(dismissedStorageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist dismissal:', e);
    }
  };

  // Restore dismissed alert
  const handleRestoreAlert = (id: string) => {
    const updated = dismissedIds.filter((item) => item !== id);
    setDismissedIds(updated);
    try {
      localStorage.setItem(dismissedStorageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to restore alert:', e);
    }
  };

  // Clear all dismissals
  const handleClearAllDismissed = () => {
    setDismissedIds([]);
    try {
      localStorage.removeItem(dismissedStorageKey);
    } catch (e) {
      console.warn('Failed to clear dismissals:', e);
    }
  };

  // Run evaluation engine
  const analysis = useMemo(() => {
    return evaluateHealthTrends(records, config, dismissedIds);
  }, [records, config, dismissedIds]);

  const { alerts, urgentAlerts, dismissedAlerts, stats } = analysis;

  // Filtered active alerts
  const filteredAlerts = useMemo(() => {
    if (selectedFilter === 'urgent') {
      return alerts.filter((a) => a.severity === 'urgent');
    }
    if (selectedFilter === 'blood_pressure' || selectedFilter === 'blood_sugar' || selectedFilter === 'pulse') {
      return alerts.filter((a) => a.metricType === selectedFilter);
    }
    return alerts;
  }, [alerts, selectedFilter]);

  const totalRecordsCount = records.length;
  const bpCount = records.filter((r) => r.type === 'blood_pressure').length;
  const sugarCount = records.filter((r) => r.type === 'blood_sugar').length;
  const pulseCount = records.filter((r) => r.type === 'pulse').length;

  return (
    <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-7 space-y-6 shadow-xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start sm:items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
            urgentAlerts.length > 0
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse'
              : alerts.length > 0
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            {urgentAlerts.length > 0 ? (
              <ShieldAlert className="w-5 h-5" />
            ) : alerts.length > 0 ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Health Trend Alerts & Fluctuation Monitor
              </h3>
              {urgentAlerts.length > 0 ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40">
                  {urgentAlerts.length} Urgent Alert{urgentAlerts.length > 1 ? 's' : ''}
                </span>
              ) : alerts.length > 0 ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                  {alerts.length} Notice{alerts.length > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Vitals Stable
                </span>
              )}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 capitalize">
                Rule Set: {config.sensitivity}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated multi-reading comparisons for blood pressure, glucose, and resting heart rate shifts.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          {dismissedAlerts.length > 0 && (
            <button
              onClick={() => setShowDismissed(!showDismissed)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
            >
              {showDismissed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showDismissed ? 'Hide Dismissed' : `Dismissed (${dismissedAlerts.length})`}</span>
            </button>
          )}

          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white border border-teal-500/30 text-xs font-semibold transition-all cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-teal-400" />
            <span>Configure Rules</span>
          </button>
        </div>
      </div>

      {/* Urgent Emergency Alert Banner if any urgent alert exists */}
      {urgentAlerts.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-950/80 via-rose-900/40 to-slate-900 border border-rose-500/50 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 shrink-0 mt-0.5 animate-pulse">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-rose-200 flex items-center gap-2">
                <span>Immediate Clinical Action Notice</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/30 text-rose-200 uppercase tracking-wider">
                  Urgent Evaluation Recommended
                </span>
              </h4>
              <p className="text-xs text-rose-200/90 leading-relaxed">
                One or more of your saved measurements entered critical clinical thresholds (e.g., Hypertensive Crisis BP &gt; 180/120 mmHg, severe hypoglycemia &lt; 54 mg/dL, or heart rate &ge; 130 BPM).
              </p>
            </div>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="text-slate-300 space-y-0.5">
              <span className="font-semibold text-rose-300">Emergency Red Flags: </span>
              <span className="text-slate-400">
                Chest tightness, severe shortness of breath, sudden facial drooping or arm weakness, severe confusion, or fainting.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="tel:911"
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call Emergency (911 / 999)</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setSelectedFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 cursor-pointer ${
            selectedFilter === 'all'
              ? 'bg-teal-500 text-slate-950 font-bold'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
          }`}
        >
          All Active ({alerts.length})
        </button>

        {urgentAlerts.length > 0 && (
          <button
            onClick={() => setSelectedFilter('urgent')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-1 ${
              selectedFilter === 'urgent'
                ? 'bg-rose-600 text-white font-bold'
                : 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border border-rose-500/30'
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Urgent Only ({urgentAlerts.length})</span>
          </button>
        )}

        <button
          onClick={() => setSelectedFilter('blood_pressure')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-1 ${
            selectedFilter === 'blood_pressure'
              ? 'bg-teal-500 text-slate-950 font-bold'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Heart className="w-3 h-3 text-rose-400" />
          <span>Blood Pressure</span>
        </button>

        <button
          onClick={() => setSelectedFilter('blood_sugar')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-1 ${
            selectedFilter === 'blood_sugar'
              ? 'bg-teal-500 text-slate-950 font-bold'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Droplets className="w-3 h-3 text-cyan-400" />
          <span>Blood Sugar</span>
        </button>

        <button
          onClick={() => setSelectedFilter('pulse')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-1 ${
            selectedFilter === 'pulse'
              ? 'bg-teal-500 text-slate-950 font-bold'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Activity className="w-3 h-3 text-indigo-400" />
          <span>Pulse</span>
        </button>
      </div>

      {/* Alerts Grid / Empty State */}
      {filteredAlerts.length === 0 ? (
        <div className="py-10 px-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md">
            <h4 className="text-sm font-bold text-white">
              {totalRecordsCount < 2
                ? 'Insufficient Readings for Trend Analysis'
                : 'No Potentially Dangerous Trends Detected'}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {totalRecordsCount < 2
                ? 'At least 2 chronological readings for blood pressure, blood sugar, or pulse are required to monitor longitudinal jumps and consecutive elevations.'
                : 'Your saved readings are currently consistent with your configured threshold baselines. We will alert you if a sudden jump or critical range is recorded.'}
            </p>
          </div>

          {/* Metric telemetry counts */}
          <div className="flex items-center gap-4 text-xs text-slate-500 font-mono pt-2">
            <span>BP Logs: {bpCount}</span>
            <span>•</span>
            <span>Sugar Logs: {sugarCount}</span>
            <span>•</span>
            <span>Pulse Logs: {pulseCount}</span>
          </div>

          {onOpenQuickLog && (
            <button
              onClick={onOpenQuickLog}
              className="mt-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Log New Health Reading</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const isUrgent = alert.severity === 'urgent';
            const isWarning = alert.severity === 'warning';

            let borderStyle = 'border-slate-800 hover:border-slate-700 bg-slate-950/70';
            let iconColor = 'text-blue-400';
            let iconBg = 'bg-blue-500/10 border-blue-500/20';

            if (isUrgent) {
              borderStyle = 'border-rose-500/50 hover:border-rose-500/70 bg-gradient-to-r from-rose-950/30 via-slate-950/80 to-slate-950/80';
              iconColor = 'text-rose-400';
              iconBg = 'bg-rose-500/20 border-rose-500/30';
            } else if (isWarning) {
              borderStyle = 'border-amber-500/30 hover:border-amber-500/50 bg-slate-950/80';
              iconColor = 'text-amber-400';
              iconBg = 'bg-amber-500/10 border-amber-500/20';
            }

            return (
              <div
                key={alert.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3 ${borderStyle}`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${iconBg} ${iconColor}`}>
                      {isUrgent ? (
                        <ShieldAlert className="w-4 h-4" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Info className="w-4 h-4" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white tracking-tight">{alert.title}</h4>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                            isUrgent
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : isWarning
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          }`}
                        >
                          {isUrgent ? 'Urgent Alert' : isWarning ? 'Trend Warning' : 'Observation'}
                        </span>

                        {alert.deltaText && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {alert.deltaText}
                          </span>
                        )}

                        {alert.isSample && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                            Sample / Demo Data
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Logged: {alert.formattedDate}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-300">Reading: {alert.measurement}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dismiss button */}
                  <button
                    onClick={() => handleDismissAlert(alert.id)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer shrink-0"
                    title="Dismiss this alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Reason & transparent rule */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-mono uppercase font-semibold text-slate-400">
                      Reason for Alert
                    </span>
                    <p className="text-slate-300 leading-relaxed">{alert.reason}</p>
                    <span className="text-[10.5px] font-mono text-teal-400 block pt-0.5">
                      {alert.triggerRule}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-mono uppercase font-semibold text-teal-400">
                      Appropriate Next Step
                    </span>
                    <p className="text-slate-300 leading-relaxed">{alert.nextStep}</p>
                  </div>
                </div>

                {/* Urgent Care Specific Guidance */}
                {alert.urgentCareGuidance && (
                  <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold text-rose-300">Urgent Care Guidance: </strong>
                      <span>{alert.urgentCareGuidance}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dismissed Alerts Panel (Collapsible) */}
      {showDismissed && dismissedAlerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/60 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              <span>Dismissed Alerts ({dismissedAlerts.length})</span>
            </span>
            <button
              onClick={handleClearAllDismissed}
              className="text-xs text-teal-400 hover:underline cursor-pointer"
            >
              Restore All Alerts
            </button>
          </div>

          <div className="space-y-2">
            {dismissedAlerts.map((dAlert) => (
              <div
                key={dAlert.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-300">{dAlert.title}</span>
                  <span className="text-slate-500 text-[11px] ml-2">({dAlert.measurement} on {dAlert.formattedDate})</span>
                </div>
                <button
                  onClick={() => handleRestoreAlert(dAlert.id)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-medium cursor-pointer"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clinical Reference Disclaimer */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10.5px] text-slate-500 border-t border-slate-800/50 font-mono">
        <span>Transparent Configurable Thresholds • ACC/AHA 2017 & ADA 2024 Guidelines</span>
        <span>A single fluctuation is not a definitive diagnosis • Consult a doctor for clinical diagnosis</span>
      </div>

      {/* Configure Rules Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-xl space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">Trend Alert Rule Settings</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Sensitivity Preset</label>
              <div className="grid grid-cols-3 gap-2">
                {(['standard', 'sensitive', 'relaxed'] as const).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleUpdateConfig(SENSITIVITY_PRESETS[preset])}
                    className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                      config.sensitivity === preset
                        ? 'bg-teal-500 text-slate-950 shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                Standard: Balanced clinical sensitivity. Sensitive: Lower jump threshold for tighter oversight. Relaxed: Higher delta thresholds to reduce alert frequency.
              </p>
            </div>

            {/* Threshold controls */}
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                Custom Rule Thresholds
              </h4>

              {/* BP Thresholds */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <label className="text-slate-400 font-medium">Systolic Jump Threshold</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={config.bpSystolicJumpThreshold}
                      onChange={(e) =>
                        handleUpdateConfig({ ...config, bpSystolicJumpThreshold: Number(e.target.value) })
                      }
                      className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono"
                    />
                    <span className="text-slate-400">mmHg</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <label className="text-slate-400 font-medium">Diastolic Jump Threshold</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={config.bpDiastolicJumpThreshold}
                      onChange={(e) =>
                        handleUpdateConfig({ ...config, bpDiastolicJumpThreshold: Number(e.target.value) })
                      }
                      className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono"
                    />
                    <span className="text-slate-400">mmHg</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <label className="text-slate-400 font-medium">Glucose Spike Threshold</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={config.glucoseJumpThreshold}
                      onChange={(e) =>
                        handleUpdateConfig({ ...config, glucoseJumpThreshold: Number(e.target.value) })
                      }
                      className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono"
                    />
                    <span className="text-slate-400">mg/dL</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <label className="text-slate-400 font-medium">Pulse Spike Threshold</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={config.pulseJumpThreshold}
                      onChange={(e) =>
                        handleUpdateConfig({ ...config, pulseJumpThreshold: Number(e.target.value) })
                      }
                      className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono"
                    />
                    <span className="text-slate-400">BPM</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => handleUpdateConfig(DEFAULT_TREND_CONFIG)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Defaults</span>
              </button>

              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
