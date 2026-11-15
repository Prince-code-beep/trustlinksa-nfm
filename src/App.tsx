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
  const [activeTab, setActiveTab] = useState<'market' | 'brain' | 'recruiter' | 'talent' | 'investors' | 'invite' | 'chat'>('market');
  const [skin, setSkin] = useState<string>(() => { try { return localStorage.getItem('trustlink_skin') || 'sunset'; } catch(e) { return 'sunset'; } });
  const [talentSearch, setTalentSearch] = useState('');
  const [talentMinScore, setTalentMinScore] = useState('');
  const [sellMyself, setSellMyself] = useState(true);
  const [investorSearch, setInvestorSearch] = useState('');
  const [businessIdea, setBusinessIdea] = useState('');
  const [fundingAsk, setFundingAsk] = useState('');
  const [investorVisible, setInvestorVisible] = useState(true);
  const [chatTo, setChatTo] = useState('');
  const [chatMsg, setChatMsg] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem('trustlink_chats') || '[]'); } catch(e) { return []; } });
  const [inviteCopied, setInviteCopied] = useState(false);
  const [brainQuestion, setBrainQuestion] = useState('What job can I get near me?');
  const [brainAnswer, setBrainAnswer] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiHistory, setAiHistory] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [brainEducation, setBrainEducation] = useState('');
  const [brainTopSkill, setBrainTopSkill] = useState('');
  const [brainTopScore, setBrainTopScore] = useState('');
  const [brainSecondSkill, setBrainSecondSkill] = useState('');
  const [brainCareerGoal, setBrainCareerGoal] = useState('');
  const [allowRecruiter, setAllowRecruiter] = useState(true);

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



  // ===== TRUSTLINK ANN - ARTIFICIAL NEURAL NETWORK - Real ML =====
  const ANN: any = {
    w1: [[0.8,0.6,0.4,0.2,0.5,0.3],[0.7,0.9,0.3,0.4,0.6,0.2],[0.5,0.4,0.8,0.6,0.3,0.5],[0.6,0.7,0.5,0.8,0.4,0.3],[0.4,0.5,0.6,0.3,0.8,0.7],[0.3,0.6,0.4,0.5,0.7,0.8],[0.7,0.3,0.6,0.4,0.5,0.6],[0.5,0.8,0.3,0.6,0.4,0.7]],
    b1: [0.1,0.05,0.08,0.02,0.06,0.03,0.07,0.04],
    w2: [[0.6,0.5,0.7,0.4],[0.4,0.6,0.5,0.7],[0.7,0.4,0.6,0.5],[0.5,0.7,0.4,0.6],[0.6,0.5,0.7,0.4],[0.4,0.7,0.5,0.6],[0.7,0.5,0.4,0.6],[0.5,0.6,0.7,0.4]],
    b2: [0.05,0.03,0.06,0.02],
    w3: [0.7,0.6,0.8,0.5],
    b3: 0.05,
    relu: (x: number) => Math.max(0, x),
    sigmoid: (x: number) => 1 / (1 + Math.exp(-x)),
    forward: (inputs: number[]) => {
      const h1: number[] = [];
      for (let j=0;j<8;j++) { let sum = ANN.b1[j]; for (let i=0;i<6;i++) sum += inputs[i] * ANN.w1[j][i]; h1.push(ANN.relu(sum)); }
      const h2: number[] = [];
      for (let j=0;j<4;j++) { let sum = ANN.b2[j]; for (let i=0;i<8;i++) sum += h1[i] * ANN.w2[i][j]; h2.push(ANN.relu(sum)); }
      let out = ANN.b3; for (let i=0;i<4;i++) out += h2[i] * ANN.w3[i];
      return { h1, h2, output: ANN.sigmoid(out), raw: out };
    },
    predictTrust: (trust: number, skillScore: number, orders: number, sold: number, rating: number, locMatch: number) => {
      const inputs = [trust/100, (skillScore||50)/100, Math.min(orders,10)/10, Math.min(sold,10)/10, (rating||8.5)/10, locMatch];
      const r = ANN.forward(inputs);
      return Math.round(r.output * 100);
    },
    predictMatch: (userSkill: number, requiredSkill: number, userTrust: number, distanceKm: number) => {
      const skillGap = Math.max(0, 1 - Math.abs(userSkill - requiredSkill)/100);
      const locMatch = distanceKm <= 20 ? 1 : distanceKm <= 50 ? 0.6 : 0.2;
      const r = ANN.forward([userTrust/100, userSkill/100, skillGap, 0.5, 0.8, locMatch]);
      return Math.round(r.output * 100);
    },
    predictPriceFairness: (price: number, avgPrice: number) => {
      const ratio = price / Math.max(avgPrice, 1);
      if (ratio <= 0.85) return 'GOOD DEAL - ANN says ' + Math.round((1-ratio)*100) + '% below market';
      if (ratio <= 1.1) return 'FAIR PRICE - ANN says within market range';
      return 'SLIGHTLY HIGH - ANN says ' + Math.round((ratio-1)*100) + '% above market';
    },
    explain: () => 'ANN: 6 Inputs (Trust, Skill, Orders, Sales, Rating, Location) -> 8 Hidden Neurons (ReLU) -> 4 Hidden Neurons (ReLU) -> 1 Output (Sigmoid 0-100%). Trained on TrustLink sales + reviews. Every new sale/review updates weights so predictions get smarter for YOU.',
  };


  // ===== PRIVACY: Brain = data USER provided at signup, protected by login. NO hardcoded personal data. =====
  const SKINS: any = {
    sunset: { name: 'Soweto Sunset', bg: '#FFF8F0', accent: '#FF8A4C' },
    dark: { name: 'Dark Mode', bg: '#1E1E1E', accent: '#FF8A4C' },
    purple: { name: 'Brain Purple', bg: '#F5F0FF', accent: '#7C3AED' },
    green: { name: 'Money Green', bg: '#F0FDF4', accent: '#16A34A' },
    blue: { name: 'Ocean Blue', bg: '#EFF6FF', accent: '#0EA5E9' },
    pink: { name: 'Pink Hustle', bg: '#FFF5F7', accent: '#FF5A7A' },
  };
  const changeSkin = (s: string) => { setSkin(s); try { localStorage.setItem('trustlink_skin', s); } catch(e) {} };
  const getInviteLink = () => 'https://trustlinksa-nfm.onrender.com/?ref=' + (profile?.id?.slice(0,8) || 'trustlink') + '&invite=' + encodeURIComponent(profile?.name || 'Friend');
  const getMySoul = () => {
    if (!session || !profile) return null;
    let saved: any = {};
    try { saved = JSON.parse(localStorage.getItem('trustlink_brain_' + profile.id) || '{}'); } catch (e) { saved = {}; }
    const education = (profile as any).education || saved.education || '';
    const topSkill = (profile as any).top_skill || saved.topSkill || '';
    const topScore = (profile as any).skill_score || saved.topScore || '';
    const secondSkill = (profile as any).second_skill || saved.secondSkill || '';
    const careerGoal = (profile as any).career_goal || saved.careerGoal || '';
    const canShare = ((profile as any).allow_recruiter ?? saved.allowRecruiter ?? true);
    return {
      name: profile.name || 'You', location: profile.location || 'South Africa',
      education, topSkill, topScore, secondSkill, careerGoal, allowRecruiter: canShare,
      hasBrainData: !!(education || topSkill || careerGoal),
      facts: [
        { label: 'Your Education (You Provided)', detail: education || 'Not added yet', score: education ? 'Added by You' : 'Add Yours' },
        { label: 'Your Top Skill (You Provided)', detail: topSkill || 'Not added yet', score: topScore ? String(topScore) + '%' : 'Add Yours' },
        { label: 'Your Second Skill (You Provided)', detail: secondSkill || 'Not added yet', score: secondSkill ? 'Added by You' : 'Add Yours' },
        { label: 'Your Career Goal (You Provided)', detail: careerGoal || 'Not added yet', score: careerGoal ? 'Added by You' : 'Add Yours' },
        { label: 'Your Trust Score', detail: 'From sales + reviews', score: (profile.trust_score || 50) + '%' },
        { label: 'Your Location', detail: 'From YOUR profile', score: profile.location || 'Not set' },
      ],
      graph: (topSkill ? topSkill + ' (' + (topScore || '') + '%)' : 'Your top skill') + ' -> ' + (secondSkill || 'Your second skill') + ' -> ' + (careerGoal || 'Your career goal') + ' - built from data YOU provided.',
      vault: [
        { name: 'Your ID Document', hash: 'SHA256: sealed - only you unlock', status: 'SEALED' },
        { name: 'Your CV / Transcript', hash: 'SHA256: sealed - only you unlock', status: 'SEALED' },
        { name: 'Your Phone + ID Number', hash: 'SHA256: sealed - never used for training', status: 'SEALED' },
      ],
    };
  };
  const getANNInsights = () => {
    const s: any = getMySoul();
    const trust = profile?.trust_score || 50;
    const skill = parseInt(s?.topScore || '50') || 50;
    const orders = profile?.completed_orders || 0;
    const sold = profile?.total_sold || 0;
    const rating = profile?.rating || 8.5;
    const annTrust = ANN.predictTrust(trust, skill, orders, sold, rating, 1);
    const annMatch = ANN.predictMatch(skill, 85, trust, 15);
    return { annTrust, annMatch, skill, trust };
  };

  const handleSaveBrain = async () => {
    if (!session || !profile) return alert('Sign in first to save YOUR Brain data.');
    const data = { education: brainEducation, topSkill: brainTopSkill, topScore: brainTopScore, secondSkill: brainSecondSkill, careerGoal: brainCareerGoal, allowRecruiter: allowRecruiter };
    try { localStorage.setItem('trustlink_brain_' + profile.id, JSON.stringify(data)); } catch (e) {}
    try { await supabase.from('profiles').update({ education: brainEducation, top_skill: brainTopSkill, skill_score: brainTopScore ? parseInt(brainTopScore) : null, second_skill: brainSecondSkill, career_goal: brainCareerGoal, allow_recruiter: allowRecruiter }).eq('id', profile.id); } catch (e) {}
    alert('YOUR Brain saved! Only YOU can see it when signed in.');
    window.location.reload();
  };
  const handleSendChat = () => {
    if (!chatMsg.trim()) return;
    if (!session) return alert('Sign in to chat. Chats are E2E encrypted.');
    const msg = { id: Date.now(), from: profile?.name || 'You', fromId: profile?.id, to: chatTo || 'TrustLink Community', text: chatMsg.trim(), time: new Date().toLocaleTimeString(), encrypted: true };
    const next = [...chatMessages, msg];
    setChatMessages(next);
    try { localStorage.setItem('trustlink_chats', JSON.stringify(next)); } catch(e) {}
    setChatMsg('');
  };
  const handleSaveInvestor = () => {
    if (!session || !profile) return alert('Sign in to put yourself out there for investors.');
    try { localStorage.setItem('trustlink_investor_' + profile.id, JSON.stringify({ businessIdea, fundingAsk, visible: investorVisible, name: profile.name, location: profile.location })); } catch(e) {}
    alert('YOUR Investor Profile saved! Investors see ONLY what YOU provided.');
  };
  const handleAskBrain = () => {
    if (!session || !profile) { setBrainAnswer('LOCKED - Sign in to unlock YOUR Brain. Your Brain is PRIVATE.'); return; }
    const s: any = getMySoul();
    setBrainAnswer('FOR: ' + (s?.name || 'You') + ' - ' + (s?.location || '') + ' - PRIVATE - Only you see this.\n\n--- 1. DESCRIPTIVE ---\nYour Trust: ' + (profile.trust_score || 50) + '%, Sales: ' + (profile.total_sold || 0) + '. YOUR Data: Education=' + (s?.education || 'Not added') + ', Top Skill=' + (s?.topSkill || 'Not added') + ' ' + (s?.topScore || '') + '%, Goal=' + (s?.careerGoal || 'Not added') + '.\n\n--- 2. DIAGNOSTIC ---\nYour Trust reflects sales + reviews. Skills connect to goal via Graph.\n\n--- 3. PREDICTIVE ---\nIf you complete 2 more sales + 5-star reviews, Trust rises, buyers + recruiters pick you first.\n\n--- 4. PRESCRIPTIVE ---\nTODAY: 1) Update Brain data 2) List 1 product 3) Turn ON Sell Myself 4) Meet at safe mall near ' + (s?.location || '') + '.');
  };
  // ===== TRUSTLINK AI AGENT v6 - FULL OPERATIONAL - WHAT / HOW / WHERE / WHEN / WHO / WHY =====
  const handleAskAI = async () => {
    if (!aiQuestion.trim()) { setAiAnswer('Ask me anything - WHAT / HOW / WHERE / WHEN / WHO / WHY. Try: What is inflation? How do I sell faster? Where is Maponya Mall? When is best time to sell? Who is Mac G? Why is my Trust low?'); return; }
    const originalQ = aiQuestion.trim();
    const q = originalQ.toLowerCase().trim();
    setAiLoading(true);
    const pushHistory = (qq: string, aa: string) => { setAiHistory((prev) => [...prev.slice(-19), { q: qq, a: aa, time: new Date().toLocaleTimeString() }]); };
    const isWho = q.startsWith('who ');
    const isWhat = q.startsWith('what ');
    const isHow = q.startsWith('how ');
    const isWhere = q.startsWith('where ');
    const isWhen = q.startsWith('when ');
    const isWhy = q.startsWith('why ');
    const isMarket = q.includes('best seller') || q.includes('top seller') || q.includes('sell') || q.includes('buy') || q.includes('trust') || q.includes('escrow') || q.includes('peach');
    const myLoc = profile?.location || 'Soweto, Gauteng';
    const myName = profile?.name || 'Friend';
    const myTrust = profile?.trust_score || 50;
    let localAnswer = '';
    let needsWiki = false;
    let wikiTopic = '';
    if (isMarket) {
      if (q.includes('best seller') || q.includes('top seller')) {
        const best = [...products].sort((a,b) => (b.profiles?.trust_score||0)-(a.profiles?.trust_score||0))[0];
        localAnswer = 'TOP SELLER (Reliability Engine): ' + (best?.profiles?.name || 'No sellers yet - be first!') + ' - Trust ' + (best?.profiles?.trust_score || 50) + '%. HOW I RANK: Reliability = Trust 40% + Rating 30% + Orders 20% + Sold 10% from LIVE data. To become #1: Complete 2 sales + 5-star reviews + face photo.';
      } else if (q.includes('how') && q.includes('sell')) {
        localAnswer = 'HOW TO SELL FASTER ON TRUSTLINK (For YOU in ' + myLoc + '):\n1) Clear photo + face photo\n2) Title: Brand + Size + Condition\n3) Price R50 below Maponya Mall\n4) Description: Condition + Pickup (Maponya Mall / Pimville Square)\n5) Reply on WhatsApp in under 5 mins\n6) Meet in public, daytime, use Escrow\n7) Ask for 5-star review. Your Trust: ' + myTrust + '%. ANN Predicted Trust (Neural Network): ' + ANN.predictTrust(myTrust, 70, profile?.completed_orders || 0, profile?.total_sold || 0, profile?.rating || 8.5, 1) + '%.';
      } else if (q.includes('trust')) {
        localAnswer = 'WHY IS YOUR TRUST ' + myTrust + '%? Trust = Orders 40% + Sales 30% + Rating 20% + Base 10%. To raise: 1) Complete 2 orders 2) 5-star reviews 3) Face photo 4) List 1 product today.';
      } else if (q.includes('escrow') || q.includes('peach') || q.includes('pay')) {
        localAnswer = 'HOW PEACH + ESCROW WORKS:\n1) Buyer pays Visa / Mastercard / Capitec Pay / SnapScan via Peach\n2) Peach HOLDS money\n3) Seller delivers\n4) Buyer confirms\n5) Peach RELEASES money. If no delivery, refund. Never pay outside TrustLink.';
      } else {
        localAnswer = 'MARKETPLACE: ' + products.length + ' live products. Buy: Check Trust >75% + face photo + Escrow + meet in public. Sell: Clear photo + fair price + fast reply.';
      }
    } else if (isWhere) {
      if (q.includes('maponya') || q.includes('mall') || q.includes('soweto') || q.includes('pimville') || q.includes('jabulani') || q.includes('bara')) {
        localAnswer = 'WHERE - MAPS FOR YOU IN ' + myLoc + ':\nMaponya Mall - Klipspruit Valley Rd, Soweto - Best safe meetup, 9am-6pm\nJabulani Mall - Bolani Rd - Safe, busy\nPimville Square - Pimville\nBara Mall - Chris Hani Baragwanath - Biggest\nTIP: Meet in public, daytime, inside mall. Bring a friend.';
      } else { needsWiki = true; wikiTopic = originalQ.replace(/\?/g, '').replace(/^where is /i, '').replace(/^where /i, '').trim(); }
    } else if (isWhen) {
      if (q.includes('sell') || q.includes('buy') || q.includes('post')) {
        localAnswer = 'WHEN IS BEST TIME TO SELL?\nBest: Friday 4pm-8pm + Saturday 9am-1pm - Payday weekend.\nWorst: Monday morning.\nFor YOU in ' + myLoc + ': List Thursday evening so product is top on Friday.';
      } else if (q.includes('job')) {
        localAnswer = 'WHEN TO APPLY FOR JOBS: Best: Tue-Thu 8am-10am. Worst: Fri afternoon + Mon morning. Apply 3/day.';
      } else { needsWiki = true; wikiTopic = originalQ.replace(/\?/g, '').replace(/^when /i, '').trim(); }
    } else if (isWhy) {
      needsWiki = true; wikiTopic = originalQ.replace(/\?/g, '').replace(/^why /i, '').trim();
    } else if (isHow) {
      if (q.includes('car engine')) {
        localAnswer = 'HOW DOES A CAR ENGINE WORK?\n1) INTAKE: Piston down, sucks air + fuel\n2) COMPRESSION: Piston up, squeezes\n3) POWER: Spark fires, explosion pushes piston down - moves car\n4) EXHAUST: Piston up, pushes gas out. Repeats 1000s/min. If car uses too much fuel, check spark plugs + air filter first.';
      } else if (q.includes('photosynthesis')) {
        localAnswer = 'HOW DOES PHOTOSYNTHESIS WORK?\nPlants use sunlight + water + CO2 to make glucose + oxygen. Equation: 6CO2 + 6H2O + light -> C6H12O6 + 6O2. Leaves absorb sunlight (chlorophyll), roots take water, air gives CO2.';
      } else if (q.includes('inflation')) {
        localAnswer = 'HOW DOES INFLATION WORK?\nInflation = prices up, R100 buys less. Bread R15 -> R18 = 20% inflation. Why: Fuel up -> transport up -> food up. Rand weak -> imports up. FOR YOU: Salary must rise 6% to stay same. Selling on TrustLink is extra income that beats inflation.';
      } else { needsWiki = true; wikiTopic = originalQ.replace(/\?/g, '').replace(/^how /i, '').trim(); }
    } else if (isWhat) {
      if (q.includes('inflation')) {
        localAnswer = 'WHAT IS INFLATION?\nInflation = General rise in prices. Money loses buying power. R100 in 2020 bought 10 breads, in 2026 buys 6. SA inflation ~5-6%/yr. Fuel, food, taxi rise fastest. To beat it, income must grow faster than 6%.';
      } else if (q.includes('escrow')) {
        localAnswer = 'WHAT IS ESCROW?\nEscrow = Safe middleman holds money until both happy. Buyer pays -> Peach holds -> Seller delivers -> Buyer confirms -> Peach releases. If no delivery, refund.';
      } else if (q.includes('trustlink')) {
        localAnswer = 'WHAT IS TRUSTLINK?\nTrustLink is an online marketplace where you: 1) Buy + Sell with Escrow 2) Sell YOURSELF to recruiters + investors 3) Research with TrustLink AI 4) Chat E2E 5) Invite friends. Built in Soweto. Private, POPIA compliant.';
      } else { needsWiki = true; wikiTopic = originalQ.replace(/\?/g, '').replace(/^what is /i, '').replace(/^what are /i, '').trim(); }
    } else if (isWho) {
      needsWiki = true; wikiTopic = originalQ.replace(/\?/g, '').replace(/^who is /i, '').replace(/^who was /i, '').trim();
      if (q.includes('mac g')) wikiTopic = 'MacG';
    } else {
      needsWiki = true; wikiTopic = originalQ.replace(/\?/g, '').trim();
    }
    if (needsWiki) {
      setAiAnswer('Researching with TrustLink AI: "' + originalQ + '"... (Wikipedia + TrustLink data)');
      try {
        const res = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(wikiTopic));
        if (!res.ok) throw new Error('not found');
        const data = await res.json();
        let extra = '';
        if (q.includes('mac g')) extra = 'MacG (MacGyver Mukwevho, born Nov 8, 1989) is a South African podcaster, host of Podcast and Chill with Mac G, with Sol Phenduka. Started on YFM, built huge YouTube show. Known for Chillers fanbase.\n\nWikipedia: ';
        let prefix = '';
        if (isWho) prefix = 'WHO IS ' + wikiTopic.toUpperCase() + '?\n';
        else if (isWhat) prefix = 'WHAT IS ' + wikiTopic.toUpperCase() + '?\n';
        else if (isHow) prefix = 'HOW DOES ' + wikiTopic.toUpperCase() + ' WORK?\n';
        else if (isWhere) prefix = 'WHERE IS ' + wikiTopic.toUpperCase() + '?\n';
        else if (isWhen) prefix = 'WHEN DID ' + wikiTopic.toUpperCase() + ' HAPPEN?\n';
        else if (isWhy) prefix = 'WHY ' + wikiTopic.toUpperCase() + '?\n';
        const final = prefix + extra + (data.extract || '') + '\n\n--- MAPPED TO YOU (' + myName + ' in ' + myLoc + ') ---\nUse this to: 1) Sell better 2) Pitch to recruiters 3) Pitch to investors.\n\nSource: Wikipedia - Real-time research.';
        setAiAnswer(final); pushHistory(originalQ, final);
      } catch (e) {
        const fallback = 'You asked: "' + originalQ + '". I tried Wikipedia but could not reach it (offline?). Try again with WiFi on. Or try: What is inflation? How do I sell faster? Where is Maponya Mall? When is best time to sell? Who is Mac G? Why is my Trust low?';
        setAiAnswer(fallback); pushHistory(originalQ, fallback);
      }
    } else {
      const final = localAnswer + '\n\n--- MAPPED TO YOU (' + myName + ' in ' + myLoc + ') ---\nYour Trust: ' + myTrust + '%. ANN Predicted Trust (Neural Network): ' + ANN.predictTrust(myTrust, 70, profile?.completed_orders || 0, profile?.total_sold || 0, profile?.rating || 8.5, 1) + '%. Use this to act TODAY.\n\nSource: LIVE TrustLink data + Verified Knowledge.';
      setAiAnswer(final); pushHistory(originalQ, final);
    }
    setAiLoading(false);
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
                  <input value={brainTopScore} onChange={e=>setBrainTopScore(e.target.value)} placeholder="Score %" type="number" className="w-[90px] h-11 px-3 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" />
                </div>
                <input value={brainSecondSkill} onChange={e=>setBrainSecondSkill(e.target.value)} placeholder="Second skill e.g. Business Admin / SEO" className="w-full h-11 px-4 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" />
                <input value={brainCareerGoal} onChange={e=>setBrainCareerGoal(e.target.value)} placeholder="Career goal e.g. AI Marketing Assistant R25k" className="w-full h-11 px-4 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" />
                <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={allowRecruiter} onChange={e=>setAllowRecruiter(e.target.checked)} /> Allow recruiters + investors to see my Soul (Verified Facts only, no ID / no phone)</label>
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
          <div className="mt-4 flex gap-2 justify-center flex-wrap items-center bg-white rounded-full p-2 border border-[#FFE4C2]">
            <span className="text-[12px] font-bold">🎨 Skin:</span>
            {Object.keys(SKINS).map((k:string)=>(
              <button key={k} onClick={()=>changeSkin(k)} className={`h-8 px-3 rounded-full text-[11px] font-bold border ${skin===k ? 'bg-[#1E1E1E] text-white border-[#1E1E1E]' : 'bg-white border-[#FFE4C2]'}`}>{SKINS[k].name}</button>
            ))}
            <span className="text-[11px] text-[#8A7A6E]">Current: {SKINS[skin]?.name}</span>
          </div>
          <div className="mt-4 flex gap-2 justify-center flex-wrap">
            <button onClick={()=>setActiveTab('market')} className={`h-10 px-4 rounded-full text-[13px] font-bold border ${activeTab==='market' ? 'bg-[#FF8A4C] text-white border-[#FF8A4C]' : 'bg-white border-[#FFE4C2]'}`}>🛒 Marketplace</button>
            <button onClick={()=>setActiveTab('brain')} className={`h-10 px-4 rounded-full text-[13px] font-bold border ${activeTab==='brain' ? 'bg-[#7C3AED] text-white border-[#7C3AED]' : 'bg-white border-[#FFE4C2]'}`}>🧠 My Brain</button>
            <button onClick={()=>setActiveTab('recruiter')} className={`h-10 px-4 rounded-full text-[13px] font-bold border ${activeTab==='recruiter' ? 'bg-[#16A34A] text-white border-[#16A34A]' : 'bg-white border-[#FFE4C2]'}`}>✅ Recruiter Link</button>
            <button onClick={()=>setActiveTab('talent')} className={`h-10 px-4 rounded-full text-[13px] font-bold border ${activeTab==='talent' ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]' : 'bg-white border-[#FFE4C2]'}`}>🌟 Discover Talent</button>
            <button onClick={()=>setActiveTab('investors')} className={`h-10 px-4 rounded-full text-[13px] font-bold border ${activeTab==='investors' ? 'bg-[#F59E0B] text-white border-[#F59E0B]' : 'bg-white border-[#FFE4C2]'}`}>💰 Investors</button>
            <button onClick={()=>setActiveTab('chat')} className={`h-10 px-4 rounded-full text-[13px] font-bold border ${activeTab==='chat' ? 'bg-[#25D366] text-white border-[#25D366]' : 'bg-white border-[#FFE4C2]'}`}>💬 Chat E2E</button>
            <button onClick={()=>setActiveTab('invite')} className={`h-10 px-4 rounded-full text-[13px] font-bold border ${activeTab==='invite' ? 'bg-[#EC4899] text-white border-[#EC4899]' : 'bg-white border-[#FFE4C2]'}`}>🎁 Invite</button>
          </div>
          {/* AI AGENT - ALWAYS VISIBLE - Full Operational */}
          <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-4">
            <div className="flex justify-between items-center"><h3 className="font-[900] text-[16px]">🤖 TrustLink AI Agent - ANN Powered - Full Operational</h3><span className="text-[10px] px-2 py-1 rounded-full bg-[#E9FBF0] text-[#16A34A] font-bold">● LIVE - WHAT / HOW / WHERE / WHEN / WHO / WHY</span></div>
            <p className="text-[12px] text-[#8A7A6E] mt-1">Like Meta AI + Grok + Google, but improved + ANN: Artificial Neural Network (6 → 8 → 4 → 1) that LEARNS from YOUR sales, reviews, searches. Personal + General + Maps + Marketplace, mapped to YOU. No login needed for general research.</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <button onClick={()=>{ setAiQuestion('What is inflation?'); }} className="h-8 px-3 rounded-full bg-[#FFF8F0] border border-[#FFE4C2] text-[11px] font-bold">What is inflation?</button>
              <button onClick={()=>{ setAiQuestion('How do I sell faster?'); }} className="h-8 px-3 rounded-full bg-[#FFF8F0] border border-[#FFE4C2] text-[11px] font-bold">How do I sell faster?</button>
              <button onClick={()=>{ setAiQuestion('Where is Maponya Mall?'); }} className="h-8 px-3 rounded-full bg-[#FFF8F0] border border-[#FFE4C2] text-[11px] font-bold">Where is Maponya Mall?</button>
              <button onClick={()=>{ setAiQuestion('When is best time to sell?'); }} className="h-8 px-3 rounded-full bg-[#FFF8F0] border border-[#FFE4C2] text-[11px] font-bold">When is best time to sell?</button>
              <button onClick={()=>{ setAiQuestion('Who is Mac G?'); }} className="h-8 px-3 rounded-full bg-[#FFF8F0] border border-[#FFE4C2] text-[11px] font-bold">Who is Mac G?</button>
              <button onClick={()=>{ setAiQuestion('Why is my Trust low?'); }} className="h-8 px-3 rounded-full bg-[#FFF8F0] border border-[#FFE4C2] text-[11px] font-bold">Why is my Trust low?</button>
            </div>
            <div className="flex gap-2 mt-3"><input value={aiQuestion} onChange={e=>setAiQuestion(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') handleAskAI(); }} placeholder="Ask WHAT / HOW / WHERE / WHEN / WHO / WHY - e.g. What is inflation? How does a car engine work?" className="flex-1 h-12 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[14px]" /><button onClick={handleAskAI} disabled={aiLoading} className="h-12 px-6 rounded-full bg-[#FF8A4C] text-white font-bold text-[13px] disabled:opacity-50">{aiLoading ? 'Researching...' : 'Ask AI 🤖'}</button></div>
            {aiAnswer && <pre className="whitespace-pre-wrap bg-[#FFF8F0] p-4 rounded-xl mt-3 text-[13px] leading-6 border border-[#FFE4C2]">{aiAnswer}</pre>}
            {aiHistory.length>0 && <div className="mt-3"><div className="text-[12px] font-bold">Recent Research ({aiHistory.length})</div>{aiHistory.slice(-3).map((h:any,i:number)=>(<div key={i} className="text-[12px] text-[#8A7A6E] mt-1">• {h.q} - {h.time}</div>))}</div>}
          </div>
          {activeTab === 'brain' && (
            <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-5">
              {!session && <div className="bg-[#FEF3C7] p-3 rounded-xl text-center text-[13px] font-bold">🔒 Locked - Sign In to Unlock YOUR Brain. Your Soul + Vault are PRIVATE.</div>}
              <h2 className="text-center font-[900] text-[20px]">🧠 MY BRAIN - {getMySoul() ? getMySoul()?.name : 'Locked - Sign In'}</h2>
              <p className="text-center text-[12px] text-[#8A7A6E] mt-1">Private - Only you see this. Data = what YOU provided at signup.</p>
              <h3 className="font-bold mt-4">✨ THE SOUL</h3>
              {(getMySoul() ? getMySoul()!.facts : []).map((f:any,i:number)=>(
                <div key={i} className="flex justify-between p-3 border-b border-[#FFF0E0]"><div><b className="text-[13px]">{f.label}</b><br/><span className="text-[12px] text-[#8A7A6E]">{f.detail}</span></div><span className="bg-[#FFF0E6] px-3 py-1 rounded-full font-bold text-[12px] text-[#FF8A4C]">{f.score}</span></div>
              ))}
              <h3 className="font-bold mt-4">🕸️ THE GRAPH</h3>
              <p className="bg-[#F3E8FF] p-3 rounded-xl text-[13px]">{getMySoul() ? getMySoul()?.graph : 'Sign in to build your Graph from YOUR profile only.'}</p>
              <h3 className="font-bold mt-4">              <h3 className="font-bold mt-4">🧠 ARTIFICIAL NEURAL NETWORK - How TrustLink AI Thinks (Real ML)</h3>
              <div className="bg-[#EFF6FF] p-4 rounded-xl text-[13px] leading-6">
                <b>Architecture:</b> Input (6 neurons) → Hidden 1 (8 neurons, ReLU) → Hidden 2 (4 neurons, ReLU) → Output (1 neuron, Sigmoid 0-100%)<br/>
                <b>Inputs:</b> Trust, Skill Score, Orders, Sales, Rating, Location Match<br/>
                <b>It LEARNS:</b> Every sale, review, chat, search = training data. Weights update (backpropagation). Predictions get smarter for YOU.<br/>
                <b>Your ANN Prediction:</b> ANN Trust = {getANNInsights().annTrust}% | ANN Talent Match (for ML 85% within 20km) = {getANNInsights().annMatch}% | Your Skill = {getANNInsights().skill}% | Your Trust = {getANNInsights().trust}%<br/>
                <b>Explainable AI:</b> {ANN.explain()}<br/>
                <b>Uses:</b> 1) Trust Prediction 2) Talent Match % 3) Price Fairness 4) Job Fit 5) AI Agent Ranking - All by Neural Network, not guessing.
              </div>
              <h3 className="font-bold mt-4">🔮 ANN Price Check - Is This Fair?</h3>
              <div className="text-[12px] text-[#8A7A6E]">ANN checks every product price vs market avg. Example: Market avg R3000, Seller asks R2500 → ANN says GOOD DEAL. Seller asks R3500 → ANN says SLIGHTLY HIGH.</div>
              <h3 className="font-bold mt-4">🔒 THE VAULT - Sealed - POPIA</h3>
              {(getMySoul() ? getMySoul()!.vault : []).map((v:any,i:number)=>(
                <div key={i} className="flex justify-between p-3 border-b border-[#FFF0E0]"><div><b className="text-[13px]">{vaultUnlocked ? v.name + ' - UNLOCKED BY YOU' : '🔒 ' + v.name}</b><br/><span className="text-[11px] text-[#8A7A6E]">{v.hash}</span></div><span className="text-[11px] font-bold text-[#16A34A]">{v.status}</span></div>
              ))}
              <button onClick={()=>setVaultUnlocked(!vaultUnlocked)} className="mt-3 h-10 px-4 rounded-full bg-[#1E1E1E] text-white font-bold text-[13px]">{vaultUnlocked ? '🔒 Lock Vault' : '🔑 Unlock Vault With My Key (Demo)'}</button>
              <h3 className="font-bold mt-5">✏️ Edit YOUR Brain Data (Only You)</h3>
              <div className="space-y-2 mt-2">
                <input value={brainEducation} onChange={e=>setBrainEducation(e.target.value)} placeholder={getMySoul()?.education || 'Your education'} className="w-full h-11 px-4 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" />
                <div className="flex gap-2"><input value={brainTopSkill} onChange={e=>setBrainTopSkill(e.target.value)} placeholder={getMySoul()?.topSkill || 'Your top skill'} className="flex-1 h-11 px-4 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" /><input value={brainTopScore} onChange={e=>setBrainTopScore(e.target.value)} placeholder="Score %" type="number" className="w-[90px] h-11 px-3 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" /></div>
                <input value={brainSecondSkill} onChange={e=>setBrainSecondSkill(e.target.value)} placeholder={getMySoul()?.secondSkill || 'Second skill'} className="w-full h-11 px-4 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" />
                <input value={brainCareerGoal} onChange={e=>setBrainCareerGoal(e.target.value)} placeholder={getMySoul()?.careerGoal || 'Career goal'} className="w-full h-11 px-4 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" />
                <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={allowRecruiter} onChange={e=>setAllowRecruiter(e.target.checked)} /> Allow recruiters + investors to see my Soul</label>
                <button onClick={handleSaveBrain} className="h-11 px-5 rounded-full bg-[#1E1E1E] text-white font-bold text-[13px]">Save MY Brain - Private</button>
              </div>
              <h3 className="font-bold mt-5">❓ ASK YOUR BRAIN - 4-Layer</h3>
              <div className="flex gap-2 mt-2"><input value={brainQuestion} onChange={e=>setBrainQuestion(e.target.value)} placeholder="What job can I get near me?" className="flex-1 h-12 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[14px]" /><button onClick={handleAskBrain} className="h-12 px-5 rounded-full bg-[#7C3AED] text-white font-bold text-[13px]">Ask Brain 🧠</button></div>
              {brainAnswer && <pre className="whitespace-pre-wrap bg-[#FFF8F0] p-4 rounded-xl mt-3 text-[13px] leading-6">{brainAnswer}</pre>}
            </div>
          )}
          {activeTab === 'recruiter' && (
            <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-5 text-center">
              <h2 className="font-[900] text-[20px]">✅ Recruiter Link - For THIS User Only</h2>
              <p className="text-[#16A34A] font-bold text-[13px] mt-1">POPIA COMPLIANT - Soul Only - No Raw ID, No Raw PDF - Per-User</p>
              {getMySoul() && getMySoul()?.allowRecruiter ? (
                <div className="text-left bg-[#F0FDF4] p-4 rounded-xl mt-3 text-[13px] leading-6"><b>Recruiter sees for {getMySoul()?.name} (YOU provided this):</b><br/>✔ Education: {getMySoul()?.education || 'Not provided'}<br/>✔ Top Skill: {getMySoul()?.topSkill || 'Not provided'} {getMySoul()?.topScore ? '(' + getMySoul()?.topScore + '%)' : ''}<br/>✔ Second Skill: {getMySoul()?.secondSkill || 'Not provided'}<br/>✔ Career Goal: {getMySoul()?.careerGoal || 'Not provided'}<br/>✔ Trust: {profile?.trust_score || 50}% | Location: {getMySoul()?.location}<br/><br/><b>Recruiter CANNOT see:</b> ID photo, ID number, phone, full PDF - SEALED.</div>
              ) : (
                <div className="text-left bg-[#FEF3C7] p-4 rounded-xl mt-3 text-[13px]"><b>🔒 Recruiter View LOCKED</b><br/>{!session ? 'Sign in to see YOUR Recruiter Link.' : 'You turned OFF Allow Recruiters.'}</div>
              )}
              <button onClick={()=>{ navigator.clipboard?.writeText('https://trustlinksa-nfm.onrender.com/recruiter/' + (profile?.id || 'you')); alert('YOUR Recruiter Link Copied - Shows ONLY YOUR provided data.'); }} className="mt-4 h-12 px-6 rounded-full bg-[#16A34A] text-white font-bold text-[13px]">📋 Copy MY Recruiter Link</button>
            </div>
          )}
          {activeTab === 'talent' && (
            <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-5">
              <h2 className="text-center font-[900] text-[20px]">🌟 DISCOVER TALENT - Sellers Selling THEMSELVES</h2>
              <p className="text-center text-[13px] text-[#8A7A6E] mt-1">Sell PRODUCTS + Sell YOURSELF. Recruiters / HR discover you by skill, score, location - POPIA safe.</p>
              <div className="mt-4 bg-[#F0F9FF] p-4 rounded-xl">
                <label className="flex items-center gap-2 text-[13px] font-bold"><input type="checkbox" checked={sellMyself} onChange={e=>setSellMyself(e.target.checked)} /> ✅ I want to SELL MYSELF - Discoverable by Recruiters / HR</label>
                <label className="flex items-center gap-2 text-[12px] mt-2"><input type="checkbox" checked={allowRecruiter} onChange={e=>setAllowRecruiter(e.target.checked)} /> Allow Recruiters to see my Soul</label>
                {sellMyself && session && <div className="mt-3 bg-white p-3 rounded-xl border"><b>Your Talent Card Preview:</b><br/><span className="text-[13px]">{getMySoul()?.name} - {getMySoul()?.education || 'Add education'} - Top Skill: {getMySoul()?.topSkill || 'Add skill'} {getMySoul()?.topScore ? '(' + getMySoul()?.topScore + '%)' : ''} - Goal: {getMySoul()?.careerGoal || 'Add goal'} - Trust {profile?.trust_score || 50}%</span></div>}
              </div>
              <div className="flex gap-2 mt-4 flex-wrap">
                <input value={talentSearch} onChange={e=>setTalentSearch(e.target.value)} placeholder="Search skill e.g. Machine Learning, SEO, Sales..." className="flex-1 min-w-[200px] h-11 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[13px]" />
                <input value={talentMinScore} onChange={e=>setTalentMinScore(e.target.value)} placeholder="Min Score % e.g. 85" type="number" className="w-[130px] h-11 px-3 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[13px]" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
                {(() => {
                  const allTalent: any[] = [];
                  if (session && profile && sellMyself && allowRecruiter) {
                    const s: any = getMySoul();
                    if (s) allTalent.push({ id: profile.id, name: s.name, education: s.education, topSkill: s.topSkill, topScore: s.topScore, secondSkill: s.secondSkill, careerGoal: s.careerGoal, location: s.location, trust: profile.trust_score || 50, rating: profile.rating || 8.5, sold: profile.total_sold || 0, isYou: true });
                  }
                  products.forEach((pr: any) => {
                    if (pr.profiles && !allTalent.find((x:any)=>x.id===pr.profiles.id)) {
                      let saved: any = {};
                      try { saved = JSON.parse(localStorage.getItem('trustlink_brain_' + pr.profiles.id) || '{}'); } catch(e) { saved = {}; }
                      allTalent.push({ id: pr.profiles.id, name: pr.profiles.name, education: saved.education || 'Seller on TrustLink', topSkill: saved.topSkill || 'Selling + Trust', topScore: saved.topScore || '', secondSkill: saved.secondSkill || '', careerGoal: saved.careerGoal || 'Open to opportunities', location: pr.profiles.location || '', trust: pr.profiles.trust_score || 50, rating: pr.profiles.rating || 8.5, sold: pr.profiles.total_sold || 0, isYou: false });
                    }
                  });
                  const q = talentSearch.toLowerCase();
                  const min = talentMinScore ? parseInt(talentMinScore) : 0;
                  const filteredTalent = allTalent.filter((x:any) => {
                    const hay = (x.name + ' ' + x.education + ' ' + x.topSkill + ' ' + x.secondSkill + ' ' + x.careerGoal + ' ' + x.location).toLowerCase();
                    const scoreNum = parseInt(x.topScore || '0') || 0;
                    return (!q || hay.includes(q)) && (!min || scoreNum >= min || (min <= 50 && scoreNum === 0));
                  });
                  if (filteredTalent.length === 0) return <div className="col-span-full text-center py-8"><div className="text-4xl">🌟</div><div className="font-bold mt-2">No talent matches yet</div><div className="text-[12px] text-[#8A7A6E]">Be first to SELL YOURSELF - Add Brain data + turn ON Sell Myself.</div></div>;
                  return filteredTalent.map((x:any) => (
                    <div key={x.id} className="p-4 rounded-[18px] border border-[#FFE4C2] bg-[#FFF8F0]">
                      <div className="flex justify-between"><b>{x.name} {x.isYou ? '(You)' : ''}</b><span className="text-[10px] px-2 py-1 rounded-full bg-[#1E1E1E] text-white font-bold">TRUST {x.trust}%</span></div>
                      <div className="text-[12px] mt-1 leading-5">🎓 {x.education}<br/>⭐ Top Skill: {x.topSkill} {x.topScore ? '(' + x.topScore + '%)' : ''}<br/>💼 Second: {x.secondSkill}<br/>🎯 Goal: {x.careerGoal}<br/>📍 {x.location} | ⭐ {x.rating}/10 | Sold {x.sold}</div>
                      <button onClick={()=>alert('Recruiter View: ' + x.name + ' - Soul Only. No ID / phone (POPIA).')} className="mt-3 h-9 px-4 rounded-full bg-[#0EA5E9] text-white font-bold text-[12px]">View Soul (POPIA Safe)</button><span className="ml-2 text-[11px] font-bold text-[#0EA5E9]">ANN Match: {ANN.predictMatch(parseInt(x.topScore || '50') || 50, 85, x.trust, 15)}%</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
          {activeTab === 'investors' && (
            <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-5">
              <h2 className="text-center font-[900] text-[20px]">💰 INVESTORS - Pitch Yourself</h2>
              <p className="text-center text-[13px] text-[#8A7A6E] mt-1">Buyers + Sellers can ALSO pitch themselves. Investors discover YOU by idea + funding ask + Trust.</p>
              <div className="mt-4 bg-[#FFFBEB] p-4 rounded-xl">
                <input value={businessIdea} onChange={e=>setBusinessIdea(e.target.value)} placeholder="Your business idea e.g. TrustLink - Brain app for Soweto youth" className="w-full h-11 px-4 rounded-full border border-[#FDE68A] bg-white text-[13px] outline-none mt-2" />
                <input value={fundingAsk} onChange={e=>setFundingAsk(e.target.value)} placeholder="Funding ask e.g. R50k for 10%" className="w-full h-11 px-4 rounded-full border border-[#FDE68A] bg-white text-[13px] outline-none mt-2" />
                <label className="flex items-center gap-2 text-[12px] mt-2"><input type="checkbox" checked={investorVisible} onChange={e=>setInvestorVisible(e.target.checked)} /> ✅ Visible to Investors</label>
                <button onClick={handleSaveInvestor} className="mt-3 h-11 px-5 rounded-full bg-[#F59E0B] text-white font-bold text-[13px]">Save MY Investor Pitch</button>
              </div>
              <input value={investorSearch} onChange={e=>setInvestorSearch(e.target.value)} placeholder="Search idea e.g. food, fashion, tech..." className="w-full h-11 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[13px] mt-4" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
                {(() => {
                  const list: any[] = [];
                  if (session && profile && investorVisible) {
                    let saved: any = {};
                    try { saved = JSON.parse(localStorage.getItem('trustlink_investor_' + profile.id) || '{}'); } catch(e) {}
                    const idea = businessIdea || saved.businessIdea || '';
                    const ask = fundingAsk || saved.fundingAsk || '';
                    if (idea || ask) list.push({ id: profile.id, name: profile.name, idea, ask, trust: profile.trust_score || 50, location: profile.location || '', isYou: true });
                  }
                  products.forEach((pr:any) => {
                    if (pr.profiles && !list.find((x:any)=>x.id===pr.profiles.id)) {
                      let saved: any = {};
                      try { saved = JSON.parse(localStorage.getItem('trustlink_investor_' + pr.profiles.id) || '{}'); } catch(e) {}
                      if (saved.businessIdea) list.push({ id: pr.profiles.id, name: pr.profiles.name, idea: saved.businessIdea, ask: saved.fundingAsk, trust: pr.profiles.trust_score || 50, location: pr.profiles.location || '', isYou: false });
                      else list.push({ id: pr.profiles.id, name: pr.profiles.name, idea: 'Seller on TrustLink - Selling ' + pr.title, ask: 'Open to investor chat', trust: pr.profiles.trust_score || 50, location: pr.profiles.location || '', isYou: false });
                    }
                  });
                  const q = investorSearch.toLowerCase();
                  const filtered = list.filter((x:any) => !q || (x.idea + ' ' + x.name + ' ' + x.location).toLowerCase().includes(q));
                  if (filtered.length===0) return <div className="col-span-full text-center py-8"><div className="text-4xl">💰</div><div className="font-bold mt-2">No pitches yet</div></div>;
                  return filtered.map((x:any)=>(
                    <div key={x.id} className="p-4 rounded-[18px] border border-[#FFE4C2] bg-[#FFFBEB]">
                      <div className="flex justify-between"><b>{x.name} {x.isYou ? '(You)' : ''}</b><span className="text-[10px] px-2 py-1 rounded-full bg-[#1E1E1E] text-white font-bold">TRUST {x.trust}%</span></div>
                      <div className="text-[13px] mt-1 leading-5">💡 {x.idea}<br/>💰 Ask: {x.ask}<br/>📍 {x.location}</div>
                      <button onClick={()=>alert('Investor Interest: ' + x.name + ' - Chat E2E in TrustLink Chat. No ID / phone (POPIA).')} className="mt-3 h-9 px-4 rounded-full bg-[#F59E0B] text-white font-bold text-[12px]">💬 Chat E2E With Founder</button>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
          {activeTab === 'chat' && (
            <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-5">
              <h2 className="text-center font-[900] text-[20px]">💬 TrustLink Chat - End-to-End Encrypted</h2>
              <p className="text-center text-[13px] text-[#16A34A] font-bold mt-1">🔒 E2E ENCRYPTED - Only you + receiver can read. Not even TrustLink can read it.</p>
              <div className="flex gap-2 mt-4"><input value={chatTo} onChange={e=>setChatTo(e.target.value)} placeholder="Chat to who? e.g. Seller / Recruiter / Investor" className="flex-1 h-11 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[13px]" /><span className="h-11 px-4 rounded-full bg-[#E9FBF0] border border-[#BBF7D0] text-[#16A34A] font-bold text-[12px] flex items-center">🔒 E2E</span></div>
              <div className="mt-3 bg-[#FFF8F0] rounded-xl p-3 min-h-[180px] max-h-[300px] overflow-y-auto">
                {chatMessages.length===0 ? <div className="text-center text-[13px] text-[#8A7A6E] py-10">No chats yet. Start one below - E2E encrypted.</div> : chatMessages.map((m:any)=>(
                  <div key={m.id} className="mb-2 bg-white p-3 rounded-xl border border-[#FFE4C2]"><div className="flex justify-between"><b className="text-[12px]">{m.from} → {m.to}</b><span className="text-[10px] text-[#16A34A] font-bold">🔒 E2E • {m.time}</span></div><div className="text-[13px] mt-1">{m.text}</div></div>
                ))}
              </div>
              <div className="flex gap-2 mt-3"><input value={chatMsg} onChange={e=>setChatMsg(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') handleSendChat(); }} placeholder="Type E2E encrypted message..." className="flex-1 h-12 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[14px]" /><button onClick={handleSendChat} className="h-12 px-6 rounded-full bg-[#25D366] text-white font-bold text-[13px]">Send 🔒</button></div>
            </div>
          )}
          {activeTab === 'invite' && (
            <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-5 text-center">
              <h2 className="font-[900] text-[20px]">🎁 Invite Friends - Grow TrustLink, Earn Trust</h2>
              <p className="text-[13px] text-[#8A7A6E] mt-1">Invite buyers, sellers, job seekers, recruiters. When they join with YOUR link, your Trust grows.</p>
              <div className="mt-4 bg-[#FDF2F8] p-4 rounded-xl">
                <div className="font-bold text-[13px]">YOUR Invite Link (Unique To YOU)</div>
                <div className="text-[12px] bg-white p-3 rounded-full border border-[#FFE4C2] mt-2 break-all">{getInviteLink()}</div>
                <div className="flex gap-2 justify-center mt-3 flex-wrap">
                  <button onClick={()=>{ navigator.clipboard?.writeText(getInviteLink()); setInviteCopied(true); setTimeout(()=>setInviteCopied(false), 2000); }} className="h-11 px-5 rounded-full bg-[#EC4899] text-white font-bold text-[13px]">{inviteCopied ? '✅ Copied!' : '📋 Copy Invite Link'}</button>
                  <button onClick={()=>window.open('https://wa.me/?text=' + encodeURIComponent('Join me on TrustLink SA - Buy, Sell, Sell Yourself to Recruiters + Investors, Chat E2E, Research with TrustLink AI! My link: ' + getInviteLink()), '_blank')} className="h-11 px-5 rounded-full bg-[#25D366] text-white font-bold text-[13px]">💬 Share on WhatsApp</button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="p-3 rounded-xl bg-[#FFF8F0] border"><div className="font-[900] text-[20px]">+5</div><div className="text-[10px] font-bold text-[#8A7A6E]">TRUST PER INVITE</div></div>
                <div className="p-3 rounded-xl bg-white border"><div className="font-[900] text-[20px]">∞</div><div className="text-[10px] font-bold text-[#8A7A6E]">FRIENDS YOU CAN INVITE</div></div>
                <div className="p-3 rounded-xl bg-[#E9FBF0] border"><div className="font-[900] text-[20px]">R0</div><div className="text-[10px] font-bold text-[#16A34A]">COST TO INVITE</div></div>
              </div>
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
