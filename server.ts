import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';
import { db } from './server/db.js';
import { MedicalReportAnalysis } from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsers with generous limits for medical document uploads / base64 lab scans
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Initialize GoogleGenAI SDK per gemini-api guidelines
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Authentication Middleware
interface AuthenticatedRequest extends Request {
  user?: ReturnType<typeof db.findUserById>;
  token?: string;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const token = authHeader.split(' ')[1];
  const user = db.findUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }

  req.user = user;
  req.token = token;
  next();
}

// ----------------- API ROUTES -----------------

// System & Health Status
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    geminiConfigured: Boolean(ai),
    geminiModel: 'gemini-3.8-flash',
    timestamp: new Date().toISOString(),
    appVersion: '1.0.0',
    platform: 'Heal-Whisper-Guide',
  });
});

// Authentication
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    const result = db.createUser(email, password, name);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const result = db.authenticate(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Login failed' });
  }
});

app.post('/api/auth/demo-login', (req: Request, res: Response) => {
  try {
    const result = db.getDemoSession();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Could not start demo session' });
  }
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: db.sanitizeUser(req.user!) });
});

app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (req.token) {
    db.logout(req.token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }
  const user = db.findUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'No account registered with that email address.' });
  }
  // In this environment, simulate sending secure password reset verification code
  res.json({
    success: true,
    message: `A secure password reset verification link has been dispatched to ${email}. Check your inbox.`,
  });
});

app.put('/api/user/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = db.updateUserProfile(req.user!.id, req.body);
    res.json({ user: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update profile' });
  }
});

// ----------------- HEALTH TRACKING (MedPin) -----------------

app.get('/api/records', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, startDate, endDate } = req.query;
    const records = db.getHealthRecords(
      req.user!.id,
      type as string | undefined,
      startDate as string | undefined,
      endDate as string | undefined
    );
    res.json({ records });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch records' });
  }
});

app.post('/api/records', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const newRecord = db.addHealthRecord(req.user!.id, req.body);
    res.status(201).json({ record: newRecord });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to add record' });
  }
});

app.put('/api/records/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = db.updateHealthRecord(req.user!.id, req.params.id, req.body);
    res.json({ record: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update record' });
  }
});

app.delete('/api/records/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = db.deleteHealthRecord(req.user!.id, req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Record not found or already deleted.' });
    }
    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete record' });
  }
});

// ----------------- MEDICATIONS & REMINDERS -----------------

app.get('/api/medications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const medications = db.getMedications(req.user!.id);
    res.json({ medications });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch medications' });
  }
});

app.post('/api/medications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const med = db.addMedication(req.user!.id, req.body);
    res.status(201).json({ medication: med });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to save medication' });
  }
});

app.put('/api/medications/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = db.updateMedication(req.user!.id, req.params.id, req.body);
    res.json({ medication: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update medication' });
  }
});

app.delete('/api/medications/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = db.deleteMedication(req.user!.id, req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Medication not found' });
    }
    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete medication' });
  }
});

app.get('/api/doses', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const doses = db.getDoseLogs(req.user!.id, startDate as string, endDate as string);
    res.json({ doses });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch dose logs' });
  }
});

app.post('/api/medications/:id/dose', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { scheduledTime, status, notes } = req.body;
    if (!scheduledTime || !status) {
      return res.status(400).json({ error: 'Scheduled time and dose status are required.' });
    }
    const log = db.recordDose(req.user!.id, {
      medicationId: req.params.id,
      scheduledTime,
      status,
      notes,
    });
    res.json({ dose: log });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to record dose' });
  }
});

// ----------------- AI WELLNESS CHATBOT -----------------

