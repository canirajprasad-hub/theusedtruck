import React, { useState, useEffect, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  deleteDoc,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User,
  GoogleAuthProvider
} from 'firebase/auth';
import { db, auth, googleProvider, storage } from './firebase';
import { supabase } from './supabase';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { 
  Truck, 
  Phone, 
  MessageSquare, 
  Plus, 
  Trash2, 
  LogOut, 
  LogIn, 
  ChevronRight, 
  ChevronLeft,
  Info, 
  Calculator,
  ArrowLeft,
  X,
  Upload,
  Loader2,
  Menu,
  CheckCircle2,
  Mail,
  ShieldCheck,
  BadgeCheck,
  Users,
  Zap
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import imageCompression from 'browser-image-compression';

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Connection Test ---
async function testFirestoreConnection(db: any) {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}

// --- Error Boundary ---
class ErrorBoundary extends Component<any, any> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-red-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-500 mb-6 italic serif">We encountered an unexpected error. Please try refreshing the page.</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-colors"
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-6 p-4 bg-gray-100 rounded-xl text-left text-xs overflow-auto max-h-40 text-red-600">
                {this.state.error?.message}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

// --- Types ---
interface TruckData {
  id: string;
  model: string;
  make: string;
  year: number;
  price: number;
  mileage: number;
  description: string;
  imageUrl: string; // Keep for backward compatibility or primary image
  imageUrls?: string[]; // New field for multiple images
  loanAvailable: boolean;
  createdAt: any;
}

interface CallbackRequest {
  id: string;
  name: string;
  mobile: string;
  email: string;
  truckId?: string;
  truckModel?: string;
  truckImage?: string;
  createdAt: any;
}

interface SellRequest {
  id: string;
  name: string;
  mobile: string;
  company: string;
  model: string;
  kmRun: string;
  truckDetails: string;
  imageUrls?: string[];
  createdAt: any;
}

// --- Translations ---
const translations = {
  en: {
    brand: "The Used Truck",
    home: "Home",
    loans: "Loan Options",
    quickBuy: "Sell Your Truck",
    admin: "Admin Panel",
    login: "Admin Login",
    logout: "Logout",
    findNext: "Find Your Next",
    workhorse: "Workhorse.",
    premium: "Premium second-hand trucks, inspected for quality and ready for the road.",
    kmDriven: "km driven",
    enquiry: "Enquiry",
    callback: "Callback",
    loanAvailable: "Loan Available",
    noTrucks: "No trucks listed at the moment. Check back soon!",
    contactDetails: "Contact Details",
    callDirectly: "Call us directly for immediate enquiry about",
    close: "Close",
    requestCallback: "Request Callback",
    fullName: "Full Name",
    mobileNumber: "Mobile Number",
    emailAddress: "Email Address",
    submitting: "Submitting...",
    submit: "Request Call Back",
    adminDashboard: "Admin Dashboard",
    manageInventory: "Manage your inventory and callback requests.",
    listNewTruck: "List New Truck",
    currentInventory: "Current Inventory",
    callbackRequests: "Callback Requests",
    sellRequests: "Sell Requests",
    noRequests: "No requests yet.",
    loggedInAs: "Logged in as:",
    notAdmin: "You are not an admin. Please login with correct account.",
    loanOptionsTitle: "Loan Options Available",
    loanOptionsDesc: "We partner with leading financial institutions to bring you the best interest rates for your commercial vehicle purchase.",
    lowRates: "Low Interest Rates",
    lowRatesDesc: "Starting from 8.5% p.a. for eligible customers.",
    flexibleTenure: "Flexible Tenure",
    flexibleTenureDesc: "Choose repayment periods from 12 to 60 months.",
    quickApproval: "Quick Approval",
    quickApprovalDesc: "Get your loan sanctioned within 48 hours of documentation.",
    personalizedQuote: "Need a personalized quote?",
    advisorsReady: "Our financial advisors are ready to help you find the perfect plan.",
    contactUsToday: "Contact Us Today",
    switchLang: "हिंदी",
    quickBuyTitle: "Professional Truck Valuation",
    quickBuyDesc: "We are professionals who value your truck fairly. We offer competitive prices and a fast, transparent policy to ensure you get paid promptly.",
    sellFormTitle: "Get a Professional Quote",
    truckDetails: "Truck Details",
    valuationSuccess: "Valuation request sent! We will contact you shortly.",
    price: "Price",
    mileage: "Mileage",
    description: "Description",
    viewDetails: "View Details",
    loanFacility: "Loan Facility Available",
    make: "Make",
    model: "Model",
    year: "Year",
    company: "Company",
    kmRun: "KM Run",
    additionalDetails: "Additional Details",
    submitValuation: "Get Professional Valuation",
    noInventory: "No trucks in inventory yet.",
    whyUsTitle: "Why Choose Us?",
    whyUsReason1: "Quality Assurance",
    whyUsDesc1: "Every truck in our inventory undergoes a rigorous 100-point quality check to ensure it's road-ready.",
    whyUsReason2: "Transparent Pricing",
    whyUsDesc2: "No hidden costs. We provide fair market valuations and clear documentation for every transaction.",
    whyUsReason3: "Expert Support",
    whyUsDesc3: "Our team of industry veterans is here to guide you through selection, financing, and ownership.",
    whyUsReason4: "Fast Financing",
    whyUsDesc4: "Get access to quick and flexible loan options through our network of trusted financial partners."
  },
  hi: {
    brand: "द यूज्ड ट्रक",
    home: "होम",
    loans: "ऋण विकल्प",
    quickBuy: "अपना ट्रक बेचें",
    admin: "एडमिन पैनल",
    login: "एडमिन लॉगिन",
    logout: "लॉगआउट",
    findNext: "अपना अगला",
    workhorse: "वर्कहॉर्स खोजें।",
    premium: "प्रीमियम पुराने ट्रक, गुणवत्ता के लिए जांचे गए और सड़क के लिए तैयार।",
    kmDriven: "किमी चला हुआ",
    enquiry: "पूछताछ",
    callback: "कॉल बैक",
    loanAvailable: "ऋण उपलब्ध",
    noTrucks: "फिलहाल कोई ट्रक सूचीबद्ध नहीं है। जल्द ही वापस जांचें!",
    contactDetails: "संपर्क विवरण",
    callDirectly: "इसके बारे में तत्काल पूछताछ के लिए हमें सीधे कॉल करें",
    close: "बंद करें",
    requestCallback: "कॉल बैक का अनुरोध करें",
    fullName: "पूरा नाम",
    mobileNumber: "मोबाइल नंबर",
    emailAddress: "ईमेल आईडी",
    submitting: "सबमिट हो रहा है...",
    submit: "कॉल बैक का अनुरोध करें",
    adminDashboard: "एडमिन डैशबोर्ड",
    manageInventory: "अपनी इन्वेंट्री और कॉल बैक अनुरोधों को प्रबंधित करें।",
    listNewTruck: "नया ट्रक सूचीबद्ध करें",
    currentInventory: "वर्तमान इन्वेंट्री",
    callbackRequests: "कॉल बैक अनुरोध",
    sellRequests: "बिक्री अनुरोध",
    noRequests: "अभी तक कोई अनुरोध नहीं है।",
    loggedInAs: "के रूप में लॉग इन किया:",
    notAdmin: "आप एडमिन नहीं हैं। कृपया सही अकाउंट से लॉगिन करें।",
    loanOptionsTitle: "ऋण विकल्प उपलब्ध",
    loanOptionsDesc: "हम आपके व्यावसायिक वाहन की खरीद के लिए आपको सर्वोत्तम ब्याज दरें प्रदान करने के लिए प्रमुख वित्तीय संस्थानों के साथ साझेदारी करते हैं।",
    lowRates: "कम ब्याज दरें",
    lowRatesDesc: "पात्र ग्राहकों के लिए 8.5% प्रति वर्ष से शुरू।",
    flexibleTenure: "लचीली अवधि",
    flexibleTenureDesc: "12 से 60 महीने तक की पुनर्भुगतान अवधि चुनें।",
    quickApproval: "त्वरित स्वीकृति",
    quickApprovalDesc: "दस्तावेज़ीकरण के 48 घंटों के भीतर अपना ऋण स्वीकृत कराएं।",
    personalizedQuote: "एक व्यक्तिगत उद्धरण की आवश्यकता है?",
    advisorsReady: "हमारे वित्तीय सलाहकार आपको सही योजना खोजने में मदद करने के लिए तैयार हैं।",
    contactUsToday: "आज ही हमसे संपर्क करें",
    switchLang: "English",
    quickBuyTitle: "प्रोफेशनल ट्रक मूल्यांकन",
    quickBuyDesc: "हम पेशेवर हैं जो आपके ट्रक का उचित मूल्य आंकते हैं। हम प्रतिस्पर्धी कीमतों और एक तेज़, पारदर्शी नीति की पेशकश करते हैं ताकि आपको तुरंत भुगतान मिल सके।",
    sellFormTitle: "प्रोफेशनल कोट प्राप्त करें",
    truckDetails: "ट्रक विवरण",
    valuationSuccess: "मूल्यांकन अनुरोध भेज दिया गया! हम जल्द ही आपसे संपर्क करेंगे।",
    price: "कीमत",
    mileage: "माइलेज",
    description: "विवरण",
    viewDetails: "विवरण देखें",
    loanFacility: "ऋण सुविधा उपलब्ध",
    make: "मेक",
    model: "मॉडल",
    year: "वर्ष",
    company: "कंपनी",
    kmRun: "किमी चला हुआ",
    additionalDetails: "अतिरिक्त विवरण",
    submitValuation: "प्रोफेशनल मूल्यांकन प्राप्त करें",
    noInventory: "इन्वेंट्री में अभी तक कोई ट्रक नहीं है।",
    whyUsTitle: "हमें क्यों चुनें?",
    whyUsReason1: "गुणवत्ता आश्वासन",
    whyUsDesc1: "हमारी इन्वेंट्री के प्रत्येक ट्रक की 100-पॉइंट गुणवत्ता जांच की जाती है ताकि यह सुनिश्चित हो सके कि यह सड़क के लिए तैयार है।",
    whyUsReason2: "पारदर्शी मूल्य निर्धारण",
    whyUsDesc2: "कोई छिपी हुई लागत नहीं। हम प्रत्येक लेनदेन के लिए उचित बाजार मूल्यांकन और स्पष्ट दस्तावेज प्रदान करते हैं।",
    whyUsReason3: "विशेषज्ञ सहायता",
    whyUsDesc3: "उद्योग के दिग्गजों की हमारी टीम चयन, वित्तपोषण और स्वामित्व के माध्यम से आपका मार्गदर्शन करने के लिए यहां है।",
    whyUsReason4: "त्वरित वित्तपोषण",
    whyUsDesc4: "हमारे विश्वसनीय वित्तीय भागीदारों के नेटवर्क के माध्यम से त्वरित और लचीले ऋण विकल्पों तक पहुंच प्राप्त करें।"
  }
};

// --- Components ---

const Navbar = ({ user, onLogin, onLogout, lang, setLang }: { user: User | null, onLogin: () => void, onLogout: () => void, lang: 'en' | 'hi', setLang: (l: 'en' | 'hi') => void }) => {
  const t = translations[lang];
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isPressing, setIsPressing] = useState(false);
  const navigate = useNavigate();

  const handleLogoPressStart = () => {
    setIsPressing(true);
    const timer = setTimeout(() => {
      navigate('/admin');
      setIsPressing(false);
      toast.success("Admin access granted", {
        icon: '🔑',
        style: { borderRadius: '1rem', background: '#000', color: '#fff' }
      });
    }, 3000); // 3 seconds long press
    setPressTimer(timer);
  };

  const handleLogoPressEnd = () => {
    setIsPressing(false);
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  return (
    <nav className="sticky top-0 z-50 glass border-b border-gray-100 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div 
            className="flex items-center space-x-3 cursor-pointer select-none group relative"
            onMouseDown={handleLogoPressStart}
            onMouseUp={handleLogoPressEnd}
            onTouchStart={handleLogoPressStart}
            onTouchEnd={handleLogoPressEnd}
            onMouseLeave={handleLogoPressEnd}
          >
            <div className={`absolute -inset-2 bg-orange-600/20 rounded-xl blur-xl transition-opacity duration-1000 ${isPressing ? 'opacity-100' : 'opacity-0'}`} />
            <div className="w-10 h-10 bg-orange-600 p-2 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20 group-hover:rotate-12 transition-transform">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter text-gray-900 group-hover:text-orange-600 transition-colors">{t.brand}</span>
            {isPressing && (
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 3, ease: "linear" }}
                className="absolute -bottom-1 left-0 h-0.5 bg-orange-600 rounded-full"
              />
            )}
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-sm font-bold hover:text-orange-600 transition-colors">{t.home}</Link>
            <Link to="/loans" className="text-sm font-bold hover:text-orange-600 transition-colors">{t.loans}</Link>
            <Link to="/quick-buy" className="bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-orange-700 transition-all hover:shadow-lg hover:shadow-orange-600/20">{t.quickBuy}</Link>
            
            <div className="h-6 w-px bg-gray-200" />
            
            <button 
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="text-xs font-black uppercase tracking-widest bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {lang === 'en' ? 'हिन्दी' : 'English'}
            </button>

            {user ? (
              <div className="flex items-center space-x-4">
                <div className="hidden lg:block text-[10px] text-gray-400 font-medium text-right">
                  <p className="leading-none">{t.loggedInAs}</p>
                  <p className="leading-none mt-0.5">{user.email}</p>
                </div>
                <button 
                  onClick={onLogout}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title={t.logout}
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={onLogin}
                className="p-2 text-gray-400 hover:text-orange-600 transition-colors"
              >
                <LogIn className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="md:hidden flex items-center space-x-4">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-full left-0 w-full bg-white border-b border-gray-100 p-6 space-y-4 shadow-xl"
          >
            <Link to="/" onClick={() => setIsMenuOpen(false)} className="block font-bold">{t.home}</Link>
            <Link to="/loans" onClick={() => setIsMenuOpen(false)} className="block font-bold">{t.loans}</Link>
            <Link to="/quick-buy" onClick={() => setIsMenuOpen(false)} className="block bg-orange-600 text-white p-4 rounded-xl text-center font-bold">{t.quickBuy}</Link>
            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <button 
                onClick={() => { setLang(lang === 'en' ? 'hi' : 'en'); setIsMenuOpen(false); }}
                className="text-sm font-bold"
              >
                {lang === 'en' ? 'Switch to हिन्दी' : 'Switch to English'}
              </button>
              {user ? (
                <button onClick={() => { onLogout(); setIsMenuOpen(false); }} className="text-red-500 font-bold flex items-center space-x-2">
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              ) : (
                <button onClick={() => { onLogin(); setIsMenuOpen(false); }} className="text-orange-600 font-bold flex items-center space-x-2">
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const TruckCard = ({ truck, onEnquiry, onCallback, onClick, lang }: { truck: TruckData, onEnquiry: (t: TruckData) => void, onCallback: (t: TruckData) => void, onClick: (t: TruckData) => void, lang: 'en' | 'hi', key?: string }) => {
  const t = translations[lang];
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [imgError, setImgError] = useState(false);
  const images = truck.imageUrls?.filter(url => url.trim() !== '') || [truck.imageUrl];

  const handleImgError = () => {
    setImgError(true);
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all group cursor-pointer"
      onClick={() => onClick(truck)}
    >
      <div className="aspect-[16/10] overflow-hidden relative bg-gray-100">
        <AnimatePresence mode="wait">
          <motion.img 
            key={currentImgIdx}
            src={imgError ? "https://picsum.photos/seed/truck/800/600" : images[currentImgIdx]} 
            alt={truck.model} 
            onError={handleImgError}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
        </AnimatePresence>
        
        {images.length > 1 && (
          <div className="absolute inset-0 flex items-center justify-between px-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); setCurrentImgIdx(prev => (prev === 0 ? images.length - 1 : prev - 1)); }}
              className="p-2 bg-white/80 backdrop-blur-md rounded-full hover:bg-white transition-colors shadow-lg"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setCurrentImgIdx(prev => (prev === images.length - 1 ? 0 : prev + 1)); }}
              className="p-2 bg-white/80 backdrop-blur-md rounded-full hover:bg-white transition-colors shadow-lg"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-white px-6 py-2.5 rounded-full text-sm font-black uppercase tracking-widest text-gray-900 shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
            {lang === 'en' ? 'View Details' : 'विवरण देखें'}
          </div>
        </div>

        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-orange-600 uppercase tracking-widest border border-orange-100">
          {truck.year}
        </div>
        
        {images.length > 1 && (
          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest">
            {currentImgIdx + 1} / {images.length}
          </div>
        )}

        {truck.loanAvailable && (
          <div className="absolute bottom-4 right-4 bg-green-600/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest flex items-center space-x-1.5 shadow-lg">
            <Calculator className="w-3 h-3" />
            <span>{t.loanAvailable}</span>
          </div>
        )}
      </div>
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">{truck.make} {truck.model}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{truck.mileage.toLocaleString()} {t.kmDriven}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-orange-600">₹{truck.price.toLocaleString()}</p>
          </div>
        </div>
        <p className="text-sm text-gray-500 line-clamp-2 mb-6 h-10 italic serif">
          {truck.description || "No description provided."}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); onEnquiry(truck); }}
            className="flex items-center justify-center space-x-2 bg-gray-900 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95"
          >
            <Phone className="w-4 h-4" />
            <span>{t.enquiry}</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onCallback(truck); }}
            className="flex items-center justify-center space-x-2 border-2 border-orange-600 text-orange-600 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-orange-50 transition-all active:scale-95"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{t.callback}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const LoanOptions = ({ lang }: { lang: 'en' | 'hi' }) => {
  const t = translations[lang];
  return (
    <div className="max-w-5xl mx-auto px-4 py-20">
      <div className="text-center mb-20">
        <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <Calculator className="w-10 h-10 text-orange-600" />
        </div>
        <h1 className="text-5xl font-black text-gray-900 mb-6 tracking-tighter">{t.loanOptionsTitle}</h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto italic serif leading-relaxed">
          {t.loanOptionsDesc}
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8">
        {[
          { title: t.lowRates, desc: t.lowRatesDesc, icon: "📈", color: "blue" },
          { title: t.flexibleTenure, desc: t.flexibleTenureDesc, icon: "📅", color: "green" },
          { title: t.quickApproval, desc: t.quickApprovalDesc, icon: "⚡", color: "orange" }
        ].map((opt, i) => (
          <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all group">
            <div className="text-5xl mb-8 transform group-hover:scale-110 transition-transform inline-block">{opt.icon}</div>
            <h3 className="text-2xl font-black mb-4 tracking-tight">{opt.title}</h3>
            <p className="text-gray-500 leading-relaxed text-sm">{opt.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-20 relative overflow-hidden bg-orange-600 rounded-[3rem] p-12 md:p-20 text-white text-center shadow-2xl shadow-orange-600/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <h2 className="text-4xl font-black mb-6 tracking-tight">{t.personalizedQuote}</h2>
          <p className="text-xl mb-12 opacity-90 max-w-xl mx-auto font-medium">{t.advisorsReady}</p>
          <Link to="/" className="inline-block bg-white text-orange-600 px-10 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-orange-50 transition-all hover:scale-105 active:scale-95 shadow-xl">
            {t.contactUsToday}
          </Link>
        </div>
      </div>
    </div>
  );
};

const AdminPanel = ({ user, lang, onLogin }: { user: User | null, lang: 'en' | 'hi', onLogin: () => void }) => {
  const t = translations[lang];
  const [trucks, setTrucks] = useState<TruckData[]>([]);
  const [callbacks, setCallbacks] = useState<CallbackRequest[]>([]);
  const [sellRequests, setSellRequests] = useState<SellRequest[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTruck, setNewTruck] = useState({
    make: '', model: '', year: 2024, price: 0, mileage: 0, description: '', imageUrl: '', imageUrls: ['', '', '', '', ''], loanAvailable: true
  });
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, type: 'truck' | 'sell_request' | 'callback' } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (e.g., 5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Max 5MB allowed.");
      return;
    }

    setUploadingIdx(idx);
    console.log("Starting file upload for index:", idx);
    try {
      // Compress image before upload
      const options = {
        maxSizeMB: 4,
        maxWidthOrHeight: 1920,
        useWebWorker: true
      };
      
      console.log("Compressing image...");
      const compressedFile = await imageCompression(file, options);
      console.log(`Original size: ${file.size / 1024 / 1024} MB, Compressed size: ${compressedFile.size / 1024 / 1024} MB`);

      let publicUrl = '';
      
      // Try Supabase first if configured
      if (supabase) {
        console.log("Supabase is configured, attempting upload...");
        try {
          const fileName = `${Date.now()}-${file.name}`;
          
          // Add a 10-second timeout for Supabase upload
          const uploadPromise = supabase.storage
            .from('truck-images')
            .upload(fileName, compressedFile);
            
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Supabase upload timed out")), 10000)
          );

          const result = await Promise.race([uploadPromise, timeoutPromise]) as any;
          const { data, error } = result;

          if (error) {
            // If it's an RLS error, we log it but don't throw yet to allow fallback
            console.error("Supabase upload error (RLS or other):", error);
            throw error;
          }

          console.log("Supabase upload successful, path:", data?.path);
          const { data: { publicUrl: url } } = supabase.storage
            .from('truck-images')
            .getPublicUrl(data.path);
          publicUrl = url;
          toast.success("Image uploaded to Supabase!");
        } catch (supabaseErr: any) {
          const isRLS = supabaseErr?.message?.includes('row-level security') || supabaseErr?.message?.includes('RLS');
          console.warn(isRLS ? "Supabase RLS error detected, falling back to Firebase." : "Supabase upload failed or timed out, falling back to Firebase:", supabaseErr);
        }
      }

      // If Supabase failed or was not configured, use Firebase Storage
      if (!publicUrl) {
        console.log("Using Firebase Storage fallback...");
        const storageRef = ref(storage, `trucks/${Date.now()}-${file.name}`);
        const snapshot = await uploadBytes(storageRef, compressedFile);
        publicUrl = await getDownloadURL(snapshot.ref);
        console.log("Firebase upload successful, URL:", publicUrl);
        toast.success("Image uploaded to Firebase Storage!");
      }

      const newUrls = [...newTruck.imageUrls];
      newUrls[idx] = publicUrl;
      setNewTruck({
        ...newTruck, 
        imageUrls: newUrls, 
        imageUrl: idx === 0 ? publicUrl : (newTruck.imageUrl || publicUrl)
      });
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload image. Please check your connection.");
    } finally {
      setUploadingIdx(null);
    }
  };

  useEffect(() => {
    if (!user || (user.email !== "theusedtruck@gmail.com" && user.email !== "canirajprasad@gmail.com")) return;
    const q = query(collection(db, 'trucks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTrucks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TruckData)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'trucks'));
    
    const cq = query(collection(db, 'callbacks'), orderBy('createdAt', 'desc'));
    const cUnsubscribe = onSnapshot(cq, (snapshot) => {
      setCallbacks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CallbackRequest)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'callbacks'));

    const sq = query(collection(db, 'sell_requests'), orderBy('createdAt', 'desc'));
    const sUnsubscribe = onSnapshot(sq, (snapshot) => {
      setSellRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SellRequest)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'sell_requests'));

    return () => { unsubscribe(); cUnsubscribe(); sUnsubscribe(); };
  }, [user]);

  async function handleDelete(id: string) {
    console.log("handleDelete called for id:", id);
    const truck = trucks.find(t => t.id === id);
    try {
      // 1. Delete images from Supabase if they exist
      if (supabase && truck) {
        const urlsToDelete = [truck.imageUrl, ...(truck.imageUrls || [])].filter(url => url && url.includes('supabase.co'));
        console.log("URLs to delete from Supabase:", urlsToDelete);
        for (const url of urlsToDelete) {
          try {
            // Extract path from URL: .../public/truck-images/filename
            const path = url.split('/public/truck-images/')[1];
            if (path) {
              const { error } = await supabase.storage.from('truck-images').remove([path]);
              if (error) throw error;
              console.log("Deleted image from Supabase:", path);
            }
          } catch (err) {
            console.warn("Failed to delete image from Supabase:", url, err);
          }
        }
      }

      // 2. Delete from Firestore
      await deleteDoc(doc(db, 'trucks', id));
      toast.success("Listing removed.");
      setConfirmDelete(null);
    } catch (err) {
      console.error("Delete error:", err);
      handleFirestoreError(err, OperationType.DELETE, `trucks/${id}`);
    }
  }

  async function handleDeleteSellRequest(id: string) {
    console.log("handleDeleteSellRequest called for id:", id);
    const request = sellRequests.find(s => s.id === id);
    try {
      // 1. Delete images from Supabase if they exist
      if (supabase && request && request.imageUrls) {
        const urlsToDelete = request.imageUrls.filter(url => url && url.includes('supabase.co'));
        console.log("URLs to delete from Supabase (sell request):", urlsToDelete);
        for (const url of urlsToDelete) {
          try {
            // More robust path extraction
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/public/truck-images/');
            const path = pathParts[1];
            
            if (path) {
              const { error } = await supabase.storage.from('truck-images').remove([path]);
              if (error) throw error;
              console.log("Deleted image from Supabase:", path);
            } else {
              console.warn("Could not extract path from URL:", url);
            }
          } catch (err) {
            console.warn("Failed to delete image from Supabase:", url, err);
          }
        }
      }

      // 2. Delete from Firestore
      await deleteDoc(doc(db, 'sell_requests', id));
      toast.success("Sell request removed.");
      setConfirmDelete(null);
    } catch (err) {
      console.error("Delete sell request error:", err);
      handleFirestoreError(err, OperationType.DELETE, `sell_requests/${id}`);
    }
  }

  async function handleAddTruck(e: React.FormEvent) {
    e.preventDefault();
    console.log("handleAddTruck called");
    
    // Check for Google Photos links
    const allUrls = [newTruck.imageUrl, ...(newTruck.imageUrls || [])];
    if (allUrls.some(url => url && url.includes('photos.app.goo.gl'))) {
      toast.error("Google Photos 'Share' links detected. These will not display correctly. Please use direct image links.");
    }

    try {
      await addDoc(collection(db, 'trucks'), {
        ...newTruck,
        createdAt: serverTimestamp()
      });
      toast.success("Truck listed successfully!");
      setShowAddModal(false);
      setNewTruck({ make: '', model: '', year: 2024, price: 0, mileage: 0, description: '', imageUrl: '', imageUrls: ['', '', '', '', ''], loanAvailable: true });
    } catch (err) {
      console.error("Add truck error:", err);
      handleFirestoreError(err, OperationType.WRITE, 'trucks');
      toast.error("Failed to add truck.");
    }
  }

  async function handleDeleteCallback(id: string) {
    console.log("handleDeleteCallback called for id:", id);
    try {
      await deleteDoc(doc(db, 'callbacks', id));
      toast.success("Callback request removed.");
      setConfirmDelete(null);
    } catch (err) {
      console.error("Delete callback error:", err);
      handleFirestoreError(err, OperationType.DELETE, `callbacks/${id}`);
    }
  }

  if (!user || (user.email !== "theusedtruck@gmail.com" && user.email !== "canirajprasad@gmail.com")) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="bg-red-50 p-8 rounded-3xl border border-red-100">
          <Truck className="w-12 h-12 text-red-600 mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.notAdmin}</h2>
          <p className="text-gray-600 mb-6">
            {user ? `${t.loggedInAs} ${user.email}` : "You are not logged in."}
          </p>
          <div className="flex flex-col space-y-3">
            {!user && (
              <button 
                onClick={onLogin}
                className="bg-orange-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-orange-700 transition-colors"
              >
                {t.login}
              </button>
            )}
            {user && (
              <button 
                onClick={() => signOut(auth)}
                className="bg-gray-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-gray-800 transition-colors"
              >
                {t.logout}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900">{t.adminDashboard}</h1>
          <p className="text-gray-500">{t.manageInventory}</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-orange-700 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-orange-600/20"
        >
          <Plus className="w-5 h-5" />
          <span>{t.listNewTruck}</span>
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2 text-gray-900">
            <Truck className="w-6 h-6 text-orange-600" />
            <span>{t.currentInventory}</span>
          </h2>
          <div className="space-y-4">
            {trucks.map(t => (
              <div key={t.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center space-x-4 hover:border-orange-200 transition-all group">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden">
                  <img src={t.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">{t.make} {t.model} ({t.year})</h4>
                  <p className="text-sm text-orange-600 font-bold">₹{t.price.toLocaleString()}</p>
                </div>
                <button 
                  onClick={() => setConfirmDelete({ id: t.id, type: 'truck' })} 
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
            {trucks.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <p className="text-gray-400">{t.noInventory || "No trucks in inventory"}</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="space-y-12">
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2 text-gray-900">
                <MessageSquare className="w-6 h-6 text-orange-600" />
                <span>{t.callbackRequests}</span>
              </h2>
              <div className="space-y-4">
                {callbacks.map(c => (
                  <div key={c.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900">{c.name}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                            {c.createdAt?.toDate().toLocaleDateString()}
                          </span>
                          <button 
                            onClick={() => setConfirmDelete({ id: c.id, type: 'callback' })} 
                            className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      {c.truckImage && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 ml-4">
                          <img src={c.truckImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1 flex items-center space-x-2">
                      <Phone className="w-3 h-3 text-orange-600" />
                      <span>{c.mobile}</span>
                    </p>
                    <p className="text-sm text-gray-400 mb-3 italic truncate">{c.email}</p>
                    {c.truckModel && (
                      <div className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded inline-block">
                        Interested in: {c.truckModel}
                      </div>
                    )}
                  </div>
                ))}
                {callbacks.length === 0 && <p className="text-gray-400 italic text-sm">{t.noRequests}</p>}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2 text-gray-900">
                <Plus className="w-6 h-6 text-orange-600 rotate-45" />
                <span>{t.sellRequests}</span>
              </h2>
              <div className="space-y-4">
                {sellRequests.map(s => (
                  <div key={s.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-900">{s.name}</h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                          {s.createdAt?.toDate().toLocaleDateString()}
                        </span>
                        <button 
                          onClick={() => setConfirmDelete({ id: s.id, type: 'sell_request' })} 
                          className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1 flex items-center space-x-2">
                      <Phone className="w-3 h-3 text-orange-600" />
                      <span>{s.mobile}</span>
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <div className="text-gray-400 mb-0.5">{t.company}</div>
                        <div className="text-gray-900 truncate">{s.company || '-'}</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <div className="text-gray-400 mb-0.5">{t.model}</div>
                        <div className="text-gray-900 truncate">{s.model || '-'}</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <div className="text-gray-400 mb-0.5">{t.kmRun}</div>
                        <div className="text-gray-900 truncate">{s.kmRun || '-'}</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 p-3 bg-gray-50 rounded-xl italic">
                      {s.truckDetails}
                    </p>
                    {s.imageUrls && s.imageUrls.some(url => url) && (
                      <div className="mt-3 grid grid-cols-5 gap-1">
                        {s.imageUrls.filter(url => url).map((url, i) => (
                          <img 
                            key={i} 
                            src={url} 
                            alt="Truck" 
                            className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border border-gray-100"
                            onClick={() => window.open(url, '_blank')}
                            referrerPolicy="no-referrer"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {sellRequests.length === 0 && <p className="text-gray-400 italic text-sm">{t.noRequests}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-xl relative z-10 shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-100"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-gray-900">{t.listNewTruck}</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleAddTruck} className="space-y-6">
                {!supabase && (
                  <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                    <p className="text-xs text-red-700 font-medium flex items-start space-x-2">
                      <Info className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>
                        <strong>Supabase Not Configured:</strong> Direct image uploads are disabled. Please set your Supabase URL and Key in the project settings.
                      </span>
                    </p>
                  </div>
                )}
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <p className="text-xs text-blue-700 font-medium flex items-start space-x-2">
                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      <strong>Important:</strong> Use direct image links (ending in .jpg, .png). 
                      Google Photos "Share" links are not direct images and will not display. 
                    </span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">{t.make}</label>
                    <input 
                      required placeholder="e.g. Tata" 
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-orange-500 focus:ring-0 transition-all text-gray-900"
                      value={newTruck.make} onChange={e => setNewTruck({...newTruck, make: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">{t.model}</label>
                    <input 
                      required placeholder="e.g. Prima" 
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-orange-500 focus:ring-0 transition-all text-gray-900"
                      value={newTruck.model} onChange={e => setNewTruck({...newTruck, model: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">{t.year}</label>
                    <input 
                      required type="number" placeholder="2024" 
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-orange-500 focus:ring-0 transition-all text-gray-900"
                      value={isNaN(newTruck.year) ? '' : newTruck.year} 
                      onChange={e => setNewTruck({...newTruck, year: e.target.value === '' ? NaN : parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">{t.price}</label>
                    <input 
                      required type="number" placeholder="0" 
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-orange-500 focus:ring-0 transition-all text-gray-900"
                      value={isNaN(newTruck.price) ? '' : newTruck.price} 
                      onChange={e => setNewTruck({...newTruck, price: e.target.value === '' ? NaN : parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">{t.mileage}</label>
                    <input 
                      required type="number" placeholder="0" 
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-orange-500 focus:ring-0 transition-all text-gray-900"
                      value={isNaN(newTruck.mileage) ? '' : newTruck.mileage} 
                      onChange={e => setNewTruck({...newTruck, mileage: e.target.value === '' ? NaN : parseFloat(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-2xl border border-transparent">
                  <input 
                    type="checkbox" 
                    id="loanAvailable"
                    className="w-5 h-5 text-orange-600 rounded border-gray-300 bg-white focus:ring-orange-500"
                    checked={newTruck.loanAvailable}
                    onChange={e => setNewTruck({...newTruck, loanAvailable: e.target.checked})}
                  />
                  <label htmlFor="loanAvailable" className="text-sm font-bold text-gray-700 cursor-pointer">
                    {t.loanFacility}
                  </label>
                </div>
                
                <div className="space-y-4">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Images (Up to 5)</label>
                  {newTruck.imageUrls.map((url, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex space-x-2">
                        <input 
                          placeholder={`Image URL ${idx + 1} ${idx === 0 ? '(Primary)' : '(Optional)'}`}
                          required={idx === 0}
                          className="flex-1 p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-orange-500 focus:ring-0 transition-all text-sm text-gray-900"
                          value={url} 
                          onChange={e => {
                            const newUrls = [...newTruck.imageUrls];
                            newUrls[idx] = e.target.value;
                            setNewTruck({...newTruck, imageUrls: newUrls, imageUrl: newUrls[0]});
                          }}
                        />
                        <label className={`cursor-pointer p-4 rounded-2xl transition-all flex items-center justify-center min-w-[56px] ${uploadingIdx !== null ? 'bg-gray-200 cursor-not-allowed opacity-50' : 'bg-gray-100 hover:bg-orange-50 group'}`}>
                          {uploadingIdx === idx ? (
                            <Loader2 className="w-6 h-6 text-orange-600 animate-spin" />
                          ) : (
                            <Upload className="w-6 h-6 text-gray-600 group-hover:text-orange-600 transition-colors" />
                          )}
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleFileUpload(e, idx)}
                            disabled={uploadingIdx !== null}
                          />
                        </label>
                      </div>
                      {url && (
                        <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-gray-100 ml-1 group">
                          <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button 
                            type="button"
                            onClick={() => {
                              const newUrls = [...newTruck.imageUrls];
                              newUrls[idx] = '';
                              setNewTruck({...newTruck, imageUrls: newUrls, imageUrl: idx === 0 ? newUrls[1] || '' : newTruck.imageUrl});
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <textarea 
                  placeholder="Description" 
                  className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-orange-500 focus:ring-0 transition-all h-32 text-gray-900"
                  value={newTruck.description} onChange={e => setNewTruck({...newTruck, description: e.target.value})}
                />
                <button type="submit" className="w-full bg-orange-600 text-white py-5 rounded-2xl font-bold text-lg hover:bg-orange-700 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-orange-600/20">
                  Publish Listing
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl text-center border border-gray-100"
            >
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-2xl font-black mb-3 text-gray-900">Are you sure?</h3>
              <p className="text-gray-500 mb-8 leading-relaxed">This action cannot be undone. All associated data and images will be deleted from our systems.</p>
              <div className="flex space-x-4">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-4 bg-gray-100 text-gray-900 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (confirmDelete.type === 'truck') handleDelete(confirmDelete.id);
                    else if (confirmDelete.type === 'sell_request') handleDeleteSellRequest(confirmDelete.id);
                    else if (confirmDelete.type === 'callback') handleDeleteCallback(confirmDelete.id);
                  }}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const QuickBuy = ({ lang }: { lang: 'en' | 'hi' }) => {
  const t = translations[lang];
  const [form, setForm] = useState({ 
    name: '', 
    mobile: '', 
    company: '',
    model: '',
    kmRun: '',
    truckDetails: '', 
    imageUrls: ['', '', '', '', ''] 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Max 5MB allowed.");
      return;
    }

    setUploadingIdx(idx);
    try {
      // Compress image before upload
      const options = {
        maxSizeMB: 4,
        maxWidthOrHeight: 1920,
        useWebWorker: true
      };
      
      console.log("Compressing image...");
      const compressedFile = await imageCompression(file, options);
      console.log(`Original size: ${file.size / 1024 / 1024} MB, Compressed size: ${compressedFile.size / 1024 / 1024} MB`);

      let publicUrl = '';
      
      if (supabase) {
        try {
          const fileName = `${Date.now()}-${file.name}`;
          const uploadPromise = supabase.storage
            .from('truck-images')
            .upload(fileName, compressedFile);
            
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Supabase upload timed out")), 10000)
          );

          const result = await Promise.race([uploadPromise, timeoutPromise]) as any;
          const { data, error } = result;

          if (error) throw error;

          const { data: { publicUrl: url } } = supabase.storage
            .from('truck-images')
            .getPublicUrl(data.path);
          publicUrl = url;
          toast.success("Image uploaded!");
        } catch (supabaseErr: any) {
          console.warn("Supabase upload failed, falling back to Firebase:", supabaseErr);
        }
      }

      if (!publicUrl) {
        const storageRef = ref(storage, `sell-requests/${Date.now()}-${file.name}`);
        const snapshot = await uploadBytes(storageRef, compressedFile);
        publicUrl = await getDownloadURL(snapshot.ref);
        toast.success("Image uploaded to fallback storage!");
      }

      const newUrls = [...form.imageUrls];
      newUrls[idx] = publicUrl;
      setForm({ ...form, imageUrls: newUrls });
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload image.");
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const requestData = {
        ...form,
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'sell_requests'), requestData);
      
      // Simulate Email Notification
      // To send a REAL email, you can use a service like EmailJS (https://www.emailjs.com/)
      // Example integration:
      // emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", {
      //   from_name: form.name,
      //   mobile: form.mobile,
      //   details: form.truckDetails,
      //   images: form.imageUrls.filter(u => u).join(", "),
      //   to_email: "canirajprasad@gmail.com"
      // }, "YOUR_PUBLIC_KEY");
      
      console.log("SENDING EMAIL TO ADMIN (canirajprasad@gmail.com):", requestData);
      
      toast.success(t.valuationSuccess);
      toast.info("Admin has been notified via email.");
      
      setForm({ 
        name: '', 
        mobile: '', 
        company: '',
        model: '',
        kmRun: '',
        truckDetails: '', 
        imageUrls: ['', '', '', '', ''] 
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'sell_requests');
      toast.error("Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-orange-600/10"
        >
          <Truck className="w-12 h-12 text-orange-600" />
        </motion.div>
        <h1 className="text-5xl font-black text-gray-900 mb-6 tracking-tight">{t.quickBuyTitle}</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto italic serif leading-relaxed">
          {t.quickBuyDesc}
        </p>
      </div>

      <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-gray-100 shadow-2xl max-w-2xl mx-auto relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 via-orange-600 to-orange-400" />
        
        <h2 className="text-3xl font-black mb-8 text-gray-900">{t.sellFormTitle}</h2>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t.fullName}</label>
              <input 
                required 
                className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-orange-500 focus:ring-0 transition-all text-gray-900"
                placeholder="Enter your name"
                value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t.mobileNumber}</label>
              <input 
                required type="tel"
                maxLength={10}
                className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-orange-500 focus:ring-0 transition-all text-gray-900"
                placeholder="Enter 10-digit mobile number"
                value={form.mobile} 
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setForm({...form, mobile: val});
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t.company}</label>
              <input 
                required 
                className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-orange-500 focus:ring-0 transition-all text-gray-900"
                placeholder="e.g. Tata"
                value={form.company} onChange={e => setForm({...form, company: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t.model}</label>
              <input 
                required 
                className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-orange-500 focus:ring-0 transition-all text-gray-900"
                placeholder="e.g. Prima"
                value={form.model} onChange={e => setForm({...form, model: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t.kmRun}</label>
            <input 
              required type="number"
              className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-orange-500 focus:ring-0 transition-all text-gray-900"
              placeholder="e.g. 50000"
              value={form.kmRun} onChange={e => setForm({...form, kmRun: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t.additionalDetails}</label>
            <textarea 
              required
              className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-orange-500 focus:ring-0 transition-all h-32 text-gray-900"
              placeholder="E.g. Good condition, single owner..."
              value={form.truckDetails} onChange={e => setForm({...form, truckDetails: e.target.value})}
            />
          </div>

          <div className="space-y-4">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Upload Truck Images (Max 5)</label>
            <div className="grid grid-cols-5 gap-3">
              {form.imageUrls.map((url, idx) => (
                <div key={idx} className="relative aspect-square bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden group transition-all hover:border-orange-500/50">
                  {url ? (
                    <>
                      <img src={url} alt="Truck" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => {
                          const newUrls = [...form.imageUrls];
                          newUrls[idx] = '';
                          setForm({...form, imageUrls: newUrls});
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <label className={`cursor-pointer w-full h-full flex items-center justify-center transition-all ${uploadingIdx !== null ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-orange-50'}`}>
                      {uploadingIdx === idx ? (
                        <Loader2 className="w-6 h-6 text-orange-600 animate-spin" />
                      ) : (
                        <Upload className="w-6 h-6 text-gray-400 group-hover:text-orange-600 transition-colors" />
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, idx)}
                        disabled={uploadingIdx !== null}
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-2 italic flex items-center space-x-1">
              <Info className="w-3 h-3" />
              <span>Clear photos help us give you a better valuation.</span>
            </p>
          </div>

          <button 
            disabled={isSubmitting}
            type="submit" 
            className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-orange-700 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-2xl shadow-orange-600/30"
          >
            {isSubmitting ? t.submitting : t.submitValuation}
          </button>
        </form>
      </div>
    </div>
  );
};

const Home = ({ lang }: { lang: 'en' | 'hi' }) => {
  const t = translations[lang];
  const [trucks, setTrucks] = useState<TruckData[]>([]);
  const [selectedTruck, setSelectedTruck] = useState<TruckData | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailImg, setDetailImg] = useState<string | null>(null);
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [showCallback, setShowCallback] = useState(false);
  const [callbackForm, setCallbackForm] = useState({ name: '', mobile: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'trucks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTrucks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TruckData)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'trucks'));
    return () => unsubscribe();
  }, []);

  const handleTruckClick = (truck: TruckData) => {
    setSelectedTruck(truck);
    setDetailImg(truck.imageUrl);
    setShowDetail(true);
  };

  const handleCallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // 1. Save to Firestore
      await addDoc(collection(db, 'callbacks'), {
        ...callbackForm,
        truckId: selectedTruck?.id || 'general',
        truckModel: selectedTruck ? `${selectedTruck.make} ${selectedTruck.model}` : 'General Enquiry',
        truckImage: selectedTruck?.imageUrl || '',
        createdAt: serverTimestamp()
      });

      // 2. Send to Google Sheets (User needs to provide their Apps Script URL)
      const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbx_YOUR_SCRIPT_ID/exec';
      
      try {
        await fetch(appsScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...callbackForm,
            truck: selectedTruck ? `${selectedTruck.make} ${selectedTruck.model}` : 'General',
            date: new Date().toLocaleString()
          })
        });
      } catch (sheetErr) {
        console.warn("Google Sheet update failed, but request saved to database.");
      }

      toast.success("Callback request submitted! We'll contact you soon.");
      setShowCallback(false);
      setCallbackForm({ name: '', mobile: '', email: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'callbacks');
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <header className="mb-16 text-center">
        <h1 className="text-6xl font-black text-gray-900 mb-4 tracking-tighter">{t.findNext} <span className="text-orange-600">{t.workhorse}</span></h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto italic serif">{t.premium}</p>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {trucks.map(truck => (
          <TruckCard 
            key={truck.id} 
            truck={truck} 
            lang={lang} 
            onEnquiry={(t) => { setSelectedTruck(t); setShowEnquiry(true); }}
            onCallback={(t) => { setSelectedTruck(t); setShowCallback(true); }}
            onClick={handleTruckClick}
          />
        ))}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetail && selectedTruck && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowDetail(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-4xl relative z-10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col md:flex-row border border-gray-100"
            >
              <div className="md:w-1/2 bg-gray-100 relative">
                <button 
                  onClick={() => setShowDetail(false)} 
                  className="absolute top-6 left-6 z-20 p-3 bg-white/80 backdrop-blur-md rounded-full hover:bg-white transition-all shadow-lg md:hidden"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                  <div className="h-full">
                    <img 
                      src={detailImg || selectedTruck.imageUrl} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                      onError={(e) => (e.currentTarget.src = "https://picsum.photos/seed/truck/800/600")}
                    />
                  </div>
                  {selectedTruck.imageUrls && selectedTruck.imageUrls.length > 1 && (
                    <div className="absolute bottom-6 left-6 right-6 flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                      {selectedTruck.imageUrls.filter(u => u.trim() !== '').map((url, i) => (
                        <img 
                          key={i} 
                          src={url} 
                          className={`w-16 h-16 object-cover rounded-xl border-2 cursor-pointer hover:border-white transition-all ${detailImg === url ? 'border-orange-600 shadow-lg' : 'border-white/50'}`}
                          onClick={() => setDetailImg(url)}
                          referrerPolicy="no-referrer"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      ))}
                    </div>
                  )}
              </div>
              
              <div className="md:w-1/2 p-8 md:p-12 overflow-y-auto">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest inline-block mb-3">
                      {selectedTruck.year} Model
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">{selectedTruck.make} {selectedTruck.model}</h2>
                  </div>
                  <button onClick={() => setShowDetail(false)} className="hidden md:block p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t.price}</p>
                    <p className="text-2xl font-black text-orange-600">₹{selectedTruck.price.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t.mileage}</p>
                    <p className="text-2xl font-black text-gray-900">{selectedTruck.mileage.toLocaleString()} km</p>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">{t.description}</h3>
                  <p className="text-gray-600 leading-relaxed italic serif">
                    {selectedTruck.description || "No detailed description provided for this vehicle."}
                  </p>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => { setShowDetail(false); setShowEnquiry(true); }}
                    className="w-full flex items-center justify-center space-x-3 bg-gray-900 text-white py-5 rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all shadow-xl shadow-gray-200"
                  >
                    <Phone className="w-5 h-5" />
                    <span>{t.enquiry}</span>
                  </button>
                  <button 
                    onClick={() => { setShowDetail(false); setShowCallback(true); }}
                    className="w-full flex items-center justify-center space-x-3 border-2 border-orange-600 text-orange-600 py-5 rounded-2xl font-bold text-lg hover:bg-orange-50 transition-all"
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span>{t.callback}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {trucks.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium italic">{t.noTrucks}</p>
        </div>
      )}

      {/* Enquiry Modal */}
      <AnimatePresence>
        {showEnquiry && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowEnquiry(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-md relative z-10 shadow-2xl text-center border border-gray-100"
            >
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Phone className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-2xl font-black mb-2">{t.contactDetails}</h2>
              <p className="text-gray-500 mb-8 italic serif">{t.callDirectly} {selectedTruck?.make} {selectedTruck?.model}</p>
              <div className="space-y-4">
                <a href="tel:9822055424" className="block w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-xl hover:bg-gray-800 transition-colors">
                  9822055424
                </a>
                <a href="tel:9920088484" className="block w-full border-2 border-gray-900 text-gray-900 py-4 rounded-2xl font-bold text-xl hover:bg-gray-50 transition-colors">
                  9920088484
                </a>
              </div>
              <button onClick={() => setShowEnquiry(false)} className="mt-8 text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest">
                {t.close}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Callback Modal */}
      <AnimatePresence>
        {showCallback && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowCallback(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md relative z-10 shadow-2xl border border-gray-100"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black">{t.requestCallback}</h2>
                  <p className="text-sm text-gray-500 italic serif">For: {selectedTruck?.make} {selectedTruck?.model}</p>
                </div>
                <button onClick={() => setShowCallback(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCallbackSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">{t.fullName}</label>
                  <input 
                    required 
                    className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Enter your name"
                    value={callbackForm.name} onChange={e => setCallbackForm({...callbackForm, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">{t.mobileNumber}</label>
                  <input 
                    required type="tel"
                    maxLength={10}
                    className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Enter 10-digit mobile number"
                    value={callbackForm.mobile} 
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setCallbackForm({...callbackForm, mobile: val});
                    }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">{t.emailAddress}</label>
                  <input 
                    required type="email"
                    className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Enter email id"
                    value={callbackForm.email} onChange={e => setCallbackForm({...callbackForm, email: e.target.value})}
                  />
                </div>
                <button 
                  disabled={isSubmitting}
                  type="submit" 
                  className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-700 transition-colors disabled:opacity-50 shadow-lg shadow-orange-600/20"
                >
                  {isSubmitting ? t.submitting : t.submit}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  useEffect(() => {
    testFirestoreConnection(db);
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        console.log("User logged in:", u.email, "Verified:", u.emailVerified);
      } else {
        console.log("User logged out");
      }
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Logged in successfully!");
    } catch (err: any) {
      console.error("Login Error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        toast.error("Domain not authorized. Please add your Netlify domain to Firebase Console -> Authentication -> Settings -> Authorized domains.");
      } else {
        toast.error(`Login failed: ${err.message || "Unknown error"}`);
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    toast.success("Logged out.");
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-white transition-colors"><div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div></div>;

  const t = translations[lang];

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-orange-100 selection:text-orange-900 transition-colors">
          <Navbar 
            user={user} 
            onLogin={handleLogin} 
            onLogout={handleLogout} 
            lang={lang} 
            setLang={setLang} 
          />
          <main>
            <Routes>
              <Route path="/" element={<Home lang={lang} />} />
              <Route path="/loans" element={<LoanOptions lang={lang} />} />
              <Route path="/quick-buy" element={<QuickBuy lang={lang} />} />
              <Route path="/admin" element={<AdminPanel user={user} lang={lang} onLogin={handleLogin} />} />
            </Routes>
            <section className="py-24 bg-white">
              <div className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-16">
                  <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">{t.whyUsTitle}</h2>
                  <div className="w-24 h-1.5 bg-orange-600 mx-auto rounded-full" />
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {[
                    { icon: ShieldCheck, title: t.whyUsReason1, desc: t.whyUsDesc1 },
                    { icon: BadgeCheck, title: t.whyUsReason2, desc: t.whyUsDesc2 },
                    { icon: Users, title: t.whyUsReason3, desc: t.whyUsDesc3 },
                    { icon: Zap, title: t.whyUsReason4, desc: t.whyUsDesc4 }
                  ].map((item, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-8 rounded-[2rem] bg-gray-50 border border-gray-100 hover:border-orange-200 hover:bg-orange-50/30 transition-all duration-500 group"
                    >
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:bg-orange-600 transition-colors duration-500">
                        <item.icon className="w-7 h-7 text-orange-600 group-hover:text-white transition-colors duration-500" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                      <p className="text-gray-600 leading-relaxed text-sm">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          </main>
          <footer className="bg-gray-900 text-white py-24 mt-20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500" />
            <div className="max-w-7xl mx-auto px-4 relative z-10">
              <div className="grid lg:grid-cols-2 gap-20 items-start mb-20">
                <div>
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-orange-600/40">
                      <Truck className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-3xl font-black tracking-tight">{t.brand}</span>
                  </div>
                  <h2 className="text-5xl font-black mb-6 tracking-tight leading-tight">
                    {lang === 'en' ? 'Let\'s Get You on the Road.' : 'चलिए आपको सड़क पर उतारते हैं।'}
                  </h2>
                  <p className="text-xl text-gray-400 max-w-md italic serif leading-relaxed">
                    {lang === 'en' 
                      ? "Whether you're looking to buy your next fleet or sell your current one, our experts are just a call away." 
                      : "चाहे आप अपना अगला बेड़ा खरीदना चाह रहे हों या अपना वर्तमान बेचना चाह रहे हों, हमारे विशेषज्ञ बस एक कॉल की दूरी पर हैं।"}
                  </p>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="sm:col-span-2 bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-md">
                    <p className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-6">Direct Inquiries</p>
                    <div className="space-y-8">
                      <a href="mailto:theusedtruck@gmail.com" className="flex items-center group">
                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mr-5 group-hover:bg-orange-600 transition-all duration-500">
                          <Mail className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Email Support</p>
                          <p className="text-xl font-bold group-hover:text-orange-500 transition-colors">theusedtruck@gmail.com</p>
                        </div>
                      </a>
                      
                      <div className="h-px bg-white/10 w-full" />
                      
                      <div className="grid sm:grid-cols-2 gap-8">
                        <a href="tel:+919920088484" className="flex items-center group">
                          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mr-5 group-hover:bg-orange-600 transition-all duration-500">
                            <Phone className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Sales Primary</p>
                            <p className="text-xl font-bold group-hover:text-orange-500 transition-colors">+91 9920088484</p>
                          </div>
                        </a>
                        <a href="tel:+919822501408" className="flex items-center group">
                          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mr-5 group-hover:bg-orange-600 transition-all duration-500">
                            <Phone className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Sales Secondary</p>
                            <p className="text-xl font-bold group-hover:text-orange-500 transition-colors">+91 9822501408</p>
                          </div>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center space-x-8 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  <Link to="/" className="hover:text-white transition-colors">Home</Link>
                  <Link to="/quick-buy" className="hover:text-white transition-colors">Sell Truck</Link>
                  <Link to="/loans" className="hover:text-white transition-colors">Loan Options</Link>
                </div>
                <p className="text-sm text-gray-500 font-medium">© 2026 {t.brand} Marketplace. All rights reserved.</p>
              </div>
            </div>
          </footer>
          <Toaster position="bottom-right" />
        </div>
      </Router>
    </ErrorBoundary>
  );
}
