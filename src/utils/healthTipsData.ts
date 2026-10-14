/**
 * Heal-Whisper-Guide Practical Wellness Tips & Dynamic Suggestion Engine
 * 
 * Features:
 * - 6 Core categories: Healthy Eating, Physical Activity, Sleep, Hydration, Stress Management, Medication Adherence
 * - Bilingual support: English and Bengali (বাংলা)
 * - Personalized recommendation engine driven strictly by the signed-in user's actual recorded vitals & dose logs
 * - Transparent wellness disclaimers: no disease diagnosis, no medication prescription, no invented data
 */

import { HealthRecord, DoseLog } from '../types';

export type TipCategory =
  | 'healthy_eating'
  | 'physical_activity'
  | 'sleep'
  | 'hydration'
  | 'stress_management'
  | 'medication_adherence';

export interface HealthTip {
  id: string;
  category: TipCategory;
  titleEn: string;
  titleBn: string;
  summaryEn: string;
  summaryBn: string;
  actionEn: string;
  actionBn: string;
  scientificContextEn: string;
  scientificContextBn: string;
  tagEn: string;
  tagBn: string;
  isPersonalized?: boolean;
  personalizationReasonEn?: string;
  personalizationReasonBn?: string;
  clinicalSourceEn?: string;
  clinicalSourceBn?: string;
}

export const CATEGORY_LABELS: Record<TipCategory, { en: string; bn: string; color: string; icon: string }> = {
  healthy_eating: {
    en: 'Healthy Eating',
    bn: 'স্বাস্থ্যকর খাদ্যাভ্যাস',
    color: 'emerald',
    icon: 'Apple',
  },
  physical_activity: {
    en: 'Physical Activity',
    bn: 'শারীরিক সক্রিয়তা',
    color: 'cyan',
    icon: 'Activity',
  },
  sleep: {
    en: 'Sleep Quality',
    bn: 'পর্যাপ্ত ঘুম ও বিশ্রাম',
    color: 'indigo',
    icon: 'Moon',
  },
  hydration: {
    en: 'Hydration',
    bn: 'পর্যাপ্ত পানীয় গ্রহণ',
    color: 'blue',
    icon: 'Droplets',
  },
  stress_management: {
    en: 'Stress Management',
    bn: 'মানসিক চাপ নিয়ন্ত্রণ',
    color: 'teal',
    icon: 'Brain',
  },
  medication_adherence: {
    en: 'Medicine Adherence',
    bn: 'নিয়মিত ওষুধ সেবন',
    color: 'amber',
    icon: 'Pill',
  },
};

