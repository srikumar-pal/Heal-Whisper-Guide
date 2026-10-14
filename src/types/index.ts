/**
 * Heal-Whisper-Guide Core Data Models & Type Definitions
 */

export type UserRole = 'patient' | 'caregiver' | 'clinician';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown';
  heightCm?: number;
  weightKg?: number;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  preferredLanguage: 'en' | 'bn' | 'es';
  theme: 'dark' | 'light' | 'system';
  notificationsEnabled: boolean;
  glucoseUnit: 'mg/dL' | 'mmol/L';
  weightUnit: 'kg' | 'lbs';
  createdAt: string;
  updatedAt: string;
}

export type HealthRecordType = 'blood_pressure' | 'blood_sugar' | 'pulse';

export type BloodPressureCategory =
  | 'NORMAL'
  | 'ELEVATED'
  | 'STAGE_1_HYPERTENSION'
  | 'STAGE_2_HYPERTENSION'
  | 'HYPERTENSIVE_CRISIS'
  | 'HYPOTENSION';

export type BloodSugarCategory =
  | 'LOW'
  | 'NORMAL'
  | 'PREDIABETES'
  | 'ELEVATED'
  | 'CRITICAL_HIGH';

export type PulseCategory =
  | 'BRADYCARDIA'
  | 'NORMAL'
  | 'TACHYCARDIA';

export interface HealthRecord {
  id: string;
  userId: string;
  type: HealthRecordType;
  timestamp: string; // ISO string
  notes?: string;
  tags?: string[];
  isSample?: boolean;

  // Blood Pressure specific
  systolic?: number; // mmHg
  diastolic?: number; // mmHg
  bpCategory?: BloodPressureCategory;
  arm?: 'left' | 'right';
  position?: 'sitting' | 'standing' | 'lying';

  // Blood Sugar specific
  bloodSugarValue?: number; // mg/dL or mmol/L
  bloodSugarUnit?: 'mg/dL' | 'mmol/L';
  bloodSugarContext?: 'fasting' | 'post_meal' | 'random' | 'bedtime' | 'pre_meal';
  sugarCategory?: BloodSugarCategory;

  // Pulse specific
  pulseBpm?: number;
  pulseRhythm?: 'regular' | 'irregular';
  pulseContext?: 'resting' | 'active' | 'post_exercise' | 'stressed';
  pulseCategory?: PulseCategory;

  createdAt: string;
  updatedAt: string;
}

export interface Medication {
  id: string;
  userId: string;
  name: string;
  dosage: string; // e.g. "10mg", "1 tablet"
  form: 'tablet' | 'capsule' | 'liquid' | 'injection' | 'inhaler' | 'drops' | 'other';
  frequency: 'daily' | 'twice_daily' | 'thrice_daily' | 'every_8_hours' | 'weekly' | 'as_needed' | 'custom';
  scheduledTimes: string[]; // e.g. ["08:00", "20:00"]
  instructions?: string; // "Take with food", "Before breakfast", etc.
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  totalPills?: number;
  remainingPills?: number;
  refillReminderThreshold?: number;
  colorHex?: string;
  active: boolean;
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DoseStatus = 'taken' | 'skipped' | 'missed' | 'snoozed';

export interface DoseLog {
  id: string;
  userId: string;
  medicationId: string;
  medicationName: string;
  scheduledTime: string; // ISO string or "YYYY-MM-DD HH:mm"
  actionTime?: string; // ISO string when taken
  status: DoseStatus;
  notes?: string;
  createdAt: string;
}

export interface ReportFinding {
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  status: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL' | 'INCONCLUSIVE';
  clinicalSignificance?: string;
}

export interface MedicalReportAnalysis {
  id: string;
  userId?: string;
  fileName: string;
  documentType: string;
  patientName?: string;
  testDate?: string;
  plainLanguageSummary: string;
  keyFindings: ReportFinding[];
  questionsForDoctor: string[];
  missingOrUnclearInfo?: string;
  lifestyleRecommendations: string[];
  analyzedAt: string;
  modelUsed: string;
  disclaimer: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  language?: 'en' | 'bn' | 'es';
  isAudio?: boolean;
  audioUrl?: string;
  isEmergencyAlert?: boolean;
}

export interface ServerStatusResponse {
  status: 'ok';
  geminiConfigured: boolean;
  geminiModel: string;
  timestamp: string;
  appVersion: string;
}
