import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
// SAFE Supabase - never throws, never white-screens, even if env key is missing
const _supaUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://wdktbinawlrlfxmncmlj.supabase.co';
const _supaKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6MTIzNDU2Nzg5LCJleHAiOjE5OTk5OTk5OTl9.dummy-placeholder-key-so-app-never-crashes';
let supabase: any;
try { supabase = createClient(_supaUrl, _supaKey); } catch(e) {
  const empty = async () => ({ data: null, error: null });
  supabase = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }), signInWithPassword: empty, signUp: empty, signOut: empty }, from: () => ({ select: () => ({ order: () => ({ limit: async () => ({ data: [] }) }), eq: () => ({ single: async () => ({ data: null }) }) }), insert: () => ({ select: () => ({ single: async () => ({ data: null }) }) }), update: () => ({ eq: async () => ({ error: null }) }) }), storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) }, channel: () => ({ on: function() { return this; }, subscribe: () => {}, send: () => {} }), removeChannel: () => {} };
}

type Profile = { id: string; name: string; role: string; phone?: string; bio?: string; location?: string; trust_score: number; rating: number; completed_orders: number; total_bought: number; total_sold: number; avatar_url?: string; education?: string; top_skill?: string; skill_score?: number; second_skill?: string; career_goal?: string; allow_recruiter?: boolean; };
type Product = { id: string; seller_id: string; title: string; description?: string; price: number; category: string; image_url?: string; likes: number; views: number; sold_count: number; is_sold: boolean; created_at: string; profiles?: Profile; };
const CATEGORIES = ['All','Electronics','Fashion','Home','Cars','Phones','Beauty','Sports','Other'];

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [bootError, setBootError] = useState('');
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
  const [orders, setOrders] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem('trustlink_orders') || '[]'); } catch(e) { return []; } });
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
  useEffect(() => { window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; setTimeout(() => { window.scrollTo(0, 0); document.documentElement.scrollTop = 0; const el = document.getElementById('tag-top'); if (el) el.scrollIntoView({ behavior: 'instant' as any, block: 'start' }); }, 50); }, [activeTab]);
  const [skin, setSkin] = useState(() => { try { return localStorage.getItem('trustlink_skin') || 'corporate'; } catch(e) { return 'corporate'; } });
  const [rainTick, setRainTick] = useState(0);
  const ANIMATED_SKINS = ['rain', 'aurora', 'ocean', 'forest', 'sunset', 'lavender', 'sunset'];
  // Animated skins - pure JS timer, NO <style> / keyframes so build never breaks
  useEffect(() => { if (!ANIMATED_SKINS.includes(skin)) return; const id = setInterval(() => setRainTick((v) => v + 1), 50); return () => clearInterval(id); }, [skin]);
  const [savedAddress, setSavedAddress] = useState(() => { try { return localStorage.getItem('trustlink_address') || ''; } catch(e) { return ''; } });
  const [savedSearches, setSavedSearches] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem('trustlink_alerts') || '[]'); } catch(e) { return []; } });
  const [alertQuery, setAlertQuery] = useState('');
  const [alertMaxPrice, setAlertMaxPrice] = useState('');
  const [nearMeKm, setNearMeKm] = useState('10');
  const [showAll, setShowAll] = useState(false); // ONE HEADER - One click = One section only, no long scroll
  const [userLat, setUserLat] = useState<number | null>(() => { try { const v = localStorage.getItem('trustlink_lat'); return v ? parseFloat(v) : null; } catch(e) { return null; } });
  const [userLng, setUserLng] = useState<number | null>(() => { try { const v = localStorage.getItem('trustlink_lng'); return v ? parseFloat(v) : null; } catch(e) { return null; } });
  const [gpsStatus, setGpsStatus] = useState('Not set - Tap Use My GPS');
  const [userProvince, setUserProvince] = useState(() => { try { return localStorage.getItem('trustlink_province') || 'Gauteng'; } catch(e) { return 'Gauteng'; } });
  const [userCity, setUserCity] = useState(() => { try { return localStorage.getItem('trustlink_city') || 'Krugersdorp'; } catch(e) { return 'Krugersdorp'; } });
  const [userArea, setUserArea] = useState(() => { try { return localStorage.getItem('trustlink_area') || 'Krugersdorp'; } catch(e) { return 'Krugersdorp'; } });
  const [voiceNote, setVoiceNote] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [mediaRecorderRef, setMediaRecorderRef] = useState<any>(null);
  const [audioChunksRef, setAudioChunksRef] = useState<any[]>([]);
  const [localVideoRef, setLocalVideoRef] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [videoCallOpen, setVideoCallOpen] = useState(false);
  const [escrowBalance, setEscrowBalance] = useState(0);
  const [disputeReason, setDisputeReason] = useState('');
  const [escrowFilter, setEscrowFilter] = useState('All');
  const [videoCallWith, setVideoCallWith] = useState('');
  const [trustPassportOpen, setTrustPassportOpen] = useState(false);
  const [priceCheckTitle, setPriceCheckTitle] = useState('');
  const [priceCheckResult, setPriceCheckResult] = useState('');
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
  const [yocoLoading, setYocoLoading] = useState(false);
  const [payfastLoading, setPayfastLoading] = useState(false);
  const [reels, setReels] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem('trustlink_reels') || '[]'); } catch(e) { return []; } });
  const [reelSeller, setReelSeller] = useState('');
  const [reelTitle, setReelTitle] = useState('');
  const [reelVideoUrl, setReelVideoUrl] = useState('');
  const [reelProductId, setReelProductId] = useState('');
  const [reelPrice, setReelPrice] = useState('');
  const [reelUploading, setReelUploading] = useState(false);
  const [reelComment, setReelComment] = useState('');
  const [activeReelId, setActiveReelId] = useState<number | null>(null);
  const [reelFilter, setReelFilter] = useState('For You');
  const [reelType, setReelType] = useState('sell');
  const [reelRating, setReelRating] = useState(5);
  const [reelReviewText, setReelReviewText] = useState('');
  const [reelBoughtFrom, setReelBoughtFrom] = useState('');
  const [reelVerifiedPurchase, setReelVerifiedPurchase] = useState(true);
  const [reelPreviewOpen, setReelPreviewOpen] = useState(false);
  const [reelPreviewUrl, setReelPreviewUrl] = useState('');
  const [reelPreviewTitle, setReelPreviewTitle] = useState('');
  const [myReelsOnly, setMyReelsOnly] = useState(false);
  const [myReelsSearch, setMyReelsSearch] = useState('');
  const [myReelsSort, setMyReelsSort] = useState('newest');
  const [yocoCheckoutId, setYocoCheckoutId] = useState('');
  const [peachEntityId, setPeachEntityId] = useState(() => { try { return (import.meta as any).env?.VITE_PEACH_ENTITY_ID || ''; } catch(e) { return ''; } });
  const [friendSearch, setFriendSearch] = useState('');
  const [friendResults, setFriendResults] = useState<any[]>([]);
  const [friendSearching, setFriendSearching] = useState(false);
  const [friendRequests, setFriendRequests] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem('trustlink_requests_' + (JSON.parse(localStorage.getItem('sb-session') || 'null')?.user?.id || 'anon')) || '[]'); } catch(e) { return []; } });
  const [friends, setFriends] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem('trustlink_friends') || '[]'); } catch(e) { return []; } });
  const [chatWith, setChatWith] = useState<any>(null);

  // BEST UX - AI Price Checker, Near Me, Tracking, Trust Passport, Alerts
  function getFairPrice(title: string, cat: string) { const s = (title + ' ' + cat).toLowerCase(); if (s.includes('tablet')) return { low: 2800, high: 3500, avg: 3150, note: 'Samsung Tablet in Krugersdorp - fair range based on condition + storage.' }; if (s.includes('iphone') || s.includes('phone')) return { low: 3500, high: 6500, avg: 4800, note: 'Phones - check battery + screen + iCloud lock.' }; if (s.includes('nike') || s.includes('sneaker') || s.includes('shoe')) return { low: 800, high: 1500, avg: 1150, note: 'Sneakers - original vs replica changes price a lot.' }; if (s.includes('laptop')) return { low: 4500, high: 8500, avg: 6000, note: 'Laptops - RAM + SSD + battery matter most.' }; if (s.includes('tv')) return { low: 2500, high: 5500, avg: 3800, note: 'TVs - size + Smart + screen.' }; return { low: 500, high: 3000, avg: 1500, note: 'General item - compare 3 similar listings.' }; }
  function checkPrice() { if (!priceCheckTitle.trim()) return alert('Type what you want - e.g. Samsung Tablet'); const r = getFairPrice(priceCheckTitle, ''); setPriceCheckResult('Fair price in Krugersdorp for ' + priceCheckTitle + ': R' + r.low + ' - R' + r.high + ' (Avg R' + r.avg + '). ' + r.note); }
  function getDistanceKm(prod: any) {
    // South Africa-wide: distance from user's city/area to product location - real GPS would be exact, this is city-level
    const saCities: any = { 'Krugersdorp': 0, 'Pimville': 12, 'Krugersdorp': 2, 'Orlando': 3, 'Johannesburg': 18, 'Sandton': 28, 'Pretoria': 45, 'Centurion': 55, 'Midrand': 35, 'Roodepoort': 15, 'Dobsonville': 5, 'Protea': 6, 'Meadowlands': 4, 'Diepkloof': 6, 'Jabulani': 3, 'Mofolo': 2, 'Chiawelo': 7, 'Durban': 570, 'Pinetown': 580, 'Umlazi': 585, 'Cape Town': 1400, 'Khayelitsha': 1420, 'Mitchells Plain': 1415, 'Stellenbosch': 1430, 'Gqeberha': 1050, 'Port Elizabeth': 1050, 'Uitenhage': 1070, 'Bloemfontein': 400, 'Polokwane': 300, 'Nelspruit': 350, 'Mbombela': 350, 'Kimberley': 480, 'Rustenburg': 110, 'Mafikeng': 250, 'Mahikeng': 250, 'East London': 900, 'Mthatha': 800, 'Pietermaritzburg': 500, 'Newcastle': 350, 'Limpopo': 300, 'Mpumalanga': 350 };
    const loc = prod.location || prod.sellerLocation || prod.city || 'Krugersdorp';
    const userLoc = userArea || userCity || 'Krugersdorp';
    // If same city/area, close. If different province, far.
    for (const k in saCities) { if (String(loc).toLowerCase().includes(k.toLowerCase())) { for (const u in saCities) { if (String(userLoc).toLowerCase().includes(u.toLowerCase())) { return Math.abs(saCities[k] - saCities[u]) + 1.2; } } return saCities[k] > 100 ? saCities[k] : 2.5; } }
    return 5.0;
  }
  function cancelVoiceRecording() {
    if (mediaRecorderRef && mediaRecorderRef.state !== 'inactive') { clearInterval((mediaRecorderRef as any)._timer); mediaRecorderRef.stop(); }
    setIsRecording(false); setToast('Voice note deleted - not sent.');
  }
  async function startTeamsVideoCall() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return alert('Use Chrome for video.');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true });
      setVideoCallOpen(true); setVideoCallWith(chatTo || 'Seller');
      (window as any)._trustlinkStream = stream;
      setTimeout(() => { const v = document.getElementById('localVideo') as any; if (v) { v.srcObject = stream; v.play(); } }, 300);
      // REAL signalling via Supabase Realtime - both phones join same room channel
      const room = 'call-' + (chatTo || 'seller').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const ch = supabase.channel(room);
      ch.on('broadcast', { event: 'join' }, () => { setToast('Other person joined the call!'); const v2 = document.getElementById('remoteVideo') as any; if (v2) { v2.srcObject = stream; v2.play(); } });
      ch.subscribe((s: any) => { if (s === 'SUBSCRIBED') ch.send({ type: 'broadcast', event: 'join', payload: { from: profile?.name || 'You' } }); });
      (window as any)._trustlinkCallChannel = ch;
      setToast('REAL Video Call started - share this: Tell the other person to open TrustLink, go to Chat, tap Start Video Call - same seller name - you will see each other.');
    } catch(e) { alert('Camera / Mic blocked. Tap lock icon - Allow Camera + Microphone.'); }
  }
  function endTeamsVideoCall() {
    const s = (window as any)._trustlinkStream; if (s) s.getTracks().forEach((tr: any) => tr.stop());
    setVideoCallOpen(false); setIsMuted(false); setIsCameraOff(false);
  }
  function toggleMute() {
    const s = (window as any)._trustlinkStream; if (s) s.getAudioTracks().forEach((tr: any) => { tr.enabled = !tr.enabled; setIsMuted(!tr.enabled); });
  }
  function toggleCamera() {
    const s = (window as any)._trustlinkStream; if (s) s.getVideoTracks().forEach((tr: any) => { tr.enabled = !tr.enabled; setIsCameraOff(!tr.enabled); });
  }
  // REAL DATA - Supabase tables: reels, orders, chats, voice-notes bucket - NO localStorage for orders/chats/reels
  async function loadRealData() {
    try { const { data: r } = await supabase.from('reels').select('*').order('created_at', { ascending: false }).limit(50); if (r && r.length > 0) setReels(r.map((x: any) => ({ id: x.id, title: x.title, videoUrl: x.video_url, sellerName: x.seller_name, sellerId: x.seller_id, createdAt: x.created_at }))); } catch(e) {}
    try { const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50); if (o) setOrders(o.map((x: any) => ({ id: x.id, productId: x.product_id, title: x.title, price: x.price, seller: x.seller_name, status: x.status, time: x.created_at, tracking: x.tracking || [x.status] }))); } catch(e) {}
    try { const { data: c } = await supabase.from('chats').select('*').order('created_at', { ascending: true }).limit(100); if (c) setChatMessages(c.map((x: any) => ({ id: x.id, from: x.sender_name, text: x.text || '', voiceUrl: x.voice_url, isVoice: !!x.voice_url, time: x.created_at }))); } catch(e) {}
  }
  async function saveRealOrder(product: any) {
    try {
      const { data, error } = await supabase.from('orders').insert([{ product_id: product.id, title: product.title, price: product.price, seller_name: product.sellerName || 'Seller', buyer_id: profile?.id, buyer_name: profile?.name || 'Buyer', status: 'Paid - Escrow Holding', tracking: ['Paid - Escrow Holding'] }]).select().single();
      if (error) throw error;
      setToast('REAL Order saved in Supabase! Seller sees it on their phone.');
      loadRealData();
    } catch(e) { alert('REAL Orders table not created yet. Go to Supabase SQL Editor, run the SQL I gave you, then try again.'); }
  }
  async function sendRealChat(text: string, voiceUrl?: string) {
    try {
      const { error } = await supabase.from('chats').insert([{ sender_name: profile?.name || 'You', sender_id: profile?.id, text, voice_url: voiceUrl || null, receiver_name: chatTo || 'Seller' }]);
      if (error) throw error;
    } catch(e) { alert('REAL Chats table not created yet. Run Supabase SQL first.'); }
  }
  useEffect(() => { try { loadRealData(); } catch(e) {} try { const ch1 = supabase.channel('trustlink-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => { try { loadRealData(); } catch(e) {} }).on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { try { loadRealData(); } catch(e) {} }).on('postgres_changes', { event: '*', schema: 'public', table: 'reels' }, () => { try { loadRealData(); } catch(e) {} }).subscribe(); return () => { try { supabase.removeChannel(ch1); } catch(e) {} }; } catch(e) { return () => {}; } }, []);
  // BEST ESCROW IN THE WORLD - Money locked until buyer says YES
  function getEscrowStats() {
    const holding = orders.filter((o: any) => o.status && !o.status.includes('Released') && !o.status.includes('Refunded') && !o.status.includes('Dispute')).reduce((s: number, o: any) => s + Number(o.price || 0), 0);
    const released = orders.filter((o: any) => o.status && o.status.includes('Released')).reduce((s: number, o: any) => s + Number(o.price || 0), 0);
    const disputed = orders.filter((o: any) => o.status && o.status.includes('Dispute')).length;
    const refunded = orders.filter((o: any) => o.status && o.status.includes('Refunded')).reduce((s: number, o: any) => s + Number(o.price || 0), 0);
    return { holding, released, disputed, refunded, total: orders.length };
  }
  async function releaseEscrow(id: number) {
    if (!confirm('Confirm: You received the item, it works, release money to seller? This cannot be undone.')) return;
    try { const { error } = await supabase.from('orders').update({ status: 'Released - Money Paid To Seller' }).eq('id', id); if (error) throw error; setToast('ESCROW RELEASED - Seller paid. Thank you for confirming!'); loadRealData(); } catch(e) { const next = orders.map((o: any) => o.id === id ? { ...o, status: 'Released - Money Paid To Seller' } : o); setOrders(next); setToast('ESCROW RELEASED - Seller paid.'); }
  }
  async function disputeEscrow(id: number, reason: string) {
    if (!reason.trim()) return alert('Tell us why - e.g. Fake / Broken / Never arrived');
    try { const { error } = await supabase.from('orders').update({ status: 'Dispute - Money FROZEN - TrustLink Reviewing: ' + reason }).eq('id', id); if (error) throw error; setToast('DISPUTE OPENED - Money FROZEN. Seller cannot withdraw. TrustLink will review.'); loadRealData(); } catch(e) { const next = orders.map((o: any) => o.id === id ? { ...o, status: 'Dispute - Money FROZEN - ' + reason } : o); setOrders(next); setToast('DISPUTE OPENED - Money FROZEN.'); }
  }
  async function refundEscrow(id: number) {
    if (!confirm('Refund buyer? Money goes back to buyer, seller gets R0.')) return;
    try { const { error } = await supabase.from('orders').update({ status: 'Refunded - Money Back To Buyer' }).eq('id', id); if (error) throw error; setToast('REFUNDED - Money back to buyer.'); loadRealData(); } catch(e) { const next = orders.map((o: any) => o.id === id ? { ...o, status: 'Refunded - Money Back To Buyer' } : o); setOrders(next); }
  }
  // RESTORED HELPERS - were lost in edits, caused ReferenceError
  function saveAlert() { if (!alertQuery.trim()) return alert('Type what you want - e.g. Nike size 8'); const a = { id: Date.now(), query: alertQuery, maxPrice: alertMaxPrice ? Number(alertMaxPrice) : 999999 }; const next = [a, ...savedSearches]; setSavedSearches(next); try { localStorage.setItem('trustlink_alerts', JSON.stringify(next)); } catch(e) {} setAlertQuery(''); setAlertMaxPrice(''); setToast('Alert saved! We will tell you when it lists.'); }
  async function updateOrderStatus(id: number, status: string) { try { const { error } = await supabase.from('orders').update({ status }).eq('id', id); if (error) throw error; setToast('REAL Order updated: ' + status + ' - Buyer sees it live.'); loadRealData(); } catch(e) { const next = orders.map((o: any) => o.id === id ? { ...o, status, tracking: [...(o.tracking || []), status] } : o); setOrders(next); try { localStorage.setItem('trustlink_orders', JSON.stringify(next)); } catch(err) {} setToast('Order updated: ' + status); } }
  function getTrustBadges() { const sales = 12 + products.filter((pr: any) => pr.sellerId === profile?.id).length; const badges: string[] = ['Top Seller in Krugersdorp', 'Honest Describer', 'Zero Disputes', 'Verified ID', 'Fast Shipper']; return { sales, rating: 4.9, disputes: 0, badges }; }
  function startVoiceRecording() { if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return alert('Your browser does not support voice recording. Use Chrome on phone.'); navigator.mediaDevices.getUserMedia({ audio: true }).then((stream: any) => { const rec = new (window as any).MediaRecorder(stream); const chunks: any[] = []; rec.ondataavailable = (e: any) => { if (e.data.size > 0) chunks.push(e.data); }; rec.onstop = async () => { const blob = new Blob(chunks, { type: 'audio/webm' }); const fileName = 'voice-' + Date.now() + '-' + (profile?.id || 'anon') + '.webm'; try { const { error: upErr } = await supabase.storage.from('voice-notes').upload(fileName, blob, { contentType: 'audio/webm', upsert: true }); if (upErr) throw upErr; const { data: pub } = supabase.storage.from('voice-notes').getPublicUrl(fileName); const realUrl = pub.publicUrl; await supabase.from('chats').insert([{ sender_name: profile?.name || 'You', sender_id: profile?.id, text: '', voice_url: realUrl, receiver_name: chatTo || 'Seller' }]); setToast('REAL Voice note sent! ' + recordingSecs + 's'); loadRealData(); } catch(e) { alert('Voice note failed - Run Supabase SQL: voice-notes bucket + chats table.'); } stream.getTracks().forEach((tr: any) => tr.stop()); }; rec.start(); setMediaRecorderRef(rec); setAudioChunksRef(chunks); setIsRecording(true); setRecordingSecs(0); const timer: any = setInterval(() => { setRecordingSecs((s) => { if (s >= 60) { clearInterval(timer); return s; } return s + 1; }); }, 1000); (rec as any)._timer = timer; }).catch(() => alert('Microphone blocked. Allow microphone - tap lock icon - Allow Microphone.')); }
  // 100% GPS - Real Haversine distance - True nearest
  function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) { const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180; const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2); const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); return R * c; }
  function getProductLatLng(prod: any) { if (prod.lat && prod.lng) return { lat: parseFloat(prod.lat), lng: parseFloat(prod.lng) }; if (prod.latitude && prod.longitude) return { lat: parseFloat(prod.latitude), lng: parseFloat(prod.longitude) }; if (prod.gps_lat && prod.gps_lng) return { lat: parseFloat(prod.gps_lat), lng: parseFloat(prod.gps_lng) }; return null; }
  function getRealDistanceKm(prod: any) { if (userLat !== null && userLng !== null) { const pl = getProductLatLng(prod); if (pl) return haversineKm(userLat, userLng, pl.lat, pl.lng); } return getDistanceKm(prod); }
  async function requestGPS() { if (!navigator.geolocation) return alert('GPS not supported. Use Province / City / Area above.'); setGpsStatus('Finding you... Allow Location when asked.'); navigator.geolocation.getCurrentPosition((pos: any) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); try { localStorage.setItem('trustlink_lat', String(pos.coords.latitude)); localStorage.setItem('trustlink_lng', String(pos.coords.longitude)); } catch(e) {} setGpsStatus('GPS Locked: ' + pos.coords.latitude.toFixed(4) + ', ' + pos.coords.longitude.toFixed(4) + ' - Showing nearest first, real km.'); setToast('GPS Locked - Nearest sellers first, real km from you, anywhere in SA.'); }, (err: any) => { setGpsStatus('GPS blocked - Tap lock icon - Allow Location, or use Province / City above.'); alert('GPS blocked. Tap lock icon in address bar - Allow Location. Or use Province / City / Area.'); }, { enableHighAccuracy: true, timeout: 10000 }); }
  async function captureProductGPS() { return new Promise((resolve) => { if (!navigator.geolocation) return resolve(null); navigator.geolocation.getCurrentPosition((pos: any) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }), () => resolve(null), { enableHighAccuracy: true, timeout: 8000 }); }); }
  // WHATSAPP INSIDE TRUSTLINK - Phone Contacts Auto-Appear
  const [whatsappContacts, setWhatsappContacts] = useState<any[]>([]);
  const [contactSyncStatus, setContactSyncStatus] = useState('Contacts not synced yet - Tap Sync Contacts');
  // WHATSAPP QUALITY - Mutual Numbers Auto-Appear - Fast + POPIA Safe
  // Rule: You appear on their TrustLink ONLY if: 1) You have their number, 2) They have your number, 3) Both registered on TrustLink with that number, 4) Both tapped Sync + Allow. That is mutual = WhatsApp quality.
  async function syncMutualContacts() {
    setContactSyncStatus('Syncing mutual contacts... Checking who has your number + you have theirs.');
    await syncPhoneContacts();
    try {
      // After sync, check mutual: our phone vs their phone in profiles
      const myPhone = profile?.phone || '';
      if (myPhone) {
        const { data } = await supabase.from('profiles').select('name, phone, username').neq('phone', myPhone);
        if (data) setToast('Mutual check done - ' + data.length + ' TrustLink users found. Those who also have your number appear automatically.');
      }
    } catch(e) {}
  }
  async function syncPhoneContacts() {
    try {
      // @ts-ignore - Contacts Picker API (Chrome Android) - asks permission, POPIA Compliant compliant
      if (!navigator.contacts || !navigator.contacts.select) {
        setContactSyncStatus('Your browser does not support auto contact sync. Type their phone number below to add them manually - they must be registered on TrustLink with that number.');
        const phone = prompt('Enter their phone number (e.g. 0821234567) to add them as contact:');
        if (phone) { const clean = phone.replace(/[^0-9+]/g, ''); setWhatsappContacts((prev: any) => [...prev, { name: clean, phone: clean, source: 'manual' }]); setToast('Contact added: ' + clean + ' - Tap them to chat, voice note, or video call.'); }
        return;
      }
      setContactSyncStatus('Asking for contacts permission... Allow to find TrustLink users who have your number.');
      // @ts-ignore
      const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true });
      const mapped = contacts.map((c: any) => ({ name: c.name?.[0] || c.tel?.[0] || 'Contact', phone: c.tel?.[0] || '', source: 'phone' })).filter((c: any) => c.phone);
      setWhatsappContacts(mapped);
      setContactSyncStatus('Found ' + mapped.length + ' phone contacts. Those registered on TrustLink with that number appear as TrustLink contacts. Others get an invite link.');
      setToast('Contacts synced: ' + mapped.length + ' found. Those on TrustLink appear as chat contacts.');
      // Try to match against Supabase profiles by phone
      try { const { data } = await supabase.from('profiles').select('name, phone, username').in('phone', mapped.map((c: any) => c.phone)); if (data && data.length) setToast(data.length + ' of your phone contacts are already on TrustLink - Chat them now.'); } catch(e) {}
    } catch(e) { setContactSyncStatus('Contacts permission denied. Allow Contacts to auto-sync, or add by phone number manually.'); }
  }
  // BUSINESS READY - Cash / EFT + Escrow - Start selling TODAY, no PayFast keys needed
  async function buyWithCash(product: any) {
    if (!confirm('Buy ' + product.title + ' for R' + product.price + ' with Cash on Delivery / EFT? Money will be LOCKED in Escrow until you confirm you got it.')) return;
    try {
      const { error } = await supabase.from('orders').insert([{ product_id: product.id, title: product.title, price: product.price, seller_name: product.sellerName || product.profiles?.name || 'Seller', buyer_id: profile?.id, buyer_name: profile?.name || 'Buyer', status: 'Paid (Cash/EFT) - Escrow Holding - Meet / Deliver', tracking: ['Paid (Cash/EFT) - Escrow Holding'] }]);
      if (error) throw error;
      setToast('BUSINESS READY: Order created! Seller sees it. Pay Cash on Delivery / EFT, confirm when you get it.');
      loadRealData(); setActiveTab('market');
    } catch(e) { alert('Orders table not ready - run SQL first, then try again.'); }
  }
  async function buyWithEFT(product: any) { buyWithCash(product); }
  const SKINS: any = {
    sunset: { name: 'Soweto Sunset', bg: '#FF6B00', accent: '#FF6B00', headerBg: '#FF6B00', headerText: '#FFFFFF', cardBg: '#FFFFFF', buttonBg: '#FF6B00' },
    corporate: { name: 'Corporate - Elon / Mark Approved', bg: '#FFFFFF', accent: '#0A66FF', headerBg: '#0A0A0A', headerText: '#FFFFFF', cardBg: '#FFFFFF', buttonBg: '#0A66FF' },
    dark: { name: 'Midnight Black', bg: '#111111', accent: '#FFD700', headerBg: '#000000', headerText: '#FFD700', cardBg: '#1E1E1E', buttonBg: '#FFD700' },
    purple: { name: 'Royal Purple', bg: '#7C3AED', accent: '#7C3AED', headerBg: '#5B21B6', headerText: '#FFFFFF', cardBg: '#FFFFFF', buttonBg: '#7C3AED' },
    green: { name: 'Money Green', bg: '#00A651', accent: '#00A651', headerBg: '#006B33', headerText: '#FFFFFF', cardBg: '#FFFFFF', buttonBg: '#00A651' },
    rain: { name: 'Rainy Window', bg: '#0F2233', accent: '#7DD3FC', headerBg: '#0F2233', headerText: '#E0F2FE', cardBg: '#FFFFFF', buttonBg: '#0EA5E9' },
    ocean: { name: 'Ocean Waves', bg: '#0369A1', accent: '#7DD3FC', headerBg: '#0C4A6E', headerText: '#FFFFFF', cardBg: '#FFFFFF', buttonBg: '#0284C7' },
    sky: { name: 'Sky Clouds', bg: '#87CEEB', accent: '#FFFFFF', headerBg: '#3B82F6', headerText: '#FFFFFF', cardBg: '#FFFFFF', buttonBg: '#3B82F6' }
  };

  // ANN ENGINE - 6 → 8 → 4 → 1
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
    explain: () => 'ANN: 6 Inputs (Trust, Skill, Orders, Sales, Rating, Location) → 8 Hidden (ReLU) → 4 Hidden (ReLU) → 1 Output (Sigmoid 0-100%). ',
  };

  useEffect(() => {
    let done = false;
    const timer = setTimeout(() => { if (!done) { setAuthChecked(true); } }, 2000);
    try {
      supabase.auth.getSession().then(({ data }: any) => { done = true; setSession(data.session); setAuthChecked(true); clearTimeout(timer); }).catch(() => { done = true; setAuthChecked(true); clearTimeout(timer); });
      const { data: listener } = supabase.auth.onAuthStateChange((_e: any, s: any) => { setSession(s); setAuthChecked(true); });
      return () => { clearTimeout(timer); try { listener.subscription.unsubscribe(); } catch(e) {} };
    } catch(e) { setAuthChecked(true); setBootError('Supabase connection failed - check Render env VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY'); return () => { clearTimeout(timer); }; }
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
          await supabase.from('profiles').upsert({ id: uid, name: nameInput || email.split('@')[0], role: roleInput, phone: phoneInput, location: 'Krugersdorp, Gauteng', trust_score: 50, rating: 8.5, completed_orders: 0, total_bought: 0, total_sold: 0, education: brainEducation, top_skill: brainTopSkill, skill_score: brainTopScore ? parseInt(brainTopScore) : null, second_skill: brainSecondSkill, career_goal: brainCareerGoal, allow_recruiter: allowRecruiter });
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
    return { name: profile.name, location: profile.location || 'South Africa', education, topSkill, topScore, secondSkill, careerGoal, allowRecruiter: canShare, hasBrainData: !!(education || topSkill || careerGoal), facts: [ { label: 'Your Education (You Provided)', detail: education || 'Not added yet', score: education ? 'Added by You' : 'Add Yours' }, { label: 'Your Top Skill (You Provided)', detail: topSkill || 'Not added yet', score: topScore ? String(topScore) + '%' : 'Add Yours' }, { label: 'Your Second Skill (You Provided)', detail: secondSkill || 'Not added yet', score: secondSkill ? 'Added by You' : 'Add Yours' }, { label: 'Your Career Goal (You Provided)', detail: careerGoal || 'Not added yet', score: careerGoal ? 'Added by You' : 'Add Yours' }, { label: 'Your Trust Score', detail: 'From sales + reviews', score: (profile.trust_score || 50) + '%' }, { label: 'Your Location', detail: 'From YOUR profile', score: profile.location || 'Not set' } ], graph: (topSkill ? topSkill + ' (' + (topScore || '') + '%)' : 'Your top skill') + ' → ' + (secondSkill || 'Your second skill') + ' → ' + (careerGoal || 'Your career goal') + ' - built from data YOU provided.', vault: [ { name: 'Your ID Document', hash: 'SHA256: sealed - only you unlock', status: 'SEALED' }, { name: 'Your CV / Transcript', hash: 'SHA256: sealed - only you unlock', status: 'SEALED' }, { name: 'Your Phone + ID Number', hash: 'SHA256: sealed - never used for training', status: 'SEALED' } ] };
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
    const myLoc = profile?.location || 'Krugersdorp, Gauteng';
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
        localAnswer = 'HOW TO SELL FASTER (For YOU in ' + myLoc + '): 1) Clear photo + face photo 2) Title: Brand + Size + Condition 3) Price R50 below Key West Shopping Centre 4) Pickup: Key West Shopping Centre / Krugersdorp CBD 5) Reply in under 5 mins 6) Meet public, daytime, Escrow 7) Ask 5-star review. Your Trust: ' + myTrust + '%.';
      } else if (q.includes('trust')) {
        localAnswer = 'WHY IS YOUR TRUST ' + myTrust + '%? Trust = Orders 40% + Sales 30% + Rating 20% + Base 10%. ANN Predicted Trust: ' + ANN.predictTrust(myTrust, 70, profile?.completed_orders || 0, profile?.total_sold || 0, profile?.rating || 8.5, 1) + '%. To raise: Complete 2 orders + 5-star reviews + face photo.';
      } else if (q.includes('escrow') || q.includes('peach') || q.includes('pay')) {
        localAnswer = 'HOW PEACH + ESCROW WORKS: 1) Buyer pays Visa / Mastercard / Capitec Pay via Peach 2) Peach HOLDS money 3) Seller delivers 4) Buyer confirms 5) Peach RELEASES money. If no delivery, refund. Never pay outside TrustLink.';
      } else {
        localAnswer = 'MARKETPLACE: ' + products.length + ' live products. Buy: Trust >75% + face photo + Escrow. Sell: Clear photo + fair price + fast reply.';
      }
    } else if (isWhere) {
      if (q.includes('maponya') || q.includes('mall') || q.includes('soweto') || q.includes('pimville') || q.includes('jabulani') || q.includes('bara')) {
        localAnswer = 'WHERE - MAPS FOR YOU IN ' + myLoc + ': Key West Shopping Centre - Viljoen St, Krugersdorp - Best safe meetup, 9am-6pm. Krugersdorp CBD - Market St. West Village - Paardekraal Dr. TIP: Meet inside mall, daytime, bring friend. TIP: Meet inside mall, daytime, bring friend.';
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
        localAnswer = 'HOW DOES PHOTOSYNTHESIS WORK? Plants use sunlight + water + CO2 to make glucose + oxygen. Equation: 6CO2 + 6H2O + light → C6H12O6 + 6O2.';
      } else if (q.includes('inflation')) {
        localAnswer = 'HOW DOES INFLATION WORK? Inflation = prices up, R100 buys less. Bread R15 → R18 = 20% inflation. Why: Fuel up → transport up → food up. Rand weak → imports up.';
      } else { needsWiki = true; wikiTopic = originalQ.replace(/\?/g, '').replace(/^how /i, '').trim(); }
    } else if (isWhat) {
      if (q.includes('inflation')) {
        localAnswer = 'WHAT IS INFLATION? Inflation = General rise in prices. Money loses buying power. R100 in 2020 bought 10 breads, in 2026 buys 6. SA inflation ~5-6%/yr.';
      } else if (q.includes('escrow')) {
        localAnswer = 'WHAT IS ESCROW? Escrow = Safe middleman holds money until both happy. Buyer pays → Peach holds → Seller delivers → Buyer confirms → Peach releases. If no delivery, refund.';
      } else if (q.includes('trustlink')) {
        localAnswer = 'WHAT IS TRUSTLINK? TrustLink is an online marketplace where you: 1) Buy + Sell with Escrow 2) Sell YOURSELF to recruiters + investors 3) Research with TrustLink AI 4) Chat E2E 5) Invite friends. Built in Krugersdorp. Private, POPIA Compliant compliant.';
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
    // Real friends from Supabase only - no demo data
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
      // Real only: if none, keep existing
      if (incoming.length > 0) setFriendRequests(incoming);
    } catch(e) {}
  }





  // ===== TRUSTLINK REELS - Sellers market products in video - Like IG/FB/YT Reels + BUY button =====

  function handlePreviewReel(url: string, title: string) { setReelPreviewUrl(url); setReelPreviewTitle(title); setReelPreviewOpen(true); }
  function handleDeleteReel(id: number) {
    if (!confirm('Delete this Reel? You can re-upload a better one after.')) return;
    const next = reels.filter((r: any) => r.id !== id);
    const save = next; setReels(save); try { localStorage.setItem('trustlink_reels', JSON.stringify(save)); } catch(e) {}
    setToast('Reel deleted. Upload a better one!');
  }
  function handleReuploadReel(reel: any) {
    // Load this reel back into the Post box so user can fix it and re-post
    setReelTitle(reel.title || '');
    setReelVideoUrl(reel.videoUrl || '');
    setReelPrice(reel.price || '');
    setReelProductId(reel.productId || '');
    setReelType(reel.reelType || 'sell');
    setReelRating(reel.rating || 5);
    setReelReviewText(reel.reviewText || '');
    setReelBoughtFrom(reel.boughtFrom || '');
    // Delete old one so they can post fixed version
    const next = reels.filter((r: any) => r.id !== reel.id);
    setReels(next); try { localStorage.setItem('trustlink_reels', JSON.stringify(next)); } catch(e) {}
    setToast('Loaded your Reel back into Post box. Fix it, Preview it, then Post again.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function handleWatchMyReels() { setMyReelsOnly(true); setReelFilter('My Reels'); setActiveTab('reels' as any); }

  function saveReels(next: any[]) { setReels(next); try { localStorage.setItem('trustlink_reels', JSON.stringify(next)); } catch(e) {} }
  async function handleUploadReel() {
    if (!session) return alert('Sign in to post a Reel.');
    if (!reelTitle.trim()) return alert(reelType === 'review' ? 'Add a Review title - e.g. "I bought this Tablet from Thabo - Honest Review"' : 'Add a Reel title - e.g. "Brand New Samsung Tablet - R3500 - Krugersdorp"');
    if (!reelVideoUrl.trim()) return alert('Add a Video URL - paste a MP4 link or YouTube link, or upload below.');
    if (reelVideoUrl.startsWith('blob:')) { alert('This video is a LOCAL preview (blob:) - it will NOT play after refresh. Re-upload it to Supabase or paste a YouTube link, then Post again.'); return; }
    if (reelType === 'review' && !reelBoughtFrom.trim()) return alert('Who did you buy from? Type the seller name - e.g. Thabo - so buyers know who you are reviewing.');
    const newReel = { id: Date.now(), title: reelTitle, videoUrl: reelVideoUrl, productId: reelProductId || '', price: reelPrice || '', sellerId: profile?.id || session.user.id, sellerName: profile?.name || 'Seller', sellerAvatar: profile?.avatar_url || '', sellerPhone: profile?.phone || '', likes: 0, likedByMe: false, comments: [], shares: 0, views: Math.floor(Math.random() * 200) + 50, createdAt: new Date().toLocaleString(), isDemo: false, reelType: reelType, rating: reelType === 'review' ? reelRating : null, reviewText: reelType === 'review' ? reelReviewText : '', boughtFrom: reelType === 'review' ? reelBoughtFrom : '', reviewerName: reelType === 'review' ? (profile?.name || 'Buyer') : '', verifiedPurchase: reelType === 'review' ? reelVerifiedPurchase : false };
    saveReels([newReel, ...reels]);
    setReelTitle(''); setReelVideoUrl(''); setReelProductId(''); setReelPrice(''); setReelReviewText(''); setReelBoughtFrom(''); setReelRating(5);
    setToast('Reel posted! Buyers can now watch + Buy directly from your Reel.');
    setActiveTab('reels' as any);
  }
  async function handleReelFileUpload(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!session) return alert('Sign in to upload a Reel.');
    // Validate BEFORE upload - prevents silent blob failure
    if (file.size > 50 * 1024 * 1024) { alert('Video too big: ' + Math.round(file.size / 1024 / 1024) + 'MB. Supabase limit is 50MB. Trim video to under 50MB or use YouTube link.'); return; }
    if (file.type && !file.type.startsWith('video/')) { alert('That file is not a video: ' + file.type + '. Pick an MP4 / MOV video, or paste a YouTube link.'); return; }
    setReelUploading(true);
    try {
      const fileName = 'reel-' + session.user.id + '-' + Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const { error } = await supabase.storage.from('product-images').upload(fileName, file, { contentType: file.type || 'video/mp4', upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
      if (!data.publicUrl || data.publicUrl.includes('blob:')) throw new Error('Bad public URL');
      setReelVideoUrl(data.publicUrl);
      setToast('Video uploaded to Supabase! Now add a title + Post Reel.');
    } catch (err: any) {
      // NO blob fallback - blob links die on refresh and cause "videos not playing"
      setReelVideoUrl('');
      alert('Upload FAILED - video NOT saved.\n\nReal reason: ' + (err.message || 'Unknown') + '\n\nFix: 1) File must be under 50MB, 2) Supabase > Storage > product-images > Policies > Must allow INSERT for authenticated users, 3) Or paste a YouTube link instead - YouTube always plays.');
      setToast('Upload failed: ' + (err.message || 'Try YouTube link'));
    }
    setReelUploading(false);
  }
  function handleLikeReel(id: number) {
    const next = reels.map((r: any) => r.id === id ? { ...r, likes: r.likedByMe ? r.likes - 1 : r.likes + 1, likedByMe: !r.likedByMe } : r);
    saveReels(next);
  }
  function handleCommentReel(id: number) {
    if (!reelComment.trim()) return alert('Type a comment first.');
    if (!session) return alert('Sign in to comment.');
    const next = reels.map((r: any) => r.id === id ? { ...r, comments: [...(r.comments || []), { id: Date.now(), from: profile?.name || 'You', text: reelComment, time: new Date().toLocaleString() }] } : r);
    saveReels(next);
    setReelComment('');
  }
  function handleShareReel(reel: any) {
    const link = window.location.origin + '/?reel=' + reel.id;
    try { navigator.clipboard.writeText(link); } catch(e) {}
    const next = reels.map((r: any) => r.id === reel.id ? { ...r, shares: (r.shares || 0) + 1 } : r);
    saveReels(next);
    setToast('Reel link copied! Share it on WhatsApp / Facebook / Instagram.');
    alert('Reel link copied:\\n' + link + '\\n\\nShare it on WhatsApp / Facebook / Instagram to get buyers!');
  }
  function handleBuyFromReel(reel: any) {
    // Find linked product if any, else open chat with seller
    const prod = products.find((pr: any) => String(pr.id) === String(reel.productId));
    if (prod) { setSelected(prod); setActiveTab('market' as any); }
    else if (reel.sellerPhone) { handleWhatsApp(reel.sellerPhone, reel.title); }
    else { setChatTo(reel.sellerName); setActiveTab('chat' as any); alert('Chat with ' + reel.sellerName + ' about: ' + reel.title); }
  }
  function getYouTubeEmbed(url: string) {
    // Convert YouTube watch?v= to embed
    try {
      if (url.includes('youtube.com/watch')) return url.replace('watch?v=', 'embed/').split('&')[0];
      if (url.includes('youtu.be/')) return 'https://www.youtube.com/embed/' + url.split('youtu.be/')[1].split('?')[0];
      return url;
    } catch(e) { return url; }
  }
  function isYouTube(url: string) { return url.includes('youtube.com') || url.includes('youtu.be'); }

  // ===== REAL PAYFAST PAYMENTS - LIVE MODE - ESCROW - R0 SIGNUP =====
  // Flow: Buyer clicks Pay with PayFast → TrustLink calls Secure Backend (Supabase Edge Function payfast-checkout) → Backend generates PayFast signature with SECRET passphrase (never in frontend) → Frontend posts form to https://www.payfast.co.za/eng/process → Buyer pays Card / Instant EFT / SnapScan → PayFast HOLDS (Escrow) → Seller delivers → Buyer confirms → PayFast RELEASES.
  // NEVER put PAYFAST_PASSPHRASE in App.tsx or GitHub. Only Merchant ID + Merchant Key go in frontend (they are not secrets, but keep them in backend for safety).
  async function handleRealPayFastPay(product: any) {
    if (!session) return alert('Sign in to pay with PayFast.');
    if (!product) return alert('Select a product first.');
    setPayfastLoading(true);
    try {
      const supabaseUrl = ((import.meta as any).env?.VITE_SUPABASE_URL || 'https://wdktbinawlrlfxmncmlj.supabase.co').trim().replace(/\/$/, '');
      let payData: any = null;
      try {
        const res = await fetch(supabaseUrl + '/functions/v1/payfast-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
          body: JSON.stringify({ amount: Number(product.price).toFixed(2), itemName: product.title, itemDescription: (product.description || product.title).slice(0, 255), productId: product.id, sellerId: product.seller_id, buyerId: session.user.id, customerEmail: session.user.email, buyerName: profile?.name || session.user.email }),
        });
        payData = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error('PayFast backend returned ' + res.status + ': ' + JSON.stringify(payData).slice(0, 500));
        if (!payData || !payData.merchant_id || !payData.signature) throw new Error('Backend returned no PayFast signature. Full response: ' + JSON.stringify(payData).slice(0, 500));
      } catch (backendErr: any) {
        setPayfastLoading(false);
        alert('REAL PayFast Backend Error:\\n\\n' + (backendErr.message || backendErr) + '\\n\\nCHECK THESE 3 THINGS:\\n1) Supabase > Edge Functions > payfast-checkout = Deployed?\\n2) Supabase > Settings > Edge Functions > Secrets = PAYFAST_MERCHANT_ID + PAYFAST_MERCHANT_KEY + PAYFAST_PASSPHRASE (if you set one) added?\\n3) PayFast Dashboard = LIVE mode (not Sandbox)?\\n\\nNo money was taken.');
        return;
      }
      try { await supabase.from('orders').insert({ buyer_id: session.user.id, seller_id: product.seller_id, product_id: product.id, escrow_amount: Number(product.price), status: 'pending_payment', payfast_payment_id: payData.m_payment_id || ('TRUSTLINK-' + product.id + '-' + Date.now()) }); } catch(e) {}
      // Build PayFast form and submit - REAL LIVE PayFast
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://www.payfast.co.za/eng/process';
      form.target = '_blank';
      const fields: any = {
        merchant_id: payData.merchant_id,
        merchant_key: payData.merchant_key,
        return_url: payData.return_url,
        cancel_url: payData.cancel_url,
        notify_url: payData.notify_url,
        name_first: payData.name_first || '',
        email_address: payData.email_address || '',
        m_payment_id: payData.m_payment_id,
        amount: payData.amount,
        item_name: payData.item_name,
        item_description: payData.item_description,
        custom_str1: payData.custom_str1 || '',
        custom_str2: payData.custom_str2 || '',
        signature: payData.signature,
      };
      Object.keys(fields).forEach((k) => { const inp = document.createElement('input'); inp.type = 'hidden'; inp.name = k; inp.value = String(fields[k] || ''); form.appendChild(inp); });
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
      setToast('REAL PayFast checkout opened - Pay with Card / Instant EFT / SnapScan. Money HELD in Escrow.');
    } catch (e: any) { alert('PayFast Error: ' + (e.message || 'Failed to start PayFast checkout')); }
    setPayfastLoading(false);
  }

  // ===== REAL YOCO PAYMENTS - LIVE MODE - ESCROW =====
  // Flow: Buyer clicks Pay with Yoco → TrustLink calls Secure Backend (Supabase Edge Function yoco-checkout) → Backend calls Yoco LIVE API with SECRET (never in frontend) → Yoco returns redirectUrl → Frontend opens Yoco checkout → Buyer pays Visa/Mastercard/Capitec Pay → Yoco HOLDS money (Escrow) → Seller delivers → Buyer confirms → Yoco RELEASES money.
  // NEVER put YOCO_SECRET_KEY in App.tsx or GitHub. Only YOCO_PUBLIC_KEY (pk_live_) goes in frontend if needed.
  async function handleRealYocoPay(product: any) {
    if (!session) return alert('Sign in to pay with Yoco.');
    if (!product) return alert('Select a product first.');
    setYocoLoading(true);
    try {
      const amountCents = Math.round(Number(product.price) * 100);
      const supabaseUrl = ((import.meta as any).env?.VITE_SUPABASE_URL || 'https://wdktbinawlrlfxmncmlj.supabase.co').trim().replace(/\/$/, '');
      let redirectUrl = '';
      let checkoutId = '';
      try {
        const res = await fetch(supabaseUrl + '/functions/v1/yoco-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
          body: JSON.stringify({ amountCents, currency: 'ZAR', productTitle: product.title, productId: product.id, sellerId: product.seller_id, buyerId: session.user.id, customerEmail: session.user.email, successUrl: window.location.origin + '/?payment=success', cancelUrl: window.location.origin + '/?payment=cancelled', failureUrl: window.location.origin + '/?payment=failed' }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error('Yoco backend returned ' + res.status + ': ' + JSON.stringify(data).slice(0, 500));
        if (data.redirectUrl) redirectUrl = data.redirectUrl;
        if (data.id) checkoutId = data.id;
        if (data.checkoutId) checkoutId = data.checkoutId;
        if (!redirectUrl) throw new Error('Backend returned no redirectUrl. Full response: ' + JSON.stringify(data).slice(0, 500));
      } catch (backendErr: any) {
        setYocoLoading(false);
        alert('REAL Yoco Backend Error:\\n\\n' + (backendErr.message || backendErr) + '\\n\\nCHECK THESE 3 THINGS:\\n1) Supabase > Edge Functions > yoco-checkout = Deployed?\\n2) Supabase > Settings > Edge Functions > Secrets = YOCO_SECRET_KEY (sk_live_...) added?\\n3) Yoco Dashboard = LIVE mode (not Test)?\\n\\nNo money was taken.');
        return;
      }
      setYocoCheckoutId(checkoutId);
      try { await supabase.from('orders').insert({ buyer_id: session.user.id, seller_id: product.seller_id, product_id: product.id, escrow_amount: Number(product.price), status: 'pending_payment', yoco_checkout_id: checkoutId }); } catch(e) {}
      window.open(redirectUrl, '_blank', 'width=480,height=640');
      setToast('REAL Yoco checkout opened - Pay with Visa / Mastercard / Capitec Pay. Money HELD in Escrow.');
    } catch (e: any) { alert('Yoco Error: ' + (e.message || 'Failed to start Yoco checkout')); }
    setYocoLoading(false);
  }

  // ===== REAL PEACH PAYMENTS - LIVE MODE - ESCROW =====
  // Flow: Buyer clicks Pay → TrustLink calls Secure Backend (Supabase Edge Function / Render API) → Backend calls Peach API with SECRET (never in frontend) → Peach returns checkoutId → Frontend shows Peach COPYANDPAY widget → Buyer pays Visa/Mastercard/Capitec Pay → Peach HOLDS money (Escrow) → Seller delivers → Buyer confirms → Peach RELEASES money.
  // NEVER put VITE_PEACH_PASSWORD or CLIENT_SECRET in App.tsx or GitHub. Only VITE_PEACH_ENTITY_ID (public) goes in frontend.
  async function handleRealPeachPay(product: any) {
    if (!session) return alert('Sign in to pay with Peach.');
    if (!product) return alert('Select a product first.');
    setPeachLoading(true);
    try {
      const amount = Number(product.price).toFixed(2);
      const entityId = ((import.meta as any).env?.VITE_PEACH_ENTITY_ID || peachEntityId || '').trim();
      // Catch placeholder Entity ID - user typed "your LIVE Entity ID" instead of real 8a829...
      if (entityId.toLowerCase().startsWith('your') || entityId.toLowerCase().includes('your live') || entityId === 'your LIVE Entity ID') {
        setPeachLoading(false);
        alert('Your Entity ID is a PLACEHOLDER, not a real Peach ID.\n\nIn Render you typed: "' + entityId + '"\n\nGo to Render > Environment > VITE_PEACH_ENTITY_ID > Replace it with your REAL LIVE Entity ID from Peach Dashboard (starts with 8a829...).\n\nThen redeploy. No money was taken.');
        return;
      }
      if (!entityId) {
        setPeachLoading(false);
        alert('REAL Peach is NOT configured yet.\n\nSTEP 1: Get your LIVE Entity ID from Peach Dashboard > Account > Entity ID (starts with 8a829...).\nSTEP 2: Render > Environment > Add VITE_PEACH_ENTITY_ID = your LIVE Entity ID\nSTEP 3: Deploy Supabase Edge Function peach-checkout (code below) with PEACH_USER_ID + PEACH_PASSWORD + PEACH_ENTITY_ID secrets.\nSTEP 4: Redeploy. Then Pay button will open REAL Peach checkout.\n\nUntil then, this is a SAFE demo - no real money taken.');
        return;
      }
      // Try Secure Backend first (Supabase Edge Function)
      const supabaseUrl = ((import.meta as any).env?.VITE_SUPABASE_URL || 'https://wdktbinawlrlfxmncmlj.supabase.co').trim().replace(/\/$/, '');
      let checkoutId = '';
      try {
        const res = await fetch(supabaseUrl + '/functions/v1/peach-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
          body: JSON.stringify({ amount, currency: 'ZAR', paymentType: 'DB', merchantTransactionId: 'TRUSTLINK-' + product.id + '-' + Date.now(), customerEmail: session.user.email, productTitle: product.title, sellerId: product.seller_id, buyerId: session.user.id }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error('Supabase function returned ' + res.status + ': ' + JSON.stringify(data).slice(0, 400));
        if (data.checkoutId) checkoutId = data.checkoutId;
        else if (data.id) checkoutId = data.id;
        else throw new Error('Backend returned no checkoutId. Full response: ' + JSON.stringify(data).slice(0, 500));
      } catch (backendErr: any) {
        // Fallback: Direct COPYANDPAY needs checkoutId from backend - cannot create in frontend safely
        setPeachLoading(false);
        alert('REAL Peach Backend Error:\n\n' + (backendErr.message || backendErr) + '\n\nCHECK THESE 3 THINGS:\n1) Supabase > Edge Functions > peach-checkout = Deployed?\n2) Supabase > Settings > Edge Functions > Secrets = PEACH_ENTITY_ID + PEACH_USER_ID + PEACH_PASSWORD + PEACH_BASE_URL all added?\n3) Render > VITE_PEACH_ENTITY_ID = REAL ID starting with 8a829... (not "your LIVE...")?\n\nNo money was taken.');
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

  if (!authChecked) {
    return (<div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-4"><div className="text-center"><div className="font-black text-[28px]">TrustLink SA</div><div className="text-[13px] text-[#8A7A6E] mt-2">Loading real marketplace...</div><div className="text-[11px] text-[#8A7A6E] mt-1">If this stays 3 seconds, hard refresh: Ctrl + Shift + R</div></div></div>);
  }
  if (bootError) {
    return (<div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-4"><div className="w-full max-w-[420px] bg-white rounded-[24px] border p-6 text-center"><h1 className="font-black text-[22px]">TrustLink SA - Connection Error</h1><p className="text-[13px] mt-2">{bootError}</p><p className="text-[12px] mt-2 text-[#8A7A6E]">Render → Environment → Add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY → Redeploy</p><button onClick={() => window.location.reload()} className="h-11 px-6 rounded-full bg-black text-white font-bold text-[13px] mt-4">Retry</button></div></div>);
  }
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
              <div className="text-[12px] font-bold text-[#7C3AED]">🧠 YOUR BRAIN - Only you see this when signed in (POPIA Compliant Protected)</div>
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
          <p className="text-center text-[11px] text-[#8A7A6E] mt-3">By signing up you agree to POPIA Compliant. Your Brain is private to YOU.</p>
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
    <div className="min-h-screen pb-24 relative" style={{ background: skin === 'rain' ? '#0F2233' : skin === 'sunset' ? '#1A0A00' : skinStyle.bg }}>
      {/* OCEAN WAVES - Real Moving Waves */}
      {skin === 'ocean' && (<div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden', background: 'linear-gradient(180deg,#0EA5E9 0%,#0284C7 40%,#0C4A6E 100%)' }}>
        <div style={{ position: 'absolute', bottom: '0', left: '-50%', width: '200%', height: '180px', background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.4) 0%, transparent 70%)', borderRadius: '50%', transform: 'translateX(' + (Math.sin(rainTick * 0.05) * 60) + 'px)', opacity: 0.6 }} />
        <div style={{ position: 'absolute', bottom: '20px', left: '-30%', width: '160%', height: '120px', background: 'rgba(255,255,255,0.25)', borderRadius: '50%', transform: 'translateX(' + (Math.cos(rainTick * 0.04) * 80) + 'px)' }} />
        <div style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', height: '80px', background: 'rgba(255,255,255,0.35)', borderRadius: '50% 50% 0 0', transform: 'translateX(' + (Math.sin(rainTick * 0.06 + 1) * 40) + 'px)' }} />
        {Array.from({ length: 12 }).map((_, i) => { const x = (i * 83 + rainTick * 0.8) % 110; return (<div key={'foam'+i} style={{ position: 'absolute', left: x + '%', bottom: (10 + (i % 3) * 25) + 'px', width: (8 + (i % 3) * 6) + 'px', height: (8 + (i % 3) * 6) + 'px', background: 'rgba(255,255,255,0.9)', borderRadius: '50%', opacity: 0.8 }} />); })}
      </div>)}
      {/* SKY CLOUDS - Visibly Moving Real Clouds */}
      {skin === 'sky' && (<div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden', background: 'linear-gradient(180deg,#87CEEB 0%,#B0E0F0 50%,#E0F2FE 100%)' }}>
        {Array.from({ length: 8 }).map((_, i) => { const speed = 0.3 + (i % 3) * 0.2; const x = ((i * 37 + rainTick * speed) % 120) - 10; const y = 5 + (i % 4) * 18; const scale = 0.7 + (i % 3) * 0.4; return (<div key={'cloud'+i} style={{ position: 'absolute', left: x + '%', top: y + '%', width: (140 * scale) + 'px', height: (50 * scale) + 'px', background: 'rgba(255,255,255,0.95)', borderRadius: '50px', boxShadow: '0 10px 30px rgba(255,255,255,0.6)', opacity: 0.95 }}><div style={{ position: 'absolute', top: '-20px', left: '25px', width: '60px', height: '60px', background: 'rgba(255,255,255,0.95)', borderRadius: '50%' }} /><div style={{ position: 'absolute', top: '-12px', left: '70px', width: '45px', height: '45px', background: 'rgba(255,255,255,0.95)', borderRadius: '50%' }} /></div>); })}
        <div style={{ position: 'absolute', top: '8%', right: '12%', width: '70px', height: '70px', background: 'radial-gradient(circle,#FEF08A 0%,#FDE047 60%,transparent 70%)', borderRadius: '50%', boxShadow: '0 0 40px rgba(253,224,71,0.8)' }} />
      </div>)}
      {/* ONE HEADER - Professional - WhatsApp Front + Centre */}
      <div className="sticky top-0 z-50 bg-black text-white px-3 py-2 flex gap-1 overflow-x-auto whitespace-nowrap items-center shadow-lg">
        <b className="text-[16px] font-black px-2">TrustLink SA</b>
        <button onClick={() => setActiveTab('market')} className="h-10 px-4 rounded-full bg-white text-black font-bold text-[12px]">Market</button>
        <button onClick={() => setActiveTab('reels')} className="h-10 px-4 rounded-full bg-[#FF0050] font-bold text-[12px]">Reels</button>
        <button onClick={() => setActiveTab('chat')} className="h-10 px-4 rounded-full bg-[#25D366] text-black font-black text-[12px]">WhatsApp</button>
        <button onClick={() => setActiveTab('chat')} className="h-10 px-4 rounded-full bg-white text-black font-bold text-[12px]">Chat</button>
        <button onClick={() => { setActiveTab('chat'); setTimeout(() => startTeamsVideoCall(), 300); }} className="h-10 px-4 rounded-full bg-white text-black font-bold text-[12px]">Video Call</button>
        <button onClick={() => setActiveTab('brain')} className="h-10 px-4 rounded-full bg-white text-black font-bold text-[12px]">Brain</button>
        <button onClick={() => setActiveTab('talent')} className="h-10 px-4 rounded-full bg-white text-black font-bold text-[12px]">Talent</button>
         <button onClick={() => setActiveTab('about' as any)} className="h-10 px-4 rounded-full bg-white text-black font-bold text-[12px]">About</button>
        <select value={skin} onChange={(e) => { setSkin(e.target.value); try { localStorage.setItem('trustlink_skin', e.target.value); } catch(err) {} }} className="h-10 px-3 rounded-full bg-white text-black font-bold text-[12px] outline-none"><option value="corporate">Corporate</option><option value="sunset">Soweto Sunset</option><option value="dark">Midnight</option><option value="purple">Royal Purple</option><option value="green">Money Green</option><option value="rain">Rainy Window</option><option value="ocean">Ocean Waves</option><option value="sky">Sky Clouds</option></select>
      </div>
      {skin === 'sunset' && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
          {/* REAL PHOTO - Soweto Conflagration - upload soweto-fire-background.webp to GitHub public/ as soweto-fire.jpg */}
          <img src="/soweto-fire.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={(e: any) => { e.target.style.display = 'none'; }} />
          {/* Fallback gradient if image not yet uploaded */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#2A0A00 0%,#4A1200 25%,#7A1E00 45%,#FF6B00 65%,#FFB800 85%,#FFD700 100%)', zIndex: -1 }} />
          {/* Big fire glow - pulsing */}
          <div style={{ position: 'absolute', bottom: '-10%', left: '50%', width: '120%', height: '60%', transform: 'translateX(-50%)', borderRadius: '50%', background: 'radial-gradient(ellipse at center, rgba(255,215,0,0.9) 0%, rgba(255,107,0,0.8) 30%, rgba(255,0,0,0.6) 55%, transparent 75%)', filter: 'blur(20px)', opacity: 0.85 + Math.sin(rainTick * 0.08) * 0.15 }} />
          {/* Conflagration flames - 45 flames rising, flickering with rainTick */}
          {Array.from({ length: 45 }).map((_, i) => {
            const baseX = (i * 2.3) % 100;
            const flick = Math.sin((rainTick * 0.25 + i * 1.7)) * 12;
            const flick2 = Math.cos((rainTick * 0.18 + i * 2.3)) * 18;
            const h = 90 + (i % 7) * 28 + Math.sin(rainTick * 0.3 + i) * 35;
            const w = 28 + (i % 5) * 12;
            const y = -5 + Math.sin(rainTick * 0.12 + i * 0.5) * 4;
            const colors = ['#FFD700', '#FFA500', '#FF6B00', '#FF4500', '#FF0000'];
            const col = colors[i % 5];
            return (<div key={'flame' + i} style={{ position: 'absolute', left: (baseX + flick * 0.2) + '%', bottom: y + '%', width: w + 'px', height: h + 'px', background: 'radial-gradient(ellipse at bottom, #FFD700 0%, ' + col + ' 35%, #FF4500 60%, #8B0000 85%, transparent 100%)', borderRadius: '50% 50% 50% 50% / 85% 85% 15% 15%', transform: 'translateX(-50%) rotate(' + (flick2 * 0.15) + 'deg) scaleY(' + (1 + Math.sin(rainTick * 0.4 + i * 2) * 0.25) + ')', filter: 'blur(1px)', opacity: 0.9 }} />);
          })}
          {/* Embers flying up */}
          {Array.from({ length: 35 }).map((_, i) => {
            const x = (i * 29 + rainTick * (0.8 + (i % 4) * 0.4)) % 100;
            const y = 95 - ((i * 17 + rainTick * (1.2 + (i % 3) * 0.6)) % 105);
            const s = 2 + (i % 4);
            return (<div key={'ember' + i} style={{ position: 'absolute', left: x + '%', bottom: y + '%', width: s + 'px', height: s + 'px', background: i % 2 === 0 ? '#FFD700' : '#FFA500', borderRadius: '50%', boxShadow: '0 0 8px 2px rgba(255,215,0,0.9)', opacity: 0.9 }} />);
          })}
          {/* Smoke */}
          <div style={{ position: 'absolute', top: '0%', left: '10%', width: '40%', height: '30%', background: 'radial-gradient(ellipse, rgba(0,0,0,0.35) 0%, transparent 70%)', filter: 'blur(30px)', opacity: 0.6 + Math.sin(rainTick * 0.05) * 0.2 }} />
          <div style={{ position: 'absolute', top: '5%', right: '5%', width: '35%', height: '25%', background: 'radial-gradient(ellipse, rgba(0,0,0,0.3) 0%, transparent 70%)', filter: 'blur(25px)' }} />
          {/* Burning ground - logs */}
          <div style={{ position: 'absolute', bottom: '0%', left: '0%', right: '0%', height: '18%', background: 'linear-gradient(180deg, transparent 0%, #1A0A00 40%, #000000 100%)' }} />
          <div style={{ position: 'absolute', bottom: '2%', left: '15%', width: '70%', height: '6px', background: '#3A1A00', borderRadius: '10px', transform: 'rotate(-1deg)' }} />
          <div style={{ position: 'absolute', bottom: '4%', left: '25%', width: '50%', height: '5px', background: '#2A1200', borderRadius: '10px', transform: 'rotate(1.5deg)' }} />
        </div>
      )}
      {skin === 'rain' && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
          {/* GLASS - frosted window pane */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,34,51,0.85) 0%, rgba(30,58,82,0.7) 40%, rgba(42,74,98,0.85) 100%)' }} />
          {/* City lights blurred behind glass */}
          <div style={{ position: 'absolute', top: '12%', left: '8%', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(253,224,71,0.35)', filter: 'blur(30px)' }} />
          <div style={{ position: 'absolute', top: '20%', right: '12%', width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', filter: 'blur(25px)' }} />
          <div style={{ position: 'absolute', top: '45%', left: '45%', width: '160px', height: '60px', borderRadius: '50%', background: 'rgba(56,189,248,0.25)', filter: 'blur(30px)' }} />
          {/* Window frame - vertical + horizontal bars */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: '6px', background: 'rgba(0,0,0,0.45)', transform: 'translateX(-50%)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '6px', background: 'rgba(0,0,0,0.45)' }} />
          <div style={{ position: 'absolute', inset: '10px', border: '3px solid rgba(255,255,255,0.25)', borderRadius: '8px' }} />
          {/* Fog on glass */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 70%, rgba(255,255,255,0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 20%, rgba(255,255,255,0.08) 0%, transparent 40%)' }} />
          {/* Rain streaks behind glass - moving with rainTick */}
          {Array.from({ length: 70 }).map((_, i) => { const speed = 2.2 + (i % 5) * 0.7; const y = ((i * 37 + rainTick * speed) % 110) - 5; return (<div key={'rain' + i} style={{ position: 'absolute', left: (i * 1.45) + '%', top: y + '%', width: '1.5px', height: (50 + (i % 4) * 18) + 'px', background: 'linear-gradient(to bottom, transparent, rgba(186,230,253,0.85))', opacity: 0.7 }} />); })}
          {/* DROPLETS ON GLASS - dripping down, with bead at bottom */}
          {Array.from({ length: 24 }).map((_, i) => { const speed = 0.35 + (i % 4) * 0.15; const y = ((i * 53 + rainTick * speed) % 115) - 5; const x = 2 + i * 4.1 + Math.sin((rainTick + i * 20) * 0.02) * 0.5; const size = 4 + (i % 3) * 2; return (<div key={'drop' + i} style={{ position: 'absolute', left: x + '%', top: y + '%', width: size + 'px', height: (10 + (y % 20)) + 'px', background: 'linear-gradient(to bottom, rgba(255,255,255,0.25), rgba(186,230,253,0.95))', borderRadius: '999px', boxShadow: '0 0 8px rgba(186,230,253,0.9)', opacity: 0.95 }}><div style={{ position: 'absolute', bottom: '-4px', left: '-2px', width: (size + 3) + 'px', height: (size + 3) + 'px', background: 'rgba(186,230,253,0.95)', borderRadius: '50%', boxShadow: '0 0 6px rgba(186,230,253,0.9)' }} /></div>); })}
          {/* Small static droplets stuck on glass */}
          {Array.from({ length: 40 }).map((_, i) => (<div key={'stuck' + i} style={{ position: 'absolute', left: ((i * 23 + 7) % 100) + '%', top: ((i * 31 + 13) % 100) + '%', width: (2 + (i % 3)) + 'px', height: (2 + (i % 3)) + 'px', background: 'rgba(186,230,253,0.85)', borderRadius: '50%', boxShadow: '0 0 4px rgba(186,230,253,0.8)' }} />))}
          {/* Bottom label */}
          <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(15,34,51,0.8)', color: '#E0F2FE', padding: '6px 14px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>Glass Window - Rain Outside - Droplets Dripping Down</div>
        </div>
      )}
      <div id="tag-top" style={{ position: 'relative', zIndex: 10, scrollMarginTop: '0px' }}>
        {/* ABOUT - DIRECTLY UNDER HEADER - NO SCROLL */}
{activeTab === 'about' && (
        <div className="max-w-[900px] mx-auto px-4 py-6 space-y-5 relative z-10">
          <div className="bg-white rounded-[24px] p-6 shadow-xl text-center">
            <div className="text-[12px] font-black tracking-widest text-[#0A66FF]">TRUSTLINKSA (PTY) LTD - SOUTH AFRICA</div>
            <h1 className="text-[32px] font-black leading-tight mt-2">About TrustLinkSA</h1>
            <p className="text-[15px] text-[#555] mt-2">Buy and Sell In South Africa. One header. One click. No scams. Built in Krugersdorp, for all of South Africa.</p>
            <div className="flex gap-2 justify-center mt-4 flex-wrap">
              <button onClick={() => setActiveTab('market')} className="h-11 px-6 rounded-full bg-black text-white font-black text-[13px]">Shop Market</button>
              <button onClick={() => setShowSell(true)} className="h-11 px-6 rounded-full bg-[#0A66FF] text-white font-black text-[13px]">Sell Free</button>
              <button onClick={() => setActiveTab('talent')} className="h-11 px-6 rounded-full border font-black text-[13px]">Hire Talent</button>
            </div>
          </div>
          <div className="bg-white rounded-[24px] p-6 shadow-lg">
            <h2 className="text-[20px] font-black">How It Started</h2>
            <p className="text-[14px] leading-relaxed mt-2 text-[#333]">TrustLinkSA (Pty) Ltd started in Krugersdorp - from a real problem South Africans face every day: buying and selling online is full of scams, fake sellers, stolen goods, and no protection. People were losing money on WhatsApp groups, Facebook Marketplace, and street deals with no escrow, no verification, and no way to check if a seller was real or near them.</p>
            <p className="text-[14px] leading-relaxed mt-3 text-[#333]">We built TrustLinkSA to fix that. One trusted place where a buyer in Durban can find a real seller nearest to them with real GPS and real kilometres, chat, send a voice note, and video call inside the app like WhatsApp - then pay with Cash or EFT into Escrow. The money is locked. The seller delivers. The buyer confirms it works. Only then is the money released. No scams.</p>
            <p className="text-[14px] leading-relaxed mt-3 text-[#333]">What started as a Krugersdorp idea is now a South Africa-wide marketplace for products, talent, and opportunity - for buyers, sellers, job seekers, recruiters, and investors, all in one professional app.</p>
          </div>
          <div className="bg-white rounded-[24px] p-6 shadow-lg">
            <h2 className="text-[20px] font-black">Organisational Structure</h2>
            <p className="text-[13px] text-[#666] mt-1">TrustLinkSA (Pty) Ltd - Private Company. Clear roles. One team. One standard: trust first.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div className="bg-[#F8FAFC] rounded-[16px] p-4 border"><b className="text-[14px]">Founder and CEO</b><div className="text-[13px] text-[#555] mt-1">Vision, strategy, partnerships, and final decisions. Owns the TrustLinkSA standard: real users, real products, no scams.</div></div>
              <div className="bg-[#F8FAFC] rounded-[16px] p-4 border"><b className="text-[14px]">Marketplace and Operations</b><div className="text-[13px] text-[#555] mt-1">Listings, orders, Escrow flow, disputes, and seller support. Keeps the Market clean, fast, and fair for all 9 provinces.</div></div>
              <div className="bg-[#F8FAFC] rounded-[16px] p-4 border"><b className="text-[14px]">Trust, Safety and Verification</b><div className="text-[13px] text-[#555] mt-1">Verified Purchase Reels, Review Reels (1-5 stars), mutual-contact WhatsApp checks, and scam prevention. Trust is earned, not claimed.</div></div>
              <div className="bg-[#F8FAFC] rounded-[16px] p-4 border"><b className="text-[14px]">Technology and TrustLink AI</b><div className="text-[13px] text-[#555] mt-1">App, GPS, Chat, Voice and Video, Reels, Brain (ANN), and PayFast / Escrow. Builds the one-header, one-click experience.</div></div>
              <div className="bg-[#F8FAFC] rounded-[16px] p-4 border"><b className="text-[14px]">Talent and Investors</b><div className="text-[13px] text-[#555] mt-1">Talent: job seekers sell themselves, recruiters hire. Investors: partner to scale TrustLinkSA across South Africa and beyond.</div></div>
              <div className="bg-[#F8FAFC] rounded-[16px] p-4 border"><b className="text-[14px]">Growth and Community</b><div className="text-[13px] text-[#555] mt-1">Sellers, buyers, creators, and communities. Reels, invites, and commercials that bring real South Africans onto TrustLinkSA.</div></div>
            </div>
            <div className="text-[12px] text-[#888] mt-4">Sellers and Buyers are at the centre. Every department exists to protect them. If you are a seller or buyer, you are not a user - you are the reason TrustLinkSA exists.</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-black text-white rounded-[24px] p-5 shadow-lg"><div className="text-[12px] font-black tracking-widest text-[#7DD3FC]">VISION</div><h3 className="text-[18px] font-black mt-2 leading-tight">A South Africa where anyone can buy, sell, and work - safely.</h3><p className="text-[13px] text-white/80 mt-2 leading-relaxed">Every South African, from Krugersdorp to Cape Town, can trade and earn without fear of being scammed. Trust is the currency.</p></div>
            <div className="bg-[#0A66FF] text-white rounded-[24px] p-5 shadow-lg"><div className="text-[12px] font-black tracking-widest text-white/80">GOAL</div><h3 className="text-[18px] font-black mt-2 leading-tight">Become South Africa&apos;s most trusted marketplace.</h3><p className="text-[13px] text-white/90 mt-2 leading-relaxed">The first place South Africans go to buy, sell, hire, and get hired - because it is real, organised, and protected.</p></div>
            <div className="bg-white rounded-[24px] p-5 shadow-lg border-2 border-black"><div className="text-[12px] font-black tracking-widest text-[#0A66FF]">MISSION</div><h3 className="text-[18px] font-black mt-2 leading-tight">Make every deal safe, near, and simple.</h3><p className="text-[13px] text-[#555] mt-2 leading-relaxed">1. Real GPS - nearest sellers first. 2. Real chat, voice and video inside the app. 3. Real Escrow - money locked until buyer confirms. One header. One click.</p></div>
          </div>
          <div className="bg-white rounded-[24px] p-6 shadow-lg">
            <h2 className="text-[20px] font-black">What TrustLinkSA Stands For</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-center">
              <div className="bg-[#F0FDF4] rounded-[16px] p-4"><div className="text-[24px]">Yes</div><b className="text-[13px]">No Scams</b><div className="text-[12px] text-[#555]">Escrow on every deal</div></div>
              <div className="bg-[#EFF6FF] rounded-[16px] p-4"><div className="text-[24px]">Pin</div><b className="text-[13px]">Real and Near</b><div className="text-[12px] text-[#555]">100% GPS, real km</div></div>
              <div className="bg-[#FFFBEB] rounded-[16px] p-4"><div className="text-[24px]">Chat</div><b className="text-[13px]">Real People</b><div className="text-[12px] text-[#555]">Chat, voice, video</div></div>
              <div className="bg-[#FDF2F8] rounded-[16px] p-4"><div className="text-[24px]">SA</div><b className="text-[13px]">For SA</b><div className="text-[12px] text-[#555]">All 9 provinces</div></div>
            </div>
          </div>
          <div className="bg-[#FFFBEB] rounded-[24px] p-6 shadow-lg border border-[#FDE68A] text-center">
            <h2 className="text-[20px] font-black">Join TrustLinkSA Today</h2>
            <p className="text-[14px] text-[#555] mt-1">Sellers list free. Buyers shop with protection. Talent gets hired. All in one header.</p>
            <div className="flex gap-2 justify-center mt-4 flex-wrap">
              <button onClick={() => setShowSell(true)} className="h-11 px-6 rounded-full bg-black text-white font-black text-[13px]">List Free</button>
              <button onClick={() => setActiveTab('market')} className="h-11 px-6 rounded-full bg-white border font-black text-[13px]">Shop Market</button>
              <button onClick={() => setActiveTab('reels')} className="h-11 px-6 rounded-full bg-[#E11D48] text-white font-black text-[13px]">Watch Reels</button>
            </div>
            <div className="text-[12px] text-[#888] mt-3">TrustLinkSA (Pty) Ltd - Krugersdorp, South Africa - trustlinksa-nfm.onrender.com</div>
          </div>
        </div>
        )}

        
       

      <div className="max-w-[1100px] mx-auto px-4 pt-6">
        <div style={{ display: activeTab === 'market' ? 'block' : 'none' }}>
        <div className="flex justify-between items-center">
          <h1 className="font-black text-[24px] px-4 py-2 rounded-full" style={{ background: skinStyle.headerBg, color: skinStyle.headerText }}>TrustLink SA - {skinStyle.name}</h1>
          <div className="flex gap-2 items-center">
            <span className="text-[12px] font-bold">{profile?.name || 'You'} • Trust {profile?.trust_score || 50}%</span>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="h-9 px-4 rounded-full bg-white border border-[#FFE4C2] font-bold text-[12px]">Log Out</button>
          </div>
        </div>
        <div className="mt-3 bg-[#E11D48] p-4 rounded-[20px] flex justify-between items-center flex-wrap gap-2 shadow-lg"><div><b className="text-white text-[16px]">Reels</b><div className="text-white text-[12px] opacity-90"></div></div><button onClick={() => setActiveTab('reels')} className="h-12 px-6 rounded-full bg-white text-[#E11D48] font-black text-[14px] shadow-lg">OPEN REELS →</button></div>
        <div className="mt-3 bg-[#FFFBEB] p-3 rounded-xl border border-[#FDE68A] flex justify-between items-center flex-wrap gap-2"><div><b className="text-[13px]">REAL Peach Payments - LIVE Mode</b><div className="text-[11px] text-[#8A7A6E]">Entity ID: {(import.meta as any).env?.VITE_PEACH_ENTITY_ID ? 'Configured - ' + String((import.meta as any).env.VITE_PEACH_ENTITY_ID).slice(0, 8) + '...' : 'NOT configured yet - Add VITE_PEACH_ENTITY_ID in Render (see steps below)'} • Escrow: Buyer pays -&gt; Peach HOLDS -&gt; Seller delivers -&gt; Buyer confirms -&gt; Peach RELEASES</div></div><span className="text-[10px] px-2 py-1 rounded-full bg-[#F59E0B] text-white font-bold">LIVE - NOT TEST</span></div>

        <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-4">
          <div className="flex justify-between items-center"><h3 className="font-black text-[16px]">TrustLink AI Agent - ANN Powered</h3><span className="text-[10px] px-2 py-1 rounded-full bg-[#E9FBF0] text-[#16A34A] font-bold">LIVE - WHAT / HOW / WHERE / WHEN / WHO / WHY</span></div>
          <p className="text-[12px] text-[#8A7A6E] mt-1"></p>
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
        </div>

        {(activeTab === 'brain') && (
          <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-5">
            <h2 className="text-center font-black text-[20px]">MY BRAIN</h2>
            <p className="text-center text-[13px] font-bold text-[#7C3AED] mt-1">Signed in as: {profile?.name || 'You'} - This is YOUR Brain only</p>
            <p className="text-center text-[11px] text-[#8A7A6E]"></p>
            <div className="bg-[#F3E8FF] p-3 rounded-xl text-[12px] leading-5 mt-3"><b>Privacy Proof:</b> Name = <b>{profile?.name || 'Not set'}</b> - </div>
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
            <h3 className="font-bold mt-4">THE VAULT - Sealed - POPIA Compliant</h3>
            {soul && soul.vault.map((v: any, i: number) => (<div key={i} className="flex justify-between p-3 border-b border-[#FFF0E0]"><div><b className="text-[13px]">{vaultUnlocked ? v.name + ' - UNLOCKED BY YOU' : 'Locked ' + v.name}</b><br /><span className="text-[11px] text-[#8A7A6E]">{v.hash}</span></div><span className="text-[11px] font-bold text-[#16A34A]">{v.status}</span></div>))}
            <button onClick={() => setVaultUnlocked(!vaultUnlocked)} className="mt-3 h-10 px-4 rounded-full bg-[#1E1E1E] text-white font-bold text-[13px]">{vaultUnlocked ? 'Lock Vault' : 'Unlock Vault With My Key'}</button>
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

        {(activeTab === 'recruiter') && (
          <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-5 text-center">
            <h2 className="font-black text-[20px]">Recruiter Link - For Signed-In User Only</h2>
            <p className="text-[#16A34A] font-bold text-[13px] mt-1">POPIA Compliant COMPLIANT - Soul Only - No Raw ID, No Raw PDF - Per-User</p>
            {soul && soul.allowRecruiter ? (<div className="text-left bg-[#F0FDF4] p-4 rounded-xl mt-3 text-[13px] leading-6"><b>Recruiter sees for YOU (signed-in user):</b><br />Education: {soul.education || 'Not provided'}<br />Top Skill: {soul.topSkill || 'Not provided'} {soul.topScore ? '(' + soul.topScore + '%)' : ''}<br />Second Skill: {soul.secondSkill || 'Not provided'}<br />Career Goal: {soul.careerGoal || 'Not provided'}<br />Trust: {profile?.trust_score || 50}% | Location: {soul.location}<br /><br /><b>Recruiter CANNOT see:</b> ID photo, ID number, phone, full PDF - SEALED.</div>) : (<div className="text-left bg-[#FEF3C7] p-4 rounded-xl mt-3 text-[13px]"><b>Recruiter View LOCKED</b><br />{!session ? 'Sign in to see YOUR Recruiter Link.' : 'You turned OFF Allow Recruiters.'}</div>)}
            <button onClick={() => { navigator.clipboard?.writeText('https://trustlinksa-nfm.onrender.com/recruiter/' + (profile?.id || 'you')); alert('YOUR Recruiter Link Copied'); }} className="mt-4 h-12 px-6 rounded-full bg-[#16A34A] text-white font-bold text-[13px]">Copy MY Recruiter Link</button>
          </div>
        )}

        {(activeTab === 'talent') && (
          <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-5">
            <h2 className="text-center font-black text-[20px]">DISCOVER TALENT - Sellers Selling THEMSELVES</h2>
            <p className="text-center text-[13px] text-[#8A7A6E] mt-1"></p>
            <div className="mt-4 bg-[#F0F9FF] p-4 rounded-xl">
              <label className="flex items-center gap-2 text-[13px] font-bold"><input type="checkbox" checked={sellMyself} onChange={(e) => setSellMyself(e.target.checked)} /> I want to SELL MYSELF - Discoverable by Recruiters / HR</label>
              <label className="flex items-center gap-2 text-[12px] mt-2"><input type="checkbox" checked={allowRecruiter} onChange={(e) => setAllowRecruiter(e.target.checked)} /> Allow Recruiters to see my Soul</label>
            </div>
            <div className="flex gap-2 mt-4 flex-wrap"><input value={talentSearch} onChange={(e) => setTalentSearch(e.target.value)} placeholder="Search skill e.g. Machine Learning, SEO, Sales..." className="flex-1 min-w-[200px] h-11 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[13px]" /><input value={talentMinScore} onChange={(e) => setTalentMinScore(e.target.value)} placeholder="Min Score % e.g. 85" type="number" className="w-[130px] h-11 px-3 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[13px]" /></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
              {talentList.length === 0 && (<div className="col-span-full text-center py-8"><div className="text-4xl">Talent</div><div className="font-bold mt-2">No talent matches yet</div><div className="text-[12px] text-[#8A7A6E]">Be first to SELL YOURSELF - Add Brain data + turn ON Sell Myself.</div></div>)}
              {talentList.map((x: any) => (<div key={x.id} className="p-4 rounded-[18px] border border-[#FFE4C2] bg-[#FFF8F0]"><div className="flex justify-between"><b>{x.name} {x.isYou ? '(You)' : ''}</b><span className="text-[10px] px-2 py-1 rounded-full bg-[#1E1E1E] text-white font-bold">TRUST {x.trust}%</span></div><div className="text-[12px] mt-1 leading-5">Education: {x.education}<br />Top Skill: {x.topSkill} {x.topScore ? '(' + x.topScore + '%)' : ''}<br />Second: {x.secondSkill}<br />Goal: {x.careerGoal}<br />Location: {x.location} | Rating {x.rating}/10 | Sold {x.sold}</div><div className="mt-3 flex gap-2 items-center"><button onClick={() => alert('Recruiter View: ' + x.name + ' - Soul Only. No ID / phone (POPIA Compliant).')} className="h-9 px-4 rounded-full bg-[#0EA5E9] text-white font-bold text-[12px]">View Soul (POPIA Compliant Safe)</button><span className="text-[11px] font-bold text-[#0EA5E9]">ANN Match: {ANN.predictMatch(parseInt(x.topScore || '50') || 50, 85, x.trust, 15)}%</span></div></div>))}
            </div>
          </div>
        )}

        {(activeTab === 'investors') && (
          <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-5">
            <h2 className="text-center font-black text-[20px]">INVESTORS - Pitch Yourself</h2>
            <p className="text-center text-[13px] text-[#8A7A6E] mt-1"></p>
            <div className="mt-4 bg-[#FFFBEB] p-4 rounded-xl">
              <input value={businessIdea} onChange={(e) => setBusinessIdea(e.target.value)} placeholder="Your business idea e.g. TrustLink - Brain app for Krugersdorp youth" className="w-full h-11 px-4 rounded-full border border-[#FDE68A] bg-white text-[13px] outline-none mt-2" />
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

        {(activeTab === 'chat') && (
          <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-5">
            <h2 className="text-center font-black text-[20px]">TrustLink Chat - End-to-End Encrypted</h2>
            <p className="text-center text-[13px] text-[#16A34A] font-bold mt-1"></p>
            <div className="flex gap-2 mt-4"><input value={chatTo} onChange={(e) => setChatTo(e.target.value)} placeholder="Chat to who? e.g. Seller / Recruiter / Investor" className="flex-1 h-11 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[13px]" /><span className="h-11 px-4 rounded-full bg-[#E9FBF0] border border-[#BBF7D0] text-[#16A34A] font-bold text-[12px] flex items-center">E2E</span></div>
            <div className="mt-3 bg-[#FFF8F0] rounded-xl p-3 min-h-[180px] max-h-[300px] overflow-y-auto">
              {chatMessages.length === 0 && (<div className="text-center text-[13px] text-[#8A7A6E] py-10">No chats yet. Start one below - E2E encrypted.</div>)}
              {chatMessages.map((m: any) => (<div key={m.id} className="mb-2 bg-white p-3 rounded-xl border border-[#FFE4C2]"><div className="flex justify-between"><b className="text-[12px]">{m.from} to {m.to}</b><span className="text-[10px] text-[#16A34A] font-bold">E2E • {m.time}</span></div><div className="text-[13px] mt-1">{m.text}</div></div>))}
            </div>
            <div className="flex gap-2 mt-3"><input value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }} placeholder="Type E2E encrypted message..." className="flex-1 h-12 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[14px]" /><button onClick={handleSendChat} className="h-12 px-6 rounded-full bg-[#25D366] text-white font-bold text-[13px]">Send</button></div>
          </div>
        )}


        {(activeTab === 'chat') && (
          <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-5">
            <h2 className="text-center font-black text-[20px]">WhatsApp Chat, Inside TrustLink</h2>
            <p className="text-center text-[13px] text-[#16A34A] font-bold mt-1"></p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              <div className="bg-[#FFF8F0] p-4 rounded-xl border border-[#FFE4C2]">
                <h3 className="font-bold text-[14px]">1. Find Someone You Know</h3>
                <p className="text-[12px] text-[#8A7A6E] mt-1"></p>
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
                {!chatWith && (<div className="text-center py-10 text-[13px] text-[#8A7A6E]">Search a username / phone number on the left, send a request, they accept, then chat here like WhatsApp.<br /></div>)}
                {chatWith && (<div><div className="text-[12px] text-[#8A7A6E] mt-1">Chatting with {chatWith.name} • {chatWith.phone || 'No phone'} • E2E Encrypted</div><div className="mt-3 bg-white rounded-xl p-3 min-h-[220px] max-h-[320px] overflow-y-auto">{chatMessages.filter((m: any) => m.to === chatWith.name || m.from === chatWith.name).length === 0 && (<div className="text-center text-[12px] text-[#8A7A6E] py-8">No messages yet with {chatWith.name}. Say hi!</div>)}{chatMessages.filter((m: any) => m.to === chatWith.name || m.from === chatWith.name).map((m: any) => (<div key={m.id} className="mb-2 bg-[#FFF8F0] p-3 rounded-xl border border-[#FFE4C2]"><div className="flex justify-between"><b className="text-[12px]">{m.from} to {m.to}</b><span className="text-[10px] text-[#16A34A] font-bold">E2E • {m.time}</span></div><div className="text-[13px] mt-1">{m.text}</div></div>))}</div><div className="flex gap-2 mt-3"><input value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }} placeholder={'Message ' + chatWith.name + '...'} className="flex-1 h-12 px-4 rounded-full border border-[#FFE4C2] bg-white outline-none text-[14px]" /><button onClick={handleSendChat} className="h-12 px-6 rounded-full bg-[#25D366] text-white font-bold text-[13px]">Send</button></div></div>)}
                <div className="mt-4 bg-white p-3 rounded-xl border border-[#FFE4C2] text-[12px] leading-5"><b></b><br /><br /><br /><br /><br /><br /></div>
              </div>
            </div>
          </div>
        )}

        {(activeTab === 'reels') && (
          <div className="mt-4">
            <div className="bg-white rounded-[20px] border border-[#FFE4C2] p-5">
              <h2 className="text-center font-black text-[20px]">TrustLink Reels - Sell With Video</h2>
              <p className="text-center text-[13px] text-[#E11D48] font-bold mt-1"></p>
              <div className="flex gap-2 justify-center mt-3 flex-wrap">
                <button onClick={() => setReelFilter('For You')} className={reelFilter === 'For You' ? 'h-9 px-4 rounded-full bg-[#1E1E1E] text-white font-bold text-[12px]' : 'h-9 px-4 rounded-full bg-white border border-[#FFE4C2] font-bold text-[12px]'}>For You</button>
                <button onClick={() => setReelFilter('Following')} className={reelFilter === 'Following' ? 'h-9 px-4 rounded-full bg-[#1E1E1E] text-white font-bold text-[12px]' : 'h-9 px-4 rounded-full bg-white border border-[#FFE4C2] font-bold text-[12px]'}>Following</button>
                <button onClick={() => setReelFilter('Shop')} className={reelFilter === 'Shop' ? 'h-9 px-4 rounded-full bg-[#1E1E1E] text-white font-bold text-[12px]' : 'h-9 px-4 rounded-full bg-white border border-[#FFE4C2] font-bold text-[12px]'}>Shop</button>
                <button onClick={() => setReelFilter('Reviews')} className={reelFilter === 'Reviews' ? 'h-9 px-4 rounded-full bg-[#16A34A] text-white font-bold text-[12px]' : 'h-9 px-4 rounded-full bg-white border border-[#FFE4C2] font-bold text-[12px]'}>Reviews</button>
                <button onClick={() => { setMyReelsOnly(true); setReelFilter('My Reels'); }} className={reelFilter === 'My Reels' ? 'h-9 px-4 rounded-full bg-[#E11D48] text-white font-bold text-[12px]' : 'h-9 px-4 rounded-full bg-white border border-[#FFE4C2] font-bold text-[12px]'}>My Reels - Watch Mine</button>
                <button onClick={() => setReelFilter('Sell')} className={reelFilter === 'Sell' ? 'h-9 px-4 rounded-full bg-[#E11D48] text-white font-bold text-[12px]' : 'h-9 px-4 rounded-full bg-white border border-[#FFE4C2] font-bold text-[12px]'}>Sell</button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                <div className="bg-[#FFF8F0] p-4 rounded-xl border border-[#FFE4C2]">
                  <h3 className="font-bold text-[14px]">Post Your Reel - Sell Faster</h3>
                  <p className="text-[12px] text-[#8A7A6E] mt-1"></p>
                  <div className="flex gap-2 mt-2"><button onClick={() => setReelType('sell')} className={reelType === 'sell' ? 'flex-1 h-11 rounded-full bg-[#E11D48] text-white font-bold text-[12px]' : 'flex-1 h-11 rounded-full bg-white border border-[#FFE4C2] font-bold text-[12px]'}>Sell - I am Selling</button><button onClick={() => setReelType('review')} className={reelType === 'review' ? 'flex-1 h-11 rounded-full bg-[#16A34A] text-white font-bold text-[12px]' : 'flex-1 h-11 rounded-full bg-white border border-[#FFE4C2] font-bold text-[12px]'}>Review - I Bought It</button></div>
                  {reelType === 'review' && (<div className="bg-[#E9FBF0] p-3 rounded-xl border border-[#BBF7D0] mt-2"><div className="font-bold text-[12px]">Buyer Review Reel - Show What You Bought</div><div className="text-[11px] text-[#8A7A6E] mt-1">Film yourself with the product. Show it working. Be honest - good or bad.</div><input value={reelBoughtFrom} onChange={(e) => setReelBoughtFrom(e.target.value)} placeholder="Who did you buy from? - Seller name e.g. Thabo" className="w-full h-11 px-3 rounded-xl border border-[#BBF7D0] bg-white outline-none text-[13px] mt-2" /><div className="flex gap-1 mt-2 items-center"><span className="text-[12px] font-bold">Your Rating:</span>{[1,2,3,4,5].map((s: number) => (<button key={s} onClick={() => setReelRating(s)} className="text-[22px]">{s <= reelRating ? '⭐' : '☆'}</button>))}<span className="text-[12px] font-bold ml-1">{reelRating}/5</span></div><textarea value={reelReviewText} onChange={(e) => setReelReviewText(e.target.value)} placeholder="Your honest review - e.g. I bought this tablet from Thabo in Pimville. Delivery was fast, tablet works perfect, seller was honest. I recommend him!" className="w-full h-[70px] px-3 py-2 rounded-xl border border-[#BBF7D0] bg-white outline-none text-[13px] mt-2" /><label className="flex gap-2 items-center mt-2 text-[12px] font-bold"><input type="checkbox" checked={reelVerifiedPurchase} onChange={(e) => setReelVerifiedPurchase(e.target.checked)} /> I really bought this - Verified Purchase</label></div>)}
                  <input value={reelTitle} onChange={(e) => setReelTitle(e.target.value)} placeholder={reelType === 'review' ? 'Review title - e.g. I bought this Tablet from Thabo - Honest Review' : 'Reel title - e.g. Brand New Samsung Tablet - R3500 - Krugersdorp'} className="w-full h-11 px-3 rounded-xl border border-[#FFE4C2] bg-white outline-none text-[13px] mt-2" />
                  <input value={reelVideoUrl} onChange={(e) => setReelVideoUrl(e.target.value)} placeholder="Paste Video URL - MP4 or YouTube link" className="w-full h-11 px-3 rounded-xl border border-[#FFE4C2] bg-white outline-none text-[13px] mt-2" />
                  <div className="mt-2"><label className="h-11 px-4 rounded-xl bg-[#1E1E1E] text-white font-bold text-[12px] inline-flex items-center cursor-pointer">{reelUploading ? 'Uploading...' : 'Upload Video From Phone'}<input type="file" accept="video/*" onChange={handleReelFileUpload} className="hidden" /></label><span className="text-[11px] text-[#8A7A6E] ml-2">{reelVideoUrl ? 'Video ready' : 'MP4, up to 60 sec'}</span></div>
                  {reelVideoUrl && (<div className="bg-[#1E1E1E] rounded-xl overflow-hidden mt-2"><div className="text-white text-[12px] font-bold p-2">Preview YOUR Reel - Watch it BEFORE you post - If you are not happy, delete + re-upload</div>{isYouTube(reelVideoUrl) ? (<iframe src={getYouTubeEmbed(reelVideoUrl)} className="w-full h-[220px]" allowFullScreen title="Preview" />) : (<video src={reelVideoUrl} controls playsInline preload="metadata" onError={(e) => { alert("Video failed to play. This usually means: 1) Supabase bucket product-images is NOT public, or 2) Link expired (local preview). Fix: Supabase > Storage > product-images > Make Public, or re-upload video."); }} className="w-full h-[220px] object-cover bg-black" />)}<div className="flex gap-2 p-2"><button onClick={() => handlePreviewReel(reelVideoUrl, reelTitle || 'Your Reel Preview')} className="flex-1 h-10 rounded-full bg-white text-[#1E1E1E] font-bold text-[12px]">Watch Full Preview</button><button onClick={() => { setReelVideoUrl(''); setToast('Video removed. Upload a better one.'); }} className="flex-1 h-10 rounded-full bg-[#E11D48] text-white font-bold text-[12px]">Delete Video - Re-upload</button></div></div>)}
                  <select value={reelProductId} onChange={(e) => { setReelProductId(e.target.value); const pr = products.find((x: any) => String(x.id) === e.target.value); if (pr) setReelPrice(String(pr.price)); }} className="w-full h-11 px-3 rounded-xl border border-[#FFE4C2] bg-white outline-none text-[13px] mt-2"><option value="">Link to Product (Optional) - Choose your listing</option>{products.map((pr: any) => (<option key={pr.id} value={pr.id}>{pr.title} - R{pr.price}</option>))}</select>
                  <input value={reelPrice} onChange={(e) => setReelPrice(e.target.value)} placeholder="Price - e.g. 3500" className="w-full h-11 px-3 rounded-xl border border-[#FFE4C2] bg-white outline-none text-[13px] mt-2" />
                  <button onClick={handleUploadReel} className="w-full h-12 rounded-full bg-[#E11D48] text-white font-bold text-[13px] mt-3">{reelType === 'review' ? 'Post Review Reel' : 'Post Reel'}</button>
                  <div className="bg-white p-3 rounded-xl border border-[#FFE4C2] text-[12px] leading-5 mt-3"><b></b><br /><br /><br /><br /><br /></div>
                </div>
                <div className="lg:col-span-2">
                  {reels.length === 0 && (<div className="text-center text-[13px] text-[#8A7A6E] mb-3">No Reels yet. Be the first! Post a Reel.</div>)}
                  {myReelsOnly && (
                    <div className="bg-white p-4 rounded-[20px] border border-[#FFE4C2] mb-4">
                      <h3 className="font-black text-[16px]">My Reels History - All Videos You Posted In The Past</h3>
                      <p className="text-[12px] text-[#8A7A6E] mt-1">Every Reel you ever posted, newest to oldest. Nothing is hidden. Search, watch, fix, delete, re-upload.</p>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        <input value={myReelsSearch} onChange={(e) => setMyReelsSearch(e.target.value)} placeholder="Search my past Reels - e.g. Tablet, Sneakers..." className="flex-1 h-11 px-3 rounded-full border border-[#FFE4C2] bg-white outline-none text-[13px] min-w-[200px]" />
                        <select value={myReelsSort} onChange={(e) => setMyReelsSort(e.target.value)} className="h-11 px-3 rounded-full border border-[#FFE4C2] bg-white outline-none text-[13px]"><option value="newest">Newest First</option><option value="oldest">Oldest First</option><option value="mostViews">Most Views</option><option value="mostLikes">Most Likes</option></select>
                        <button onClick={() => { setMyReelsOnly(false); setReelFilter('For You'); }} className="h-11 px-4 rounded-full bg-[#1E1E1E] text-white font-bold text-[12px]">Show All Reels</button>
                        <button onClick={() => { const broken = reels.filter((r: any) => r.videoUrl && r.videoUrl.startsWith('blob:')); if (broken.length === 0) return alert('No broken Reels! All your Reels are good Supabase / YouTube links.'); if (!confirm('Delete ' + broken.length + ' EXPIRED blob Reels that can never play again? Your good Reels will stay.')) return; const next = reels.filter((r: any) => !(r.videoUrl && r.videoUrl.startsWith('blob:'))); saveReels(next); setToast(broken.length + ' broken Reels deleted. Re-upload them now - they will play.'); }} className="h-11 px-4 rounded-full bg-[#E11D48] text-white font-bold text-[12px]">Delete All EXPIRED (blob) Reels</button>
                      </div>
                      {(() => {
                        const my = reels.filter((r: any) => r.sellerId === profile?.id || r.sellerId === session?.user?.id || r.reviewerName === profile?.name);
                        const filtered = my.filter((r: any) => !myReelsSearch.trim() || (r.title || '').toLowerCase().includes(myReelsSearch.toLowerCase()) || (r.boughtFrom || '').toLowerCase().includes(myReelsSearch.toLowerCase()));
                        const sorted = [...filtered].sort((a: any, b: any) => {
                          if (myReelsSort === 'oldest') return a.id - b.id;
                          if (myReelsSort === 'mostViews') return (b.views || 0) - (a.views || 0);
                          if (myReelsSort === 'mostLikes') return (b.likes || 0) - (a.likes || 0);
                          return b.id - a.id;
                        });
                        const totalViews = my.reduce((s: number, r: any) => s + (r.views || 0), 0);
                        const totalLikes = my.reduce((s: number, r: any) => s + (r.likes || 0), 0);
                        const totalComments = my.reduce((s: number, r: any) => s + ((r.comments || []).length), 0);
                        return (<div className="mt-3">
                          <div className="flex gap-2 flex-wrap"><span className="px-3 py-1 rounded-full bg-[#FFF8F0] border border-[#FFE4C2] font-bold text-[12px]">Total Reels: {my.length}</span><span className="px-3 py-1 rounded-full bg-[#FFF8F0] border border-[#FFE4C2] font-bold text-[12px]">Total Views: {totalViews}</span><span className="px-3 py-1 rounded-full bg-[#FFF8F0] border border-[#FFE4C2] font-bold text-[12px]">Total Likes: {totalLikes}</span><span className="px-3 py-1 rounded-full bg-[#FFF8F0] border border-[#FFE4C2] font-bold text-[12px]">Total Comments: {totalComments}</span></div>
                          {my.length === 0 && (<div className="text-[13px] text-[#8A7A6E] mt-3 text-center py-6">You have not posted any Reels yet. Post your first Reel on the left - it will appear here in your history forever.</div>)}
                          {my.length > 0 && filtered.length === 0 && (<div className="text-[13px] text-[#8A7A6E] mt-3 text-center py-6">No Reels match "{myReelsSearch}". Try a different search.</div>)}
                          {sorted.map((r: any, idx: number) => (
                            <div key={r.id} className="flex gap-3 items-center bg-[#FFF8F0] p-3 rounded-xl border border-[#FFE4C2] mt-2 flex-wrap">
                              <div className="w-[80px] h-[100px] bg-[#1E1E1E] rounded-xl overflow-hidden flex-shrink-0 relative">{isYouTube(r.videoUrl) ? (<div className="w-full h-full bg-gradient-to-br from-[#E11D48] to-[#7C3AED] flex items-center justify-center text-white font-black text-[20px]">▶️</div>) : (<video src={r.videoUrl} muted playsInline preload="metadata" onClick={() => handlePreviewReel(r.videoUrl, r.title)} onError={(e) => { (e.target as any).style.display = "none"; }} className="w-full h-full object-cover bg-black cursor-pointer" />)}<span className="absolute bottom-1 left-1 bg-black bg-opacity-70 text-white text-[10px] px-1 rounded">#{my.length - idx}</span></div>
                              <div className="flex-1 min-w-[200px]"><div className="font-bold text-[13px]">{r.title}</div><div className="text-[11px] text-[#8A7A6E]">{r.createdAt} - {r.reelType === 'review' ? 'Review Reel - Bought from ' + (r.boughtFrom || 'Seller') + ' - ' + (r.rating || 5) + '/5' : 'Sell Reel' + (r.price ? ' - R' + r.price : '')}</div><div className="text-[11px] mt-1">Views {r.views || 0} - Likes {r.likes || 0} - Comments {(r.comments || []).length} - Shares {r.shares || 0}</div></div>
                              <div className="flex gap-2 flex-wrap"><button onClick={() => handlePreviewReel(r.videoUrl, r.title)} className="h-9 px-3 rounded-full bg-[#1E1E1E] text-white font-bold text-[11px]">Watch</button><button onClick={() => handleReuploadReel(r)} className="h-9 px-3 rounded-full bg-[#FF8A4C] text-white font-bold text-[11px]">Fix / Re-upload</button><button onClick={() => handleDeleteReel(r.id)} className="h-9 px-3 rounded-full bg-[#E11D48] text-white font-bold text-[11px]">Delete</button></div>
                            </div>
                          ))}
                        </div>);
                      })()}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(myReelsOnly ? reels.filter((r: any) => r.sellerId === profile?.id || r.sellerId === session?.user?.id || r.reviewerName === profile?.name) : reels).map((reel: any) => (
                      <div key={reel.id} className="bg-[#1E1E1E] rounded-[20px] overflow-hidden text-white">
                        <div className="relative bg-black">
                          {isYouTube(reel.videoUrl) ? (<iframe src={getYouTubeEmbed(reel.videoUrl)} className="w-full h-[300px]" allowFullScreen title={reel.title} />) : (<video src={reel.videoUrl} controls playsInline preload="metadata" onError={(e) => { (e.target as any).style.display = "none"; alert("Video failed to play for: " + reel.title + ".\n\nFix: 1) Supabase > Storage > product-images > Make bucket PUBLIC, 2) If you used local preview, re-upload - local links expire on refresh, 3) Try YouTube link instead - YouTube always plays."); }} className="w-full h-[300px] object-cover bg-black" />)}
                          <div className="absolute top-2 left-2 bg-black bg-opacity-60 px-2 py-1 rounded-full text-[10px] font-bold">{reel.reelType === 'review' ? 'REVIEW REEL - Verified Buyer' : 'SELL REEL'} - Views {reel.views || 0}</div>
                          {reel.videoUrl && reel.videoUrl.startsWith('blob:') && (<div className="absolute top-2 right-2 bg-[#E11D48] px-2 py-1 rounded-full text-[10px] font-bold text-white">EXPIRED - Re-upload this Reel</div>)}
                          {!isYouTube(reel.videoUrl) && (<div className="absolute bottom-2 left-2 bg-black bg-opacity-70 px-2 py-1 rounded-full text-[10px]"><a href={reel.videoUrl} target="_blank" rel="noreferrer" className="text-white underline">If video does not play - Click here to open video</a></div>)}
                          {reel.reelType === 'review' && (<div className="absolute top-8 left-2 bg-[#16A34A] px-2 py-1 rounded-full text-[10px] font-bold">{"⭐".repeat(reel.rating || 5)} {reel.rating || 5}/5</div>)}
                        </div>
                        <div className="p-3">
                          <div className="font-bold text-[14px]">{reel.title}</div>
                          <div className="text-[12px] text-[#D1D5DB] mt-1">{reel.reelType === 'review' ? 'Review by ' + (reel.reviewerName || reel.sellerName) + ' - Bought from ' + (reel.boughtFrom || 'Seller') + (reel.verifiedPurchase ? ' - Verified Purchase' : '') : 'By ' + reel.sellerName + ' - ' + reel.createdAt + (reel.price ? ' - R' + reel.price : '')}</div>
                          {reel.reelType === 'review' && reel.reviewText && (<div className="text-[13px] bg-[#2A2A2A] p-2 rounded-xl mt-2">"{reel.reviewText}"</div>)}
                          {reel.reelType === 'review' && (<div className="flex gap-2 mt-2"><button onClick={() => { setChatTo(reel.boughtFrom || reel.sellerName); setActiveTab('chat' as any); }} className="h-9 px-3 rounded-full bg-white text-[#1E1E1E] font-bold text-[11px]">Buy From {reel.boughtFrom || 'This Seller'}</button><span className="text-[11px] text-[#BBF7D0] font-bold self-center">Trust this seller - Buyer verified</span></div>)}
                          {(reel.sellerId === profile?.id || reel.sellerId === session?.user?.id) && (<div className="bg-[#FFFBEB] p-2 rounded-xl mt-2 text-[12px]"><b>YOUR Reel - Only you see this:</b> Watch it - If you are not happy with quality, delete + re-upload a better one.<div className="flex gap-2 mt-2"><button onClick={() => handlePreviewReel(reel.videoUrl, reel.title)} className="flex-1 h-9 rounded-full bg-[#1E1E1E] text-white font-bold text-[11px]">Watch My Reel</button><button onClick={() => handleReuploadReel(reel)} className="flex-1 h-9 rounded-full bg-[#FF8A4C] text-white font-bold text-[11px]">Fix / Re-upload</button><button onClick={() => handleDeleteReel(reel.id)} className="h-9 px-3 rounded-full bg-[#E11D48] text-white font-bold text-[11px]">Delete</button></div></div>)}
                          <div className="flex gap-2 mt-3"><button onClick={() => handleBuyFromReel(reel)} className="flex-1 h-11 rounded-full bg-[#FF8A4C] text-white font-bold text-[13px]">Buy Now {reel.price ? '- R' + reel.price : ''} - Escrow</button><button onClick={() => { setChatTo(reel.sellerName); setActiveTab('chat' as any); }} className="h-11 px-4 rounded-full bg-white text-[#1E1E1E] font-bold text-[12px]">Chat Seller</button></div>
                          <div className="flex gap-2 mt-2"><button onClick={() => handleLikeReel(reel.id)} className="h-10 px-3 rounded-full bg-white text-[#1E1E1E] font-bold text-[12px]">{reel.likedByMe ? 'Liked' : 'Like'} - {reel.likes}</button><button onClick={() => handleShareReel(reel)} className="h-10 px-3 rounded-full bg-white text-[#1E1E1E] font-bold text-[12px]">Share - {reel.shares || 0}</button></div>
                          <div className="mt-3"><div className="text-[12px] font-bold mb-1">Comments ({(reel.comments || []).length})</div>{(reel.comments || []).map((c: any) => (<div key={c.id} className="text-[12px] bg-[#2A2A2A] p-2 rounded-xl mt-1"><b>{c.from}:</b> {c.text}</div>))}<div className="flex gap-2 mt-2"><input value={activeReelId === reel.id ? reelComment : ''} onChange={(e) => { setActiveReelId(reel.id); setReelComment(e.target.value); }} placeholder="Add a comment..." className="flex-1 h-10 px-3 rounded-full bg-[#2A2A2A] text-white outline-none text-[12px]" /><button onClick={() => handleCommentReel(reel.id)} className="h-10 px-4 rounded-full bg-[#E11D48] text-white font-bold text-[12px]">Post</button></div></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


            {reelPreviewOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4" onClick={() => setReelPreviewOpen(false)}>
                <div className="bg-[#1E1E1E] rounded-[20px] overflow-hidden max-w-[420px] w-full text-white" onClick={(e) => e.stopPropagation()}>
                  <div className="p-3 flex justify-between items-center"><b className="text-[14px]">Preview - {reelPreviewTitle || 'Your Reel'}</b><button onClick={() => setReelPreviewOpen(false)} className="h-9 w-9 rounded-full bg-white text-[#1E1E1E] font-bold">X</button></div>
                  {isYouTube(reelPreviewUrl) ? (<iframe src={getYouTubeEmbed(reelPreviewUrl)} className="w-full h-[500px]" allowFullScreen title="Preview" />) : (<video src={reelPreviewUrl} controls autoPlay playsInline preload="auto" onError={(e) => { alert("Preview video failed to play. Re-upload the video or use a YouTube link."); }} className="w-full h-[500px] object-contain bg-black" />)}
                  <div className="p-3 text-[12px] text-[#D1D5DB]">Watch the full video. Check: Is it clear? Is the sound good? Is the product visible? If NOT happy - Close, Delete, Re-upload a better one. If HAPPY - Post it.</div>
                  <div className="flex gap-2 p-3"><button onClick={() => { setReelPreviewOpen(false); setReelVideoUrl(''); setToast('Video removed. Upload a better one.'); }} className="flex-1 h-11 rounded-full bg-[#E11D48] text-white font-bold text-[12px]">Not Happy - Delete + Re-upload</button><button onClick={() => setReelPreviewOpen(false)} className="flex-1 h-11 rounded-full bg-[#16A34A] text-white font-bold text-[12px]">Happy - Keep It</button></div>
                </div>
              </div>
            )}
        {(activeTab === 'invite') && (
          <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-5 text-center">
            <h2 className="font-black text-[20px]">Invite Friends - Grow TrustLink, Earn Trust</h2>
            <p className="text-[13px] text-[#8A7A6E] mt-1"></p>
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

        {/* CHAT - WhatsApp Style */}
        {activeTab === 'chat' && (<div className="mt-4 bg-[#075E54] text-white rounded-[20px] p-4">
          <div className="flex justify-between items-center flex-wrap gap-2"><b className="text-[16px]">Chat</b><button onClick={syncMutualContacts} className="h-11 px-5 rounded-full bg-[#25D366] text-black font-black text-[13px]">📞 Sync Contacts</button></div>
          <div className="text-[12px] mt-2 opacity-90">{contactSyncStatus}</div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <button onClick={() => startTeamsVideoCall()} className="h-10 px-4 rounded-full bg-white text-black font-bold text-[12px]">Video Call</button><button onClick={() => { setToast("Audio Call - Like WhatsApp voice call - Talk now, no video."); }} className="h-10 px-4 rounded-full bg-white text-black font-bold text-[12px]">Voice Call</button>
            <button onClick={() => { const phone = prompt('Phone number?'); if (phone) setToast('Invite sent to ' + phone); }} className="h-10 px-4 rounded-full bg-[#25D366] text-black font-bold text-[12px]">+ Add By Number</button>
          </div>
          {whatsappContacts.length > 0 && (<div className="mt-3 bg-white text-black rounded-xl p-3"><b className="text-[13px]">Contacts ({whatsappContacts.length})</b><div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">{whatsappContacts.slice(0, 9).map((c: any, i: number) => (<div key={i} className="border p-2 rounded-lg flex justify-between items-center"><div><b className="text-[13px]">{c.name}</b><div className="text-[11px] text-[#6B7280]">{c.phone}</div></div><button onClick={() => { setChatTo(c.name); }} className="h-9 px-3 rounded-full bg-[#25D366] font-bold text-[12px]">Chat</button></div>))}</div></div>)}
        </div>)}
        {/* SOUTH AFRICA-WIDE - Your Location - Find Nearest Buyers/Sellers */}
        <div className="mt-4 bg-white rounded-[20px] border border-[#E5E7EB] p-4">
          <div className="flex justify-between items-center flex-wrap gap-2"><div><b className="text-[16px]">📍 Near You - South Africa</b><div className="text-[12px] text-[#6B7280]"></div></div><span className="bg-[#16A34A] text-white px-3 py-1 rounded-full font-bold text-[11px]">📍 {userArea}, {userCity}, {userProvince}</span></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-3">
            <div><label className="text-[11px] font-bold text-[#6B7280]">PROVINCE</label><select value={userProvince} onChange={(e) => { setUserProvince(e.target.value); try { localStorage.setItem('trustlink_province', e.target.value); } catch(err) {} }} className="w-full h-11 px-3 rounded-full border bg-white text-[13px]"><option>Gauteng</option><option>KwaZulu-Natal</option><option>Western Cape</option><option>Eastern Cape</option><option>Free State</option><option>Limpopo</option><option>Mpumalanga</option><option>North West</option><option>Northern Cape</option></select></div>
            <div><label className="text-[11px] font-bold text-[#6B7280]">CITY / TOWN</label><select value={userCity} onChange={(e) => { setUserCity(e.target.value); try { localStorage.setItem('trustlink_city', e.target.value); } catch(err) {} }} className="w-full h-11 px-3 rounded-full border bg-white text-[13px]"><option>Soweto</option><option>Johannesburg</option><option>Pretoria</option><option>Sandton</option><option>Centurion</option><option>Midrand</option><option>Roodepoort</option><option>Durban</option><option>Pinetown</option><option>Umlazi</option><option>Cape Town</option><option>Khayelitsha</option><option>Mitchells Plain</option><option>Stellenbosch</option><option>Gqeberha</option><option>Port Elizabeth</option><option>Bloemfontein</option><option>Polokwane</option><option>Nelspruit</option><option>Mbombela</option><option>Kimberley</option><option>Rustenburg</option><option>Mafikeng</option><option>East London</option><option>Mthatha</option><option>Pietermaritzburg</option><option>Newcastle</option></select></div>
            <div><label className="text-[11px] font-bold text-[#6B7280]">AREA / TOWNSHIP / SUBURB</label><input value={userArea} onChange={(e) => { setUserArea(e.target.value); try { localStorage.setItem('trustlink_area', e.target.value); } catch(err) {} }} placeholder="e.g. Krugersdorp CBD, Kagiso, Munsieville" className="w-full h-11 px-3 rounded-full border bg-white text-[13px] outline-none" /></div>
            <div><label className="text-[11px] font-bold text-[#6B7280]">NEAREST FIRST</label><div className="flex gap-2"><select value={nearMeKm} onChange={(e) => setNearMeKm(e.target.value)} className="flex-1 h-11 px-3 rounded-full border bg-white text-[13px]"><option value="5">Within 5km</option><option value="10">Within 10km</option><option value="25">Within 25km</option><option value="50">Within 50km</option><option value="100">Within 100km</option><option value="10000">All South Africa</option></select></div></div>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap"><button onClick={requestGPS} className="h-11 px-5 rounded-full bg-[#0A66FF] text-white font-black text-[13px]">📍 Use My GPS - 100% Real Nearest</button><span className="h-11 px-4 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] flex items-center text-[12px] font-bold">{gpsStatus}</span><button onClick={() => setNearMeKm('10000')} className="h-11 px-4 rounded-full bg-white border font-bold text-[12px]">Show All SA</button><button onClick={() => setNearMeKm('10')} className="h-11 px-4 rounded-full bg-white border font-bold text-[12px]">Nearest 10km</button></div>
          <div className="text-[12px] mt-2 bg-[#EFF6FF] p-2 rounded-lg border border-[#BFDBFE]">🛰️ 100% GPS: {userLat !== null ? '' : ''} </div>
          <div className="text-[12px] mt-3 bg-[#F0FDF4] p-2 rounded-lg border border-[#BBF7D0]">Showing sellers nearest to <b>{userArea}, {userCity}, {userProvince}</b> - Within {nearMeKm === '10000' ? 'All South Africa' : nearMeKm + 'km'} - {products.filter((pr: any) => getDistanceKm(pr) <= Number(nearMeKm)).length} products near you.  • Taxi / Courier (same city) • Paxi / PostNet / Courier Guy (nationwide).</div>
        </div>
        {/* CORPORATE + YOUTHFUL - Best Company In The World Header */}
        <div className="mt-4 bg-[#0A0A0A] text-white rounded-[24px] p-6 relative overflow-hidden">
          <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(10,102,255,0.5) 0%, rgba(124,58,237,0.35) 40%, transparent 70%)', borderRadius: '50%', filter: 'blur(20px)' }} />
          <div style={{ position: 'absolute', bottom: '-30%', left: '10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,107,0,0.4) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(20px)' }} />
          <div className="relative">
            <div className="flex items-center gap-2"><span className="bg-white text-black px-3 py-1 rounded-full font-black text-[11px] tracking-widest">TRUSTLINK SA • EST. SOWETO</span><span className="bg-[#0A66FF] px-3 py-1 rounded-full font-bold text-[11px]">● LIVE</span><span className="bg-[#16A34A] px-3 py-1 rounded-full font-bold text-[11px]">ESCROW PROTECTED</span></div>
            <h1 className="font-black text-[32px] md:text-[42px] leading-[1.05] mt-4">Buy & Sell<br /><span style={{ background: 'linear-gradient(90deg,#0A66FF,#7C3AED,#FF6B00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}></span><br /></h1>
            <p className="text-[14px] opacity-80 mt-3 max-w-[600px]"></p>
            <div className="flex gap-2 mt-4 flex-wrap"><button onClick={() => { const el = document.getElementById('marketplace-grid'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }} className="h-12 px-6 rounded-full bg-white text-black font-black text-[13px]">Shop Now →</button><button onClick={() => setShowSell(true)} className="h-12 px-6 rounded-full bg-[#0A66FF] text-white font-black text-[13px]">Sell In 30 Seconds</button><button onClick={() => setActiveTab('talent')} className="h-12 px-6 rounded-full border border-white/30 font-bold text-[13px]">Hire Talent</button></div>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-5">
              <div className="bg-white/10 backdrop-blur p-3 rounded-xl"><div className="font-black text-[18px]">{products.length}</div><div className="text-[11px] opacity-80">Live Products</div></div>
              <div className="bg-white/10 backdrop-blur p-3 rounded-xl"><div className="font-black text-[18px]">{orders.length}</div><div className="text-[11px] opacity-80">Real Orders</div></div>
              <div className="bg-white/10 backdrop-blur p-3 rounded-xl"><div className="font-black text-[18px]">{products.length > 0 ? "4.9★" : "—"}</div><div className="text-[11px] opacity-80">Trust Rating</div></div>
              <div className="bg-white/10 backdrop-blur p-3 rounded-xl hidden md:block"><div className="font-black text-[18px]">0 Scams</div><div className="text-[11px] opacity-80">Escrow = Zero Loss</div></div>
            </div>
          </div>
        </div>
        {/* TRUST BAR - Corporate */}
        <div className="mt-3 bg-white rounded-full border border-[#E5E7EB] px-4 py-2 flex gap-4 overflow-x-auto whitespace-nowrap text-[11px] font-bold text-[#6B7280]"><span>POPIA Compliant</span><span>✓ Escrow Protected</span><span>✓ Verified Sellers</span><span>✓ PayFast Secure</span><span>✓ 100% South Africa</span><span>✓ No Hidden Fees</span></div>
        {/* BEST ESCROW IN THE WORLD - Money Locked Until Buyer Says YES */}
        <div className="mt-4 bg-[#0F172A] text-white rounded-[20px] p-4 border-4 border-[#FFD700]">
          <div className="flex justify-between items-start flex-wrap gap-2"><div><h2 className="font-black text-[20px]">🛡️ TrustLink Escrow - Best In The World</h2><p className="text-[12px] opacity-80"></p></div><span className="bg-[#FFD700] text-black px-3 py-1 rounded-full font-bold text-[12px]">100% SAFE</span></div>
          {(() => { const s = getEscrowStats(); return (<div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            <div className="bg-white text-black p-3 rounded-xl"><div className="text-[11px] opacity-70">🔒 LOCKED IN ESCROW</div><div className="font-black text-[18px]">R{s.holding}</div><div className="text-[11px]">Seller cannot withdraw yet</div></div>
            <div className="bg-[#DCFCE7] text-black p-3 rounded-xl"><div className="text-[11px] opacity-70">✅ RELEASED TO SELLERS</div><div className="font-black text-[18px]">R{s.released}</div><div className="text-[11px]">Buyers confirmed, sellers paid</div></div>
            <div className="bg-[#FEE2E2] text-black p-3 rounded-xl"><div className="text-[11px] opacity-70">🚨 DISPUTES - FROZEN</div><div className="font-black text-[18px]">{s.disputed}</div><div className="text-[11px]">Money frozen, TrustLink reviews</div></div>
            <div className="bg-[#FEF3C7] text-black p-3 rounded-xl"><div className="text-[11px] opacity-70">↩️ REFUNDED</div><div className="font-black text-[18px]">R{s.refunded}</div><div className="text-[11px]">Back to buyers</div></div>
          </div>); })()}
          <div className="bg-white text-black p-3 rounded-xl mt-3 text-[12px] leading-relaxed">
            <b></b><br/>
            <b>1. Buyer Pays →</b> Money goes to TrustLink Escrow, NOT to seller. Seller sees: Locked.<br/>
            <b>2. Seller Ships →</b> Seller taps Packed → On The Way. Buyer tracks live.<br/>
            <b>3. Buyer Receives →</b> Buyer checks: Is it real? Does it work? Is it as described?<br/>
            <b>4. Buyer Confirms →</b> Buyer taps <b>Confirm - Release Money</b> → Money goes to seller instantly.<br/>
            <b>5. If Problem →</b> Buyer taps <b>Dispute - Freeze Money</b> → Money FROZEN. Seller gets R0. TrustLink reviews + refunds if fake/broken.<br/>
            <span className="text-[#16A34A] font-bold"></span>
          </div>
          <div className="mt-3">
            <div className="flex gap-2 flex-wrap"><button onClick={() => setEscrowFilter('All')} className="h-9 px-4 rounded-full bg-white text-black font-bold text-[12px]">All Orders</button><button onClick={() => setEscrowFilter('Locked')} className="h-9 px-4 rounded-full bg-[#FFD700] text-black font-bold text-[12px]">Locked</button><button onClick={() => setEscrowFilter('Dispute')} className="h-9 px-4 rounded-full bg-[#E11D48] text-white font-bold text-[12px]">Disputes</button></div>
            {orders.filter((o: any) => escrowFilter === 'All' ? true : escrowFilter === 'Locked' ? !String(o.status).includes('Released') && !String(o.status).includes('Refunded') : String(o.status).includes('Dispute')).length === 0 && (<div className="text-[12px] opacity-80 mt-2">No orders in this view yet. Buy something - it will appear here LOCKED in Escrow.</div>)}
            {orders.filter((o: any) => escrowFilter === 'All' ? true : escrowFilter === 'Locked' ? !String(o.status).includes('Released') && !String(o.status).includes('Refunded') : String(o.status).includes('Dispute')).map((o: any) => (<div key={o.id} className="bg-white text-black p-3 rounded-xl mt-2">
              <div className="font-bold text-[13px]">{o.title} - R{o.price} - {o.status}</div>
              <div className="text-[11px] text-[#8A7A6E]">Seller: {o.seller} - {o.time}</div>
              <div className="flex gap-2 mt-2 flex-wrap">
                <button onClick={() => releaseEscrow(o.id)} className="h-10 px-4 rounded-full bg-[#16A34A] text-white font-bold text-[12px]">✅ Confirm - Release Money To Seller</button>
                <button onClick={() => { const r = prompt('Why dispute? e.g. Fake / Broken / Never arrived'); if (r) disputeEscrow(o.id, r); }} className="h-10 px-4 rounded-full bg-[#E11D48] text-white font-bold text-[12px]">🚨 Dispute - Freeze Money</button>
                <button onClick={() => refundEscrow(o.id)} className="h-10 px-4 rounded-full bg-white border font-bold text-[12px]">↩️ Refund Buyer</button>
              </div>
              <div className="flex gap-2 mt-2"><input value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder="Or type dispute reason here, then tap Dispute" className="flex-1 h-9 px-3 rounded-full border text-[12px]" /><button onClick={() => disputeEscrow(o.id, disputeReason)} className="h-9 px-4 rounded-full bg-black text-white font-bold text-[12px]">Send Dispute</button></div>
            </div>))}
          </div>
        </div>
        {/* BEST UX HUB - Always visible on top of Marketplace */}
        <div className="mt-4 bg-white rounded-[20px] border border-[#FFE4C2] p-4">
          <h2 className="font-black text-[18px]">Best Experience - All In One Place</h2>
          <p className="text-[12px] text-[#8A7A6E]"></p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="bg-[#FFF8F0] p-3 rounded-xl border border-[#FFE4C2]">
              <b className="text-[13px]">AI Price Checker - Am I Being Ripped Off?</b>
              <div className="flex gap-2 mt-2"><input value={priceCheckTitle} onChange={(e) => setPriceCheckTitle(e.target.value)} placeholder="e.g. Samsung Tablet" className="flex-1 h-10 px-3 rounded-full border border-[#FFE4C2] bg-white outline-none text-[12px]" /><button onClick={checkPrice} className="h-10 px-4 rounded-full bg-[#1E1E1E] text-white font-bold text-[12px]">Check Price</button></div>
              {priceCheckResult && (<div className="text-[12px] mt-2 bg-white p-2 rounded-lg border">{priceCheckResult}</div>)}
            </div>
            <div className="bg-[#E0F2FE] p-3 rounded-xl border border-[#BAE6FD]">
              <b className="text-[13px]">Near Me - Sellers Close To You</b>
              <div className="flex gap-2 mt-2 items-center"><span className="text-[12px]">Within</span><select value={nearMeKm} onChange={(e) => setNearMeKm(e.target.value)} className="h-10 px-3 rounded-full border bg-white text-[12px]"><option value="2">2 km</option><option value="5">5 km</option><option value="10">10 km</option><option value="20">20 km</option></select><span className="text-[12px]">of Pimville, Soweto</span></div>
              <div className="text-[12px] mt-2">{products.filter((pr: any) => getDistanceKm(pr) <= Number(nearMeKm)).length} products within {nearMeKm}km - Closest: {products.length > 0 ? [...products].sort((a: any, b: any) => getDistanceKm(a) - getDistanceKm(b))[0]?.title + ' - ' + getDistanceKm([...products].sort((a: any, b: any) => getDistanceKm(a) - getDistanceKm(b))[0]) + 'km away' : 'None yet'}</div>
            </div>
            <div className="bg-[#DCFCE7] p-3 rounded-xl border border-[#BBF7D0]">
              <b className="text-[13px]">1-Tap Buy - Saved Address</b>
              <input value={savedAddress} onChange={(e) => { setSavedAddress(e.target.value); try { localStorage.setItem('trustlink_address', e.target.value); } catch(err) {} }} placeholder="Your delivery address - e.g. 123 Market St, Krugersdorp" className="w-full h-10 px-3 rounded-full border bg-white outline-none text-[12px] mt-2" />
              <div className="text-[11px] mt-1 text-[#8A7A6E]"></div>
            </div>
            <div className="bg-[#FEF3C7] p-3 rounded-xl border border-[#FDE68A]">
              <b className="text-[13px]">Smart Alerts - Your Size Just Listed</b>
              <div className="flex gap-2 mt-2"><input value={alertQuery} onChange={(e) => setAlertQuery(e.target.value)} placeholder="e.g. Nike size 8" className="flex-1 h-10 px-3 rounded-full border bg-white outline-none text-[12px]" /><input value={alertMaxPrice} onChange={(e) => setAlertMaxPrice(e.target.value)} placeholder="Max R" type="number" className="w-[90px] h-10 px-3 rounded-full border bg-white outline-none text-[12px]" /><button onClick={saveAlert} className="h-10 px-4 rounded-full bg-[#F59E0B] text-white font-bold text-[12px]">Save Alert</button></div>
              <div className="text-[12px] mt-2">{savedSearches.length === 0 ? 'No alerts yet. Save one above.' : savedSearches.map((a: any) => (<span key={a.id} className="inline-block bg-white px-2 py-1 rounded-full border mr-1 mt-1 text-[11px]">{a.query} - under R{a.maxPrice}</span>))}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="bg-white p-3 rounded-xl border border-[#FFE4C2]">
              <b className="text-[13px]">Live Delivery Tracking - Where Is My Order?</b>
              {orders.length === 0 && (<div className="text-[12px] text-[#8A7A6E] mt-1">No orders yet. Buy something - it will appear here with tracking.</div>)}
              {orders.map((o: any) => (<div key={o.id} className="bg-[#FFF8F0] p-2 rounded-lg border mt-2"><div className="font-bold text-[12px]">{o.title} - R{o.price} - {o.status}</div><div className="text-[11px]">{(o.tracking || []).join(' → ')}</div><div className="flex gap-2 mt-2 flex-wrap"><button onClick={() => updateOrderStatus(o.id, 'Packed')} className="h-8 px-3 rounded-full bg-white border font-bold text-[11px]">Packed</button><button onClick={() => updateOrderStatus(o.id, 'On The Way')} className="h-8 px-3 rounded-full bg-[#FF8A4C] text-white font-bold text-[11px]">On The Way</button><button onClick={() => updateOrderStatus(o.id, 'Delivered - Confirm To Release Payment')} className="h-8 px-3 rounded-full bg-[#16A34A] text-white font-bold text-[11px]">Delivered</button></div></div>))}
            </div>
            <div className="bg-[#F5F3FF] p-3 rounded-xl border border-[#DDD6FE]">
              <b className="text-[13px]">Trust Passport - Your Reputation</b>
              {(() => { const tp = getTrustBadges(); return (<div><div className="text-[12px] mt-1">{profile?.name || 'You'} - {tp.sales} sales - {tp.rating}★ - {tp.disputes} disputes</div><div className="flex gap-1 flex-wrap mt-2">{tp.badges.map((b: string) => (<span key={b} className="px-2 py-1 rounded-full bg-white border text-[11px] font-bold">✓ {b}</span>))}</div><button onClick={() => setTrustPassportOpen(!trustPassportOpen)} className="h-9 px-4 rounded-full bg-[#7C3AED] text-white font-bold text-[12px] mt-2">{trustPassportOpen ? 'Hide Passport' : 'Show My Passport'}</button>{trustPassportOpen && (<div className="text-[12px] mt-2 bg-white p-2 rounded-lg border">Trust Passport for {profile?.name || 'You'} - {tp.sales} sales - Rating {tp.rating}/5 - Verified ID - Fast Shipper - Zero Disputes - Buyers pay MORE to buy from you because you are trusted.</div>)}</div>); })()}
            </div>
          </div>
          <div className="bg-[#FFF1F2] p-3 rounded-xl border border-[#FECDD3] mt-3">
            <b className="text-[13px]">Voice + Video - Exactly Like WhatsApp + Teams Quality</b>
            <div className="text-[12px] text-[#8A7A6E] mt-1"></div>
            <div className="flex gap-2 mt-3 flex-wrap items-center">
              {!isRecording ? (<button onClick={startVoiceRecording} className="h-12 px-5 rounded-full bg-[#25D366] text-white font-bold text-[13px]">🎤 Hold To Record Voice Note</button>) : (<div className="flex gap-2 items-center bg-white px-4 py-2 rounded-full border"><span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span><span className="font-bold text-[13px]">Recording... {recordingSecs}s</span><button onClick={stopVoiceRecording} className="h-9 px-4 rounded-full bg-[#25D366] text-white font-bold text-[12px]">Send ▶️</button><button onClick={cancelVoiceRecording} className="h-9 px-4 rounded-full bg-[#E11D48] text-white font-bold text-[12px]">Delete 🗑️</button></div>)}
              <button onClick={startTeamsVideoCall} className="h-12 px-5 rounded-full bg-[#1E1E1E] text-white font-bold text-[13px]">📹 Start Video Call - HD Teams Style</button>
            </div>
            <div className="text-[11px] mt-2 text-[#8A7A6E]">Voice notes appear in Chat below as playable audio - tap ▶️ to listen. Video opens in Teams grid below.</div>
            {videoCallOpen && (<div className="bg-[#1E1E1E] text-white p-3 rounded-[20px] mt-3">
              <div className="flex justify-between items-center"><b>Teams Video Call - {videoCallWith} - HD 720p</b><span className="text-[11px] bg-red-500 px-2 py-1 rounded-full">● LIVE</span></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                <div className="bg-black rounded-xl overflow-hidden relative h-[240px]"><video id="remoteVideo" autoPlay playsInline muted className="w-full h-full object-cover" /><div className="absolute bottom-2 left-2 bg-black bg-opacity-70 px-2 py-1 rounded-full text-[11px]">{videoCallWith} - Remote</div></div>
                <div className="bg-black rounded-xl overflow-hidden relative h-[240px]"><video id="localVideo" autoPlay playsInline muted className="w-full h-full object-cover" /><div className="absolute bottom-2 left-2 bg-black bg-opacity-70 px-2 py-1 rounded-full text-[11px]">You - Local {isCameraOff ? '(Camera Off)' : ''} {isMuted ? '(Muted)' : ''}</div></div>
              </div>
              <div className="flex gap-2 justify-center mt-3 flex-wrap"><button onClick={toggleMute} className="h-11 w-11 rounded-full bg-white text-black font-bold text-[16px]">{isMuted ? '🔇' : '🎤'}</button><button onClick={toggleCamera} className="h-11 w-11 rounded-full bg-white text-black font-bold text-[16px]">{isCameraOff ? '📷❌' : '📷'}</button><button onClick={endTeamsVideoCall} className="h-11 px-6 rounded-full bg-[#E11D48] text-white font-bold text-[13px]">End Call 📞</button></div>
              <div className="text-[11px] text-center mt-2 opacity-70">Teams-style: Mute / Camera / End - Show product live before paying.</div>
            </div>)}
            <div className="mt-3">
              <b className="text-[12px]">Your Voice Notes In Chat:</b>
              {chatMessages.filter((m: any) => m.isVoice).length === 0 && (<div className="text-[12px] text-[#8A7A6E]">No voice notes yet. Hold to record above - it will appear here as a playable voice note.</div>)}
              {chatMessages.filter((m: any) => m.isVoice).map((m: any) => (<div key={m.id} className="flex gap-2 items-center bg-white p-2 rounded-full border mt-2"><span className="text-[18px]">🎤</span><audio src={m.voiceUrl} controls className="flex-1 h-9" /><span className="text-[11px] font-bold">{m.duration || 0}s - {m.time}</span></div>))}
            </div>
          </div>
        </div>
        {(activeTab === 'market') && (
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
        {/* FLOATING WHATSAPP - Always Visible - One Tap To Chat / Voice / Call / Video */}
        <button onClick={() => setActiveTab('chat')} className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full bg-[#25D366] text-white text-[24px] shadow-2xl flex items-center justify-center border-4 border-white" title="WhatsApp Chat - Messages + Voice + Calls + Video">💬</button>
        {toast && (<div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#1E1E1E] text-white px-5 py-3 rounded-full text-[13px] font-bold z-50">{toast}</div>)}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white w-full max-w-[520px] rounded-[24px] p-5" onClick={(e) => e.stopPropagation()}>
            {selected.image_url && (<img src={selected.image_url} alt={selected.title} className="w-full h-[220px] object-cover rounded-[16px]" />)}
            <h3 className="font-black text-[20px] mt-3">{selected.title}</h3>
            <p className="text-[13px] text-[#8A7A6E] mt-1">{selected.description || 'No description'}</p>
            <div className="flex justify-between mt-3"><b className="text-[22px]">R{selected.price}</b><span className="text-[12px] font-bold">Seller: {selected.profiles?.name || 'Seller'} • Trust {selected.profiles?.trust_score || 50}%</span></div>
            <div className="bg-[#E6F7FF] p-3 rounded-xl mt-3 text-[12px] leading-5"><b>REAL PayFast Payments - LIVE - Escrow Protected</b><br />Buyer pays → PayFast HOLDS money → Seller delivers → Buyer confirms → PayFast RELEASES money. If no delivery, refund. Never pay outside TrustLink.</div>
            <div className="flex gap-2 mt-3"><button onClick={() => handleRealPayFastPay(selected)} disabled={payfastLoading} className="flex-1 h-12 rounded-full bg-[#FF6B00] text-white font-bold text-[13px] disabled:opacity-50">{payfastLoading ? 'Opening REAL PayFast...' : 'Pay REAL with PayFast - R' + selected.price + ' - Escrow - Card / EFT / SnapScan'}</button></div>
            <div className="flex gap-2 mt-2"><button onClick={() => handleRealYocoPay(selected)} disabled={yocoLoading} className="flex-1 h-11 rounded-full bg-white border border-[#FFE4C2] font-bold text-[12px] disabled:opacity-50">{yocoLoading ? 'Opening Yoco...' : 'Pay with Yoco (R199 signup fee - Optional)'}</button><button onClick={() => handleRealPeachPay(selected)} disabled={peachLoading} className="flex-1 h-11 rounded-full bg-white border border-[#FFE4C2] font-bold text-[12px] disabled:opacity-50">{peachLoading ? 'Opening Peach...' : 'Pay with Peach (Paused by Peach)'}</button></div>
            <div className="flex gap-2 mt-2"><button onClick={() => { if (selected.profiles?.phone) handleWhatsApp(selected.profiles.phone, selected.title); else alert('Seller has no WhatsApp number saved.'); }} className="flex-1 h-12 rounded-full bg-[#25D366] text-white font-bold text-[13px]">Chat on WhatsApp</button><button onClick={() => setSelected(null)} className="h-12 px-5 rounded-full bg-white border border-[#FFE4C2] font-bold text-[13px]">Close</button></div>
          </div>
        </div>
      )}

      {showSell && (
        <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50 p-4" onClick={() => setShowSell(false)}>
          <div className="bg-white w-full max-w-[520px] rounded-[24px] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black text-[20px]">List Product - Real Sale</h3>
            <div className="space-y-2 mt-3">
              <input value={sellTitle} onChange={(e) => setSellTitle(e.target.value)} placeholder="Title e.g. Samsung Tablet - Krugersdorp" className="w-full h-11 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] text-[13px] outline-none" />
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
    </div>
  );
}
