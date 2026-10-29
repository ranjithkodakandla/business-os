export type Lang = 'en' | 'hi' | 'te';
export const NAV_LABELS: Record<string, Record<Lang, string>> = {
  home: { en: 'Home', hi: 'होम', te: 'హోమ్' },
  approvals: { en: 'Approvals', hi: 'मंज़ूरियाँ', te: 'ఆమోదాలు' },
  sales: { en: 'Sales & CRM', hi: 'बिक्री और CRM', te: 'అమ్మకాలు & CRM' },
  orders: { en: 'Orders', hi: 'ऑर्डर', te: 'ఆర్డర్లు' },
  procurement: { en: 'Procurement', hi: 'ख़रीद', te: 'కొనుగోళ్లు' },
  suppliers: { en: 'Supplier contacts', hi: 'सप्लायर संपर्क', te: 'సరఫరాదారుల సంప్రదింపులు' },
  inventory: { en: 'Inventory', hi: 'स्टॉक', te: 'స్టాక్' },
  jobwork: { en: 'Job Work', hi: 'जॉब वर्क', te: 'జాబ్ వర్క్' },
  operations: { en: 'Operations', hi: 'उत्पादन', te: 'ఉత్పత్తి' },
  people: { en: 'People & HR', hi: 'कर्मचारी', te: 'ఉద్యోగులు' },
  finance: { en: 'Finance', hi: 'वित्त', te: 'ఆర్థికం' },
  reports: { en: 'Reports', hi: 'रिपोर्ट', te: 'నివేదికలు' },
  agents: { en: 'Agents', hi: 'एजेंट', te: 'ఏజెంట్లు' },
  integrations: { en: 'Connected apps', hi: 'जुड़े ऐप', te: 'అనుసంధాన యాప్‌లు' },
  setup: { en: 'Quick setup', hi: 'आसान सेटअप', te: 'సులభ సెటప్' },
};
/** Time-aware greeting in IST. */
export const greeting = (lang: Lang, d = new Date()) => {
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Kolkata' }).format(d));
  const p = h < 12 ? 0 : h < 17 ? 1 : 2;
  return ({ en: ['Good morning, Riya', 'Good afternoon, Riya', 'Good evening, Riya'], hi: ['सुप्रभात, रिया', 'नमस्ते, रिया', 'शुभ संध्या, रिया'], te: ['శుభోదయం, రియా', 'శుభ మధ్యాహ్నం, రియా', 'శుభ సాయంత్రం, రియా'] } as Record<Lang, string[]>)[lang][p];
};
export const GREETING: Record<Lang, string> = { en: greeting('en'), hi: greeting('hi'), te: greeting('te') };
