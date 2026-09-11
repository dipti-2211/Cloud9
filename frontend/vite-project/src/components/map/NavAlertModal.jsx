import { useState } from 'react';
import {
  AlertTriangle, ShieldAlert, ShieldCheck, Play, X,
  ArrowRight, MapPin, Clock, Gauge, Compass, CheckCircle2, ChevronRight
} from 'lucide-react';

export const NAV_ALERT_I18N = {
  en: {
    modalTitle: 'Navigation Safety Advisory & Route Risk Alert',
    badge: 'PRE-TRIP SAFETY ADVISORY',
    langSelector: 'Language',
    routeOverview: 'Selected Route Overview',
    from: 'Origin',
    to: 'Destination',
    distance: 'Distance',
    estTime: 'Est. Travel Time',
    riskAssessment: 'Road Hazard & Landslide Risk Assessment',
    overallRisk: 'Route Hazard Score',
    highAlertTitle: 'CRITICAL HAZARDS DETECTED ALONG THIS ROUTE',
    cautionAlertTitle: 'MODERATE WEATHER & TERRAIN HAZARDS DETECTED',
    safeAlertTitle: 'ROUTE CLEAR — MINIMAL HAZARDS DETECTED',
    highAlertMsg: 'This route traverses active landslide sectors and steep mountain passes in North-East India. Heavy rainfall and steep slopes significantly increase landslide, rockfall, and road blockage probability. Drive with extreme vigilance and maintain low speeds.',
    cautionAlertMsg: 'Moderate slope angles and rainfall saturation detected along segments of this route. Exercise caution and adhere to highway safety advisories.',
    safeAlertMsg: 'No critical road blockages or high-risk landslide zones detected along this selected path. Monitor weather conditions during transit.',
    crossedHazardsTitle: 'Hazard Corridors Crossed by Route',
    noHazards: 'No major road hazards detected along this route.',
    road: 'Road',
    district: 'District',
    slope: 'Slope',
    rainfall: '7d Rainfall',
    hazardReason: 'Hazard Note',
    actionProceed: 'Proceed with Navigation',
    actionCancel: 'Cancel / Re-plan',
    actionSwitchSafer: 'Switch to Safer Alternative Route',
    disclaimer: 'AI Geological Early Warning Engine • Real-time NER Road Safety Network',
    highBadge: 'HIGH RISK',
    cautionBadge: 'CAUTION',
    lowBadge: 'CLEAR',
  },
  hi: {
    modalTitle: 'नेविगेशन सुरक्षा परामर्श एवं मार्ग जोखिम चेतावनी',
    badge: 'यात्रा-पूर्व सुरक्षा परामर्श',
    langSelector: 'भाषा',
    routeOverview: 'चयनित मार्ग का विवरण',
    from: 'प्रारंभिक स्थल',
    to: 'गंतव्य',
    distance: 'दूरी',
    estTime: 'अनुमानित समय',
    riskAssessment: 'सड़क खतरा एवं भूस्खलन जोखिम मूल्यांकन',
    overallRisk: 'कुल मार्ग जोखिम स्कोर',
    highAlertTitle: 'मार्ग में गंभीर भूस्खलन एवं सड़क खतरे पाए गए हैं',
    cautionAlertTitle: 'मध्यम पर्वतीय एवं मौसमीय खतरे मौजूद हैं',
    safeAlertTitle: 'मार्ग सुरक्षित है — कोई बड़ा खतरा नहीं पाया गया',
    highAlertMsg: 'यह मार्ग पूर्वोत्तर भारत के सक्रिय भूस्खलन क्षेत्रों और संवेदनशील पहाड़ी रास्तों से गुजरता है। भारी बारिश और तीव्र ढलानों के कारण चट्टानें गिरने तथा मार्ग अवरुद्ध होने का गंभीर जोखिम है। अत्यंत सावधानी बरतें और गति धीमी रखें।',
    cautionAlertMsg: 'इस मार्ग पर मध्यम ढलान और वर्षा दर्ज की गई है। सड़क सुरक्षा दिशानिर्देशों का पालन करें और सतर्कता से वाहन चलाएं।',
    safeAlertMsg: 'वर्तमान में इस मार्ग पर कोई बड़ी रुकावट या उच्च भूस्खलन खतरा दर्ज नहीं है। सुरक्षित यात्रा का आनंद लें।',
    crossedHazardsTitle: 'मार्ग में पड़ने वाले खतरनाक सड़क खंड',
    noHazards: 'इस मार्ग पर कोई बड़ा सड़क खतरा नहीं मिला।',
    road: 'सड़क',
    district: 'जिला',
    slope: 'ढलान',
    rainfall: '7 दिन वर्षा',
    hazardReason: 'खतरे का कारण',
    actionProceed: 'नेविगेशन शुरू करें',
    actionCancel: 'रद्द करें / पुनः योजना बनाएं',
    actionSwitchSafer: 'सुरक्षित वैकल्पिक मार्ग चुनें',
    disclaimer: 'पूर्वोत्तर भूस्खलन एवं भूगर्भीय पूर्व चेतावनी प्रणाली द्वारा वास्तविक समय अलर्ट',
    highBadge: 'उच्च जोखिम',
    cautionBadge: 'सावधानी',
    lowBadge: 'सुरक्षित',
  },
  bn: {
    modalTitle: 'নেভিগেশন সুরক্ষা পরামর্শ ও রুট ঝুঁকি সতর্কতা',
    badge: 'যাত্রা-পূর্ব সুরক্ষা বিজ্ঞপ্তি',
    langSelector: 'ভাষা',
    routeOverview: 'নির্বাচিত পথের বিবরণ',
    from: 'যাত্রাস্থল',
    to: 'গন্তব্য',
    distance: 'দূরত্ব',
    estTime: 'আনুমানিক সময়',
    riskAssessment: 'সড়ক বিপদ ও ভূমিধস ঝুঁকি মূল্যায়ন',
    overallRisk: 'সামগ্রিক রুট ঝুঁকি স্কোর',
    highAlertTitle: 'রুটে অত্যন্ত বিপজ্জনক ভূমিধস ও সড়ক ঝুঁকি শনাক্ত হয়েছে',
    cautionAlertTitle: 'মাঝারি আবহাওয়া ও পাহাড়ি ঝুঁকি শনাক্ত হয়েছে',
    safeAlertTitle: 'পথ সম্পূর্ণ নিরাপদ — কোনো সক্রিয় বিপদ পাওয়া যায়নি',
    highAlertMsg: 'এই পথটি উত্তর-পূর্ব ভারতের সক্রিয় ভূমিধসপ্রবণ পাহাড়ি গিরিপথ দিয়ে অতিক্রম করে। ভারী বৃষ্টিপাত ও খাড়া ঢালের কারণে পাথর ও মাটি ধসে পড়ার আশঙ্কা অত্যন্ত বেশি। অত্যন্ত সাবধানে এবং নিয়ন্ত্রিত গতিতে গাড়ি চালান।',
    cautionAlertMsg: 'এই রুটের কিছু অংশে পাহাড়ি বৃষ্টি ও মাঝারি ঢাল রয়েছে। সাধারণ সতর্কতা অবলম্বন করে সাবধানে যাত্রা করুন।',
    safeAlertMsg: 'বর্তমানে এই নির্বাচিত রুটে কোনো সক্রিয় সড়ক অবরোধ নেই। সাবধানে ভ্রমণ করুন।',
    crossedHazardsTitle: 'রুটে অবস্থিত ঝুঁকিপূর্ণ সড়ক এলাকাসমূহ',
    noHazards: 'এই রুটে কোনো বড় ধরনের ঝুঁকি শনাক্ত হয়নি।',
    road: 'সড়ক',
    district: 'জেলা',
    slope: 'ঢাল',
    rainfall: '৭ দিনের বৃষ্টি',
    hazardReason: 'ঝুঁকির কারণ',
    actionProceed: 'নেভিগেশন শুরু করুন',
    actionCancel: 'বাতিল করুন',
    actionSwitchSafer: 'নিরাপদ বিকল্প পথ বেছে নিন',
    disclaimer: 'উত্তর-পূর্ব ভূতাত্ত্বিক প্রাক-সতর্কতা ইঞ্জিন দ্বারা রিয়েল-টাইম তথ্য',
    highBadge: 'উচ্চ ঝুঁকি',
    cautionBadge: 'সতর্কতা',
    lowBadge: 'নিরাপদ',
  },
};