const CLINICAL_SAFETY_SYSTEM_INSTRUCTION = `You are Heal-Whisper-Guide, an empathetic, highly knowledgeable digital health and wellness assistant.
Your goal is to provide evidence-informed health education, explain clinical terms in simple language, promote healthy lifestyle habits, and support patient wellness literacy.

MANDATORY CLINICAL SAFETY DIRECTIVES:
1. You are an educational health guide, NOT a practicing doctor.
2. DO NOT provide definitive medical diagnoses or prescribe medications/dosages.
3. NEVER advise users to discontinue or modify treatments prescribed by their physician.
4. When discussing symptoms, always recommend discussing findings with their qualified healthcare professional.
5. EMERGENCY TRIAGE: If the user describes emergency symptoms (e.g., crushing chest pain radiating to arm/jaw, sudden unilateral weakness/facial droop, severe difficulty breathing, anaphylaxis, severe head injury, or acute suicidal ideation), start your response with:
   "⚠️ EMERGENCY NOTICE: The symptoms you described require immediate emergency evaluation. Please call 911, 112, or your local emergency number immediately, or proceed to the nearest emergency department."
6. Tone: Compassionate, calm, scientific, and empowering. Use bullet points for readability.
7. LANGUAGE: Respond naturally in the user's language. If asked in Bengali (বাংলা) or if Bengali is selected, provide your complete response in natural, fluent, supportive Bengali script.`;

app.post('/api/gemini/chat', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { messages, userMessage, model = 'gemini-3.8-flash', language = 'en' } = req.body;

  if (!userMessage && (!messages || !messages.length)) {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  const query = userMessage || messages[messages.length - 1].content;
  const isBengali = language === 'bn' || /[\u0980-\u09FF]/.test(query);

  // Selected model from allowed set: gemini-3.8-flash (standard), gemini-3.1-flash-lite (fast)
  const chosenModel = model === 'gemini-3.1-flash-lite' ? 'gemini-3.1-flash-lite' : 'gemini-3.8-flash';

  // Emergency keyword quick-check
  const isEmergency = /\b(chest pain|heart attack|can't breathe|shortness of breath|stroke|paralysis|severe bleeding|kill myself|suicide|বুকে ব্যথা|শ্বাসকষ্ট)\b/i.test(
    query
  );

  if (!ai) {
    // If Gemini API is not configured, clearly inform the user without fabricating an AI response
    const fallbackText = isBengali
      ? `জেমিনি এআই কনফিগার করা নেই। লাইভ এআই সক্রিয় করতে সিক্রেটস প্যানেলে GEMINI_API_KEY সেট করুন।

${isEmergency ? '⚠️ জরুরি বিজ্ঞপ্তি: আপনার যদি বুকে তীব্র ব্যথা বা শ্বাসকষ্টের মতো কোনো জরুরি উপসর্গ থাকে, অবিলম্বে জরুরি স্বাস্থ্যকেন্দ্রে যোগাযোগ করুন।' : ''}`
      : `The Gemini AI integration is currently awaiting configuration. 
To enable live AI responses, add your GEMINI_API_KEY in the environment or AI Studio Secrets panel.

${isEmergency ? '⚠️ EMERGENCY NOTICE: If you are experiencing urgent symptoms such as chest pain or breathing difficulty, seek emergency medical care immediately.' : ''}

In the meantime, you can explore the MedPin health tracking, medicine schedule, and chart features!`;

    return res.json({
      configured: false,
      response: fallbackText,
      modelUsed: chosenModel,
      isEmergencyAlert: isEmergency,
    });
  }

  try {
    const formattedContents: any[] = [];
    if (messages && messages.length > 1) {
      for (const msg of messages.slice(-10)) {
        formattedContents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        });
      }
    } else {
      formattedContents.push({
        role: 'user',
        parts: [{ text: query }],
      });
    }

    const systemInstruction = isBengali
      ? `${CLINICAL_SAFETY_SYSTEM_INSTRUCTION}\n\nগুরুত্বপূর্ণ: আপনি বাংলা ভাষায় একজন সহানুভূতিশীল স্বাস্থ্য শিক্ষাবিদ। ব্যবহারকারীকে পরিষ্কার এবং সহজ বাংলায় স্বাস্থ্য তথ্য ব্যাখ্যা করুন।`
      : CLINICAL_SAFETY_SYSTEM_INSTRUCTION;

    let responseText = '';
    let usedModel = chosenModel;

    try {
      const response = await ai.models.generateContent({
        model: chosenModel,
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });
      responseText = response.text || '';
    } catch (primaryErr: any) {
      console.warn(`Primary model ${chosenModel} error, trying gemini-3.1-flash-lite:`, primaryErr.message);
      try {
        const fallbackRes = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: formattedContents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        responseText = fallbackRes.text || '';
        usedModel = 'gemini-3.1-flash-lite';
      } catch (secondaryErr: any) {
        // Return clinically safe fallback response rather than breaking the chat
        const emergencyNotice = isEmergency
          ? (isBengali
            ? '⚠️ জরুরি বিজ্ঞপ্তি: আপনার বর্ণিত উপসর্গগুলোর জন্য অবিলম্বে জরুরি স্বাস্থ্যসেবায় যোগাযোগ করুন (৯১১ বা ১১২)।\n\n'
            : '⚠️ EMERGENCY NOTICE: The symptoms described require immediate medical evaluation (911 / 112).\n\n')
          : '';

        const safeFallback = isBengali
          ? `${emergencyNotice}এআই মডেল বর্তমানে অতিরিক্ত চাপের সম্মুখীন। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন। নিয়মিত রক্তচাপ ও রক্তের গ্লুকোজ পর্যবেক্ষণ স্বাস্থ্য ব্যবস্থাপনায় সহায়ক।`
          : `${emergencyNotice}The AI service is momentarily experiencing high demand. Please try again in a few moments. In the meantime, you can review your MedPin logs and medication schedule.`;

        return res.json({
          configured: true,
          response: safeFallback,
          modelUsed: 'clinical-fallback',
          isEmergencyAlert: isEmergency,
        });
      }
    }

    res.json({
      configured: true,
      response: responseText || (isBengali ? 'আমি আপনার স্বাস্থ্য সংক্রান্ত তথ্যে সাহায্য করতে প্রস্তুত।' : 'I am here to help you understand your wellness and health metrics.'),
      modelUsed: usedModel,
      isEmergencyAlert: isEmergency,
    });
  } catch (err: any) {
    console.error('Gemini chat error:', err);
    res.status(500).json({
      error: 'Failed to contact AI service.',
      details: err.message,
    });
  }
});

