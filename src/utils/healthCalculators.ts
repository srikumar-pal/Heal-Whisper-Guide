/**
 * Clinical reference classifications based on standard guidelines:
 * - Blood Pressure: 2017 ACC/AHA High Blood Pressure Clinical Practice Guideline
 * - Blood Sugar: American Diabetes Association (ADA) Standards of Medical Care
 * - Pulse: American Heart Association (AHA) Resting Heart Rate reference ranges
 */

import { BloodPressureCategory, BloodSugarCategory, PulseCategory } from '../types';

export function classifyBloodPressure(systolic: number, diastolic: number): {
  category: BloodPressureCategory;
  label: string;
  badgeClass: string;
  colorClass: string;
  advice: string;
} {
  if (systolic < 90 || diastolic < 60) {
    return {
      category: 'HYPOTENSION',
      label: 'Low Blood Pressure (Hypotension)',
      badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      colorClass: 'text-blue-400',
      advice: 'Below standard range. Ensure adequate hydration and rest. Consult doctor if dizzy.',
    };
  }

  if (systolic > 180 || diastolic > 120) {
    return {
      category: 'HYPERTENSIVE_CRISIS',
      label: 'Hypertensive Crisis',
      badgeClass: 'bg-rose-600/30 text-rose-300 border-rose-500/50 animate-pulse',
      colorClass: 'text-rose-400',
      advice: 'Critical elevation. If accompanied by chest pain, headache, or visual changes, seek emergency care immediately.',
    };
  }

  if (systolic >= 140 || diastolic >= 90) {
    return {
      category: 'STAGE_2_HYPERTENSION',
      label: 'Stage 2 Hypertension',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      colorClass: 'text-rose-400',
      advice: 'Significant elevation. Consistent readings at this level require medical evaluation and lifestyle adjustments.',
    };
  }

  if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) {
    return {
      category: 'STAGE_1_HYPERTENSION',
      label: 'Stage 1 Hypertension',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      colorClass: 'text-amber-400',
      advice: 'Mild elevation. Focus on dietary sodium reduction, regular physical activity, and stress control.',
    };
  }

  if (systolic >= 120 && systolic <= 129 && diastolic < 80) {
    return {
      category: 'ELEVATED',
      label: 'Elevated Blood Pressure',
      badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      colorClass: 'text-yellow-400',
      advice: 'Slightly above normal. Healthy lifestyle adjustments help prevent progression to hypertension.',
    };
  }

  return {
    category: 'NORMAL',
    label: 'Normal Blood Pressure',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    colorClass: 'text-emerald-400',
    advice: 'Optimal cardiovascular range. Maintain a balanced diet and regular exercise routine.',
  };
}

export function classifyBloodSugar(
  value: number,
  unit: 'mg/dL' | 'mmol/L' = 'mg/dL',
  context: 'fasting' | 'post_meal' | 'random' | 'bedtime' | 'pre_meal' = 'fasting'
): {
  category: BloodSugarCategory;
  label: string;
  badgeClass: string;
  colorClass: string;
  advice: string;
} {
  // Convert to mg/dL for standardized threshold checks
  const valMgDl = unit === 'mmol/L' ? value * 18.0182 : value;

  if (valMgDl < 70) {
    return {
      category: 'LOW',
      label: 'Hypoglycemia (Low)',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      colorClass: 'text-rose-400',
      advice: 'Low glucose level. Follow the 15-15 rule (15g fast-acting carbs, recheck in 15 mins) if experiencing shakiness or sweating.',
    };
  }

  if (context === 'fasting' || context === 'pre_meal') {
    if (valMgDl <= 99) {
      return {
        category: 'NORMAL',
        label: 'Normal Fasting',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        colorClass: 'text-emerald-400',
        advice: 'Normal healthy fasting blood sugar (70 - 99 mg/dL).',
      };
    }
    if (valMgDl <= 125) {
      return {
        category: 'PREDIABETES',
        label: 'Impaired Fasting (Prediabetes range)',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        colorClass: 'text-amber-400',
        advice: 'Elevated fasting level (100 - 125 mg/dL). Discuss diet, exercise, and HbA1c testing with your healthcare provider.',
      };
    }
    return {
      category: 'ELEVATED',
      label: 'Elevated Fasting Glucose',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      colorClass: 'text-rose-400',
      advice: 'Above 125 mg/dL fasting. Persistent values at this level indicate hyperglycemia; consult a physician.',
    };
  }

  // Post-meal or random
  if (valMgDl <= 140) {
    return {
      category: 'NORMAL',
      label: 'Normal Post-Meal',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      colorClass: 'text-emerald-400',
      advice: 'Target post-prandial range (below 140 mg/dL 2 hours after meal).',
    };
  }
  if (valMgDl <= 199) {
    return {
      category: 'ELEVATED',
      label: 'Elevated Post-Meal',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      colorClass: 'text-amber-400',
      advice: 'Post-meal glucose is higher than optimal (140 - 199 mg/dL). Review carbohydrate intake and activity.',
    };
  }
  return {
    category: 'CRITICAL_HIGH',
    label: 'High Post-Meal Glucose',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    colorClass: 'text-rose-400',
    advice: 'Glucose >= 200 mg/dL. Monitor for excessive thirst, frequent urination, and consult your medical provider.',
  };
}

export function classifyPulse(bpm: number): {
  category: PulseCategory;
  label: string;
  badgeClass: string;
  colorClass: string;
  advice: string;
} {
  if (bpm < 60) {
    return {
      category: 'BRADYCARDIA',
      label: 'Bradycardia (Low Pulse)',
      badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      colorClass: 'text-blue-400',
      advice: 'Below 60 BPM. May be normal in well-conditioned athletes, but consult a doctor if accompanied by fatigue or lightheadedness.',
    };
  }
  if (bpm <= 100) {
    return {
      category: 'NORMAL',
      label: 'Normal Resting Heart Rate',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      colorClass: 'text-emerald-400',
      advice: 'Ideal resting pulse range (60 - 100 BPM).',
    };
  }
  return {
    category: 'TACHYCARDIA',
    label: 'Tachycardia (Elevated Pulse)',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    colorClass: 'text-amber-400',
    advice: 'Above 100 BPM at rest. Check for caffeine, fever, dehydration, or emotional stress. Consult doctor if persistent.',
  };
}

export function calculateBMI(weightKg: number, heightCm: number): {
  bmi: number;
  category: string;
  badgeClass: string;
} {
  if (!weightKg || !heightCm || heightCm <= 0) {
    return { bmi: 0, category: 'N/A', badgeClass: 'bg-slate-700 text-slate-300' };
  }
  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));

  if (bmi < 18.5) {
    return { bmi, category: 'Underweight', badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
  }
  if (bmi <= 24.9) {
    return { bmi, category: 'Normal Weight', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
  }
  if (bmi <= 29.9) {
    return { bmi, category: 'Overweight', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
  }
  return { bmi, category: 'Obesity', badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
}
