import {
  UserProfile,
  HealthRecord,
  Medication,
  DoseLog,
  MedicalReportAnalysis,
  ServerStatusResponse,
} from '../types';

const TOKEN_KEY = 'heal_whisper_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

export const api = {
  // Status
  getStatus: () => request<ServerStatusResponse>('/api/status'),

  // Auth
  register: (payload: { email: string; password: string; name: string }) =>
    request<{ user: UserProfile; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request<{ user: UserProfile; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  demoLogin: () =>
    request<{ user: UserProfile; token: string }>('/api/auth/demo-login', {
      method: 'POST',
    }),

  getMe: () => request<{ user: UserProfile }>('/api/auth/me'),

  logout: () =>
    request<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    }),

  resetPassword: (email: string) =>
    request<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  updateProfile: (profile: Partial<UserProfile>) =>
    request<{ user: UserProfile }>('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    }),

  // MedPin Records
  getRecords: (params?: { type?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.type && params.type !== 'all') query.set('type', params.type);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    return request<{ records: HealthRecord[] }>(`/api/records${qs ? `?${qs}` : ''}`);
  },

  addRecord: (record: Partial<HealthRecord>) =>
    request<{ record: HealthRecord }>('/api/records', {
      method: 'POST',
      body: JSON.stringify(record),
    }),

  updateRecord: (id: string, record: Partial<HealthRecord>) =>
    request<{ record: HealthRecord }>(`/api/records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(record),
    }),

  deleteRecord: (id: string) =>
    request<{ success: boolean; id: string }>(`/api/records/${id}`, {
      method: 'DELETE',
    }),

  // Medications
  getMedications: () => request<{ medications: Medication[] }>('/api/medications'),

  addMedication: (medication: Partial<Medication>) =>
    request<{ medication: Medication }>('/api/medications', {
      method: 'POST',
      body: JSON.stringify(medication),
    }),

  updateMedication: (id: string, medication: Partial<Medication>) =>
    request<{ medication: Medication }>(`/api/medications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(medication),
    }),

  deleteMedication: (id: string) =>
    request<{ success: boolean; id: string }>(`/api/medications/${id}`, {
      method: 'DELETE',
    }),

  getDoses: (startDate?: string, endDate?: string) => {
    const query = new URLSearchParams();
    if (startDate) query.set('startDate', startDate);
    if (endDate) query.set('endDate', endDate);
    const qs = query.toString();
    return request<{ doses: DoseLog[] }>(`/api/doses${qs ? `?${qs}` : ''}`);
  },

  recordDose: (medicationId: string, payload: { scheduledTime: string; status: 'taken' | 'skipped' | 'snoozed'; notes?: string }) =>
    request<{ dose: DoseLog }>(`/api/medications/${medicationId}/dose`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // AI Chat
  sendChatMessage: (
    messages: { sender: string; content: string }[],
    userMessage: string,
    model: 'gemini-3.8-flash' | 'gemini-3.1-flash-lite' = 'gemini-3.8-flash',
    language: 'en' | 'bn' = 'en'
  ) =>
    request<{ configured: boolean; response: string; modelUsed?: string; isEmergencyAlert?: boolean }>('/api/gemini/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, userMessage, model, language }),
    }),

  // Audio Transcription (gemini-3.5-transcribe)
  transcribeAudio: (audioBase64: string, mimeType: string = 'audio/webm', language: 'en' | 'bn' = 'en') =>
    request<{ configured: boolean; transcript: string; modelUsed?: string; message?: string }>('/api/gemini/transcribe', {
      method: 'POST',
      body: JSON.stringify({ audioBase64, mimeType, language }),
    }),

  // Voice Assistant
  sendVoiceTranscript: (transcript: string, language: 'en' | 'bn' = 'en') =>
    request<{ configured: boolean; replyText: string; language: string; isEmergencyAlert?: boolean }>(
      '/api/gemini/voice-assistant',
      {
        method: 'POST',
        body: JSON.stringify({ transcript, language }),
      }
    ),

  // VADG Report Analyzer
  analyzeReport: (payload: { textContent?: string; imageBase64?: string; mimeType?: string; fileName?: string }) =>
    request<{ configured: boolean; analysis?: MedicalReportAnalysis; message?: string }>('/api/gemini/analyze-report', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getReportHistory: () => request<{ reports: MedicalReportAnalysis[] }>('/api/reports/history'),

  // Clinical Health Insights
  getHealthInsights: () =>
    request<{
      configured: boolean;
      insights: {
        category: 'cardiovascular' | 'metabolic' | 'pulse' | 'adherence';
        title: string;
        description: string;
        status: 'positive' | 'warning' | 'alert' | 'neutral';
        recommendation: string;
      }[];
      overallAssessment: string;
      summaryScore?: string;
      message?: string;
    }>('/api/gemini/health-insights', {
      method: 'POST',
    }),
};
