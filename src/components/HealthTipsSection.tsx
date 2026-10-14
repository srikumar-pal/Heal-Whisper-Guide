import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Apple,
  Activity,
  Moon,
  Droplets,
  Brain,
  Pill,
  Languages,
  Search,
  CheckCircle2,
  Lightbulb,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { HealthRecord, DoseLog } from '../types';
import {
  HealthTip,
  TipCategory,
  CATEGORY_LABELS,
  CORE_WELLNESS_TIPS,
  getPersonalizedHealthTips,
} from '../utils/healthTipsData';

interface HealthTipsSectionProps {
  records: HealthRecord[];
  doses: DoseLog[];
  preferredLanguage?: 'en' | 'bn' | 'es';
}

export const HealthTipsSection: React.FC<HealthTipsSectionProps> = ({
  records,
  doses,
  preferredLanguage = 'en',
}) => {
  // Local language toggle with default from user preference
  const [lang, setLang] = useState<'en' | 'bn'>(preferredLanguage === 'bn' ? 'bn' : 'en');
  const [selectedCategory, setSelectedCategory] = useState<TipCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamically compute personalized tips based strictly on signed-in user's actual logs
  const personalizedTips = useMemo(() => {
    return getPersonalizedHealthTips(records, doses, lang);
  }, [records, doses, lang]);

  // Combine personalized tips (top priority) + core tips
  const allTips = useMemo(() => {
    return [...personalizedTips, ...CORE_WELLNESS_TIPS];
  }, [personalizedTips]);

  // Filtered tips
  const filteredTips = useMemo(() => {
    return allTips.filter((tip) => {
      // Category filter
      if (selectedCategory !== 'all' && tip.category !== selectedCategory) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (lang === 'bn' ? tip.titleBn : tip.titleEn).toLowerCase();
        const summary = (lang === 'bn' ? tip.summaryBn : tip.summaryEn).toLowerCase();
        const action = (lang === 'bn' ? tip.actionBn : tip.actionEn).toLowerCase();
        const tag = (lang === 'bn' ? tip.tagBn : tip.tagEn).toLowerCase();
        return title.includes(q) || summary.includes(q) || action.includes(q) || tag.includes(q);
      }
      return true;
    });
  }, [allTips, selectedCategory, searchQuery, lang]);

  const categories: { id: TipCategory | 'all'; label: string; icon: any }[] = [
    { id: 'all', label: lang === 'bn' ? 'সব বিষয়' : 'All Categories', icon: Sparkles },
    { id: 'healthy_eating', label: CATEGORY_LABELS.healthy_eating[lang], icon: Apple },
    { id: 'physical_activity', label: CATEGORY_LABELS.physical_activity[lang], icon: Activity },
    { id: 'sleep', label: CATEGORY_LABELS.sleep[lang], icon: Moon },
    { id: 'hydration', label: CATEGORY_LABELS.hydration[lang], icon: Droplets },
    { id: 'stress_management', label: CATEGORY_LABELS.stress_management[lang], icon: Brain },
    { id: 'medication_adherence', label: CATEGORY_LABELS.medication_adherence[lang], icon: Pill },
  ];

  return (
    <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-7 space-y-6 shadow-xl">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {lang === 'bn' ? 'দৈনন্দিন স্বাস্থ্য ও সুস্থতা পরামর্শ' : 'Daily Health & Wellness Guide'}
              </h3>
              {personalizedTips.length > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30">
                  {lang === 'bn'
                    ? `${personalizedTips.length}টি ব্যক্তিগত পরামর্শ সক্রিয়`
                    : `${personalizedTips.length} Personalized Suggestion${personalizedTips.length > 1 ? 's' : ''}`}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'bn'
                ? 'খাদ্যাভ্যাস, শরীরচর্চা, ঘুম, পানি পান এবং ওষুধ সেবনের বাস্তবমুখী সুস্থতা টিপস।'
                : 'Evidence-informed lifestyle habits for nutrition, activity, sleep, hydration, and adherence.'}
            </p>
          </div>
        </div>

        {/* Language Switcher & Search */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Language Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <Languages className="w-3.5 h-3.5 text-teal-400 ml-1.5" />
            <button
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                lang === 'en'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLang('bn')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                lang === 'bn'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              বাংলা
            </button>
          </div>
        </div>
      </div>

      {/* Personalized Highlights Banner if any personalized suggestions exist */}
      {personalizedTips.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-950/40 via-slate-950 to-slate-950 border border-teal-500/30 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <h4 className="text-xs font-bold text-teal-300 uppercase tracking-wider">
              {lang === 'bn' ? 'আপনার সংরক্ষিত ট্রেন্ড অনুযায়ী তৈরি পরামর্শ' : 'Personalized From Your Recorded Trends'}
            </h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {lang === 'bn'
              ? 'আপনার রক্তচাপ, রক্তের শর্করা, পালস বা ওষুধের লগ পর্যালোচনা করে বিশেষ টিপসগুলো হাইলাইট করা হয়েছে। এগুলো সাধারণ সুস্থতা সহায়িকা হিসেবে অনুসরণ করুন।'
              : 'The highlighted cards below are synthesized using your actual logged vitals and dose history to provide relevant, cautious lifestyle guidance.'}
          </p>
        </div>
      )}

      {/* Category Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-teal-500 text-slate-950 font-bold shadow-md'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-56 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'bn' ? 'পরামর্শ খুঁজুন...' : 'Search health tips...'}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Tips Grid */}
      {filteredTips.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500">
          {lang === 'bn' ? 'কোনো পরামর্শ পাওয়া যায়নি।' : 'No tips found matching your filter criteria.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTips.map((tip) => {
            const title = lang === 'bn' ? tip.titleBn : tip.titleEn;
            const summary = lang === 'bn' ? tip.summaryBn : tip.summaryEn;
            const action = lang === 'bn' ? tip.actionBn : tip.actionEn;
            const context = lang === 'bn' ? tip.scientificContextBn : tip.scientificContextEn;
            const tag = lang === 'bn' ? tip.tagBn : tip.tagEn;
            const reason = lang === 'bn' ? tip.personalizationReasonBn : tip.personalizationReasonEn;
            const source = lang === 'bn' ? tip.clinicalSourceBn : tip.clinicalSourceEn;

            let categoryIcon = Apple;
            if (tip.category === 'physical_activity') categoryIcon = Activity;
            else if (tip.category === 'sleep') categoryIcon = Moon;
            else if (tip.category === 'hydration') categoryIcon = Droplets;
            else if (tip.category === 'stress_management') categoryIcon = Brain;
            else if (tip.category === 'medication_adherence') categoryIcon = Pill;

            const CategoryIcon = categoryIcon;

            return (
              <div
                key={tip.id}
                className={`rounded-2xl p-4.5 flex flex-col justify-between border transition-all space-y-3.5 ${
                  tip.isPersonalized
                    ? 'bg-gradient-to-br from-slate-950 via-slate-950 to-teal-950/30 border-teal-500/40 shadow-lg shadow-teal-500/5 hover:border-teal-400'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  {/* Category & Badge Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <CategoryIcon className="w-3.5 h-3.5 text-teal-400" />
                      <span>{CATEGORY_LABELS[tip.category][lang]}</span>
                    </div>

                    {tip.isPersonalized ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>{lang === 'bn' ? 'ব্যক্তিগত' : 'Personalized'}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        {tag}
                      </span>
                    )}
                  </div>

                  {/* Title & Summary */}
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
                      {title}
                    </h4>
                    <p className="text-xs text-slate-300/90 mt-1.5 leading-relaxed">
                      {summary}
                    </p>
                  </div>

                  {/* Practical Action Box */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-mono uppercase font-bold text-teal-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{lang === 'bn' ? 'বাস্তবসম্মত করণীয়' : 'Actionable Habit'}</span>
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed font-medium">
                      {action}
                    </p>
                  </div>

                  {/* Context / Reason */}
                  {tip.isPersonalized && reason && (
                    <div className="text-[11px] text-teal-300/90 bg-teal-950/30 p-2 rounded-lg border border-teal-500/20 leading-relaxed">
                      <strong>{lang === 'bn' ? 'কারণ: ' : 'Log Insight: '}</strong>
                      {reason}
                    </div>
                  )}
                </div>

                {/* Footer Reference */}
                <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10.5px] text-slate-500 font-mono">
                  <span className="truncate max-w-[220px]">
                    {source || (lang === 'bn' ? 'ক্লিনিকাল সুস্থতা গাইডলাইন' : 'Clinical Wellness Guidelines')}
                  </span>
                  <span className="text-teal-400 text-[11px]">
                    {lang === 'bn' ? 'সুস্থ থাকুন' : 'Stay Healthy'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mandatory Clinical Disclaimer Banner */}
      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/70 flex items-start gap-2.5 text-xs text-slate-400 leading-relaxed">
        <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-300 font-semibold">
            {lang === 'bn' ? 'ক্লিনিকাল নির্দেশিকা ও নীতিমালা: ' : 'Clinical Reference & Wellness Boundary: '}
          </strong>
          <span>
            {lang === 'bn'
              ? 'এই তথ্যগুলো শুধুমাত্র সাধারণ স্বাস্থ্য সচেতনতা ও জীবনধারা উন্নয়নের জন্য প্রস্তুত। এটি কোনো রোগের ডায়াগনোসিস বা ওষুধের প্রেসক্রিপশন নয়। স্বাস্থ্য বিষয়ক যেকোনো সিদ্ধান্তের জন্য আপনার নিবন্ধিত চিকিৎসকের পরামর্শ নিন।'
              : 'These tips provide general lifestyle and dietary educational guidance. They do not constitute medical diagnosis, clinical evaluation, or prescription. Always consult your qualified healthcare provider for personalized medical decisions.'}
          </span>
        </div>
      </div>
    </div>
  );
};