export const CORE_WELLNESS_TIPS: HealthTip[] = [
  // Healthy Eating
  {
    id: 'tip_eat_dash',
    category: 'healthy_eating',
    titleEn: 'DASH Principles: Embrace Fresh Greens & Potassium',
    titleBn: 'ড্যাশ ডায়েট: সবুজ শাকসবজি ও পটাসিয়ামযুক্ত খাবার',
    summaryEn: 'Incorporating leafy greens, berries, lentils, and bananas naturally balances sodium levels in the bloodstream.',
    summaryBn: 'সবুজ শাকসবজি, ডাল, বাদাম ও কলা শরীরের সোডিয়ামের ভারসাম্য বজায় রাখতে সহায়তা করে।',
    actionEn: 'Add one extra serving of steamed vegetables or a handful of unsalted almonds to your lunch or dinner.',
    actionBn: 'আপনার দুপুরের বা রাতের খাবারে এক কাপ সেদ্ধ শাকসবজি অথবা এক মুঠো লবণহীন বাদাম যোগ করুন।',
    scientificContextEn: 'Dietary Approaches to Stop Hypertension (DASH) studies show natural potassium promotes healthy blood vessel relaxation.',
    scientificContextBn: 'ড্যাশ ডায়েট গবেষণায় দেখা গেছে যে খাদ্যতালিকাগত পটাসিয়াম রক্তনালী শিথিল রাখতে সহায়তা করে।',
    tagEn: 'Cardiovascular Nutrition',
    tagBn: 'হৃদবান্ধব পুষ্টি',
  },
  {
    id: 'tip_eat_fiber',
    category: 'healthy_eating',
    titleEn: 'Fiber-First Meals for Steadier Energy',
    titleBn: 'আঁশযুক্ত খাবার দিয়ে শুরু করুন',
    summaryEn: 'Eating fiber and proteins before refined carbs cushions the digestion rate and softens rapid glucose elevations.',
    summaryBn: 'কার্বোহাইড্রেট খাবারের আগে আঁশযুক্ত সালাদ বা শাকসবজি খেলে রক্তে শর্করার দ্রুত বৃদ্ধি প্রতিহত হয়।',
    actionEn: 'Begin your main meals with a fresh cucumber or carrot salad before eating rice, bread, or rotis.',
    actionBn: 'ভাত বা রুটি খাওয়ার আগে শসা বা গাজরের তাজা সালাদ খেয়ে খাবার শুরু করুন।',
    scientificContextEn: 'Viscous dietary fiber forms a gentle gel matrix in the gut that slows down carbohydrate absorption.',
    scientificContextBn: 'দ্রবণীয় আঁশ অন্ত্রে পরিপাক প্রক্রিয়া ধীর করে শর্করা শোষণকে স্থিতিশীল রাখে।',
    tagEn: 'Glycemic Balance',
    tagBn: 'গ্লাইসেমিক ভারসাম্য',
  },
  {
    id: 'tip_eat_sodium',
    category: 'healthy_eating',
    titleEn: 'Flavor With Herbs, Garlic, and Lemon Instead of Salt',
    titleBn: 'লবণের পরিবর্তে লেবু, রসুন ও প্রাকৃতিক মসলা ব্যবহার',
    summaryEn: 'Much of daily sodium comes from packaged condiments and table salt. Citrus, ginger, and cumin provide rich savoriness without the salt load.',
    summaryBn: 'খাবারে কাঁচা লবণ পরিহার করে লেবুর রস, রসুন, আদা ও জিরা ব্যবহার করলে স্বাদ ও স্বাস্থ্য দুটোই বজায় থাকে।',
    actionEn: 'Keep the salt shaker off the dining table and season soups or curries with fresh lemon squeeze.',
    actionBn: 'খাবারের টেবিলে কাঁচা লবণের দানি রাখবেন না এবং লেবুর রস দিয়ে স্বাদ বৃদ্ধি করুন।',
    scientificContextEn: 'Lowering daily sodium to under 2,000 mg can reduce systolic blood pressure by 4-8 mmHg in sodium-sensitive adults.',
    scientificContextBn: 'দৈনিক সোডিয়াম গ্রহণ ২,০০০ মিলিগ্রামের নিচে রাখলে রক্তচাপ স্বাভাবিক মাত্রায় থাকে।',
    tagEn: 'Low Sodium Habit',
    tagBn: 'স্বল্প সোডিয়াম অভ্যাস',
  },

  // Physical Activity
  {
    id: 'tip_act_postmeal',
    category: 'physical_activity',
    titleEn: 'The 10-Minute Post-Meal Stroll',
    titleBn: 'খাবারের পর ১০ মিনিটের হালকা হাঁটা',
    summaryEn: 'A relaxed 10 to 15-minute walk within 30 minutes of eating utilizes circulating glucose directly in muscle contractions.',
    summaryBn: 'খাবার খাওয়ার ২০-৩০ মিনিটের মধ্যে ১০-১৫ মিনিট হাঁটলে পেশি রক্ত থেকে অতিরিক্ত গ্লুকোজ সহজেই ব্যবহার করে।',
    actionEn: 'Take a calm stroll around your home or neighborhood terrace after lunch or dinner.',
    actionBn: 'দুপুর বা রাতের খাবারের পর ঘরের বারান্দা বা ছাদে ১০ মিনিট হালকা পায়চারি করুন।',
    scientificContextEn: 'Musculoskeletal glucose uptake is non-insulin dependent during low-intensity contractions, blunting post-meal spikes.',
    scientificContextBn: 'হালকা হাঁটার ফলে ইনসুলিন ছাড়াই পেশি সরাসরি গ্লুকোজ শোষণ করতে পারে।',
    tagEn: 'Post-Meal Movement',
    tagBn: 'খাবার-পরবর্তী হাঁটা',
  },
  {
    id: 'tip_act_aerobic',
    category: 'physical_activity',
    titleEn: 'Consistent Moderate Cardio (150 Mins/Week)',
    titleBn: 'সপ্তাহে ১৫০ মিনিট মাঝারি শারীরিক পরিশ্রম',
    summaryEn: 'Brisk walking, stationary cycling, light swimming, or gardening strengthens cardiovascular reserve and elevates resting energy.',
    summaryBn: 'সপ্তাহে ৫ দিন ৩০ মিনিট করে দ্রুত হাঁটা হৃদযন্ত্র সবল রাখে এবং রক্ত সঞ্চালন উন্নত করে।',
    actionEn: 'Aim for a 30-minute brisk walk 5 days per week at a pace where you can talk but not sing comfortably.',
    actionBn: 'সপ্তাহে ৫ দিন ৩০ মিনিট করে এমন গতিতে হাঁটুন যাতে কথা বলা যায় তবে গান গাওয়া কঠিন হয়।',
    scientificContextEn: 'Regular aerobic activity increases endothelial nitric oxide production, improving vascular elasticity.',
    scientificContextBn: 'নিয়মিত অ্যারোবিক ব্যায়াম রক্তনালীর স্থিতিস্থাপকতা বৃদ্ধি করে রক্ত সঞ্চালন স্বাভাবিক রাখে।',
    tagEn: 'AHA Movement Guideline',
    tagBn: 'হৃদরোগ সমিতির পরামর্শ',
  },

  // Sleep Quality
  {
    id: 'tip_sleep_winddown',
    category: 'sleep',
    titleEn: 'Screen Dimming & Bedroom Coolness',
    titleBn: 'ঘুমানোর আগে পর্দা দূর করা ও শান্ত পরিবেশ',
    summaryEn: 'Blue screen light delays the natural release of melatonin. A cool, dark room signals the hypothalamus to initiate restorative slow-wave sleep.',
    summaryBn: 'মোবাইল বা টিভির নীল আলো মেলাটোনিন হরমোনের নিঃসরণ বাধাগ্রস্ত করে। অন্ধকার ও শান্ত পরিবেশ গভীর ঘুম আনতে সাহায্য করে।',
    actionEn: 'Switch phone and tablet screens to night-mode or put them away 45 minutes before bedtime.',
    actionBn: 'ঘুমাতে যাওয়ার ৪৫ মিনিট আগে মোবাইল বা ল্যাপটপের পর্দা থেকে দূরে থাকুন।',
    scientificContextEn: 'Restorative slow-wave sleep is essential for nocturnal blood pressure dipping and hormonal balance.',
    scientificContextBn: 'গভীর ঘুমের সময়ে রক্তচাপ প্রাকৃতিকভাবে কমে এবং স্নায়ুতন্ত্র বিশ্রাম পায়।',
    tagEn: 'Circadian Hygiene',
    tagBn: 'সার্কাডিয়ান স্বাস্থ্যবিধি',
  },
  {
    id: 'tip_sleep_consistency',
    category: 'sleep',
    titleEn: 'Consistent Sleep & Wake Timing',
    titleBn: 'প্রতিদিন নির্দিষ্ট সময়ে ঘুমানো ও জাগা',
    summaryEn: 'Waking up at approximately the same time every morning anchors your circadian pacemaker, stabilizing cortisol and appetite hormones.',
    summaryBn: 'ছুটির দিনেও একই সময়ে ঘুম থেকে উঠলে শরীরের অভ্যন্তরীণ বায়োলজিক্যাল ঘড়ি সঠিকভাবে কাজ করে।',
    actionEn: 'Set a pleasant wakeup alarm and step into morning sunlight for 5 minutes right after getting up.',
    actionBn: 'সকালে ঘুম থেকে উঠেই ৫-১০ মিনিট ভোরের সূর্যের মৃদু আলোতে দাঁড়ান।',
    scientificContextEn: 'Morning photic exposure suppresses residual melatonin and promotes healthy nighttime sleep onset.',
    scientificContextBn: 'সকালের প্রাকৃতিক আলো রাতের ঘুমের প্রস্তুতিকে সুসংগঠিত করে।',
    tagEn: 'Sleep Schedule',
    tagBn: 'নিয়মিত ঘুমের সময়সূচি',
  },

  // Hydration
  {
    id: 'tip_hydra_morning',
    category: 'hydration',
    titleEn: 'Morning Rehydration Routine',
    titleBn: 'সকালে ঘুম থেকে উঠে পানি পানের অভ্যাস',
    summaryEn: 'After 7-8 hours of nighttime respiration and metabolic filtration, your intravascular volume is gently depleted.',
    summaryBn: 'সারারাত ঘুমের পর সকালে শরীরের তরল ঘাটতি দেখা দেয়। সকালে এক গ্লাস পানি পান শরীরকে চাঙ্গা করে।',
    actionEn: 'Keep a clean glass of water beside your nightstand and drink it comfortably upon waking.',
    actionBn: 'সকালে ঘুম থেকে উঠেই এক গ্লাস স্বাভাবিক তাপমাত্রার পানি পান করুন।',
    scientificContextEn: 'Early morning rehydration supports renal filtration and prevents hemoconcentration that can raise morning pulse.',
    scientificContextBn: 'সকালের পানি পান কিডনির কার্যকারিতা বাড়ায় এবং রক্ত ঘনত্ব স্বাভাবিক রাখে।',
    tagEn: 'Hydration Foundation',
    tagBn: 'হাইড্রেশন ভিত্তি',
  },
  {
    id: 'tip_hydra_steady',
    category: 'hydration',
    titleEn: 'Steady Sips Throughout The Day',
    titleBn: 'সারাদিন ধরে অল্প অল্প করে পানি পান',
    summaryEn: 'Drinking water evenly throughout the day is much more effective than chugging large volumes all at once.',
    summaryBn: 'একবারে অনেক পানি না খেয়ে সারাদিনে সমান ব্যবধানে পানি পান করা শরীরের জন্য অধিক উপকারী।',
    actionEn: 'Carry a reusable water bottle and take 3-4 gentle sips every hour between meals.',
    actionBn: 'একটি বোতল সাথে রাখুন এবং প্রতি ঘণ্টায় কয়েক ঢোক করে পানি পান করার অভ্যাস করুন।',
    scientificContextEn: 'Cellular hydration maintains optimal plasma osmolality and prevents false hunger signals.',
    scientificContextBn: 'সারাদিন পর্যাপ্ত পানি পান কোষীয় বিপাক সচল রাখে এবং অহেতুক ক্ষুধা নিবৃত্ত করে।',
    tagEn: 'Daily Fluid Balance',
    tagBn: 'দৈনিক পানির ভারসাম্য',
  },

  // Stress Management
  {
    id: 'tip_stress_box',
    category: 'stress_management',
    titleEn: '4-7-8 Diaphragmatic Breathing',
    titleBn: '৪-৭-৮ গভীর শ্বাসপ্রশ্বাসের কৌশল',
    summaryEn: 'Inhale through the nose for 4 counts, hold gently for 7 counts, and exhale through the mouth for 8 counts.',
    summaryBn: '৪ সেকেন্ডে নাক দিয়ে শ্বাস নিন, ৭ সেকেন্ড ধরে রাখুন এবং ৮ সেকেন্ড ধরে ধীরে ধীরে মুখ দিয়ে ছাড়ুন।',
    actionEn: 'Complete 4 cycles of this breathing sequence whenever you notice your heart beating fast or feeling tension in your shoulders.',
    actionBn: 'যখনই মানসিক চাপ বা অস্থিরতা অনুভব করবেন, তখন ৪ বার এই নিয়মে শ্বাস নিন ও ছাড়ুন।',
    scientificContextEn: 'Prolonged exhalation activates the parasympathetic vagus nerve, lowering circulating adrenaline and resting pulse.',
    scientificContextBn: 'ধীরগতির শ্বাস ত্যাগ ভেগাস স্নায়ুকে সক্রিয় করে এবং হৃদস্পন্দন ও রক্তচাপ কমাতে সাহায্য করে।',
    tagEn: 'Autonomic Regulation',
    tagBn: 'স্নায়ুতন্ত্রের প্রশান্তি',
  },
  {
    id: 'tip_stress_microbreak',
    category: 'stress_management',
    titleEn: '90-Second Shoulder & Posture Reset',
    titleBn: '৯০ সেকেন্ডের কাঁধ ও বসার ভঙ্গি শিথিলকরণ',
    summaryEn: 'Prolonged desk sitting locks tension into the neck and chest, subconsciously shallowing your breathing pattern.',
    summaryBn: 'দীর্ঘক্ষণ বসে কাজ করলে কাঁধ শক্ত হয়ে যায় এবং শ্বাসপ্রশ্বাস অগভীর হয়ে পড়ে।',
    actionEn: 'Roll your shoulders backward 5 times, unclench your jaw, and let your belly soften.',
    actionBn: 'কাজের ফাঁকে কাঁধ ৫ বার পেছনের দিকে ঘোরান এবং মুখের পেশি শিথিল রাখুন।',
    scientificContextEn: 'Somatic muscular release reduces sympathetic nervous system tone and prevents stress-induced pressure surges.',
    scientificContextBn: 'পেশির শিথিলকরণ স্নায়বিক চাপ কমায় এবং রক্তচাপের আকস্মিক বৃদ্ধি রোধ করে।',
    tagEn: 'Posture & Vagal Tone',
    tagBn: 'শারীরিক অঙ্গবিন্যাস',
  },

  // Medication Adherence
  {
    id: 'tip_med_stacking',
    category: 'medication_adherence',
    titleEn: 'Habit Stacking: Pair Meds With Daily Rituals',
    titleBn: 'অভ্যাসের সাথে ওষুধ সেবনের সময় মেলানো',
    summaryEn: 'Anchor taking your scheduled doses to fixed daily actions such as eating breakfast, brushing teeth, or brewing tea.',
    summaryBn: 'প্রতিদিনের নির্দিষ্ট কাজের সাথে (যেমন নাস্তা খাওয়া বা দাঁত মাজা) ওষুধ খাওয়ার সময় নির্ধারণ করুন।',
    actionEn: 'Place your daily pill organizer right where you make your morning tea or on the breakfast table.',
    actionBn: 'আপনার ওষুধের বক্সটি সকালের নাস্তার টেবিল বা চায়ের কাপের পাশে দৃশ্যমান স্থানে রাখুন।',
    scientificContextEn: 'Habit stacking utilizes established neurological motor pathways to ensure long-term behavioral compliance.',
    scientificContextBn: 'পূর্বের পরিচিত অভ্যাসের সাথে নতুন নিয়ম যুক্ত করলে ওষুধ ভুলে যাওয়ার সম্ভাবনা কমে যায়।',
    tagEn: 'Behavioral Adherence',
    tagBn: 'নিয়মানুবর্তিতা অভ্যাস',
  },
  {
    id: 'tip_med_refill',
    category: 'medication_adherence',
    titleEn: 'The 7-Day Refill Safety Buffer',
    titleBn: 'ওষুধ শেষ হওয়ার ৭ দিন আগেই সংগ্রহের প্রস্তুতি',
    summaryEn: 'Running out of critical maintenance medications over weekends or holidays is a leading cause of rebound pressure spikes.',
    summaryBn: 'ওষুধ সম্পূর্ণ শেষ হওয়ার জন্য অপেক্ষা না করে অন্তত এক সপ্তাহ আগেই পরবর্তী মাসের ওষুধ সংগ্রহ করুন।',
    actionEn: 'Check your pill count every Sunday; when 7 days remain, request a refill immediately.',
    actionBn: 'প্রতি রবিবার ওষুধের স্টক পরীক্ষা করুন এবং এক সপ্তাহের ওষুধ অবশিষ্ট থাকতেই সংগ্রহ করুন।',
    scientificContextEn: 'Abrupt cessation of certain cardiovascular agents can cause sudden rebound adrenergic surge.',
    scientificContextBn: 'রক্তচাপের ওষুধ হঠাৎ বন্ধ করলে রক্তচাপ হঠাৎ আশঙ্কাজনকভাবে বেড়ে যেতে পারে।',
    tagEn: 'Refill Safety',
    tagBn: 'ওষুধের মজুত নিরাপত্তা',
  },
];

