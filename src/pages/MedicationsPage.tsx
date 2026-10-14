import React, { useState, useEffect, useMemo } from 'react';
import {
  Pill,
  Plus,
  Clock,
  Calendar,
  Check,
  X,
  AlertTriangle,
  Bell,
  Trash2,
  Edit2,
  Sparkles,
  ShieldCheck,
  Package,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { Medication, DoseLog } from '../types';

export const MedicationsPage: React.FC = () => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [doses, setDoses] = useState<DoseLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [deletingMed, setDeletingMed] = useState<Medication | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New medication form state
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [form, setForm] = useState<'tablet' | 'capsule' | 'liquid' | 'injection' | 'inhaler' | 'drops' | 'other'>('tablet');
  const [frequency, setFrequency] = useState<'daily' | 'twice_daily' | 'thrice_daily' | 'every_8_hours' | 'weekly' | 'as_needed' | 'custom'>('daily');
  const [time1, setTime1] = useState('08:00');
  const [time2, setTime2] = useState('20:00');
  const [instructions, setInstructions] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [totalPills, setTotalPills] = useState<string>('60');
  const [remainingPills, setRemainingPills] = useState<string>('45');
  const [refillThreshold, setRefillThreshold] = useState<string>('10');
  const [colorHex, setColorHex] = useState('#0d9488');

  const fetchMedicationsAndDoses = async () => {
    try {
      setLoading(true);
      const [medRes, doseRes] = await Promise.all([
        api.getMedications(),
        api.getDoses(),
      ]);
      setMedications(medRes.medications || []);
      setDoses(doseRes.doses || []);
    } catch (err: any) {
      console.error('Failed to load medications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicationsAndDoses();
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Adherence calculation
  const adherence = useMemo(() => {
    if (doses.length === 0) return { percent: 100, taken: 0, scheduled: 0 };
    const taken = doses.filter((d) => d.status === 'taken').length;
    return {
      percent: Math.round((taken / doses.length) * 100),
      taken,
      scheduled: doses.length,
    };
  }, [doses]);

  const handleSaveMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const scheduledTimes = frequency === 'twice_daily' ? [time1, time2] : [time1];

      const payload: Partial<Medication> = {
        name,
        dosage,
        form,
        frequency,
        scheduledTimes,
        instructions,
        startDate,
        endDate: endDate || undefined,
        totalPills: totalPills ? Number(totalPills) : undefined,
        remainingPills: remainingPills ? Number(remainingPills) : undefined,
        refillReminderThreshold: refillThreshold ? Number(refillThreshold) : undefined,
        colorHex,
      };

      if (editingMed) {
        await api.updateMedication(editingMed.id, payload);
      } else {
        await api.addMedication(payload);
      }

      await fetchMedicationsAndDoses();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to save medication');
    }
  };

  const resetForm = () => {
    setIsAddModalOpen(false);
    setEditingMed(null);
    setName('');
    setDosage('');
    setForm('tablet');
    setFrequency('daily');
    setTime1('08:00');
    setTime2('20:00');
    setInstructions('');
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate('');
    setTotalPills('60');
    setRemainingPills('45');
    setRefillThreshold('10');
    setColorHex('#0d9488');
  };

  const handleOpenEdit = (med: Medication) => {
    setEditingMed(med);
    setName(med.name);
    setDosage(med.dosage);
    setForm(med.form);
    setFrequency(med.frequency);
    setTime1(med.scheduledTimes[0] || '08:00');
    setTime2(med.scheduledTimes[1] || '20:00');
    setInstructions(med.instructions || '');
    setStartDate(med.startDate);
    setEndDate(med.endDate || '');
    setTotalPills(med.totalPills ? String(med.totalPills) : '');
    setRemainingPills(med.remainingPills !== undefined ? String(med.remainingPills) : '');
    setRefillThreshold(med.refillReminderThreshold ? String(med.refillReminderThreshold) : '10');
    setColorHex(med.colorHex || '#0d9488');
    setIsAddModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingMed) return;
    try {
      await api.deleteMedication(deletingMed.id);
      await fetchMedicationsAndDoses();
      setDeletingMed(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  const handleRecordDose = async (medId: string, scheduledTime: string, status: 'taken' | 'skipped') => {
    try {
      await api.recordDose(medId, { scheduledTime, status });
      await fetchMedicationsAndDoses();
    } catch (err: any) {
      alert(err.message || 'Failed to record dose');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono tracking-widest text-teal-400 uppercase font-semibold">
              Pharmacotherapy Management
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 font-semibold">
              Adherence {adherence.percent}%
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
            Medication Scheduler & Inventory
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
            Keep track of doctor-prescribed regimens, active reminders, refill thresholds, and verifiable dose adherence.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add New Medication</span>
        </button>
      </div>

      {/* Adherence & Refill Alert Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-extrabold font-mono text-lg">
            {adherence.percent}%
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Compliance Score</h4>
            <p className="text-xs text-slate-400">
              {adherence.taken} of {adherence.scheduled} logged doses taken on schedule.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-extrabold font-mono text-lg">
            {medications.length}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Active Prescriptions</h4>
            <p className="text-xs text-slate-400">
              Synchronized with your personal health records.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Refill Monitoring</h4>
            <p className="text-xs text-slate-400">
              Automated notifications when remaining pills fall below threshold.
            </p>
          </div>
        </div>
      </div>

      {/* Today's Action Timeline */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Today's Dose Schedule</h3>
            <p className="text-xs text-slate-400">Mark doses as taken or skipped to maintain adherence logs.</p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
            {todayStr}
          </span>
        </div>

        {medications.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No active medications in your schedule. Click "Add New Medication" to begin.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {medications.map((med) => {
              const defaultTime = med.scheduledTimes[0] || '08:00';
              const doseKey = `${todayStr} ${defaultTime}`;
              const loggedDose = doses.find(
                (d) => d.medicationId === med.id && d.scheduledTime.startsWith(todayStr)
              );
              const isTaken = loggedDose?.status === 'taken';
              const isSkipped = loggedDose?.status === 'skipped';
              const isLowStock = med.remainingPills !== undefined && med.refillReminderThreshold && med.remainingPills <= med.refillReminderThreshold;

              return (
                <div
                  key={med.id}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
                        style={{ backgroundColor: `${med.colorHex || '#0d9488'}20`, color: med.colorHex || '#2dd4bf' }}
                      >
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{med.name}</h4>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                            {med.dosage}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 capitalize">{med.form} • {med.frequency.replace('_', ' ')}</span>
                      </div>
                    </div>

                    {isLowStock && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Low Stock ({med.remainingPills} left)</span>
                      </span>
                    )}
                  </div>

                  {med.instructions && (
                    <div className="text-xs text-slate-400 bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                      <span className="text-slate-500 font-semibold">Directions: </span>
                      {med.instructions}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{med.scheduledTimes.join(', ')}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isTaken ? (
                        <span className="flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Dose Taken</span>
                        </span>
                      ) : isSkipped ? (
                        <span className="flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold">
                          <span>Skipped</span>
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleRecordDose(med.id, doseKey, 'taken')}
                            className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Take Dose</span>
                          </button>
                          <button
                            onClick={() => handleRecordDose(med.id, doseKey, 'skipped')}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition-colors cursor-pointer"
                            title="Skip this dose"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Medication Regimen Inventory Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Medication Regimen & Pill Inventory</h3>
            <p className="text-xs text-slate-400">Manage prescription dosages, pill counts, and reminder intervals.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-5">Medication</th>
                <th className="py-3.5 px-4">Dosage & Form</th>
                <th className="py-3.5 px-4">Frequency</th>
                <th className="py-3.5 px-4">Scheduled Times</th>
                <th className="py-3.5 px-4">Inventory (Pills)</th>
                <th className="py-3.5 px-4">Instructions</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {medications.map((med) => (
                <tr key={med.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="font-bold text-white text-sm">{med.name}</div>
                    <div className="text-[11px] text-slate-500">Started {med.startDate}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-200 font-mono font-semibold">
                    {med.dosage} ({med.form})
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 capitalize">
                    {med.frequency.replace('_', ' ')}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">
                    {med.scheduledTimes.join(', ')}
                  </td>
                  <td className="py-3.5 px-4">
                    {med.remainingPills !== undefined ? (
                      <span className={`font-mono font-semibold ${med.refillReminderThreshold && med.remainingPills <= med.refillReminderThreshold ? 'text-amber-400' : 'text-slate-300'}`}>
                        {med.remainingPills} / {med.totalPills || '—'}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                    {med.instructions || 'As directed'}
                  </td>
                  <td className="py-3.5 px-5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(med)}
                        className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Edit medicine"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingMed(med)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete medicine"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Medication Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingMed ? 'Edit Medication' : 'Add Medication to Regimen'}
              </h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveMedication} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Medication Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Lisinopril"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Dosage</label>
                  <input
                    type="text"
                    required
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g. 10mg or 1 tablet"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Dosage Form</label>
                  <select
                    value={form}
                    onChange={(e: any) => setForm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  >
                    <option value="tablet">Tablet</option>
                    <option value="capsule">Capsule</option>
                    <option value="liquid">Liquid / Syrup</option>
                    <option value="injection">Injection</option>
                    <option value="inhaler">Inhaler</option>
                    <option value="drops">Drops</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e: any) => setFrequency(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  >
                    <option value="daily">Once Daily</option>
                    <option value="twice_daily">Twice Daily</option>
                    <option value="thrice_daily">Three Times Daily</option>
                    <option value="every_8_hours">Every 8 Hours</option>
                    <option value="weekly">Weekly</option>
                    <option value="as_needed">As Needed (PRN)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Primary Dose Time</label>
                  <input
                    type="time"
                    required
                    value={time1}
                    onChange={(e) => setTime1(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
                  />
                </div>
                {frequency === 'twice_daily' && (
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Second Dose Time</label>
                    <input
                      type="time"
                      required
                      value={time2}
                      onChange={(e) => setTime2(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Total Supply</label>
                  <input
                    type="number"
                    min="1"
                    value={totalPills}
                    onChange={(e) => setTotalPills(e.target.value)}
                    placeholder="60"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Remaining</label>
                  <input
                    type="number"
                    min="0"
                    value={remainingPills}
                    onChange={(e) => setRemainingPills(e.target.value)}
                    placeholder="45"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Refill Alert At</label>
                  <input
                    type="number"
                    min="1"
                    value={refillThreshold}
                    onChange={(e) => setRefillThreshold(e.target.value)}
                    placeholder="10"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Clinical Instructions / Directions</label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Take with food in the morning..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs placeholder:text-slate-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold"
                >
                  {editingMed ? 'Save Changes' : 'Add Medication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete Medication?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Remove {deletingMed.name} from your active schedule and delete associated reminder logs?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMed(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
