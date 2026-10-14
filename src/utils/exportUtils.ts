import { jsPDF } from 'jspdf';
import { HealthRecord, Medication, UserProfile } from '../types';

export function exportHealthRecordsToCSV(records: HealthRecord[], patientName: string) {
  if (!records || !records.length) {
    throw new Error('No records available to export.');
  }

  const headers = [
    'Record ID',
    'Date',
    'Time',
    'Measurement Type',
    'Primary Value',
    'Secondary Value',
    'Unit',
    'Category',
    'Context / Position',
    'Notes',
    'Is Sample Data',
  ];

  const rows = records.map((r) => {
    const d = new Date(r.timestamp);
    const dateStr = d.toLocaleDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let typeStr: string = r.type;
    let primVal = '';
    let secVal = '';
    let unit = '';
    let cat = '';
    let context = '';

    if (r.type === 'blood_pressure') {
      typeStr = 'Blood Pressure';
      primVal = String(r.systolic || '');
      secVal = String(r.diastolic || '');
      unit = 'mmHg';
      cat = r.bpCategory || '';
      context = `${r.arm || 'left'} arm, ${r.position || 'sitting'}`;
    } else if (r.type === 'blood_sugar') {
      typeStr = 'Blood Sugar';
      primVal = String(r.bloodSugarValue || '');
      unit = r.bloodSugarUnit || 'mg/dL';
      cat = r.sugarCategory || '';
      context = r.bloodSugarContext || 'fasting';
    } else if (r.type === 'pulse') {
      typeStr = 'Pulse Rate';
      primVal = String(r.pulseBpm || '');
      unit = 'BPM';
      cat = r.pulseCategory || '';
      context = `${r.pulseRhythm || 'regular'}, ${r.pulseContext || 'resting'}`;
    }

    const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;

    return [
      escapeCsv(r.id),
      escapeCsv(dateStr),
      escapeCsv(timeStr),
      escapeCsv(typeStr),
      escapeCsv(primVal),
      escapeCsv(secVal),
      escapeCsv(unit),
      escapeCsv(cat),
      escapeCsv(context),
      escapeCsv(r.notes || ''),
      escapeCsv(r.isSample ? 'Yes' : 'No'),
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanName = patientName.replace(/\s+/g, '_');
  link.setAttribute('download', `Heal_Whisper_Records_${cleanName}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportHealthReportToPDF(
  records: HealthRecord[],
  medications: Medication[],
  patient: UserProfile,
  dateRangeText: string = 'Recent Observations'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 40;

  // Header Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 80, 'F');

  // Brand Title
  doc.setTextColor(20, 184, 166); // teal-500
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('HEAL-WHISPER-GUIDE', 40, 42);

  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFont('helvetica', 'normal');
  doc.text('Clinical Digital Health Summary & Patient Log', 40, 58);

  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 190, 42);
  doc.text(`Window: ${dateRangeText}`, pageWidth - 190, 56);

  y = 110;

  // Patient Profile Card
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(40, y, pageWidth - 80, 60, 4, 4, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Patient: ${patient.name}`, 55, y + 22);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Email: ${patient.email}`, 55, y + 40);
  doc.text(`Blood Group: ${patient.bloodType || 'Unknown'}`, 240, y + 22);
  doc.text(`DOB: ${patient.dateOfBirth || 'Not specified'}`, 240, y + 40);
  doc.text(`Weight: ${patient.weightKg ? `${patient.weightKg} kg` : 'N/A'}`, 400, y + 22);
  doc.text(`Height: ${patient.heightCm ? `${patient.heightCm} cm` : 'N/A'}`, 400, y + 40);

  y += 85;

  // Metrics Aggregate Summary
  const bpRecords = records.filter((r) => r.type === 'blood_pressure' && r.systolic && r.diastolic);
  const sugarRecords = records.filter((r) => r.type === 'blood_sugar' && r.bloodSugarValue);
  const pulseRecords = records.filter((r) => r.type === 'pulse' && r.pulseBpm);

  const avgSys = bpRecords.length
    ? Math.round(bpRecords.reduce((acc, r) => acc + (r.systolic || 0), 0) / bpRecords.length)
    : null;
  const avgDia = bpRecords.length
    ? Math.round(bpRecords.reduce((acc, r) => acc + (r.diastolic || 0), 0) / bpRecords.length)
    : null;
  const avgSugar = sugarRecords.length
    ? Math.round(sugarRecords.reduce((acc, r) => acc + (r.bloodSugarValue || 0), 0) / sugarRecords.length)
    : null;
  const avgPulse = pulseRecords.length
    ? Math.round(pulseRecords.reduce((acc, r) => acc + (r.pulseBpm || 0), 0) / pulseRecords.length)
    : null;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Key Vital Averages', 40, y);
  y += 15;

  const boxW = (pageWidth - 80 - 30) / 4;
  const metrics = [
    { label: 'Avg Blood Pressure', val: avgSys ? `${avgSys}/${avgDia} mmHg` : 'N/A', count: `${bpRecords.length} logs` },
    { label: 'Avg Blood Glucose', val: avgSugar ? `${avgSugar} mg/dL` : 'N/A', count: `${sugarRecords.length} logs` },
    { label: 'Avg Resting Pulse', val: avgPulse ? `${avgPulse} BPM` : 'N/A', count: `${pulseRecords.length} logs` },
    { label: 'Total Tracked', val: `${records.length} readings`, count: 'In this period' },
  ];

  metrics.forEach((m, idx) => {
    const bx = 40 + idx * (boxW + 10);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(bx, y, boxW, 44, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, bx + 8, y + 14);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(m.val, bx + 8, y + 28);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(m.count, bx + 8, y + 38);
  });

  y += 65;

  // Active Medications Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Current Medication Regimen', 40, y);
  y += 14;

  if (medications.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text('No active medications on record.', 40, y);
    y += 20;
  } else {
    // Header row
    doc.setFillColor(226, 232, 240);
    doc.rect(40, y, pageWidth - 80, 18, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Medication', 45, y + 12);
    doc.text('Dosage', 160, y + 12);
    doc.text('Frequency', 240, y + 12);
    doc.text('Times', 330, y + 12);
    doc.text('Special Instructions', 420, y + 12);
    y += 18;

    medications.slice(0, 5).forEach((med, i) => {
      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(40, y, pageWidth - 80, 16, 'F');
      }
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(med.name, 45, y + 11);
      doc.text(med.dosage, 160, y + 11);
      doc.text(med.frequency.replace('_', ' '), 240, y + 11);
      doc.text(med.scheduledTimes.join(', '), 330, y + 11);
      doc.text((med.instructions || 'As directed').slice(0, 24), 420, y + 11);
      y += 16;
    });
    y += 10;
  }

  // Recent Vital Readings Table
  y += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Recent Clinical Vital Logs', 40, y);
  y += 14;

  // Table header
  doc.setFillColor(20, 184, 166); // teal-500
  doc.rect(40, y, pageWidth - 80, 18, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Timestamp', 45, y + 12);
  doc.text('Metric', 140, y + 12);
  doc.text('Reading & Units', 230, y + 12);
  doc.text('Classification', 330, y + 12);
  doc.text('Clinical Notes', 440, y + 12);
  y += 18;

  const displayRecords = records.slice(0, 14);
  displayRecords.forEach((r, i) => {
    if (y > 750) {
      doc.addPage();
      y = 40;
    }
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(40, y, pageWidth - 80, 16, 'F');
    }

    const d = new Date(r.timestamp);
    const dateFormatted = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    let metric = '';
    let valStr = '';
    let cat = '';

    if (r.type === 'blood_pressure') {
      metric = 'Blood Pressure';
      valStr = `${r.systolic}/${r.diastolic} mmHg`;
      cat = r.bpCategory ? r.bpCategory.replace(/_/g, ' ') : '';
    } else if (r.type === 'blood_sugar') {
      metric = `Blood Sugar (${r.bloodSugarContext || 'fasting'})`;
      valStr = `${r.bloodSugarValue} ${r.bloodSugarUnit || 'mg/dL'}`;
      cat = r.sugarCategory || '';
    } else {
      metric = 'Pulse (Heart Rate)';
      valStr = `${r.pulseBpm} BPM`;
      cat = r.pulseCategory || '';
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(dateFormatted, 45, y + 11);
    doc.text(metric, 140, y + 11);
    doc.text(valStr, 230, y + 11);
    doc.text(cat.slice(0, 18), 330, y + 11);
    doc.text((r.notes || '-').slice(0, 25), 440, y + 11);
    y += 16;
  });

  // Footer & Disclaimer
  const footerY = 790;
  doc.setDrawColor(203, 213, 225);
  doc.line(40, footerY - 15, pageWidth - 40, footerY - 15);
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'CLINICAL NOTICE: Heal-Whisper-Guide provides wellness tracking and educational data collation. It does not constitute',
    40,
    footerY - 4
  );
  doc.text(
    'a medical diagnosis or prescription. Share these logs with your licensed healthcare provider for clinical interpretation.',
    40,
    footerY + 6
  );

  const cleanName = patient.name.replace(/\s+/g, '_');
  doc.save(`Heal_Whisper_Health_Report_${cleanName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