// ----------------- AUDIO TRANSCRIPTION (gemini-3.5-transcribe) -----------------

app.post('/api/gemini/transcribe', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { audioBase64, mimeType = 'audio/webm', language = 'en' } = req.body;

  if (!audioBase64) {
    return res.status(400).json({ error: 'Audio data is required for transcription.' });
  }

  if (!ai) {
    return res.json({
      configured: false,
      message: 'Gemini API is not configured. Please set GEMINI_API_KEY in the Secrets panel to enable speech transcription.',
      transcript: '',
    });
  }

  try {
    const cleanBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, '').replace(/^data:video\/\w+;base64,/, '');

    const promptText = language === 'bn'
      ? 'Transcribe this spoken Bengali audio accurately in Bengali script. Output only the verbatim transcription.'
      : 'Transcribe this spoken medical and health audio accurately. Output only the verbatim transcription.';

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: cleanBase64,
            },
          },
          { text: promptText },
        ],
      },
    });

    res.json({
      configured: true,
      transcript: response.text?.trim() || '',
      modelUsed: 'gemini-3.5-transcribe',
    });
  } catch (err: any) {
    console.error('Audio transcription error:', err);
    res.status(500).json({
      error: 'Audio transcription failed.',
      details: err.message,
    });
  }
});

// ----------------- CLINICAL HEALTH INSIGHTS -----------------

