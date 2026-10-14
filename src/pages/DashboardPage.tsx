import React, { useState, useEffect, useMemo } from 'react';
import {
  Heart,
  Droplets,
  Activity,
  Pill,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Plus,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Check,
  X,
  FileText,
  Mic,
  Bot,
  FileDown,
  FileSpreadsheet,
  Lightbulb,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { HealthRecord, Medication, DoseLog } from '../types';
import {
  classifyBloodPressure,
  classifyBloodSugar,
  classifyPulse,
} from '../utils/healthCalculators';
import { exportHealthRecordsToCSV, exportHealthReportToPDF } from '../utils/exportUtils';
import { HealthAlerts } from '../components/HealthAlerts';
import { HealthTipsSection } from '../components/HealthTipsSection';
import { PageId } from '../components/Navigation';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts';

interface DashboardPageProps {
  onNavigate: (page: PageId) => void;
  onOpenQuickLog: () => void;
  dateRange: string;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenQuickLog,
  dateRange,
}) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [doses, setDoses] = useState<DoseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordingDoseId, setRecordingDoseId] = useState<string | null>(null);

  // Health Insights state
  const [insights, setInsights] = useState<{
    category: 'cardiovascular' | 'metabolic' | 'pulse' | 'adherence';
    title: string;
    description: string;
    status: 'positive' | 'warning' | 'alert' | 'neutral';
    recommendation: string;
  }[]>([]);
  const [overallAssessment, setOverallAssessment] = useState<string>('');
  const [summaryScore, setSummaryScore] = useState<string>('');
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsConfigured, setInsightsConfigured] = useState(false);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string>('');

  // Export state & notifications
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);
  const [exportNotice, setExportNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const deriveLocalInsights = (recordsToUse = records, dosesToUse = doses) => {
    const bpRecs = recordsToUse.filter((r) => r.type === 'blood_pressure' && r.systolic && r.diastolic);
    const sugarRecs = recordsToUse.filter((r) => r.type === 'blood_sugar' && r.bloodSugarValue);
    const pulseRecs = recordsToUse.filter((r) => r.type === 'pulse' && r.pulseBpm);

    const avgSys = bpRecs.length ? Math.round(bpRecs.reduce((a, b) => a + (b.systolic || 0), 0) / bpRecs.length) : null;
    const avgDia = bpRecs.length ? Math.round(bpRecs.reduce((a, b) => a + (b.diastolic || 0), 0) / bpRecs.length) : null;
    const avgSugar = sugarRecs.length ? Math.round(sugarRecs.reduce((a, b) => a + (b.bloodSugarValue || 0), 0) / sugarRecs.length) : null;
    const avgPulse = pulseRecs.length ? Math.round(pulseRecs.reduce((a, b) => a + (b.pulseBpm || 0), 0) / pulseRecs.length) : null;

    const totalDoses = dosesToUse.length;
    const takenDoses = dosesToUse.filter((d) => d.status === 'taken').length;
    const adherencePct = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 100;

    const items: {
      category: 'cardiovascular' | 'metabolic' | 'pulse' | 'adherence';
      title: string;
      description: string;
      status: 'positive' | 'warning' | 'alert' | 'neutral';
      recommendation: string;
    }[] = [];

    // 1. Cardiovascular Insight
    if (avgSys && avgDia) {
      if (avgSys < 120 && avgDia < 80) {
        items.push({
          category: 'cardiovascular',
          title: 'Optimal Blood Pressure Baseline',
          description: `Average arterial reading of ${avgSys}/${avgDia} mmHg is well within the 2017 ACC/AHA optimal cardiovascular window (<120/80 mmHg).`,
          status: 'positive',
          recommendation: 'Maintain current physical activity and balanced hydration habits.',
        });
      } else if (avgSys <= 129 && avgDia < 80) {
        items.push({
          category: 'cardiovascular',
          title: 'Elevated Systolic Pressure',
          description: `Average blood pressure (${avgSys}/${avgDia} mmHg) indicates elevated systolic pressure prior to Stage 1 hypertension.`,
          status: 'warning',
          recommendation: 'Target dietary sodium reduction (<2,000 mg/day) and 30 minutes of aerobic exercise.',
        });
      } else {
        items.push({
          category: 'cardiovascular',
          title: 'Hypertensive Range Observed',
          description: `Average reading of ${avgSys}/${avgDia} mmHg falls into Stage 1 or 2 hypertension thresholds.`,
          status: 'alert',
          recommendation: 'Share this log with your physician. Ensure strict medication timing and limit caffeine intake.',
        });
      }
    }

    // 2. Metabolic Insight
    if (avgSugar) {
      if (avgSugar < 100) {
        items.push({
          category: 'metabolic',
          title: 'Healthy Glycemic Range',
          description: `Average blood glucose of ${avgSugar} mg/dL aligns with normal fasting glycemic thresholds (<100 mg/dL).`,
          status: 'positive',
          recommendation: 'Continue complex carbohydrate meals with adequate dietary fiber.',
        });
      } else if (avgSugar <= 125) {
        items.push({
          category: 'metabolic',
          title: 'Borderline Fasting Glucose',
          description: `Average glucose of ${avgSugar} mg/dL is within the impaired fasting glucose / pre-diabetes evaluation window (100 - 125 mg/dL).`,
          status: 'warning',
          recommendation: 'Consider scheduling an HbA1c test with your primary care clinician.',
        });
      } else {
        items.push({
          category: 'metabolic',
          title: 'Elevated Glucose Readings',
          description: `Average glucose of ${avgSugar} mg/dL is elevated above normal fasting parameters.`,
          status: 'alert',
          recommendation: 'Review carbohydrate timing and discuss results with your healthcare provider.',
        });
      }
    }

    // 3. Pulse Insight
    if (avgPulse) {
      if (avgPulse >= 60 && avgPulse <= 100) {
        items.push({
          category: 'pulse',
          title: 'Normal Resting Heart Rate',
          description: `Your average pulse of ${avgPulse} BPM indicates normal resting sinoatrial pacing (60 - 100 BPM).`,
          status: 'positive',
          recommendation: 'Good cardiovascular endurance. Restful sleep supports this resting baseline.',
        });
      } else if (avgPulse > 100) {
        items.push({
          category: 'pulse',
          title: 'Elevated Resting Pulse',
          description: `Average pulse of ${avgPulse} BPM exceeds 100 BPM at rest.`,
          status: 'warning',
          recommendation: 'Check hydration and evaluate caffeine, emotional stress, or recent exertion.',
        });
      } else {
        items.push({
          category: 'pulse',
          title: 'Athletic / Low Resting Pulse',
          description: `Average pulse of ${avgPulse} BPM is below 60 BPM.`,
          status: 'neutral',
          recommendation: 'Common in aerobic athletes; notify physician if accompanied by fatigue or dizziness.',
        });
      }
    }

    // 4. Adherence Insight
    items.push({
      category: 'adherence',
      title: adherencePct >= 85 ? 'Therapeutic Adherence Target Met' : 'Medication Adherence Gap',
      description: `Current adherence score is ${adherencePct}% (${takenDoses} of ${totalDoses} doses logged on schedule).`,
      status: adherencePct >= 85 ? 'positive' : 'warning',
      recommendation:
        adherencePct >= 85
          ? 'Great adherence! Consistent dosing ensures stable therapeutic blood concentrations.'
          : 'Set daily morning and evening reminders to avoid missed doses.',
    });

    setInsights(items);
    setOverallAssessment('Based on clinical guidelines (ACC/AHA 2017 & ADA), your physiological vitals indicate stable therapeutic tracking.');
    setSummaryScore(`${adherencePct}% Adherence`);
    setLastAnalyzedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  const loadHealthInsights = async (customRecords = records, customDoses = doses) => {
    try {
      setInsightsLoading(true);
      const res = await api.getHealthInsights();
      if (res && res.insights && res.insights.length > 0) {
        setInsights(res.insights);
        setOverallAssessment(res.overallAssessment || '');
        setSummaryScore(res.summaryScore || '');
        setInsightsConfigured(Boolean(res.configured));
        setLastAnalyzedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        return;
      }
    } catch (err) {
      console.warn('Backend insights service error, falling back to local clinical telemetry:', err);
    } finally {
      setInsightsLoading(false);
    }

    deriveLocalInsights(customRecords, customDoses);
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [recRes, medRes, doseRes] = await Promise.all([
        api.getRecords(),
        api.getMedications(),
        api.getDoses(),
      ]);
      const fetchedRecords = recRes.records || [];
      const fetchedMeds = medRes.medications || [];
      const fetchedDoses = doseRes.doses || [];

      setRecords(fetchedRecords);
      setMedications(fetchedMeds);
      setDoses(fetchedDoses);

      // Load health insights with freshly fetched records
      loadHealthInsights(fetchedRecords, fetchedDoses);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Filter records based on dateRange
  const filteredRecords = useMemo(() => {
    if (dateRange === 'all') return records;
    const now = Date.now();
    const days = dateRange === '7d' ? 7 : dateRange === '14d' ? 14 : dateRange === '30d' ? 30 : 90;
    const cutoff = new Date(now - days * 86400000).toISOString();
    return records.filter((r) => r.timestamp >= cutoff);
  }, [records, dateRange]);

  // Latest readings by type
  const bpRecords = useMemo(
    () => filteredRecords.filter((r) => r.type === 'blood_pressure'),
    [filteredRecords]
  );
  const sugarRecords = useMemo(
    () => filteredRecords.filter((r) => r.type === 'blood_sugar'),
    [filteredRecords]
  );
  const pulseRecords = useMemo(
    () => filteredRecords.filter((r) => r.type === 'pulse'),
    [filteredRecords]
  );

  const latestBP = bpRecords[0];
  const previousBP = bpRecords[1];

  const latestSugar = sugarRecords[0];
  const previousSugar = sugarRecords[1];

  const latestPulse = pulseRecords[0];
  const previousPulse = pulseRecords[1];

  // Adherence calculation
  const adherenceStats = useMemo(() => {
    const totalDoses = doses.length;
    if (!totalDoses) return { percent: 100, taken: 0, scheduled: 0 };
    const takenDoses = doses.filter((d) => d.status === 'taken').length;
    const percent = Math.round((takenDoses / totalDoses) * 100);
    return { percent, taken: takenDoses, scheduled: totalDoses };
  }, [doses]);

  // Handle Dose action directly from dashboard
  const handleRecordDose = async (medId: string, scheduledTime: string, status: 'taken' | 'skipped') => {
    setRecordingDoseId(medId);
    try {
      await api.recordDose(medId, { scheduledTime, status });
      const doseRes = await api.getDoses();
      setDoses(doseRes.doses || []);
      const medRes = await api.getMedications();
      setMedications(medRes.medications || []);
    } catch (err) {
      console.error('Failed to log dose:', err);
    } finally {
      setRecordingDoseId(null);
    }
  };

  // Export handlers
  const handleExportPDF = () => {
    if (!user) return;
    if (filteredRecords.length === 0) {
      setExportNotice({
        type: 'error',
        message: 'No health records found in the selected date window to export.',
      });
      setTimeout(() => setExportNotice(null), 4000);
      return;
    }

    try {
      setExporting('pdf');
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
      setExportNotice({
        type: 'success',
        message: 'Clinical Health PDF summary report generated and downloaded.',
      });
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err: any) {
      setExportNotice({
        type: 'error',
        message: err.message || 'Failed to generate PDF report.',
      });
      setTimeout(() => setExportNotice(null), 4000);
    } finally {
      setExporting(null);
    }
  };

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      setExportNotice({
        type: 'error',
        message: 'No health records found in the selected date window to export.',
      });
      setTimeout(() => setExportNotice(null), 4000);
      return;
    }

    try {
      setExporting('csv');
      exportHealthRecordsToCSV(filteredRecords, user?.name || 'Patient');
      setExportNotice({
        type: 'success',
        message: 'Telemetry CSV spreadsheet downloaded successfully.',
      });
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err: any) {
      setExportNotice({
        type: 'error',
        message: err.message || 'Failed to export CSV.',
      });
      setTimeout(() => setExportNotice(null), 4000);
    } finally {
      setExporting(null);
    }
  };

  // Mini chart data
  const miniChartData = useMemo(() => {
    const sorted = [...bpRecords].reverse().slice(-7);
    return sorted.map((r) => ({
      time: new Date(r.timestamp).toLocaleDateString(undefined, { weekday: 'short' }),
      systolic: r.systolic,
      diastolic: r.diastolic,
    }));
  }, [bpRecords]);

  // Greeting by hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const todayDateStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950/40 to-slate-900 border border-slate-800 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono tracking-widest text-teal-400 uppercase font-semibold">
                Patient Monitoring Console
              </span>
              {records.some((r) => r.isSample) && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Includes Sample Data
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {greeting}, {user?.name || 'Patient'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Your physiological vitals are being actively monitored with MedPin precision. MedDroid voice assistant and VADG lab parser are ready for clinical guidance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Export Actions */}
            <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-xl p-1">
              <button
                onClick={handleExportPDF}
                disabled={exporting !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-rose-300 hover:text-rose-200 text-xs font-semibold border border-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
                title="Download Comprehensive Clinical PDF Summary"
              >
                {exporting === 'pdf' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-400" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 text-rose-400" />
                )}
                <span>Export PDF</span>
              </button>

              <button
                onClick={handleExportCSV}
                disabled={exporting !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-300 hover:text-emerald-200 text-xs font-semibold border border-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                title="Download Raw Telemetry CSV Spreadsheet"
              >
                {exporting === 'csv' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>Export CSV</span>
              </button>
            </div>

            <button
              onClick={() => onNavigate('voice-assistant')}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-teal-300 border border-teal-500/30 text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Mic className="w-4 h-4 text-teal-400" />
              <span>Ask MedDroid AI</span>
            </button>
            <button
              onClick={onOpenQuickLog}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Log Reading</span>
            </button>
          </div>
        </div>
      </div>

      {/* Export Feedback Banner */}
      {exportNotice && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200 border ${
            exportNotice.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {exportNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span className="font-medium">{exportNotice.message}</span>
          </div>
          <button
            onClick={() => setExportNotice(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary Vital Metric Cards (BP, Glucose, Pulse) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Blood Pressure Card */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Blood Pressure</h3>
                <span className="text-[11px] text-slate-400">Systolic / Diastolic</span>
              </div>
            </div>
            {latestBP && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${classifyBloodPressure(latestBP.systolic!, latestBP.diastolic!).badgeClass}`}>
                {classifyBloodPressure(latestBP.systolic!, latestBP.diastolic!).label}
              </span>
            )}
          </div>

          {latestBP ? (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
                  {latestBP.systolic}/{latestBP.diastolic}
                </span>
                <span className="text-xs text-slate-400">mmHg</span>
              </div>

              {/* Comparison Delta */}
              {previousBP && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  {latestBP.systolic! > previousBP.systolic! ? (
                    <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>
                    {Math.abs(latestBP.systolic! - previousBP.systolic!)} mmHg vs prior (
                    {new Date(previousBP.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })})
                  </span>
                </div>
              )}

              {/* Mini Sparkline Chart */}
              {miniChartData.length > 2 && (
                <div className="h-14 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={miniChartData}>
                      <defs>
                        <linearGradient id="bpGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop stopColor="#f43f5e" stopOpacity={0.3} />
                          <stop stopColor="#f43f5e" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="systolic" stroke="#f43f5e" strokeWidth={2} fill="url(#bpGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500">
              No blood pressure recorded yet.
            </div>
          )}

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">
              {latestBP ? `Logged ${new Date(latestBP.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Target: <120/80 mmHg'}
            </span>
            <button
              onClick={() => onNavigate('tracking')}
              className="text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold text-[11px]"
            >
              <span>History</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Blood Sugar Card */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Blood Glucose</h3>
                <span className="text-[11px] text-slate-400">
                  {latestSugar?.bloodSugarContext ? `${latestSugar.bloodSugarContext} check` : 'Fasting / Post-meal'}
                </span>
              </div>
            </div>
            {latestSugar && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${classifyBloodSugar(latestSugar.bloodSugarValue!, latestSugar.bloodSugarUnit, latestSugar.bloodSugarContext).badgeClass}`}>
                {classifyBloodSugar(latestSugar.bloodSugarValue!, latestSugar.bloodSugarUnit, latestSugar.bloodSugarContext).label}
              </span>
            )}
          </div>

          {latestSugar ? (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
                  {latestSugar.bloodSugarValue}
                </span>
                <span className="text-xs text-slate-400">{latestSugar.bloodSugarUnit || 'mg/dL'}</span>
              </div>

              {previousSugar && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  {latestSugar.bloodSugarValue! > previousSugar.bloodSugarValue! ? (
                    <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>
                    {Math.abs(latestSugar.bloodSugarValue! - previousSugar.bloodSugarValue!)} {latestSugar.bloodSugarUnit} vs prior
                  </span>
                </div>
              )}

              <div className="h-14 flex items-center">
                <div className="w-full bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                  {classifyBloodSugar(latestSugar.bloodSugarValue!, latestSugar.bloodSugarUnit, latestSugar.bloodSugarContext).advice}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500">
              No glucose readings recorded yet.
            </div>
          )}

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">
              {latestSugar ? `Logged ${new Date(latestSugar.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Normal fasting: 70-99 mg/dL'}
            </span>
            <button
              onClick={() => onNavigate('tracking')}
              className="text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold text-[11px]"
            >
              <span>History</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Pulse / Heart Rate Card */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Pulse Rate</h3>
                <span className="text-[11px] text-slate-400">
                  {latestPulse?.pulseContext ? `${latestPulse.pulseContext} rhythm` : 'Resting Beats / Min'}
                </span>
              </div>
            </div>
            {latestPulse && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${classifyPulse(latestPulse.pulseBpm!).badgeClass}`}>
                {classifyPulse(latestPulse.pulseBpm!).label}
              </span>
            )}
          </div>

          {latestPulse ? (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
                  {latestPulse.pulseBpm}
                </span>
                <span className="text-xs text-slate-400">BPM</span>
              </div>

              {previousPulse && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span>
                    Δ {latestPulse.pulseBpm! - previousPulse.pulseBpm!} BPM from prior log ({latestPulse.pulseRhythm || 'regular'})
                  </span>
                </div>
              )}

              <div className="h-14 flex items-center">
                <div className="w-full bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                  {classifyPulse(latestPulse.pulseBpm!).advice}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500">
              No pulse readings recorded yet.
            </div>
          )}

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">
              {latestPulse ? `Logged ${new Date(latestPulse.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Normal resting: 60-100 BPM'}
            </span>
            <button
              onClick={() => onNavigate('tracking')}
              className="text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold text-[11px]"
            >
              <span>History</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Clinical Health Insights & AI Analysis Section */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-teal-950/20 border border-slate-800 p-6 sm:p-7 space-y-6 shadow-xl">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Clinical Health Insights & Physiological Analysis
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30">
                  {insightsConfigured ? 'Gemini 3.8 Flash Active' : 'ACC/AHA & ADA Engine'}
                </span>
                {summaryScore && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {summaryScore}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-metric synthesis evaluating cardiovascular baseline, metabolic control, and medication compliance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {lastAnalyzedAt && (
              <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                Updated {lastAnalyzedAt}
              </span>
            )}
            <button
              onClick={() => loadHealthInsights()}
              disabled={insightsLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white border border-teal-500/20 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${insightsLoading ? 'animate-spin' : ''}`} />
              <span>{insightsLoading ? 'Analyzing...' : 'Re-analyze Vitals'}</span>
            </button>
          </div>
        </div>

        {/* Overall Assessment Callout */}
        <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
          <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-semibold text-teal-400 uppercase tracking-wider">
                Physiological Baseline Assessment
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Window: {dateRange === 'all' ? 'All records' : dateRange}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {overallAssessment ||
                'Based on clinical guidelines (ACC/AHA 2017 & ADA), your physiological vitals indicate stable therapeutic tracking.'}
            </p>
          </div>
        </div>

        {/* 4-Category Insights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {insights.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-slate-500">
              {insightsLoading ? 'Analyzing physiological patterns...' : 'No telemetry data logged yet to generate clinical insights.'}
            </div>
          ) : (
            insights.map((item, idx) => {
              let Icon = Activity;
              let iconColor = 'text-indigo-400';
              let iconBg = 'bg-indigo-500/10 border-indigo-500/20';

              if (item.category === 'cardiovascular') {
                Icon = Heart;
                iconColor = 'text-rose-400';
                iconBg = 'bg-rose-500/10 border-rose-500/20';
              } else if (item.category === 'metabolic') {
                Icon = Droplets;
                iconColor = 'text-cyan-400';
                iconBg = 'bg-cyan-500/10 border-cyan-500/20';
              } else if (item.category === 'pulse') {
                Icon = Activity;
                iconColor = 'text-indigo-400';
                iconBg = 'bg-indigo-500/10 border-indigo-500/20';
              } else if (item.category === 'adherence') {
                Icon = Pill;
                iconColor = 'text-teal-400';
                iconBg = 'bg-teal-500/10 border-teal-500/20';
              }

              let statusBadge = (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Optimal
                </span>
              );
              if (item.status === 'warning') {
                statusBadge = (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Attention
                  </span>
                );
              } else if (item.status === 'alert') {
                statusBadge = (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Out of Range
                  </span>
                );
              } else if (item.status === 'neutral') {
                statusBadge = (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    Stable
                  </span>
                );
              }

              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-slate-950/60 border border-slate-800/80 p-4 space-y-3 flex flex-col justify-between hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className={`w-8 h-8 rounded-xl ${iconBg} border flex items-center justify-center ${iconColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {statusBadge}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-white tracking-tight">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                    </div>
                  </div>

                  {item.recommendation && (
                    <div className="pt-2.5 border-t border-slate-900/80 flex items-start gap-1.5 text-[11px] text-slate-300">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-slate-400 text-[10.5px] leading-tight">
                        <strong className="text-slate-300 font-semibold">Advice: </strong>
                        {item.recommendation}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Clinical Disclaimer */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10.5px] text-slate-500 border-t border-slate-800/50 font-mono">
          <span>Clinical Framework: ACC/AHA 2017 BP Guidelines • ADA 2024 Standards of Care</span>
          <span>Educational wellness guidance only • Not a medical diagnosis</span>
        </div>
      </div>

      {/* HealthAlerts: Telemetry Anomaly & Established Trend Monitor */}
      <HealthAlerts
        records={records}
        userId={user?.id || 'demo_user'}
        onOpenQuickLog={onOpenQuickLog}
        onNavigate={onNavigate}
      />

      {/* Middle Section: Medication Adherence & Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Medication Adherence Overview (1 col) */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-bold text-white">Medication Adherence</h3>
              </div>
              <span className="text-[11px] font-mono text-teal-400 font-semibold">Active Regimen</span>
            </div>
            <p className="text-xs text-slate-400">
              Calculated from scheduled vs recorded doses across your regimen.
            </p>
          </div>

          {/* Adherence Score Circle / Indicator */}
          <div className="py-6 flex flex-col items-center justify-center">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#1e293b"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#14b8a6"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * (1 - adherenceStats.percent / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-extrabold font-mono text-white">
                  {adherenceStats.percent}%
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Compliance</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                <span className="text-slate-300 font-medium">{adherenceStats.taken} Taken</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <span className="text-slate-400">{adherenceStats.scheduled - adherenceStats.taken} Missed/Pending</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('medications')}
            className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <span>Manage All Medications</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Today's Medication Schedule (2 cols) */}
        <div className="lg:col-span-2 rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Today's Medicine Schedule</span>
                <span className="text-xs font-mono font-normal text-slate-400">
                  ({todayDateStr})
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Confirm your doses to maintain your therapeutic compliance score.
              </p>
            </div>
            <button
              onClick={() => onNavigate('medications')}
              className="text-xs text-teal-400 hover:underline flex items-center gap-1 font-medium"
            >
              <span>+ Add Medicine</span>
            </button>
          </div>

          <div className="py-3 space-y-3">
            {medications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No active medications in your schedule. Click "+ Add Medicine" to start tracking.
              </div>
            ) : (
              medications.slice(0, 3).map((med) => {
                const scheduledTime = med.scheduledTimes[0] || '08:00';
                const doseKey = `${todayDateStr} ${scheduledTime}`;
                const loggedDose = doses.find(
                  (d) => d.medicationId === med.id && d.scheduledTime.startsWith(todayDateStr)
                );
                const isTaken = loggedDose?.status === 'taken';

                return (
                  <div
                    key={med.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs"
                        style={{ backgroundColor: `${med.colorHex || '#0d9488'}25`, color: med.colorHex || '#2dd4bf' }}
                      >
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{med.name}</h4>
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {med.dosage}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{med.scheduledTimes.join(', ')}</span>
                          {med.instructions && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[200px]">{med.instructions}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isTaken ? (
                        <span className="flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Taken</span>
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleRecordDose(med.id, doseKey, 'taken')}
                            disabled={recordingDoseId === med.id}
                            className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Mark Taken</span>
                          </button>
                          <button
                            onClick={() => handleRecordDose(med.id, doseKey, 'skipped')}
                            disabled={recordingDoseId === med.id}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
                            title="Skip this dose"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Showing active medicines for {new Date().toLocaleDateString(undefined, { weekday: 'long' })}</span>
            <button
              onClick={() => onNavigate('medications')}
              className="text-teal-400 hover:underline font-semibold"
            >
              View Full Regimen & Inventory →
            </button>
          </div>
        </div>
      </div>

      {/* Dedicated Daily Health & Wellness Tips Section */}
      <HealthTipsSection
        records={records}
        doses={doses}
        preferredLanguage={user?.preferredLanguage || 'en'}
      />

      {/* Feature Navigation Cards (MedDroid, VADG, Wellness Chat) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* MedDroid Card */}
        <div
          onClick={() => onNavigate('voice-assistant')}
          className="group rounded-2xl bg-gradient-to-br from-slate-900 to-teal-950/20 border border-slate-800 p-5 space-y-3 cursor-pointer hover:border-teal-500/40 hover:shadow-lg hover:shadow-teal-500/5 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
              <Mic className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-semibold">
              Voice AI
            </span>
          </div>
          <div>
            <h4 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors">
              MedDroid Voice Assistant
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Speak naturally in English or Bengali (বাংলা) to ask health and wellness questions with real-time waveform audio synthesis.
            </p>
          </div>
          <div className="pt-2 flex items-center gap-1 text-xs text-teal-400 font-semibold">
            <span>Start Voice Session</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* VADG Report Analyzer Card */}
        <div
          onClick={() => onNavigate('report-analyzer')}
          className="group rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/20 border border-slate-800 p-5 space-y-3 cursor-pointer hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
              VADG Parser
            </span>
          </div>
          <div>
            <h4 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
              VADG Medical Report Analyzer
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Upload PDF or image scans of clinical bloodwork and diagnostic tests for plain-language interpretation and physician question prompts.
            </p>
          </div>
          <div className="pt-2 flex items-center gap-1 text-xs text-indigo-400 font-semibold">
            <span>Analyze Diagnostic Scan</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* AI Wellness Chatbot Card */}
        <div
          onClick={() => onNavigate('wellness-chat')}
          className="group rounded-2xl bg-gradient-to-br from-slate-900 to-cyan-950/20 border border-slate-800 p-5 space-y-3 cursor-pointer hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <Bot className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold">
              Chatbot
            </span>
          </div>
          <div>
            <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
              AI Wellness & Clinical Educator
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Interactive text-based health educator for exploring medical concepts, symptoms context, nutrition, and cardiovascular fitness.
            </p>
          </div>
          <div className="pt-2 flex items-center gap-1 text-xs text-cyan-400 font-semibold">
            <span>Open Chat Session</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};
