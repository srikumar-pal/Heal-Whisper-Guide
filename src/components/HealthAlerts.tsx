import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Activity,
  Heart,
  Droplets,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  Clock,
  Sparkles,
  Sliders,
  PhoneCall,
  RotateCcw,
  Eye,
  EyeOff,
  Plus,
} from 'lucide-react';
import { HealthRecord } from '../types';

export type AnomalySeverity = 'critical' | 'warning' | 'caution';

export interface HealthAnomaly {
  id: string; // Unique ID for deduplication and dismissal
  recordId: string;
  metric: 'blood_pressure' | 'pulse' | 'glucose';
  severity: AnomalySeverity;
  title: string;
  currentReading: string;
  baselineReading: string;
  deltaText: string;
  percentageDeviation: number; // e.g. +22%
  deviationDirection: 'spike' | 'drop' | 'irregular';
  timestamp: string;
  formattedDate: string;
  reason: string;
  clinicalContext: string;
  recommendedNextStep: string;
  urgentNotice?: string;
  isSample?: boolean;
}

export interface MetricTrendBaseline {
  metric: 'blood_pressure' | 'pulse' | 'glucose';
  sampleSize: number;
  establishedBaseline: string;
  averageNumeric: number;
  minNumeric?: number;
  maxNumeric?: number;
  status: 'optimal' | 'elevated' | 'low' | 'insufficient_data';
}

export interface HealthAlertsProps {
  records: HealthRecord[];
  userId?: string;
  onOpenQuickLog?: () => void;
  onNavigate?: (pageId: any) => void;
  className?: string;
}