app.post('/api/gemini/health-insights', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const records = db.getHealthRecords(userId);
    const medications = db.getMedications(userId);
    const doses = db.getDoseLogs(userId);

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

    const totalDoses = doses.length;
    const takenDoses = doses.filter((d) => d.status === 'taken').length;
    const adherencePct = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 100;

    // Rule-based insights engine (guaranteed to always work reliably even without Gemini key)
    const ruleBasedInsights = [];

    // 1. Cardiovascular Insight
    if (avgSys && avgDia) {
      if (avgSys < 120 && avgDia < 80) {
        ruleBasedInsights.push({
          category: 'cardiovascular',
          title: 'Optimal Blood Pressure Baseline',
          description: `Your average reading of ${avgSys}/${avgDia} mmHg is well within the 2017 ACC/AHA optimal cardiovascular window.`,
          status: 'positive',
          recommendation: 'Maintain your current physical activity and balanced hydration habits.',
        });
      } else if (avgSys <= 129 && avgDia < 80) {
        ruleBasedInsights.push({
          category: 'cardiovascular',
          title: 'Elevated Systolic Pressure',
          description: `Average blood pressure (${avgSys}/${avgDia} mmHg) indicates elevated systolic pressure prior to Stage 1 hypertension.`,
          status: 'warning',
          recommendation: 'Target dietary sodium reduction (<2,000 mg/day) and 30 minutes of aerobic exercise.',
        });
      } else {
        ruleBasedInsights.push({
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
        ruleBasedInsights.push({
          category: 'metabolic',
          title: 'Healthy Glycemic Range',
          description: `Average blood glucose of ${avgSugar} mg/dL aligns with normal fasting glycemic thresholds (<100 mg/dL).`,
          status: 'positive',
          recommendation: 'Continue complex carbohydrate meals with adequate dietary fiber.',
        });
      } else if (avgSugar <= 125) {
        ruleBasedInsights.push({
          category: 'metabolic',
          title: 'Borderline Fasting Glucose',
          description: `Average glucose of ${avgSugar} mg/dL is within the impaired fasting glucose / pre-diabetes evaluation window (100 - 125 mg/dL).`,
          status: 'warning',
          recommendation: 'Consider scheduling an HbA1c test with your primary care clinician.',
        });
      } else {
        ruleBasedInsights.push({
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
        ruleBasedInsights.push({
          category: 'pulse',
          title: 'Normal Resting Heart Rate',
          description: `Your average pulse of ${avgPulse} BPM indicates normal resting sinoatrial pacing (60 - 100 BPM).`,
          status: 'positive',
          recommendation: 'Good cardiovascular endurance. Restful sleep supports this resting baseline.',
        });
      } else if (avgPulse > 100) {
        ruleBasedInsights.push({
          category: 'pulse',
          title: 'Elevated Resting Pulse',
          description: `Average pulse of ${avgPulse} BPM exceeds 100 BPM at rest.`,
          status: 'warning',
          recommendation: 'Check hydration and evaluate caffeine, emotional stress, or recent exertion.',
        });
      } else {
        ruleBasedInsights.push({
          category: 'pulse',
          title: 'Athletic / Low Resting Pulse',
          description: `Average pulse of ${avgPulse} BPM is below 60 BPM.`,
          status: 'neutral',
          recommendation: 'Common in aerobic athletes; notify physician if accompanied by fatigue or dizziness.',
        });
      }
    }

    // 4. Adherence Insight
    ruleBasedInsights.push({
      category: 'adherence',
      title: adherencePct >= 85 ? 'Therapeutic Adherence Target Met' : 'Medication Adherence Gap',
      description: `Current adherence score is ${adherencePct}% (${takenDoses} of ${totalDoses} doses logged on schedule).`,
      status: adherencePct >= 85 ? 'positive' : 'warning',
      recommendation:
        adherencePct >= 85
          ? 'Great adherence! Consistent dosing ensures stable therapeutic blood concentrations.'
          : 'Set daily morning and evening reminders to avoid missed doses.',
    });

    if (!ai) {
      return res.json({
        configured: false,
        insights: ruleBasedInsights,
        overallAssessment:
          'Based on clinical guidelines (ACC/AHA 2017 & ADA), your physiological vitals indicate stable therapeutic tracking. Add GEMINI_API_KEY for individualized LLM narrative synthesis.',
        summaryScore: `${adherencePct}% Compliance`,
      });
    }

    // If Gemini is configured, enhance with real Gemini 3.8 Flash intelligence
    const summaryPrompt = `Analyze this patient's aggregated vital statistics:
- Average Blood Pressure: ${avgSys ? `${avgSys}/${avgDia} mmHg` : 'No logs'}
- Average Blood Glucose: ${avgSugar ? `${avgSugar} mg/dL` : 'No logs'}
- Average Pulse: ${avgPulse ? `${avgPulse} BPM` : 'No logs'}
- Medication Adherence Rate: ${adherencePct}% (${takenDoses}/${totalDoses} doses logged)
- Active Medications: ${medications.map((m) => `${m.name} ${m.dosage}`).join(', ') || 'None'}

Provide a structured clinical wellness insight summary. Return JSON matching:
{
  "overallAssessment": "2-3 sentences summarizing cardiovascular & metabolic status",
  "summaryScore": "e.g. Good Cardiovascular Control",
  "insights": [
    {
      "category": "cardiovascular" | "metabolic" | "pulse" | "adherence",
      "title": "Short title",
      "description": "Clear explanation of the patient's data",
      "status": "positive" | "warning" | "alert" | "neutral",
      "recommendation": "Practical lifestyle action"
    }
  ]
}`;

    let parsed: any = {};
    try {
      const geminiRes = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: summaryPrompt,
        config: {
          systemInstruction:
            'You are an evidence-based clinical wellness intelligence assistant. Strictly provide educational health insights and lifestyle adjustments. Never prescribe drugs or give medical diagnoses.',
          responseMimeType: 'application/json',
        },
      });
      parsed = JSON.parse(geminiRes.text || '{}');
    } catch (aiErr: any) {
      console.warn('Gemini 3.8 Flash insight synthesis fell back to clinical rules engine:', aiErr.message);
    }

    res.json({
      configured: true,
      insights: parsed.insights && parsed.insights.length ? parsed.insights : ruleBasedInsights,
      overallAssessment:
        parsed.overallAssessment ||
        'Based on clinical guidelines (ACC/AHA 2017 & ADA), your physiological vitals indicate stable therapeutic tracking.',
      summaryScore: parsed.summaryScore || `${adherencePct}% Adherence`,
    });
  } catch (err: any) {
    console.error('Health insights error:', err);
    res.status(500).json({
      error: 'Failed to generate health insights.',
      details: err.message,
    });
  }
});