/**
 * Generates personalized wellness suggestions strictly derived from the signed-in user's authorized records
 */
export function getPersonalizedHealthTips(
  records: HealthRecord[],
  doses: DoseLog[],
  language: 'en' | 'bn' = 'en'
): HealthTip[] {
  const personalizedTips: HealthTip[] = [];

  const bpRecords = records.filter((r) => r.type === 'blood_pressure' && r.systolic && r.diastolic);
  const sugarRecords = records.filter((r) => r.type === 'blood_sugar' && r.bloodSugarValue);
  const pulseRecords = records.filter((r) => r.type === 'pulse' && r.pulseBpm);

  // 1. Cardiovascular / BP Trend Inspection
  if (bpRecords.length > 0) {
    const avgSys = Math.round(bpRecords.reduce((acc, r) => acc + (r.systolic || 0), 0) / bpRecords.length);
    const avgDia = Math.round(bpRecords.reduce((acc, r) => acc + (r.diastolic || 0), 0) / bpRecords.length);

    if (avgSys >= 130 || avgDia >= 80) {
      personalizedTips.push({
        id: 'pers_bp_dash_sodium',
        category: 'healthy_eating',
        isPersonalized: true,
        titleEn: 'Personalized: Sodium Awareness for Your BP Baseline',
        titleBn: 'আপনার রক্তচাপ ট্রেন্ডের জন্য বিশেষ পরামর্শ: সোডিয়াম নিয়ন্ত্রণ',
        summaryEn: `Your recent blood pressure readings average ${avgSys}/${avgDia} mmHg. Lowering dietary sodium and increasing mineral-rich foods supports healthy arterial flexibility.`,
        summaryBn: `আপনার সাম্প্রতিক রক্তচাপের গড় ${avgSys}/${avgDia} mmHg। খাবারে কাঁচা লবণ পরিহার ও পটাসিয়ামযুক্ত খাবার ধমনীর নমনীয়তা বজায় রাখতে সাহায্য করে।`,
        actionEn: 'Limit canned soups, packaged snacks, and table salt. Season your meals with garlic, black pepper, and lime juice.',
        actionBn: 'প্যাকেটজাত খাবার ও বাড়তি লবণ এড়িয়ে চলুন। রসুন, গোলমরিচ ও লেবুর রস দিয়ে খাবার তৈরি করুন।',
        scientificContextEn: 'ACC/AHA Guidelines note a 1,000 mg/day sodium reduction significantly assists blood pressure regulation.',
        scientificContextBn: 'ক্লিনিকাল নির্দেশিকা অনুযায়ী প্রতিদিন ১,০০০ মিলিগ্রাম সোডিয়াম কমালে রক্তচাপ স্বাভাবিক রাখা সহজ হয়।',
        tagEn: 'Relevant to Your BP Average',
        tagBn: 'আপনার রক্তচাপের সাথে প্রাসঙ্গিক',
        personalizationReasonEn: `Triggered by your logged average of ${avgSys}/${avgDia} mmHg across ${bpRecords.length} recorded reading(s).`,
        personalizationReasonBn: `আপনার সংরক্ষিত ${bpRecords.length}টি পরিমাপে গড় ${avgSys}/${avgDia} mmHg থাকায় এই পরামর্শটি নির্বাচন করা হয়েছে।`,
        clinicalSourceEn: 'ACC/AHA 2017 Clinical Practice Guidelines',
        clinicalSourceBn: 'আমেরিকান হার্ট অ্যাসোসিয়েশন নির্দেশিকা',
      });
    }
  }

  // 2. Metabolic / Glucose Trend Inspection
  if (sugarRecords.length > 0) {
    const avgSugar = Math.round(sugarRecords.reduce((acc, r) => acc + (r.bloodSugarValue || 0), 0) / sugarRecords.length);
    const hasPostMealSpike = sugarRecords.some((r) => (r.bloodSugarValue || 0) >= 160);

    if (avgSugar >= 115 || hasPostMealSpike) {
      personalizedTips.push({
        id: 'pers_sugar_stroll',
        category: 'physical_activity',
        isPersonalized: true,
        titleEn: 'Personalized: 15-Minute Post-Meal Strolls',
        titleBn: 'আপনার গ্লুকোজ ট্রেন্ডের জন্য বিশেষ পরামর্শ: খাবার শেষে হালকা হাঁটা',
        summaryEn: `Your recorded glucose logs indicate values reaching ${avgSugar} mg/dL. Light movement immediately after meals uses excess blood sugar for fuel without stressing joints.`,
        summaryBn: `আপনার সাম্প্রতিক গ্লুকোজ পরিমাপের গড় ${avgSugar} mg/dL। প্রধান খাবারের পর ১৫ মিনিট হালকা হাঁটা অতিরিক্ত শর্করার মাত্রা কমাতে কার্যকর।`,
        actionEn: 'Schedule a calm 10 to 15-minute walk around your apartment or neighborhood terrace after lunch and dinner.',
        actionBn: 'দুপুর ও রাতের খাবারের পর ১০ থেকে ১৫ মিনিট খোলা জায়গায় বা ছাদে হালকা পদচারণা করুন।',
        scientificContextEn: 'ADA Standards of Care highlight mild post-prandial muscular contractions for reducing glucose excursions.',
        scientificContextBn: 'খাবার পরবর্তী হালকা হাঁটা ইনসুলিন কার্যকারিতা উন্নত করতে ক্লিনিকালি প্রমাণিত।',
        tagEn: 'Relevant to Your Glucose Logs',
        tagBn: 'আপনার শর্করার পরিমাপের সাথে প্রাসঙ্গিক',
        personalizationReasonEn: `Based on your average logged glucose (${avgSugar} mg/dL) across ${sugarRecords.length} check(s).`,
        personalizationReasonBn: `আপনার সংরক্ষিত ${sugarRecords.length}টি পরীক্ষার গড় (${avgSugar} mg/dL) অনুযায়ী প্রস্তুত।`,
        clinicalSourceEn: 'ADA 2024 Standards of Medical Care',
        clinicalSourceBn: 'আমেরিকান ডায়াবেটিস অ্যাসোসিয়েশন স্ট্যান্ডার্ডস',
      });
    }
  }

  // 3. Pulse / Heart Rate Inspection
  if (pulseRecords.length > 0) {
    const avgPulse = Math.round(pulseRecords.reduce((acc, r) => acc + (r.pulseBpm || 0), 0) / pulseRecords.length);

    if (avgPulse >= 85) {
      personalizedTips.push({
        id: 'pers_pulse_vagal',
        category: 'stress_management',
        isPersonalized: true,
        titleEn: 'Personalized: Vagal Breathing to Steady Resting Pulse',
        titleBn: 'আপনার পালস রেটের জন্য বিশেষ পরামর্শ: শ্বাসপ্রশ্বাসের ব্যায়াম',
        summaryEn: `Your logged resting heart rate averages ${avgPulse} BPM. Mindful breathing helps restore parasympathetic balance when daily stress builds up.`,
        summaryBn: `আপনার সাম্প্রতিক পালস রেটের গড় ${avgPulse} BPM। নিয়মিত গভীর শ্বাসপ্রশ্বাস হৃদস্পন্দন শান্ত ও সুষম রাখতে সহায়তা করে।`,
        actionEn: 'Practice 4-7-8 diaphragmatic breathing for 3 minutes before taking your resting vitals or before sleeping.',
        actionBn: 'বিশ্রামকালীন বা রাতে ঘুমাতে যাওয়ার আগে ৩ মিনিট ধীরে গভীর শ্বাস নিন ও ছাড়ুন।',
        scientificContextEn: 'Deep rhythmic breathing enhances baroreflex sensitivity and soothes sympathetic overdrive.',
        scientificContextBn: 'নিয়মিত ছন্দময় শ্বাসপ্রশ্বাস হৃদস্পন্দনের গতি প্রশমিত রাখতে সহায়তা করে।',
        tagEn: 'Relevant to Your Heart Rate',
        tagBn: 'আপনার হৃদস্পন্দন গড়ের সাথে প্রাসঙ্গিক',
        personalizationReasonEn: `Triggered by your average resting pulse of ${avgPulse} BPM.`,
        personalizationReasonBn: `আপনার গড় বিশ্রামকালীন পালস ${avgPulse} BPM হওয়ার কারণে এই পরামর্শটি দেওয়া হয়েছে।`,
        clinicalSourceEn: 'AHA Heart Rate Guidelines',
        clinicalSourceBn: 'আমেরিকান হার্ট অ্যাসোসিয়েশন গাইডলাইন',
      });
    }
  }

  // 4. Medication Compliance Inspection
  if (doses.length >= 3) {
    const takenCount = doses.filter((d) => d.status === 'taken').length;
    const adherenceRate = Math.round((takenCount / doses.length) * 100);

    if (adherenceRate < 85) {
      personalizedTips.push({
        id: 'pers_med_routine',
        category: 'medication_adherence',
        isPersonalized: true,
        titleEn: 'Personalized: Strengthening Your Medicine Routine',
        titleBn: 'আপনার ওষুধ সেবনের রুটিন দৃঢ় করার বিশেষ পরামর্শ',
        summaryEn: `Your recent dose compliance is approximately ${adherenceRate}%. Consistent adherence is the most reliable way to maintain steady cardiovascular and metabolic numbers.`,
        summaryBn: `আপনার সাম্প্রতিক ওষুধ গ্রহণের নিয়মাবর্তিতা ${adherenceRate}%। নিয়মিত সময়ে ওষুধ সেবন দীর্ঘমেয়াদী সুস্থতার মূল চাবিকাঠি।`,
        actionEn: 'Place your evening dose box right beside your drinking water pitcher or set a recurring alarm labeled with your medicine name.',
        actionBn: 'আপনার ওষুধের বক্সটি পানি পানের পাত্রের পাশে রাখুন অথবা মোবাইলে নির্দিষ্ট অ্যালার্ম দিয়ে রাখুন।',
        scientificContextEn: 'Pharmacokinetic half-lives require consistent timing to prevent sub-therapeutic plasma troughs.',
        scientificContextBn: 'রক্তে ওষুধের কার্যকারিতা বজায় রাখতে প্রতিদিন নির্দিষ্ট সময়ে সেবন করা আবশ্যক।',
        tagEn: 'Adherence Support',
        tagBn: 'নিয়মানুবর্তিতা সহায়ক',
        personalizationReasonEn: `Based on your recent medication logs (${takenCount}/${doses.length} doses logged as taken).`,
        personalizationReasonBn: `আপনার সংরক্ষিত ডোজে ${takenCount}/${doses.length}টি নিয়মিত রেকর্ড হওয়ায় প্রস্তুত।`,
        clinicalSourceEn: 'WHO Adherence to Long-Term Therapies',
        clinicalSourceBn: 'বিশ্ব স্বাস্থ্য সংস্থা নিয়মানুবর্তিতা নির্দেশিকা',
      });
    }
  }

  return personalizedTips;
}
