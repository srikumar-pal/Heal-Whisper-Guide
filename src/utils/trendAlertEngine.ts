/**
 * Heal-Whisper-Guide Health Trend Alert Engine
 * 
 * Clinical guideline references:
 * - ACC/AHA 2017 Hypertension Practice Guidelines
 * - American Diabetes Association (ADA) 2024 Standards of Care
 * - American Heart Association (AHA) Resting Heart Rate Standards
 * 
 * Principles:
 * - Transparent, configurable rules
 * - Avoid diagnosing disease or presenting a single reading as definitive diagnosis
 * - Provide clear urgent-care safety guidance for critical values
 * - Prevent duplicate alerts and support dismissal with persistence
 * - Clearly label sample readings
 */

import { HealthRecord } from '../types';

export type AlertSeverity = 'urgent' | 'warning' | 'info';

export interface TrendAlertConfig {
  sensitivity: 'standard' | 'sensitive' | 'relaxed';
  // Blood Pressure
  bpSystolicJumpThreshold: number; // mmHg
  bpDiastolicJumpThreshold: number; // mmHg
  bpHighSystolic: number; // mmHg
  bpHighDiastolic: number; // mmHg
  bpLowSystolic: number; // mmHg
  bpLowDiastolic: number; // mmHg
  // Blood Sugar
  glucoseJumpThreshold: number; // mg/dL
  glucoseHighFasting: number; // mg/dL
  glucoseHighPostMeal: number; // mg/dL
  glucoseLowThreshold: number; // mg/dL
  // Pulse
  pulseHighThreshold: number; // BPM
  pulseLowThreshold: number; // BPM
  pulseJumpThreshold: number; // BPM
}

export const DEFAULT_TREND_CONFIG: TrendAlertConfig = {
  sensitivity: 'standard',
  bpSystolicJumpThreshold: 20,
  bpDiastolicJumpThreshold: 15,
  bpHighSystolic: 140,
  bpHighDiastolic: 90,
  bpLowSystolic: 90,
  bpLowDiastolic: 60,
  glucoseJumpThreshold: 40,
  glucoseHighFasting: 126,
  glucoseHighPostMeal: 180,
  glucoseLowThreshold: 70,
  pulseHighThreshold: 100,
  pulseLowThreshold: 55,
  pulseJumpThreshold: 20,
};

export const SENSITIVITY_PRESETS: Record<'standard' | 'sensitive' | 'relaxed', TrendAlertConfig> = {
  standard: { ...DEFAULT_TREND_CONFIG, sensitivity: 'standard' },
  sensitive: {
    sensitivity: 'sensitive',
    bpSystolicJumpThreshold: 15,
    bpDiastolicJumpThreshold: 10,
    bpHighSystolic: 130,
    bpHighDiastolic: 85,
    bpLowSystolic: 95,
    bpLowDiastolic: 65,
    glucoseJumpThreshold: 30,
    glucoseHighFasting: 110,
    glucoseHighPostMeal: 160,
    glucoseLowThreshold: 75,
    pulseHighThreshold: 95,
    pulseLowThreshold: 60,
    pulseJumpThreshold: 15,
  },
  relaxed: {
    sensitivity: 'relaxed',
    bpSystolicJumpThreshold: 25,
    bpDiastolicJumpThreshold: 20,
    bpHighSystolic: 150,
    bpHighDiastolic: 95,
    bpLowSystolic: 85,
    bpLowDiastolic: 55,
    glucoseJumpThreshold: 50,
    glucoseHighFasting: 140,
    glucoseHighPostMeal: 200,
    glucoseLowThreshold: 65,
    pulseHighThreshold: 110,
    pulseLowThreshold: 50,
    pulseJumpThreshold: 25,
  },
};

export interface HealthTrendAlert {
  id: string; // Deterministic: `${recordId}_${ruleType}`
  recordId: string;
  metricType: 'blood_pressure' | 'blood_sugar' | 'pulse';
  severity: AlertSeverity;
  title: string;
  measurement: string;
  timestamp: string;
  formattedDate: string;
  reason: string;
  triggerRule: string;
  nextStep: string;
  urgentCareGuidance?: string;
  deltaText?: string;
  isSample: boolean;
  dismissed?: boolean;
}

export interface MetricTrendStats {
  totalCount: number;
  hasEnoughData: boolean;
  latestValue?: string;
  averageValue?: string;
  direction?: 'increasing' | 'decreasing' | 'stable';
}