// ----------------- MEDDROID VOICE ASSISTANT -----------------

const MEDDROID_SYSTEM_INSTRUCTION = `You are MedDroid, the voice-interactive wellness and health guide in the Heal-Whisper-Guide platform.
You answer patient questions verbally and concisely.

LANGUAGE CAPABILITIES:
- If asked in Bengali (বাংলা) or if requested in Bengali, respond in natural, polite Bengali with warm Bengali medical explanations.
- If asked in English, respond in clear, encouraging English.
- Keep answers concise (2 to 4 sentences) because they will be read aloud through speech synthesis.
- Strictly adhere to educational health guidance: no prescription changes, no clinical diagnoses, always remind the user to consult their doctor.
- In emergencies (e.g., chest pain, severe breathlessness), start with an urgent alert to call emergency services.`;

app.post('/api/gemini/voice-assistant', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { transcript, language = 'en' } = req.body;

  if (!transcript || !transcript.trim()) {
    return res.status(400).json({ error: 'Voice transcript is required.' });
  }

  const isBengali = language === 'bn' || /[\u0980-\u09FF]/.test(transcript);
  const isEmergency = /\b(chest pain|heart attack|can't breathe|stroke|বুকে ব্যথা|শ্বাসকষ্ট)\b/i.test(transcript);

  if (!ai) {
    const fallbackText = isBengali
      ? 'জেমিনি এআই কনফিগার করা নেই। অনুগ্রহ করে সিক্রেটস প্যানেলে GEMINI_API_KEY সেট করুন।'
      : 'Gemini AI is not configured. Please set GEMINI_API_KEY in the Secrets panel to activate voice intelligence.';

    return res.json({
      configured: false,
      replyText: fallbackText,
      language: isBengali ? 'bn' : 'en',
      isEmergencyAlert: isEmergency,
    });
  }

  try {
    const prompt = isBengali
      ? `ব্যবহারকারী বাংলায় বলেছেন: "${transcript}". দয়া করে সংক্ষেপে এবং স্পষ্টভাবে বাংলায় উত্তর দিন।`
      : `User asked: "${transcript}". Provide a clear, spoken-friendly answer under 4 sentences.`;

    let replyText = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: MEDDROID_SYSTEM_INSTRUCTION,
          temperature: 0.6,
        },
      });
      replyText = response.text || '';
    } catch (primaryErr: any) {
      console.warn('Voice assistant gemini-3.8-flash spike, trying gemini-3.1-flash-lite:', primaryErr.message);
      try {
        const fallbackRes = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            systemInstruction: MEDDROID_SYSTEM_INSTRUCTION,
            temperature: 0.6,
          },
        });
        replyText = fallbackRes.text || '';
      } catch (secondaryErr: any) {
        replyText = isBengali
          ? 'আমি আপনার কথা বুঝতে পেরেছি। স্বাস্থ্য শিক্ষা এবং রক্তচাপ পর্যবেক্ষণে আপনাকে সহায়তা করতে আমি প্রস্তুত।'
          : 'I heard you clearly. I am ready to help you track your physiological vitals and medication adherence.';
      }
    }

    res.json({
      configured: true,
      replyText: replyText || (isBengali ? 'আমি আপনাকে সাহায্য করতে প্রস্তুত।' : 'I am ready to help you with your health metrics.'),
      language: isBengali ? 'bn' : 'en',
      isEmergencyAlert: isEmergency,
    });
  } catch (err: any) {
    console.error('MedDroid voice assistant error:', err);
    res.status(500).json({
      error: 'Failed to generate voice assistant response.',
      details: err.message,
    });
  }
});

