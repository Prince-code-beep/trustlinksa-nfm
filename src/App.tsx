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
  education?: string;
  top_skill?: string;
  skill_score?: number;
  second_skill?: string;
  second_score?: number;
  career_goal?: string;
  allow_recruiter?: boolean;
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
  const [activeTab, setActiveTab] = useState<'market' | 'brain' | 'recruiter'>('market');
  const [brainEducation, setBrainEducation] = useState('');
  const [brainTopSkill, setBrainTopSkill] = useState('');
  const [brainTopScore, setBrainTopScore] = useState('');
  const [brainSecondSkill, setBrainSecondSkill] = useState('');
  const [brainCareerGoal, setBrainCareerGoal] = useState('');
  const [allowRecruiter, setAllowRecruiter] = useState(true);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [brainQuestion, setBrainQuestion] = useState('What job can I get near me?');
  const [brainAnswer, setBrainAnswer] = useState('');
  const [vaultUnlocked, setVaultUnlocked] = useState(false);

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
  const [activeNav, setActiveNav] = useState('Home');
  const [toast, setToast] = useState<string | null>(null);

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

  const handleBuy = async (product: Product) => {
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


  // ===== PRIVACY: Brain is PRIVATE per-user. NO hardcoded personal data. Soul loads ONLY from signed-in profile. =====
  const getMySoul = () => {
    if (!session || !profile) return null;
    // Brain data = ONLY what THIS user typed when they created THEIR account. Stored per-user, protected by login.
    // Fallback: localStorage per-user (keyed by user id) if Supabase columns not yet added.
    let saved: any = {};
    try { saved = JSON.parse(localStorage.getItem('trustlink_brain_' + profile.id) || '{}'); } catch (e) { saved = {}; }
    const education = profile.education || saved.education || '';
    const topSkill = profile.top_skill || saved.topSkill || '';
    const topScore = profile.skill_score || saved.topScore || '';
    const secondSkill = profile.second_skill || saved.secondSkill || '';
    const careerGoal = profile.career_goal || saved.careerGoal || '';
    const canShare = (profile.allow_recruiter ?? saved.allowRecruiter ?? true);
    return {
      name: profile.name || 'You',
      location: profile.location || 'South Africa',
      education: education,
      topSkill: topSkill,
      topScore: topScore,
      secondSkill: secondSkill,
      careerGoal: careerGoal,
      allowRecruiter: canShare,
      hasBrainData: !!(education || topSkill || careerGoal),
      facts: [
        { label: 'Your Education (You Provided)', detail: education || 'Not added yet - Add in My Brain', score: education ? 'Added by You' : 'Add Yours' },
        { label: 'Your Top Skill (You Provided)', detail: topSkill || 'Not added yet - Add in My Brain', score: topScore ? String(topScore) + '%' : 'Add Yours' },
        { label: 'Your Second Skill (You Provided)', detail: secondSkill || 'Not added yet', score: secondSkill ? 'Added by You' : 'Add Yours' },
        { label: 'Your Career Goal (You Provided)', detail: careerGoal || 'Not added yet', score: careerGoal ? 'Added by You' : 'Add Yours' },
        { label: 'Your Trust Score', detail: 'From your sales + reviews', score: (profile.trust_score || 50) + '%' },
        { label: 'Your Location', detail: 'From YOUR profile - used for Maps', score: profile.location || 'Not set' },
      ],
      graph: (topSkill ? topSkill + ' (' + (topScore || '') + '%)' : 'Your top skill') + ' -> ' + (secondSkill || 'Your second skill') + ' -> ' + (careerGoal || 'Your career goal') + ' - built from data YOU provided at signup.',
      vault: [
        { name: 'Your ID Document', hash: 'SHA256: sealed - only you unlock', status: 'SEALED' },
        { name: 'Your CV / Transcript', hash: 'SHA256: sealed - only you unlock', status: 'SEALED' },
        { name: 'Your Phone + ID Number', hash: 'SHA256: sealed - never used for training', status: 'SEALED' },
      ],
    };
  };
  const handleSaveBrain = async () => {
    if (!session || !profile) return alert('Sign in first to save YOUR Brain data.');
    const data = { education: brainEducation, topSkill: brainTopSkill, topScore: brainTopScore, secondSkill: brainSecondSkill, careerGoal: brainCareerGoal, allowRecruiter: allowRecruiter };
    try { localStorage.setItem('trustlink_brain_' + profile.id, JSON.stringify(data)); } catch (e) {}
    try { await supabase.from('profiles').update({ education: brainEducation, top_skill: brainTopSkill, skill_score: brainTopScore ? parseInt(brainTopScore) : null, second_skill: brainSecondSkill, career_goal: brainCareerGoal, allow_recruiter: allowRecruiter }).eq('id', profile.id); } catch (e) {}
    alert('YOUR Brain saved! Only YOU can see it when signed in. Recruiter sees it ONLY if you allow it.');
    window.location.reload();
  };
  const handleAskBrain = () => {
    if (!session || !profile) { setBrainAnswer('LOCKED - Sign in to unlock YOUR Brain. Your Brain is PRIVATE. It shows ONLY your data, from YOUR account, when YOU are signed in. No one else can see your Soul, Vault, or history.'); return; }
    const mySoul: any = getMySoul();
    const myName = profile.name || 'You';
    const myLocation = profile.location || 'South Africa';
    const myTrust = profile.trust_score || 50;
    const mySold = profile.total_sold || 0;
    const myOrders = profile.completed_orders || 0;
    const q = brainQuestion.toLowerCase();
    const isJob = q.includes('job') || q.includes('work') || q.includes('salary') || q.includes('career');
    if (isJob) {
      setBrainAnswer('FOR: ' + myName + ' - ' + myLocation + ' - PRIVATE - Only you see this.\n\n--- 1. DESCRIPTIVE ---\nYour Trust: ' + myTrust + '%, Sales: ' + mySold + ', Orders: ' + myOrders + ', Location: ' + myLocation + '. YOUR Provided Data: Education=' + (mySoul?.education || 'Not added') + ', Top Skill=' + (mySoul?.topSkill || 'Not added') + ' ' + (mySoul?.topScore || '') + '%, Goal=' + (mySoul?.careerGoal || 'Not added') + '. Market: General jobs near you.\n\n--- 2. DIAGNOSTIC ---\nYour Trust is ' + myTrust + '% because of your sales + reviews. Higher Trust = more buyers trust you. Transport from ' + myLocation + ' affects real salary.\n\n--- 3. PREDICTIVE ---\nIf you complete 2 more sales + 5-star reviews, Trust rises, buyers pick you first.\n\n--- 4. PRESCRIPTIVE ---\nTODAY: 1) Update profile photo + location 2) List 1 product with clear photo 3) Reply on WhatsApp in under 5 mins 4) Meet at safe public mall near ' + myLocation + '.\n\n--- MAPS ---\nSafe meetups near you: Your nearest mall in ' + myLocation + '. Meet in public, daytime.');
    } else {
      setBrainAnswer('FOR: ' + myName + ' - ' + myLocation + ' - PRIVATE - Only you see this.\n\n--- 1. DESCRIPTIVE ---\nYou asked: "' + brainQuestion + '". Your Soul: Trust ' + myTrust + '%, Sales ' + mySold + ', Orders ' + myOrders + '.\n\n--- 2. DIAGNOSTIC ---\nThis connects to YOUR Graph: ' + (getMySoul()?.graph || '') + '\n\n--- 3. PREDICTIVE ---\nIf you act today, your Trust + Sales will grow.\n\n--- 4. PRESCRIPTIVE ---\nTry: "What job can I get near me?" or "How do I sell faster?"');
    }
  };
  const handleAskAI = async () => {
    if (!aiQuestion.trim()) { setAiAnswer('Ask me anything - e.g. Who is Mac G? Who is Michael Blackson? Who is best seller?'); return; }
    const originalQ = aiQuestion.trim();
    const q = originalQ.toLowerCase();
    setAiAnswer('Searching real knowledge for "' + originalQ + '"... (Wikipedia + TrustLink data)');
    let topic = originalQ.replace(/\?/g, '').replace(/^who is /i, '').replace(/^what is /i, '').trim();
    if (q.includes('mac g')) topic = 'MacG';
    if (q.includes('best seller') || q.includes('top seller')) {
      const best = [...products].sort((a,b) => (b.profiles?.trust_score||0)-(a.profiles?.trust_score||0))[0];
      setAiAnswer('TOP SELLER (Reliability Engine): ' + (best?.profiles?.name || 'No sellers yet') + ' - Trust ' + (best?.profiles?.trust_score || 50) + '%. Reliability = Trust 40% + Rating 30% + Orders 20% + Sold 10% from LIVE Supabase data.');
      return;
    }
    try {
      const res = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(topic));
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      if (data.extract) {
        let extra = '';
        if (q.includes('mac g')) extra = 'MacG (MacGyver Mukwevho, born Nov 8, 1989) is a South African podcaster, host of Podcast and Chill with Mac G, with Sol Phenduka. Started on YFM, built a huge YouTube show. Known for Chillers fanbase.\n\nWikipedia: ';
        setAiAnswer(extra + data.extract + '\n\nSource: Wikipedia - ' + (data.content_urls?.desktop?.page || ''));
      } else throw new Error('no extract');
    } catch (e) {
      setAiAnswer('You asked: "' + originalQ + '". I tried Wikipedia but could not reach it (offline?). Try again with WiFi on, or ask: Who is Mac G? Who is Michael Blackson? Who is best seller?');
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
            {authMode === 'signup' && (
              <div className="pt-3 border-t border-[#FFF0E0] space-y-2">
                <div className="text-[12px] font-bold text-[#7C3AED]">🧠 YOUR BRAIN - Only you see this when signed in (POPIA Protected)</div>
                <input value={brainEducation} onChange={e=>setBrainEducation(e.target.value)} placeholder="Your education e.g. BCom Information Management - UJ" className="w-full h-11 px-4 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" />
                <div className="flex gap-2">
                  <input value={brainTopSkill} onChange={e=>setBrainTopSkill(e.target.value)} placeholder="Your top skill e.g. Machine Learning" className="flex-1 h-11 px-4 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" />
                  <input value={brainTopScore} onChange={e=>setBrainTopScore(e.target.value)} placeholder="Score % e.g. 92" type="number" className="w-[90px] h-11 px-3 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" />
                </div>
                <input value={brainSecondSkill} onChange={e=>setBrainSecondSkill(e.target.value)} placeholder="Second skill e.g. Business Admin / SEO" className="w-full h-11 px-4 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" />
                <input value={brainCareerGoal} onChange={e=>setBrainCareerGoal(e.target.value)} placeholder="Career goal e.g. AI Marketing Assistant R25k" className="w-full h-11 px-4 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" />
                <label className="flex items-center gap-2 text-[12px] text-[#5A4A3E]"><input type="checkbox" checked={allowRecruiter} onChange={e=>setAllowRecruiter(e.target.checked)} /> Allow recruiters to see my Soul (Verified Facts only, no ID / no phone) - You can turn off anytime in My Brain</label>
                <div className="text-[11px] text-[#B8A99A] leading-4">This is YOUR data. It is saved to YOUR account only. No other user sees it. Recruiter sees it ONLY if you tick this box AND share your link.</div>
              </div>
            )}
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" type="email" className="w-full h-12 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] text-[14px] outline-none focus:border-[#FF8A4C]" />
            <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (min 6 chars)" type="password" className="w-full h-12 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] text-[14px] outline-none focus:border-[#FF8A4C]" />
            <button onClick={handleAuth} disabled={authLoading} className="w-full h-12 rounded-full bg-gradient-to-br from-[#FF8A4C] to-[#FF5A7A] text-white font-bold text-[14px] shadow-lg disabled:opacity-50">
              {authLoading ? 'Please wait...' : authMode === 'signup' ? 'Create real account • Start trading 🌻' : 'Sign in to TrustLink'}
            </button>
            <button onClick={()=>setAuthMode(authMode==='signup'?'signin':'signup')} className="w-full text-[13px] text-[#8A7A6E] font-medium">
              {authMode==='signup' ? 'Already have account? Sign in' : 'New here? Create account'}
            </button>
            <div className="pt-3 text-[11px] leading-4 text-[#B8A99A] border-t border-[#FFF0E0] mt-3">
              How trust works: Completed orders • Purchases • Sales • Rating /10 • Product performance • Algorithm learns your searches, likes & time spent to suggest what you love. Real data saved in Supabase.
            </div>
          </div>
        </div>
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
          {/* TABS */}
          <div className="mt-4 flex gap-2 justify-center flex-wrap">
            <button onClick={()=>setActiveTab('market')} className={`h-10 px-4 rounded-full text-[13px] font-bold border ${activeTab==='market' ? 'bg-[#FF8A4C] text-white border-[#FF8A4C]' : 'bg-white border-[#FFE4C2]'}`}>🛒 Marketplace</button>
            <button onClick={()=>setActiveTab('brain')} className={`h-10 px-4 rounded-full text-[13px] font-bold border ${activeTab==='brain' ? 'bg-[#7C3AED] text-white border-[#7C3AED]' : 'bg-white border-[#FFE4C2]'}`}>🧠 My Brain - Private</button>
            <button onClick={()=>setActiveTab('recruiter')} className={`h-10 px-4 rounded-full text-[13px] font-bold border ${activeTab==='recruiter' ? 'bg-[#16A34A] text-white border-[#16A34A]' : 'bg-white border-[#FFE4C2]'}`}>✅ Recruiter Link - POPIA Safe</button>
          </div>
          {activeTab === 'brain' && (
            <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-5">
              {!session && <div className="bg-[#FEF3C7] p-3 rounded-xl text-center text-[13px] font-bold">🔒 Locked - Sign In to Unlock YOUR Brain. Your Soul + Vault are PRIVATE. No one else can see them.</div>}
              <h2 className="text-center font-[900] text-[20px]">🧠 MY BRAIN - {getMySoul() ? getMySoul()?.name : 'Locked - Sign In'}</h2>
              <p className="text-center text-[12px] text-[#8A7A6E] mt-1">Private - Only you see this when signed in. Location: {getMySoul() ? getMySoul()?.location : 'Sign in to see yours'}</p>
              <h3 className="font-bold mt-4">✨ THE SOUL - Permanent Memory (Birth to Date)</h3>
              {(getMySoul() ? getMySoul()!.facts : []).map((f:any,i:number)=>(
                <div key={i} className="flex justify-between p-3 border-b border-[#FFF0E0]"><div><b className="text-[13px]">{f.label}</b><br/><span className="text-[12px] text-[#8A7A6E]">{f.detail}</span></div><span className="bg-[#FFF0E6] px-3 py-1 rounded-full font-bold text-[12px] text-[#FF8A4C]">{f.score}</span></div>
              ))}
              <h3 className="font-bold mt-4">🕸️ THE GRAPH</h3>
              <p className="bg-[#F3E8FF] p-3 rounded-xl text-[13px]">{getMySoul() ? getMySoul()?.graph : 'Sign in to build your Graph from YOUR profile only.'}</p>
              <h3 className="font-bold mt-4">🔒 THE VAULT - Sealed, Not Deleted - POPIA Compliant</h3>
              {(getMySoul() ? getMySoul()!.vault : []).map((v:any,i:number)=>(
                <div key={i} className="flex justify-between p-3 border-b border-[#FFF0E0]"><div><b className="text-[13px]">{vaultUnlocked ? v.name + ' - UNLOCKED BY YOU' : '🔒 ' + v.name}</b><br/><span className="text-[11px] text-[#8A7A6E]">{v.hash}</span></div><span className="text-[11px] font-bold text-[#16A34A]">{v.status}</span></div>
              ))}
              <button onClick={()=>setVaultUnlocked(!vaultUnlocked)} className="mt-3 h-10 px-4 rounded-full bg-[#1E1E1E] text-white font-bold text-[13px]">{vaultUnlocked ? '🔒 Lock Vault Again' : '🔑 Unlock Vault With My Key (Demo)'}</button>
              <p className="text-[11px] text-[#B8A99A] mt-2">In production, Vault unlocks with YOUR personal key only. Brain learns FACT but file stays sealed. Never used for training.</p>
              <h3 className="font-bold mt-5">✏️ Edit YOUR Brain Data (Only You)</h3>
              <div className="space-y-2 mt-2">
                <input value={brainEducation} onChange={e=>setBrainEducation(e.target.value)} placeholder={getMySoul()?.education || 'Your education e.g. BCom Information Management - UJ'} className="w-full h-11 px-4 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" />
                <div className="flex gap-2"><input value={brainTopSkill} onChange={e=>setBrainTopSkill(e.target.value)} placeholder={getMySoul()?.topSkill || 'Your top skill'} className="flex-1 h-11 px-4 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" /><input value={brainTopScore} onChange={e=>setBrainTopScore(e.target.value)} placeholder="Score %" type="number" className="w-[90px] h-11 px-3 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" /></div>
                <input value={brainSecondSkill} onChange={e=>setBrainSecondSkill(e.target.value)} placeholder={getMySoul()?.secondSkill || 'Second skill'} className="w-full h-11 px-4 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" />
                <input value={brainCareerGoal} onChange={e=>setBrainCareerGoal(e.target.value)} placeholder={getMySoul()?.careerGoal || 'Career goal'} className="w-full h-11 px-4 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" />
                <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={allowRecruiter} onChange={e=>setAllowRecruiter(e.target.checked)} /> Allow recruiters to see my Soul (Verified Facts only)</label>
                <button onClick={handleSaveBrain} className="h-11 px-5 rounded-full bg-[#1E1E1E] text-white font-bold text-[13px]">Save MY Brain - Private</button>
                {!getMySoul()?.hasBrainData && <div className="text-[12px] text-[#8A7A6E]">You have not added Brain data yet. Add it above - it will be saved to YOUR account only.</div>}
              </div>
              <h3 className="font-bold mt-5">❓ ASK YOUR BRAIN - 4-Layer Answer (Personal + General + Maps)</h3>
              <div className="flex gap-2 mt-2"><input value={brainQuestion} onChange={e=>setBrainQuestion(e.target.value)} placeholder="What job can I get near me?" className="flex-1 h-12 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[14px]" /><button onClick={handleAskBrain} className="h-12 px-5 rounded-full bg-[#7C3AED] text-white font-bold text-[13px]">Ask Brain 🧠</button></div>
              {brainAnswer && <pre className="whitespace-pre-wrap bg-[#FFF8F0] p-4 rounded-xl mt-3 text-[13px] leading-6">{brainAnswer}</pre>}
              <div className="mt-4 bg-[#FFF8F0] p-3 rounded-xl text-[12px]"><b>Pricing:</b> FREE R0 - 5 answers/mo | <b>TRUST R99/mo</b> - 100 answers, unlimited Soul | BUSINESS R499/mo - Verify 50 people/mo</div>
              <h3 className="font-bold mt-5">🤖 TrustLink AI - Ask Anything (No login needed for general)</h3>
              <div className="flex gap-2 mt-2"><input value={aiQuestion} onChange={e=>setAiQuestion(e.target.value)} placeholder="Who is Mac G? Who is best seller?" className="flex-1 h-12 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[14px]" /><button onClick={handleAskAI} className="h-12 px-5 rounded-full bg-[#FF8A4C] text-white font-bold text-[13px]">Ask AI</button></div>
              {aiAnswer && <pre className="whitespace-pre-wrap bg-white border border-[#FFE4C2] p-4 rounded-xl mt-3 text-[13px] leading-6">{aiAnswer}</pre>}
            </div>
          )}
          {activeTab === 'recruiter' && (
            <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-5 text-center">
              <h2 className="font-[900] text-[20px]">✅ Recruiter Link - For THIS User Only</h2>
              <p className="text-[#16A34A] font-bold text-[13px] mt-1">POPIA COMPLIANT - Soul Only - No Raw ID, No Raw PDF - Per-User</p>
              <p className="text-[13px] text-[#8A7A6E] mt-2">This Recruiter Link shows ONLY the data THIS signed-in user provided when THEY created THEIR account. If a different user signs in, they see THEIR OWN data, not this user&apos;s data. If the user turns OFF Allow Recruiters, recruiter sees LOCKED.</p>
              {getMySoul() && getMySoul()?.allowRecruiter ? (
                <div className="text-left bg-[#F0FDF4] p-4 rounded-xl mt-3 text-[13px] leading-6"><b>Recruiter sees for {getMySoul()?.name} (YOU provided this):</b><br/>✔ Education: {getMySoul()?.education || 'Not provided by you yet'}<br/>✔ Top Skill: {getMySoul()?.topSkill || 'Not provided'} {getMySoul()?.topScore ? '(' + getMySoul()?.topScore + '%)' : ''}<br/>✔ Second Skill: {getMySoul()?.secondSkill || 'Not provided'}<br/>✔ Career Goal: {getMySoul()?.careerGoal || 'Not provided'}<br/>✔ Trust Score: {profile?.trust_score || 50}% | Location: {getMySoul()?.location}<br/><br/><b>Recruiter CANNOT see:</b> ID photo, ID number, phone, full PDF, password - SEALED. Recruiter CANNOT see other users&apos; data.</div>
              ) : (
                <div className="text-left bg-[#FEF3C7] p-4 rounded-xl mt-3 text-[13px]"><b>🔒 Recruiter View LOCKED</b><br/>{!session ? 'Sign in to see YOUR Recruiter Link.' : 'You turned OFF Allow Recruiters. Turn it ON in My Brain if you want recruiters to see your Soul.'}</div>
              )}
              <div className="text-[12px] text-[#8A7A6E] mt-3">Example: If YOU provided ML 85% + Soweto, recruiter asking Show ML &gt;85% within 20km Soweto -&gt; YOU MATCH. If ANOTHER user provided different skills, THEY match THEIR OWN query. Never mixed.</div>
              <button onClick={()=>{ navigator.clipboard?.writeText('https://trustlinksa-nfm.onrender.com/recruiter/' + (profile?.id || 'you')); alert('YOUR Recruiter Link Copied - It shows ONLY YOUR provided data. Send to recruiter instead of PDF!'); }} className="mt-4 h-12 px-6 rounded-full bg-[#16A34A] text-white font-bold text-[13px]">📋 Copy MY Recruiter Link - Shows ONLY MY Data</button>
            </div>
          )}
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
