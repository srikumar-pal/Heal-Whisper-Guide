import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  User,
  Sparkles,
  RotateCcw,
  ShieldAlert,
  AlertTriangle,
  PhoneCall,
  Lightbulb,
  Mic,
  MicOff,
  Languages,
  Zap,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ChatMessage } from '../types';
import { SpeechClipRecorder } from '../utils/liveAudio';

export const WellnessChatPage: React.FC = () => {
  const { user, systemStatus } = useAuth();
  const [model, setModel] = useState<'gemini-3.8-flash' | 'gemini-3.1-flash-lite'>('gemini-3.8-flash');
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [micNotice, setMicNotice] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'msg_welcome',
        sender: 'assistant',
        content: `Hello ${user?.name || ''}! I am your AI Wellness & Clinical Health Guide.

I provide evidence-informed health education, explain clinical terms in simple language, and support your daily wellness in English and Bengali (বাংলা).

How can I help you today? You can type your question or tap the microphone to dictate with Gemini 3.5 Transcribe.`,
        timestamp: new Date().toISOString(),
      },
    ];
  });
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const clipRecorderRef = useRef<SpeechClipRecorder | null>(null);

  useEffect(() => {
    clipRecorderRef.current = new SpeechClipRecorder();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const quickPrompts = {
    en: [
      'What does Stage 1 Hypertension mean in the 2017 AHA guideline?',
      'What are the standard fasting vs post-meal blood sugar targets?',
      'How does restful sleep influence blood pressure and resting heart rate?',
      'What is the DASH diet and how does it support cardiovascular wellness?',
      'How do I accurately prepare for a blood pressure reading at home?',
    ],
    bn: [
      'উচ্চ রক্তচাপ নিয়ন্ত্রণে রাখার জন্য খাদ্যতালিকায় কী পরিবর্তন প্রয়োজন?',
      'খালি পেটে এবং খাওয়ার পরে রক্তে গ্লুকোজের স্বাভাবিক মাত্রা কত?',
      'হৃদস্পন্দন বা পালস রেট বেশি হওয়ার সাধারণ কারণগুলো কী কী?',
      'ড্যাশ (DASH) ডায়েট কী এবং এটি কীভাবে রক্তচাপ কমাতে সাহায্য করে?',
      'ডাক্তারের কাছে যাওয়ার আগে রক্তচাপ পর্যবেক্ষণের সঠিক নিয়ম কী?',
    ],
  };

  const handleToggleVoiceDictation = async () => {
    setMicNotice(null);
    if (isRecording) {
      try {
        setIsRecording(false);
        setTranscribing(true);
        const { base64, mimeType } = await clipRecorderRef.current!.stop();
        const res = await api.transcribeAudio(base64, mimeType, language);

        if (res.transcript) {
          setInputText((prev) => (prev ? `${prev} ${res.transcript}` : res.transcript));
        } else if (!res.configured) {
          setMicNotice('Gemini API key is required in the Secrets panel to enable speech transcription.');
        } else {
          setMicNotice('No speech detected in dictation.');
        }
      } catch (err: any) {
        setMicNotice(err.message || 'Failed to process voice dictation.');
      } finally {
        setTranscribing(false);
      }
    } else {
      try {
        await clipRecorderRef.current!.start();
        setIsRecording(true);
      } catch (err: any) {
        setIsRecording(false);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setMicNotice('Microphone permission was denied. Please allow microphone access in your browser address bar.');
        } else {
          setMicNotice(err.message || 'Could not start microphone.');
        }
      }
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    setError(null);
    const isBengali = language === 'bn' || /[\u0980-\u09FF]/.test(text);
    const chosenLang = isBengali ? 'bn' : 'en';

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      language: chosenLang,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await api.sendChatMessage(
        messages.map((m) => ({ sender: m.sender, content: m.content })),
        text,
        model,
        chosenLang
      );

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        content: res.response,
        timestamp: new Date().toISOString(),
        isEmergencyAlert: res.isEmergencyAlert,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setError(err.message || 'Failed to receive AI response.');
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_${Date.now()}`,
          sender: 'assistant',
          content: 'I could not connect to the health education model. Please ensure the server is running.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: 'msg_welcome',
        sender: 'assistant',
        content:
          language === 'bn'
            ? 'কথোপকথন রিসেট করা হয়েছে। আপনার পরবর্তী স্বাস্থ্য প্রশ্ন বলুন বা লিখুন।'
            : 'Conversation reset. I am ready for your next health or wellness question.',
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)]">
      {/* Header Info & Configuration Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>AI Wellness & Clinical Educator</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                {model}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Multi-turn clinical education with English & Bengali (বাংলা) support
            </p>
          </div>
        </div>

        {/* Model & Language Controls */}
        <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto">
          {/* Model Selector */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => setModel('gemini-3.8-flash')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                model === 'gemini-3.8-flash'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Standard clinical wellness reasoning"
            >
              <Sparkles className="w-3 h-3 text-teal-400" />
              <span>3.8 Flash</span>
            </button>
            <button
              type="button"
              onClick={() => setModel('gemini-3.1-flash-lite')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                model === 'gemini-3.1-flash-lite'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Fast terminology breakdown"
            >
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>3.1 Lite (Fast)</span>
            </button>
          </div>

          {/* Language Selector */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                language === 'en' ? 'bg-teal-500/20 text-teal-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('bn')}
              className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                language === 'bn' ? 'bg-teal-500/20 text-teal-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              বাংলা
            </button>
          </div>

          <button
            onClick={handleReset}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Reset conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 overflow-y-auto space-y-4 shadow-xl">
        {messages.map((msg) => {
          const isBot = msg.sender === 'assistant';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 text-xs ${isBot ? 'justify-start' : 'justify-end'}`}
            >
              {isBot && (
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl p-4 rounded-2xl space-y-2 ${
                  isBot
                    ? 'bg-slate-950/80 border border-slate-800 text-slate-200'
                    : 'bg-teal-500 text-slate-950 font-medium ml-12'
                }`}
              >
                {msg.isEmergencyAlert && (
                  <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-rose-400 animate-bounce" />
                    <span>EMERGENCY ADVISORY: For acute chest pain or breathing issues, call 911/112 immediately.</span>
                  </div>
                )}

                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/40 text-[10px] text-slate-500">
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isBot && <span className="font-mono text-teal-400/70">Heal-Whisper Guide AI</span>}
                </div>
              </div>

              {!isBot && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-3 text-xs text-teal-400">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 flex items-center justify-center">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <span>Formulating evidence-informed response with {model}...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 text-xs">
        <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
        {quickPrompts[language].map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(prompt)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-teal-500/40 text-slate-300 hover:text-white whitespace-nowrap transition-colors cursor-pointer text-[11px]"
          >
            {prompt}
          </button>
        ))}
      </div>

      {micNotice && (
        <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 shrink-0">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{micNotice}</span>
        </div>
      )}

      {/* Input Bar with Integrated gemini-3.5-transcribe Voice Dictation */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-2 focus-within:border-teal-500 shadow-xl shrink-0"
      >
        {/* Gemini 3.5 Transcribe Mic Button */}
        <button
          type="button"
          onClick={handleToggleVoiceDictation}
          disabled={transcribing}
          title={isRecording ? 'Stop and transcribe audio' : 'Dictate with Gemini 3.5 Transcribe'}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            isRecording
              ? 'bg-rose-500 text-white animate-pulse ring-2 ring-rose-500/40'
              : transcribing
              ? 'bg-slate-800 text-teal-400'
              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          {isRecording ? (
            <MicOff className="w-4 h-4" />
          ) : transcribing ? (
            <Activity className="w-4 h-4 animate-spin" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isRecording
              ? 'Listening... tap mic again to transcribe with gemini-3.5-transcribe'
              : transcribing
              ? 'Transcribing audio via gemini-3.5-transcribe...'
              : language === 'bn'
              ? 'আপনার স্বাস্থ্য বা চিকিৎসা সংক্রান্ত প্রশ্ন লিখুন...'
              : 'Ask any general wellness, vital sign, or medical terminology question...'
          }
          className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none"
        />

        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-500/20 transition-all disabled:opacity-40 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
