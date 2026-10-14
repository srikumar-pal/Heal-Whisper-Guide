import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Languages,
  Sparkles,
  PhoneCall,
  RotateCcw,
  Bot,
  User,
  AlertTriangle,
  Radio,
  FileAudio,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ChatMessage } from '../types';
import { LiveAudioPlayer, LiveMicRecorder, SpeechClipRecorder } from '../utils/liveAudio';

export const MedDroidPage: React.FC = () => {
  const { user, systemStatus } = useAuth();
  const [mode, setMode] = useState<'live' | 'transcribe'>('live');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isRecordingClip, setIsRecordingClip] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [inputText, setInputText] = useState('');
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [liveApiStatus, setLiveApiStatus] = useState<string>('idle');

  const [history, setHistory] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'msg_init',
        sender: 'assistant',
        content:
          'Hello! I am MedDroid. I support real-time voice conversations via Gemini 3.8 Live API, speech transcription via Gemini 3.5 Transcribe, and bilingual responses in English and Bengali (বাংলা). How can I assist your health tracking today?',
        timestamp: new Date().toISOString(),
        language: 'en',
      },
    ];
  });

  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<LiveAudioPlayer | null>(null);
  const micRecorderRef = useRef<LiveMicRecorder | null>(null);
  const clipRecorderRef = useRef<SpeechClipRecorder | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize audio player
  useEffect(() => {
    playerRef.current = new LiveAudioPlayer();
    clipRecorderRef.current = new SpeechClipRecorder();

    return () => {
      cleanupLiveSession();
      if (playerRef.current) {
        playerRef.current.close();
      }
    };
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  const cleanupLiveSession = () => {
    if (micRecorderRef.current) {
      micRecorderRef.current.stop();
      micRecorderRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.stopAll();
    }
    setIsSessionActive(false);
    setLiveApiStatus('idle');
  };

  // Toggle Live API Voice Session (gemini-3.8-live)
  const toggleLiveSession = async () => {
    setPermissionError(null);

    if (isSessionActive) {
      cleanupLiveSession();
      return;
    }

    try {
      setLiveApiStatus('connecting');
      // Resume audio context on user gesture
      if (playerRef.current) {
        await playerRef.current.resume();
      }

      // Establish WebSocket connection to backend /api/live-ws
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live-ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setLiveApiStatus('connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'audio' && data.audio) {
            setIsSpeaking(true);
            playerRef.current?.playChunk(data.audio);
          } else if (data.type === 'interrupted') {
            playerRef.current?.stopAll();
            setIsSpeaking(false);
          } else if (data.type === 'error') {
            setPermissionError(data.message || 'Live API connection error.');
            cleanupLiveSession();
          } else if (data.type === 'connected') {
            setLiveApiStatus('live');
            setIsSessionActive(true);
          }
        } catch (e) {
          console.error('Error handling live ws message:', e);
        }
      };

      ws.onerror = (e) => {
        console.warn('Live WebSocket error:', e);
        setPermissionError('Could not establish real-time Live API WebSocket connection. Verify your network or API key.');
        cleanupLiveSession();
      };

      ws.onclose = () => {
        cleanupLiveSession();
      };

      // Start capturing 16kHz PCM audio
      const micRecorder = new LiveMicRecorder((base64Chunk) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ audio: base64Chunk }));
        }
      });

      await micRecorder.start();
      micRecorderRef.current = micRecorder;
      setIsSessionActive(true);
      setLiveApiStatus('live');
    } catch (err: any) {
      console.error('Failed to start Live session:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('Microphone permission was denied. Please allow microphone access in your browser address bar.');
      } else {
        setPermissionError(err.message || 'Failed to start Live API voice session.');
      }
      cleanupLiveSession();
    }
  };

  // Toggle Transcription Mode (gemini-3.5-transcribe)
  const toggleClipRecording = async () => {
    setPermissionError(null);

    if (isRecordingClip) {
      try {
        setIsRecordingClip(false);
        setLoading(true);
        const { base64, mimeType } = await clipRecorderRef.current!.stop();

        setTranscript('Transcribing audio with gemini-3.5-transcribe...');
        const res = await api.transcribeAudio(base64, mimeType, language);

        if (res.transcript) {
          setTranscript(res.transcript);
          setInputText(res.transcript);
          // Automatically send query to MedDroid
          handleSendMessage(res.transcript);
        } else if (!res.configured) {
          setPermissionError(res.message || 'Gemini API key is not configured for transcription.');
        } else {
          setTranscript('No clear speech detected in recording.');
        }
      } catch (err: any) {
        setPermissionError(err.message || 'Failed to stop and transcribe audio.');
      } finally {
        setLoading(false);
      }
    } else {
      try {
        setTranscript('');
        await clipRecorderRef.current!.start();
        setIsRecordingClip(true);
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermissionError('Microphone permission was denied. Please allow microphone access in your browser address bar.');
        } else {
          setPermissionError(err.message || 'Failed to start recording.');
        }
        setIsRecordingClip(false);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    const isBengali = language === 'bn' || /[\u0980-\u09FF]/.test(text);
    const chosenLang = isBengali ? 'bn' : 'en';

    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      language: chosenLang,
    };

    setHistory((prev) => [...prev, userMessage]);
    setInputText('');
    setTranscript('');
    setLoading(true);

    try {
      const res = await api.sendVoiceTranscript(text, chosenLang);

      const botMessage: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        content: res.replyText,
        timestamp: new Date().toISOString(),
        language: (res.language as any) || chosenLang,
        isEmergencyAlert: res.isEmergencyAlert,
      };

      setHistory((prev) => [...prev, botMessage]);

      // If in Live mode, we can also forward text into Live session if open
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ text }));
      } else {
        // Fallback speech synthesis playback
        playBrowserSpeech(res.replyText, (res.language as any) || chosenLang);
      }
    } catch (err: any) {
      setHistory((prev) => [
        ...prev,
        {
          id: `bot_${Date.now()}`,
          sender: 'assistant',
          content:
            'I could not connect to the voice intelligence service right now. Please check server status and API configuration.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const playBrowserSpeech = (text: string, lang: 'en' | 'bn' = 'en') => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopAllSpeech = () => {
    if (playerRef.current) {
      playerRef.current.stopAll();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto">
      {/* MedDroid Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950/40 to-slate-900 border border-slate-800 p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono tracking-widest text-teal-400 uppercase font-semibold">
                MedDroid Voice Assistant
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30">
                gemini-3.8-live & gemini-3.5-transcribe
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Real-Time Voice Health Intelligence
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Engage in two-way spoken wellness conversations with low-latency Gemini Live API or transcribe speech with high-accuracy Gemini 3.5 Transcribe in English or Bengali (বাংলা).
            </p>
          </div>

          {/* Mode & Language Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
            {/* Mode Selector */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  cleanupLiveSession();
                  setMode('live');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  mode === 'live'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Live API (Real-Time)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  cleanupLiveSession();
                  setMode('transcribe');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  mode === 'transcribe'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileAudio className="w-3.5 h-3.5" />
                <span>AI Transcribe Mode</span>
              </button>
            </div>

            {/* Language Selector */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  language === 'en' ? 'bg-teal-500/20 text-teal-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('bn')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  language === 'bn' ? 'bg-teal-500/20 text-teal-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                বাংলা
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Voice Interactive Arena */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 flex flex-col items-center justify-center space-y-6 shadow-2xl relative overflow-hidden">
        {/* Animated Background Pulse Waves */}
        {(isSessionActive || isRecordingClip) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 rounded-full bg-teal-500/15 animate-ping" />
            <div className="w-80 h-80 rounded-full bg-cyan-500/10 animate-pulse" />
          </div>
        )}

        {/* Dynamic Waveform Visualizer */}
        <div className="flex items-center justify-center gap-1.5 h-16 w-full max-w-xs">
          {[40, 75, 55, 90, 60, 85, 45, 95, 70, 50, 80, 65].map((h, idx) => {
            const active = isSessionActive || isRecordingClip || isSpeaking;
            return (
              <div
                key={idx}
                className={`w-1.5 rounded-full transition-all duration-150 ${
                  active
                    ? isSpeaking
                      ? 'bg-gradient-to-t from-indigo-500 to-teal-400 animate-pulse'
                      : 'bg-gradient-to-t from-teal-500 to-cyan-400 animate-pulse'
                    : 'bg-slate-800'
                }`}
                style={{
                  height: active ? `${Math.max(16, h * (idx % 2 === 0 ? 1 : 0.75))}px` : '8px',
                }}
              />
            );
          })}
        </div>

        {/* Central Glowing Mic Button */}
        <div className="flex flex-col items-center space-y-3 relative z-10">
          <button
            type="button"
            onClick={mode === 'live' ? toggleLiveSession : toggleClipRecording}
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl ${
              isSessionActive || isRecordingClip
                ? 'bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-rose-500/30 scale-105 ring-4 ring-rose-500/30'
                : 'bg-gradient-to-tr from-teal-500 via-cyan-500 to-indigo-600 text-slate-950 shadow-teal-500/25 hover:scale-105 active:scale-95'
            }`}
          >
            {isSessionActive || isRecordingClip ? (
              <MicOff className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse" />
            ) : (
              <Mic className="w-8 h-8 sm:w-10 sm:h-10" />
            )}
          </button>

          <div className="text-center">
            <span className="text-sm font-bold text-white block">
              {mode === 'live'
                ? isSessionActive
                  ? language === 'bn'
                    ? 'লাইভ সেশন সক্রিয় (gemini-3.8-live)... কথা বলুন'
                    : 'Live Session Active (gemini-3.8-live)... speak freely'
                  : language === 'bn'
                  ? 'রিয়েল-টাইম লাইভ ভয়েস সেশন শুরু করতে চাপুন'
                  : 'Tap to start Gemini 3.8 Live Voice Session'
                : isRecordingClip
                ? language === 'bn'
                  ? 'অডিও রেকর্ড হচ্ছে... থামিয়ে ট্রান্সক্রাইব করতে আবার চাপুন'
                  : 'Recording audio... tap to transcribe with gemini-3.5-transcribe'
                : language === 'bn'
                ? 'মাইকে কথা রেকর্ড করুন এবং ট্রান্সক্রাইব করুন'
                : 'Tap to record & transcribe with gemini-3.5-transcribe'}
            </span>

            <span className="text-xs text-slate-400">
              {mode === 'live'
                ? 'Continuous bidirectional 16kHz PCM streaming over WebSocket'
                : 'High-accuracy audio transcription via Gemini 3.5 Transcribe'}
            </span>
          </div>

          {/* Mute button if audio is playing */}
          {isSpeaking && (
            <button
              onClick={stopAllSpeech}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 text-rose-300 text-xs border border-rose-500/30 hover:bg-slate-700 transition-colors"
            >
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              <span>Stop Audio Playback</span>
            </button>
          )}
        </div>

        {/* Live / Transcription Status Pill */}
        {mode === 'live' && isSessionActive && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
            <span>gemini-3.8-live • 16kHz In / 24kHz Out</span>
          </div>
        )}

        {/* Live Speech-to-Text Transcript Display */}
        {transcript && (
          <div className="w-full max-w-xl p-4 rounded-2xl bg-slate-950/80 border border-teal-500/40 text-center space-y-1">
            <span className="text-[10px] font-mono uppercase text-teal-400 tracking-wider">
              {mode === 'transcribe' ? 'Gemini 3.5 Transcription' : 'Live Transcript'}
            </span>
            <p className="text-sm text-slate-200 font-medium italic">"{transcript}"</p>
          </div>
        )}

        {/* Permission / Configuration Error Banner */}
        {permissionError && (
          <div className="w-full max-w-xl p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Voice Notice:</span>
              <p className="opacity-90">{permissionError}</p>
              <span className="block text-[11px] text-slate-400">
                You can always type your wellness question using the text fallback input below.
              </span>
            </div>
          </div>
        )}

        {/* Text Input Fallback Bar */}
        <div className="w-full max-w-2xl pt-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-2 focus-within:border-teal-500 transition-colors"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                language === 'bn'
                  ? 'অথবা বাংলায় আপনার প্রশ্ন লিখুন (যেমন: স্বাভাবিক রক্তচাপ কত?)...'
                  : 'Or type your health inquiry (e.g. What is normal resting heart rate?)...'
              }
              className="flex-1 bg-transparent px-3 py-2 text-xs text-white focus:outline-none placeholder:text-slate-600"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="p-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition-all disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Voice Suggestions */}
          <div className="flex items-center flex-wrap gap-2 mt-3 text-xs text-slate-400">
            <span className="text-[11px] text-slate-500 font-medium">Quick prompts:</span>
            {language === 'bn' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSendMessage('স্বাভাবিক রক্তচাপ কত থাকা উচিত?')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                >
                  স্বাভাবিক রক্তচাপ কত?
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('খালি পেটে স্বাভাবিক গ্লুকোজ কত?')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                >
                  খালি পেটে গ্লুকোজ কত?
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSendMessage('What is the healthy range for resting pulse?')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                >
                  Resting pulse range?
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('Explain the difference between systolic and diastolic BP.')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                >
                  Systolic vs Diastolic?
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Voice Conversation History */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-teal-400" />
            <h3 className="text-base font-bold text-white">Voice Session History</h3>
          </div>
          <button
            onClick={() => {
              setHistory([
                {
                  id: 'msg_init',
                  sender: 'assistant',
                  content:
                    'Hello! I am MedDroid. Ask me any general health questions in English or Bengali.',
                  timestamp: new Date().toISOString(),
                },
              ]);
            }}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset History</span>
          </button>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
          {history.map((msg) => {
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
                  className={`max-w-xl p-4 rounded-2xl space-y-2 ${
                    isBot
                      ? 'bg-slate-950/80 border border-slate-800 text-slate-200'
                      : 'bg-teal-500 text-slate-950 font-medium ml-12'
                  }`}
                >
                  {msg.isEmergencyAlert && (
                    <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-rose-400 animate-bounce" />
                      <span>EMERGENCY ADVISORY: Call 911 / 112 immediately.</span>
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
                    {isBot && (
                      <button
                        onClick={() => playBrowserSpeech(msg.content, msg.language as any)}
                        className="text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold cursor-pointer"
                        title="Replay Audio"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Replay Audio</span>
                      </button>
                    )}
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
                <RefreshCw className="w-4 h-4 animate-spin" />
              </div>
              <span>Processing speech and clinical guidance with Gemini...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
};
