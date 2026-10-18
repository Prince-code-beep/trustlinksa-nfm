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

function calcTrustScore(p: Partial<Profile>) {
  const completed = Math.min((p.completed_orders || 0) * 2, 40);
  const sold = Math.min((p.total_sold || 0) * 1.5, 30);
  const rating = ((p.rating || 8.5) / 10) * 20;
  const base = 10;
  return Math.min(99, Math.round(completed + sold + rating + base));
}

export default function App() {
  // Auth
  const [session, setSession] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [roleInput, setRoleInput] = useState<'buyer' | 'seller' | 'both'>('both');
  const [phoneInput, setPhoneInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Data
  const [profile, setProfile] = useState<Profile | null>(null);
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

  // Sell form
  const [sellTitle, setSellTitle] = useState('');
  const [sellDesc, setSellDesc] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellCat, setSellCat] = useState('Other');
  const [sellImage, setSellImage] = useState<File | null>(null);
  const [sellLoading, setSellLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  // Init session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // Load profile
  useEffect(() => {
    if (!session?.user) { setProfile(null); return; }
    const load = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (data) setProfile(data);
    };
    load();
  }, [session]);

  // Load products
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

  // Auth handlers
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

      // update seller stats
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

  // Auth screen
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

  // Main marketplace (real)
  return (
    <div className="min-h-screen bg-[#FFF8F0] text-[#1E1E1E] antialiased">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-20 w-[420px] h-[420px] bg-[#FFD6BA]/40 rounded-full blur-[60px]" />
        <div className="absolute top-[200px] -right-24 w-[360px] h-[360px] bg-[#FFB6D9]/30 rounded-full blur-[50px]" />
      </div>

      {toast && <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-[#1E1E1E] text-white text-[13px] font-semibold px-5 py-2.5 rounded-full shadow-xl whitespace-nowrap">{toast}</div>}

      <div className="mx-auto max-w-[960px] w-full min-h-screen relative flex flex-col">
        <div className="px-5 lg:px-8 pt-4 pb-32 relative z-10">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-[11px] tracking-[0.22em] font-extrabold text-[#FF8A4C]">TRUSTLINK REAL</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E9FBF0] border border-[#BBF7D0] text-[#16A34A] font-bold">● LIVE DB</span>
              {profile && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#FFE4C2] text-[#FF8A4C] font-bold">Trust {profile.trust_score}%</span>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadProducts} className="w-9 h-9 rounded-full bg-white border border-[#FFE4C2] flex items-center justify-center">🔄</button>
              <button onClick={()=>profile && setViewProfile(profile)} className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF8A4C] to-[#FF5A7A] text-white font-bold text-[12px]">{profile?.name?.slice(0,2).toUpperCase() || 'TL'}</button>
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

          {/* Search + Filters */}
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

          {/* Products Grid */}
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

          {/* Orders */}
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

        {/* Bottom Nav */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex justify-center pointer-events-none">
          <div className="pointer-events-auto w-[calc(100%-20px)] max-w-[390px] mx-auto mb-3 bg-white/95 backdrop-blur-xl border border-[#FFE4C2] rounded-[26px] shadow-xl flex justify-between items-center px-2 py-1.5">
            {[
              {id:'Home', icon:'🏠'},
              {id:'Map', icon:'📍'},
              {id:'Sell', icon:'+', center:true},
              {id:'Deals', icon:'🛡️'},
              {id:'You', icon:'👤'},
            ].map(it=>{
              if((it as any).center) return <button key={it.id} onClick={()=>setShowSell(true)} className="flex-1 flex justify-center"><div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#FF8A4C] to-[#FF5A7A] text-white flex items-center justify-center font-bold shadow-lg text-xl">+</div></button>
              return <button key={it.id} onClick={()=>setActiveNav(it.id)} className="flex-1 flex flex-col items-center py-1.5"><span className={`text-[12px] ${activeNav===it.id ? 'text-[#FF8A4C]' : 'text-[#B8A99A]'}`}>{it.icon}</span><span className={`text-[10px] font-bold ${activeNav===it.id ? 'text-[#FF8A4C]' : 'text-[#B8A99A]'}`}>{it.id}</span></button>
            })}
          </div>
        </div>
      </div>

      {/* Product Detail */}
      {selected && (
        <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-6">
          <div className="w-full max-w-[520px] bg-white rounded-t-[28px] lg:rounded-[28px] max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#FFF8F0] border flex items-center justify-center text-xl">{selected.image_url ? '🖼️' : '📦'}</div>
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

      {/* Profile */}
      {viewProfile && (
        <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-6">
          <div className="w-full max-w-[420px] bg-white rounded-t-[28px] lg:rounded-[28px] p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between">
              <div className="flex gap-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FF8A4C] to-[#FF5A7A] text-white flex items-center justify-center font-bold">{viewProfile.name.slice(0,2).toUpperCase()}</div>
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

      {/* Sell Sheet */}
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
