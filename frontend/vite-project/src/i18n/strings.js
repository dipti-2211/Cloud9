/**
 * strings.js — Static bilingual lookup for UI labels and notification strings.
 *
 * Covers: risk categories, road status, alert levels, and all toast/notification
 * messages used across the app.  Hand-written Hindi — no paid translation API needed.
 *
 * Usage:  import { strings } from './strings';
 *         const t = (key) => strings[lang][key] ?? strings.en[key] ?? key;
 */

export const strings = {
  en: {
    // ── Risk categories ────────────────────────────────────────────────────
    "Very Low":  "Very Low",
    "Low":       "Low",
    "Moderate":  "Moderate",
    "High":      "High",
    "Very High": "Very High",

    // ── Alert / severity levels ────────────────────────────────────────────
    "CRITICAL": "Critical",
    "WARNING":  "Warning",
    "INFO":     "Info",

    // ── Road status ────────────────────────────────────────────────────────
    "OPEN":      "Open",
    "CAUTION":   "Caution",
    "HIGH RISK": "High Risk",
    "HIGH_RISK": "High Risk",
    "BLOCKED":   "Blocked",
    "RESTRICTED":"Restricted",

    // ── Incident status ────────────────────────────────────────────────────
    "ACTIVE":     "Active",
    "RESOLVED":   "Resolved",
    "MONITORING": "Monitoring",

    // ── Toast / notification messages ──────────────────────────────────────
    "incident_reported":   "Incident reported successfully. Awaiting verification.",
    "saved_offline":       "Saved offline — will sync when connection returns.",
    "synced_queued":       "queued report(s) synced successfully.",
    "sync_failed":         "Failed to sync offline report. Will retry.",
    "location_fetching":   "Fetching your location…",
    "location_granted":    "Location acquired.",
    "location_denied":     "Location access denied.",
    "no_high_risk_alerts": "No high-risk alerts yet.",
    "no_alerts":           "No alerts yet",
    "risk_label":          "Risk",

    // ── Rainfall source ────────────────────────────────────────────────────
    "rainfall_source_live":               "Live rainfall (Open-Meteo)",
    "rainfall_source_historical_average": "Historical average",
  },

  hi: {
    // ── जोखिम श्रेणियाँ ────────────────────────────────────────────────────
    "Very Low":  "बहुत कम",
    "Low":       "कम",
    "Moderate":  "मध्यम",
    "High":      "उच्च",
    "Very High": "बहुत उच्च",

    // ── चेतावनी / गंभीरता स्तर ─────────────────────────────────────────────
    "CRITICAL": "अत्यंत गंभीर",
    "WARNING":  "चेतावनी",
    "INFO":     "सूचना",

    // ── सड़क की स्थिति ──────────────────────────────────────────────────────
    "OPEN":      "खुली",
    "CAUTION":   "सावधान",
    "HIGH RISK": "उच्च जोखिम",
    "HIGH_RISK": "उच्च जोखिम",
    "BLOCKED":   "अवरुद्ध",
    "RESTRICTED":"प्रतिबंधित",

    // ── घटना की स्थिति ─────────────────────────────────────────────────────
    "ACTIVE":     "सक्रिय",
    "RESOLVED":   "हल हुई",
    "MONITORING": "निगरानी में",

    // ── टोस्ट / अधिसूचना संदेश ─────────────────────────────────────────────
    "incident_reported":   "घटना सफलतापूर्वक रिपोर्ट की गई। सत्यापन की प्रतीक्षा है।",
    "saved_offline":       "ऑफ़लाइन सहेजा गया — कनेक्शन वापस आने पर सिंक होगा।",
    "synced_queued":       "कतारबद्ध रिपोर्ट सफलतापूर्वक सिंक की गईं।",
    "sync_failed":         "ऑफ़लाइन रिपोर्ट सिंक करने में विफल। पुनः प्रयास होगा।",
    "location_fetching":   "आपका स्थान प्राप्त किया जा रहा है…",
    "location_granted":    "स्थान प्राप्त हुआ।",
    "location_denied":     "स्थान पहुँच अस्वीकृत।",
    "no_high_risk_alerts": "अभी तक कोई उच्च-जोखिम चेतावनी नहीं।",
    "no_alerts":           "अभी कोई चेतावनी नहीं",
    "risk_label":          "जोखिम",

    // ── वर्षा स्रोत ────────────────────────────────────────────────────────
    "rainfall_source_live":               "लाइव वर्षा (Open-Meteo)",
    "rainfall_source_historical_average": "ऐतिहासिक औसत",
  },

  bn: {
    // ── ঝুঁকি বিভাগ ────────────────────────────────────────────────────────
    "Very Low":  "খুব কম",
    "Low":       "কম",
    "Moderate":  "মাঝারি",
    "High":      "উচ্চ",
    "Very High": "খুব উচ্চ",

    // ── সতর্কতা / তীব্রতা স্তর ─────────────────────────────────────────────
    "CRITICAL": "সংকটজনক",
    "WARNING":  "সতর্কতা",
    "INFO":     "তথ্য",

    // ── রাস্তার অবস্থা ──────────────────────────────────────────────────────
    "OPEN":       "উন্মুক্ত",
    "CAUTION":    "সতর্ক থাকুন",
    "HIGH RISK":  "উচ্চ ঝুঁকি",
    "HIGH_RISK":  "উচ্চ ঝুঁকি",
    "BLOCKED":    "অবরুদ্ধ",
    "RESTRICTED": "সীমাবদ্ধ",

    // ── ঘটনার অবস্থা ─────────────────────────────────────────────────────
    "ACTIVE":     "সক্রিয়",
    "RESOLVED":   "সমাধান হয়েছে",
    "MONITORING": "নজরদারিতে",

    // ── বিজ্ঞপ্তি বার্তা ──────────────────────────────────────────────────
    "incident_reported":   "ঘটনাটি সফলভাবে রিপোর্ট করা হয়েছে। যাচাইকরণের অপেক্ষায় রয়েছে।",
    "saved_offline":       "অফলাইনে সংরক্ষিত — সংযোগ ফিরলে সিঙ্ক হবে।",
    "synced_queued":       "রিপোর্ট সফলভাবে সিঙ্ক হয়েছে।",
    "sync_failed":         "অফলাইন রিপোর্ট সিঙ্ক করতে ব্যর্থ হয়েছে। পুনরায় চেষ্টা করা হবে।",
    "location_fetching":   "আপনার অবস্থান খোঁজা হচ্ছে…",
    "location_granted":    "অবস্থান পাওয়া গেছে।",
    "location_denied":     "অবস্থানের অনুমতি দেওয়া হয়নি।",
    "no_high_risk_alerts": "এখনও কোনও উচ্চ ঝুঁকির সতর্কতা নেই।",
    "no_alerts":           "এখনও কোনও সতর্কতা নেই",
    "risk_label":          "ঝুঁকি",

    // ── বৃষ্টিপাতের উৎস ────────────────────────────────────────────────────
    "rainfall_source_live":               "লাইভ বৃষ্টিপাত (Open-Meteo)",
    "rainfall_source_historical_average": "ঐতিহাসিক গড়",
  },
};
