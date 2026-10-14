import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Heart,
  Droplets,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Info,
  ChevronDown,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { HealthRecord, HealthRecordType } from '../types';
import {
  classifyBloodPressure,
  classifyBloodSugar,
  classifyPulse,
} from '../utils/healthCalculators';

interface HealthTrackingPageProps {
  onOpenQuickLog: () => void;
  dateRange: string;
}

export const HealthTrackingPage: React.FC<HealthTrackingPageProps> = ({
  onOpenQuickLog,
  dateRange,
}) => {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<HealthRecord | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await api.getRecords();
      setRecords(res.records || []);
    } catch (err: any) {
      console.error('Failed to fetch records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Filter and search
  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (selectedType !== 'all') {
      result = result.filter((r) => r.type === selectedType);
    }

    if (dateRange !== 'all') {
      const now = Date.now();
      const days = dateRange === '7d' ? 7 : dateRange === '14d' ? 14 : dateRange === '30d' ? 30 : 90;
      const cutoff = new Date(now - days * 86400000).toISOString();
      result = result.filter((r) => r.timestamp >= cutoff);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.type.toLowerCase().includes(q) ||
          r.notes?.toLowerCase().includes(q) ||
          r.bpCategory?.toLowerCase().includes(q) ||
          r.sugarCategory?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [records, selectedType, dateRange, searchQuery]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setActionError(null);

    try {
      await api.updateRecord(editingRecord.id, editingRecord);
      await fetchRecords();
      setEditingRecord(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update record');
    }
  };

  const handleDelete = async () => {
    if (!deletingRecord) return;
    setActionError(null);

    try {
      await api.deleteRecord(deletingRecord.id);
      await fetchRecords();
      setDeletingRecord(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete record');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono tracking-widest text-teal-400 uppercase font-semibold">
              MedPin Telemetry Engine
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 font-semibold">
              CRUD Active
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
            Health Reading Logs & History
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
            Logged measurements are securely stored in your user-isolated database. Use the filters below to inspect specific clinical observation windows.
          </p>
        </div>

        <button
          onClick={onOpenQuickLog}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Record New Reading</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
        {/* Metric Type Segmented Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Vitals' },
            { id: 'blood_pressure', label: 'Blood Pressure', icon: Heart, iconColor: 'text-rose-400' },
            { id: 'blood_sugar', label: 'Blood Sugar', icon: Droplets, iconColor: 'text-cyan-400' },
            { id: 'pulse', label: 'Pulse / BPM', icon: Activity, iconColor: 'text-indigo-400' },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = selectedType === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedType(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {Icon && <Icon className={`w-3.5 h-3.5 ${item.iconColor}`} />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, category, date..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Records Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-5">Timestamp</th>
                <th className="py-3.5 px-4">Metric</th>
                <th className="py-3.5 px-4">Measurement</th>
                <th className="py-3.5 px-4">Clinical Category</th>
                <th className="py-3.5 px-4">Context / Protocol</th>
                <th className="py-3.5 px-4">Notes</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading health records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center space-y-3">
                    <Activity className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-sm font-semibold text-slate-300">No health readings found.</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {searchQuery
                        ? 'Try clearing your search query or adjusting the date range.'
                        : 'Begin tracking your cardiovascular and metabolic vitals by logging a new reading.'}
                    </p>
                    <button
                      onClick={onOpenQuickLog}
                      className="mt-2 px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition-colors cursor-pointer"
                    >
                      + Record First Vital
                    </button>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const d = new Date(record.timestamp);
                  const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  let metricIcon = <Activity className="w-4 h-4 text-teal-400" />;
                  let metricName: string = record.type;
                  let readingDisplay = '';
                  let badge = null;
                  let contextText = '';

                  if (record.type === 'blood_pressure') {
                    metricIcon = <Heart className="w-4 h-4 text-rose-400" />;
                    metricName = 'Blood Pressure';
                    readingDisplay = `${record.systolic} / ${record.diastolic} mmHg`;
                    const cat = classifyBloodPressure(record.systolic!, record.diastolic!);
                    badge = (
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cat.badgeClass}`}>
                        {cat.label}
                      </span>
                    );
                    contextText = `${record.arm || 'left'} arm • ${record.position || 'sitting'}`;
                  } else if (record.type === 'blood_sugar') {
                    metricIcon = <Droplets className="w-4 h-4 text-cyan-400" />;
                    metricName = 'Blood Sugar';
                    readingDisplay = `${record.bloodSugarValue} ${record.bloodSugarUnit || 'mg/dL'}`;
                    const cat = classifyBloodSugar(record.bloodSugarValue!, record.bloodSugarUnit, record.bloodSugarContext);
                    badge = (
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cat.badgeClass}`}>
                        {cat.label}
                      </span>
                    );
                    contextText = record.bloodSugarContext ? `${record.bloodSugarContext} check` : 'Fasting';
                  } else if (record.type === 'pulse') {
                    metricIcon = <Activity className="w-4 h-4 text-indigo-400" />;
                    metricName = 'Pulse';
                    readingDisplay = `${record.pulseBpm} BPM`;
                    const cat = classifyPulse(record.pulseBpm!);
                    badge = (
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cat.badgeClass}`}>
                        {cat.label}
                      </span>
                    );
                    contextText = `${record.pulseRhythm || 'regular'} rhythm • ${record.pulseContext || 'resting'}`;
                  }

                  return (
                    <tr key={record.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-5 text-slate-300 whitespace-nowrap">
                        <div className="font-medium text-white">{dateStr}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{timeStr}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {metricIcon}
                          <span className="font-semibold text-slate-200">{metricName}</span>
                          {record.isSample && (
                            <span className="text-[9px] font-mono px-1 rounded bg-slate-800 text-slate-400">
                              sample
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-white text-sm whitespace-nowrap">
                        {readingDisplay}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {badge}
                      </td>

                      <td className="py-3 px-4 text-slate-400 capitalize whitespace-nowrap">
                        {contextText}
                      </td>

                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                        {record.notes || <span className="text-slate-600">—</span>}
                      </td>

                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingRecord(record)}
                            title="Edit reading"
                            className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingRecord(record)}
                            title="Delete reading"
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clinical Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3 text-xs text-slate-400">
        <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-300">MedPin Clinical Notice: </span>
          The numerical vitals displayed here reflect self-reported or device-streamed patient observations. These metrics are intended for longitudinal monitoring and personal health education, not as a substitute for professional medical diagnosis.
        </div>
      </div>

      {/* Edit Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Edit Vital Record</h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              {editingRecord.type === 'blood_pressure' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Systolic (mmHg)</label>
                    <input
                      type="number"
                      required
                      value={editingRecord.systolic || ''}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, systolic: Number(e.target.value) })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Diastolic (mmHg)</label>
                    <input
                      type="number"
                      required
                      value={editingRecord.diastolic || ''}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, diastolic: Number(e.target.value) })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm"
                    />
                  </div>
                </div>
              )}

              {editingRecord.type === 'blood_sugar' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Glucose Level</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={editingRecord.bloodSugarValue || ''}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, bloodSugarValue: Number(e.target.value) })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Unit</label>
                    <select
                      value={editingRecord.bloodSugarUnit || 'mg/dL'}
                      onChange={(e: any) =>
                        setEditingRecord({ ...editingRecord, bloodSugarUnit: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                    >
                      <option value="mg/dL">mg/dL</option>
                      <option value="mmol/L">mmol/L</option>
                    </select>
                  </div>
                </div>
              )}

              {editingRecord.type === 'pulse' && (
                <div>
                  <label className="block text-slate-300 mb-1">Pulse (BPM)</label>
                  <input
                    type="number"
                    required
                    value={editingRecord.pulseBpm || ''}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, pulseBpm: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 mb-1">Observation Notes</label>
                <textarea
                  rows={2}
                  value={editingRecord.notes || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs placeholder:text-slate-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Delete Health Reading?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to permanently delete this {deletingRecord.type.replace('_', ' ')} observation? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
