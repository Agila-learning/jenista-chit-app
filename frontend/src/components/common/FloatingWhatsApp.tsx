import React, { useState } from 'react';
import { X, Send, Globe, Search } from 'lucide-react';

type Language = 'EN' | 'TA' | 'HI';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  options?: { label: string; action: string }[];
}

export const FloatingWhatsApp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState<Language>('EN');
  const [customInput, setCustomInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const phoneNumber = '919444667411';

  // Localized dictionaries
  const i18n = {
    EN: {
      botName: 'Jenista Chit Advisor',
      onlineStatus: 'Online • Multilingual AI',
      placeholder: 'Type question or Chit ID (e.g. TC-11075)...',
      welcomeText: 'Namaste! 🙏 Welcome to Jenista Chit Funds.\n(Faith, Commitment, Victory)\n\nHow can I assist you with your chit savings, live tracking, or scheme plans today?',
      comparePlansLabel: '💡 Fixed, Auction & Regular Plans',
      calculatorLabel: '💰 Plan Returns & Installments',
      docsLabel: '📋 KYC Documents Required',
      trackLabel: '🔍 Track My Chit Status',
      branchLabel: '📍 Branch Offices & Contact',
      whatsappDirectLabel: '📞 Chat with Human Advisor',
      backToMenu: '🔙 Main Menu',
      accessRestricted: '🔒 Access Restricted:\nAdministrative accounts, collection registers, and financial ledgers are strictly isolated and protected. Please log in via the official portal.',
      trackingPrompt: 'Please enter your Customer ID (e.g. TC-11075) or registered Mobile Number below to check your subscription status:',
      trackFound: (data: any) => `✅ Active Chit Record Found:
• Subscriber: ${data.fullName || 'Subscriber'}
• Customer ID: ${data.customerCode || data.id}
• Masked Mobile: ${data.phone ? data.phone.replace(/(\d{2})\d{4}(\d{4})/, '$1****$2') : '******0077'}
• Chit Scheme: ${data.chits?.[0]?.groupName || 'KJ-22'} (${data.chits?.[0]?.scheme || 'Auction'} Chit)
• Chit Value: ₹${(data.chits?.[0]?.chitValue || 50000).toLocaleString('en-IN')}
• Monthly Installment: ₹${(data.chits?.[0]?.monthlyInstallment || 2500).toLocaleString('en-IN')}
• Installments Paid: ${data.chits?.[0]?.installmentsPaid || 1} of ${data.chits?.[0]?.duration || 20} (${data.chits?.[0]?.progressPercent || 5}%)
• Due Status: ${data.chits?.[0]?.paymentStatus || 'ACTIVE'} (Next due: ${data.chits?.[0]?.dueDate || '2026-10-29'})

Your data is safely isolated and protected under Chit Funds Act, 1982.`,
      trackNotFound: 'No active subscription found with this ID or mobile. Please double-check your ID (try "TC-11075") or speak directly with our branch team.',
      plansText: `• Fixed Chit: 100% full face value payout via transparent monthly draw. Zero bidding discount loss.
• Auction Chit: Reverse bidding with monthly dividend payout that reduces your installment. Immediate emergency liquidity.
• Regular Chit: Equal installments with predetermined scheduled turns. Perfect for planned family commitments.`,
      calcText: `Popular Schemes:
1️⃣ ₹50,000 Plan: ₹2,500/mo (20 mos) • Est. Dividend ₹6,500+
2️⃣ ₹1,00,000 Plan: ₹5,000/mo (20 mos) • Est. Dividend ₹14,000+
3️⃣ ₹2,50,000 Plan: ₹10,000/mo (25 mos) • Est. Dividend ₹38,000+
4️⃣ ₹5,00,000 Plan: ₹20,000/mo (25 mos) • Est. Dividend ₹78,000+`,
      docsText: `Documents Required for Registration:
✓ Aadhaar Card (Identity & Address proof)
✓ PAN Card
✓ Bank Passbook Front Page / Cancelled Cheque
✓ 1 Passport Size Photograph`,
      branchText: `Jenista Chit Funds Offices:
📍 Head Office: D.No. 4/342/4, Mani Road, Pudukkottai, Thoothukudi - 628 103, TN
📍 Branch Office: Hosur, Tamil Nadu
📞 Phone: +91 70942 95556 / +91 70940 45556
⏰ Mon - Sat: 9:30 AM to 6:30 PM`,
    },
    TA: {
      botName: 'ஜெனிஸ்டா சீட்டு ஆலோசகர்',
      onlineStatus: 'ஆன்லைன் • பலமொழி AI',
      placeholder: 'கேள்வி அல்லது சிட் எண் (எ.கா. TC-11075) தட்டச்சு செய்க...',
      welcomeText: 'வணக்கம்! 🙏 ஜெனிஸ்டா சிட் ஃபண்ட்ஸுக்கு வரவேற்கிறோம்.\n(நம்பிக்கை, அர்ப்பணிப்பு, வெற்றி)\n\nஉங்களின் சீட்டு சேமிப்பு, நிலை அறிய அல்லது திட்டங்கள் குறித்து நான் எவ்வாறு உதவலாம்?',
      comparePlansLabel: '💡 பிக்சட், ஏலம் & ரெகுலர் திட்டங்கள்',
      calculatorLabel: '💰 தவணை & லாப கணக்கீடு',
      docsLabel: '📋 தேவையான ஆவணங்கள் (KYC)',
      trackLabel: '🔍 எனது சீட்டு நிலையை அறிய',
      branchLabel: '📍 அலுவலக முகவரி & தொடர்பு',
      whatsappDirectLabel: '📞 வாட்ஸ்அப் ஆலோசகருடன் பேச',
      backToMenu: '🔙 முதன்மை மெனு',
      accessRestricted: '🔒 பாதுகாப்பு கட்டுப்பாடு:\nநிர்வாக கணக்குகள், வசூல் பதிவுகள் மற்றும் ஊழியர் விவரங்கள் பாதுகாக்கப்பட்டவை. அதிகாரப்பூர்வ போர்டல் மூலம் உள்நுழையவும்.',
      trackingPrompt: 'உங்களின் வாடிக்கையாளர் எண் (எ.கா. TC-11075) அல்லது பதிவுசெய்த மொபைல் எண்ணை உள்ளிடவும்:',
      trackFound: (data: any) => `✅ உங்கள் சீட்டு விவரம் கிடைத்தது:
• சந்தாதாரர்: ${data.fullName || 'வாடிக்கையாளர்'}
• வாடிக்கையாளர் எண்: ${data.customerCode || data.id}
• மொபைல்: ${data.phone ? data.phone.replace(/(\d{2})\d{4}(\d{4})/, '$1****$2') : '******0077'}
• சீட்டு குழு: ${data.chits?.[0]?.groupName || 'KJ-22'} (${data.chits?.[0]?.scheme || 'ஏல'} சீட்டு)
• சீட்டு மதிப்பு: ₹${(data.chits?.[0]?.chitValue || 50000).toLocaleString('en-IN')}
• மாதத் தவணை: ₹${(data.chits?.[0]?.monthlyInstallment || 2500).toLocaleString('en-IN')}
• செலுத்திய தவணைகள்: ${data.chits?.[0]?.installmentsPaid || 1} / ${data.chits?.[0]?.duration || 20}
• அடுத்த தவணை தேதி: ${data.chits?.[0]?.dueDate || '2026-10-29'}

மத்திய சீட்டு நிதி சட்டம் 1982 இன் படி உங்கள் தகவல்கள் முழுமையாக பாதுகாக்கப்படுகின்றன.`,
      trackNotFound: 'இந்த எண்ணில் எந்த சீட்டு பதிவும் கிடைக்கவில்லை. உங்கள் வாடிக்கையாளர் எண்ணை சரிபார்க்கவும் ("TC-11075" சோதிக்கலாம்).',
      plansText: `• பிக்சட் சீட்டு: மாதந்தோறும் குலுக்கல் முறையில் முழு தொகையும் (100%) கிடைக்கும். ஏல தள்ளுபடி இழப்பு இல்லை.
• ஏல சீட்டு: அவசர நிதி தேவைக்கு ஏலம் எடுக்கலாம். தள்ளுபடி தொகை டிவிடெண்டாக பிரித்து வழங்கப்படும்.
• ரெகுலர் சீட்டு: முன்கூட்டியே திட்டமிடப்பட்ட தவணைகள் மற்றும் வரிசைப்படி பணம் பெறுதல்.`,
      calcText: `பிரபலமான திட்டங்கள்:
1️⃣ ₹50,000 திட்டம்: ₹2,500/மாதம் (20 மாதங்கள்)
2️⃣ ₹1,00,000 திட்டம்: ₹5,000/மாதம் (20 மாதங்கள்)
3️⃣ ₹2,50,000 திட்டம்: ₹10,000/மாதம் (25 மாதங்கள்)
4️⃣ ₹5,00,000 திட்டம்: ₹20,000/மாதம் (25 மாதங்கள்)`,
      docsText: `பதிவுக்கு தேவையான ஆவணங்கள்:
✓ ஆதார் அட்டை (அடையாள மற்றும் முகவரி சான்று)
✓ பான் கார்டு (PAN)
✓ வங்கி பாஸ்புக் முதல் பக்கம் / காசோலை
✓ 1 பாஸ்போர்ட் அளவு புகைப்படம்`,
      branchText: `ஜெனிஸ்டா அலுவலக விவரங்கள்:
📍 தலைமை அலுவலகம்: D.No. 4/342/4, மணி ரோடு, புதுக்கோட்டை, தூத்துக்குடி - 628 103
📍 கிளை: ஓசூர், தமிழ்நாடு
📞 தொலைபேசி: +91 70942 95556 / +91 70940 45556`,
    },
    HI: {
      botName: 'जेनिस्टा चिट सलाहकार',
      onlineStatus: 'ऑनलाइन • बहुभाषी AI',
      placeholder: 'प्रश्न या चिट आईडी (जैसे TC-11075) लिखें...',
      welcomeText: 'नमस्ते! 🙏 जेनिस्टा चिट फंड में आपका स्वागत है।\n(विश्वास, प्रतिबद्धता, विजय)\n\nआज मैं आपकी चिट बचत, ट्रैकिंग या योजनाओं में कैसे सहायता कर सकता हूँ?',
      comparePlansLabel: '💡 फिक्स्ड, नीलामी और नियमित योजनाएं',
      calculatorLabel: '💰 प्लान कैलकुलेटर और रिटर्न',
      docsLabel: '📋 आवश्यक दस्तावेज (KYC)',
      trackLabel: '🔍 अपनी चिट स्थिति ट्रैक करें',
      branchLabel: '📍 कार्यालय का पता और संपर्क',
      whatsappDirectLabel: '📞 व्हाट्सएप सलाहकार से बात करें',
      backToMenu: '🔙 मुख्य मेनू',
      accessRestricted: '🔒 सुरक्षा प्रतिबंध:\nप्रशासनिक रिकॉर्ड, वसूली रजिस्टर और वित्तीय डेटा सुरक्षित हैं। कृपया आधिकारिक पोर्टल के माध्यम से लॉगिन करें।',
      trackingPrompt: 'कृपया अपनी ग्राहक आईडी (जैसे TC-11075) या पंजीकृत मोबाइल नंबर दर्ज करें:',
      trackFound: (data: any) => `✅ सक्रिय चिट विवरण मिला:
• ग्राहक: ${data.fullName || 'ग्राहक'}
• ग्राहक कोड: ${data.customerCode || data.id}
• मोबाइल: ${data.phone ? data.phone.replace(/(\d{2})\d{4}(\d{4})/, '$1****$2') : '******0077'}
• चिट योजना: ${data.chits?.[0]?.groupName || 'KJ-22'}
• कुल चिट मूल्य: ₹${(data.chits?.[0]?.chitValue || 50000).toLocaleString('en-IN')}
• मासिक किस्त: ₹${(data.chits?.[0]?.monthlyInstallment || 2500).toLocaleString('en-IN')}
• किस्त भुगतान: ${data.chits?.[0]?.installmentsPaid || 1} / ${data.chits?.[0]?.duration || 20}
• देय तिथि: ${data.chits?.[0]?.dueDate || '2026-10-29'}

चिट फंड अधिनियम, 1982 के तहत आपका डेटा पूरी तरह से सुरक्षित है।`,
      trackNotFound: 'इस आईडी या मोबाइल से कोई सक्रिय रिकॉर्ड नहीं मिला। कृपया अपनी आईडी जांचें ("TC-11075" आज़माएं)।',
      plansText: `• फिक्स्ड चिट: पारदर्शी ड्रा द्वारा 100% पूरी राशि। शून्य नीलामी छूट।
• नीलामी चिट: तत्काल नकदी के लिए नीलामी। गैर-बोलीदाताओं को लाभांश छूट।
• नियमित चिट: पूर्व-निर्धारित समय पर सुरक्षित भुगतान।`,
      calcText: `लोकप्रिय योजनाएं:
1️⃣ ₹50,000 योजना: ₹2,500/माह (20 महीने)
2️⃣ ₹1,00,000 योजना: ₹5,000/माह (20 महीने)
3️⃣ ₹2,50,000 योजना: ₹10,000/माह (25 महीने)
4️⃣ ₹5,00,000 योजना: ₹20,000/माह (25 महीने)`,
      docsText: `पंजीकरण के लिए आवश्यक दस्तावेज:
✓ आधार कार्ड
✓ पैन कार्ड
✓ बैंक पासबुक की प्रति
✓ 1 पासपोर्ट साइज फोटो`,
      branchText: `कार्यालय विवरण:
📍 मुख्य कार्यालय: थूथुकुडी, तमिलनाडु - 628 103
📍 शाखा: होसुर, तमिलनाडु
📞 फोन: +91 70942 95556 / +91 70940 45556`,
    }
  };

  const currentI18n = i18n[lang];

  const getInitialWelcome = (l: Language): ChatMessage => ({
    id: `welcome-${l}`,
    sender: 'bot',
    text: i18n[l].welcomeText,
    options: [
      { label: i18n[l].comparePlansLabel, action: 'COMPARE_PLANS' },
      { label: i18n[l].calculatorLabel, action: 'CALCULATOR' },
      { label: i18n[l].trackLabel, action: 'TRACK_PROMPT' },
      { label: i18n[l].docsLabel, action: 'DOCS' },
      { label: i18n[l].branchLabel, action: 'BRANCH' },
      { label: i18n[l].whatsappDirectLabel, action: 'WHATSAPP_DIRECT' },
    ],
  });

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([getInitialWelcome('EN')]);

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    const welcome = getInitialWelcome(newLang);
    setChatHistory([welcome]);
  };

  const handleOpenWhatsApp = (messageText?: string) => {
    const text = encodeURIComponent(
      messageText || customInput || 'Hello Jenista Chits! I would like to inquire about your chit savings and auction plans.'
    );
    const url = `https://wa.me/${phoneNumber}?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOptionClick = async (action: string, label: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: label,
    };

    let botResponse: ChatMessage;

    switch (action) {
      case 'COMPARE_PLANS':
        botResponse = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: currentI18n.plansText,
          options: [
            { label: currentI18n.calculatorLabel, action: 'CALCULATOR' },
            { label: currentI18n.whatsappDirectLabel, action: 'WHATSAPP_DIRECT' },
            { label: currentI18n.backToMenu, action: 'RESET_MENU' },
          ],
        };
        break;

      case 'CALCULATOR':
        botResponse = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: currentI18n.calcText,
          options: [
            { label: currentI18n.whatsappDirectLabel, action: 'WHATSAPP_DIRECT' },
            { label: currentI18n.comparePlansLabel, action: 'COMPARE_PLANS' },
            { label: currentI18n.backToMenu, action: 'RESET_MENU' },
          ],
        };
        break;

      case 'DOCS':
        botResponse = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: currentI18n.docsText,
          options: [
            { label: currentI18n.whatsappDirectLabel, action: 'WHATSAPP_DIRECT' },
            { label: currentI18n.backToMenu, action: 'RESET_MENU' },
          ],
        };
        break;

      case 'BRANCH':
        botResponse = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: currentI18n.branchText,
          options: [
            { label: currentI18n.whatsappDirectLabel, action: 'WHATSAPP_DIRECT' },
            { label: currentI18n.backToMenu, action: 'RESET_MENU' },
          ],
        };
        break;

      case 'TRACK_PROMPT':
        botResponse = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: currentI18n.trackingPrompt,
          options: [
            { label: 'Sample: TC-11075', action: 'QUERY_TRACK_SAMPLE' },
            { label: currentI18n.backToMenu, action: 'RESET_MENU' },
          ],
        };
        break;

      case 'QUERY_TRACK_SAMPLE':
        await performChitLookup('TC-11075');
        return;

      case 'RESET_MENU':
        setChatHistory((prev: ChatMessage[]) => [...prev, userMsg, getInitialWelcome(lang)]);
        return;

      case 'WHATSAPP_DIRECT':
      default:
        handleOpenWhatsApp(`Hello Jenista Chits! I would like to inquire regarding: "${label}" (${lang})`);
        return;
    }

    setChatHistory((prev: ChatMessage[]) => [...prev, userMsg, botResponse]);
  };

  const performChitLookup = async (queryTerm: string) => {
    setIsSearching(true);
    const clean = queryTerm.trim();

    // User Message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: clean,
    };

    let replyText = '';

    // Check if query is an administrative/unauthorized request
    const lower = clean.toLowerCase();
    if (
      lower.includes('admin') || 
      lower.includes('staff') || 
      lower.includes('all user') || 
      lower.includes('all customer') || 
      lower.includes('password') || 
      lower.includes('ledger') || 
      lower.includes('collection') || 
      lower.includes('bank')
    ) {
      replyText = currentI18n.accessRestricted;
    } else {
      try {
        const isMobile = /^\d{10}$/.test(clean);
        const url = isMobile
          ? `http://localhost:3000/api/v1/customers/track?mobile=${clean}`
          : `http://localhost:3000/api/v1/customers/track?customerId=${encodeURIComponent(clean)}`;

        const res = await fetch(url);
        const json = await res.json();

        if (json && json.success && json.data) {
          replyText = currentI18n.trackFound(json.data);
        } else {
          // Fallback to local storage customer lookup
          const customers = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
          const match = customers.find((c: any) =>
            (c.id === clean || c.customerCode === clean || c.mobile === clean || c.phone === clean)
          );

          if (match) {
            replyText = currentI18n.trackFound(match);
          } else {
            replyText = currentI18n.trackNotFound;
          }
        }
      } catch (err) {
        console.warn('API lookup error:', err);
        replyText = currentI18n.trackNotFound;
      }
    }

    const botResponse: ChatMessage = {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: replyText,
      options: [
        { label: currentI18n.whatsappDirectLabel, action: 'WHATSAPP_DIRECT' },
        { label: currentI18n.backToMenu, action: 'RESET_MENU' },
      ],
    };

    setChatHistory((prev: ChatMessage[]) => [...prev, userMsg, botResponse]);
    setIsSearching(false);
  };

  const handleSendCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    const term = customInput.trim();
    setCustomInput('');

    // If query looks like an ID or phone, perform isolated lookup
    if (/^[A-Za-z0-9-]+$/.test(term) && term.length >= 5) {
      await performChitLookup(term);
    } else {
      // General question -> forward directly to WhatsApp with user's selected language
      handleOpenWhatsApp(term);
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end print:hidden">
      {/* Interactive AI / Concierge Chat Card */}
      {isOpen && (
        <div className="mb-3 w-[calc(100vw-32px)] max-w-[390px] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-4 text-white relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-3.5 right-3.5 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-3 mb-2.5">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1 shadow-md">
                  <WhatsAppSvgIcon className="w-6 h-6 text-[#25D366]" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full"></span>
              </div>
              <div>
                <h4 className="font-extrabold text-sm flex items-center gap-1.5 text-white">
                  {currentI18n.botName}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/20">
                    Online
                  </span>
                </h4>
                <p className="text-[11px] text-blue-200/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {currentI18n.onlineStatus}
                </p>
              </div>
            </div>

            {/* Multilingual Selector Pill */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
              <span className="text-[10px] text-slate-300 flex items-center gap-1">
                <Globe className="w-3 h-3 text-blue-400" />
                Language:
              </span>
              <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-lg border border-white/15">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('EN')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                    lang === 'EN' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('TA')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                    lang === 'TA' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  தமிழ்
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('HI')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                    lang === 'HI' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  हिन्दी
                </button>
              </div>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="p-4 bg-slate-50/70 space-y-3.5 max-h-[340px] overflow-y-auto text-xs sm:text-sm">
            {chatHistory.map((msg: ChatMessage) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3.5 rounded-2xl max-w-[92%] leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-sm'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-line text-xs sm:text-xs leading-relaxed">{msg.text}</p>
                </div>

                {/* Option Buttons */}
                {msg.options && (
                  <div className="w-full space-y-1.5 mt-2.5">
                    {msg.options.map((opt: { label: string; action: string }, i: number) => (
                      <button
                        key={i}
                        onClick={() => handleOptionClick(opt.action, opt.label)}
                        className="w-full text-left text-xs bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-900 font-medium px-3.5 py-2 rounded-xl border border-slate-200/80 hover:border-blue-300 transition-all shadow-xs flex items-center justify-between group active:scale-[0.98]"
                      >
                        <span>{opt.label}</span>
                        <Send className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isSearching && (
              <div className="flex items-center gap-2 text-xs text-slate-500 italic p-2 bg-white rounded-xl border border-slate-200">
                <Search className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Checking isolated subscriber records...</span>
              </div>
            )}
          </div>

          {/* Bottom Custom Message Input */}
          <form onSubmit={handleSendCustom} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              placeholder={currentI18n.placeholder}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="flex-1 bg-slate-100 text-slate-900 placeholder:text-slate-400 text-xs px-3.5 py-2.5 rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-[#25D366] hover:bg-[#20ba5a] text-white p-2.5 rounded-xl transition-all shadow-md hover:shadow-emerald-500/20 active:scale-95 shrink-0"
              aria-label="Send WhatsApp Message"
              title="Send to WhatsApp Advisor"
            >
              <WhatsAppSvgIcon className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Action Button (Unmodified Icon, No extra text badge) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open WhatsApp Support Chat"
        className="relative group w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white flex items-center justify-center shadow-xl hover:shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-emerald-300/60"
      >
        <span className="absolute -inset-1 rounded-full bg-[#25D366]/35 animate-ping opacity-75 pointer-events-none"></span>

        {isOpen ? (
          <X className="w-7 h-7 relative z-10 transition-transform duration-200" />
        ) : (
          <WhatsAppSvgIcon className="w-8 h-8 relative z-10 fill-current" />
        )}

        {/* Unread Indicator Badge */}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            1
          </span>
        )}
      </button>
    </div>
  );
};

// Vector WhatsApp Icon
const WhatsAppSvgIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    stroke="currentColor"
    strokeWidth="0"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);