export interface TrendAnalysisResult {
  alerts: HealthTrendAlert[];
  urgentAlerts: HealthTrendAlert[];
  dismissedAlerts: HealthTrendAlert[];
  stats: {
    blood_pressure: MetricTrendStats;
    blood_sugar: MetricTrendStats;
    pulse: MetricTrendStats;
  };
}

/**
 * Evaluates health records chronologically and detects meaningful shifts or out-of-range patterns
 */
export function evaluateHealthTrends(
  records: HealthRecord[],
  config: TrendAlertConfig = DEFAULT_TREND_CONFIG,
  dismissedIds: string[] = []
): TrendAnalysisResult {
  const alerts: HealthTrendAlert[] = [];
  const dismissedSet = new Set(dismissedIds);

  // Group and sort chronologically ascending
  const bpRecords = records
    .filter((r) => r.type === 'blood_pressure' && typeof r.systolic === 'number' && typeof r.diastolic === 'number')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const sugarRecords = records
    .filter((r) => r.type === 'blood_sugar' && typeof r.bloodSugarValue === 'number')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const pulseRecords = records
    .filter((r) => r.type === 'pulse' && typeof r.pulseBpm === 'number')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Helper date formatter
  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  // ==========================================
  // 1. BLOOD PRESSURE TREND ANALYSIS
  // ==========================================
  for (let i = 0; i < bpRecords.length; i++) {
    const current = bpRecords[i];
    const prev = i > 0 ? bpRecords[i - 1] : null;
    const sys = current.systolic!;
    const dia = current.diastolic!;
    const isSample = Boolean(current.isSample);
    const dateStr = formatDate(current.timestamp);

    // Rule 1A: Hypertensive Crisis (Emergency)
    if (sys > 180 || dia > 120) {
      alerts.push({
        id: `${current.id}_bp_crisis`,
        recordId: current.id,
        metricType: 'blood_pressure',
        severity: 'urgent',
        title: 'Critical Blood Pressure Elevation',
        measurement: `${sys}/${dia} mmHg`,
        timestamp: current.timestamp,
        formattedDate: dateStr,
        reason: `Systolic (${sys} mmHg) or Diastolic (${dia} mmHg) entered the hypertensive crisis threshold (> 180 / 120 mmHg).`,
        triggerRule: 'Rule: Systolic > 180 mmHg or Diastolic > 120 mmHg',
        nextStep: 'Rest seated in a quiet room for 5 minutes. If no acute symptoms, re-test blood pressure. If still elevated, contact your healthcare provider immediately.',
        urgentCareGuidance: 'Emergency Alert: If accompanied by chest tightness, shortness of breath, sudden back/neck pain, numbness, speech difficulty, or severe headache, call 911 (or local emergency 999) or go to an Emergency Department immediately. Do not drive yourself.',
        isSample,
      });
    }

    // Rule 1B: Acute Systolic Jump
    if (prev && prev.systolic) {
      const deltaSys = sys - prev.systolic;
      if (deltaSys >= config.bpSystolicJumpThreshold && sys <= 180) {
        alerts.push({
          id: `${current.id}_bp_sys_jump`,
          recordId: current.id,
          metricType: 'blood_pressure',
          severity: 'warning',
          title: 'Notable Systolic Jump',
          measurement: `${sys}/${dia} mmHg`,
          timestamp: current.timestamp,
          formattedDate: dateStr,
          reason: `Systolic increased by +${deltaSys} mmHg compared to your previous log of ${prev.systolic}/${prev.diastolic} mmHg.`,
          triggerRule: `Rule: Systolic increase >= +${config.bpSystolicJumpThreshold} mmHg from previous reading`,
          deltaText: `+${deltaSys} mmHg jump`,
          nextStep: 'Check for acute temporary triggers such as caffeine intake, acute physical or emotional stress, or missed medication. Rest quietly for 10 minutes and repeat the measurement.',
          isSample,
        });
      }
    }

    // Rule 1C: Acute Diastolic Jump
    if (prev && prev.diastolic) {
      const deltaDia = dia - prev.diastolic;
      if (deltaDia >= config.bpDiastolicJumpThreshold && dia <= 120) {
        alerts.push({
          id: `${current.id}_bp_dia_jump`,
          recordId: current.id,
          metricType: 'blood_pressure',
          severity: 'warning',
          title: 'Notable Diastolic Jump',
          measurement: `${sys}/${dia} mmHg`,
          timestamp: current.timestamp,
          formattedDate: dateStr,
          reason: `Diastolic increased by +${deltaDia} mmHg compared to prior reading (${prev.diastolic} mmHg).`,
          triggerRule: `Rule: Diastolic increase >= +${config.bpDiastolicJumpThreshold} mmHg from previous reading`,
          deltaText: `+${deltaDia} mmHg jump`,
          nextStep: 'Verify proper cuff fit and ensure arm is supported at heart level. Re-measure while seated relaxed.',
          isSample,
        });
      }
    }

    // Rule 1D: Consecutive Stage 2 Readings (only check on latest reading if consecutive)
    if (i >= 1 && i === bpRecords.length - 1) {
      const isCurrentStage2 = sys >= config.bpHighSystolic || dia >= config.bpHighDiastolic;
      const isPrevStage2 = prev && ((prev.systolic || 0) >= config.bpHighSystolic || (prev.diastolic || 0) >= config.bpHighDiastolic);
      if (isCurrentStage2 && isPrevStage2 && sys <= 180 && dia <= 120) {
        alerts.push({
          id: `${current.id}_bp_consecutive_stage2`,
          recordId: current.id,
          metricType: 'blood_pressure',
          severity: 'warning',
          title: 'Sustained Elevated Blood Pressure Trend',
          measurement: `${sys}/${dia} mmHg`,
          timestamp: current.timestamp,
          formattedDate: dateStr,
          reason: `Your last 2 consecutive readings (${prev?.systolic}/${prev?.diastolic} and ${sys}/${dia} mmHg) are both within the Stage 2 elevated threshold (>= ${config.bpHighSystolic}/${config.bpHighDiastolic} mmHg).`,
          triggerRule: `Rule: Consecutive readings >= ${config.bpHighSystolic}/${config.bpHighDiastolic} mmHg`,
          nextStep: 'Bring this multi-day log to your healthcare clinician to evaluate whether your current treatment or lifestyle plan needs adjustment.',
          isSample,
        });
      }
    }

    // Rule 1E: Significant Low Blood Pressure (Hypotension)
    if (sys < config.bpLowSystolic || dia < config.bpLowDiastolic) {
      alerts.push({
        id: `${current.id}_bp_hypotension`,
        recordId: current.id,
        metricType: 'blood_pressure',
        severity: 'info',
        title: 'Low Blood Pressure Reading',
        measurement: `${sys}/${dia} mmHg`,
        timestamp: current.timestamp,
        formattedDate: dateStr,
        reason: `Blood pressure is below standard baseline (< ${config.bpLowSystolic}/${config.bpLowDiastolic} mmHg).`,
        triggerRule: `Rule: Systolic < ${config.bpLowSystolic} or Diastolic < ${config.bpLowDiastolic} mmHg`,
        nextStep: 'Ensure adequate water and electrolyte intake. Avoid standing up quickly to prevent postural dizziness. If you feel lightheaded, sit down immediately.',
        isSample,
      });
    }
  }

  // ==========================================
  // 2. BLOOD SUGAR TREND ANALYSIS
  // ==========================================
  for (let i = 0; i < sugarRecords.length; i++) {
    const current = sugarRecords[i];
    const prev = i > 0 ? sugarRecords[i - 1] : null;
    const val = current.bloodSugarValue!;
    const unit = current.bloodSugarUnit || 'mg/dL';
    const isSample = Boolean(current.isSample);
    const dateStr = formatDate(current.timestamp);
    const context = current.bloodSugarContext || 'check';

    // Rule 2A: Hypoglycemia (Immediate attention)
    if (val < config.glucoseLowThreshold) {
      const isSevere = val < 54;
      alerts.push({
        id: `${current.id}_glucose_hypo`,
        recordId: current.id,
        metricType: 'blood_sugar',
        severity: isSevere ? 'urgent' : 'warning',
        title: isSevere ? 'Critical Low Blood Sugar (Severe Hypoglycemia)' : 'Low Blood Sugar (Hypoglycemia)',
        measurement: `${val} ${unit}`,
        timestamp: current.timestamp,
        formattedDate: dateStr,
        reason: `Blood glucose (${val} ${unit}) dropped below the safe threshold of ${config.glucoseLowThreshold} mg/dL.`,
        triggerRule: `Rule: Blood glucose < ${config.glucoseLowThreshold} mg/dL`,
        nextStep: 'Follow the clinical 15-15 Rule: Consume 15 grams of fast-acting carbohydrates (e.g. 4 oz fruit juice, half-can non-diet soda, or 3-4 glucose tablets). Wait 15 minutes and re-test.',
        urgentCareGuidance: isSevere
          ? 'Emergency Notice: Severe hypoglycemia (< 54 mg/dL) can lead to disorientation or fainting. If symptoms are severe, cannot swallow safely, or levels do not recover after 15 minutes, seek immediate emergency medical care.'
          : undefined,
        isSample,
      });
    }

    // Rule 2B: Rapid Glucose Spike
    if (prev && prev.bloodSugarValue) {
      const delta = val - prev.bloodSugarValue;
      if (delta >= config.glucoseJumpThreshold && val >= 160) {
        alerts.push({
          id: `${current.id}_glucose_spike`,
          recordId: current.id,
          metricType: 'blood_sugar',
          severity: 'warning',
          title: 'Notable Blood Sugar Increase',
          measurement: `${val} ${unit}`,
          timestamp: current.timestamp,
          formattedDate: dateStr,
          reason: `Blood glucose rose by +${delta} ${unit} from your previous reading of ${prev.bloodSugarValue} ${unit}.`,
          triggerRule: `Rule: Glucose rise >= +${config.glucoseJumpThreshold} mg/dL from previous reading`,
          deltaText: `+${delta} ${unit} spike`,
          nextStep: 'Evaluate meal carbohydrate timing and portion. Drink a glass of water and take a gentle 10-15 minute walk if safe to help improve insulin sensitivity.',
          isSample,
        });
      }
    }

    // Rule 2C: Fasting High Glucose
    if (context === 'fasting' && val >= config.glucoseHighFasting) {
      alerts.push({
        id: `${current.id}_glucose_fasting_high`,
        recordId: current.id,
        metricType: 'blood_sugar',
        severity: 'warning',
        title: 'Elevated Fasting Glucose',
        measurement: `${val} ${unit}`,
        timestamp: current.timestamp,
        formattedDate: dateStr,
        reason: `Fasting blood sugar (${val} ${unit}) is above the target fasting threshold (>= ${config.glucoseHighFasting} mg/dL).`,
        triggerRule: `Rule: Fasting glucose >= ${config.glucoseHighFasting} mg/dL`,
        nextStep: 'Track fasting levels across 3-5 consecutive mornings and discuss HbA1c screening with your doctor. Do not adjust prescribed medications on your own.',
        isSample,
      });
    }

    // Rule 2D: Critical Hyperglycemia (> 250 mg/dL)
    if (val >= 250) {
      alerts.push({
        id: `${current.id}_glucose_critical_high`,
        recordId: current.id,
        metricType: 'blood_sugar',
        severity: 'urgent',
        title: 'Significantly Elevated Glucose Level',
        measurement: `${val} ${unit}`,
        timestamp: current.timestamp,
        formattedDate: dateStr,
        reason: `Blood glucose level (${val} ${unit}) exceeds 250 mg/dL.`,
        triggerRule: 'Rule: Blood glucose >= 250 mg/dL',
        nextStep: 'Check for ketones if recommended by your endocrinologist. Stay well-hydrated with non-caloric fluids.',
        urgentCareGuidance: 'Emergency Guidance: If accompanied by nausea, vomiting, sweet-smelling breath, extreme thirst, confusion, or rapid breathing, seek urgent medical assessment for potential diabetic ketoacidosis (DKA) or hyperosmolar state.',
        isSample,
      });
    }
  }

  // ==========================================
  // 3. PULSE / HEART RATE TREND ANALYSIS
  // ==========================================
  for (let i = 0; i < pulseRecords.length; i++) {
    const current = pulseRecords[i];
    const prev = i > 0 ? pulseRecords[i - 1] : null;
    const bpm = current.pulseBpm!;
    const isSample = Boolean(current.isSample);
    const dateStr = formatDate(current.timestamp);

    // Rule 3A: Severe Tachycardia (Emergency threshold)
    if (bpm >= 130) {
      alerts.push({
        id: `${current.id}_pulse_critical_high`,
        recordId: current.id,
        metricType: 'pulse',
        severity: 'urgent',
        title: 'Significantly Elevated Resting Heart Rate',
        measurement: `${bpm} BPM`,
        timestamp: current.timestamp,
        formattedDate: dateStr,
        reason: `Resting pulse reached ${bpm} BPM, well above normal resting thresholds.`,
        triggerRule: 'Rule: Resting pulse >= 130 BPM',
        nextStep: 'Sit down, rest calmly, and avoid any physical exertion. Drink cool water and practice slow diaphragmatic breathing.',
        urgentCareGuidance: 'Urgent Care Notice: If accompanied by chest discomfort, fluttering, shortness of breath, or feeling faint, seek emergency medical care immediately.',
        isSample,
      });
    } else if (bpm > config.pulseHighThreshold) {
      // Rule 3B: Moderate Tachycardia / Elevated Pulse
      alerts.push({
        id: `${current.id}_pulse_elevated`,
        recordId: current.id,
        metricType: 'pulse',
        severity: 'warning',
        title: 'Elevated Resting Pulse',
        measurement: `${bpm} BPM`,
        timestamp: current.timestamp,
        formattedDate: dateStr,
        reason: `Pulse rate (${bpm} BPM) is above the standard resting target (<= ${config.pulseHighThreshold} BPM).`,
        triggerRule: `Rule: Resting pulse > ${config.pulseHighThreshold} BPM`,
        nextStep: 'Consider recent caffeine, nicotine, fever, dehydration, or acute stress. Re-check your pulse after 10 minutes of quiet rest.',
        isSample,
      });
    }

    // Rule 3C: Pulse Surge
    if (prev && prev.pulseBpm) {
      const delta = bpm - prev.pulseBpm;
      if (delta >= config.pulseJumpThreshold && bpm <= 130) {
        alerts.push({
          id: `${current.id}_pulse_jump`,
          recordId: current.id,
          metricType: 'pulse',
          severity: 'info',
          title: 'Noteworthy Pulse Increase',
          measurement: `${bpm} BPM`,
          timestamp: current.timestamp,
          formattedDate: dateStr,
          reason: `Pulse increased by +${delta} BPM from your previous reading of ${prev.pulseBpm} BPM.`,
          triggerRule: `Rule: Pulse increase >= +${config.pulseJumpThreshold} BPM from previous reading`,
          deltaText: `+${delta} BPM jump`,
          nextStep: 'Review recent physical activity, hydration status, or temperature. Note whether rhythm was regular or irregular.',
          isSample,
        });
      }
    }

    // Rule 3D: Bradycardia
    if (bpm < config.pulseLowThreshold) {
      alerts.push({
        id: `${current.id}_pulse_low`,
        recordId: current.id,
        metricType: 'pulse',
        severity: 'info',
        title: 'Low Resting Heart Rate (Bradycardia)',
        measurement: `${bpm} BPM`,
        timestamp: current.timestamp,
        formattedDate: dateStr,
        reason: `Resting pulse (${bpm} BPM) is below the typical standard baseline of ${config.pulseLowThreshold} BPM.`,
        triggerRule: `Rule: Resting pulse < ${config.pulseLowThreshold} BPM`,
        nextStep: 'Common in fit athletes; if accompanied by unusual dizziness, weakness, or lightheadedness, consult your doctor.',
        isSample,
      });
    }
  }

  // Deduplicate alerts by ID
  const uniqueAlertsMap = new Map<string, HealthTrendAlert>();
  for (const alert of alerts) {
    if (!uniqueAlertsMap.has(alert.id)) {
      uniqueAlertsMap.set(alert.id, alert);
    }
  }

  // Sort alerts descending by date (newest first)
  const allAlerts = Array.from(uniqueAlertsMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Mark dismissed status
  const activeAlerts: HealthTrendAlert[] = [];
  const dismissedAlerts: HealthTrendAlert[] = [];

  for (const item of allAlerts) {
    if (dismissedSet.has(item.id)) {
      dismissedAlerts.push({ ...item, dismissed: true });
    } else {
      activeAlerts.push(item);
    }
  }

  const urgentAlerts = activeAlerts.filter((a) => a.severity === 'urgent');

  // Compute longitudinal data availability stats
  const calculateStats = (recs: any[], formatVal: (r: any) => string): MetricTrendStats => {
    const totalCount = recs.length;
    const hasEnoughData = totalCount >= 2;
    if (totalCount === 0) {
      return { totalCount: 0, hasEnoughData: false };
    }
    const latest = recs[recs.length - 1];
    return {
      totalCount,
      hasEnoughData,
      latestValue: formatVal(latest),
    };
  };

  const stats = {
    blood_pressure: calculateStats(bpRecords, (r) => `${r.systolic}/${r.diastolic} mmHg`),
    blood_sugar: calculateStats(sugarRecords, (r) => `${r.bloodSugarValue} ${r.bloodSugarUnit || 'mg/dL'}`),
    pulse: calculateStats(pulseRecords, (r) => `${r.pulseBpm} BPM`),
  };

  return {
    alerts: activeAlerts,
    urgentAlerts,
    dismissedAlerts,
    stats,
  };
}
