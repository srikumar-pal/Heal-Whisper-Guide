import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  AreaChart,
  Area,
} from 'recharts';
import {
  FileDown,
  FileSpreadsheet,
  Calendar,
  Activity,
  Heart,
  Droplets,
  AlertCircle,
  Share2,
  Printer,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { HealthRecord, Medication } from '../types';
import { exportHealthRecordsToCSV, exportHealthReportToPDF } from '../utils/exportUtils';

interface ChartsPageProps {
  dateRange: string;
  onDateRangeChange: (range: string) => void;
}

export const ChartsPage: React.FC<ChartsPageProps> = ({
  dateRange,
  onDateRangeChange,
}) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [recRes, medRes] = await Promise.all([
          api.getRecords(),
          api.getMedications(),
        ]);
        setRecords(recRes.records || []);
        setMedications(medRes.medications || []);
      } catch (err) {
        console.error('Failed to load chart data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter records by date range
  const filteredRecords = useMemo(() => {
    if (dateRange === 'all') return records;
    const now = Date.now();
    const days = dateRange === '7d' ? 7 : dateRange === '14d' ? 14 : dateRange === '30d' ? 30 : 90;
    const cutoff = new Date(now - days * 86400000).toISOString();
    return records.filter((r) => r.timestamp >= cutoff);
  }, [records, dateRange]);

  // Prepared data for Blood Pressure Chart
  const bpChartData = useMemo(() => {
    const bpRecs = filteredRecords
      .filter((r) => r.type === 'blood_pressure' && r.systolic && r.diastolic)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return bpRecs.map((r) => {
      const d = new Date(r.timestamp);
      return {
        date: `${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        systolic: r.systolic,
        diastolic: r.diastolic,
        notes: r.notes || '',
        category: r.bpCategory,
      };
    });
  }, [filteredRecords]);

  // Prepared data for Blood Sugar Chart
  const sugarChartData = useMemo(() => {
    const sugarRecs = filteredRecords
      .filter((r) => r.type === 'blood_sugar' && r.bloodSugarValue)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return sugarRecs.map((r) => {
      const d = new Date(r.timestamp);
      const valMgDl = r.bloodSugarUnit === 'mmol/L' ? Math.round(r.bloodSugarValue! * 18.0182) : r.bloodSugarValue;
      return {
        date: `${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        value: valMgDl,
        unit: 'mg/dL',
        context: r.bloodSugarContext || 'fasting',
        notes: r.notes || '',
      };
    });
  }, [filteredRecords]);

  // Prepared data for Pulse Chart
  const pulseChartData = useMemo(() => {
    const pulseRecs = filteredRecords
      .filter((r) => r.type === 'pulse' && r.pulseBpm)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return pulseRecs.map((r) => {
      const d = new Date(r.timestamp);
      return {
        date: `${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        bpm: r.pulseBpm,
        rhythm: r.pulseRhythm || 'regular',
        context: r.pulseContext || 'resting',
      };
    });
  }, [filteredRecords]);

  const handleExportCSV = () => {
    try {
      setExporting(true);
      exportHealthRecordsToCSV(filteredRecords, user?.name || 'Patient');
      setExportMessage('CSV spreadsheet downloaded successfully.');
      setTimeout(() => setExportMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = () => {
    if (!user) return;
    try {
      setExporting(true);
      const windowText =
        dateRange === '7d'
          ? 'Last 7 Days'
          : dateRange === '14d'
          ? 'Last 14 Days'
          : dateRange === '30d'
          ? 'Last 30 Days'
          : dateRange === '90d'
          ? 'Last 90 Days'
          : 'Complete History';
      exportHealthReportToPDF(filteredRecords, medications, user, windowText);
      setExportMessage('Clinical PDF report generated and downloaded.');
      setTimeout(() => setExportMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || 'PDF Generation failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Controls & Export Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono tracking-widest text-teal-400 uppercase font-semibold">
              Longitudinal Analytics
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {filteredRecords.length} Observations
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
            Clinical Health Trends & Charts
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Visualize trends against AHA and ADA target threshold zones, and export formatted reports for your clinical team.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            disabled={exporting || filteredRecords.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          {/* PDF Report Export */}
          <button
            onClick={handleExportPDF}
            disabled={exporting || filteredRecords.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <FileDown className="w-4 h-4 stroke-[2.5]" />
            <span>Generate Clinical PDF</span>
          </button>
        </div>
      </div>

      {exportMessage && (
        <div className="p-3.5 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{exportMessage}</span>
        </div>
      )}

      {/* Chart 1: Blood Pressure Trends */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Heart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Blood Pressure Longitudinal Profile</h3>
              <p className="text-xs text-slate-400">Systolic & Diastolic tracking with optimal target zone (&lt;120/80 mmHg)</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-rose-500 rounded" />
              <span className="text-slate-300">Systolic</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-indigo-400 rounded" />
              <span className="text-slate-300">Diastolic</span>
            </div>
          </div>
        </div>

        {bpChartData.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            No blood pressure logs in this time window.
          </div>
        ) : (
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bpChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis domain={[50, 190]} stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
                />
                {/* Target optimal range reference area */}
                <ReferenceArea y1={60} y2={120} fill="#14b8a6" fillOpacity={0.06} />
                <ReferenceLine y={120} stroke="#14b8a6" strokeDasharray="3 3" label={{ value: 'Target 120 Systolic', fill: '#14b8a6', fontSize: 10, position: 'insideTopRight' }} />
                <ReferenceLine y={80} stroke="#818cf8" strokeDasharray="3 3" label={{ value: 'Target 80 Diastolic', fill: '#818cf8', fontSize: 10, position: 'insideBottomRight' }} />

                <Line
                  type="monotone"
                  dataKey="systolic"
                  name="Systolic (mmHg)"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#f43f5e' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="diastolic"
                  name="Diastolic (mmHg)"
                  stroke="#818cf8"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#818cf8' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Chart 2: Blood Sugar Trends */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Droplets className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Blood Glucose Dynamics</h3>
              <p className="text-xs text-slate-400">ADA target fasting (&lt;100 mg/dL) and post-meal target (&lt;140 mg/dL)</p>
            </div>
          </div>
        </div>

        {sugarChartData.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            No blood glucose logs in this time window.
          </div>
        ) : (
          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sugarChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="sugarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop stopColor="#06b6d4" stopOpacity={0.25} />
                    <stop stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis domain={[60, 220]} stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <ReferenceLine y={100} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Fasting Target (<100)', fill: '#10b981', fontSize: 10 }} />
                <ReferenceLine y={140} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Post-Meal Target (<140)', fill: '#f59e0b', fontSize: 10 }} />

                <Area
                  type="monotone"
                  dataKey="value"
                  name="Glucose (mg/dL)"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fill="url(#sugarGrad)"
                  dot={{ r: 4, fill: '#06b6d4' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Chart 3: Pulse Trends */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Resting Pulse Profile</h3>
              <p className="text-xs text-slate-400">AHA normal adult resting baseline band (60 - 100 BPM)</p>
            </div>
          </div>
        </div>

        {pulseChartData.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            No pulse logs in this time window.
          </div>
        ) : (
          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pulseChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis domain={[40, 130]} stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <ReferenceArea y1={60} y2={100} fill="#6366f1" fillOpacity={0.07} />
                <Line
                  type="monotone"
                  dataKey="bpm"
                  name="Pulse (BPM)"
                  stroke="#a855f7"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#a855f7' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
