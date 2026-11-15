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

function getTrustLevel(score: number) {
  if (score >= 90) return { label: 'Platinum', color: 'from-amber-400 to-yellow-300' };
  if (score >= 75) return { label: 'Gold', color: 'from-yellow-400 to-amber-300' };
  if (score >= 60) return { label: 'Silver', color: 'from-slate-300 to-slate-200' };
  return { label: 'Bronze', color: 'from-orange-300 to-amber-200' };
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
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState('Everything');
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

  const notify = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (data) setProfile(data);
    };
    loadProfile();
  }, [session]);

  const loadProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) setProducts(data as Product[]);
    setLoading(false);
  };

  const loadOrders = async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from('orders')
      .select('*, products(*)')
      .or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`)
      .order('created_at', { ascending: false });
    if (data) setOrders(data as Order[]);
  };

  useEffect(() => {
    loadProducts();
    loadOrders();
  }, [session]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user) return notify('Please sign in first');

    const fileName = `${session.user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('avatars').upload(fileName, file);
    if (error) return notify(error.message);

    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', session.user.id);
    
    if (profile) setProfile({ ...profile, avatar_url: data.publicUrl });
    notify('Profile picture updated ✨');
  };

  const handleAuth = async () => {
    if (!email || !password || (authMode === 'signup' && !nameInput)) {
      return notify('Please fill all required fields');
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

          const { error: profileError } = await supabase.from('profiles').insert([newProfile]);
          if (profileError) throw profileError;

          notify('Account created! Check your email to confirm, then sign in.');
          setAuthMode('signin');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        notify('Welcome back 🌻');
      }
    } catch (err: any) {
      notify(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    notify('Signed out successfully');
  };

  const handleCreateProduct = async () => {
    if (!sellTitle || !sellPrice || !session?.user) {
      return notify('Title and price are required');
    }

    setSellLoading(true);
    try {
      let imageUrl = '';
      if (sellImage) {
        const ext = sellImage.name.split('.').pop();
        const path = `${session.user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(path, sellImage);
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('product-images').getPublicUrl(path);
        imageUrl = data.publicUrl;
      }

      const { error } = await supabase.from('products').insert([{
        seller_id: session.user.id,
        title: sellTitle,
        description: sellDesc,
        price: parseInt(sellPrice),
        category: sellCat,
        image_url: imageUrl || null,
      }]);

      if (error) throw error;

      if (profile) {
        const updated = {
          ...profile,
          total_sold: profile.total_sold + 1,
          trust_score: Math.min(99, profile.trust_score + 1),
        };
        await supabase
          .from('profiles')
          .update({ total_sold: updated.total_sold, trust_score: updated.trust_score })
          .eq('id', profile.id);
        setProfile(updated);
      }

      notify('Product listed successfully! 🔥');
      setShowSell(false);
      setSellTitle('');
      setSellDesc('');
      setSellPrice('');
      setSellImage(null);
      loadProducts();
    } catch (err: any) {
      notify(err.message || 'Failed to list product');
    } finally {
      setSellLoading(false);
    }
  };

  const handleAskAI = () => {
    if (!aiQuestion.trim()) {
      setAiAnswer('Ask me anything — e.g. “Best sneakers under R2000” or “Who is the most trusted seller?”');
      return;
    }

    const q = aiQuestion.toLowerCase();
    const myName = profile?.name || 'Friend';
    const myTrust = profile?.trust_score || 50;

    const personal = `Hi ${myName} 👋\nYour Trust Score: ${myTrust}% • Sales: ${profile?.total_sold || 0} • Bought: ${profile?.total_bought || 0}`;

    const sellersMap = new Map();
    products.forEach((p) => {
      if (p.profiles) sellersMap.set(p.seller_id, p.profiles);
    });

    const ranked = Array.from(sellersMap.values())
      .map((s: any) => {
        const trust = s.trust_score || 50;
        const rating = s.rating || 8.5;
        const orders = s.completed_orders || 0;
        const sold = s.total_sold || 0;
        const reliability = Math.round(
          trust * 0.4 + (rating / 10) * 30 + Math.min(orders * 2, 20) + Math.min(sold, 10)
        );
        return { ...s, reliability };
      })
      .sort((a, b) => b.reliability - a.reliability);

    const best = ranked[0];
    let bestText = 'No sellers yet — be the first!';
    if (best) {
      bestText = `🏆 TOP SELLER RIGHT NOW\n${best.name}\nReliability: ${best.reliability}% • Trust: ${best.trust_score}% • Rating: ${best.rating}/10`;
    }

    const matched = products
      .filter((p) =>
        q.split(' ').some(
          (word) =>
            word.length > 3 &&
            (p.title.toLowerCase().includes(word) || p.category.toLowerCase().includes(word))
        )
      )
      .slice(0, 4);

    let productText = `There are currently ${products.length} live products.`;
    if (matched.length > 0) {
      productText =
        'BEST MATCHES:\n' +
        matched
          .map(
            (p, i) =>
              `${i + 1}. ${p.title} — R${p.price} (${p.profiles?.name || 'Seller'} • Trust ${p.profiles?.trust_score || 50}%)`
          )
          .join('\n');
    }

    let tip = 'Buyers in Soweto trust face photos + high Trust Scores the most.';
    if (q.includes('sell')) tip = 'Sell tip: Clear photos + fair price + fast WhatsApp replies = more sales.';
    if (q.includes('buy') || q.includes('safe') || q.includes('trust'))
      tip = 'Buy safely: Prefer Trust 75%+, use Escrow, and meet in public places like Maponya Mall.';

    setAiAnswer(`${personal}\n\n${bestText}\n\n${productText}\n\n💡 ${tip}`);
  };

  const handleBuy = async (product: Product) => {
    if (!session?.user) return notify('Please sign in to buy');
    if (product.seller_id === session.user.id) return notify("You can't buy your own product");

    try {
      const { error } = await supabase.from('orders').insert([{
        product_id: product.id,
        buyer_id: session.user.id,
        seller_id: product.seller_id,
        escrow_amount: product.price,
        status: 'pending',
      }]);
      if (error) throw error;

      notify(`Order placed! Escrow R${product.price.toLocaleString()} secured 🔒`);
      loadOrders();
      setSelected(null);
    } catch (err: any) {
      notify(err.message || 'Failed to place order');
    }
  };

  const handleWhatsApp = (product: Product) => {
    const phone = product.profiles?.phone || '27711234567';
    const clean = phone.replace(/\D/g, '');
    const wa = clean.startsWith('0') ? '27' + clean.slice(1) : clean;
    const text = encodeURIComponent(
      `Hi! I'm interested in "${product.title}" for R${product.price} on TrustLink. Is it still available?`
    );
    window.open(`https://wa.me/${wa}?text=${text}`, '_blank');
  };

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = filter === 'Everything' || p.category === filter;
      const matchSearch =
        !search ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(search.toLowerCase());

      if (activeNav === 'You') return p.seller_id === session?.user?.id;
      if (activeNav === 'Deals') return p.price < 1000 && matchCat && matchSearch;
      return matchCat && matchSearch;
    });
  }, [products, filter, search, activeNav, session]);

  // ==================== AUTH SCREEN ====================
  if (!session) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-5">
        <div className="w-full max-w-[420px] bg-white rounded-[28px] border border-[#FFE4C2] shadow-2xl p-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF8A4C] to-[#FF5A7A] text-white flex items-center justify-center font-black text-2xl shadow-lg">
            TL
          </div>
          <h1 className="text-[32px] font-[900] tracking-tight mt-6 leading-[1.1]">
            TrustLink SA
            <br />
            <span className="text-[#FF8A4C]">Real Marketplace</span>
          </h1>
          <p className="text-[14px] text-[#8A7A6E] mt-3 leading-relaxed">
            Buy & sell with real trust scores and escrow protection in Soweto.
          </p>

          <div className="mt-8 space-y-3.5">
            {authMode === 'signup' && (
              <>
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Your full name"
                  className="w-full h-12 px-5 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] text-[14px] outline-none focus:border-[#FF8A4C]"
                />
                <input
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="WhatsApp number"
                  className="w-full h-12 px-5 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] text-[14px] outline-none focus:border-[#FF8A4C]"
                />
                <div className="flex gap-2">
                  {(['buyer', 'seller', 'both'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRoleInput(r)}
                      className={`flex-1 h-12 rounded-full text-[13px] font-bold border capitalize ${
                        roleInput === r
                          ? 'bg-[#1E1E1E] text-white border-[#1E1E1E]'
                          : 'bg-white border-[#FFE4C2] text-[#8A7A6E]'
                      }`}
                    >
                      {r === 'buyer' ? '🛒 Buy' : r === 'seller' ? '💼 Sell' : '✨ Both'}
                    </button>
                  ))}
                </div>
              </>
            )}

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              type="email"
              className="w-full h-12 px-5 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] text-[14px] outline-none focus:border-[#FF8A4C]"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              type="password"
              className="w-full h-12 px-5 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] text-[14px] outline-none focus:border-[#FF8A4C]"
            />

            <button
              onClick={handleAuth}
              disabled={authLoading}
              className="w-full h-12 rounded-full bg-gradient-to-r from-[#FF8A4C] to-[#FF5A7A] text-white font-bold text-[15px] shadow-lg disabled:opacity-60"
            >
              {authLoading
                ? 'Please wait...'
                : authMode === 'signup'
                ? 'Create account • Start trading'
                : 'Sign in to TrustLink'}
            </button>

            <button
              onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
              className="w-full text-[13px] text-[#8A7A6E] font-medium pt-1"
            >
              {authMode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create account'}
            </button>
          </div>
        </div>

        {toast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-[#1E1E1E] text-white px-6 py-3 rounded-full text-[13px] font-semibold z-50 shadow-xl">
            {toast}
          </div>
        )}
      </div>
    );
  }

  // ==================== MAIN APP ====================
  return (
    <div className="min-h-screen bg-[#FFF8F0] text-[#1E1E1E] antialiased">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[480px] h-[480px] bg-[#FFD6BA]/35 rounded-full blur-[80px]" />
        <div className="absolute top-[180px] -right-32 w-[400px] h-[400px] bg-[#FFB6D9]/25 rounded-full blur-[70px]" />
      </div>

      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#1E1E1E] text-white text-[13px] font-semibold px-6 py-3 rounded-full shadow-2xl">
          {toast}
        </div>
      )}

      <div className="mx-auto max-w-[960px] w-full min-h-screen relative flex flex-col">
        <div className="px-5 lg:px-8 pt-5 pb-36 relative z-10">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <span className="text-[12px] tracking-[0.2em] font-extrabold text-[#FF8A4C]">TRUSTLINK</span>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#E9FBF0] border border-[#BBF7D0] text-[#16A34A] font-bold">
                ● LIVE
              </span>
              {profile && (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-white border border-[#FFE4C2] text-[#FF8A4C] font-bold">
                  Trust {profile.trust_score}%
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadProducts}
                className="w-10 h-10 rounded-full bg-white border border-[#FFE4C2] flex items-center justify-center"
              >
                🔄
              </button>
              <button
                onClick={() => profile && setViewProfile(profile)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF8A4C] to-[#FF5A7A] text-white font-bold text-xs overflow-hidden"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="me" className="w-full h-full object-cover" />
                ) : (
                  profile?.name?.slice(0, 2).toUpperCase() || 'TL'
                )}
              </button>
              <label className="text-xs cursor-pointer bg-white border border-[#FFE4C2] px-3 py-2 rounded-full font-medium">
                📷
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
              <button onClick={handleSignOut} className="text-xs text-[#8A7A6E] font-bold px-2">
                Logout
              </button>
            </div>
          </div>

          {/* Hero */}
          <div className="mt-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <h1 className="text-[42px] lg:text-[52px] leading-[0.92] tracking-[-0.03em] font-[900]">
                <span className="block">Find it.</span>
                <span className="bg-gradient-to-r from-[#FF8A4C] via-[#FF5A7A] to-[#FF8A4C] bg-clip-text text-transparent block pb-1">
                  Trust it.
                </span>
              </h1>
              <p className="text-sm text-[#8A7A6E] mt-3 font-medium">
                {products.length} live products • {orders.length} of your orders
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSell(true)}
                className="h-12 px-6 rounded-full bg-[#1E1E1E] text-white font-bold text-sm shadow-lg"
              >
                + List Product
              </button>
              <button
                onClick={() => setShowAI(true)}
                className="h-12 px-5 rounded-full bg-[#7C3AED] text-white font-bold text-sm shadow-lg"
              >
                🤖 AI
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-7">
            <div className="h-12 bg-white border border-[#FFE4C2] rounded-full flex items-center px-5 gap-3 shadow-sm">
              <span>🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sneakers, phones, kota..."
                className="flex-1 outline-none text-sm bg-transparent placeholder:text-[#B8A99A]"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`whitespace-nowrap h-10 px-5 rounded-full border text-sm font-bold transition ${
                  filter === c
                    ? 'bg-[#1E1E1E] text-white border-[#1E1E1E]'
                    : 'bg-white border-[#FFE4C2] text-[#8A7A6E]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="mt-7 grid grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-[22px] border border-[#FFE4C2] overflow-hidden animate-pulse">
                  <div className="aspect-[4/5] bg-[#FFF0E0]" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-[#FFF0E0] rounded-full w-3/4" />
                    <div className="h-3 bg-[#FFF0E0] rounded-full w-1/2" />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="col-span-full py-20 text-center">
                <div className="text-6xl mb-4">📦</div>
                <div className="text-xl font-bold">No products yet</div>
                <p className="text-sm text-[#8A7A6E] mt-2 max-w-xs mx-auto">
                  Be the first to list something. Buyers in Soweto are waiting.
                </p>
                <button
                  onClick={() => setShowSell(true)}
                  className="mt-6 h-12 px-8 rounded-full bg-[#1E1E1E] text-white font-bold"
                >
                  List your first item
                </button>
              </div>
            ) : (
              filtered.map((p) => {
                const trust = p.profiles?.trust_score || 50;
                const level = getTrustLevel(trust);
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className="text-left group bg-white rounded-[22px] border border-[#FFE4C2] overflow-hidden hover:shadow-xl transition-all duration-300"
                  >
                    <div className="aspect-[4/5] relative overflow-hidden bg-gradient-to-br from-[#FFF8F0] to-[#FFE4C2]">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className="text-sm font-black bg-white/95 backdrop-blur px-3 py-1.5 rounded-full shadow-sm">
                          R{p.price.toLocaleString()}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full text-white bg-gradient-to-r ${level.color}`}>
                          {trust}%
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="font-bold text-sm leading-snug line-clamp-2">{p.title}</div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-[#8A7A6E] truncate">{p.profiles?.name || 'Seller'}</span>
                        <span className="text-xs text-[#B8A99A]">❤ {p.likes || 0}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Orders */}
          {orders.length > 0 && (
            <div className="mt-10 bg-white rounded-[24px] border border-[#FFE4C2] p-5">
              <h3 className="font-bold text-base">Your Orders ({orders.length})</h3>
              <div className="mt-4 space-y-3">
                {orders.map((o) => (
                  <div key={o.id} className="flex justify-between items-center p-4 rounded-2xl bg-[#FFF8F0] border border-[#FFE4C2]">
                    <div>
                      <div className="text-sm font-bold">{o.products?.title || 'Product'}</div>
                      <div className="text-xs text-[#8A7A6E] mt-0.5">
                        R{o.escrow_amount.toLocaleString()} • {new Date(o.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                      o.status === 'delivered' ? 'bg-[#E9FBF0] text-[#16A34A]' : 'bg-[#FFF1A8] text-[#8A5A00]'
                    }`}>
                      {o.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex justify-center pointer-events-none">
          <div className="pointer-events-auto w-[calc(100%-24px)] max-w-[400px] mx-auto mb-4 bg-white/95 backdrop-blur-xl border border-[#FFE4C2] rounded-[28px] shadow-2xl flex justify-between items-center px-3 py-2">
            {[
              { id: 'Home', icon: '🏠' },
              { id: 'Deals', icon: '🔥' },
              { id: 'Sell', icon: '+', center: true },
              { id: 'You', icon: '👤' },
              { id: 'AI', icon: '🤖' },
            ].map((item) => {
              if (item.center) {
                return (
                  <button key={item.id} onClick={() => setShowSell(true)} className="flex-1 flex justify-center">
                    <div className="w-[54px] h-[54px] rounded-full bg-gradient-to-br from-[#FF8A4C] to-[#FF5A7A] text-white flex items-center justify-center font-bold text-2xl -mt-6 border-4 border-[#FFF8F0] shadow-lg">
                      +
                    </div>
                  </button>
                );
              }
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'AI') setShowAI(true);
                    else setActiveNav(item.id);
                  }}
                  className="flex-1 flex flex-col items-center py-1.5"
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className={`text-[10px] font-bold mt-0.5 ${activeNav === item.id ? 'text-[#FF8A4C]' : 'text-[#B8A99A]'}`}>
                    {item.id}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-6">
          <div className="w-full max-w-[540px] bg-white rounded-t-[32px] lg:rounded-[32px] max-h-[92vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="w-14 h-14 rounded-full bg-[#FFF8F0] border overflow-hidden flex items-center justify-center">
                    {selected.profiles?.avatar_url ? (
                      <img src={selected.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      '📦'
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-lg leading-tight">{selected.title}</div>
                    <div className="text-sm text-[#8A7A6E] mt-1">
                      {selected.profiles?.name || 'Seller'} • Trust {selected.profiles?.trust_score || 50}%
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="w-9 h-9 rounded-full bg-[#FFF8F0] border flex items-center justify-center">
                  ✕
                </button>
              </div>

              {selected.image_url && (
                <img src={selected.image_url} alt={selected.title} className="mt-5 w-full aspect-[4/3] object-cover rounded-[22px]" />
              )}

              <div className="mt-5 p-5 rounded-[20px] bg-[#FFF8F0] border border-[#FFE4C2]">
                <div className="text-[28px] font-[900]">R{selected.price.toLocaleString()}</div>
                <p className="text-sm text-[#5A4A3E] mt-2 leading-relaxed">
                  {selected.description || 'No description provided. Message the seller for details.'}
                </p>
              </div>

              <div className="mt-4 p-4 rounded-2xl bg-[#E9FBF0] border border-[#BBF7D0] flex gap-3">
                <span className="text-xl">🔒</span>
                <div>
                  <div className="font-bold text-sm text-[#166534]">Protected by Escrow</div>
                  <div className="text-xs text-[#166534]/80">Your money is held safely until you confirm delivery.</div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button onClick={() => handleBuy(selected)} className="h-12 rounded-full bg-[#1E1E1E] text-white font-bold">
                  Buy with Escrow
                </button>
                <button onClick={() => handleWhatsApp(selected)} className="h-12 rounded-full bg-[#25D366] text-white font-bold">
                  💬 WhatsApp
                </button>
              </div>

              <button
                onClick={() => selected.profiles && setViewProfile(selected.profiles)}
                className="mt-3 w-full h-12 rounded-full bg-white border border-[#FFE4C2] font-bold text-sm"
              >
                View Full Trust Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {viewProfile && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-6">
          <div className="w-full max-w-[440px] bg-white rounded-t-[32px] lg:rounded-[32px] p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF8A4C] to-[#FF5A7A] text-white flex items-center justify-center font-bold text-xl overflow-hidden">
                  {viewProfile.avatar_url ? (
                    <img src={viewProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    viewProfile.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="font-bold text-lg flex items-center gap-2">
                    {viewProfile.name}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1E1E1E] text-white capitalize">
                      {viewProfile.role}
                    </span>
                  </div>
                  <div className="text-sm text-[#8A7A6E] mt-1">{viewProfile.bio}</div>
                  <div className="text-xs text-[#8A7A6E]">{viewProfile.location}</div>
                </div>
              </div>
              <button onClick={() => setViewProfile(null)} className="w-9 h-9 rounded-full bg-[#FFF8F0] border flex items-center justify-center">
                ✕
              </button>
            </div>

            <div className="mt-6 p-5 rounded-[22px] bg-gradient-to-br from-[#FFF8F0] to-[#FFE4C2] border border-[#FFE4C2] text-center">
              <div className="text-[42px] font-[900] leading-none">{viewProfile.trust_score}%</div>
              <div className="text-xs font-bold text-[#8A7A6E] mt-1 uppercase tracking-wider">
                Trust Score • {getTrustLevel(viewProfile.trust_score).label}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white border text-center">
                <div className="text-xl font-[900]">{viewProfile.rating.toFixed(1)}</div>
                <div className="text-[11px] font-bold text-[#8A7A6E]">RATING</div>
              </div>
              <div className="p-4 rounded-2xl bg-white border text-center">
                <div className="text-xl font-[900]">{viewProfile.completed_orders}</div>
                <div className="text-[11px] font-bold text-[#8A7A6E]">ORDERS</div>
              </div>
              <div className="p-4 rounded-2xl bg-white border text-center">
                <div className="text-xl font-[900]">{viewProfile.total_sold}</div>
                <div className="text-[11px] font-bold text-[#8A7A6E]">SOLD</div>
              </div>
            </div>

            <button onClick={() => setViewProfile(null)} className="mt-6 w-full h-12 rounded-full bg-[#1E1E1E] text-white font-bold">
              Close
            </button>
          </div>
        </div>
      )}

      {/* AI Modal */}
      {showAI && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-6">
          <div className="w-full max-w-[520px] bg-white rounded-t-[32px] lg:rounded-[32px] p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-[900] text-xl">TrustLink AI</h3>
                <p className="text-sm text-[#8A7A6E]">Personal + live marketplace intelligence</p>
              </div>
              <button onClick={() => setShowAI(false)} className="w-9 h-9 rounded-full bg-[#FFF8F0] border flex items-center justify-center">
                ✕
              </button>
            </div>

            <input
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder="Ask anything... best sneakers, safe sellers..."
              className="mt-5 w-full h-12 px-5 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
            />
            <button onClick={handleAskAI} className="mt-3 w-full h-12 rounded-full bg-[#7C3AED] text-white font-bold">
              Ask TrustLink AI
            </button>

            {aiAnswer && (
              <div className="mt-5 p-5 rounded-[20px] bg-[#F5F3FF] border border-[#DDD6FE] text-sm leading-relaxed whitespace-pre-line">
                {aiAnswer}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {showSell && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-6">
          <div className="w-full max-w-[520px] bg-white rounded-t-[32px] lg:rounded-[32px] p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-[900] text-xl">List a Product</h3>
              <button onClick={() => setShowSell(false)} className="w-9 h-9 rounded-full bg-[#FFF8F0] border flex items-center justify-center">
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <input
                value={sellTitle}
                onChange={(e) => setSellTitle(e.target.value)}
                placeholder="Title (e.g. Nike Air Jordan 1 Size 8)"
                className="w-full h-12 px-5 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-sm"
              />
              <textarea
                value={sellDesc}
                onChange={(e) => setSellDesc(e.target.value)}
                placeholder="Description, condition, preferred meetup spot..."
                className="w-full min-h-[100px] p-4 rounded-[20px] border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-sm"
              />
              <div className="flex gap-3">
                <input
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="Price (R)"
                  type="number"
                  className="flex-1 h-12 px-5 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-sm"
                />
                <select
                  value={sellCat}
                  onChange={(e) => setSellCat(e.target.value)}
                  className="flex-1 h-12 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] text-sm"
                >
                  {CATEGORIES.filter((c) => c !== 'Everything').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSellImage(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-12 rounded-full border-2 border-dashed border-[#FF8A4C] bg-[#FFF8F0] font-bold text-sm text-[#FF8A4C]"
                >
                  {sellImage ? `📸 ${sellImage.name}` : '📸 Upload clear photo'}
                </button>
              </div>

              <button
                onClick={handleCreateProduct}
                disabled={sellLoading}
                className="w-full h-12 rounded-full bg-[#1E1E1E] text-white font-bold disabled:opacity-50"
              >
                {sellLoading ? 'Listing...' : 'List Product — Go Live'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
