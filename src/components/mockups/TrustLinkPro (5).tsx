import { useState, useMemo, useEffect, useRef } from 'react';

type UserProfile = {
  id: string;
  name: string;
  role: "buyer" | "seller" | "both";
  avatar: string;
  joined: string;
  completedOrders: number;
  totalBought: number;
  totalSold: number;
  rating: number; // out of 10
  productPerformance: number; // %
  trustScore: number; // calculated
  bio: string;
  location: string;
};

type Product = {
  id: string;
  title: string;
  price: string;
  priceNum: number;
  cat: string;
  grad: string;
  emoji: string;
  sellerId: string;
  sellerName: string;
  likes: number;
  views: number;
  rating: number;
  soldCount: number;
  performance: number;
};

type Activity = {
  searches: string[];
  viewedIds: string[];
  likedIds: string[];
  timeSpent: Record<string, number>; // productId -> seconds
  categories: Record<string, number>; // cat -> count
};

const SELLERS: Record<string, UserProfile> = {
  "u1": { id:"u1", name:"Thabo M.", role:"seller", avatar:"TM", joined:"Jan 2024", completedOrders:47, totalBought:12, totalSold:127, rating:9.2, productPerformance:96, trustScore:94, bio:"Vintage curator • Soweto", location:"0.8km • Pimville" },
  "u2": { id:"u2", name:"Anele K.", role:"both", avatar:"AK", joined:"Mar 2024", completedOrders:112, totalBought:34, totalSold:89, rating:9.6, productPerformance:98, trustScore:97, bio:"Tech refurb expert • Trusted since 2024", location:"1.2km • Orlando" },
  "u3": { id:"u3", name:"Karabo S.", role:"seller", avatar:"KS", joined:"Nov 2023", completedOrders:203, totalBought:5, totalSold:342, rating:8.9, productPerformance:94, trustScore:92, bio:"Sneaker plug • 342 pairs sold", location:"0.4km • Dube" },
  "u4": { id:"u4", name:"Lerato D.", role:"both", avatar:"LD", joined:"Jun 2024", completedOrders:28, totalBought:67, totalSold:23, rating:9.4, productPerformance:97, trustScore:90, bio:"Sunday Market Box • Fresh daily", location:"0.3km • Mofolo" },
};

const PRODUCTS: Product[] = [
  { id:"1", title:"Vintage Heavy Tee • L", price:"R 280", priceNum:280, cat:"Fashion", grad:"from-[#FFD6BA] via-[#FFB6C9] to-[#FFDF8C]", emoji:"👕", sellerId:"u1", sellerName:"Thabo", likes:24, views:189, rating:9.1, soldCount:47, performance:96 },
  { id:"2", title:"iPhone 14 • 128GB Mint", price:"R 8,900", priceNum:8900, cat:"Tech", grad:"from-[#BFDBFE] via-[#DDD6FE] to-[#FBCFE8]", emoji:"📱", sellerId:"u2", sellerName:"Anele", likes:56, views:412, rating:9.6, soldCount:12, performance:98 },
  { id:"3", title:"Nike Dunks • Size 8", price:"R 1,650", priceNum:1650, cat:"Fashion", grad:"from-[#FEF08A] via-[#FED7AA] to-[#FCA5A5]", emoji:"👟", sellerId:"u3", sellerName:"Karabo", likes:31, views:267, rating:8.8, soldCount:89, performance:93 },
  { id:"4", title:"Sunday Market Box", price:"R 180", priceNum:180, cat:"Food", grad:"from-[#FFE4B5] via-[#FFDAB9] to-[#FFB6A0]", emoji:"🍓", sellerId:"u4", sellerName:"Lerato", likes:89, views:534, rating:9.7, soldCount:203, performance:99 },
  { id:"5", title:"MacBook Air M2 • 2023", price:"R 14,500", priceNum:14500, cat:"Tech", grad:"from-[#E0E7FF] via-[#F5D0FE] to-[#FFE4E6]", emoji:"💻", sellerId:"u2", sellerName:"Anele", likes:44, views:198, rating:9.5, soldCount:8, performance:97 },
  { id:"6", title:"Handmade Ceramics", price:"R 420", priceNum:420, cat:"Services", grad:"from-[#BBF7D0] via-[#A7F3D0] to-[#FDE68A]", emoji:"🏺", sellerId:"u1", sellerName:"Thabo", likes:12, views:98, rating:9.0, soldCount:23, performance:95 },
];