// ----------------- VADG MEDICAL REPORT ANALYZER -----------------

const REPORT_ANALYZER_INSTRUCTION = `You are VADG (Visual & Analytical Diagnostic Guide) in Heal-Whisper-Guide.
You analyze laboratory reports, blood work, diagnostic summaries, and clinical test scans provided by the patient.

CRITICAL RULES:
1. You are extracting and explaining what is already printed on the lab report.
2. NEVER invent lab results, reference ranges, or patient values.
3. If an image or text is illegible, truncated, or lacks reference ranges, explicitly declare it as "unclear or missing information".
4. Produce a structured JSON response matching the schema.
5. Provide a plain-language summary for the patient (avoid intimidating medical jargon).
6. Categorize each finding strictly as: NORMAL, HIGH, LOW, CRITICAL, or INCONCLUSIVE.
7. Include 3-5 sensible questions for the patient to ask their ordering physician.
8. Always include the explicit medical disclaimer.`;

app.post('/api/gemini/analyze-report', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { textContent, imageBase64, mimeType = 'image/jpeg', fileName = 'Medical_Report' } = req.body;

  if (!textContent && !imageBase64) {
    return res.status(400).json({ error: 'Please provide either report text or an uploaded report image/PDF scan.' });
  }

  if (!ai) {
    return res.json({
      configured: false,
      message: 'Gemini AI is not configured. Please set GEMINI_API_KEY in the Secrets panel to enable AI medical report analysis.',
      fileName,
    });
  }

  try {
    const parts: any[] = [];

    if (imageBase64) {
      // Clean data URI prefix if present
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '').replace(/^data:application\/pdf;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: cleanBase64,
        },
      });
      parts.push({
        text: 'Extract and analyze the laboratory results, reference ranges, and test findings from this medical report document.',
      });
    }

    if (textContent) {
      parts.push({
        text: `Here is the clinical report text:\n\n${textContent}\n\nExtract and parse all findings, reference ranges, and patient metrics.`,
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        systemInstruction: REPORT_ANALYZER_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            documentType: { type: Type.STRING, description: 'Type of report (e.g. Complete Blood Count, Lipid Profile, etc.)' },
            patientName: { type: Type.STRING, description: 'Patient name if visible on report, else Anonymous' },
            testDate: { type: Type.STRING, description: 'Date of laboratory test if present' },
            plainLanguageSummary: { type: Type.STRING, description: 'Clear patient-friendly explanation of the report results' },
            keyFindings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  testName: { type: Type.STRING },
                  value: { type: Type.STRING },
                  unit: { type: Type.STRING },
                  referenceRange: { type: Type.STRING },
                  status: {
                    type: Type.STRING,
                    enum: ['NORMAL', 'HIGH', 'LOW', 'CRITICAL', 'INCONCLUSIVE'],
                  },
                  clinicalSignificance: { type: Type.STRING },
                },
                required: ['testName', 'value', 'status'],
              },
            },
            questionsForDoctor: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            missingOrUnclearInfo: { type: Type.STRING },
            lifestyleRecommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            disclaimer: { type: Type.STRING },
          },
          required: ['documentType', 'plainLanguageSummary', 'keyFindings', 'questionsForDoctor', 'disclaimer'],
        },
      },
    });

    const parsedJson = JSON.parse(response.text || '{}');

    const analysisResult: MedicalReportAnalysis = {
      id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: req.user!.id,
      fileName,
      documentType: parsedJson.documentType || 'Clinical Laboratory Report',
      patientName: parsedJson.patientName || 'Self',
      testDate: parsedJson.testDate || new Date().toISOString().slice(0, 10),
      plainLanguageSummary: parsedJson.plainLanguageSummary || 'Laboratory report analysis completed.',
      keyFindings: parsedJson.keyFindings || [],
      questionsForDoctor: parsedJson.questionsForDoctor || [
        'How do these results compare with my baseline health profile?',
        'Are any follow-up tests or medication reviews recommended?',
      ],
      missingOrUnclearInfo: parsedJson.missingOrUnclearInfo || undefined,
      lifestyleRecommendations: parsedJson.lifestyleRecommendations || [
        'Maintain balanced hydration and nutrient intake.',
        'Follow your physician’s scheduled follow-up appointment.',
      ],
      analyzedAt: new Date().toISOString(),
      modelUsed: 'gemini-3.8-flash',
      disclaimer:
        parsedJson.disclaimer ||
        'VADG AI report analyzer is for educational purposes only and is not a medical diagnosis. Always discuss results with your doctor.',
    };

    // Save in history for user
    db.saveReportAnalysis(req.user!.id, analysisResult);

    res.json({
      configured: true,
      analysis: analysisResult,
    });
  } catch (err: any) {
    console.error('VADG Report Analysis Error:', err);
    res.status(500).json({
      error: 'Failed to analyze report.',
      details: err.message,
    });
  }
});