export const HealthAlerts: React.FC<HealthAlertsProps> = ({
  records,
  userId = 'default_user',
  onOpenQuickLog,
  onNavigate,
  className = '',
}) => {
  const dismissalStorageKey = `heal_whisper_health_alerts_dismissed_${userId}`;

  // Dismissed alert IDs state with localStorage persistence
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(dismissalStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });

  const [filter, setFilter] = useState<'all' | 'critical' | 'blood_pressure' | 'pulse' | 'glucose'>('all');
  const [showDismissed, setShowDismissed] = useState(false);
  const [showBaselineDrawer, setShowBaselineDrawer] = useState(false);

  // Helper to persist dismissal
  const handleDismiss = (alertId: string) => {
    const updated = [...dismissedIds, alertId];
    setDismissedIds(updated);
    try {
      localStorage.setItem(dismissalStorageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save dismissed alert:', e);
    }
  };

  // Helper to restore dismissed alert
  const handleRestore = (alertId: string) => {
    const updated = dismissedIds.filter((id) => id !== alertId);
    setDismissedIds(updated);
    try {
      localStorage.setItem(dismissalStorageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to restore alert:', e);
    }
  };

  const handleClearAllDismissed = () => {
    setDismissedIds([]);
    try {
      localStorage.removeItem(dismissalStorageKey);
    } catch (e) {
      console.warn('Failed to clear dismissed alerts:', e);
    }
  };

  // Date formatting helper
  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  // ========================================================
  // BASELINE TREND ANALYSIS & ANOMALY DETECTION ENGINE
  // ========================================================
  const { anomalies, baselines, totalEvaluatedRecords } = useMemo(() => {
    const detected: HealthAnomaly[] = [];

    // Filter by type and sort chronologically ascending
    const bpList = records
      .filter((r) => r.type === 'blood_pressure' && typeof r.systolic === 'number' && typeof r.diastolic === 'number')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const glucoseList = records
      .filter((r) => r.type === 'blood_sugar' && typeof r.bloodSugarValue === 'number')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const pulseList = records
      .filter((r) => r.type === 'pulse' && typeof r.pulseBpm === 'number')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // ----------------------------------------------------
    // 1. BLOOD PRESSURE TREND EVALUATION
    // ----------------------------------------------------
    let bpBaseline: MetricTrendBaseline = {
      metric: 'blood_pressure',
      sampleSize: bpList.length,
      establishedBaseline: 'Insufficient readings',
      averageNumeric: 0,
      status: 'insufficient_data',
    };

    if (bpList.length >= 2) {
      // Calculate established baseline from historical readings (excluding current if > 3, or all)
      const historicalBP = bpList.length >= 4 ? bpList.slice(0, bpList.length - 1) : bpList;
      const avgSys = Math.round(historicalBP.reduce((acc, r) => acc + (r.systolic || 0), 0) / historicalBP.length);
      const avgDia = Math.round(historicalBP.reduce((acc, r) => acc + (r.diastolic || 0), 0) / historicalBP.length);

      bpBaseline = {
        metric: 'blood_pressure',
        sampleSize: bpList.length,
        establishedBaseline: `${avgSys}/${avgDia} mmHg`,
        averageNumeric: avgSys,
        minNumeric: Math.min(...bpList.map((r) => r.systolic || 0)),
        maxNumeric: Math.max(...bpList.map((r) => r.systolic || 0)),
        status: avgSys < 120 && avgDia < 80 ? 'optimal' : avgSys >= 130 ? 'elevated' : 'low',
      };

      // Check recent readings (last 3) against the established baseline
      const recentBP = bpList.slice(-3);
      for (const rec of recentBP) {
        const sys = rec.systolic!;
        const dia = rec.diastolic!;
        const isSample = Boolean(rec.isSample);
        const dateStr = formatDate(rec.timestamp);

        // A. Hypertensive Crisis Anomaly
        if (sys >= 180 || dia >= 120) {
          detected.push({
            id: `alert_bp_crisis_${rec.id}`,
            recordId: rec.id,
            metric: 'blood_pressure',
            severity: 'critical',
            title: 'Critical Blood Pressure Anomaly (Crisis Threshold)',
            currentReading: `${sys}/${dia} mmHg`,
            baselineReading: `${avgSys}/${avgDia} mmHg`,
            deltaText: `+${sys - avgSys}/+${dia - avgDia} mmHg vs trend`,
            percentageDeviation: Math.round(((sys - avgSys) / avgSys) * 100),
            deviationDirection: 'spike',
            timestamp: rec.timestamp,
            formattedDate: dateStr,
            reason: `Current systolic of ${sys} mmHg or diastolic of ${dia} mmHg is severely elevated above your established trend of ${avgSys}/${avgDia} mmHg.`,
            clinicalContext: 'Systolic values exceeding 180 mmHg or diastolic exceeding 120 mmHg require immediate urgent assessment under ACC/AHA guidelines.',
            recommendedNextStep: 'Sit comfortably and rest for 5 minutes without talking. If still elevated, seek immediate medical care.',
            urgentNotice: 'Emergency Alert: If experiencing chest discomfort, shortness of breath, severe headache, or numbness, call emergency services (911 / 999) immediately.',
            isSample,
          });
        }
        // B. Significant Systolic Spike Anomaly (> 18 mmHg or > 15% above personal baseline)
        else if (sys - avgSys >= 18) {
          const delta = sys - avgSys;
          const pct = Math.round((delta / avgSys) * 100);
          detected.push({
            id: `alert_bp_spike_${rec.id}`,
            recordId: rec.id,
            metric: 'blood_pressure',
            severity: 'warning',
            title: 'Systolic Pressure Spike vs Established Trend',
            currentReading: `${sys}/${dia} mmHg`,
            baselineReading: `${avgSys}/${avgDia} mmHg`,
            deltaText: `+${delta} mmHg (+${pct}%) vs baseline`,
            percentageDeviation: pct,
            deviationDirection: 'spike',
            timestamp: rec.timestamp,
            formattedDate: dateStr,
            reason: `Reading is +${delta} mmHg higher than your typical established baseline of ${avgSys}/${avgDia} mmHg.`,
            clinicalContext: 'Acute systolic elevations can be triggered by acute physical stress, high sodium intake, poor sleep, or caffeine.',
            recommendedNextStep: 'Rest seated for 10 minutes with feet flat on the floor and re-check. Note any acute dietary or stress triggers.',
            isSample,
          });
        }
        // C. Hypotension / Significant Pressure Drop Anomaly
        else if (sys < 90 || dia < 60 || avgSys - sys >= 25) {
          const delta = avgSys - sys;
          const pct = Math.round((delta / avgSys) * 100);
          detected.push({
            id: `alert_bp_drop_${rec.id}`,
            recordId: rec.id,
            metric: 'blood_pressure',
            severity: 'caution',
            title: 'Low Blood Pressure Fluctuation',
            currentReading: `${sys}/${dia} mmHg`,
            baselineReading: `${avgSys}/${avgDia} mmHg`,
            deltaText: `-${delta} mmHg (-${pct}%) vs baseline`,
            percentageDeviation: -pct,
            deviationDirection: 'drop',
            timestamp: rec.timestamp,
            formattedDate: dateStr,
            reason: `Blood pressure dropped significantly below your personal trend baseline (${sys}/${dia} vs ${avgSys}/${avgDia} mmHg).`,
            clinicalContext: 'Low pressure readings can trigger postural dizziness, fatigue, or syncopal episodes.',
            recommendedNextStep: 'Hydrate with water and sit down gently. Avoid sudden standing transitions.',
            isSample,
          });
        }
      }
    }

    // ----------------------------------------------------
    // 2. GLUCOSE TREND EVALUATION
    // ----------------------------------------------------
    let glucoseBaseline: MetricTrendBaseline = {
      metric: 'glucose',
      sampleSize: glucoseList.length,
      establishedBaseline: 'Insufficient readings',
      averageNumeric: 0,
      status: 'insufficient_data',
    };

    if (glucoseList.length >= 2) {
      const historicalGlucose = glucoseList.length >= 4 ? glucoseList.slice(0, glucoseList.length - 1) : glucoseList;
      const avgGlucose = Math.round(
        historicalGlucose.reduce((acc, r) => acc + (r.bloodSugarValue || 0), 0) / historicalGlucose.length
      );
      const unit = glucoseList[0]?.bloodSugarUnit || 'mg/dL';

      glucoseBaseline = {
        metric: 'glucose',
        sampleSize: glucoseList.length,
        establishedBaseline: `${avgGlucose} ${unit}`,
        averageNumeric: avgGlucose,
        minNumeric: Math.min(...glucoseList.map((r) => r.bloodSugarValue || 0)),
        maxNumeric: Math.max(...glucoseList.map((r) => r.bloodSugarValue || 0)),
        status: avgGlucose < 100 ? 'optimal' : avgGlucose <= 125 ? 'elevated' : 'elevated',
      };

      const recentGlucose = glucoseList.slice(-3);
      for (const rec of recentGlucose) {
        const val = rec.bloodSugarValue!;
        const isSample = Boolean(rec.isSample);
        const dateStr = formatDate(rec.timestamp);

        // A. Severe or Mild Hypoglycemia Anomaly (< 70 mg/dL, especially < 54 mg/dL)
        if (val < 70) {
          const isSevere = val < 54;
          detected.push({
            id: `alert_glucose_hypo_${rec.id}`,
            recordId: rec.id,
            metric: 'glucose',
            severity: isSevere ? 'critical' : 'warning',
            title: isSevere ? 'Severe Hypoglycemia Anomaly' : 'Low Blood Sugar Anomaly (Hypoglycemia)',
            currentReading: `${val} ${unit}`,
            baselineReading: `${avgGlucose} ${unit}`,
            deltaText: `-${avgGlucose - val} ${unit} vs trend`,
            percentageDeviation: -Math.round(((avgGlucose - val) / avgGlucose) * 100),
            deviationDirection: 'drop',
            timestamp: rec.timestamp,
            formattedDate: dateStr,
            reason: `Current glucose (${val} ${unit}) is sharply below your established baseline of ${avgGlucose} ${unit} and clinical threshold of 70 mg/dL.`,
            clinicalContext: 'Hypoglycemia triggers adrenergic and neuroglycopenic symptoms (shakiness, sweating, lightheadedness).',
            recommendedNextStep: 'Apply the 15-15 rule: consume 15g fast carbohydrates (4 oz orange juice or 3 glucose tabs) and re-test in 15 minutes.',
            urgentNotice: isSevere
              ? 'Urgent Notice: Severe hypoglycemia (< 54 mg/dL) poses risk of fainting. Seek immediate assistance if symptoms worsen.'
              : undefined,
            isSample,
          });
        }
        // B. Critical Hyperglycemia Anomaly (>= 250 mg/dL)
        else if (val >= 250) {
          detected.push({
            id: `alert_glucose_crisis_${rec.id}`,
            recordId: rec.id,
            metric: 'glucose',
            severity: 'critical',
            title: 'Critical Hyperglycemia Anomaly',
            currentReading: `${val} ${unit}`,
            baselineReading: `${avgGlucose} ${unit}`,
            deltaText: `+${val - avgGlucose} ${unit} vs trend`,
            percentageDeviation: Math.round(((val - avgGlucose) / avgGlucose) * 100),
            deviationDirection: 'spike',
            timestamp: rec.timestamp,
            formattedDate: dateStr,
            reason: `Reading of ${val} ${unit} significantly exceeds your established baseline (${avgGlucose} ${unit}) and standard safety bounds.`,
            clinicalContext: 'Marked elevations above 250 mg/dL warrant ketone testing and hydration evaluation.',
            recommendedNextStep: 'Drink ample water to aid renal clearance. Avoid high-glycemic carbohydrates and check for ketones if advised.',
            urgentNotice: 'Emergency Alert: If accompanied by nausea, sweet breath odor, confusion, or hyperventilation, seek urgent medical assessment.',
            isSample,
          });
        }
        // C. Notable Glucose Spike vs Baseline (> +35 mg/dL above historical average)
        else if (val - avgGlucose >= 35) {
          const delta = val - avgGlucose;
          const pct = Math.round((delta / avgGlucose) * 100);
          detected.push({
            id: `alert_glucose_spike_${rec.id}`,
            recordId: rec.id,
            metric: 'glucose',
            severity: 'warning',
            title: 'Elevated Glucose Spike vs Baseline',
            currentReading: `${val} ${unit}`,
            baselineReading: `${avgGlucose} ${unit}`,
            deltaText: `+${delta} ${unit} (+${pct}%) vs baseline`,
            percentageDeviation: pct,
            deviationDirection: 'spike',
            timestamp: rec.timestamp,
            formattedDate: dateStr,
            reason: `Reading of ${val} ${unit} reflects an unusual surge compared to your typical trend of ${avgGlucose} ${unit}.`,
            clinicalContext: 'Post-prandial spikes often indicate high glycemic-load meals, insufficient insulin response, or missed medication.',
            recommendedNextStep: 'Take a relaxed 10-15 minute walk and drink water to assist glucose absorption.',
            isSample,
          });
        }
      }
    }

    // ----------------------------------------------------
    // 3. PULSE TREND EVALUATION
    // ----------------------------------------------------
    let pulseBaseline: MetricTrendBaseline = {
      metric: 'pulse',
      sampleSize: pulseList.length,
      establishedBaseline: 'Insufficient readings',
      averageNumeric: 0,
      status: 'insufficient_data',
    };

    if (pulseList.length >= 2) {
      const historicalPulse = pulseList.length >= 4 ? pulseList.slice(0, pulseList.length - 1) : pulseList;
      const avgPulse = Math.round(
        historicalPulse.reduce((acc, r) => acc + (r.pulseBpm || 0), 0) / historicalPulse.length
      );

      pulseBaseline = {
        metric: 'pulse',
        sampleSize: pulseList.length,
        establishedBaseline: `${avgPulse} BPM`,
        averageNumeric: avgPulse,
        minNumeric: Math.min(...pulseList.map((r) => r.pulseBpm || 0)),
        maxNumeric: Math.max(...pulseList.map((r) => r.pulseBpm || 0)),
        status: avgPulse >= 60 && avgPulse <= 100 ? 'optimal' : avgPulse > 100 ? 'elevated' : 'low',
      };

      const recentPulse = pulseList.slice(-3);
      for (const rec of recentPulse) {
        const bpm = rec.pulseBpm!;
        const isSample = Boolean(rec.isSample);
        const dateStr = formatDate(rec.timestamp);

        // A. Critical Tachycardia Anomaly (>= 130 BPM)
        if (bpm >= 130) {
          detected.push({
            id: `alert_pulse_crisis_${rec.id}`,
            recordId: rec.id,
            metric: 'pulse',
            severity: 'critical',
            title: 'Critical Tachycardia Anomaly',
            currentReading: `${bpm} BPM`,
            baselineReading: `${avgPulse} BPM`,
            deltaText: `+${bpm - avgPulse} BPM vs trend`,
            percentageDeviation: Math.round(((bpm - avgPulse) / avgPulse) * 100),
            deviationDirection: 'spike',
            timestamp: rec.timestamp,
            formattedDate: dateStr,
            reason: `Resting heart rate reached ${bpm} BPM, a severe jump above your established baseline of ${avgPulse} BPM.`,
            clinicalContext: 'Resting pulse ≥ 130 BPM warrants immediate attention if sustained.',
            recommendedNextStep: 'Sit upright, rest in a cool quiet space, and breathe slowly. Avoid any exertion.',
            urgentNotice: 'Emergency Alert: If accompanied by palpitations, chest pain, lightheadedness, or breathing difficulty, seek emergency care immediately.',
            isSample,
          });
        }
        // B. Elevated Pulse Anomaly (> 100 BPM or +20 BPM above personal baseline)
        else if (bpm > 100 || bpm - avgPulse >= 18) {
          const delta = bpm - avgPulse;
          const pct = Math.round((delta / avgPulse) * 100);
          detected.push({
            id: `alert_pulse_spike_${rec.id}`,
            recordId: rec.id,
            metric: 'pulse',
            severity: 'warning',
            title: 'Elevated Resting Pulse vs Trend',
            currentReading: `${bpm} BPM`,
            baselineReading: `${avgPulse} BPM`,
            deltaText: `+${delta} BPM (+${pct}%) vs baseline`,
            percentageDeviation: pct,
            deviationDirection: 'spike',
            timestamp: rec.timestamp,
            formattedDate: dateStr,
            reason: `Heart rate is +${delta} BPM above your resting average of ${avgPulse} BPM.`,
            clinicalContext: 'Elevated resting pulse often signals dehydration, emotional tension, fever, or excessive caffeine intake.',
            recommendedNextStep: 'Drink cool water, practice 4-7-8 diaphragmatic breathing, and re-check after 10 minutes of quiet rest.',
            isSample,
          });
        }
        // C. Bradycardia Anomaly (< 55 BPM)
        else if (bpm < 55) {
          detected.push({
            id: `alert_pulse_low_${rec.id}`,
            recordId: rec.id,
            metric: 'pulse',
            severity: 'caution',
            title: 'Low Heart Rate Reading (Bradycardia)',
            currentReading: `${bpm} BPM`,
            baselineReading: `${avgPulse} BPM`,
            deltaText: `-${avgPulse - bpm} BPM vs baseline`,
            percentageDeviation: -Math.round(((avgPulse - bpm) / avgPulse) * 100),
            deviationDirection: 'drop',
            timestamp: rec.timestamp,
            formattedDate: dateStr,
            reason: `Pulse of ${bpm} BPM is lower than your typical baseline of ${avgPulse} BPM.`,
            clinicalContext: 'Can be normal in athletes, but should be monitored if accompanied by fatigue or dizzy spells.',
            recommendedNextStep: 'Note if feeling fatigued or lightheaded; report to doctor if persistent.',
            isSample,
          });
        }
      }
    }

    // Deduplicate anomalies by ID
    const uniqueMap = new Map<string, HealthAnomaly>();
    for (const anom of detected) {
      if (!uniqueMap.has(anom.id)) {
        uniqueMap.set(anom.id, anom);
      }
    }

    // Sort descending by timestamp (newest first)
    const sortedAnomalies = Array.from(uniqueMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return {
      anomalies: sortedAnomalies,
      baselines: [bpBaseline, glucoseBaseline, pulseBaseline],
      totalEvaluatedRecords: bpList.length + glucoseList.length + pulseList.length,
    };
  }, [records]);

  // Separate active vs dismissed
  const dismissedSet = useMemo(() => new Set(dismissedIds), [dismissedIds]);
  const activeAnomalies = useMemo(
    () => anomalies.filter((a) => !dismissedSet.has(a.id)),
    [anomalies, dismissedSet]
  );
  const dismissedAnomalies = useMemo(
    () => anomalies.filter((a) => dismissedSet.has(a.id)),
    [anomalies, dismissedSet]
  );

  const criticalCount = activeAnomalies.filter((a) => a.severity === 'critical').length;
  const warningCount = activeAnomalies.filter((a) => a.severity === 'warning').length;

  // Filtered active list
  const displayAnomalies = useMemo(() => {
    if (filter === 'critical') return activeAnomalies.filter((a) => a.severity === 'critical');
    if (filter === 'blood_pressure') return activeAnomalies.filter((a) => a.metric === 'blood_pressure');
    if (filter === 'pulse') return activeAnomalies.filter((a) => a.metric === 'pulse');
    if (filter === 'glucose') return activeAnomalies.filter((a) => a.metric === 'glucose');
    return activeAnomalies;
  }, [activeAnomalies, filter]);

  return (
    <div className={`rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-7 space-y-6 shadow-xl ${className}`}>
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
              criticalCount > 0
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-400 animate-pulse'
                : activeAnomalies.length > 0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            {criticalCount > 0 ? (
              <ShieldAlert className="w-5 h-5" />
            ) : activeAnomalies.length > 0 ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Health Alerts & Trend Anomaly Monitor
              </h3>
              {criticalCount > 0 ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40">
                  {criticalCount} Critical Anomaly
                </span>
              ) : activeAnomalies.length > 0 ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                  {activeAnomalies.length} Anomaly Flagged
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Baseline Tracking Normal
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Continuously comparing saved blood pressure, pulse, and glucose logs against your established longitudinal trends.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <button
            onClick={() => setShowBaselineDrawer(!showBaselineDrawer)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white border border-teal-500/20 text-xs font-semibold transition-all cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-teal-400" />
            <span>{showBaselineDrawer ? 'Hide Trend Baselines' : 'View Trend Baselines'}</span>
          </button>

          {dismissedAnomalies.length > 0 && (
            <button
              onClick={() => setShowDismissed(!showDismissed)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
            >
              {showDismissed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showDismissed ? 'Hide Dismissed' : `Dismissed (${dismissedAnomalies.length})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Established Trend Baselines Drawer */}
      {showBaselineDrawer && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Your Established Health Trend Baselines</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Computed from {totalEvaluatedRecords} authorized logs
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {baselines.map((base) => {
              let Icon = Heart;
              let iconColor = 'text-rose-400';
              let title = 'Blood Pressure';
              if (base.metric === 'glucose') {
                Icon = Droplets;
                iconColor = 'text-cyan-400';
                title = 'Blood Glucose';
              } else if (base.metric === 'pulse') {
                Icon = Activity;
                iconColor = 'text-indigo-400';
                title = 'Resting Heart Rate';
              }

              return (
                <div
                  key={base.metric}
                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/90 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                      <span>{title}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {base.sampleSize} logs
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold font-mono text-white">
                      {base.establishedBaseline}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-400">
                    {base.sampleSize < 2
                      ? 'Log at least 2 readings to establish personal baseline.'
                      : 'Historical baseline reference used for anomaly comparison.'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Critical Emergency Banner if any critical anomaly exists */}
      {criticalCount > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-950/80 via-rose-900/40 to-slate-900 border border-rose-500/50 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 shrink-0 mt-0.5 animate-pulse">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-rose-200 flex items-center gap-2">
                <span>Immediate Clinical Action Notice</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/30 text-rose-200 uppercase tracking-wider">
                  Critical Vitals Anomaly
                </span>
              </h4>
              <p className="text-xs text-rose-200/90 leading-relaxed">
                A reading in your telemetry indicates a dangerous deviation from normal physiological parameters (e.g., Crisis BP &ge; 180/120, severe low glucose &lt; 54 mg/dL, or heart rate &ge; 130 BPM).
              </p>
            </div>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="text-slate-300 space-y-0.5">
              <span className="font-semibold text-rose-300">Urgent Symptoms Checklist: </span>
              <span className="text-slate-400">
                Chest pressure, sudden shortness of breath, blurred vision, arm weakness, or confusion.
              </span>
            </div>
            <a
              href="tel:911"
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call Emergency (911 / 999)</span>
            </a>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 cursor-pointer ${
            filter === 'all'
              ? 'bg-teal-500 text-slate-950 font-bold'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
          }`}
        >
          All Active ({activeAnomalies.length})
        </button>

        {criticalCount > 0 && (
          <button
            onClick={() => setFilter('critical')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-1 ${
              filter === 'critical'
                ? 'bg-rose-600 text-white font-bold'
                : 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border border-rose-500/30'
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Critical Only ({criticalCount})</span>
          </button>
        )}

        <button
          onClick={() => setFilter('blood_pressure')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-1 ${
            filter === 'blood_pressure'
              ? 'bg-teal-500 text-slate-950 font-bold'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Heart className="w-3 h-3 text-rose-400" />
          <span>Blood Pressure</span>
        </button>

        <button
          onClick={() => setFilter('glucose')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-1 ${
            filter === 'glucose'
              ? 'bg-teal-500 text-slate-950 font-bold'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Droplets className="w-3 h-3 text-cyan-400" />
          <span>Glucose</span>
        </button>

        <button
          onClick={() => setFilter('pulse')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-1 ${
            filter === 'pulse'
              ? 'bg-teal-500 text-slate-950 font-bold'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Activity className="w-3 h-3 text-indigo-400" />
          <span>Pulse</span>
        </button>
      </div>

      {/* Anomalies List or Empty State */}
      {displayAnomalies.length === 0 ? (
        <div className="py-10 px-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md">
            <h4 className="text-sm font-bold text-white">
              {totalEvaluatedRecords < 2
                ? 'Telemetry Data Building: More Readings Needed'
                : 'All Telemetry Stable: No Trend Anomalies'}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {totalEvaluatedRecords < 2
                ? 'To detect anomalous fluctuations, log at least 2 readings for blood pressure, glucose, or pulse. The system establishes personal baselines and monitors subsequent variations.'
                : 'Your current vitals align smoothly with your established historical averages. The system will alert you if an acute surge, drop, or out-of-range pattern occurs.'}
            </p>
          </div>

          {onOpenQuickLog && (
            <button
              onClick={onOpenQuickLog}
              className="mt-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Log Reading to Update Baseline</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayAnomalies.map((anom) => {
            const isCritical = anom.severity === 'critical';
            const isWarning = anom.severity === 'warning';

            let borderStyle = 'border-slate-800 hover:border-slate-700 bg-slate-950/70';
            let iconColor = 'text-blue-400';
            let iconBg = 'bg-blue-500/10 border-blue-500/20';

            if (isCritical) {
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
                key={anom.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${borderStyle}`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${iconBg} ${iconColor}`}>
                      {isCritical ? (
                        <ShieldAlert className="w-4 h-4" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Info className="w-4 h-4" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white tracking-tight">
                          {anom.title}
                        </h4>

                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                            isCritical
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : isWarning
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          }`}
                        >
                          {isCritical ? 'Critical Anomaly' : isWarning ? 'Notable Deviation' : 'Baseline Variance'}
                        </span>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-teal-300 font-semibold border border-slate-700">
                          {anom.deltaText}
                        </span>

                        {anom.isSample && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                            Sample / Demo Record
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Recorded: {anom.formattedDate}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-200">Current: {anom.currentReading}</span>
                        <span>•</span>
                        <span className="text-slate-400">Baseline: {anom.baselineReading}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dismiss / Acknowledge Action */}
                  <button
                    onClick={() => handleDismiss(anom.id)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer shrink-0"
                    title="Dismiss / Acknowledge anomaly alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Reason & Action Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-mono uppercase font-semibold text-slate-400">
                      Trend Comparison & Anomaly Reason
                    </span>
                    <p className="text-slate-200 leading-relaxed">{anom.reason}</p>
                    <p className="text-[11px] text-slate-400 pt-0.5">{anom.clinicalContext}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-mono uppercase font-semibold text-teal-400">
                      Recommended Next Step
                    </span>
                    <p className="text-slate-200 leading-relaxed">{anom.recommendedNextStep}</p>
                  </div>
                </div>

                {/* Urgent Care Notice */}
                {anom.urgentNotice && (
                  <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold text-rose-300">Urgent Safety Notice: </strong>
                      <span>{anom.urgentNotice}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dismissed Anomalies Panel */}
      {showDismissed && dismissedAnomalies.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/60 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              <span>Dismissed / Acknowledged Anomalies ({dismissedAnomalies.length})</span>
            </span>
            <button
              onClick={handleClearAllDismissed}
              className="text-xs text-teal-400 hover:underline cursor-pointer"
            >
              Restore All Alerts
            </button>
          </div>

          <div className="space-y-2">
            {dismissedAnomalies.map((dAnom) => (
              <div
                key={dAnom.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-300">{dAnom.title}</span>
                  <span className="text-slate-500 text-[11px] ml-2">
                    ({dAnom.currentReading} on {dAnom.formattedDate})
                  </span>
                </div>
                <button
                  onClick={() => handleRestore(dAnom.id)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-medium cursor-pointer"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Educational & Clinical Safety Disclaimer */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10.5px] text-slate-500 border-t border-slate-800/50 font-mono">
        <span>Temporal Anomaly Engine • ACC/AHA & ADA Clinical Standards</span>
        <span>Fluctuations flag potential variance only • Not a medical diagnosis</span>
      </div>
    </div>
  );
};