function calcTrust(u: UserProfile){
  const c = Math.min(u.completedOrders / 2, 40);
  const s = Math.min(u.totalSold / 3, 30);
  const r = (u.rating / 10) * 20;
  const p = (u.productPerformance / 100) * 10;
  return Math.min(99, Math.round(c+s+r+p));
}

export default function TrustLinkPro(){
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(true);
  const [nameInput, setNameInput] = useState("");
  const [roleInput, setRoleInput] = useState<"buyer"|"seller"|"both">("both");
  const [products] = useState<Product[]>(PRODUCTS);
  const [filter, setFilter] = useState("Everything");
  const [search, setSearch] = useState("");
  const [activity, setActivity] = useState<Activity>({ searches:[], viewedIds:[], likedIds:[], timeSpent:{}, categories:{} });
  const [selected, setSelected] = useState<Product | null>(null);
  const [viewProfile, setViewProfile] = useState<UserProfile | null>(null);
  const [showTrack, setShowTrack] = useState(false);
  const [trackProduct, setTrackProduct] = useState<Product | null>(null);
  const [activeNav, setActiveNav] = useState("Home");
  const [toast, setToast] = useState<string|null>(null);
  const viewTimer = useRef<Record<string, number>>({});

  useEffect(()=>{
    const saved = localStorage.getItem("trustlink_user");
    if(saved){
      try{
        const u = JSON.parse(saved);
        setCurrentUser(u);
        setShowProfileSetup(false);
      }catch{}
    }
  },[]);

  const notify = (m:string)=>{ setToast(m); setTimeout(()=>setToast(null),3000); };

  const createProfile = ()=>{
    if(!nameInput.trim()) return notify("Enter your name");
    const newUser: UserProfile = {
      id: "you",
      name: nameInput.trim(),
      role: roleInput,
      avatar: nameInput.trim().slice(0,2).toUpperCase(),
      joined: new Date().toLocaleDateString("en-ZA",{month:"short", year:"numeric"}),
      completedOrders: roleInput==="buyer" ? 8 : roleInput==="seller" ? 3 : 12,
      totalBought: roleInput==="buyer" ? 23 : roleInput==="seller" ? 2 : 15,
      totalSold: roleInput==="seller" ? 18 : roleInput==="buyer" ? 1 : 9,
      rating: 8.5 + Math.random()*1.2,
      productPerformance: 92 + Math.random()*6,
      trustScore: 0,
      bio: roleInput==="seller" ? "New seller • Building trust" : roleInput==="buyer" ? "Verified buyer • Soweto" : "Buyer & Seller • Gauteng",
      location: "0.2km • You • Soweto"
    };
    newUser.trustScore = calcTrust(newUser);
    setCurrentUser(newUser);
    localStorage.setItem("trustlink_user", JSON.stringify(newUser));
    setShowProfileSetup(false);
    notify(`Welcome ${newUser.name}! Profile created 🛡️`);
  };

  const handleSearch = (v:string)=>{
    setSearch(v);
    if(v.length>2){
      setActivity(a=>({
        ...a,
        searches: [...a.searches.slice(-9), v.toLowerCase()],
        categories: {...a.categories, [v.toLowerCase()]: (a.categories[v.toLowerCase()]||0)+1}
      }));
    }
  };

  const handleView = (p:Product)=>{
    setSelected(p);
    setActivity(a=>({
      ...a,
      viewedIds: [...new Set([...a.viewedIds, p.id])],
      categories: {...a.categories, [p.cat]: (a.categories[p.cat]||0)+1}
    }));
    viewTimer.current[p.id] = Date.now();
  };

  const handleCloseView = ()=>{
    if(selected && viewTimer.current[selected.id]){
      const spent = (Date.now() - viewTimer.current[selected.id]) / 1000;
      setActivity(a=>({
        ...a,
        timeSpent: {...a.timeSpent, [selected.id]: (a.timeSpent[selected.id]||0)+spent}
      }));
    }
    setSelected(null);
  };

  const handleLike = (p:Product)=>{
    setActivity(a=>({
      ...a,
      likedIds: a.likedIds.includes(p.id) ? a.likedIds.filter(id=>id!==p.id) : [...a.likedIds, p.id],
      categories: {...a.categories, [p.cat]: (a.categories[p.cat]||0)+1}
    }));
  };

  // Algorithm: Personalized suggestions based on activity
  const recommendations = useMemo(()=>{
    const catScores: Record<string, number> = {...activity.categories};
    activity.viewedIds.forEach(id=>{
      const prod = products.find(x=>x.id===id);
      if(prod) catScores[prod.cat] = (catScores[prod.cat]||0) + 2;
    });
    Object.entries(activity.timeSpent).forEach(([id, sec])=>{
      const prod = products.find(x=>x.id===id);
      if(prod && sec>5) catScores[prod.cat] = (catScores[prod.cat]||0) + sec/10;
    });
    activity.likedIds.forEach(id=>{
      const prod = products.find(x=>x.id===id);
      if(prod) catScores[prod.cat] = (catScores[prod.cat]||0) + 3;
    });
    // If no activity, show top rated
    if(Object.keys(catScores).length===0){
      return [...products].sort((a,b)=>b.rating - a.rating).slice(0,3);
    }
    const topCat = Object.entries(catScores).sort((a,b)=>b[1]-a[1])[0]?.[0];
    let recs = products.filter(p=>p.cat===topCat && !activity.viewedIds.includes(p.id));
    if(recs.length<3) recs = [...recs, ...products.filter(p=>!activity.viewedIds.includes(p.id) && p.cat!==topCat)].slice(0,3);
    if(recs.length===0) recs = products.slice(0,3);
    return recs;
  },[activity, products]);

  const filtered = useMemo(()=> products.filter(p=>{
    const catMatch = filter==="Everything" || p.cat===filter;
    const searchMatch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.cat.toLowerCase().includes(search.toLowerCase());
    return catMatch && searchMatch;
  }),[filter, search, products]);

  const buyProduct = (p:Product)=>{
    setTrackProduct(p);
    setShowTrack(true);
    handleCloseView();
    if(currentUser){
      const updated = {...currentUser, completedOrders: currentUser.completedOrders+1, totalBought: currentUser.totalBought+1, trustScore: calcTrust({...currentUser, completedOrders: currentUser.completedOrders+1})};
      setCurrentUser(updated);
      localStorage.setItem("trustlink_user", JSON.stringify(updated));
    }
    notify(`Order placed • Escrow protecting R ${p.priceNum} 🛡️`);
  };

  if(showProfileSetup){
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-5">
        <div className="w-full max-w-[420px] bg-white rounded-[28px] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-[#FFE4C2]">
          <div className="w-14 h-14 rounded-[18px] bg-gradient-to-br from-[#FF8A4C] to-[#FF5A7A] flex items-center justify-center text-white text-[22px] font-[900] shadow-[0_8px_20px_rgba(255,90,122,0.3)]">TL</div>
          <h1 className="mt-5 text-[26px] font-[900] tracking-[-0.02em] leading-[1.1]">Create your TrustLink profile</h1>
          <p className="mt-2 text-[13px] text-[#8A7A6E]">Buy, sell, build trust. Your activity creates your personal algorithm.</p>
          
          <div className="mt-6">
            <label className="text-[12px] font-bold tracking-[0.08em] text-[#5A4A3E]">YOUR NAME</label>
            <input value={nameInput} onChange={e=>setNameInput(e.target.value)} placeholder="e.g. Trust Link" className="mt-2 w-full h-12 px-4 rounded-[14px] border border-[#FFE4C2] focus:border-[#FF8A4C] outline-none text-[15px]" />
          </div>
          
          <div className="mt-5">
            <label className="text-[12px] font-bold tracking-[0.08em] text-[#5A4A3E]">I WANT TO</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                {id:"buyer", label:"Buy", desc:"Find items", icon:"🛒"},
                {id:"seller", label:"Sell", desc:"List items", icon:"💼"},
                {id:"both", label:"Both", desc:"Buy & Sell", icon:"✨"},
              ].map(o=>(
                <button key={o.id} onClick={()=>setRoleInput(o.id as any)} className={`p-3 rounded-[16px] border text-left transition-all ${roleInput===o.id ? "bg-[#1E1E1E] border-[#1E1E1E] text-white shadow-[0_6px_18px_rgba(0,0,0,0.15)]" : "bg-white border-[#FFE4C2] hover:border-[#FFD6BA]"}`}>
                  <div className="text-[18px]">{o.icon}</div>
                  <div className="mt-1 text-[13px] font-bold">{o.label}</div>
                  <div className={`text-[11px] mt-0.5 ${roleInput===o.id ? "text-white/70" : "text-[#9A8A7E]"}`}>{o.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 p-3 rounded-[14px] bg-[#FFF8F0] border border-[#FFE4C2] text-[11px] text-[#8A7A6E] leading-[1.4]">
            <b className="text-[#1E1E1E]">How trust works:</b> Completed orders • Purchases • Sales • Rating /10 • Product performance • Algorithm learns your searches, likes & time spent to suggest what you love.
          </div>

          <button onClick={createProfile} className="mt-6 w-full h-12 rounded-full bg-gradient-to-br from-[#FF8A4C] to-[#FF5A7A] text-white font-bold shadow-[0_8px_20px_rgba(255,90,122,0.35)] hover:scale-[1.01] transition-transform">Create profile • Start trading ☀️</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] text-[#1E1E1E] antialiased relative">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] bg-[#1E1E1E] text-white text-[13px] font-semibold px-5 py-2.5 rounded-full shadow-xl">{toast}</div>}
      
      <div className="mx-auto max-w-[960px] px-5 pt-4 pb-36">
        {/* Header with profile */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF8A4C] to-[#FF5A7A] text-white flex items-center justify-center font-bold text-[12px] ring-2 ring-white shadow-sm">{currentUser?.avatar}</div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-bold">{currentUser?.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E9FBF0] border border-[#BBF7D0] text-[#16A34A] font-bold">🛡️ {currentUser?.trustScore}% trusted</span>
              </div>
              <div className="text-[11px] text-[#8A7A6E]">{currentUser?.role} • {currentUser?.completedOrders} orders • ⭐ {currentUser?.rating.toFixed(1)}/10</div>
            </div>
          </div>
          <button onClick={()=>setViewProfile(currentUser)} className="h-9 px-3 rounded-full bg-white border border-[#FFE4C2] text-[12px] font-bold">My Profile</button>
        </div>

        <h1 className="mt-7 text-[38px] leading-[0.95] font-[900] tracking-[-0.03em]">
          Find it.<br/><span className="bg-gradient-to-r from-[#FF8A4C] to-[#FF5A7A] bg-clip-text text-transparent">Trust it.</span>
        </h1>

        {/* Search */}
        <div className="mt-4 h-14 rounded-[18px] bg-white border border-[#FFE4C2] shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex items-center px-4 gap-2">
          <span>🔍</span>
          <input value={search} onChange={e=>handleSearch(e.target.value)} placeholder="Search — algorithm learns what you love..." className="flex-1 bg-transparent outline-none text-[15px] font-medium placeholder:text-[#B8A99A]" />
          <span className="text-[10px] px-2 py-1 rounded-full bg-[#FFF1E0] border border-[#FFE4C2] text-[#FF8A4C] font-bold hidden sm:block">🧠 Learning</span>
        </div>

        {/* Algorithm Insights */}
        {(activity.searches.length>0 || activity.viewedIds.length>0) && (
          <div className="mt-4 p-3 rounded-[16px] bg-white border border-[#FFE4C2] flex gap-2 overflow-x-auto">
            <span className="text-[11px] font-bold text-[#FF8A4C] whitespace-nowrap">🧠 Your algorithm:</span>
            {activity.searches.slice(-3).map((s,i)=><span key={i} className="text-[11px] px-2 py-1 rounded-full bg-[#FFF7ED] border border-[#FFEDD5] whitespace-nowrap">"{s}"</span>)}
            {Object.entries(activity.timeSpent).filter(([,sec])=>sec>3).slice(0,2).map(([id,sec])=>{
              const p = products.find(x=>x.id===id);
              return <span key={id} className="text-[11px] px-2 py-1 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] whitespace-nowrap">⏱️ {p?.title.slice(0,15)} {Math.round(sec)}s</span>
            })}
          </div>
        )}

        {/* Personalized For You */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[18px] font-bold flex items-center gap-2">✨ Made for you <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FF8A4C] text-white font-bold">ALGORITHM</span></h3>
            <span className="text-[11px] text-[#8A7A6E]">Based on {activity.viewedIds.length} views • {activity.likedIds.length} likes</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {recommendations.map(p=>(
              <div key={p.id} onClick={()=>handleView(p)} className="rounded-[16px] bg-white border border-[#FFE4C2] p-2.5 cursor-pointer hover:shadow-md transition-all">
                <div className={`h-[64px] rounded-[12px] bg-gradient-to-br ${p.grad} flex items-center justify-center text-[28px]`}>{p.emoji}</div>
                <div className="mt-2 text-[11px] font-semibold line-clamp-1">{p.title}</div>
                <div className="text-[11px] font-bold mt-0.5">{p.price}</div>
                <div className="text-[10px] text-[#FF8A4C] mt-1">★ {p.rating} • Why you? {p.cat}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 flex gap-2 overflow-x-auto">
          {["Everything","Tech","Fashion","Food","Services"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} className={`h-8 px-3.5 rounded-full border text-[13px] font-semibold whitespace-nowrap ${filter===f ? "bg-[#1E1E1E] text-white border-[#1E1E1E]" : "bg-white border-[#FFE4C2] text-[#5A4A3E]"}`}>{f}</button>
          ))}
        </div>

        {/* Products */}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(p=>{
            const seller = SELLERS[p.sellerId];
            return (
              <div key={p.id} className="group rounded-[20px] bg-white border border-[#FFE4C2] overflow-hidden shadow-[0_4px_18px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all">
                <div onClick={()=>handleView(p)} className={`h-[132px] bg-gradient-to-br ${p.grad} flex items-center justify-center relative cursor-pointer`}>
                  <span className="text-[44px] group-hover:scale-110 transition-transform">{p.emoji}</span>
                  <div className="absolute top-2 left-2 h-5 px-2 rounded-full bg-white/90 text-[10px] font-bold flex items-center gap-1">🛡️ {seller.trustScore}%</div>
                  <button onClick={(e)=>{e.stopPropagation(); handleLike(p)}} className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center ${activity.likedIds.includes(p.id) ? "bg-[#FF5A7A] text-white" : "bg-white/90 text-[#9A8A7E]"}`}>♥</button>
                  <div className="absolute bottom-2 left-2 h-5 px-2 rounded-full bg-[#1E1E1E]/80 text-white text-[10px] font-semibold">⭐ {p.rating}/10 • {p.soldCount} sold</div>
                </div>
                <div className="p-3">
                  <div onClick={()=>handleView(p)} className="cursor-pointer">
                    <div className="text-[13px] font-semibold line-clamp-1">{p.title}</div>
                    <div className="mt-1 flex justify-between items-center">
                      <span className="text-[15px] font-[800]">{p.price}</span>
                      <span className="text-[10px] text-[#9A8A7E]">{p.views} views</span>
                    </div>
                  </div>
                  <div onClick={()=>setViewProfile(seller)} className="mt-2 flex items-center gap-1.5 cursor-pointer p-1.5 -mx-1.5 rounded-full hover:bg-[#FFF8F0] transition-colors">
                    <div className="w-6 h-6 rounded-full bg-[#FFF1E0] border border-[#FFE4C2] flex items-center justify-center text-[10px] font-bold">{seller.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold truncate">{seller.name} • {seller.trustScore}% trusted</div>
                      <div className="text-[10px] text-[#8A7A6E] truncate">{seller.completedOrders} orders • {seller.productPerformance}% perf</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Product Detail */}
        {selected && (
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-6">
            <div className="w-full max-w-[460px] bg-[#FFF8F0] rounded-t-[28px] lg:rounded-[28px] shadow-2xl max-h-[92vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between">
                  <div className={`w-[84px] h-[84px] rounded-[20px] bg-gradient-to-br ${selected.grad} flex items-center justify-center text-[40px]`}>{selected.emoji}</div>
                  <button onClick={handleCloseView} className="w-8 h-8 rounded-full bg-white border">✕</button>
                </div>
                <h3 className="mt-4 text-[20px] font-bold">{selected.title}</h3>
                <div className="mt-2 flex gap-2">
                  <span className="text-[12px] px-2.5 py-1 rounded-full bg-[#1E1E1E] text-white font-bold">⭐ {selected.rating}/10 rating</span>
                  <span className="text-[12px] px-2.5 py-1 rounded-full bg-[#E9FBF0] border border-[#BBF7D0] text-[#16A34A] font-bold">{selected.performance}% performance</span>
                  <span className="text-[12px] px-2.5 py-1 rounded-full bg-white border border-[#FFE4C2] font-bold">{selected.soldCount} sold</span>
                </div>
                <div className="mt-4 p-3 rounded-[14px] bg-white border border-[#FFE4C2] flex items-center gap-3 cursor-pointer" onClick={()=>{const s=SELLERS[selected.sellerId]; setViewProfile(s)}}>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF8A4C] to-[#FF5A7A] text-white flex items-center justify-center font-bold">{SELLERS[selected.sellerId].avatar}</div>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold">{SELLERS[selected.sellerId].name} • 🛡️ {SELLERS[selected.sellerId].trustScore}% trusted</div>
                    <div className="text-[11px] text-[#8A7A6E]">{SELLERS[selected.sellerId].completedOrders} completed • Bought {SELLERS[selected.sellerId].totalBought} • Sold {SELLERS[selected.sellerId].totalSold} • ⭐ {SELLERS[selected.sellerId].rating.toFixed(1)}/10</div>
                  </div>
                  <span className="text-[#9A8A7E]">›</span>
                </div>
                <div className="mt-5 flex justify-between items-center">
                  <span className="text-[28px] font-[900]">{selected.price}</span>
                  <span className="text-[11px] text-[#8A7A6E]">⏱️ You viewed {Math.round(activity.timeSpent[selected.id]||0)}s • {activity.likedIds.includes(selected.id) ? "♥ Liked" : ""}</span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button onClick={handleCloseView} className="h-12 rounded-full bg-white border font-bold">Close</button>
                  <button onClick={()=>buyProduct(selected)} className="h-12 rounded-full bg-[#1E1E1E] text-white font-bold">Buy • Escrow • {selected.price}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile View */}
        {viewProfile && (
          <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-6">
            <div className="w-full max-w-[460px] bg-white rounded-t-[28px] lg:rounded-[28px] shadow-2xl max-h-[92vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between">
                  <div className="flex gap-3">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FF8A4C] to-[#FF5A7A] text-white flex items-center justify-center font-bold text-[16px]">{viewProfile.avatar}</div>
                    <div>
                      <div className="text-[18px] font-bold flex items-center gap-2">{viewProfile.name} <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#1E1E1E] text-white">{viewProfile.role}</span></div>
                      <div className="text-[12px] text-[#8A7A6E]">{viewProfile.bio} • {viewProfile.location}</div>
                      <div className="text-[11px] text-[#8A7A6E] mt-1">Joined {viewProfile.joined}</div>
                    </div>
                  </div>
                  <button onClick={()=>setViewProfile(null)} className="w-8 h-8 rounded-full bg-[#FFF8F0] border">✕</button>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-[16px] bg-[#FFF8F0] border border-[#FFE4C2] text-center">
                    <div className="text-[20px] font-[900]">{viewProfile.trustScore}%</div>
                    <div className="text-[10px] font-bold text-[#8A7A6E] mt-1">TRUST SCORE</div>
                  </div>
                  <div className="p-3 rounded-[16px] bg-white border border-[#FFE4C2] text-center">
                    <div className="text-[20px] font-[900]">{viewProfile.rating.toFixed(1)}/10</div>
                    <div className="text-[10px] font-bold text-[#8A7A6E] mt-1">SERVICE</div>
                  </div>
                  <div className="p-3 rounded-[16px] bg-[#E9FBF0] border border-[#BBF7D0] text-center">
                    <div className="text-[20px] font-[900]">{viewProfile.productPerformance}%</div>
                    <div className="text-[10px] font-bold text-[#16A34A] mt-1">PRODUCT PERF</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-[14px] bg-white border text-center"><div className="text-[16px] font-bold">{viewProfile.completedOrders}</div><div className="text-[10px] text-[#8A7A6E]">Completed</div></div>
                  <div className="p-3 rounded-[14px] bg-white border text-center"><div className="text-[16px] font-bold">{viewProfile.totalBought}</div><div className="text-[10px] text-[#8A7A6E]">Bought</div></div>
                  <div className="p-3 rounded-[14px] bg-white border text-center"><div className="text-[16px] font-bold">{viewProfile.totalSold}</div><div className="text-[10px] text-[#8A7A6E]">Sold</div></div>
                </div>

                <div className="mt-4 p-3 rounded-[14px] bg-[#FFF8F0] border border-[#FFE4C2] text-[11px] text-[#8A7A6E]">
                  <b className="text-[#1E1E1E]">Can you trust {viewProfile.name}?</b> • {viewProfile.completedOrders>50 ? "Highly trusted" : viewProfile.completedOrders>20 ? "Trusted" : "Building trust"} • {viewProfile.rating>=9 ? "Excellent service" : "Good service"} • {viewProfile.productPerformance>=95 ? "Products perform excellently" : "Products perform well"} • {viewProfile.totalSold} products sold, {viewProfile.totalBought} bought.
                </div>

                <button onClick={()=>setViewProfile(null)} className="mt-5 w-full h-12 rounded-full bg-[#1E1E1E] text-white font-bold">Close profile</button>
              </div>
            </div>
          </div>
        )}

        {/* Tracking */}
        {showTrack && (
          <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-6">
            <div className="w-full max-w-[460px] bg-white rounded-t-[28px] lg:rounded-[28px] shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between">
                  <div><div className="text-[10px] font-bold tracking-[0.18em] text-[#FF8A4C]">ORDER TL-{trackProduct?.id}8842 • ESCROW</div><h3 className="text-[20px] font-[800] mt-1">Track Order • {trackProduct?.title}</h3></div>
                  <button onClick={()=>setShowTrack(false)} className="w-8 h-8 rounded-full bg-[#FFF8F0] border">✕</button>
                </div>
                <div className="mt-4 rounded-[18px] bg-[#1E1E1E] p-4 text-white"><div className="flex justify-between"><span className="text-[12px] px-2.5 py-1 rounded-full bg-white/10">Live • Thabo</span><span className="text-[12px] opacity-70">071 123 4567</span></div><div className="mt-6 text-[13px] opacity-80">2.4km away • ETA 18m • Doorstep</div><div className="mt-3 h-1.5 rounded-full bg-white/20 overflow-hidden"><div className="h-full w-[72%] bg-gradient-to-r from-[#FF8A4C] to-[#FF5A7A]" /></div></div>
                <button onClick={()=>{setShowTrack(false); notify("Confirmed! Funds released to seller ✅"); if(currentUser){const u={...currentUser, completedOrders: currentUser.completedOrders+1, trustScore: Math.min(99, currentUser.trustScore+1)}; setCurrentUser(u); localStorage.setItem("trustlink_user", JSON.stringify(u));}}} className="mt-6 w-full h-12 rounded-full bg-[#1E1E1E] text-white font-bold">Confirm delivery</button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Nav */}
        <div className="fixed bottom-0 inset-x-0 z-40 flex justify-center pointer-events-none">
          <div className="pointer-events-auto w-[calc(100%-20px)] max-w-[460px] mb-3 bg-white/95 backdrop-blur-xl border border-[#FFE4C2] rounded-[26px] shadow-[0_12px_40px_rgba(255,138,76,0.18)] flex justify-between items-center px-2 py-1.5">
            {[
              {id:"Home", act:()=>{setActiveNav("Home"); window.scrollTo({top:0, behavior:'smooth'})}},
              {id:"Track", act:()=>{setActiveNav("Track"); setShowTrack(true); setTrackProduct(products[0])}},
              {id:"Sell", act:()=>{setActiveNav("Sell"); notify("Sell coming: list in TrustLinkFull")}, center:true},
              {id:"Likes", act:()=>{setActiveNav("Likes"); notify(`You liked ${activity.likedIds.length} items • Algorithm learning ♥`)}},
              {id:"You", act:()=>{setActiveNav("You"); if(currentUser) setViewProfile(currentUser)}},
            ].map(it=>{
              if((it as any).center) return <button key={it.id} onClick={it.act} className="flex-1 flex justify-center"><div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#FF8A4C] to-[#FF5A7A] text-white flex items-center justify-center font-bold shadow-lg">+</div></button>
              return <button key={it.id} onClick={it.act} className="flex-1 flex flex-col items-center py-1.5"><span className={`text-[10px] font-bold ${activeNav===it.id ? "text-[#FF8A4C]" : "text-[#B8A99A]"}`}>{it.id}</span></button>
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
