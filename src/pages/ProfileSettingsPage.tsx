import React, { useState } from 'react';
import {
  User,
  Mail,
  Calendar,
  Heart,
  Scale,
  Ruler,
  PhoneCall,
  Languages,
  Moon,
  Sun,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Save,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { calculateBMI } from '../utils/healthCalculators';

export const ProfileSettingsPage: React.FC = () => {
  const { user, updateProfile, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || '');
  const [gender, setGender] = useState(user?.gender || 'prefer-not-to-say');
  const [bloodType, setBloodType] = useState(user?.bloodType || 'Unknown');
  const [heightCm, setHeightCm] = useState(user?.heightCm ? String(user?.heightCm) : '');
  const [weightKg, setWeightKg] = useState(user?.weightKg ? String(user?.weightKg) : '');
  const [emergencyName, setEmergencyName] = useState(user?.emergencyContact?.name || '');
  const [emergencyRelation, setEmergencyRelation] = useState(user?.emergencyContact?.relationship || '');
  const [emergencyPhone, setEmergencyPhone] = useState(user?.emergencyContact?.phone || '');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'bn' | 'es'>(user?.preferredLanguage || 'en');
  const [glucoseUnit, setGlucoseUnit] = useState<'mg/dL' | 'mmol/L'>(user?.glucoseUnit || 'mg/dL');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dynamic BMI Calculation
  const bmiData = calculateBMI(Number(weightKg), Number(heightCm));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await updateProfile({
        name,
        dateOfBirth: dateOfBirth || undefined,
        gender: gender as any,
        bloodType: bloodType as any,
        heightCm: heightCm ? Number(heightCm) : undefined,
        weightKg: weightKg ? Number(weightKg) : undefined,
        emergencyContact: emergencyName
          ? {
              name: emergencyName,
              relationship: emergencyRelation || 'Contact',
              phone: emergencyPhone,
            }
          : undefined,
        preferredLanguage,
        glucoseUnit,
        theme,
      });
      setSuccessMsg('Profile and clinical preferences updated successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono tracking-widest text-teal-400 uppercase font-semibold">
              Patient Identification & Settings
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              User ID: {user?.id}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
            Profile & Clinical Baselines
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Maintain your physiological metrics, preferred units, language, and emergency contact details.
          </p>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-xs font-semibold transition-colors self-start sm:self-auto cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Profile Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Personal Details */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <User className="w-4 h-4 text-teal-400" />
            <span>Identity & Demographics</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">Display Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-teal-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Email (Account Primary)</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full bg-slate-950/60 border border-slate-800/60 rounded-xl px-3.5 py-2 text-slate-500 text-xs cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Biological Sex</label>
              <select
                value={gender}
                onChange={(e: any) => setGender(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none text-xs"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card 2: Physiological Baseline & Auto BMI */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-400" />
              <span>Biometric Baseline & BMI</span>
            </h3>
            {bmiData.bmi > 0 && (
              <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${bmiData.badgeClass}`}>
                BMI {bmiData.bmi} ({bmiData.category})
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">Height (cm)</label>
              <input
                type="number"
                min="50"
                max="250"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="170"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Weight (kg)</label>
              <input
                type="number"
                min="20"
                max="300"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="68"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Blood Group</label>
              <select
                value={bloodType}
                onChange={(e: any) => setBloodType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none"
              >
                <option value="A+">A Positive (A+)</option>
                <option value="A-">A Negative (A-)</option>
                <option value="B+">B Positive (B+)</option>
                <option value="B-">B Negative (B-)</option>
                <option value="AB+">AB Positive (AB+)</option>
                <option value="AB-">AB Negative (AB-)</option>
                <option value="O+">O Positive (O+)</option>
                <option value="O-">O Negative (O-)</option>
                <option value="Unknown">Unknown / Not Typed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card 3: Emergency Contact & Preferences */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <PhoneCall className="w-4 h-4 text-rose-400" />
            <span>Emergency Contact Information</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">Contact Full Name</label>
              <input
                type="text"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="e.g. John Connor"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Relationship</label>
              <input
                type="text"
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
                placeholder="Spouse / Parent / Sibling"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Emergency Phone</label>
              <input
                type="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none text-xs"
              />
            </div>
          </div>
        </div>

        {/* Card 4: Language, Units & Appearance */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <Languages className="w-4 h-4 text-indigo-400" />
            <span>Language, Units & Interface</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">Preferred Voice & UI Language</label>
              <select
                value={preferredLanguage}
                onChange={(e: any) => setPreferredLanguage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none text-xs"
              >
                <option value="en">English (United States)</option>
                <option value="bn">বাংলা (Bengali)</option>
                <option value="es">Español (Spanish)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Glucose Standard</label>
              <select
                value={glucoseUnit}
                onChange={(e: any) => setGlucoseUnit(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none text-xs"
              >
                <option value="mg/dL">mg/dL (United States standard)</option>
                <option value="mmol/L">mmol/L (International standard)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Dashboard Theme</label>
              <select
                value={theme}
                onChange={(e: any) => setTheme(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none text-xs"
              >
                <option value="dark">Medical Tech Dark</option>
                <option value="light">Clinical Paper Light</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

      {/* Privacy Notice */}
      <div className="rounded-3xl bg-slate-950 border border-slate-800/80 p-6 space-y-2 text-xs text-slate-400">
        <div className="flex items-center gap-2 text-slate-200 font-bold">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span>Patient Privacy & Healthcare Boundary Information</span>
        </div>
        <p className="leading-relaxed">
          Heal-Whisper-Guide is architected to isolate health records strictly to each authenticated user session. No personal health records are sent to external AI models automatically; only text or document scans that you explicitly submit in the MedDroid or VADG tools are processed by the configured Gemini engine.
        </p>
      </div>
    </div>
  );
};