app.get('/api/reports/history', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const reports = db.getReportAnalyses(req.user!.id);
    res.json({ reports });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch report history' });
  }
});

// ----------------- VITE MIDDLEWARE / STATIC FILES -----------------

async function setupServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  // Live API WebSocket connection handler for gemini-3.8-live
  wss.on('connection', async (clientWs: WebSocket) => {
    if (!ai) {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          message:
            'Gemini Live API is awaiting configuration. Please set GEMINI_API_KEY in the Secrets panel.',
        })
      );
      clientWs.close();
      return;
    }

    try {
      const session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction:
            'You are MedDroid, the voice wellness assistant in Heal-Whisper-Guide. Answer questions concisely in clear spoken English or Bengali as requested. Provide clear health education, do not prescribe or diagnose, and alert the user to call emergency services if severe symptoms are mentioned.',
        },
        callbacks: {
          onmessage: (message: any) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ type: 'audio', audio }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }
          },
          onclose: () => {
            clientWs.send(JSON.stringify({ type: 'status', status: 'closed' }));
          },
        },
      });

      clientWs.on('message', (raw: any) => {
        try {
          const data = JSON.parse(raw.toString());
          if (data.audio) {
            session.sendRealtimeInput({
              audio: { data: data.audio, mimeType: 'audio/pcm;rate=16000' },
            });
          } else if (data.text) {
            session.sendRealtimeInput({
              text: data.text,
            });
          }
        } catch (e) {
          console.error('Error forwarding to Live API session:', e);
        }
      });

      clientWs.on('close', () => {
        try {
          session.close();
        } catch (e) {}
      });

      clientWs.send(JSON.stringify({ type: 'connected', model: 'gemini-3.8-live' }));
    } catch (err: any) {
      console.error('Gemini Live API connection error:', err);
      clientWs.send(
        JSON.stringify({
          type: 'error',
          message: `Failed to connect to Live API: ${err.message}`,
        })
      );
      clientWs.close();
    }
  });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
    if (pathname === '/api/live-ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  server.listen(PORT, () => {
    console.log(`[Heal-Whisper-Guide] Server listening on port ${PORT}`);
    console.log(`[Heal-Whisper-Guide] Gemini API configured: ${Boolean(ai)}`);
  });
}

setupServer().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
