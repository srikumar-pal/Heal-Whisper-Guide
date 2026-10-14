import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  UserProfile,
  HealthRecord,
  Medication,
  DoseLog,
  MedicalReportAnalysis,
  ChatMessage,
} from '../src/types';
import {
  classifyBloodPressure,
  classifyBloodSugar,
  classifyPulse,
} from '../src/utils/healthCalculators';

export interface StoredUser extends UserProfile {
  passwordHash: string;
  salt: string;
  tokens: string[];
}

export interface DatabaseSchema {
  users: StoredUser[];
  healthRecords: HealthRecord[];
  medications: Medication[];
  doseLogs: DoseLog[];
  reportAnalyses: MedicalReportAnalysis[];
  chatHistory: { userId: string; messages: ChatMessage[] }[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'app_data.json');

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export class JsonDatabase {
  private data: DatabaseSchema;
  private isWriting = false;

  constructor() {
    this.data = this.loadData();
    this.ensureSeedData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Failed to load database from disk, creating fresh store:', err);
    }
    return {
      users: [],
      healthRecords: [],
      medications: [],
      doseLogs: [],
      reportAnalyses: [],
      chatHistory: [],
    };
  }

  private persist() {
    if (this.isWriting) return;
    this.isWriting = true;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Error persisting database:', err);
    } finally {
      this.isWriting = false;
    }
  }

  private ensureSeedData() {
    const demoEmail = 'demo@healwhisper.com';
    let demoUser = this.data.users.find((u) => u.email === demoEmail);

    if (!demoUser) {
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword('demo123', salt);
      const demoId = 'usr_demo_1001';

      demoUser = {
        id: demoId,
        email: demoEmail,
        name: 'Dr. Sarah Connor',
        dateOfBirth: '1984-07-15',
        gender: 'female',
        bloodType: 'A+',
        heightCm: 168,
        weightKg: 64,
        emergencyContact: {
          name: 'John Connor',
          relationship: 'Family',
          phone: '+1 (555) 019-2831',
        },
        preferredLanguage: 'en',
        theme: 'dark',
        notificationsEnabled: true,
        glucoseUnit: 'mg/dL',
        weightUnit: 'kg',
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
        passwordHash,
        salt,
        tokens: ['demo_token_valid'],
      };

      this.data.users.push(demoUser);

      // Seed 14 days of realistic MedPin health records
      const seededRecords: HealthRecord[] = [];
      const now = Date.now();

      for (let i = 13; i >= 0; i--) {
        const dayTime = new Date(now - i * 86400000);
        const morningTime = new Date(dayTime.setHours(8, 15, 0, 0)).toISOString();
        const eveningTime = new Date(dayTime.setHours(19, 30, 0, 0)).toISOString();

        // BP morning
        const sys = 118 + Math.floor(Math.sin(i * 0.7) * 9);
        const dia = 76 + Math.floor(Math.cos(i * 0.5) * 6);
        seededRecords.push({
          id: `rec_bp_${i}_am`,
          userId: demoId,
          type: 'blood_pressure',
          timestamp: morningTime,
          systolic: sys,
          diastolic: dia,
          bpCategory: classifyBloodPressure(sys, dia).category,
          arm: 'left',
          position: 'sitting',
          notes: i % 3 === 0 ? 'Measured after morning hydration' : undefined,
          isSample: true,
          createdAt: morningTime,
          updatedAt: morningTime,
        });

        // Blood Sugar fasting morning
        const sugar = 92 + Math.floor(Math.cos(i * 0.9) * 8);
        seededRecords.push({
          id: `rec_bs_${i}_am`,
          userId: demoId,
          type: 'blood_sugar',
          timestamp: morningTime,
          bloodSugarValue: sugar,
          bloodSugarUnit: 'mg/dL',
          bloodSugarContext: 'fasting',
          sugarCategory: classifyBloodSugar(sugar, 'mg/dL', 'fasting').category,
          isSample: true,
          createdAt: morningTime,
          updatedAt: morningTime,
        });

        // Pulse evening
        const bpm = 68 + Math.floor(Math.sin(i * 1.1) * 7);
        seededRecords.push({
          id: `rec_pl_${i}_pm`,
          userId: demoId,
          type: 'pulse',
          timestamp: eveningTime,
          pulseBpm: bpm,
          pulseRhythm: 'regular',
          pulseContext: 'resting',
          pulseCategory: classifyPulse(bpm).category,
          notes: 'Resting on couch post-dinner',
          isSample: true,
          createdAt: eveningTime,
          updatedAt: eveningTime,
        });
      }

      this.data.healthRecords.push(...seededRecords);

      // Seed 3 active medications
      const med1: Medication = {
        id: 'med_101',
        userId: demoId,
        name: 'Lisinopril',
        dosage: '10mg',
        form: 'tablet',
        frequency: 'daily',
        scheduledTimes: ['08:00'],
        instructions: 'Take in the morning with a full glass of water',
        startDate: new Date(now - 45 * 86400000).toISOString().slice(0, 10),
        totalPills: 90,
        remainingPills: 48,
        refillReminderThreshold: 10,
        colorHex: '#0d9488',
        active: true,
        isSample: true,
        createdAt: new Date(now - 45 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const med2: Medication = {
        id: 'med_102',
        userId: demoId,
        name: 'Metformin HCl',
        dosage: '500mg',
        form: 'tablet',
        frequency: 'twice_daily',
        scheduledTimes: ['08:30', '19:30'],
        instructions: 'Take with meals to minimize gastrointestinal discomfort',
        startDate: new Date(now - 30 * 86400000).toISOString().slice(0, 10),
        totalPills: 60,
        remainingPills: 22,
        refillReminderThreshold: 7,
        colorHex: '#0284c7',
        active: true,
        isSample: true,
        createdAt: new Date(now - 30 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const med3: Medication = {
        id: 'med_103',
        userId: demoId,
        name: 'Omega-3 CoQ10 Complex',
        dosage: '1000mg',
        form: 'capsule',
        frequency: 'daily',
        scheduledTimes: ['13:00'],
        instructions: 'Take with lunch',
        startDate: new Date(now - 60 * 86400000).toISOString().slice(0, 10),
        totalPills: 60,
        remainingPills: 35,
        refillReminderThreshold: 10,
        colorHex: '#8b5cf6',
        active: true,
        isSample: true,
        createdAt: new Date(now - 60 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.data.medications.push(med1, med2, med3);

      // Seed 7 days of dose logs (95% adherence)
      const seededDoses: DoseLog[] = [];
      for (let day = 6; day >= 0; day--) {
        const d = new Date(now - day * 86400000);
        const dateStr = d.toISOString().slice(0, 10);

        // Med 1 morning
        seededDoses.push({
          id: `dose_${med1.id}_${day}`,
          userId: demoId,
          medicationId: med1.id,
          medicationName: med1.name,
          scheduledTime: `${dateStr} 08:00`,
          actionTime: `${dateStr} 08:12:00.000Z`,
          status: 'taken',
          createdAt: new Date().toISOString(),
        });

        // Med 2 morning
        seededDoses.push({
          id: `dose_${med2.id}_${day}_am`,
          userId: demoId,
          medicationId: med2.id,
          medicationName: med2.name,
          scheduledTime: `${dateStr} 08:30`,
          actionTime: `${dateStr} 08:35:00.000Z`,
          status: 'taken',
          createdAt: new Date().toISOString(),
        });

        // Med 2 evening
        const isSkipped = day === 2; // deliberate 1 missed dose
        seededDoses.push({
          id: `dose_${med2.id}_${day}_pm`,
          userId: demoId,
          medicationId: med2.id,
          medicationName: med2.name,
          scheduledTime: `${dateStr} 19:30`,
          actionTime: isSkipped ? undefined : `${dateStr} 19:45:00.000Z`,
          status: isSkipped ? 'skipped' : 'taken',
          notes: isSkipped ? 'Dinner out with colleagues, forgot dose' : undefined,
          createdAt: new Date().toISOString(),
        });

        // Med 3 lunch
        seededDoses.push({
          id: `dose_${med3.id}_${day}`,
          userId: demoId,
          medicationId: med3.id,
          medicationName: med3.name,
          scheduledTime: `${dateStr} 13:00`,
          actionTime: `${dateStr} 13:10:00.000Z`,
          status: 'taken',
          createdAt: new Date().toISOString(),
        });
      }

      this.data.doseLogs.push(...seededDoses);
      this.persist();
    }
  }

  // --- Auth Methods ---
  public findUserByEmail(email: string): StoredUser | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): StoredUser | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public findUserByToken(token: string): StoredUser | undefined {
    if (!token) return undefined;
    return this.data.users.find((u) => u.tokens.includes(token));
  }

  public createUser(email: string, password: string, name: string): { user: UserProfile; token: string } {
    const existing = this.findUserByEmail(email);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const token = `tok_${crypto.randomBytes(24).toString('hex')}`;
    const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;

    const newUser: StoredUser = {
      id: userId,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      preferredLanguage: 'en',
      theme: 'dark',
      notificationsEnabled: true,
      glucoseUnit: 'mg/dL',
      weightUnit: 'kg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      passwordHash,
      salt,
      tokens: [token],
    };

    this.data.users.push(newUser);
    this.persist();

    return { user: this.sanitizeUser(newUser), token };
  }

  public authenticate(email: string, password: string): { user: UserProfile; token: string } {
    const user = this.findUserByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const computed = hashPassword(password, user.salt);
    if (computed !== user.passwordHash) {
      throw new Error('Invalid email or password.');
    }

    const token = `tok_${crypto.randomBytes(24).toString('hex')}`;
    user.tokens.push(token);
    // keep max 5 tokens per user
    if (user.tokens.length > 5) user.tokens.shift();
    this.persist();

    return { user: this.sanitizeUser(user), token };
  }

  public getDemoSession(): { user: UserProfile; token: string } {
    const demoUser = this.findUserByEmail('demo@healwhisper.com');
    if (!demoUser) {
      throw new Error('Demo account is not available');
    }
    const token = `demo_tok_${Date.now()}`;
    demoUser.tokens.push(token);
    if (demoUser.tokens.length > 5) demoUser.tokens.shift();
    this.persist();
    return { user: this.sanitizeUser(demoUser), token };
  }

  public logout(token: string) {
    for (const u of this.data.users) {
      u.tokens = u.tokens.filter((t) => t !== token);
    }
    this.persist();
  }

  public updateUserProfile(userId: string, updates: Partial<UserProfile>): UserProfile {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');

    if (updates.name !== undefined) user.name = updates.name;
    if (updates.dateOfBirth !== undefined) user.dateOfBirth = updates.dateOfBirth;
    if (updates.gender !== undefined) user.gender = updates.gender;
    if (updates.bloodType !== undefined) user.bloodType = updates.bloodType;
    if (updates.heightCm !== undefined) user.heightCm = updates.heightCm;
    if (updates.weightKg !== undefined) user.weightKg = updates.weightKg;
    if (updates.emergencyContact !== undefined) user.emergencyContact = updates.emergencyContact;
    if (updates.preferredLanguage !== undefined) user.preferredLanguage = updates.preferredLanguage;
    if (updates.theme !== undefined) user.theme = updates.theme;
    if (updates.notificationsEnabled !== undefined) user.notificationsEnabled = updates.notificationsEnabled;
    if (updates.glucoseUnit !== undefined) user.glucoseUnit = updates.glucoseUnit;
    if (updates.weightUnit !== undefined) user.weightUnit = updates.weightUnit;

    user.updatedAt = new Date().toISOString();
    this.persist();
    return this.sanitizeUser(user);
  }

  public sanitizeUser(user: StoredUser): UserProfile {
    const { passwordHash, salt, tokens, ...safeUser } = user;
    return safeUser;
  }

  // --- Health Records CRUD ---
  public getHealthRecords(userId: string, type?: string, startDate?: string, endDate?: string): HealthRecord[] {
    let records = this.data.healthRecords.filter((r) => r.userId === userId);

    if (type && type !== 'all') {
      records = records.filter((r) => r.type === type);
    }
    if (startDate) {
      records = records.filter((r) => r.timestamp >= startDate);
    }
    if (endDate) {
      records = records.filter((r) => r.timestamp <= endDate);
    }

    return records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public addHealthRecord(userId: string, data: Partial<HealthRecord>): HealthRecord {
    if (!data.type || !['blood_pressure', 'blood_sugar', 'pulse'].includes(data.type)) {
      throw new Error('Valid measurement type (blood_pressure, blood_sugar, pulse) is required.');
    }

    const timestamp = data.timestamp || new Date().toISOString();
    const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    let record: HealthRecord = {
      id,
      userId,
      type: data.type,
      timestamp,
      notes: data.notes?.trim() || undefined,
      tags: data.tags || [],
      isSample: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (data.type === 'blood_pressure') {
      const systolic = Number(data.systolic);
      const diastolic = Number(data.diastolic);
      if (isNaN(systolic) || systolic < 50 || systolic > 300) {
        throw new Error('Systolic blood pressure must be between 50 and 300 mmHg.');
      }
      if (isNaN(diastolic) || diastolic < 30 || diastolic > 200) {
        throw new Error('Diastolic blood pressure must be between 30 and 200 mmHg.');
      }
      if (systolic <= diastolic) {
        throw new Error('Systolic value must be greater than diastolic value.');
      }

      record.systolic = systolic;
      record.diastolic = diastolic;
      record.bpCategory = classifyBloodPressure(systolic, diastolic).category;
      record.arm = data.arm || 'left';
      record.position = data.position || 'sitting';
    } else if (data.type === 'blood_sugar') {
      const value = Number(data.bloodSugarValue);
      const unit = data.bloodSugarUnit || 'mg/dL';
      const context = data.bloodSugarContext || 'fasting';

      if (isNaN(value) || value <= 0 || (unit === 'mg/dL' && value > 600) || (unit === 'mmol/L' && value > 35)) {
        throw new Error('Please enter a valid blood sugar reading within physiologic range.');
      }

      record.bloodSugarValue = value;
      record.bloodSugarUnit = unit;
      record.bloodSugarContext = context;
      record.sugarCategory = classifyBloodSugar(value, unit, context).category;
    } else if (data.type === 'pulse') {
      const bpm = Number(data.pulseBpm);
      if (isNaN(bpm) || bpm < 30 || bpm > 250) {
        throw new Error('Pulse must be between 30 and 250 beats per minute.');
      }

      record.pulseBpm = bpm;
      record.pulseRhythm = data.pulseRhythm || 'regular';
      record.pulseContext = data.pulseContext || 'resting';
      record.pulseCategory = classifyPulse(bpm).category;
    }

    this.data.healthRecords.unshift(record);
    this.persist();
    return record;
  }

  public updateHealthRecord(userId: string, id: string, updates: Partial<HealthRecord>): HealthRecord {
    const idx = this.data.healthRecords.findIndex((r) => r.id === id && r.userId === userId);
    if (idx === -1) {
      throw new Error('Record not found or unauthorized.');
    }

    const current = this.data.healthRecords[idx];
    const timestamp = updates.timestamp || current.timestamp;

    if (current.type === 'blood_pressure') {
      const systolic = updates.systolic !== undefined ? Number(updates.systolic) : current.systolic!;
      const diastolic = updates.diastolic !== undefined ? Number(updates.diastolic) : current.diastolic!;
      if (systolic <= diastolic) {
        throw new Error('Systolic value must be greater than diastolic value.');
      }
      current.systolic = systolic;
      current.diastolic = diastolic;
      current.bpCategory = classifyBloodPressure(systolic, diastolic).category;
      if (updates.arm) current.arm = updates.arm;
      if (updates.position) current.position = updates.position;
    } else if (current.type === 'blood_sugar') {
      const value = updates.bloodSugarValue !== undefined ? Number(updates.bloodSugarValue) : current.bloodSugarValue!;
      const unit = updates.bloodSugarUnit || current.bloodSugarUnit || 'mg/dL';
      const context = updates.bloodSugarContext || current.bloodSugarContext || 'fasting';
      current.bloodSugarValue = value;
      current.bloodSugarUnit = unit;
      current.bloodSugarContext = context;
      current.sugarCategory = classifyBloodSugar(value, unit, context).category;
    } else if (current.type === 'pulse') {
      const bpm = updates.pulseBpm !== undefined ? Number(updates.pulseBpm) : current.pulseBpm!;
      current.pulseBpm = bpm;
      current.pulseCategory = classifyPulse(bpm).category;
      if (updates.pulseRhythm) current.pulseRhythm = updates.pulseRhythm;
      if (updates.pulseContext) current.pulseContext = updates.pulseContext;
    }

    current.timestamp = timestamp;
    if (updates.notes !== undefined) current.notes = updates.notes.trim() || undefined;
    current.updatedAt = new Date().toISOString();

    this.persist();
    return current;
  }

  public deleteHealthRecord(userId: string, id: string): boolean {
    const initialLen = this.data.healthRecords.length;
    this.data.healthRecords = this.data.healthRecords.filter((r) => !(r.id === id && r.userId === userId));
    const changed = this.data.healthRecords.length !== initialLen;
    if (changed) this.persist();
    return changed;
  }

  // --- Medications CRUD ---
  public getMedications(userId: string): Medication[] {
    return this.data.medications
      .filter((m) => m.userId === userId)
      .sort((a, b) => (b.active === a.active ? a.name.localeCompare(b.name) : b.active ? 1 : -1));
  }

  public addMedication(userId: string, data: Partial<Medication>): Medication {
    if (!data.name || !data.dosage) {
      throw new Error('Medication name and dosage are required.');
    }

    const id = `med_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const med: Medication = {
      id,
      userId,
      name: data.name.trim(),
      dosage: data.dosage.trim(),
      form: data.form || 'tablet',
      frequency: data.frequency || 'daily',
      scheduledTimes: data.scheduledTimes && data.scheduledTimes.length ? data.scheduledTimes : ['08:00'],
      instructions: data.instructions?.trim() || undefined,
      startDate: data.startDate || new Date().toISOString().slice(0, 10),
      endDate: data.endDate || undefined,
      totalPills: data.totalPills ? Number(data.totalPills) : undefined,
      remainingPills: data.remainingPills !== undefined ? Number(data.remainingPills) : undefined,
      refillReminderThreshold: data.refillReminderThreshold ? Number(data.refillReminderThreshold) : undefined,
      colorHex: data.colorHex || '#0d9488',
      active: data.active !== undefined ? Boolean(data.active) : true,
      isSample: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.medications.push(med);
    this.persist();
    return med;
  }

  public updateMedication(userId: string, id: string, updates: Partial<Medication>): Medication {
    const idx = this.data.medications.findIndex((m) => m.id === id && m.userId === userId);
    if (idx === -1) {
      throw new Error('Medication not found or unauthorized.');
    }

    const current = this.data.medications[idx];
    if (updates.name) current.name = updates.name.trim();
    if (updates.dosage) current.dosage = updates.dosage.trim();
    if (updates.form) current.form = updates.form;
    if (updates.frequency) current.frequency = updates.frequency;
    if (updates.scheduledTimes) current.scheduledTimes = updates.scheduledTimes;
    if (updates.instructions !== undefined) current.instructions = updates.instructions?.trim() || undefined;
    if (updates.startDate) current.startDate = updates.startDate;
    if (updates.endDate !== undefined) current.endDate = updates.endDate;
    if (updates.totalPills !== undefined) current.totalPills = Number(updates.totalPills);
    if (updates.remainingPills !== undefined) current.remainingPills = Number(updates.remainingPills);
    if (updates.refillReminderThreshold !== undefined) current.refillReminderThreshold = Number(updates.refillReminderThreshold);
    if (updates.colorHex) current.colorHex = updates.colorHex;
    if (updates.active !== undefined) current.active = updates.active;

    current.updatedAt = new Date().toISOString();
    this.persist();
    return current;
  }

  public deleteMedication(userId: string, id: string): boolean {
    const initialLen = this.data.medications.length;
    this.data.medications = this.data.medications.filter((m) => !(m.id === id && m.userId === userId));
    // also remove dose logs for this medication
    this.data.doseLogs = this.data.doseLogs.filter((d) => !(d.medicationId === id && d.userId === userId));
    const changed = this.data.medications.length !== initialLen;
    if (changed) this.persist();
    return changed;
  }

  // --- Dose Logs & Adherence ---
  public getDoseLogs(userId: string, startDate?: string, endDate?: string): DoseLog[] {
    let logs = this.data.doseLogs.filter((d) => d.userId === userId);
    if (startDate) {
      logs = logs.filter((d) => d.scheduledTime >= startDate);
    }
    if (endDate) {
      logs = logs.filter((d) => d.scheduledTime <= endDate);
    }
    return logs.sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());
  }

  public recordDose(userId: string, data: {
    medicationId: string;
    scheduledTime: string;
    status: 'taken' | 'skipped' | 'snoozed';
    notes?: string;
  }): DoseLog {
    const med = this.data.medications.find((m) => m.id === data.medicationId && m.userId === userId);
    if (!med) throw new Error('Medication not found');

    const id = `dose_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const log: DoseLog = {
      id,
      userId,
      medicationId: med.id,
      medicationName: med.name,
      scheduledTime: data.scheduledTime,
      actionTime: data.status === 'taken' ? new Date().toISOString() : undefined,
      status: data.status,
      notes: data.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    // If taken and remaining pills tracked, decrement
    if (data.status === 'taken' && med.remainingPills && med.remainingPills > 0) {
      med.remainingPills -= 1;
    }

    // Replace if existing log exists for this med and scheduled time
    const existingIdx = this.data.doseLogs.findIndex(
      (d) => d.medicationId === med.id && d.userId === userId && d.scheduledTime === data.scheduledTime
    );
    if (existingIdx !== -1) {
      this.data.doseLogs[existingIdx] = log;
    } else {
      this.data.doseLogs.unshift(log);
    }

    this.persist();
    return log;
  }

  // --- Report Analyses ---
  public saveReportAnalysis(userId: string, analysis: MedicalReportAnalysis) {
    analysis.userId = userId;
    this.data.reportAnalyses.unshift(analysis);
    if (this.data.reportAnalyses.length > 50) {
      this.data.reportAnalyses.pop();
    }
    this.persist();
  }

  public getReportAnalyses(userId: string): MedicalReportAnalysis[] {
    return this.data.reportAnalyses.filter((r) => r.userId === userId);
  }
}

export const db = new JsonDatabase();
