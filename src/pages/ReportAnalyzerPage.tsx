import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  FileCheck,
  AlertTriangle,
  Sparkles,
  Download,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  FileDown,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MedicalReportAnalysis } from '../types';

export const ReportAnalyzerPage: React.FC = () => {
  const { systemStatus } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MedicalReportAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reportHistory, setReportHistory] = useState<MedicalReportAnalysis[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await api.getReportHistory();
        setReportHistory(res.reports || []);
      } catch (err) {
        console.warn('Could not load report history:', err);
      }
    };
    loadHistory();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 10 * 1024 * 1024) {
      setErrorMessage('File size exceeds 10MB limit. Please upload a smaller scan or crop the report.');
      return;
    }

    setFile(selected);

    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(selected);
  };

  const loadSampleReport = () => {
    setPastedText(`PATIENT LAB REPORT: COMPREHENSIVE METABOLIC & LIPID PANEL
Test Date: 2026-09-18
Ordering Physician: Dr. Marcus Welby, MD

TEST RESULTS:
1. Fasting Blood Glucose: 112 mg/dL [Reference Range: 70 - 99 mg/dL] — Flag: HIGH
2. Total Cholesterol: 218 mg/dL [Reference Range: < 200 mg/dL] — Flag: HIGH
3. HDL Cholesterol (Good): 54 mg/dL [Reference Range: > 40 mg/dL] — Flag: NORMAL
4. LDL Cholesterol (Calculated): 138 mg/dL [Reference Range: < 100 mg/dL] — Flag: ELEVATED
5. Serum Triglycerides: 165 mg/dL [Reference Range: < 150 mg/dL] — Flag: BORDERLINE HIGH
6. Serum Creatinine: 0.95 mg/dL [Reference Range: 0.70 - 1.30 mg/dL] — Flag: NORMAL
7. Blood Urea Nitrogen (BUN): 16 mg/dL [Reference Range: 7 - 20 mg/dL] — Flag: NORMAL
8. Potassium: 4.2 mEq/L [Reference Range: 3.5 - 5.1 mEq/L] — Flag: NORMAL
9. Sodium: 140 mEq/L [Reference Range: 136 - 145 mEq/L] — Flag: NORMAL

NOTES: Patient observed 12-hour overnight fast. Specimen non-hemolyzed.`);
    setFile(null);
    setFilePreview(null);
    setErrorMessage(null);
  };

  const handleAnalyze = async () => {
    if (!file && !pastedText.trim()) {
      setErrorMessage('Please either upload a lab report file or paste diagnostic text.');
      return;
    }

    setAnalyzing(true);
    setErrorMessage(null);

    try {
      let base64: string | undefined = undefined;
      let mimeType = 'image/jpeg';

      if (filePreview) {
        base64 = filePreview;
        mimeType = file?.type || 'image/jpeg';
      }

      const res = await api.analyzeReport({
        textContent: pastedText.trim() || undefined,
        imageBase64: base64,
        mimeType,
        fileName: file?.name || 'Pasted_Clinical_Lab_Report',
      });

      if (!res.configured && !res.analysis) {
        setErrorMessage(
          'Gemini AI is not configured. To activate the VADG Analyzer, provide your GEMINI_API_KEY in the Secrets panel.'
        );
      } else if (res.analysis) {
        setAnalysisResult(res.analysis);
        setReportHistory((prev) => [res.analysis!, ...prev]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to analyze report.');
    } finally {
      setAnalyzing(false);
    }
  };

  const downloadAnalysisSummary = () => {
    if (!analysisResult) return;
    const content = `HEAL-WHISPER-GUIDE — VADG MEDICAL REPORT ANALYSIS
==============================================================
Document Type: ${analysisResult.documentType}
Date Analyzed: ${new Date(analysisResult.analyzedAt).toLocaleString()}
Model: ${analysisResult.modelUsed}

PATIENT SUMMARY:
${analysisResult.plainLanguageSummary}

KEY LABORATORY FINDINGS:
${analysisResult.keyFindings
  .map(
    (f) =>
      `- ${f.testName}: ${f.value} ${f.unit || ''} [Ref: ${f.referenceRange || 'N/A'}] => ${f.status}\n  Significance: ${f.clinicalSignificance || 'Standard clinical parameter'}`
  )
  .join('\n')}

QUESTIONS FOR YOUR PHYSICIAN:
${analysisResult.questionsForDoctor.map((q, i) => `${i + 1}. ${q}`).join('\n')}

LIFESTYLE CONSIDERATIONS:
${analysisResult.lifestyleRecommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

DISCLAIMER:
${analysisResult.disclaimer}
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VADG_Report_Analysis_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono tracking-widest text-indigo-400 uppercase font-semibold">
                VADG Analytical Engine
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                Lab Parser
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              AI Medical Report Analyzer
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Upload laboratory scans, blood work summaries, or metabolic panels. VADG parses reference ranges, highlights flags, and suggests questions for your physician.
            </p>
          </div>

          <button
            onClick={loadSampleReport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs font-semibold shadow-sm transition-all cursor-pointer self-start md:self-auto shrink-0"
          >
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>Load Sample Lab Panel</span>
          </button>
        </div>
      </div>

      {/* Upload and Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File Drag & Drop Card */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between space-y-4 shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-400" />
                <span>Upload Report Document / Image</span>
              </h3>
              <span className="text-[11px] text-slate-500">PDF, PNG, JPG (&lt;10MB)</span>
            </div>

            <label className="mt-4 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-8 cursor-pointer transition-colors bg-slate-950/50">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              {filePreview ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold text-white">{file?.name}</span>
                  <span className="text-[10px] text-slate-400">
                    {Math.round((file?.size || 0) / 1024)} KB • Click to choose another
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2 text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold text-slate-200">
                    Click to select lab report file
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Supports high-resolution laboratory camera scans
                  </span>
                </div>
              )}
            </label>
          </div>

          <div className="text-[11px] text-slate-500">
            Files are transmitted securely to the server-side parser and not stored on public servers.
          </div>
        </div>

        {/* Text Area Card */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between space-y-4 shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Or Paste Laboratory Text</span>
              </h3>
              <button
                type="button"
                onClick={() => setPastedText('')}
                className="text-[11px] text-slate-500 hover:text-slate-300"
              >
                Clear Text
              </button>
            </div>

            <textarea
              rows={8}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste raw blood work, CBC, metabolic panel, or urinalysis text here..."
              className="mt-4 w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              {pastedText ? `${pastedText.length} characters ready` : 'No text pasted'}
            </span>
            <button
              onClick={handleAnalyze}
              disabled={analyzing || (!file && !pastedText.trim())}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 disabled:opacity-40 transition-all cursor-pointer"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>VADG Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run AI Lab Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Analysis Results View */}
      {analysisResult && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in">
          {/* Header of analysis */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono tracking-widest text-teal-400 uppercase font-semibold">
                  Parsed Report Overview
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {analysisResult.modelUsed}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight mt-1">
                {analysisResult.documentType}
              </h3>
              <p className="text-xs text-slate-400">
                Processed on {new Date(analysisResult.analyzedAt).toLocaleString()}
              </p>
            </div>

            <button
              onClick={downloadAnalysisSummary}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-semibold border border-slate-700 transition-colors self-start sm:self-auto cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-teal-400" />
              <span>Download Summary</span>
            </button>
          </div>

          {/* Patient-Friendly Plain Language Summary */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>Plain-Language Patient Summary</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
              {analysisResult.plainLanguageSummary}
            </p>
          </div>

          {/* Key Findings Table */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white">Extracted Laboratory Values & Flags</h4>
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/90 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Test Parameter</th>
                    <th className="py-3 px-4">Patient Value</th>
                    <th className="py-3 px-4">Standard Reference Range</th>
                    <th className="py-3 px-4">Flag / Status</th>
                    <th className="py-3 px-4">Clinical Significance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {analysisResult.keyFindings.map((finding, idx) => {
                    const statusClass =
                      finding.status === 'NORMAL'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : finding.status === 'HIGH' || finding.status === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : finding.status === 'LOW'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        : 'bg-slate-800 text-slate-300';

                    return (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-semibold text-white">
                          {finding.testName}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-200">
                          {finding.value} {finding.unit || ''}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono">
                          {finding.referenceRange || 'Reference not stated'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${statusClass}`}>
                            {finding.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-sm">
                          {finding.clinicalSignificance || 'Standard clinical marker'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Missing or Unclear info notice */}
          {analysisResult.missingOrUnclearInfo && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Unclear or Missing Document Information</span>
              </span>
              <p className="text-[11px] opacity-90">{analysisResult.missingOrUnclearInfo}</p>
            </div>
          )}

          {/* Questions for Your Doctor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-teal-400" />
                <span>Questions for Your Physician</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                {analysisResult.questionsForDoctor.map((q, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-teal-400 font-bold">•</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                <span>General Lifestyle Considerations</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                {analysisResult.lifestyleRecommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="pt-4 border-t border-slate-800 flex items-start gap-2.5 text-xs text-slate-500">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="italic">{analysisResult.disclaimer}</p>
          </div>
        </div>
      )}
    </div>
  );
};
