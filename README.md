# Heal-Whisper-Guide

> **AI-Powered Digital Health Monitoring Platform**  
> Inspired by the clinical utility of MedPin, MedDroid, VADG, Healtheja, and DoctorXCare. Built with an original visual identity, full-stack architecture, and server-side Gemini 3.8 Flash intelligence.

---

## Architecture Overview

```
├── server.ts                   # Express full-stack server mounting Vite in dev, static files in prod
├── server/
│   └── db.ts                   # Persistent JSON file database engine with atomic writes & seeding
├── src/
│   ├── types/index.ts          # Complete clinical data models (BP, Glucose, Pulse, Meds, VADG)
│   ├── utils/
│   │   ├── healthCalculators.ts# 2017 ACC/AHA BP, ADA Glucose, AHA Pulse, and BMI engines
│   │   └── exportUtils.ts      # Clinical CSV & jsPDF branded PDF export generators
│   ├── services/
│   │   └── api.ts              # Type-safe API client with bearer token management
│   ├── context/
│   │   ├── AuthContext.tsx     # Session management, 1-click presentation demo & auth state
│   │   └── ThemeContext.tsx    # Medical Tech Dark / Clinical Paper Light mode toggle
│   ├── components/
│   │   ├── BrandLogo.tsx       # Original ECG pulse & whisper acoustic wave motif
│   │   ├── Navigation.tsx      # Responsive desktop left sidebar & mobile drawer
│   │   ├── Header.tsx          # Dynamic title, date range filter, and quick action buttons
│   │   ├── QuickLogModal.tsx   # Global vital recording modal with live classification
│   │   └── AuthModal.tsx       # Sign In, Sign Up, 1-Click Demo Login, and Password Reset
│   └── pages/
│       ├── DashboardPage.tsx       # Primary telemetry dashboard, vital cards, today's doses
│       ├── HealthTrackingPage.tsx  # MedPin CRUD operations, search, filters & safety notices
│       ├── ChartsPage.tsx          # Recharts trends with AHA/ADA reference zones & exports
│       ├── MedicationsPage.tsx     # Medication scheduler, dose logging, adherence & inventory
│       ├── MedDroidPage.tsx        # Voice assistant with waveform audio, English & Bengali AI
│       ├── ReportAnalyzerPage.tsx  # VADG AI Medical Report Analyzer (multimodal/vision)
│       ├── WellnessChatPage.tsx    # Evidence-informed clinical wellness chatbot
│       └── ProfileSettingsPage.tsx # Demographics, BMI calculator, language, and privacy
```

---

## Implemented Core Features

### 1. MedPin Health Telemetry & Tracking
- **Blood Pressure**: Full CRUD (Systolic, Diastolic, Measurement Arm, Position, Clinical Notes).
- **Blood Glucose**: Full CRUD (Value, mg/dL vs mmol/L, Fasting, Post-Meal, Random, Bedtime).
- **Pulse Rate**: Full CRUD (BPM, Rhythm Regularity, Context: Resting, Active, Post-Exercise).
- **Instant Clinical Classification**:
  - Blood Pressure evaluated against **2017 ACC/AHA High Blood Pressure Guidelines** (Normal, Elevated, Stage 1, Stage 2, Hypertensive Crisis, Hypotension).
  - Blood Glucose evaluated against **American Diabetes Association (ADA)** standards.
  - Pulse evaluated against **American Heart Association (AHA)** resting ranges.
- **Search & Filtering**: Search across notes, categories, and filter by 7D, 14D, 30D, 90D, or all-time windows.

### 2. MedDroid Voice-Based AI Assistant & Real-Time Live API
- **Gemini Live API (`gemini-3.8-live`)**: Real-time bidirectional voice conversations over WebSocket streaming 16kHz PCM audio to the server with low-latency 24kHz audio synthesis.
- **Gemini Audio Transcription (`gemini-3.5-transcribe`)**: High-accuracy verbatim audio transcription supporting both English and Bengali.
- **Dynamic Waveform Visualizer**: 12-bar animated waveform visualizer reacting to listening and speech states.
- **Bilingual Voice Support**: Fluent in both **English** and **Bengali (বাংলা)**.
- **Text & Speech Fallback**: Integrated Web Speech synthesis and text input fallback for accessibility.
- **Microphone Permissions**: Explicit handling of browser permissions with clear user instructions if blocked.
- **Emergency Triage Warning**: Instant alert cards for acute cardiovascular symptoms (e.g. chest pain).

