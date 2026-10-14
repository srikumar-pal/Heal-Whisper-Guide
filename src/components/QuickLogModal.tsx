import React, { useState, useRef } from 'react';
import { X, Activity, Heart, Droplets, CheckCircle2, AlertCircle, Mic, MicOff } from 'lucide-react';
import { HealthRecord, HealthRecordType } from '../types';
import {
  classifyBloodPressure,
  classifyBloodSugar,
  classifyPulse,
} from '../utils/healthCalculators';
import { api } from '../services/api';
import { SpeechClipRecorder } from '../utils/liveAudio';

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRecord: (data: Partial<HealthRecord>) => Promise<void>;
  initialType?: HealthRecordType;
}

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
  isOpen,
  onClose,
  onSaveRecord,
  initialType = 'blood_pressure',
}) => {
  const [activeTab, setActiveTab] = useState<HealthRecordType>(initialType);
  const [timestamp, setTimestamp] = useState<string>(() => {
    const now = new Date();
    // format YYYY-MM-DDTHH:mm
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDictating, setIsDictating] = useState(false);
  const [isTranscribingNote, setIsTranscribingNote] = useState(false);
  const clipRecorderRef = useRef<SpeechClipRecorder | null>(null);

  // Blood pressure fields
  const [systolic, setSystolic] = useState<string>('120');
  const [diastolic, setDiastolic] = useState<string>('80');
  const [arm, setArm] = useState<'left' | 'right'>('left');
  const [position, setPosition] = useState<'sitting' | 'standing' | 'lying'>('sitting');

  // Blood sugar fields
  const [bloodSugarValue, setBloodSugarValue] = useState<string>('95');
  const [bloodSugarUnit, setBloodSugarUnit] = useState<'mg/dL' | 'mmol/L'>('mg/dL');
  const [bloodSugarContext, setBloodSugarContext] = useState<
    'fasting' | 'post_meal' | 'random' | 'bedtime' | 'pre_meal'
  >('fasting');

  // Pulse fields
  const [pulseBpm, setPulseBpm] = useState<string>('72');
  const [pulseRhythm, setPulseRhythm] = useState<'regular' | 'irregular'>('regular');
  const [pulseContext, setPulseContext] = useState<'resting' | 'active' | 'post_exercise' | 'stressed'>('resting');

  if (!isOpen) return null;

  // Live previews
  const bpClassification =
    activeTab === 'blood_pressure' && Number(systolic) && Number(diastolic)
      ? classifyBloodPressure(Number(systolic), Number(diastolic))
      : null;

  const sugarClassification =
    activeTab === 'blood_sugar' && Number(bloodSugarValue)
      ? classifyBloodSugar(Number(bloodSugarValue), bloodSugarUnit, bloodSugarContext)
      : null;

  const pulseClassification =
    activeTab === 'pulse' && Number(pulseBpm)
      ? classifyPulse(Number(pulseBpm))
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const isoTimestamp = new Date(timestamp).toISOString();

      if (activeTab === 'blood_pressure') {
        const sys = Number(systolic);
        const dia = Number(diastolic);
        if (!sys || !dia) throw new Error('Please enter both systolic and diastolic numbers.');
        if (sys <= dia) throw new Error('Systolic must be strictly greater than diastolic.');

        await onSaveRecord({
          type: 'blood_pressure',
          systolic: sys,
          diastolic: dia,
          arm,
          position,
          notes,
          timestamp: isoTimestamp,
        });
      } else if (activeTab === 'blood_sugar') {
        const val = Number(bloodSugarValue);
        if (!val) throw new Error('Please enter your blood glucose reading.');
        await onSaveRecord({
          type: 'blood_sugar',
          bloodSugarValue: val,
          bloodSugarUnit,
          bloodSugarContext,
          notes,
          timestamp: isoTimestamp,
        });
      } else if (activeTab === 'pulse') {
        const bpm = Number(pulseBpm);
        if (!bpm) throw new Error('Please enter pulse beats per minute.');
        await onSaveRecord({
          type: 'pulse',
          pulseBpm: bpm,
          pulseRhythm,
          pulseContext,
          notes,
          timestamp: isoTimestamp,
        });
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record measurement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Record Vital Reading</h3>
              <p className="text-xs text-slate-400">MedPin clinical data logging</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-slate-950/50 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('blood_pressure')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'blood_pressure'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            <span>Blood Pressure</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('blood_sugar')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'blood_sugar'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
            <span>Blood Sugar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pulse')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'pulse'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>Pulse / BPM</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Blood Pressure Fields */}
          {activeTab === 'blood_pressure' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Systolic (mmHg)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="300"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2 text-white font-mono text-base focus:outline-none"
                    placeholder="120"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Upper number</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Diastolic (mmHg)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="200"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2 text-white font-mono text-base focus:outline-none"
                    placeholder="80"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Lower number</span>
                </div>
              </div>

              {/* Live Classification Banner */}
              {bpClassification && (
                <div className={`p-3 rounded-xl border text-xs space-y-1 ${bpClassification.badgeClass}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{bpClassification.label}</span>
                    <span className="font-mono text-[11px] opacity-80">ACC/AHA 2017</span>
                  </div>
                  <p className="text-[11px] opacity-90">{bpClassification.advice}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Measurement Arm</label>
                  <select
                    value={arm}
                    onChange={(e: any) => setArm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                  >
                    <option value="left">Left Arm</option>
                    <option value="right">Right Arm</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Body Position</label>
                  <select
                    value={position}
                    onChange={(e: any) => setPosition(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                  >
                    <option value="sitting">Sitting quietly</option>
                    <option value="standing">Standing</option>
                    <option value="lying">Lying down</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Blood Sugar Fields */}
          {activeTab === 'blood_sugar' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Glucose Level
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="600"
                    value={bloodSugarValue}
                    onChange={(e) => setBloodSugarValue(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2 text-white font-mono text-base focus:outline-none"
                    placeholder="95"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Unit
                  </label>
                  <select
                    value={bloodSugarUnit}
                    onChange={(e: any) => setBloodSugarUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none text-sm"
                  >
                    <option value="mg/dL">mg/dL (Standard)</option>
                    <option value="mmol/L">mmol/L</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Testing State / Timing
                </label>
                <select
                  value={bloodSugarContext}
                  onChange={(e: any) => setBloodSugarContext(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none text-xs"
                >
                  <option value="fasting">Fasting (No food 8+ hrs)</option>
                  <option value="post_meal">Post-Meal (1-2 hours after food)</option>
                  <option value="pre_meal">Pre-Meal (Before lunch/dinner)</option>
                  <option value="bedtime">Bedtime</option>
                  <option value="random">Random / Spot check</option>
                </select>
              </div>

              {sugarClassification && (
                <div className={`p-3 rounded-xl border text-xs space-y-1 ${sugarClassification.badgeClass}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{sugarClassification.label}</span>
                    <span className="font-mono text-[11px] opacity-80">ADA Standards</span>
                  </div>
                  <p className="text-[11px] opacity-90">{sugarClassification.advice}</p>
                </div>
              )}
            </div>
          )}

          {/* Pulse Fields */}
          {activeTab === 'pulse' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Heart Rate (BPM)
                </label>
                <input
                  type="number"
                  min="30"
                  max="250"
                  value={pulseBpm}
                  onChange={(e) => setPulseBpm(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2 text-white font-mono text-base focus:outline-none"
                  placeholder="72"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Rhythm Regularity</label>
                  <select
                    value={pulseRhythm}
                    onChange={(e: any) => setPulseRhythm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                  >
                    <option value="regular">Regular rhythm</option>
                    <option value="irregular">Irregular / Fluttering</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Physical Context</label>
                  <select
                    value={pulseContext}
                    onChange={(e: any) => setPulseContext(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                  >
                    <option value="resting">At Rest</option>
                    <option value="active">Active / Walking</option>
                    <option value="post_exercise">Post-Exercise</option>
                    <option value="stressed">Emotional Stress / Anxiety</option>
                  </select>
                </div>
              </div>

              {pulseClassification && (
                <div className={`p-3 rounded-xl border text-xs space-y-1 ${pulseClassification.badgeClass}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{pulseClassification.label}</span>
                    <span className="font-mono text-[11px] opacity-80">AHA Guideline</span>
                  </div>
                  <p className="text-[11px] opacity-90">{pulseClassification.advice}</p>
                </div>
              )}
            </div>
          )}

          {/* Date & Time Picker */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Measurement Timestamp
            </label>
            <input
              type="datetime-local"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none"
            />
          </div>

          {/* Optional Notes with Voice Dictation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">
                Clinical Notes (Optional)
              </label>
              <button
                type="button"
                onClick={async () => {
                  if (isDictating) {
                    try {
                      setIsDictating(false);
                      setIsTranscribingNote(true);
                      const { base64, mimeType } = await clipRecorderRef.current!.stop();
                      const res = await api.transcribeAudio(base64, mimeType);
                      if (res.transcript) {
                        setNotes((prev) => (prev ? `${prev} ${res.transcript}` : res.transcript));
                      }
                    } catch (e: any) {
                      setError(e.message || 'Dictation failed');
                    } finally {
                      setIsTranscribingNote(false);
                    }
                  } else {
                    try {
                      if (!clipRecorderRef.current) clipRecorderRef.current = new SpeechClipRecorder();
                      await clipRecorderRef.current.start();
                      setIsDictating(true);
                    } catch (e: any) {
                      setError('Microphone permission required for voice notes.');
                    }
                  }
                }}
                className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg transition-colors ${
                  isDictating
                    ? 'bg-rose-500 text-white animate-pulse'
                    : isTranscribingNote
                    ? 'bg-slate-800 text-teal-400'
                    : 'text-slate-400 hover:text-teal-300 hover:bg-slate-800'
                }`}
              >
                {isDictating ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                <span>
                  {isDictating
                    ? 'Recording... Tap to Transcribe'
                    : isTranscribingNote
                    ? 'Transcribing...'
                    : 'Dictate Note'}
                </span>
              </button>
            </div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Felt calm, took reading 15 mins after coffee..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none placeholder:text-slate-600"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {saving ? (
                <span>Recording...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Save Vital Record</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