export const NavAlertModal = ({
  route,
  crossedSegments = [],
  highSegments = [],
  medSegments = [],
  fromName = 'Current Location',
  toName = 'Destination',
  saferAlt = null,
  lang = 'en',
  onLangChange,
  onProceed,
  onCancel,
  onSwitchSafer,
}) => {
  const [currentLang, setCurrentLang] = useState(lang);

  const handleLangSwitch = (newLang) => {
    setCurrentLang(newLang);
    if (onLangChange) onLangChange(newLang);
  };

  const t = NAV_ALERT_I18N[currentLang] || NAV_ALERT_I18N.en;

  const isHigh = highSegments.length > 0;
  const isMed = !isHigh && medSegments.length > 0;

  // Header styling based on risk severity
  const headerBg = isHigh
    ? 'linear-gradient(135deg, #dc2626, #991b1b)'
    : isMed
    ? 'linear-gradient(135deg, #d97706, #b45309)'
    : 'linear-gradient(135deg, #059669, #047857)';

  const headerBorder = isHigh ? '#b91c1c' : isMed ? '#92400e' : '#065f46';

  // Distance and Duration formatting
  const distDisplay = route.distKm ? `${route.distKm} km` : '—';
  const hours = Math.floor((route.mins || 0) / 60);
  const remainingMins = (route.mins || 0) % 60;
  const timeDisplay = hours > 0
    ? `${hours} hr ${remainingMins} min`
    : `${route.mins || 0} min`;

  const riskPct = route.highRiskPct || (isHigh ? 78 : isMed ? 45 : 12);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(15, 23, 42, 0.78)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 660, maxHeight: '92vh',
        background: 'var(--surface, #ffffff)', borderRadius: 16,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        border: '1px solid var(--line, #e2e8f0)',
      }}>
        {/* Header with Risk Accent & Language Switcher */}
        <div style={{
          background: headerBg, color: '#ffffff',
          padding: '16px 20px', borderBottom: `2px solid ${headerBorder}`,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}>
                {isHigh ? (
                  <ShieldAlert size={26} color="#ffffff" />
                ) : isMed ? (
                  <AlertTriangle size={26} color="#ffffff" />
                ) : (
                  <ShieldCheck size={26} color="#ffffff" />
                )}
              </div>
              <div>
                <div style={{
                  fontSize: '0.68rem', fontWeight: 900, letterSpacing: '1px',
                  opacity: 0.9, textTransform: 'uppercase',
                }}>
                  {t.badge}
                </div>
                <div style={{ fontSize: '1.18rem', fontWeight: 800, lineHeight: 1.3, marginTop: 2 }}>
                  {t.modalTitle}
                </div>
              </div>
            </div>

            <button
              onClick={onCancel}
              style={{
                background: 'rgba(255, 255, 255, 0.18)', border: 'none',
                borderRadius: '50%', width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#ffffff',
              }}
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* 3-Option Language Switcher Tabs: English | हिंदी | বাংলা */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(0, 0, 0, 0.22)', padding: '4px 8px', borderRadius: 10,
          }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Compass size={14} />
              <span>{t.langSelector}:</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { code: 'en', label: 'English', flag: '🇬🇧' },
                { code: 'hi', label: 'हिंदी',   flag: '🇮🇳' },
                { code: 'bn', label: 'বাংলা',   flag: '🇮🇳' },
              ].map(item => {
                const active = currentLang === item.code;
                return (
                  <button
                    key={item.code}
                    onClick={() => handleLangSwitch(item.code)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: 'none',
                      background: active ? '#ffffff' : 'transparent',
                      color: active ? '#0f172a' : '#ffffff',
                      fontWeight: active ? 800 : 600,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      boxShadow: active ? '0 2px 6px rgba(0,0,0,0.2)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{item.flag}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div style={{
          padding: '18px 20px', overflowY: 'auto', flex: 1,
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          {/* Route Overview Card */}
          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 12, padding: '12px 16px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t.routeOverview}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.92rem', fontWeight: 700, color: '#1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#059669' }}>
                <MapPin size={16} />
                <span>{fromName}</span>
              </div>
              <ArrowRight size={16} color="#94a3b8" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#2563eb' }}>
                <MapPin size={16} />
                <span>{toName}</span>
              </div>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
              borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 2,
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{t.distance}</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: 1 }}>
                  {distDisplay}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{t.estTime}</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: 1 }}>
                  {timeDisplay}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{t.overallRisk}</div>
                <div style={{
                  fontSize: '0.92rem', fontWeight: 800, marginTop: 1,
                  color: isHigh ? '#dc2626' : isMed ? '#d97706' : '#16a34a',
                }}>
                  {riskPct}% ({isHigh ? t.highBadge : isMed ? t.cautionBadge : t.lowBadge})
                </div>
              </div>
            </div>
          </div>

          {/* Risk Advisory Banner */}
          <div style={{
            background: isHigh ? '#fef2f2' : isMed ? '#fffbeb' : '#f0fdf4',
            border: `1px solid ${isHigh ? '#fecaca' : isMed ? '#fde68a' : '#bbf7d0'}`,
            borderRadius: 12, padding: '12px 16px',
            borderLeft: `5px solid ${isHigh ? '#dc2626' : isMed ? '#d97706' : '#16a34a'}`,
          }}>
            <div style={{
              fontWeight: 800, fontSize: '0.86rem',
              color: isHigh ? '#b91c1c' : isMed ? '#b45309' : '#15803d',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {isHigh ? '⚠️' : isMed ? '⚡' : '✅'}
              <span>
                {isHigh ? t.highAlertTitle : isMed ? t.cautionAlertTitle : t.safeAlertTitle}
              </span>
            </div>
            <div style={{
              fontSize: '0.8rem', lineHeight: 1.5,
              color: isHigh ? '#7f1d1d' : isMed ? '#78350f' : '#14532d',
              marginTop: 6,
            }}>
              {isHigh ? t.highAlertMsg : isMed ? t.cautionAlertMsg : t.safeAlertMsg}
            </div>
          </div>

          {/* Crossed Hazard Segments List */}
          {crossedSegments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                fontSize: '0.76rem', fontWeight: 800, color: '#64748b',
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                {t.crossedHazardsTitle} ({crossedSegments.length})
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 210, overflowY: 'auto' }}>
                {crossedSegments.map((seg, idx) => {
                  const segIsHigh = seg.risk_level === 'high';
                  const segColor = segIsHigh ? '#dc2626' : '#d97706';
                  const segBg = segIsHigh ? '#fef2f2' : '#fffbeb';
                  const segBorder = segIsHigh ? '#fca5a5' : '#fde68a';

                  return (
                    <div
                      key={seg.id || idx}
                      style={{
                        background: segBg, border: `1px solid ${segBorder}`,
                        borderRadius: 10, padding: '10px 14px',
                        display: 'flex', flexDirection: 'column', gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                            {seg.road_name}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            ({seg.from_node} ➜ {seg.to_node})
                          </span>
                        </div>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4,
                          background: segColor, color: '#ffffff',
                          fontWeight: 800, fontSize: '0.68rem',
                        }}>
                          {segIsHigh ? t.highBadge : t.cautionBadge}
                        </span>
                      </div>

                      <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: 12,
                        fontSize: '0.72rem', color: '#475569', marginTop: 2,
                      }}>
                        <span><strong>{t.district}:</strong> {seg.district}</span>
                        <span><strong>{t.slope}:</strong> {seg.slope_deg}°</span>
                        <span><strong>{t.rainfall}:</strong> {seg.rainfall_mm} mm</span>
                        <span><strong>{t.distance}:</strong> {seg.length_km} km</span>
                      </div>

                      {seg.reason && (
                        <div style={{
                          fontSize: '0.73rem', color: segColor,
                          marginTop: 3, fontWeight: 600,
                        }}>
                          ⚠️ {seg.reason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 20px',
          background: 'var(--surface-header, #f8fafc)',
          borderTop: '1px solid var(--line, #e2e8f0)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {saferAlt && (
            <button
              onClick={onSwitchSafer}
              style={{
                width: '100%', padding: '9px 14px',
                borderRadius: 9, border: '1px solid #10b981',
                background: '#ecfdf5', color: '#065f46',
                fontWeight: 700, fontSize: '0.82rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8, transition: 'all 0.15s ease',
              }}
            >
              <ShieldCheck size={16} color="#059669" />
              <span>{t.actionSwitchSafer} ({saferAlt.distKm} km)</span>
            </button>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={onCancel}
              style={{
                flex: 1, padding: '11px 16px',
                borderRadius: 10, border: '1px solid #cbd5e1',
                background: '#f1f5f9', color: '#334155',
                fontWeight: 700, fontSize: '0.84rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 6,
              }}
            >
              <X size={15} />
              <span>{t.actionCancel}</span>
            </button>

            <button
              onClick={onProceed}
              style={{
                flex: 2, padding: '11px 16px',
                borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff', fontWeight: 800, fontSize: '0.88rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
              }}
            >
              <Play size={16} />
              <span>{t.actionProceed}</span>
            </button>
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.68rem', color: '#94a3b8' }}>
            {t.disclaimer}
          </div>
        </div>
      </div>
    </div>
  );
};
