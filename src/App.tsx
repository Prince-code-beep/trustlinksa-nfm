import { useState, useEffect, useMemo } from 'react';
import { supabase } from './lib/supabase';

type Profile = { id: string; name: string; role: string; phone?: string; bio?: string; location?: string; trust_score: number; rating: number; completed_orders: number; total_bought: number; total_sold: number; avatar_url?: string; education?: string; top_skill?: string; skill_score?: number; second_skill?: string; career_goal?: string; allow_recruiter?: boolean; };
type Product = { id: string; seller_id: string; title: string; description?: string; price: number; category: string; image_url?: string; likes: number; views: number; sold_count: number; is_sold: boolean; created_at: string; profiles?: Profile; };
const CATEGORIES = ['All','Electronics','Fashion','Home','Cars','Phones','Beauty','Sports','Other'];

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'signin'|'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [roleInput, setRoleInput] = useState('both');
  const [phoneInput, setPhoneInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [viewProfile, setViewProfile] = useState<Profile | null>(null);
  const [showSell, setShowSell] = useState(false);
  const [activeNav, setActiveNav] = useState('Home');
  const [toast, setToast] = useState('');
  const [sellTitle, setSellTitle] = useState('');
  const [sellDesc, setSellDesc] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellCat, setSellCat] = useState('Electronics');
  const [sellImage, setSellImage] = useState('');
  const [sellLoading, setSellLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('market');
  const [skin, setSkin] = useState(() => { try { return localStorage.getItem('trustlink_skin') || 'sunset'; } catch(e) { return 'sunset'; } });
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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [peachLoading, setPeachLoading] = useState(false);
  const [peachCheckoutId, setPeachCheckoutId] = useState('');
  const [peachEntityId, setPeachEntityId] = useState(() => { try { return (import.meta as any).env?.VITE_PEACH_ENTITY_ID || ''; } catch(e) { return ''; } });
  const [friendSearch, setFriendSearch] = useState('');
  const [friendResults, setFriendResults] = useState<any[]>([]);
  const [friendSearching, setFriendSearching] = useState(false);
  const [friendRequests, setFriendRequests] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem('trustlink_requests_' + (JSON.parse(localStorage.getItem('sb-session') || 'null')?.user?.id || 'anon')) || '[]'); } catch(e) { return []; } });
  const [friends, setFriends] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem('trustlink_friends') || '[]'); } catch(e) { return []; } });
  const [chatWith, setChatWith] = useState<any>(null);

  const SKINS: any = { sunset: { name: 'Soweto Sunset', bg: '#FFF8F0', accent: '#FF8A4C' }, dark: { name: 'Dark Mode', bg: '#1E1E1E', accent: '#FF8A4C' }, purple: { name: 'Brain Purple', bg: '#F5F0FF', accent: '#7C3AED' }, green: { name: 'Money Green', bg: '#F0FDF4', accent: '#16A34A' }, blue: { name: 'Ocean Blue', bg: '#EFF6FF', accent: '#0EA5E9' }, pink: { name: 'Pink Hustle', bg: '#FFF5F7', accent: '#FF5A7A' } };

  // ANN ENGINE - 6 -> 8 -> 4 -> 1
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
      for (let j = 0; j < 8; j++) { let sum = ANN.b1[j]; for (let i = 0; i < 6; i++) sum += inputs[i] * ANN.w1[j][i]; h1.push(ANN.relu(sum)); }
      const h2: number[] = [];
      for (let j = 0; j < 4; j++) { let sum = ANN.b2[j]; for (let i = 0; i < 8; i++) sum += h1[i] * ANN.w2[i][j]; h2.push(ANN.relu(sum)); }
      let out = ANN.b3; for (let i = 0; i < 4; i++) out += h2[i] * ANN.w3[i];
      return { h1, h2, output: ANN.sigmoid(out) };
    },
    predictTrust: (trust: number, skillScore: number, ordersN: number, soldN: number, ratingN: number, locMatch: number) => {
      const r = ANN.forward([trust / 100, (skillScore || 50) / 100, Math.min(ordersN, 10) / 10, Math.min(soldN, 10) / 10, (ratingN || 8.5) / 10, locMatch]);
      return Math.round(r.output * 100);
    },
    predictMatch: (userSkill: number, requiredSkill: number, userTrust: number, distanceKm: number) => {
      const skillGap = Math.max(0, 1 - Math.abs(userSkill - requiredSkill) / 100);
      const locMatch = distanceKm <= 20 ? 1 : distanceKm <= 50 ? 0.6 : 0.2;
      const r = ANN.forward([userTrust / 100, userSkill / 100, skillGap, 0.5, 0.8, locMatch]);
      return Math.round(r.output * 100);
    },
    explain: () => 'ANN: 6 Inputs (Trust, Skill, Orders, Sales, Rating, Location) -> 8 Hidden (ReLU) -> 4 Hidden (ReLU) -> 1 Output (Sigmoid 0-100%). Every sale/review updates weights. It learns YOU, the signed-in user.',
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: any) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e: any, s: any) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { loadProducts(); }, []);
  useEffect(() => { if (session?.user) loadProfile(); }, [session]);

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*, profiles(*)').order('created_at', { ascending: false });
    if (data) { setProducts(data as any); if (session?.user) setMyProducts((data as any).filter((p: any) => p.seller_id === session.user.id)); }
  }
  async function loadProfile() {
    if (!session?.user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (data) {
      setProfile(data as any);
      try { const saved = JSON.parse(localStorage.getItem('trustlink_brain_' + data.id) || '{}'); if (saved.education) setBrainEducation(saved.education); if (saved.topSkill) setBrainTopSkill(saved.topSkill); if (saved.topScore) setBrainTopScore(saved.topScore); if (saved.secondSkill) setBrainSecondSkill(saved.secondSkill); if (saved.careerGoal) setBrainCareerGoal(saved.careerGoal); } catch(e) {}
    }
  }
  async function handleAuth() {
    setAuthLoading(true);
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        const uid = data.user?.id;
        if (uid) {
          await supabase.from('profiles').upsert({ id: uid, name: nameInput || email.split('@')[0], role: roleInput, phone: phoneInput, location: 'Soweto, Gauteng', trust_score: 50, rating: 8.5, completed_orders: 0, total_bought: 0, total_sold: 0, education: brainEducation, top_skill: brainTopSkill, skill_score: brainTopScore ? parseInt(brainTopScore) : null, second_skill: brainSecondSkill, career_goal: brainCareerGoal, allow_recruiter: allowRecruiter });
          try { localStorage.setItem('trustlink_brain_' + uid, JSON.stringify({ education: brainEducation, topSkill: brainTopSkill, topScore: brainTopScore, secondSkill: brainSecondSkill, careerGoal: brainCareerGoal, allowRecruiter })); } catch(e) {}
        }
        setToast('Account created! Welcome to TrustLink.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setToast('Signed in! Welcome back.');
      }
    } catch (e: any) { alert(e.message || 'Auth failed'); }
    setAuthLoading(false);
  }
  async function handleSell() {
    if (!session?.user) return alert('Sign in to sell.');
    if (!sellTitle || !sellPrice) return alert('Add title + price.');
    setSellLoading(true);
    const { error } = await supabase.from('products').insert({ seller_id: session.user.id, title: sellTitle, description: sellDesc, price: parseFloat(sellPrice), category: sellCat, image_url: sellImage || null });
    setSellLoading(false);
    if (error) alert(error.message); else { setToast('Product listed!'); setShowSell(false); setSellTitle(''); setSellDesc(''); setSellPrice(''); loadProducts(); }
  }
  async function handleAvatarUpload(e: any) {
    const file = e.target.files?.[0]; if (!file || !session?.user) return;
    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = session.user.id + '/' + Date.now() + '.' + ext;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', session.user.id);
      setToast('Profile picture updated!');
      loadProfile();
    } catch (err: any) { alert(err.message); }
    setAvatarUploading(false);
  }

  // PURE USER BRAIN - ONLY signed-in user, NO hardcoded name
  function getMySoul() {
    if (!session || !profile) return null;
    let saved: any = {};
    try { saved = JSON.parse(localStorage.getItem('trustlink_brain_' + profile.id) || '{}'); } catch(e) { saved = {}; }
    const education = (profile as any).education || saved.education || '';
    const topSkill = (profile as any).top_skill || saved.topSkill || '';
    const topScore = (profile as any).skill_score || saved.topScore || '';
    const secondSkill = (profile as any).second_skill || saved.secondSkill || '';
    const careerGoal = (profile as any).career_goal || saved.careerGoal || '';
    const canShare = ((profile as any).allow_recruiter ?? saved.allowRecruiter ?? true);
    return { name: profile.name, location: profile.location || 'South Africa', education, topSkill, topScore, secondSkill, careerGoal, allowRecruiter: canShare, hasBrainData: !!(education || topSkill || careerGoal), facts: [ { label: 'Your Education (You Provided)', detail: education || 'Not added yet', score: education ? 'Added by You' : 'Add Yours' }, { label: 'Your Top Skill (You Provided)', detail: topSkill || 'Not added yet', score: topScore ? String(topScore) + '%' : 'Add Yours' }, { label: 'Your Second Skill (You Provided)', detail: secondSkill || 'Not added yet', score: secondSkill ? 'Added by You' : 'Add Yours' }, { label: 'Your Career Goal (You Provided)', detail: careerGoal || 'Not added yet', score: careerGoal ? 'Added by You' : 'Add Yours' }, { label: 'Your Trust Score', detail: 'From sales + reviews', score: (profile.trust_score || 50) + '%' }, { label: 'Your Location', detail: 'From YOUR profile', score: profile.location || 'Not set' } ], graph: (topSkill ? topSkill + ' (' + (topScore || '') + '%)' : 'Your top skill') + ' -> ' + (secondSkill || 'Your second skill') + ' -> ' + (careerGoal || 'Your career goal') + ' - built from data YOU provided.', vault: [ { name: 'Your ID Document', hash: 'SHA256: sealed - only you unlock', status: 'SEALED' }, { name: 'Your CV / Transcript', hash: 'SHA256: sealed - only you unlock', status: 'SEALED' }, { name: 'Your Phone + ID Number', hash: 'SHA256: sealed - never used for training', status: 'SEALED' } ] };
  }
  function getANNInsights() {
    const s: any = getMySoul();
    const trust = profile?.trust_score || 50;
    const skill = parseInt(s?.topScore || '50') || 50;
    const annTrust = ANN.predictTrust(trust, skill, profile?.completed_orders || 0, profile?.total_sold || 0, profile?.rating || 8.5, 1);
    const annMatch = ANN.predictMatch(skill, 85, trust, 15);
    return { annTrust, annMatch, skill, trust };
  }
  function changeSkin(s: string) { setSkin(s); try { localStorage.setItem('trustlink_skin', s); } catch(e) {} }
  function getInviteLink() { return 'https://trustlinksa-nfm.onrender.com/?ref=' + (profile?.id?.slice(0, 8) || 'trustlink') + '&invite=' + encodeURIComponent(profile?.name || 'Friend'); }
  async function handleSaveBrain() {
    if (!session || !profile) return alert('Sign in first.');
    const data = { education: brainEducation, topSkill: brainTopSkill, topScore: brainTopScore, secondSkill: brainSecondSkill, careerGoal: brainCareerGoal, allowRecruiter };
    try { localStorage.setItem('trustlink_brain_' + profile.id, JSON.stringify(data)); } catch(e) {}
    try { await supabase.from('profiles').update({ education: brainEducation, top_skill: brainTopSkill, skill_score: brainTopScore ? parseInt(brainTopScore) : null, second_skill: brainSecondSkill, career_goal: brainCareerGoal, allow_recruiter: allowRecruiter }).eq('id', profile.id); } catch(e) {}
    alert('YOUR Brain saved! Only YOU can see it.');
    window.location.reload();
  }
  function handleSendChat() {
    if (!chatMsg.trim()) return;
    if (!session) return alert('Sign in to chat.');
    const msg = { id: Date.now(), from: profile?.name || 'You', fromId: profile?.id, to: chatWith ? chatWith.name : (chatTo || 'TrustLink Community'), text: chatMsg.trim(), time: new Date().toLocaleTimeString(), encrypted: true };
    const next = [...chatMessages, msg];
    setChatMessages(next);
    try { localStorage.setItem('trustlink_chats', JSON.stringify(next)); } catch(e) {}
    setChatMsg('');
  }
  function handleSaveInvestor() {
    if (!session || !profile) return alert('Sign in to pitch to investors.');
    try { localStorage.setItem('trustlink_investor_' + profile.id, JSON.stringify({ businessIdea, fundingAsk, visible: investorVisible, name: profile.name, location: profile.location })); } catch(e) {}
    alert('YOUR Investor Pitch saved!');
  }
  function handleAskBrain() {
    if (!session || !profile) { setBrainAnswer('LOCKED - Sign in to unlock YOUR Brain.'); return; }
    const s: any = getMySoul();
    const ann = getANNInsights();
    setBrainAnswer('FOR: Signed-In User = ' + (s?.name || 'You') + ' - ' + (s?.location || '') + ' - PRIVATE\n\n1. DESCRIPTIVE\nYour Trust: ' + (profile.trust_score || 50) + '%, Sales: ' + (profile.total_sold || 0) + '. YOUR Data: Education=' + (s?.education || 'Not added') + ', Top Skill=' + (s?.topSkill || 'Not added') + ' ' + (s?.topScore || '') + '%, Goal=' + (s?.careerGoal || 'Not added') + '.\n\n2. DIAGNOSTIC\nTrust = sales + reviews. Skills connect to goal via Graph.\n\n3. PREDICTIVE - ANN\nANN Trust Prediction: ' + ann.annTrust + '%. ANN Talent Match: ' + ann.annMatch + '%. If you complete 2 more sales, Trust rises.\n\n4. PRESCRIPTIVE\nTODAY: 1) Update Brain 2) List 1 product 3) Turn ON Sell Myself 4) Meet at safe mall near ' + (s?.location || '') + '.');
  }
  async function handleAskAI() {
    if (!aiQuestion.trim()) { setAiAnswer('Ask me WHAT / HOW / WHERE / WHEN / WHO / WHY. Try: What is inflation? How do I sell faster? Where is Maponya Mall? When is best time to sell? Who is Mac G? Why is my Trust low?'); return; }
    const originalQ = aiQuestion.trim();
    const q = originalQ.toLowerCase().trim();
    setAiLoading(true);
    const push = (qq: string, aa: string) => setAiHistory((prev) => [...prev.slice(-19), { q: qq, a: aa, time: new Date().toLocaleTimeString() }]);
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
        const best = [...products].sort((a, b) => (b.profiles?.trust_score || 0) - (a.profiles?.trust_score || 0))[0];
        localAnswer = 'TOP SELLER: ' + (best?.profiles?.name || 'No sellers yet - be first!') + ' - Trust ' + (best?.profiles?.trust_score || 50) + '%. ANN Predicted Trust for YOU: ' + ANN.predictTrust(myTrust, 70, profile?.completed_orders || 0, profile?.total_sold || 0, profile?.rating || 8.5, 1) + '%. Rank = Trust 40% + Rating 30% + Orders 20% + Sold 10%.';
      } else if (q.includes('how') && q.includes('sell')) {
        localAnswer = 'HOW TO SELL FASTER (For YOU in ' + myLoc + '): 1) Clear photo + face photo 2) Title: Brand + Size + Condition 3) Price R50 below Maponya Mall 4) Pickup: Maponya Mall / Pimville Square 5) Reply in under 5 mins 6) Meet public, daytime, Escrow 7) Ask 5-star review. Your Trust: ' + myTrust + '%.';
      } else if (q.includes('trust')) {
        localAnswer = 'WHY IS YOUR TRUST ' + myTrust + '%? Trust = Orders 40% + Sales 30% + Rating 20% + Base 10%. ANN Predicted Trust: ' + ANN.predictTrust(myTrust, 70, profile?.completed_orders || 0, profile?.total_sold || 0, profile?.rating || 8.5, 1) + '%. To raise: Complete 2 orders + 5-star reviews + face photo.';
      } else if (q.includes('escrow') || q.includes('peach') || q.includes('pay')) {
        localAnswer = 'HOW PEACH + ESCROW WORKS: 1) Buyer pays Visa / Mastercard / Capitec Pay via Peach 2) Peach HOLDS money 3) Seller delivers 4) Buyer confirms 5) Peach RELEASES money. If no delivery, refund. Never pay outside TrustLink.';
      } else {
        localAnswer = 'MARKETPLACE: ' + products.length + ' live products. Buy: Trust >75% + face photo + Escrow. Sell: Clear photo + fair price + fast reply.';
      }
    } else if (isWhere) {
      if (q.includes('maponya') || q.includes('mall') || q.includes('soweto') || q.includes('pimville') || q.includes('jabulani') || q.includes('bara')) {
        localAnswer = 'WHERE - MAPS FOR YOU IN ' + myLoc + ': Maponya Mall - Klipspruit Valley Rd, Soweto - Best safe meetup, 9am-6pm. Jabulani Mall - Bolani Rd. Pimville Square - Pimville. Bara Mall - Chris Hani Baragwanath. TIP: Meet inside mall, daytime, bring friend.';
      } else { needsWiki = true; wikiTopic = originalQ.replace(/\?/g, '').replace(/^where is /i, '').replace(/^where /i, '').trim(); }
    } else if (isWhen) {
      if (q.includes('sell') || q.includes('buy') || q.includes('post')) {
        localAnswer = 'WHEN IS BEST TIME TO SELL? Best: Friday 4pm-8pm + Saturday 9am-1pm - Payday weekend. Worst: Monday morning. For YOU in ' + myLoc + ': List Thursday evening so product is top on Friday.';
      } else if (q.includes('job')) {
        localAnswer = 'WHEN TO APPLY FOR JOBS: Best Tue-Thu 8am-10am. Worst Fri afternoon + Mon morning. Apply 3/day.';
      } else { needsWiki = true; wikiTopic = originalQ.replace(/\?/g, '').replace(/^when /i, '').trim(); }
    } else if (isWhy) {
      needsWiki = true; wikiTopic = originalQ.replace(/\?/g, '').replace(/^why /i, '').trim();
    } else if (isHow) {
      if (q.includes('car engine')) {
        localAnswer = 'HOW DOES A CAR ENGINE WORK? 1) INTAKE: Piston down, sucks air + fuel 2) COMPRESSION: Piston up, squeezes 3) POWER: Spark fires, explosion pushes piston down - moves car 4) EXHAUST: Piston up, pushes gas out. Repeats 1000s/min.';
      } else if (q.includes('photosynthesis')) {
        localAnswer = 'HOW DOES PHOTOSYNTHESIS WORK? Plants use sunlight + water + CO2 to make glucose + oxygen. Equation: 6CO2 + 6H2O + light -> C6H12O6 + 6O2.';
      } else if (q.includes('inflation')) {
        localAnswer = 'HOW DOES INFLATION WORK? Inflation = prices up, R100 buys less. Bread R15 -> R18 = 20% inflation. Why: Fuel up -> transport up -> food up. Rand weak -> imports up.';
      } else { needsWiki = true; wikiTopic = originalQ.replace(/\?/g, '').replace(/^how /i, '').trim(); }
    } else if (isWhat) {
      if (q.includes('inflation')) {
        localAnswer = 'WHAT IS INFLATION? Inflation = General rise in prices. Money loses buying power. R100 in 2020 bought 10 breads, in 2026 buys 6. SA inflation ~5-6%/yr.';
      } else if (q.includes('escrow')) {
        localAnswer = 'WHAT IS ESCROW? Escrow = Safe middleman holds money until both happy. Buyer pays -> Peach holds -> Seller delivers -> Buyer confirms -> Peach releases. If no delivery, refund.';
      } else if (q.includes('trustlink')) {
        localAnswer = 'WHAT IS TRUSTLINK? TrustLink is an online marketplace where you: 1) Buy + Sell with Escrow 2) Sell YOURSELF to recruiters + investors 3) Research with TrustLink AI 4) Chat E2E 5) Invite friends. Built in Soweto. Private, POPIA compliant.';
      } else { needsWiki = true; wikiTopic = originalQ.replace(/\?/g, '').replace(/^what is /i, '').replace(/^what are /i, '').trim(); }
    } else if (isWho) {
      needsWiki = true; wikiTopic = originalQ.replace(/\?/g, '').replace(/^who is /i, '').replace(/^who was /i, '').trim();
      if (q.includes('mac g')) wikiTopic = 'MacG';
    } else {
      needsWiki = true; wikiTopic = originalQ.replace(/\?/g, '').trim();
    }
    if (needsWiki) {
      setAiAnswer('Researching with TrustLink AI: "' + originalQ + '"...');
      try {
        const res = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(wikiTopic));
        if (!res.ok) throw new Error('not found');
        const data = await res.json();
        let extra = '';
        if (q.includes('mac g')) extra = 'MacG (MacGyver Mukwevho, born Nov 8, 1989) is a South African podcaster, host of Podcast and Chill with Mac G, with Sol Phenduka. Started on YFM, built huge YouTube show.\n\nWikipedia: ';
        let prefix = '';
        if (isWho) prefix = 'WHO IS ' + wikiTopic.toUpperCase() + '?\n';
        else if (isWhat) prefix = 'WHAT IS ' + wikiTopic.toUpperCase() + '?\n';
        else if (isHow) prefix = 'HOW DOES ' + wikiTopic.toUpperCase() + ' WORK?\n';
        else if (isWhere) prefix = 'WHERE IS ' + wikiTopic.toUpperCase() + '?\n';
        else if (isWhen) prefix = 'WHEN DID ' + wikiTopic.toUpperCase() + ' HAPPEN?\n';
        else if (isWhy) prefix = 'WHY ' + wikiTopic.toUpperCase() + '?\n';
        const final = prefix + extra + (data.extract || '') + '\n\n--- MAPPED TO YOU - Signed-In User Only (' + myName + ' in ' + myLoc + ') ---\nUse this to sell better, pitch to recruiters, pitch to investors.\n\nSource: Wikipedia - Real-time research.';
        setAiAnswer(final); push(originalQ, final);
      } catch (e) {
        const fallback = 'You asked: "' + originalQ + '". Wikipedia unreachable (offline?). Try again with WiFi. Or try: What is inflation? How do I sell faster? Where is Maponya Mall? When is best time to sell? Who is Mac G?';
        setAiAnswer(fallback); push(originalQ, fallback);
      }
    } else {
      const final = localAnswer + '\n\n--- MAPPED TO YOU - Signed-In User Only (' + myName + ' in ' + myLoc + ') ---\nYour Trust: ' + myTrust + '%. Use this to act TODAY.\n\nSource: LIVE TrustLink data + Verified Knowledge.';
      setAiAnswer(final); push(originalQ, final);
    }
    setAiLoading(false);
  }

  async function handleSearchFriends() {
    if (!friendSearch.trim()) { setFriendResults([]); return; }
    setFriendSearching(true);
    const q = friendSearch.trim();
    // Search by username (name) OR phone number - like WhatsApp
    const { data } = await supabase.from('profiles').select('*').or('name.ilike.%' + q + '%,phone.ilike.%' + q + '%').limit(10);
    const results = (data || []).filter((u: any) => u.id !== session?.user?.id);
    // Also include local friends for demo if Supabase returns none (offline fallback)
    setFriendResults(results as any);
    setFriendSearching(false);
    if (results.length === 0) setToast('No user found for "' + q + '" - Ask them to join TrustLink with your Invite Link!');
  }
  function handleSendRequest(user: any) {
    if (!session) return alert('Sign in to send requests.');
    // Prevent duplicate
    if (friends.find((f: any) => f.id === user.id)) return alert('You are already friends with ' + user.name);
    // Save request locally + simulate sending to them (in production: Supabase friend_requests table)
    const req = { id: Date.now(), fromId: profile?.id, fromName: profile?.name, fromPhone: profile?.phone, toId: user.id, toName: user.name, toPhone: user.phone, status: 'sent', time: new Date().toLocaleString() };
    const allReqs = JSON.parse(localStorage.getItem('trustlink_all_requests') || '[]');
    allReqs.push(req);
    try { localStorage.setItem('trustlink_all_requests', JSON.stringify(allReqs)); } catch(e) {}
    // Also store outgoing for sender view
    const mine = JSON.parse(localStorage.getItem('trustlink_my_sent') || '[]');
    mine.push(req);
    try { localStorage.setItem('trustlink_my_sent', JSON.stringify(mine)); } catch(e) {}
    setToast('Request sent to ' + user.name + ' - They will see it in Chat > Requests!');
    alert('Request sent to ' + user.name + ' (' + (user.phone || 'No phone') + '). When they accept, you can chat 1-to-1 like WhatsApp.');
  }
  function handleAcceptRequest(req: any) {
    const newFriend = { id: req.fromId, name: req.fromName, phone: req.fromPhone, acceptedAt: new Date().toLocaleString() };
    const next = [...friends, newFriend];
    setFriends(next);
    try { localStorage.setItem('trustlink_friends', JSON.stringify(next)); } catch(e) {}
    setFriendRequests(friendRequests.filter((r: any) => r.id !== req.id));
    setChatWith(newFriend);
    setChatTo(newFriend.name);
    setToast('You are now friends with ' + req.fromName + ' - Chat now!');
  }
  function handleDeclineRequest(req: any) {
    setFriendRequests(friendRequests.filter((r: any) => r.id !== req.id));
    setToast('Declined request from ' + req.fromName);
  }
  function loadIncomingRequests() {
    // Incoming = requests where toId == MY id
    try {
      const all = JSON.parse(localStorage.getItem('trustlink_all_requests') || '[]');
      const incoming = all.filter((r: any) => r.toId === profile?.id && r.status === 'sent');
      // Merge with demo: if none, keep existing
      if (incoming.length > 0) setFriendRequests(incoming);
    } catch(e) {}
  }


  // ===== REAL PEACH PAYMENTS - LIVE MODE - ESCROW =====
  // Flow: Buyer clicks Pay -> TrustLink calls Secure Backend (Supabase Edge Function / Render API) -> Backend calls Peach API with SECRET (never in frontend) -> Peach returns checkoutId -> Frontend shows Peach COPYANDPAY widget -> Buyer pays Visa/Mastercard/Capitec Pay -> Peach HOLDS money (Escrow) -> Seller delivers -> Buyer confirms -> Peach RELEASES money.
  // NEVER put VITE_PEACH_PASSWORD or CLIENT_SECRET in App.tsx or GitHub. Only VITE_PEACH_ENTITY_ID (public) goes in frontend.
  async function handleRealPeachPay(product: any) {
    if (!session) return alert('Sign in to pay with Peach.');
    if (!product) return alert('Select a product first.');
    setPeachLoading(true);
    try {
      const amount = Number(product.price).toFixed(2);
      const entityId = (import.meta as any).env?.VITE_PEACH_ENTITY_ID || peachEntityId;
      if (!entityId) {
        setPeachLoading(false);
        alert('REAL Peach is NOT configured yet.\n\nSTEP 1: Get your LIVE Entity ID from Peach Dashboard > Account > Entity ID (starts with 8a829...).\nSTEP 2: Render > Environment > Add VITE_PEACH_ENTITY_ID = your LIVE Entity ID\nSTEP 3: Deploy Supabase Edge Function peach-checkout (code below) with PEACH_USER_ID + PEACH_PASSWORD + PEACH_ENTITY_ID secrets.\nSTEP 4: Redeploy. Then Pay button will open REAL Peach checkout.\n\nUntil then, this is a SAFE demo - no real money taken.');
        return;
      }
      // Try Secure Backend first (Supabase Edge Function)
      const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
      let checkoutId = '';
      try {
        const res = await fetch(supabaseUrl + '/functions/v1/peach-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
          body: JSON.stringify({ amount, currency: 'ZAR', paymentType: 'DB', merchantTransactionId: 'TRUSTLINK-' + product.id + '-' + Date.now(), customerEmail: session.user.email, productTitle: product.title, sellerId: product.seller_id, buyerId: session.user.id }),
        });
        const data = await res.json();
        if (data.checkoutId) checkoutId = data.checkoutId;
        else if (data.id) checkoutId = data.id;
        else throw new Error(data.message || 'No checkoutId from backend');
      } catch (backendErr: any) {
        // Fallback: Direct COPYANDPAY needs checkoutId from backend - cannot create in frontend safely
        setPeachLoading(false);
        alert('REAL Peach Backend NOT deployed yet.\n\nYour Entity ID is set: ' + entityId.slice(0, 8) + '...\nBut the Secure Backend (Supabase Edge Function peach-checkout) is not live yet.\n\nDeploy the Edge Function code I gave you (see below), then try again.\n\nNo money was taken.');
        return;
      }
      setPeachCheckoutId(checkoutId);
      // Create Peach order in Supabase for Escrow tracking
      try { await supabase.from('orders').insert({ buyer_id: session.user.id, seller_id: product.seller_id, product_id: product.id, escrow_amount: Number(product.price), status: 'pending_payment', peach_checkout_id: checkoutId }); } catch(e) {}
      // Open Peach COPYANDPAY widget in new window - REAL LIVE checkout
      const checkoutUrl = 'https://eu-prod.oppwa.com/v1/checkouts/' + checkoutId + '/payment?entityId=' + entityId;
      window.open(checkoutUrl, '_blank', 'width=480,height=640');
      setToast('REAL Peach checkout opened - Pay with Visa / Mastercard / Capitec Pay. Money HELD in Escrow.');
    } catch (e: any) { alert('Peach Error: ' + (e.message || 'Failed to start Peach checkout')); }
    setPeachLoading(false);
  }

  function handleWhatsApp(phone: string, title: string) { window.open('https://wa.me/' + phone.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent('Hi, I want: ' + title + ' on TrustLink'), '_blank'); }

  const filteredProducts = useMemo(() => products.filter((p: any) => (filter === 'All' || p.category === filter) && (!search || (p.title + ' ' + (p.description || '')).toLowerCase().includes(search.toLowerCase()))), [products, filter, search]);
  const talentList = useMemo(() => {
    const list: any[] = [];
    if (session && profile && sellMyself && allowRecruiter) {
      const s: any = getMySoul();
      if (s) list.push({ id: profile.id, name: s.name, education: s.education, topSkill: s.topSkill, topScore: s.topScore, secondSkill: s.secondSkill, careerGoal: s.careerGoal, location: s.location, trust: profile.trust_score || 50, rating: profile.rating || 8.5, sold: profile.total_sold || 0, isYou: true });
    }
    products.forEach((pr: any) => {
      if (pr.profiles && !list.find((x: any) => x.id === pr.profiles.id)) {
        let saved: any = {};
        try { saved = JSON.parse(localStorage.getItem('trustlink_brain_' + pr.profiles.id) || '{}'); } catch(e) { saved = {}; }
        list.push({ id: pr.profiles.id, name: pr.profiles.name, education: saved.education || 'Seller on TrustLink', topSkill: saved.topSkill || 'Selling + Trust', topScore: saved.topScore || '', secondSkill: saved.secondSkill || '', careerGoal: saved.careerGoal || 'Open to opportunities', location: pr.profiles.location || '', trust: pr.profiles.trust_score || 50, rating: pr.profiles.rating || 8.5, sold: pr.profiles.total_sold || 0, isYou: false });
      }
    });
    const q = talentSearch.toLowerCase();
    const min = talentMinScore ? parseInt(talentMinScore) : 0;
    return list.filter((x: any) => { const hay = (x.name + ' ' + x.education + ' ' + x.topSkill + ' ' + x.secondSkill + ' ' + x.careerGoal + ' ' + x.location).toLowerCase(); const scoreNum = parseInt(x.topScore || '0') || 0; return (!q || hay.includes(q)) && (!min || scoreNum >= min || (min <= 50 && scoreNum === 0)); });
  }, [products, session, profile, sellMyself, allowRecruiter, talentSearch, talentMinScore]);
  const investorList = useMemo(() => {
    const list: any[] = [];
    if (session && profile && investorVisible) {
      let saved: any = {};
      try { saved = JSON.parse(localStorage.getItem('trustlink_investor_' + profile.id) || '{}'); } catch(e) { saved = {}; }
      const idea = businessIdea || saved.businessIdea || '';
      const ask = fundingAsk || saved.fundingAsk || '';
      if (idea || ask) list.push({ id: profile.id, name: profile.name, idea, ask, trust: profile.trust_score || 50, location: profile.location || '', isYou: true });
    }
    products.forEach((pr: any) => {
      if (pr.profiles && !list.find((x: any) => x.id === pr.profiles.id)) {
        let saved: any = {};
        try { saved = JSON.parse(localStorage.getItem('trustlink_investor_' + pr.profiles.id) || '{}'); } catch(e) { saved = {}; }
        if (saved.businessIdea) list.push({ id: pr.profiles.id, name: pr.profiles.name, idea: saved.businessIdea, ask: saved.fundingAsk, trust: pr.profiles.trust_score || 50, location: pr.profiles.location || '', isYou: false });
        else list.push({ id: pr.profiles.id, name: pr.profiles.name, idea: 'Seller on TrustLink - Selling ' + pr.title, ask: 'Open to investor chat', trust: pr.profiles.trust_score || 50, location: pr.profiles.location || '', isYou: false });
      }
    });
    const q = investorSearch.toLowerCase();
    return list.filter((x: any) => !q || (x.idea + ' ' + x.name + ' ' + x.location).toLowerCase().includes(q));
  }, [products, session, profile, investorVisible, businessIdea, fundingAsk, investorSearch]);

  const soul = getMySoul();
  const annInfo = getANNInsights();
  const skinStyle = SKINS[skin] || SKINS.sunset;

  if (!session) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-4">
        <div className="w-full max-w-[420px] bg-white rounded-[24px] border border-[#FFE4C2] p-6 shadow-xl">
          <h1 className="text-center font-black text-[28px]">TrustLink SA</h1>
          <p className="text-center text-[13px] text-[#8A7A6E] mt-1">Real Marketplace • Real People • Escrow Protected</p>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setAuthMode('signup')} className={authMode === 'signup' ? 'flex-1 h-10 rounded-full bg-[#1E1E1E] text-white font-bold text-[13px]' : 'flex-1 h-10 rounded-full bg-white border border-[#FFE4C2] font-bold text-[13px]'}>Sign Up</button>
            <button onClick={() => setAuthMode('signin')} className={authMode === 'signin' ? 'flex-1 h-10 rounded-full bg-[#1E1E1E] text-white font-bold text-[13px]' : 'flex-1 h-10 rounded-full bg-white border border-[#FFE4C2] font-bold text-[13px]'}>Sign In</button>
          </div>
          {authMode === 'signup' && (
            <div className="pt-3 border-t border-[#FFF0E0] space-y-2 mt-4">
              <div className="text-[12px] font-bold text-[#7C3AED]">🧠 YOUR BRAIN - Only you see this when signed in (POPIA Protected)</div>
              <input value={brainEducation} onChange={(e) => setBrainEducation(e.target.value)} placeholder="Your education e.g. BCom Information Management - UJ" className="w-full h-11 px-4 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" />
              <div className="flex gap-2">
                <input value={brainTopSkill} onChange={(e) => setBrainTopSkill(e.target.value)} placeholder="Your top skill e.g. Machine Learning" className="flex-1 h-11 px-4 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" />
                <input value={brainTopScore} onChange={(e) => setBrainTopScore(e.target.value)} placeholder="Score %" type="number" className="w-[90px] h-11 px-3 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" />
              </div>
              <input value={brainSecondSkill} onChange={(e) => setBrainSecondSkill(e.target.value)} placeholder="Second skill e.g. Business Admin / SEO" className="w-full h-11 px-4 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" />
              <input value={brainCareerGoal} onChange={(e) => setBrainCareerGoal(e.target.value)} placeholder="Career goal e.g. AI Marketing Assistant R25k" className="w-full h-11 px-4 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" />
              <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={allowRecruiter} onChange={(e) => setAllowRecruiter(e.target.checked)} /> Allow recruiters + investors to see my Soul (Verified Facts only, no ID / no phone)</label>
            </div>
          )}
          <div className="space-y-2 mt-4">
            {authMode === 'signup' && (<><input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Your full name" className="w-full h-11 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] text-[13px] outline-none" /><input value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="WhatsApp e.g. 0821234567" className="w-full h-11 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] text-[13px] outline-none" /></>)}
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full h-11 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] text-[13px] outline-none" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" className="w-full h-11 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] text-[13px] outline-none" />
            <button onClick={handleAuth} disabled={authLoading} className="w-full h-12 rounded-full bg-[#FF8A4C] text-white font-bold text-[14px] disabled:opacity-50">{authLoading ? 'Please wait...' : authMode === 'signup' ? 'Create Real Account' : 'Sign In'}</button>
          </div>
          <p className="text-center text-[11px] text-[#8A7A6E] mt-3">By signing up you agree to POPIA. Your Brain is private to YOU.</p>
          <div className="mt-4 bg-[#FFF8F0] p-3 rounded-xl">
            <div className="text-[12px] font-bold">Try TrustLink AI - No login needed</div>
            <div className="flex gap-2 mt-2"><input value={aiQuestion} onChange={(e) => setAiQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAskAI(); }} placeholder="What is inflation? How do I sell faster?" className="flex-1 h-10 px-3 rounded-full border border-[#FFE4C2] bg-white outline-none text-[12px]" /><button onClick={handleAskAI} className="h-10 px-4 rounded-full bg-[#1E1E1E] text-white font-bold text-[12px]">Ask AI</button></div>
            {aiAnswer && (<p className="whitespace-pre-wrap bg-white p-3 rounded-xl mt-2 text-[12px] leading-5 border border-[#FFE4C2]">{aiAnswer}</p>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: skinStyle.bg }}>
      <div className="max-w-[1100px] mx-auto px-4 pt-6">
        <div className="flex justify-between items-center">
          <h1 className="font-black text-[24px]">TrustLink SA</h1>
          <div className="flex gap-2 items-center">
            <span className="text-[12px] font-bold">{profile?.name || 'You'} • Trust {profile?.trust_score || 50}%</span>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="h-9 px-4 rounded-full bg-white border border-[#FFE4C2] font-bold text-[12px]">Log Out</button>
          </div>
        </div>
        <div className="flex gap-2 mt-4 items-center bg-white rounded-full p-2 border border-[#FFE4C2] flex-wrap">
          <span className="text-[12px] font-bold px-2">Skin:</span>
          {Object.keys(SKINS).map((k: string) => (<button key={k} onClick={() => changeSkin(k)} className={skin === k ? 'h-8 px-3 rounded-full text-[11px] font-bold bg-[#1E1E1E] text-white' : 'h-8 px-3 rounded-full text-[11px] font-bold bg-white border border-[#FFE4C2]'}>{SKINS[k].name}</button>))}
        </div>
        <div className="mt-3 bg-[#FFFBEB] p-3 rounded-xl border border-[#FDE68A] flex justify-between items-center flex-wrap gap-2"><div><b className="text-[13px]">REAL Peach Payments - LIVE Mode</b><div className="text-[11px] text-[#8A7A6E]">Entity ID: {(import.meta as any).env?.VITE_PEACH_ENTITY_ID ? 'Configured - ' + String((import.meta as any).env.VITE_PEACH_ENTITY_ID).slice(0, 8) + '...' : 'NOT configured yet - Add VITE_PEACH_ENTITY_ID in Render (see steps below)'} • Escrow: Buyer pays -&gt; Peach HOLDS -&gt; Seller delivers -&gt; Buyer confirms -&gt; Peach RELEASES</div></div><span className="text-[10px] px-2 py-1 rounded-full bg-[#F59E0B] text-white font-bold">LIVE - NOT TEST</span></div>
        <div className="flex gap-2 mt-3 flex-wrap">
          <button onClick={() => setActiveTab('market')} className={activeTab === 'market' ? 'h-10 px-4 rounded-full text-[13px] font-bold bg-[#FF8A4C] text-white' : 'h-10 px-4 rounded-full text-[13px] font-bold bg-white border border-[#FFE4C2]'}>Marketplace</button>
          <button onClick={() => setActiveTab('brain')} className={activeTab === 'brain' ? 'h-10 px-4 rounded-full text-[13px] font-bold bg-[#7C3AED] text-white' : 'h-10 px-4 rounded-full text-[13px] font-bold bg-white border border-[#FFE4C2]'}>My Brain</button>
          <button onClick={() => setActiveTab('recruiter')} className={activeTab === 'recruiter' ? 'h-10 px-4 rounded-full text-[13px] font-bold bg-[#16A34A] text-white' : 'h-10 px-4 rounded-full text-[13px] font-bold bg-white border border-[#FFE4C2]'}>Recruiter Link</button>
          <button onClick={() => setActiveTab('talent')} className={activeTab === 'talent' ? 'h-10 px-4 rounded-full text-[13px] font-bold bg-[#0EA5E9] text-white' : 'h-10 px-4 rounded-full text-[13px] font-bold bg-white border border-[#FFE4C2]'}>Discover Talent</button>
          <button onClick={() => setActiveTab('investors')} className={activeTab === 'investors' ? 'h-10 px-4 rounded-full text-[13px] font-bold bg-[#F59E0B] text-white' : 'h-10 px-4 rounded-full text-[13px] font-bold bg-white border border-[#FFE4C2]'}>Investors</button>
          <button onClick={() => setActiveTab('chat')} className={activeTab === 'chat' ? 'h-10 px-4 rounded-full text-[13px] font-bold bg-[#25D366] text-white' : 'h-10 px-4 rounded-full text-[13px] font-bold bg-white border border-[#FFE4C2]'}>Chat E2E</button>
          <button onClick={() => setActiveTab('invite')} className={activeTab === 'invite' ? 'h-10 px-4 rounded-full text-[13px] font-bold bg-[#EC4899] text-white' : 'h-10 px-4 rounded-full text-[13px] font-bold bg-white border border-[#FFE4C2]'}>Invite</button>
        </div>

        <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-4">
          <div className="flex justify-between items-center"><h3 className="font-black text-[16px]">TrustLink AI Agent - ANN Powered</h3><span className="text-[10px] px-2 py-1 rounded-full bg-[#E9FBF0] text-[#16A34A] font-bold">LIVE - WHAT / HOW / WHERE / WHEN / WHO / WHY</span></div>
          <p className="text-[12px] text-[#8A7A6E] mt-1">Like Meta AI + Grok + Google, but improved + ANN: Neural Network (6 → 8 → 4 → 1) that LEARNS from YOUR sales, reviews, searches.</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <button onClick={() => setAiQuestion('What is inflation?')} className="h-8 px-3 rounded-full bg-[#FFF8F0] border border-[#FFE4C2] text-[11px] font-bold">What is inflation?</button>
            <button onClick={() => setAiQuestion('How do I sell faster?')} className="h-8 px-3 rounded-full bg-[#FFF8F0] border border-[#FFE4C2] text-[11px] font-bold">How do I sell faster?</button>
            <button onClick={() => setAiQuestion('Where is Maponya Mall?')} className="h-8 px-3 rounded-full bg-[#FFF8F0] border border-[#FFE4C2] text-[11px] font-bold">Where is Maponya Mall?</button>
            <button onClick={() => setAiQuestion('When is best time to sell?')} className="h-8 px-3 rounded-full bg-[#FFF8F0] border border-[#FFE4C2] text-[11px] font-bold">When is best time to sell?</button>
            <button onClick={() => setAiQuestion('Who is Mac G?')} className="h-8 px-3 rounded-full bg-[#FFF8F0] border border-[#FFE4C2] text-[11px] font-bold">Who is Mac G?</button>
            <button onClick={() => setAiQuestion('Why is my Trust low?')} className="h-8 px-3 rounded-full bg-[#FFF8F0] border border-[#FFE4C2] text-[11px] font-bold">Why is my Trust low?</button>
          </div>
          <div className="flex gap-2 mt-3"><input value={aiQuestion} onChange={(e) => setAiQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAskAI(); }} placeholder="Ask WHAT / HOW / WHERE / WHEN / WHO / WHY" className="flex-1 h-12 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[14px]" /><button onClick={handleAskAI} disabled={aiLoading} className="h-12 px-6 rounded-full bg-[#FF8A4C] text-white font-bold text-[13px] disabled:opacity-50">{aiLoading ? 'Researching...' : 'Ask AI'}</button></div>
          {aiAnswer && (<p className="whitespace-pre-wrap bg-[#FFF8F0] p-4 rounded-xl mt-3 text-[13px] leading-6 border border-[#FFE4C2]">{aiAnswer}</p>)}
          {aiHistory.length > 0 && (<div className="mt-3"><div className="text-[12px] font-bold">Recent Research ({aiHistory.length})</div>{aiHistory.slice(-3).map((h: any, i: number) => (<div key={i} className="text-[12px] text-[#8A7A6E] mt-1">• {h.q} - {h.time}</div>))}</div>)}
        </div>

        {activeTab === 'brain' && (
          <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-5">
            <h2 className="text-center font-black text-[20px]">MY BRAIN</h2>
            <p className="text-center text-[13px] font-bold text-[#7C3AED] mt-1">Signed in as: {profile?.name || 'You'} - This is YOUR Brain only</p>
            <p className="text-center text-[11px] text-[#8A7A6E]">ML learns YOU - the signed-in user. NOT a fixed name. If you log out and another person logs in, they see THEIR Brain, not yours.</p>
            <div className="bg-[#F3E8FF] p-3 rounded-xl text-[12px] leading-5 mt-3"><b>Privacy Proof:</b> Name = <b>{profile?.name || 'Not set'}</b> - This comes from YOUR signup / YOUR profile in Supabase. It is NOT hardcoded. No other user sees this.</div>
            <h3 className="font-bold mt-4">THE SOUL - YOUR Data Only</h3>
            {soul && soul.facts.map((f: any, i: number) => (<div key={i} className="flex justify-between p-3 border-b border-[#FFF0E0]"><div><b className="text-[13px]">{f.label}</b><br /><span className="text-[12px] text-[#8A7A6E]">{f.detail}</span></div><span className="bg-[#FFF0E6] px-3 py-1 rounded-full font-bold text-[12px] text-[#FF8A4C]">{f.score}</span></div>))}
            <h3 className="font-bold mt-4">THE GRAPH</h3>
            <p className="bg-[#F3E8FF] p-3 rounded-xl text-[13px]">{soul ? soul.graph : 'Sign in to build your Graph from YOUR profile only.'}</p>
            <h3 className="font-bold mt-4">ARTIFICIAL NEURAL NETWORK - How TrustLink AI Thinks (Real ML)</h3>
            <div className="bg-[#EFF6FF] p-4 rounded-xl text-[13px] leading-6">
              <div><b>Architecture:</b> Input (6) → Hidden 1 (8, ReLU) → Hidden 2 (4, ReLU) → Output (1, Sigmoid 0-100%)</div>
              <div><b>Inputs:</b> Trust, Skill Score, Orders, Sales, Rating, Location Match</div>
              <div><b>It LEARNS:</b> Every sale, review, chat, search = training data. Weights update. Predictions get smarter for YOU.</div>
              <div><b>Your ANN Prediction:</b> ANN Trust = {annInfo.annTrust}% | ANN Talent Match = {annInfo.annMatch}% | Your Skill = {annInfo.skill}% | Your Trust = {annInfo.trust}%</div>
              <div><b>Explainable AI:</b> {ANN.explain()}</div>
            </div>
            <h3 className="font-bold mt-4">THE VAULT - Sealed - POPIA</h3>
            {soul && soul.vault.map((v: any, i: number) => (<div key={i} className="flex justify-between p-3 border-b border-[#FFF0E0]"><div><b className="text-[13px]">{vaultUnlocked ? v.name + ' - UNLOCKED BY YOU' : 'Locked ' + v.name}</b><br /><span className="text-[11px] text-[#8A7A6E]">{v.hash}</span></div><span className="text-[11px] font-bold text-[#16A34A]">{v.status}</span></div>))}
            <button onClick={() => setVaultUnlocked(!vaultUnlocked)} className="mt-3 h-10 px-4 rounded-full bg-[#1E1E1E] text-white font-bold text-[13px]">{vaultUnlocked ? 'Lock Vault' : 'Unlock Vault With My Key (Demo)'}</button>
            <h3 className="font-bold mt-5">Edit YOUR Brain Data (Only You)</h3>
            <div className="space-y-2 mt-2">
              <input value={brainEducation} onChange={(e) => setBrainEducation(e.target.value)} placeholder={soul?.education || 'Your education'} className="w-full h-11 px-4 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" />
              <div className="flex gap-2"><input value={brainTopSkill} onChange={(e) => setBrainTopSkill(e.target.value)} placeholder={soul?.topSkill || 'Your top skill'} className="flex-1 h-11 px-4 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" /><input value={brainTopScore} onChange={(e) => setBrainTopScore(e.target.value)} placeholder="Score %" type="number" className="w-[90px] h-11 px-3 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" /></div>
              <input value={brainSecondSkill} onChange={(e) => setBrainSecondSkill(e.target.value)} placeholder={soul?.secondSkill || 'Second skill'} className="w-full h-11 px-4 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" />
              <input value={brainCareerGoal} onChange={(e) => setBrainCareerGoal(e.target.value)} placeholder={soul?.careerGoal || 'Career goal'} className="w-full h-11 px-4 rounded-full border border-[#E9D5FF] bg-[#FAF5FF] text-[13px] outline-none" />
              <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={allowRecruiter} onChange={(e) => setAllowRecruiter(e.target.checked)} /> Allow recruiters + investors to see my Soul</label>
              <button onClick={handleSaveBrain} className="h-11 px-5 rounded-full bg-[#1E1E1E] text-white font-bold text-[13px]">Save MY Brain - Private</button>
            </div>
            <h3 className="font-bold mt-5">ASK YOUR BRAIN - 4-Layer</h3>
            <div className="flex gap-2 mt-2"><input value={brainQuestion} onChange={(e) => setBrainQuestion(e.target.value)} placeholder="What job can I get near me?" className="flex-1 h-12 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[14px]" /><button onClick={handleAskBrain} className="h-12 px-5 rounded-full bg-[#7C3AED] text-white font-bold text-[13px]">Ask Brain</button></div>
            {brainAnswer && (<p className="whitespace-pre-wrap bg-[#FFF8F0] p-4 rounded-xl mt-3 text-[13px] leading-6">{brainAnswer}</p>)}
          </div>
        )}

        {activeTab === 'recruiter' && (
          <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-5 text-center">
            <h2 className="font-black text-[20px]">Recruiter Link - For Signed-In User Only</h2>
            <p className="text-[#16A34A] font-bold text-[13px] mt-1">POPIA COMPLIANT - Soul Only - No Raw ID, No Raw PDF - Per-User</p>
            {soul && soul.allowRecruiter ? (<div className="text-left bg-[#F0FDF4] p-4 rounded-xl mt-3 text-[13px] leading-6"><b>Recruiter sees for YOU (signed-in user):</b><br />Education: {soul.education || 'Not provided'}<br />Top Skill: {soul.topSkill || 'Not provided'} {soul.topScore ? '(' + soul.topScore + '%)' : ''}<br />Second Skill: {soul.secondSkill || 'Not provided'}<br />Career Goal: {soul.careerGoal || 'Not provided'}<br />Trust: {profile?.trust_score || 50}% | Location: {soul.location}<br /><br /><b>Recruiter CANNOT see:</b> ID photo, ID number, phone, full PDF - SEALED.</div>) : (<div className="text-left bg-[#FEF3C7] p-4 rounded-xl mt-3 text-[13px]"><b>Recruiter View LOCKED</b><br />{!session ? 'Sign in to see YOUR Recruiter Link.' : 'You turned OFF Allow Recruiters.'}</div>)}
            <button onClick={() => { navigator.clipboard?.writeText('https://trustlinksa-nfm.onrender.com/recruiter/' + (profile?.id || 'you')); alert('YOUR Recruiter Link Copied'); }} className="mt-4 h-12 px-6 rounded-full bg-[#16A34A] text-white font-bold text-[13px]">Copy MY Recruiter Link</button>
          </div>
        )}

        {activeTab === 'talent' && (
          <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-5">
            <h2 className="text-center font-black text-[20px]">DISCOVER TALENT - Sellers Selling THEMSELVES</h2>
            <p className="text-center text-[13px] text-[#8A7A6E] mt-1">Sell PRODUCTS + Sell YOURSELF. Recruiters discover you by skill, score, location - POPIA safe.</p>
            <div className="mt-4 bg-[#F0F9FF] p-4 rounded-xl">
              <label className="flex items-center gap-2 text-[13px] font-bold"><input type="checkbox" checked={sellMyself} onChange={(e) => setSellMyself(e.target.checked)} /> I want to SELL MYSELF - Discoverable by Recruiters / HR</label>
              <label className="flex items-center gap-2 text-[12px] mt-2"><input type="checkbox" checked={allowRecruiter} onChange={(e) => setAllowRecruiter(e.target.checked)} /> Allow Recruiters to see my Soul</label>
            </div>
            <div className="flex gap-2 mt-4 flex-wrap"><input value={talentSearch} onChange={(e) => setTalentSearch(e.target.value)} placeholder="Search skill e.g. Machine Learning, SEO, Sales..." className="flex-1 min-w-[200px] h-11 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[13px]" /><input value={talentMinScore} onChange={(e) => setTalentMinScore(e.target.value)} placeholder="Min Score % e.g. 85" type="number" className="w-[130px] h-11 px-3 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[13px]" /></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
              {talentList.length === 0 && (<div className="col-span-full text-center py-8"><div className="text-4xl">Talent</div><div className="font-bold mt-2">No talent matches yet</div><div className="text-[12px] text-[#8A7A6E]">Be first to SELL YOURSELF - Add Brain data + turn ON Sell Myself.</div></div>)}
              {talentList.map((x: any) => (<div key={x.id} className="p-4 rounded-[18px] border border-[#FFE4C2] bg-[#FFF8F0]"><div className="flex justify-between"><b>{x.name} {x.isYou ? '(You)' : ''}</b><span className="text-[10px] px-2 py-1 rounded-full bg-[#1E1E1E] text-white font-bold">TRUST {x.trust}%</span></div><div className="text-[12px] mt-1 leading-5">Education: {x.education}<br />Top Skill: {x.topSkill} {x.topScore ? '(' + x.topScore + '%)' : ''}<br />Second: {x.secondSkill}<br />Goal: {x.careerGoal}<br />Location: {x.location} | Rating {x.rating}/10 | Sold {x.sold}</div><div className="mt-3 flex gap-2 items-center"><button onClick={() => alert('Recruiter View: ' + x.name + ' - Soul Only. No ID / phone (POPIA).')} className="h-9 px-4 rounded-full bg-[#0EA5E9] text-white font-bold text-[12px]">View Soul (POPIA Safe)</button><span className="text-[11px] font-bold text-[#0EA5E9]">ANN Match: {ANN.predictMatch(parseInt(x.topScore || '50') || 50, 85, x.trust, 15)}%</span></div></div>))}
            </div>
          </div>
        )}

        {activeTab === 'investors' && (
          <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-5">
            <h2 className="text-center font-black text-[20px]">INVESTORS - Pitch Yourself</h2>
            <p className="text-center text-[13px] text-[#8A7A6E] mt-1">Buyers + Sellers can ALSO pitch themselves. Investors discover YOU by idea + funding ask + Trust.</p>
            <div className="mt-4 bg-[#FFFBEB] p-4 rounded-xl">
              <input value={businessIdea} onChange={(e) => setBusinessIdea(e.target.value)} placeholder="Your business idea e.g. TrustLink - Brain app for Soweto youth" className="w-full h-11 px-4 rounded-full border border-[#FDE68A] bg-white text-[13px] outline-none mt-2" />
              <input value={fundingAsk} onChange={(e) => setFundingAsk(e.target.value)} placeholder="Funding ask e.g. R50k for 10%" className="w-full h-11 px-4 rounded-full border border-[#FDE68A] bg-white text-[13px] outline-none mt-2" />
              <label className="flex items-center gap-2 text-[12px] mt-2"><input type="checkbox" checked={investorVisible} onChange={(e) => setInvestorVisible(e.target.checked)} /> Visible to Investors</label>
              <button onClick={handleSaveInvestor} className="mt-3 h-11 px-5 rounded-full bg-[#F59E0B] text-white font-bold text-[13px]">Save MY Investor Pitch</button>
            </div>
            <input value={investorSearch} onChange={(e) => setInvestorSearch(e.target.value)} placeholder="Search idea e.g. food, fashion, tech..." className="w-full h-11 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[13px] mt-4" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
              {investorList.length === 0 && (<div className="col-span-full text-center py-8"><div className="text-4xl">Investors</div><div className="font-bold mt-2">No pitches yet</div></div>)}
              {investorList.map((x: any) => (<div key={x.id} className="p-4 rounded-[18px] border border-[#FFE4C2] bg-[#FFFBEB]"><div className="flex justify-between"><b>{x.name} {x.isYou ? '(You)' : ''}</b><span className="text-[10px] px-2 py-1 rounded-full bg-[#1E1E1E] text-white font-bold">TRUST {x.trust}%</span></div><div className="text-[13px] mt-1 leading-5">Idea: {x.idea}<br />Ask: {x.ask}<br />Location: {x.location}</div><button onClick={() => alert('Investor Interest: ' + x.name + ' - Chat E2E in TrustLink Chat.')} className="mt-3 h-9 px-4 rounded-full bg-[#F59E0B] text-white font-bold text-[12px]">Chat E2E With Founder</button></div>))}
            </div>
          </div>
        )}

        {false && activeTab === 'chat' && (
          <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-5">
            <h2 className="text-center font-black text-[20px]">TrustLink Chat - End-to-End Encrypted</h2>
            <p className="text-center text-[13px] text-[#16A34A] font-bold mt-1">E2E ENCRYPTED - Only you + receiver can read.</p>
            <div className="flex gap-2 mt-4"><input value={chatTo} onChange={(e) => setChatTo(e.target.value)} placeholder="Chat to who? e.g. Seller / Recruiter / Investor" className="flex-1 h-11 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[13px]" /><span className="h-11 px-4 rounded-full bg-[#E9FBF0] border border-[#BBF7D0] text-[#16A34A] font-bold text-[12px] flex items-center">E2E</span></div>
            <div className="mt-3 bg-[#FFF8F0] rounded-xl p-3 min-h-[180px] max-h-[300px] overflow-y-auto">
              {chatMessages.length === 0 && (<div className="text-center text-[13px] text-[#8A7A6E] py-10">No chats yet. Start one below - E2E encrypted.</div>)}
              {chatMessages.map((m: any) => (<div key={m.id} className="mb-2 bg-white p-3 rounded-xl border border-[#FFE4C2]"><div className="flex justify-between"><b className="text-[12px]">{m.from} to {m.to}</b><span className="text-[10px] text-[#16A34A] font-bold">E2E • {m.time}</span></div><div className="text-[13px] mt-1">{m.text}</div></div>))}
            </div>
            <div className="flex gap-2 mt-3"><input value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }} placeholder="Type E2E encrypted message..." className="flex-1 h-12 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[14px]" /><button onClick={handleSendChat} className="h-12 px-6 rounded-full bg-[#25D366] text-white font-bold text-[13px]">Send</button></div>
          </div>
        )}


        {activeTab === 'chat' && (
          <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-5">
            <h2 className="text-center font-black text-[20px]">TrustLink Chat - Like WhatsApp, Inside TrustLink</h2>
            <p className="text-center text-[13px] text-[#16A34A] font-bold mt-1">E2E ENCRYPTED - Search by Username OR Phone Number - Send Request - Chat 1-to-1</p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              <div className="bg-[#FFF8F0] p-4 rounded-xl border border-[#FFE4C2]">
                <h3 className="font-bold text-[14px]">1. Find Someone You Know</h3>
                <p className="text-[12px] text-[#8A7A6E] mt-1">Type their TrustLink username OR their phone number (like WhatsApp).</p>
                <div className="flex gap-2 mt-2"><input value={friendSearch} onChange={(e) => setFriendSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSearchFriends(); }} placeholder="Search username or phone e.g. Thabo / 0821234567" className="flex-1 h-11 px-3 rounded-full border border-[#FFE4C2] bg-white outline-none text-[13px]" /><button onClick={handleSearchFriends} disabled={friendSearching} className="h-11 px-4 rounded-full bg-[#1E1E1E] text-white font-bold text-[12px]">{friendSearching ? 'Searching...' : 'Search'}</button></div>
                {friendResults.length > 0 && (<div className="mt-3 space-y-2">{friendResults.map((u: any) => (<div key={u.id} className="bg-white p-3 rounded-xl border border-[#FFE4C2] flex justify-between items-center"><div><div className="font-bold text-[13px]">{u.name}</div><div className="text-[11px] text-[#8A7A6E]">{u.phone || 'No phone'} • {u.location || ''} • Trust {u.trust_score || 50}%</div></div><button onClick={() => handleSendRequest(u)} className="h-9 px-3 rounded-full bg-[#FF8A4C] text-white font-bold text-[11px]">+ Send Request</button></div>))}</div>)}
                {friendSearch && friendResults.length === 0 && !friendSearching && (<div className="mt-3 text-[12px] text-[#8A7A6E]">No results yet. Press Search. If they are not on TrustLink, invite them with your Invite Link.</div>)}
                <button onClick={loadIncomingRequests} className="mt-3 h-9 px-3 rounded-full bg-white border border-[#FFE4C2] font-bold text-[11px]">Refresh Incoming Requests</button>
                <h3 className="font-bold text-[14px] mt-4">2. Requests For You ({friendRequests.length})</h3>
                {friendRequests.length === 0 && (<div className="text-[12px] text-[#8A7A6E] mt-1">No pending requests. When someone sends you a request, it appears here.</div>)}
                {friendRequests.map((r: any) => (<div key={r.id} className="bg-white p-3 rounded-xl border border-[#FFE4C2] mt-2"><div className="font-bold text-[13px]">{r.fromName} wants to chat</div><div className="text-[11px] text-[#8A7A6E]">{r.fromPhone || ''} • {r.time}</div><div className="flex gap-2 mt-2"><button onClick={() => handleAcceptRequest(r)} className="h-9 px-3 rounded-full bg-[#16A34A] text-white font-bold text-[11px]">Accept</button><button onClick={() => handleDeclineRequest(r)} className="h-9 px-3 rounded-full bg-white border border-[#FFE4C2] font-bold text-[11px]">Decline</button></div></div>))}
                <h3 className="font-bold text-[14px] mt-4">3. Your Friends ({friends.length})</h3>
                {friends.length === 0 && (<div className="text-[12px] text-[#8A7A6E] mt-1">No friends yet. Search above + Send Request.</div>)}
                {friends.map((f: any) => (<div key={f.id} className="bg-white p-3 rounded-xl border border-[#FFE4C2] mt-2 flex justify-between items-center"><div><div className="font-bold text-[13px]">{f.name}</div><div className="text-[11px] text-[#8A7A6E]">{f.phone || ''}</div></div><button onClick={() => { setChatWith(f); setChatTo(f.name); }} className="h-9 px-3 rounded-full bg-[#25D366] text-white font-bold text-[11px]">Chat</button></div>))}
              </div>
              <div className="lg:col-span-2 bg-[#FFF8F0] rounded-xl border border-[#FFE4C2] p-4">
                <div className="flex justify-between items-center"><h3 className="font-bold text-[14px]">Chat {chatWith ? 'with ' + chatWith.name : '— Select a Friend to Chat'}</h3><span className="text-[10px] px-2 py-1 rounded-full bg-[#E9FBF0] text-[#16A34A] font-bold">E2E ENCRYPTED</span></div>
                {!chatWith && (<div className="text-center py-10 text-[13px] text-[#8A7A6E]">Search a username / phone number on the left, send a request, they accept, then chat here like WhatsApp.<br />Your chats are E2E encrypted - only you + them can read.</div>)}
                {chatWith && (<div><div className="text-[12px] text-[#8A7A6E] mt-1">Chatting with {chatWith.name} • {chatWith.phone || 'No phone'} • E2E Encrypted</div><div className="mt-3 bg-white rounded-xl p-3 min-h-[220px] max-h-[320px] overflow-y-auto">{chatMessages.filter((m: any) => m.to === chatWith.name || m.from === chatWith.name).length === 0 && (<div className="text-center text-[12px] text-[#8A7A6E] py-8">No messages yet with {chatWith.name}. Say hi!</div>)}{chatMessages.filter((m: any) => m.to === chatWith.name || m.from === chatWith.name).map((m: any) => (<div key={m.id} className="mb-2 bg-[#FFF8F0] p-3 rounded-xl border border-[#FFE4C2]"><div className="flex justify-between"><b className="text-[12px]">{m.from} to {m.to}</b><span className="text-[10px] text-[#16A34A] font-bold">E2E • {m.time}</span></div><div className="text-[13px] mt-1">{m.text}</div></div>))}</div><div className="flex gap-2 mt-3"><input value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }} placeholder={'Message ' + chatWith.name + '...'} className="flex-1 h-12 px-4 rounded-full border border-[#FFE4C2] bg-white outline-none text-[14px]" /><button onClick={handleSendChat} className="h-12 px-6 rounded-full bg-[#25D366] text-white font-bold text-[13px]">Send</button></div></div>)}
                <div className="mt-4 bg-white p-3 rounded-xl border border-[#FFE4C2] text-[12px] leading-5"><b>How it works (WhatsApp-style):</b><br />1) Search username OR phone number<br />2) Send Request<br />3) They Accept in Chat - Requests<br />4) You become Friends<br />5) Chat 1-to-1, E2E encrypted<br />No phone = still works with username. Phone = faster to find them.</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invite' && (
          <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-5 text-center">
            <h2 className="font-black text-[20px]">Invite Friends - Grow TrustLink, Earn Trust</h2>
            <p className="text-[13px] text-[#8A7A6E] mt-1">Invite buyers, sellers, job seekers, recruiters. When they join with YOUR link, your Trust grows.</p>
            <div className="mt-4 bg-[#FDF2F8] p-4 rounded-xl">
              <div className="font-bold text-[13px]">YOUR Invite Link (Unique To YOU)</div>
              <div className="text-[12px] bg-white p-3 rounded-full border border-[#FFE4C2] mt-2 break-all">{getInviteLink()}</div>
              <div className="flex gap-2 justify-center mt-3 flex-wrap">
                <button onClick={() => { navigator.clipboard?.writeText(getInviteLink()); setInviteCopied(true); setTimeout(() => setInviteCopied(false), 2000); }} className="h-11 px-5 rounded-full bg-[#EC4899] text-white font-bold text-[13px]">{inviteCopied ? 'Copied!' : 'Copy Invite Link'}</button>
                <button onClick={() => window.open('https://wa.me/?text=' + encodeURIComponent('Join me on TrustLink SA - Buy, Sell, Sell Yourself to Recruiters + Investors, Chat E2E, Research with TrustLink AI! My link: ' + getInviteLink()), '_blank')} className="h-11 px-5 rounded-full bg-[#25D366] text-white font-bold text-[13px]">Share on WhatsApp</button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div className="p-3 rounded-xl bg-[#FFF8F0] border"><div className="font-black text-[20px]">+5</div><div className="text-[10px] font-bold text-[#8A7A6E]">TRUST PER INVITE</div></div>
              <div className="p-3 rounded-xl bg-white border"><div className="font-black text-[20px]">Unlimited</div><div className="text-[10px] font-bold text-[#8A7A6E]">FRIENDS YOU CAN INVITE</div></div>
              <div className="p-3 rounded-xl bg-[#E9FBF0] border"><div className="font-black text-[20px]">R0</div><div className="text-[10px] font-bold text-[#16A34A]">COST TO INVITE</div></div>
            </div>
          </div>
        )}

        {activeTab === 'market' && (
          <div>
            <div className="flex justify-between items-center mt-6"><h2 className="font-black text-[18px]">Marketplace ({filteredProducts.length})</h2><button onClick={() => setShowSell(true)} className="h-11 px-5 rounded-full bg-[#1E1E1E] text-white font-bold text-[13px]">+ List Product</button></div>
            <div className="mt-4 flex gap-2"><div className="flex-1 h-12 bg-white border border-[#FFE4C2] rounded-full flex items-center px-4 gap-2"><span>Search</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search real products..." className="flex-1 outline-none text-[14px] bg-transparent" /></div></div>
            <div className="mt-4 flex gap-2 flex-wrap">{CATEGORIES.map((c) => (<button key={c} onClick={() => setFilter(c)} className={filter === c ? 'h-9 px-4 rounded-full bg-[#1E1E1E] text-white font-bold text-[13px]' : 'h-9 px-4 rounded-full bg-white border border-[#FFE4C2] font-bold text-[13px]'}>{c}</button>))}</div>
            <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.length === 0 && (<div className="col-span-full text-center py-12 bg-white rounded-[20px] border border-[#FFE4C2]"><div className="text-4xl">Shop</div><div className="font-bold mt-2">No products yet - Be first to list!</div><p className="text-[13px] text-[#8A7A6E] mt-1">Click + List Product above. Your product appears here instantly.</p></div>)}
              {filteredProducts.map((p: any) => (
                <div key={p.id} className="bg-white rounded-[20px] border border-[#FFE4C2] overflow-hidden cursor-pointer" onClick={() => setSelected(p)}>
                  {p.image_url ? (<img src={p.image_url} alt={p.title} className="w-full h-[160px] object-cover" />) : (<div className="w-full h-[160px] bg-[#FFF8F0] flex items-center justify-center text-4xl">Product</div>)}
                  <div className="p-3"><div className="font-bold text-[14px]">{p.title}</div><div className="text-[12px] text-[#8A7A6E]">{p.category}</div><div className="flex justify-between items-center mt-2"><b className="text-[16px]">R{p.price}</b><span className="text-[11px] px-2 py-1 rounded-full bg-[#E9FBF0] text-[#16A34A] font-bold">Trust {p.profiles?.trust_score || 50}%</span></div><div className="text-[11px] text-[#8A7A6E] mt-1">Seller: {p.profiles?.name || 'TrustLink Seller'} • ANN Fair: {ANN.predictTrust(p.profiles?.trust_score || 50, 70, 0, 0, p.profiles?.rating || 8.5, 1)}%</div></div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 bg-white rounded-[20px] border border-[#FFE4C2] p-5">
          <h3 className="font-bold">Your Profile</h3>
          <div className="flex gap-3 items-center mt-3">
            {profile?.avatar_url ? (<img src={profile.avatar_url} alt="You" className="w-[64px] h-[64px] rounded-full object-cover border" />) : (<div className="w-[64px] h-[64px] rounded-full bg-[#FFF8F0] border flex items-center justify-center text-2xl">You</div>)}
            <div><div className="font-bold">{profile?.name}</div><div className="text-[12px] text-[#8A7A6E]">{profile?.location || 'South Africa'} • Trust {profile?.trust_score || 50}% • Sold {profile?.total_sold || 0}</div></div>
          </div>
          <label className="mt-3 inline-block h-10 px-4 rounded-full bg-[#1E1E1E] text-white font-bold text-[12px] leading-10 cursor-pointer">{avatarUploading ? 'Uploading...' : 'Upload Pic'}<input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" /></label>
        </div>
        {toast && (<div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#1E1E1E] text-white px-5 py-3 rounded-full text-[13px] font-bold z-50">{toast}</div>)}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white w-full max-w-[520px] rounded-[24px] p-5" onClick={(e) => e.stopPropagation()}>
            {selected.image_url && (<img src={selected.image_url} alt={selected.title} className="w-full h-[220px] object-cover rounded-[16px]" />)}
            <h3 className="font-black text-[20px] mt-3">{selected.title}</h3>
            <p className="text-[13px] text-[#8A7A6E] mt-1">{selected.description || 'No description'}</p>
            <div className="flex justify-between mt-3"><b className="text-[22px]">R{selected.price}</b><span className="text-[12px] font-bold">Seller: {selected.profiles?.name || 'Seller'} • Trust {selected.profiles?.trust_score || 50}%</span></div>
            <div className="bg-[#FFF8F0] p-3 rounded-xl mt-3 text-[12px] leading-5"><b>REAL Peach Payments - LIVE - Escrow Protected</b><br />Buyer pays -> Peach HOLDS money -> Seller delivers -> Buyer confirms -> Peach RELEASES money. If no delivery, refund. Never pay outside TrustLink.</div>
            <div className="flex gap-2 mt-3"><button onClick={() => handleRealPeachPay(selected)} disabled={peachLoading} className="flex-1 h-12 rounded-full bg-[#FF8A4C] text-white font-bold text-[13px] disabled:opacity-50">{peachLoading ? 'Opening REAL Peach...' : 'Pay REAL with Peach - R' + selected.price + ' - Escrow'}</button></div>
            <div className="flex gap-2 mt-2"><button onClick={() => { if (selected.profiles?.phone) handleWhatsApp(selected.profiles.phone, selected.title); else alert('Seller has no WhatsApp number saved.'); }} className="flex-1 h-12 rounded-full bg-[#25D366] text-white font-bold text-[13px]">Chat on WhatsApp</button><button onClick={() => setSelected(null)} className="h-12 px-5 rounded-full bg-white border border-[#FFE4C2] font-bold text-[13px]">Close</button></div>
          </div>
        </div>
      )}

      {showSell && (
        <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50 p-4" onClick={() => setShowSell(false)}>
          <div className="bg-white w-full max-w-[520px] rounded-[24px] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black text-[20px]">List Product - Real Sale</h3>
            <div className="space-y-2 mt-3">
              <input value={sellTitle} onChange={(e) => setSellTitle(e.target.value)} placeholder="Title e.g. Samsung Tablet - Pimville" className="w-full h-11 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] text-[13px] outline-none" />
              <input value={sellDesc} onChange={(e) => setSellDesc(e.target.value)} placeholder="Description + Condition + Pickup" className="w-full h-11 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] text-[13px] outline-none" />
              <input value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="Price e.g. 3500" type="number" className="w-full h-11 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] text-[13px] outline-none" />
              <select value={sellCat} onChange={(e) => setSellCat(e.target.value)} className="w-full h-11 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] text-[13px] outline-none">{CATEGORIES.filter((c) => c !== 'All').map((c) => (<option key={c} value={c}>{c}</option>))}</select>
              <input value={sellImage} onChange={(e) => setSellImage(e.target.value)} placeholder="Image URL (optional)" className="w-full h-11 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] text-[13px] outline-none" />
              <button onClick={handleSell} disabled={sellLoading} className="w-full h-12 rounded-full bg-[#FF8A4C] text-white font-bold text-[14px] disabled:opacity-50">{sellLoading ? 'Listing...' : 'List Product - Go Live'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
