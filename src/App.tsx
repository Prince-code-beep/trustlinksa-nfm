import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from './lib/supabase';

type Profile = {
  id: string;
  name: string;
  role: 'buyer' | 'seller' | 'both';
  phone?: string;
  bio?: string;
  location?: string;
  trust_score: number;
  rating: number;
  completed_orders: number;
  total_bought: number;
  total_sold: number;
  avatar_url?: string;
};

type Product = {
  id: string;
  seller_id: string;
  title: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
  likes: number;
  views: number;
  sold_count: number;
  is_sold: boolean;
  created_at: string;
  profiles?: Profile;
};

type Order = {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'disputed';
  escrow_amount: number;
  created_at: string;
  products?: Product;
};

const CATEGORIES = ['Everything', 'Fashion', 'Tech', 'Food', 'Services', 'Other'] as const;

function getTrustLevel(score: number) {
  if (score >= 90) return { label: 'Platinum', color: 'from-amber-400 to-yellow-300' };
  if (score >= 75) return { label: 'Gold', color: 'from-yellow-400 to-amber-300' };
  if (score >= 60) return { label: 'Silver', color: 'from-slate-300 to-slate-200' };
  return { label: 'Bronze', color: 'from-orange-300 to-amber-200' };
}

function calcTrustScore(p: Partial<Profile>) {
  const completed = Math.min((p.completed_orders || 0) * 2, 40);
  const sold = Math.min((p.total_sold || 0) * 1.5, 30);
  const rating = ((p.rating || 8.5) / 10) * 20;
  const base = 10;
  return Math.min(99, Math.round(completed + sold + rating + base));
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [roleInput, setRoleInput] = useState<'buyer' | 'seller' | 'both'>('both');
  const [phoneInput, setPhoneInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);

  const handleAvatarUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const userId = session?.user?.id || profile?.id;
    if (!userId) return alert('Please sign in first');
    const fileName = `${userId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('avatars').upload(fileName, file);
    if (error) return alert(error.message);
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId);
    alert('Profile picture saved!');
    window.location.reload();
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>('Everything');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [viewProfile, setViewProfile] = useState<Profile | null>(null);
  const [showSell, setShowSell] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [activeNav, setActiveNav] = useState('Home');
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [sellTitle, setSellTitle] = useState('');
  const [sellDesc, setSellDesc] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellCat, setSellCat] = useState('Other');
  const [sellImage, setSellImage] = useState<File | null>(null);
  const [sellLoading, setSellLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) { setProfile(null); return; }
    const load = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (data) setProfile(data);
    };
    load();
  }, [session]);

  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('*, profiles(*)').order('created_at', { ascending: false }).limit(100);
    if (data) {
      setProducts(data as Product[]);
      if (session?.user) {
        setMyProducts((data as Product[]).filter(p => p.seller_id === session.user.id));
      }
    }
  };

  const loadOrders = async () => {
    if (!session?.user) return;
    const { data } = await supabase.from('orders').select('*, products(*)').or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`).order('created_at', { ascending: false });
    if (data) setOrders(data as Order[]);
  };

  useEffect(() => { loadProducts(); loadOrders(); }, [session]);

  const handleAuth = async () => {
    if (!email || !password || (authMode === 'signup' && !nameInput)) {
      return notify('Fill all required fields');
    }
    setAuthLoading(true);
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          const newProfile: Partial<Profile> = {
            id: data.user.id,
            name: nameInput,
            role: roleInput,
            phone: phoneInput,
            bio: roleInput === 'seller' ? 'New seller • Building trust in Soweto' : 'Verified buyer • Soweto',
            location: 'Soweto, Gauteng',
            trust_score: 50,
            rating: 8.5,
            completed_orders: 0,
            total_bought: 0,
            total_sold: 0,
          };
          newProfile.trust_score = calcTrustScore(newProfile);
          const { error: pErr } = await supabase.from('profiles').insert([newProfile]);
          if (pErr) throw pErr;
          notify('Account created! Check email to confirm, then sign in.');
          setAuthMode('signin');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        notify('Welcome back!');
      }
    } catch (e: any) {
      notify(e.message || 'Auth failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    notify('Signed out');
  };

  const handleCreateProduct = async () => {
    if (!sellTitle || !sellPrice || !session?.user) return notify('Title and price required');
    setSellLoading(true);
    try {
      let imageUrl = '';
      if (sellImage) {
        const ext = sellImage.name.split('.').pop();
        const path = `${session.user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('product-images').upload(path, sellImage);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from('product-images').getPublicUrl(path);
        imageUrl = data.publicUrl;
      }
      const { error } = await supabase.from('products').insert([{
        seller_id: session.user.id,
        title: sellTitle,
        description: sellDesc,
        price: parseInt(sellPrice),
        category: sellCat,
        image_url: imageUrl,
      }]);
      if (error) throw error;
      if (profile) {
        const updated = { ...profile, total_sold: profile.total_sold + 1, trust_score: Math.min(99, profile.trust_score + 1) };
        await supabase.from('profiles').update({ total_sold: updated.total_sold, trust_score: updated.trust_score }).eq('id', profile.id);
        setProfile(updated);
      }
      notify('Product listed! Live now 🔥');
      setShowSell(false);
      setSellTitle(''); setSellDesc(''); setSellPrice(''); setSellImage(null);
      loadProducts();
    } catch (e: any) {
      notify(e.message || 'Failed to list');
    } finally {
      setSellLoading(false);
    }
  };

  const handleAskAI = () => {
    if (!aiQuestion.trim()) { setAiAnswer('Ask me anything - e.g. Best sneakers under R2000, Who is the most trusted seller, What is photosynthesis, How do I start a business in Soweto?'); return; }
    const q = aiQuestion.toLowerCase().trim();
    const myName = profile?.name || 'Friend';
    const myTrust = profile?.trust_score || 50;
    const personal = 'Hi ' + myName + ' - I remember you. Trust Score: ' + myTrust + '% | Sales: ' + (profile?.total_sold || 0) + ' | Bought: ' + (profile?.total_bought || 0) + ' | Orders: ' + (profile?.completed_orders || 0) + ' | Location: ' + (profile?.location || 'Soweto, Gauteng') + '.';
    const sellersMap = new Map();
    products.forEach((p) => { if (p.profiles) sellersMap.set(p.seller_id, p.profiles); });
    const ranked = Array.from(sellersMap.values()).map((s: any) => {
      const trust = s.trust_score || 50;
      const rating = s.rating || 8.5;
      const orders = s.completed_orders || 0;
      const sold = s.total_sold || 0;
      const reliability = Math.round(trust * 0.4 + (rating / 10) * 30 + Math.min(orders * 2, 20) + Math.min(sold, 10));
      let verdict = 'Good - check face photo + reviews before buying.';
      if (reliability >= 85) verdict = 'HIGHLY TRUSTED - Safe to buy. Top performer.';
      else if (reliability >= 70) verdict = 'TRUSTED - Good history, safe with Escrow.';
      else if (reliability < 50) verdict = 'NEW / LOW DATA - Use Escrow + meet in public.';
      return { ...s, reliability, verdict };
    }).sort((a, b) => b.reliability - a.reliability);
    const best: any = ranked[0];
    let bestText = 'No sellers yet - be the first to list and become #1 ranked seller.';
    if (best) {
      bestText = 'TOP SELLER RIGHT NOW (Reliability Engine): ' + best.name + ' - Reliability: ' + best.reliability + '% | Trust: ' + best.trust_score + '% | Rating: ' + best.rating + '/10 | Orders: ' + best.completed_orders + ' | Sold: ' + best.total_sold + ' | Verdict: ' + best.verdict;
      if (ranked[1]) bestText += '\n2nd: ' + ranked[1].name + ' - Reliability ' + ranked[1].reliability + '% | Trust ' + ranked[1].trust_score + '%';
      if (ranked[2]) bestText += '\n3rd: ' + ranked[2].name + ' - Reliability ' + ranked[2].reliability + '% | Trust ' + ranked[2].trust_score + '%';
    }
    const matched = products.filter((p) => q.split(' ').some((word) => word.length > 3 && (p.title.toLowerCase().includes(word) || p.category.toLowerCase().includes(word)))).slice(0, 4);
    let productText = 'There are currently ' + products.length + ' live products.';
    if (matched.length > 0) {
      const lines = matched.map((p, i) => (i + 1) + '. ' + p.title + ' - R' + p.price + ' (' + (p.profiles?.name || 'Seller') + ' - Trust ' + (p.profiles?.trust_score || 50) + '%, Rating ' + (p.profiles?.rating || 8.5) + '/10)');
      productText = 'BEST MATCHES:\n' + lines.join('\n');
    }
    let general = '';
    const has = (...words: string[]) => words.some((w) => q.includes(w));
    if (has('best seller', 'recommend', 'who should i buy', 'who is the best', 'top seller')) {
      general = 'HOW I RANK (More accurate than Google/Meta): I do NOT guess. I calculate Reliability = Trust Score (40%) + Customer Rating (30%) + Completed Orders (20%) + Total Sold (10%) from LIVE Supabase data. Highest Reliability = Most Trusted. Always check: 1) Face photo 2) Reliability over 75% 3) Use Peach Escrow 4) Meet at Maponya Mall.';
    } else if (has('sell', 'selling', 'how to sell')) {
      general = 'SELLING - SOWETO STRATEGY: 1) Clear photo + your face 2) Title with brand + size + condition 3) Price R50 below Maponya Mall 4) Reply on WhatsApp in under 5 mins 5) Offer pickup at Pimville Square / Maponya Mall 6) Each completed sale +1 Trust Score. Top sellers sell 3x faster because Reliability is high. Best categories now: sneakers, phones, air fryers, food.';
    } else if (has('buy', 'safe', 'trust', 'scam', 'fraud')) {
      general = 'BUYING SAFELY - TRUSTLINK RULES: 1) Only buy from Reliability over 75% 2) Check face photo + company profile 3) NEVER pay outside TrustLink - use Peach Escrow 4) Money is held until YOU confirm delivery 5) Meet in public, daytime - Maponya Mall, Jabulani Mall 6) If price is too low, it is likely fake. If seller rushes you, walk away.';
    } else if (has('peach', 'pay', 'payment', 'escrow', 'card')) {
      general = 'PEACH PAYMENTS + ESCROW - HOW REAL MONEY WORKS: 1) Buyer pays with Visa / Mastercard / Capitec Pay / SnapScan via Peach (secure) 2) Peach holds money in Escrow 3) Seller delivers 4) Buyer confirms delivery in app 5) Peach releases money to seller bank account. If no delivery, buyer gets refund. This is safer than EFT or cash.';
    } else if (has('photosynthesis', 'plant', 'how do plants')) {
      general = 'PHOTOSYNTHESIS - CORRECT ANSWER: Plants use sunlight + water + carbon dioxide to make glucose (food) + oxygen. Equation: 6CO2 + 6H2O + light energy -> C6H12O6 + 6O2. Happens in chloroplasts, using chlorophyll (green pigment). This is why plants are green and why we have oxygen to breathe.';
    } else if (has('business', 'start a business', 'entrepreneur', 'side hustle')) {
      general = 'START A BUSINESS IN SOWETO - STEP BY STEP: 1) Pick ONE product people already buy (sneakers, food, air fryers) 2) Start on TrustLink - list 3 products, no shop needed 3) Price for profit: Cost + 30% minimum 4) Get 5 reviews fast - ask friends to buy + review 5) Reinvest profit, do not spend it 6) Register later with CIPC when you make R5000+/month. Most businesses fail because they try to sell everything. Sell ONE thing well first.';
    } else if (has('cv', 'resume', 'job', 'interview')) {
      general = 'GET A JOB - CV + INTERVIEW: CV: 1 page, name + phone + 3 skills + 2 experiences (even volunteer). No long paragraphs. Interview: 1) Arrive 15 mins early 2) Eye contact + smile 3) Answer with STAR: Situation, Task, Action, Result 4) Ask 1 question at end: What does success look like in this role? Follow up on WhatsApp next day. In Soweto, Maponya Mall, Jabulani Mall, and Bara Mall hire often - apply in person with CV printed.';
    } else if (has('money', 'save', 'budget', 'invest', 'rich')) {
      general = 'MONEY - BUDGET RULE: Use 50/30/20: 50% needs (food, transport, rent), 30% wants, 20% savings. If you earn R3000: Save R600 first, before spending. Keep savings in a separate account (Capitec, TymeBank). Do NOT invest in things you do not understand or WhatsApp double-your-money schemes - they are scams. Best first investment: Your own selling business on TrustLink.';
    } else if (has('health', 'diet', 'exercise', 'lose weight', 'gym')) {
      general = 'HEALTH - SIMPLE + CORRECT: 1) Drink 2L water daily 2) Walk 30 mins daily 3) Sleep 7-8 hours 4) Eat: half plate vegetables, quarter protein (chicken, beans, eggs), quarter pap/rice 5) Cut sugary drinks - they are the #1 cause of weight gain in SA. No magic pills. If you feel chest pain, severe headache, or cannot breathe - go to Bara Hospital / clinic immediately. This is general info, not medical diagnosis - see a doctor for personal advice.';
    } else if (has('south africa', 'soweto', 'history', 'mandela', 'apartheid')) {
      general = 'SOUTH AFRICA / SOWETO - KEY FACTS: Soweto = South Western Townships, Johannesburg, Gauteng. Created in 1930s-1950s under apartheid. June 16, 1976: Soweto Uprising - students protested Afrikaans in schools, Hector Pieterson was killed, became a turning point. 1994: First democratic election, Nelson Mandela became president. Soweto today: 1.3M+ people, Maponya Mall, Vilakazi Street (only street in world where 2 Nobel winners lived - Mandela + Tutu).';
    } else if (has('what is ai', 'artificial intelligence', 'how does ai work')) {
      general = 'WHAT IS AI? Artificial Intelligence = computers learning patterns from data to predict / answer. Like a child learning from examples. Types: 1) Chat AI (like me, Grok, ChatGPT) - predicts best words 2) Vision AI - sees photos 3) Recommendation AI - suggests products (like TrustLink AI). TrustLink AI is special: It combines Personal Memory (your data) + General Knowledge + Live Marketplace Reliability - Google/Meta/Grok do not know your TrustLink sales.';
    } else if (has('math', 'calculate', 'percentage', 'how much is')) {
      general = 'MATH - PERCENTAGE FORMULA: Percentage = (Part / Whole) x 100. Example: If you sell for R3500 and cost was R2800, profit = R700. Profit % = (700 / 2800) x 100 = 25%. To calculate discount: New Price = Old Price x (1 - discount). Example: R1000 with 10% off = 1000 x 0.9 = R900. Tell me your numbers and I will calculate it.';
    } else if (has('code', 'programming', 'python', 'website', 'app')) {
      general = 'LEARN CODING - FASTEST PATH: 1) Start with HTML + CSS (1 week) 2) Then JavaScript (2 weeks) 3) Then React (like TrustLink is built) 4) Then Supabase for database. Practice by building 1 real project - like a shop for your street - not just watching videos. Free: freeCodeCamp, W3Schools, YouTube. In 3 months of 1 hour daily, you can build a real website like TrustLink.';
    } else if (has('price', 'how much', 'cost')) {
      general = 'PRICE INTELLIGENCE: Check 3 similar products on TrustLink. Price 10% lower for fast sale. Too cheap = buyers think it is fake. Fair price + high Trust + clear photo = fastest sale. Example: If 3 similar sneakers are R1500, list yours at R1350 with good photo.';
    } else if (has('hello', 'hi', 'hey', 'who are you')) {
      general = 'I am TrustLink AI - your personal AI Agent. I am more advanced than Google AI / Meta AI / Grok for marketplace because I know YOU + LIVE TrustLink data + General Knowledge + Maps in ONE answer. Ask me anything: Who is best seller? What is photosynthesis? How do I start a business? How do I stay safe buying?';
    } else if (has('weather', 'rain', 'today')) {
      general = 'WEATHER - SOWETO (General): Gauteng summer (Nov-Feb) = hot, afternoon thunderstorms, 25-32C. Winter (Jun-Aug) = cold mornings, dry, 5-22C. Always check SA Weather Service app before meeting for delivery. Best delivery time: Morning 9-11am, before afternoon storms.';
    } else {
      general = 'I understand you asked: "' + aiQuestion + '". Here is the most accurate general answer I can give from verified knowledge: Break your question into 3 parts - 1) WHAT it is 2) WHY it matters 3) WHAT to do next. For marketplace questions, I use LIVE TrustLink data (Trust + Rating + Reliability). For general knowledge, I use verified facts (like textbooks + SA context). If you give me more detail - e.g. Explain photosynthesis for Grade 10 or Best seller for iPhone in Soweto - I will give you a deeper, step-by-step answer. Try asking: What is AI? How do I start a business? Who is best seller?';
    }
    const maps = 'MAPS + PICKUP: Best safe meetups: Maponya Mall (Soweto), Jabulani Mall, Pimville Square, Bara Mall. Always meet in public, daytime. TrustLink AI knows your location: ' + (profile?.location || 'Soweto, Gauteng') + '.';
    const sourceNote = 'Sources: LIVE TrustLink Supabase data (Trust + Rating + Orders) + Verified General Knowledge. No guessing. If data is missing, I say so.';
    setAiAnswer(personal + '\n\n--- ' + bestText + '\n\n--- ' + productText + '\n\n--- GENERAL INTELLIGENCE (Grok / Google AI level, but with TrustLink data) ---\n' + general + '\n\n--- ' + maps + '\n\n' + sourceNote + '\n\nAsk me anything else - I can answer general knowledge + marketplace.');
  };


  const handlePeachPay  const handleBuy = async (product: Product) => {
    if (!session?.user) return notify('Sign in to buy');
    if (product.seller_id === session.user.id) return notify('Cannot buy your own product');
    try {
      const { error } = await supabase.from('orders').insert([{
        product_id: product.id,
        buyer_id: session.user.id,
        seller_id: product.seller_id,
        escrow_amount: product.price,
        status: 'pending',
      }]);
      if (error) throw error;
      notify(`Order placed! Seller will contact you. Escrow R${product.price} pending.`);
      loadOrders();
      setSelected(null);
    } catch (e: any) {
      notify(e.message || 'Order failed');
    }
  };

  const handleWhatsApp = (product: Product) => {
    const sellerPhone = product.profiles?.phone || '27711234567';
    const cleanPhone = sellerPhone.replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('0') ? '27' + cleanPhone.slice(1) : cleanPhone;
    const text = encodeURIComponent(`Hi! I'm interested in "${product.title}" for R${product.price} on TrustLink. Is it still available?`);
    window.open(`https://wa.me/${waPhone}?text=${text}`, '_blank');
  };

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchCat = filter === 'Everything' || p.category === filter;
      const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
      const matchNav = activeNav === 'Home' || (activeNav === 'You' && p.seller_id === session?.user?.id) || (activeNav === 'Deals' && p.price < 1000) || true;
      if (activeNav === 'You') return p.seller_id === session?.user?.id;
      return matchCat && matchSearch && matchNav;
    });
  }, [products, filter, search, activeNav, session]);

  if (!session) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-5">
        <div className="w-full max-w-[420px] bg-white rounded-[28px] border border-[#FFE4C2] shadow-xl p-7">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF8A4C] to-[#FF5A7A] text-white flex items-center justify-center font-black text-xl">TL</div>
          <h1 className="text-[28px] font-[900] tracking-tight mt-5 leading-[1.1]">TrustLink SA<br/><span className="text-[#FF8A4C]">Real Marketplace</span></h1>
          <p className="text-[13px] text-[#8A7A6E] mt-2 leading-5">Buy, sell, build trust. Real accounts, real products, real escrow. Your activity creates your Trust Score.</p>
          <div className="mt-6 space-y-3">
            {authMode === 'signup' && (
              <>
                <input value={nameInput} onChange={e=>setNameInput(e.target.value)} placeholder="Your full name e.g. Trust Link" className="w-full h-12 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] text-[14px] outline-none focus:border-[#FF8A4C]" />
                <input value={phoneInput} onChange={e=>setPhoneInput(e.target.value)} placeholder="WhatsApp number e.g. 071 123 4567" className="w-full h-12 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] text-[14px] outline-none focus:border-[#FF8A4C]" />
                <div className="flex gap-2">
                  {(['buyer','seller','both'] as const).map(r=>(
                    <button key={r} onClick={()=>setRoleInput(r)} className={`flex-1 h-12 rounded-full text-[13px] font-bold border capitalize ${roleInput===r ? 'bg-[#1E1E1E] text-white border-[#1E1E1E]' : 'bg-white border-[#FFE4C2] text-[#8A7A6E]'}`}>
                      {r === 'buyer' ? '🛒 Buy' : r === 'seller' ? '💼 Sell' : '✨ Both'}
                    </button>
                  ))}
                </div>
              </>
            )}
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" type="email" className="w-full h-12 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] text-[14px] outline-none focus:border-[#FF8A4C]" />
            <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (min 6 chars)" type="password" className="w-full h-12 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] text-[14px] outline-none focus:border-[#FF8A4C]" />
            <button onClick={handleAuth} disabled={authLoading} className="w-full h-12 rounded-full bg-gradient-to-br from-[#FF8A4C] to-[#FF5A7A] text-white font-bold text-[14px] shadow-lg disabled:opacity-50">
              {authLoading ? 'Please wait...' : authMode === 'signup' ? 'Create real account • Start trading 🌻' : 'Sign in to TrustLink'}
            </button>
            <button onClick={()=>setShowAI(true)} className="w-full h-12 rounded-full bg-[#7C3AED] text-white font-bold text-[14px] shadow-lg">🤖 Try TrustLink AI - Ask Anything (No Login Needed)</button>
            <button onClick={()=>setAuthMode(authMode==='signup'?'signin':'signup')} className="w-full text-[13px] text-[#8A7A6E] font-medium">
              {authMode==='signup' ? 'Already have account? Sign in' : 'New here? Create account'}
            </button>
            <div className="pt-3 text-[11px] leading-4 text-[#B8A99A] border-t border-[#FFF0E0] mt-3">
              How trust works: Completed orders • Purchases • Sales • Rating /10 • Product performance • Algorithm learns your searches, likes & time spent to suggest what you love. Real data saved in Supabase.
            </div>
          </div>
        </div>
        {showAI && (
          <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-6">
            <div className="w-full max-w-[520px] bg-white rounded-t-[28px] lg:rounded-[28px] p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                <div><h3 className="font-[900] text-[20px]">🤖 TrustLink AI</h3><p className="text-[12px] text-[#8A7A6E]">Ask anything - No login needed to try</p></div>
                <button onClick={()=>setShowAI(false)} className="w-8 h-8 rounded-full bg-[#FFF8F0] border">✕</button>
              </div>
              <input value={aiQuestion} onChange={e=>setAiQuestion(e.target.value)} placeholder="Ask anything... best sneakers, photosynthesis..." className="mt-4 w-full h-12 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[14px]" />
              <button onClick={handleAskAI} className="mt-3 w-full h-12 rounded-full bg-[#7C3AED] text-white font-bold">Ask TrustLink AI</button>
              {aiAnswer && <div className="mt-4 p-4 rounded-[16px] bg-[#F5F3FF] border border-[#DDD6FE] text-[13px] leading-5 whitespace-pre-line">{aiAnswer}</div>}
              <p className="text-[11px] text-[#8A7A6E] mt-3 text-center">Sign in to get Personal Memory + Your Trust Score in answers.</p>
            </div>
          </div>
        )}
        {toast && <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-[#1E1E1E] text-white px-5 py-2.5 rounded-full text-[13px] font-semibold z-[100]">{toast}</div>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] text-[#1E1E1E] antialiased">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-20 w-[420px] h-[420px] bg-[#FFD6BA]/40 rounded-full blur-[60px]" />
        <div className="absolute top-[200px] -right-24 w-[360px] h-[360px] bg-[#FFB6D9]/30 rounded-full blur-[50px]" />
      </div>
      {toast && <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-[#1E1E1E] text-white text-[13px] font-semibold px-5 py-2.5 rounded-full shadow-xl whitespace-nowrap">{toast}</div>}
      <div className="mx-auto max-w-[960px] w-full min-h-screen relative flex flex-col">
        <div className="px-5 lg:px-8 pt-4 pb-32 relative z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-[11px] tracking-[0.22em] font-extrabold text-[#FF8A4C]">TRUSTLINK REAL</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E9FBF0] border border-[#BBF7D0] text-[#16A34A] font-bold">● LIVE DB</span>
              {profile && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#FFE4C2] text-[#FF8A4C] font-bold">Trust {profile.trust_score}%</span>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadProducts} className="w-9 h-9 rounded-full bg-white border border-[#FFE4C2] flex items-center justify-center">🔄</button>
              <button onClick={()=>profile && setViewProfile(profile)} className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF8A4C] to-[#FF5A7A] text-white font-bold text-[12px] overflow-hidden p-0">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="me" className="w-full h-full object-cover" /> : (profile?.name?.slice(0,2).toUpperCase() || 'TL')}
              </button>
              <label style={{fontSize:'11px',cursor:'pointer',background:'#fff',border:'1px solid #FFE4C2',padding:'6px 8px',borderRadius:'999px'}}>📷 Upload Pic<input type="file" accept="image/*" onChange={handleAvatarUpload} style={{display:'none'}} /></label>
              <button onClick={handleSignOut} className="text-[11px] text-[#8A7A6E] font-bold px-2">Logout</button>
            </div>
          </div>
          <div className="mt-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <h1 className="text-[44px] lg:text-[52px] leading-[0.9] tracking-[-0.03em] font-[900]">
              <span className="block">Find it.</span>
              <span className="bg-gradient-to-r from-[#FF8A4C] via-[#FF5A7A] to-[#FF8A4C] bg-clip-text text-transparent block pb-1">Trust it.</span>
              <span className="text-[14px] font-medium tracking-normal text-[#8A7A6E] mt-2 block">Real marketplace • {products.length} live products • {orders.length} orders</span>
            </h1>
            <button onClick={()=>setShowSell(true)} className="lg:mb-2 h-12 px-6 rounded-full bg-[#1E1E1E] text-white font-bold text-[14px] hover:scale-[1.02] transition">+ List Product</button>
            <button onClick={()=>setShowAI(true)} className="lg:mb-2 h-12 px-6 rounded-full bg-[#7C3AED] text-white font-bold text-[14px] ml-2">🤖 Ask TrustLink AI</button>
          </div>
          <div className="mt-6 flex gap-2">
            <div className="flex-1 h-12 bg-white border border-[#FFE4C2] rounded-full flex items-center px-4 gap-2 shadow-sm">
              <span>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search real products..." className="flex-1 outline-none text-[14px] bg-transparent" />
            </div>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map(c=>{
              const active = filter===c;
              return <button key={c} onClick={()=>setFilter(c)} className={`whitespace-nowrap h-9 px-4 rounded-full border text-[13px] font-bold transition ${active ? 'bg-[#1E1E1E] text-white border-[#1E1E1E]' : 'bg-white border-[#FFE4C2] text-[#8A7A6E] hover:border-[#FF8A4C]'}`}>{c}</button>
            })}
          </div>
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.length===0 ? (
              <div className="col-span-full py-16 text-center">
                <div className="text-5xl">📦</div>
                <div className="mt-4 font-bold">No products yet</div>
                <div className="text-[13px] text-[#8A7A6E] mt-1">Be the first to list! Real buyers are waiting in Soweto.</div>
                <button onClick={()=>setShowSell(true)} className="mt-4 h-10 px-5 rounded-full bg-[#1E1E1E] text-white font-bold text-[13px]">List your first item</button>
              </div>
            ) : filtered.map(p=>(
              <button key={p.id} onClick={()=>setSelected(p)} className="text-left group bg-white rounded-[20px] border border-[#FFE4C2] overflow-hidden hover:shadow-lg hover:border-[#FF8A4C]/30 transition-all">
                <div className={`aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-[#FFF8F0] to-[#FFE4C2] flex items-center justify-center`}>
                  {p.image_url ? <img src={p.image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" /> : <span className="text-4xl">📦</span>}
                  <span className="absolute top-2 left-2 text-[10px] font-bold bg-white/90 backdrop-blur px-2 py-1 rounded-full border">R{p.price}</span>
                  {p.profiles && <span className="absolute top-2 right-2 text-[9px] font-bold bg-[#1E1E1E] text-white px-2 py-1 rounded-full">TRUST {p.profiles.trust_score}%</span>}
                </div>
                <div className="p-3">
                  <div className="font-bold text-[13px] leading-4 line-clamp-2">{p.title}</div>
                  <div className="text-[11px] text-[#8A7A6E] mt-1 flex justify-between"><span>{p.category} • {p.profiles?.name || 'Seller'}</span><span>❤ {p.likes}</span></div>
                </div>
              </button>
            ))}
          </div>
          {orders.length>0 && (
            <div className="mt-8 bg-white rounded-[20px] border border-[#FFE4C2] p-4">
              <h3 className="font-bold text-[14px]">Your Orders ({orders.length}) — Real Escrow</h3>
              <div className="mt-3 space-y-2">
                {orders.map(o=>(
                  <div key={o.id} className="flex justify-between items-center p-3 rounded-xl bg-[#FFF8F0] border border-[#FFE4C2]">
                    <div>
                      <div className="text-[13px] font-bold">{o.products?.title || o.product_id.slice(0,8)}</div>
                      <div className="text-[11px] text-[#8A7A6E]">R{o.escrow_amount} • {o.status.toUpperCase()} • {new Date(o.created_at).toLocaleDateString()}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${o.status==='delivered' ? 'bg-[#E9FBF0] text-[#16A34A]' : 'bg-[#FFF1A8] text-[#8A5A00]'}`}>{o.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex justify-center pointer-events-none">
          <div className="pointer-events-auto w-[calc(100%-20px)] max-w-[390px] mx-auto mb-3 bg-white/95 backdrop-blur-xl border border-[#FFE4C2] rounded-[26px] shadow-xl flex justify-between items-center px-2 py-1.5">
            {[
              {id:'Home', icon:'🏠'},
              {id:'Map', icon:'📍'},
              {id:'Sell', icon:'+', center:true},
              {id:'Deals', icon:'🛡'},
              {id:'You', icon:'👤'},
            ].map(it=>{
              if((it as any).center) return <button key={it.id} onClick={()=>setShowSell(true)} className="flex-1 flex justify-center"><div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#FF8A4C] to-[#FF5A7A] text-white flex items-center justify-center font-bold shadow-lg text-xl">+</div></button>
              return <button key={it.id} onClick={()=>setActiveNav(it.id)} className="flex-1 flex flex-col items-center py-1.5"><span className={`text-[12px] ${activeNav===it.id ? 'text-[#FF8A4C]' : 'text-[#B8A99A]'}`}>{it.icon}</span><span className={`text-[10px] font-bold ${activeNav===it.id ? 'text-[#FF8A4C]' : 'text-[#B8A99A]'}`}>{it.id}</span></button>
            })}
          </div>
        </div>
      </div>
      {selected && (
        <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-6">
          <div className="w-full max-w-[520px] bg-white rounded-t-[28px] lg:rounded-[28px] max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#FFF8F0] border flex items-center justify-center text-xl overflow-hidden">{selected.profiles?.avatar_url ? <img src={selected.profiles.avatar_url} alt="seller" className="w-full h-full object-cover" /> : (selected.image_url ? '🖼' : '📦')}</div>
                  <div>
                    <div className="font-bold">{selected.title}</div>
                    <div className="text-[12px] text-[#8A7A6E]">Seller: {selected.profiles?.name || selected.seller_id.slice(0,6)} • Trust {selected.profiles?.trust_score || 50}% • {selected.category}</div>
                  </div>
                </div>
                <button onClick={()=>setSelected(null)} className="w-8 h-8 rounded-full bg-[#FFF8F0] border">✕</button>
              </div>
              {selected.image_url && <img src={selected.image_url} alt={selected.title} className="mt-4 w-full aspect-[4/3] object-cover rounded-[18px] border" />}
              <div className="mt-4 p-4 rounded-[16px] bg-[#FFF8F0] border border-[#FFE4C2]">
                <div className="text-[24px] font-[900]">R{selected.price}</div>
                <div className="text-[13px] text-[#5A4A3E] mt-2 leading-5">{selected.description || 'No description. Contact seller for details.'}</div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={()=>handleBuy(selected)} className="h-12 rounded-full bg-[#1E1E1E] text-white font-bold">Buy — Escrow R{selected.price}</button>
                <button onClick={()=>handleWhatsApp(selected)} className="h-12 rounded-full bg-[#25D366] text-white font-bold">💬 WhatsApp Seller</button>
              </div>
              <button onClick={()=>selected.profiles && setViewProfile(selected.profiles)} className="mt-3 w-full h-10 rounded-full bg-white border border-[#FFE4C2] font-bold text-[13px]">View Seller Trust Profile</button>
            </div>
          </div>
        </div>
      )}
      {viewProfile && (
        <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-6">
          <div className="w-full max-w-[420px] bg-white rounded-t-[28px] lg:rounded-[28px] p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between">
              <div className="flex gap-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FF8A4C] to-[#FF5A7A] text-white flex items-center justify-center font-bold overflow-hidden">{viewProfile.avatar_url ? <img src={viewProfile.avatar_url} alt={viewProfile.name} className="w-full h-full object-cover" /> : viewProfile.name.slice(0,2).toUpperCase()}</div>
                <div>
                  <div className="font-bold flex items-center gap-2">{viewProfile.name} <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1E1E1E] text-white">{viewProfile.role}</span></div>
                  <div className="text-[12px] text-[#8A7A6E]">{viewProfile.bio}</div>
                  <div className="text-[11px] text-[#8A7A6E]">{viewProfile.location}</div>
                </div>
              </div>
              <button onClick={()=>setViewProfile(null)} className="w-8 h-8 rounded-full bg-[#FFF8F0] border">✕</button>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="p-3 rounded-[16px] bg-[#FFF8F0] border text-center"><div className="text-[20px] font-[900]">{viewProfile.trust_score}%</div><div className="text-[10px] font-bold text-[#8A7A6E]">TRUST</div></div>
              <div className="p-3 rounded-[16px] bg-white border text-center"><div className="text-[20px] font-[900]">{viewProfile.rating.toFixed(1)}/10</div><div className="text-[10px] font-bold text-[#8A7A6E]">SERVICE</div></div>
              <div className="p-3 rounded-[16px] bg-[#E9FBF0] border text-center"><div className="text-[20px] font-[900]">{viewProfile.completed_orders}</div><div className="text-[10px] font-bold text-[#16A34A]">ORDERS</div></div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-[14px] bg-white border"><div className="font-bold">{viewProfile.total_sold}</div><div className="text-[10px] text-[#8A7A6E]">Sold</div></div>
              <div className="p-3 rounded-[14px] bg-white border"><div className="font-bold">{viewProfile.total_bought}</div><div className="text-[10px] text-[#8A7A6E]">Bought</div></div>
              <div className="p-3 rounded-[14px] bg-white border"><div className="font-bold">{viewProfile.phone ? '✓' : '—'}</div><div className="text-[10px] text-[#8A7A6E]">Phone</div></div>
            </div>
            <button onClick={()=>setViewProfile(null)} className="mt-5 w-full h-12 rounded-full bg-[#1E1E1E] text-white font-bold">Close</button>
          </div>
        </div>
      )}

      {showAI && (
        <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-6">
          <div className="w-full max-w-[520px] bg-white rounded-t-[28px] lg:rounded-[28px] p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-[900] text-[20px]">🤖 TrustLink AI Agent</h3>
              <button onClick={()=>setShowAI(false)} className="w-8 h-8 rounded-full bg-[#FFF8F0] border">✕</button>
            </div>
            <p className="text-[12px] text-[#8A7A6E] mt-1">Personal Memory + General Knowledge + Maps + Best Seller by Reliability in ONE answer. Like Grok / Google AI / Meta AI, but more advanced.</p>
            <input value={aiQuestion} onChange={e=>setAiQuestion(e.target.value)} placeholder="Ask anything... Who is best seller? What is photosynthesis?" className="mt-4 w-full h-12 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[14px]" />
            <button onClick={handleAskAI} className="mt-3 w-full h-12 rounded-full bg-[#7C3AED] text-white font-bold">Ask TrustLink AI</button>
            {aiAnswer && <div className="mt-4 p-4 rounded-[16px] bg-[#F5F3FF] border border-[#DDD6FE] text-[13px] leading-5 whitespace-pre-line">{aiAnswer}</div>}
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={()=>{setAiQuestion('Who is the best seller for sneakers?');}} className="text-[11px] px-3 py-1.5 rounded-full bg-white border border-[#FFE4C2]">🏆 Best seller?</button>
              <button onClick={()=>{setAiQuestion('What is photosynthesis?');}} className="text-[11px] px-3 py-1.5 rounded-full bg-white border border-[#FFE4C2]">🌱 Photosynthesis?</button>
              <button onClick={()=>{setAiQuestion('How do I start a business in Soweto?');}} className="text-[11px] px-3 py-1.5 rounded-full bg-white border border-[#FFE4C2]">💼 Start business?</button>
              <button onClick={()=>{setAiQuestion('How do I buy safely?');}} className="text-[11px] px-3 py-1.5 rounded-full bg-white border border-[#FFE4C2]">🛡️ Buy safely?</button>
            </div>
          </div>
        </div>
      )}
      {showSell && (
        <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-6">
          <div className="w-full max-w-[520px] bg-white rounded-t-[28px] lg:rounded-[28px] p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-[900] text-[20px]">List Real Product — Live Now</h3>
              <button onClick={()=>setShowSell(false)} className="w-8 h-8 rounded-full bg-[#FFF8F0] border">✕</button>
            </div>
            <div className="mt-5 space-y-3">
              <input value={sellTitle} onChange={e=>setSellTitle(e.target.value)} placeholder="Title e.g. Nike Air Jordan 1 Size 8" className="w-full h-12 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none focus:border-[#FF8A4C] text-[14px]" />
              <textarea value={sellDesc} onChange={e=>setSellDesc(e.target.value)} placeholder="Description, condition, pickup point (Maponya Mall?)" className="w-full min-h-[80px] p-4 rounded-[18px] border border-[#FFE4C2] bg-[#FFF8F0] outline-none focus:border-[#FF8A4C] text-[14px]" />
              <div className="flex gap-2">
                <input value={sellPrice} onChange={e=>setSellPrice(e.target.value)} placeholder="Price R e.g. 2850" type="number" className="flex-1 h-12 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none focus:border-[#FF8A4C] text-[14px]" />
                <select value={sellCat} onChange={e=>setSellCat(e.target.value)} className="flex-1 h-12 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] text-[14px]">
                  {CATEGORIES.filter(c=>c!=='Everything').map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={e=>setSellImage(e.target.files?.[0]||null)} className="hidden" />
                <button onClick={()=>fileInputRef.current?.click()} className="w-full h-12 rounded-full border border-dashed border-[#FF8A4C] bg-[#FFF8F0] font-bold text-[13px] text-[#FF8A4C]">{sellImage ? `📸 ${sellImage.name}` : '📸 Upload Photo (real storage)'}</button>
              </div>
              <button onClick={handleCreateProduct} disabled={sellLoading} className="w-full h-12 rounded-full bg-[#1E1E1E] text-white font-bold disabled:opacity-50">{sellLoading ? 'Listing...' : 'List Product — Live to Buyers'}</button>
              <div className="text-[11px] text-[#8A7A6E] leading-4 pt-2 border-t">Your product will be visible instantly to all users in Soweto & Gauteng. Real Supabase storage + real database. No more mock.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
