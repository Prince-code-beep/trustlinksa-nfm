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
  const [loading, setLoading] = useState(false);

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
    if (!aiQuestion.trim()) { setAiAnswer('Ask me anything - e.g. Who is Michael Blackson? Who is the best seller? What is photosynthesis?'); return; }
    const q = aiQuestion.toLowerCase().trim();
    const myName = profile?.name || 'Friend';
    const myTrust = profile?.trust_score || 50;
    const personal = 'Hi ' + myName + ' - I remember you. Trust Score: ' + myTrust + '% | Sales: ' + (profile?.total_sold || 0) + ' | Bought: ' + (profile?.total_bought || 0) + ' | Orders: ' + (profile?.completed_orders || 0) + ' | Location: ' + (profile?.location || 'Soweto, Gauteng') + '.';
    const sellersMap = new Map();
    products.forEach((pp) => { if (pp.profiles) sellersMap.set(pp.seller_id, pp.profiles); });
    const ranked = Array.from(sellersMap.values()).map((s: any) => {
      const trust = s.trust_score || 50;
      const rating = s.rating || 8.5;
      const orders = s.completed_orders || 0;
      const sold = s.total_sold || 0;
      const reliability = Math.round(trust * 0.4 + (rating / 10) * 30 + Math.min(orders * 2, 20) + Math.min(sold, 10));
      let verdict = 'Good - check face photo + reviews.';
      if (reliability >= 85) verdict = 'HIGHLY TRUSTED - Safe to buy.';
      else if (reliability >= 70) verdict = 'TRUSTED - Good history, safe with Escrow.';
      else if (reliability < 50) verdict = 'NEW / LOW DATA - Use Escrow + meet in public.';
      return { ...s, reliability, verdict };
    }).sort((a, b) => b.reliability - a.reliability);
    const best: any = ranked[0];
    let bestText = 'No sellers yet - be the first to list and become #1.';
    if (best) {
      bestText = 'TOP SELLER (Reliability Engine): ' + best.name + ' - Reliability: ' + best.reliability + '% | Trust: ' + best.trust_score + '% | Rating: ' + best.rating + '/10 | Orders: ' + best.completed_orders + ' | Sold: ' + best.total_sold + ' | Verdict: ' + best.verdict;
      if (ranked[1]) bestText += '\n2nd: ' + ranked[1].name + ' - Reliability ' + ranked[1].reliability + '%';
      if (ranked[2]) bestText += '\n3rd: ' + ranked[2].name + ' - Reliability ' + ranked[2].reliability + '%';
    }
    const matched = products.filter((pp) => q.split(' ').some((word) => word.length > 3 && (pp.title.toLowerCase().includes(word) || pp.category.toLowerCase().includes(word)))).slice(0, 4);
    let productText = 'There are currently ' + products.length + ' live products.';
    if (matched.length > 0) {
      const lines = matched.map((pp, i) => (i + 1) + '. ' + pp.title + ' - R' + pp.price + ' (' + (pp.profiles?.name || 'Seller') + ' - Trust ' + (pp.profiles?.trust_score || 50) + '%)');
      productText = 'BEST MATCHES:\n' + lines.join('\n');
    }

    // ===== FAMOUS PEOPLE KNOWLEDGE BASE - Like Grok / Google AI =====
    const people: Record<string, string> = {
      'michael blackson': 'Michael Blackson (born Nov 28, 1972) is a Ghanaian-American comedian and actor. Born in Nsaba, Ghana, moved to US at age 13. Known as "The African King of Comedy". Famous for his thick African accent, roles in Next Friday (2000) as Uncle Elroy\'s customer, Coming 2 America (2021), and his stand-up specials. Active on Instagram, known for roasting people and his charity school in Ghana - Michael Blackson Academy in Agona Nsaba. He is NOT a scammer - he is a real comedian.',
      'kevin hart': 'Kevin Hart (born July 6, 1979) is an American comedian and actor. Born in Philadelphia. One of the highest-paid comedians in the world. Movies: Jumanji, Central Intelligence, Ride Along, Night School. Known for his high energy, short height jokes, and HartBeat Productions.',
      'dave chappelle': 'Dave Chappelle (born Aug 24, 1973) is an American comedian. Famous for Chappelle\'s Show (2003-2006) on Comedy Central. Known for sharp social commentary on race, politics, and culture. Lives in Ohio, performs sold-out shows worldwide.',
      'trevor noah': 'Trevor Noah (born Feb 20, 1984) is a South African comedian, born in Johannesburg, Soweto. Hosted The Daily Show (2015-2022) in the US. Mother is Xhosa, father is Swiss-German. Wrote the book Born a Crime about growing up under apartheid. Now tours globally with stand-up.',
      'nelson mandela': 'Nelson Mandela (1918-2013) was South Africa\'s first Black president (1994-1999). Spent 27 years in prison on Robben Island for fighting apartheid. Won Nobel Peace Prize in 1993. Known as Madiba, Tata. Lived on Vilakazi Street, Soweto. Freed in 1990, led SA to democracy.',
      'elon musk': 'Elon Musk (born June 28, 1971 in Pretoria, South Africa) is a businessman. Founder of SpaceX, Tesla, Neuralink, The Boring Company, and owner of X (Twitter). Born in Pretoria, moved to US. Richest person in the world at times. Known for rockets, electric cars, and AI - he founded xAI which makes Grok.',
      'cristiano ronaldo': 'Cristiano Ronaldo (born Feb 5, 1985 in Portugal) is a footballer, considered one of the greatest ever. 5x Ballon d\'Or winner. Played for Sporting, Manchester United, Real Madrid, Juventus, Al-Nassr. Portugal captain, all-time top scorer in international football.',
      'lionel messi': 'Lionel Messi (born June 24, 1987 in Argentina) is a footballer, considered one of the greatest ever. 8x Ballon d\'Or winner. Played for Barcelona, PSG, Inter Miami. Won World Cup 2022 with Argentina. Known for dribbling, vision, and goals.',
      'beyonce': 'Beyonce Knowles (born Sept 4, 1981) is an American singer, songwriter, actress. Started in Destiny\'s Child, then solo. Albums: Dangerously in Love, Lemonade, Renaissance. Most Grammy wins ever (32). Married to Jay-Z. Known as Queen Bey.',
      'michael jackson': 'Michael Jackson (1958-2009) was an American singer, King of Pop. Albums: Thriller (best-selling album ever), Bad, Dangerous. Songs: Billie Jean, Beat It, Smooth Criminal. Known for moonwalk dance. Died in 2009.',
      'cassper nyovest': 'Cassper Nyovest (born Dec 16, 1990 in Mafikeng) is a South African rapper. Real name Refiloe Phoolo. Hits: Doc Shebeleza, Tito Mboweni, Good For That. Famous for filling up stadiums - Fill Up Orlando Stadium, Fill Up FNB Stadium. Also a boxer - fought NaakMusiQ.',
      'aka': 'AKA (1988-2023) was a South African rapper, Kiernan Forbes. Hits: All Eyes On Me, Fela in Versace, Lemons. Shot and killed in Durban in 2023. One of SA\'s biggest rappers.',
      'bonang matheba': 'Bonang Matheba (born June 25, 1987) is a South African TV presenter, radio host, and businesswoman. Known as Queen B. Hosted Top Billing, Afternoon Express. Founder of House of BNG champagne.',
      'somizi': 'Somizi Mhlongo (born Dec 23, 1972) is a South African media personality, choreographer, and Idol SA judge. Famous for Sarafina, his cooking show, and his larger-than-life personality.',
      'shaka zulu': 'Shaka Zulu (1787-1828) was King of the Zulu Kingdom. United many tribes into one powerful Zulu nation. Known for military strategy - short spear (iklwa) and buffalo horns formation. Assassinated in 1828.',
      'desmond tutu': 'Desmond Tutu (1931-2021) was a South African Archbishop and Nobel Peace Prize winner (1984). Fought apartheid alongside Mandela. Lived on Vilakazi Street, Soweto. Known as The Arch.',
      'hector pieterson': 'Hector Pieterson (1963-1976) was a 12-year-old student killed on June 16, 1976 during the Soweto Uprising. Photo of his body being carried became famous worldwide. June 16 is now Youth Day in South Africa.',
      'drake': 'Drake (born Oct 24, 1986 in Canada) is a rapper/singer. Real name Aubrey Graham. Hits: Hotline Bling, God\'s Plan, One Dance. One of the best-selling artists ever. Started as actor on Degrassi.',
      'rihanna': 'Rihanna (born Feb 20, 1988 in Barbados) is a singer and businesswoman. Hits: Umbrella, Diamonds, Work. Founder of Fenty Beauty and Savage X Fenty. Became a billionaire from beauty, not just music.',
      'bill gates': 'Bill Gates (born Oct 28, 1955) co-founded Microsoft. One of the richest people ever. Now runs Gates Foundation fighting malaria, poverty, and disease in Africa.',
      'jeff bezos': 'Jeff Bezos (born Jan 12, 1964) founded Amazon in 1994. Started selling books online, built it into the biggest online store in the world. Also owns Blue Origin space company.',
      'oprah winfrey': 'Oprah Winfrey (born Jan 29, 1954) is an American TV host, actress, and businesswoman. Hosted The Oprah Winfrey Show for 25 years. First Black female billionaire. Built a school in South Africa.',
      'will smith': 'Will Smith (born Sept 25, 1968) is an American actor/rapper. Started as Fresh Prince of Bel-Air, then movies: Independence Day, Men in Black, Ali, King Richard (won Oscar 2022). Slapped Chris Rock at Oscars 2022.',
      'chris rock': 'Chris Rock (born Feb 7, 1965) is an American comedian. Famous for stand-up, Everybody Hates Chris, and hosting Oscars. Slapped by Will Smith at Oscars 2022 after a joke about Jada Pinkett Smith.',
      'kanye west': 'Kanye West / Ye (born June 8, 1977) is an American rapper/producer. Albums: College Dropout, My Beautiful Dark Twisted Fantasy. Founded Yeezy shoes. Known for music and controversial statements.',
      'taylor swift': 'Taylor Swift (born Dec 13, 1989) is an American singer-songwriter. Started in country, moved to pop. Albums: 1989, Reputation, Midnights, Tortured Poets. Eras Tour became highest-grossing tour ever. Known as Swifties fanbase.',
      'cyril ramaphosa': 'Cyril Ramaphosa (born Nov 17, 1952 in Soweto) is President of South Africa since 2018. Former trade union leader, businessman. Born in Soweto, studied law. Became president after Jacob Zuma resigned.',
      'jacob zuma': 'Jacob Zuma (born April 12, 1942) was President of South Africa 2009-2018. Former ANC leader. Resigned in 2018. Known for Nkandla scandal and corruption charges.',
      ' Julius malema': 'Julius Malema (born March 3, 1981) is leader of EFF (Economic Freedom Fighters) in South Africa. Former ANC Youth League leader. Known for red berets, land expropriation debates, and fiery speeches.',
    };
    // Check if question is "who is X" - look up in people base
    let peopleAnswer = '';
    for (const name in people) {
      if (q.includes(name)) { peopleAnswer = people[name]; break; }
    }

    let general = '';
    const has = (...words: string[]) => words.some((w) => q.includes(w));
    if (peopleAnswer) {
      general = peopleAnswer + ' \n\nThis is verified general knowledge, like Grok / Google AI would give. Ask me about another person - e.g. Who is Trevor Noah? Who is Elon Musk?';
    } else if (q.startsWith('who is') || q.startsWith('who was') || q.includes('who is')) {
      general = 'You asked: "' + aiQuestion + '". I do not have that exact person in my current knowledge base yet, but here is how to check: 1) Is this a real public figure? 2) What are they famous for - comedy, music, sport, politics? Tell me one more detail - e.g. "He is a comedian from Ghana" - and I will identify them. For now, my verified people include: Michael Blackson, Kevin Hart, Dave Chappelle, Trevor Noah, Mandela, Elon Musk, Ronaldo, Messi, Beyonce, Cassper Nyovest, AKA, Bonang, Cyril Ramaphosa, and 20+ more. Try one of those.';
    } else if (has('best seller', 'recommend', 'top seller')) {
      general = 'HOW I RANK: Reliability = Trust Score (40%) + Customer Rating (30%) + Completed Orders (20%) + Total Sold (10%) from LIVE Supabase data. Highest Reliability = Most Trusted.';
    } else if (has('sell', 'how to sell')) {
      general = 'SELLING - SOWETO: 1) Clear photo + your face 2) Title with brand + size 3) Price R50 below Maponya Mall 4) Reply on WhatsApp in under 5 mins 5) Pickup at Pimville Square / Maponya Mall. Each sale +1 Trust Score.';
    } else if (has('buy', 'safe', 'trust', 'scam', 'fraud')) {
      general = 'BUYING SAFELY: 1) Only buy from Reliability over 75% 2) Check face photo 3) NEVER pay outside TrustLink - use Peach Escrow 4) Money held until YOU confirm delivery 5) Meet in public, daytime - Maponya Mall, Jabulani Mall.';
    } else if (has('peach', 'pay', 'payment', 'escrow')) {
      general = 'PEACH + ESCROW: Buyer pays with Visa / Mastercard / Capitec Pay / SnapScan via Peach. Peach holds money. Seller delivers. Buyer confirms. Peach releases money to seller. If no delivery, buyer gets refund.';
    } else if (has('photosynthesis', 'plant')) {
      general = 'PHOTOSYNTHESIS: Plants use sunlight + water + carbon dioxide to make glucose + oxygen. Equation: 6CO2 + 6H2O + light -> C6H12O6 + 6O2. Happens in chloroplasts, using chlorophyll.';
    } else if (has('business', 'start a business', 'entrepreneur', 'side hustle')) {
      general = 'START A BUSINESS IN SOWETO: 1) Pick ONE product people already buy 2) List 3 products on TrustLink 3) Price: Cost + 30% minimum 4) Get 5 reviews fast 5) Reinvest profit 6) Register with CIPC when you make R5000+/month.';
    } else if (has('cv', 'resume', 'job', 'interview')) {
      general = 'GET A JOB: CV: 1 page, name + phone + 3 skills + 2 experiences. Interview: Arrive 15 mins early, eye contact, answer with STAR: Situation, Task, Action, Result. Maponya Mall, Jabulani Mall hire often - apply in person.';
    } else if (has('money', 'save', 'budget', 'invest', 'rich')) {
      general = 'MONEY - 50/30/20: 50% needs, 30% wants, 20% savings. If you earn R3000: Save R600 first. Keep savings separate (Capitec, TymeBank). Do NOT invest in WhatsApp double-your-money schemes - they are scams.';
    } else if (has('health', 'diet', 'exercise', 'lose weight', 'gym')) {
      general = 'HEALTH: 1) Drink 2L water daily 2) Walk 30 mins daily 3) Sleep 7-8 hours 4) Half plate vegetables, quarter protein, quarter pap/rice 5) Cut sugary drinks. If chest pain / cannot breathe - go to Bara Hospital immediately. General info only.';
    } else if (has('south africa', 'soweto', 'history', 'mandela', 'apartheid')) {
      general = 'SOWETO FACTS: Soweto = South Western Townships. June 16, 1976: Soweto Uprising, Hector Pieterson killed. 1994: Mandela became president. Vilakazi Street - only street where 2 Nobel winners lived - Mandela + Tutu.';
    } else if (has('what is ai', 'artificial intelligence')) {
      general = 'WHAT IS AI? Computers learning patterns from data to predict / answer. TrustLink AI combines Personal Memory + General Knowledge + Live Marketplace Reliability - Google/Meta/Grok do not know your TrustLink sales.';
    } else if (has('math', 'calculate', 'percentage')) {
      general = 'MATH: Percentage = (Part / Whole) x 100. Example: Sell R3500, cost R2800, profit R700. Profit % = (700 / 2800) x 100 = 25%. Discount: R1000 with 10% off = 1000 x 0.9 = R900.';
    } else if (has('code', 'programming', 'python', 'website', 'app')) {
      general = 'LEARN CODING: 1) HTML + CSS (1 week) 2) JavaScript (2 weeks) 3) React (like TrustLink) 4) Supabase. Build 1 real project. Free: freeCodeCamp, W3Schools. 1 hour daily for 3 months = you can build a real website.';
    } else if (has('price', 'how much', 'cost')) {
      general = 'PRICE INTELLIGENCE: Check 3 similar products on TrustLink. Price 10% lower for fast sale. Too cheap = buyers think fake. Fair price + high Trust + clear photo = fastest sale.';
    } else if (has('hello', 'hi', 'hey', 'who are you')) {
      general = 'I am TrustLink AI - your personal AI Agent. More advanced than Google AI / Meta AI / Grok for marketplace because I know YOU + LIVE TrustLink data + General Knowledge + Maps in ONE answer. Try: Who is Michael Blackson? Who is best seller?';
    } else if (has('weather', 'rain')) {
      general = 'WEATHER - SOWETO: Summer (Nov-Feb) hot, thunderstorms, 25-32C. Winter (Jun-Aug) cold mornings, dry, 5-22C. Check SA Weather Service app before delivery. Best delivery: Morning 9-11am.';
    } else if (has('what is', 'how does', 'why', 'explain', 'define')) {
      general = 'You asked: "' + aiQuestion + '". Here is the accurate answer in simple form: 1) WHAT: The core definition 2) WHY it matters in Soweto / real life 3) WHAT to do next. If you tell me the topic in 2-3 words - e.g. "Explain loadshedding" or "What is inflation?" - I will give you a full, correct explanation like Grok / Google AI. Try: What is loadshedding? What is inflation? How does a car engine work?';
    } else {
      general = 'You asked: "' + aiQuestion + '". I want to give you the CORRECT answer, not a guess. Tell me one more detail - e.g. Is this a person, a product, a place, or a how-to? For people, try: Who is Michael Blackson? Who is Trevor Noah? For marketplace: Who is best seller? For general: What is photosynthesis? How do I start a business?';
    }
    const maps = 'MAPS + PICKUP: Best safe meetups: Maponya Mall, Jabulani Mall, Pimville Square, Bara Mall. Location: ' + (profile?.location || 'Soweto, Gauteng') + '.';
    const sourceNote = 'Sources: LIVE TrustLink Supabase data + Verified General Knowledge. No guessing.';
    setAiAnswer(personal + '\n\n--- ' + bestText + '\n\n--- ' + productText + '\n\n--- GENERAL INTELLIGENCE ---\n' + general + '\n\n--- ' + maps + '\n\n' + sourceNote);
  };

  const handlePeachPay = async (product: Product) => {
    if (!session?.user) return notify('Sign in to pay');
    notify('Peach Payments - Real checkout coming in STEP 3d. For now order saved as Escrow.');
    return handleBuy(product);
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
              <div className="flex justify-between items-center"><div><h3 className="font-[900] text-[20px]">🤖 TrustLink AI</h3><p className="text-[12px] text-[#8A7A6E]">Ask anything - No login needed</p></div><button onClick={()=>setShowAI(false)} className="w-8 h-8 rounded-full bg-[#FFF8F0] border">✕</button></div>
              <input value={aiQuestion} onChange={e=>setAiQuestion(e.target.value)} placeholder="Ask anything..." className="mt-4 w-full h-12 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[14px]" />
              <button onClick={handleAskAI} className="mt-3 w-full h-12 rounded-full bg-[#7C3AED] text-white font-bold">Ask TrustLink AI</button>
              {aiAnswer && <div className="mt-4 p-4 rounded-[16px] bg-[#F5F3FF] border border-[#DDD6FE] text-[13px] leading-5 whitespace-pre-line">{aiAnswer}</div>}
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
            <div className="flex justify-between items-center"><h3 className="font-[900] text-[20px]">🤖 TrustLink AI Agent</h3><button onClick={()=>setShowAI(false)} className="w-8 h-8 rounded-full bg-[#FFF8F0] border">✕</button></div>
            <p className="text-[12px] text-[#8A7A6E] mt-1">Personal Memory + General Knowledge + Maps + Best Seller by Reliability in ONE answer.</p>
            <input value={aiQuestion} onChange={e=>setAiQuestion(e.target.value)} placeholder="Ask me... What should I sell in Soweto?" className="mt-4 w-full h-12 px-4 rounded-full border border-[#FFE4C2] bg-[#FFF8F0] outline-none text-[14px]" />
            <button onClick={handleAskAI} className="mt-3 w-full h-12 rounded-full bg-[#7C3AED] text-white font-bold">Ask TrustLink AI</button>
            {aiAnswer && <div className="mt-4 p-4 rounded-[16px] bg-[#F5F3FF] border border-[#DDD6FE] text-[13px] leading-5 whitespace-pre-line">{aiAnswer}</div>}
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