### 3. VADG — AI Medical Report Analyzer
- Upload lab scan documents (PDF, PNG, JPG, WebP) or paste diagnostic text.
- One-click **"Load Sample Lab Panel"** for instant evaluation of a Comprehensive Metabolic & Lipid Panel.
- Server-side analysis powered by **Gemini 3.8 Flash**.
- Extracts:
  - Document type & test date
  - Patient-friendly plain-language summary
  - Structured findings table (Parameter, Value, Unit, Standard Reference Range, Status: NORMAL, HIGH, LOW, CRITICAL, Clinical Significance)
  - Clinically formulated questions to ask your physician
  - Downloadable summary report (`.txt` / formatted export)

### 4. AI Wellness & Clinical Educator Chatbot
- **Multi-turn Chat Thread**: Scrollable thread preserving conversation context.
- **Model Selection**: Switch between **`gemini-3.8-flash`** (Standard clinical reasoning) and **`gemini-3.1-flash-lite`** (Fast triage and terminology explainer).
- **Voice Dictation**: Built-in microphone dictation powered by **`gemini-3.5-transcribe`**.
- **Bilingual Support**: Instant toggle and automatic detection of **English** and **Bengali (বাংলা)**.
- **One-tap clinical prompts**: DASH diet, Stage 1 Hypertension, and fasting glucose target guides.
- **Emergency detection**: Automatic keywords detection triggering prominent emergency 911/112 advisory notices.

### 5. Medication Scheduler & Adherence Engine
- Full CRUD for prescription drugs: Name, Dosage, Form (tablet, capsule, etc.), Frequency, Scheduled Times, Instructions, Start Date, End Date.
- Pill Inventory Monitoring: Remaining pills count with automated low-stock warnings.
- Real-time **Therapeutic Compliance / Adherence Score**: `(Doses Taken / Total Doses) * 100%`.
- Today's dose schedule with instant "Mark Taken", "Skip", or "Snooze" actions.

### 6. Interactive Charts & Clinical Exports
- **Blood Pressure Profile**: Dual-line chart with AHA target zone reference bands (<120/80 mmHg).
- **Blood Glucose Dynamics**: Area chart with fasting (<100 mg/dL) and post-meal (<140 mg/dL) thresholds.
- **Resting Pulse Profile**: Line chart with AHA normal baseline band (60-100 BPM).
- **Export to CSV**: Clean tabular export of authorized patient vital records.
- **Export to PDF**: Generated with `jspdf` featuring patient demographics, executive summary statistics, medication regimen table, and clinical disclaimer.

### 7. Authentication, Data Isolation & Privacy
- User registration, login, session persistence via Bearer tokens.
- **Instant 1-Click Demo Access**: Pre-seeded with 14 days of realistic vitals, active medications, and dose adherence logs.
- Patient-isolated data: Every user can only view, edit, and export their own health records.
- Theme support: Medical Tech Dark mode and Clinical Paper Light mode.

---

## Environment Setup

Configure your environment variables in `.env` or AI Studio Secrets panel:

```bash
# GEMINI_API_KEY: Required for live Gemini 3.8 Flash AI features (MedDroid, VADG, Chatbot)
# In AI Studio, this is automatically injected when configured in the Secrets panel.
GEMINI_API_KEY="your-gemini-api-key"

# PORT: Server port (defaults to 3000)
PORT=3000
```

---

## Local Development & Running

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The Express backend will start on port 3000 with Vite middlewares mounted. Open `http://localhost:3000`.

3. **Production Build**:
   ```bash
   npm run build
   ```

4. **Run Production Server**:
   ```bash
   npm start
   ```

---

## Clinical Safety Notice

*Heal-Whisper-Guide is designed for wellness monitoring, vital telemetry tracking, and patient education. It is NOT a certified medical device and does NOT replace the clinical judgment, diagnosis, or treatment plan of a licensed medical professional. For severe or life-threatening symptoms, immediately contact local emergency services (911, 112, or local emergency number).*
