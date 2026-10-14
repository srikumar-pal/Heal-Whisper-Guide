import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Original Medical Pulse-Shield Caduceus Whisper Icon */}
      <div className={`relative flex items-center justify-center ${iconSizes[size]} rounded-xl bg-gradient-to-br from-teal-500 via-cyan-500 to-indigo-600 p-0.5 shadow-lg shadow-teal-500/20`}>
        <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center overflow-hidden">
          <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-5/6 h-5/6"
          >
            {/* Background whisper aura lines */}
            <circle cx="16" cy="16" r="13" stroke="rgba(20, 184, 166, 0.2)" strokeWidth="1" strokeDasharray="2 2" />
            <path
              d="M16 4C10 4 6 8.5 6 14C6 19.5 12 25 16 28C20 25 26 19.5 26 14C26 8.5 22 4 16 4Z"
              fill="url(#shieldGrad)"
              fillOpacity="0.15"
              stroke="url(#shieldBorder)"
              strokeWidth="1.2"
            />
            {/* Central vital ECG wave */}
            <path
              d="M9 16H12.5L14.2 11.5L16.2 20.5L18.2 13.5L19.5 16H23"
              stroke="#2dd4bf"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Whispering guide sound wave arc */}
            <path
              d="M20 9C21.8 10.4 23 12.5 23 15"
              stroke="#818cf8"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <path
              d="M22 6.5C24.5 8.5 26 11.5 26 15"
              stroke="#818cf8"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeOpacity="0.6"
            />
            <defs>
              <linearGradient id="shieldGrad" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#14b8a6" />
                <stop offset="1" stopColor="#6366f1" />
              </linearGradient>
              <linearGradient id="shieldBorder" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#2dd4bf" />
                <stop offset="1" stopColor="#818cf8" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`font-extrabold tracking-tight text-white dark:text-white ${textSizes[size]}`}>
            Heal<span className="text-teal-400 font-bold">-Whisper</span>
          </span>
          <span className="text-[10px] font-mono tracking-widest px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 font-semibold">
            GUIDE
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[11px] text-slate-400 tracking-wide font-medium">
            AI Digital Health Platform
          </span>
        )}
      </div>
    </div>
  );
};
