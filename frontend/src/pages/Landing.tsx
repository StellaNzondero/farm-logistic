import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, apiUrl } from "../api";
import { Sprout, ShieldCheck, Smartphone, Link as LinkIcon, Truck, Clock } from "lucide-react";

type Auction = {
  id: number;
  productId: number;
  startsAt: string;
  endsAt: string;
  status: "OPEN" | "CLOSED" | string;
  currentPrice: number;
  currentWinnerUserId?: number | null;
  currentWinnerName?: string | null;
};

type Product = {
  id: number;
  title: string;
  location?: string | null;
  unit?: string | null;
  quantity?: number | null;
  startingPrice: number;
  currency: string;
  status: string;
  imageUrl?: string | null;
  auction?: Auction | null;
  ownerUserId: number;
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function timeLeft(endsAtIso: string | null | undefined) {
  if (!endsAtIso) return { label: "—", expired: false };
  const ends = new Date(endsAtIso).getTime();
  const diff = Math.max(0, ends - Date.now());
  const s = Math.floor(diff / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  
  if (diff <= 0) return { label: "Terminé", expired: true };

  let label = "";
  if (hh > 0) label = `${hh}h ${mm}m`;
  else if (mm > 0) label = `${mm}m ${ss}s`;
  else label = `${ss}s`;

  return { label, expired: false };
}

export default function Landing() {
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [featured, setFeatured] = useState<Product | null>(null);
  const [stats, setStats] = useState<{ userCount: number; totalVolume: number } | null>(null);
  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const health = await apiFetch<{ ok: boolean }>("/api/health");
      setApiOk(health.ok);

      const statsRes = await apiFetch<{ userCount: number; totalVolume: number }>("/api/stats");
      if (statsRes.ok) setStats(statsRes.data);

      const productsRes = await apiFetch<{ products: Product[] }>("/api/products");
      if (productsRes.ok && productsRes.data.products?.length > 0) {
        // On prend le premier produit qui a une enchère ouverte
        const open = productsRes.data.products.find(p => p.auction?.status === "OPEN");
        setFeatured(open || productsRes.data.products[0]);
      }
    } catch {
      setApiOk(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const timer = timeLeft(featured?.auction?.endsAt);

  return (
    <div className="agri-lp antialiased min-h-screen">
      {/* Navigation */}
      <nav className="fixed w-full z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-agri-green rounded-xl flex items-center justify-center text-white">
              <Sprout size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight uppercase text-agri-green">FarmLogistics</span>
          </div>
          
          <div className="hidden md:flex items-center gap-10 font-medium text-sm uppercase tracking-widest text-agri-green/70">
            <a href="#" className="hover:text-agri-green transition-colors">Marché</a>
            <a href="#" className="hover:text-agri-green transition-colors">Logistique</a>
            <a href="#" className="hover:text-agri-green transition-colors">Sécurité</a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-bold uppercase tracking-wider px-4 py-2 hover:opacity-70 transition-opacity">Connexion</Link>
            <Link to="/register" className="btn-premium px-8 py-3 rounded-full text-sm font-bold uppercase tracking-widest">Démarrer</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 overflow-hidden hero-gradient">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div className="z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#D4A373]/30 text-agri-gold text-xs font-bold uppercase tracking-widest mb-8">
              <span className="w-2 h-2 rounded-full bg-agri-gold animate-pulse"></span>
              Standard de confiance agricole
            </div>
            <h1 className="text-6xl md:text-7xl font-bold leading-[1.1] mb-8 text-agri-green">
              Valorisez votre <br /><span className="serif italic font-normal text-agri-gold">Production</span> à son juste prix.
            </h1>
            <p className="text-lg text-[#2D2424]/70 mb-10 max-w-lg leading-relaxed">
              FarmLogistics est la passerelle d'élite qui transforme le négoce agricole. Connectez vos récoltes aux marchés mondiaux avec une transparence totale et une logistique sans faille.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/register" className="btn-premium px-10 py-5 rounded-full text-center font-bold uppercase tracking-widest text-sm shadow-xl">
                Ouvrir mon exploitation au monde
              </Link>
              <Link to="/login" className="px-10 py-5 rounded-full text-center border border-[#1B4332]/20 font-bold uppercase tracking-widest text-sm hover:bg-white transition-all">
                Explorer le marché
              </Link>
            </div>
            
            <div className="mt-16 flex items-center gap-8">
              <div>
                <div className="text-2xl font-bold text-agri-green">
                  {stats ? `${(stats.userCount / 1000).toFixed(1)}k+` : "12k+"}
                </div>
                <div className="text-xs uppercase tracking-widest opacity-60">Producteurs</div>
              </div>
              <div className="w-px h-8 bg-agri-green/10"></div>
              <div>
                <div className="text-2xl font-bold text-agri-green">
                  {stats ? `${Math.floor(stats.totalVolume / 1000000)}M` : "450M"}
                </div>
                <div className="text-xs uppercase tracking-widest opacity-60">Volume échangé (USD)</div>
              </div>
            </div>
          </div>

          {/* Visual Component */}
          <div className="relative">
            <div className="absolute -inset-4 bg-agri-gold/10 rounded-[40px] blur-3xl"></div>
            <div className="relative bg-white rounded-[32px] shadow-2xl p-8 border border-[#1B4332]/5">
              {featured ? (
                <>
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-agri-green">
                        {featured.auction?.status === "OPEN" ? "Enchère en cours" : "Dernière Adjudication"}
                      </h3>
                      <p className="text-sm opacity-50">
                        {featured.title} ({featured.quantity} {featured.unit})
                      </p>
                    </div>
                    <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase ${
                      featured.auction?.status === "OPEN" ? "bg-agri-green text-white" : "bg-agri-earth/10 text-agri-earth/40"
                    }`}>
                      {featured.auction?.status === "OPEN" ? "LIVE" : "CLOS"}
                    </span>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="p-6 bg-agri-cream rounded-2xl border border-[#D4A373]/20">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-medium opacity-60">
                          {featured.auction?.status === "OPEN" ? "Offre actuelle" : "Prix final"}
                        </span>
                        <span className="text-3xl font-black text-agri-green">
                          {formatMoney(featured.auction?.currentPrice || featured.startingPrice, featured.currency)}
                        </span>
                      </div>
                      <div className="w-full bg-agri-green/10 h-2 rounded-full overflow-hidden">
                        <div className="bg-agri-gold h-full" style={{ width: featured.auction?.status === "OPEN" ? "75%" : "100%" }}></div>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex-1 p-4 rounded-xl border border-[#1B4332]/5 text-center">
                        <div className="text-xs uppercase opacity-40 mb-1">Localisation</div>
                        <div className="font-bold text-sm truncate">{featured.location || "N/A"}</div>
                      </div>
                      <div className="flex-1 p-4 rounded-xl border border-[#1B4332]/5 text-center">
                        <div className="text-xs uppercase opacity-40 mb-1">
                          {featured.auction?.status === "OPEN" ? "Fin dans" : "Statut"}
                        </div>
                        <div className={`font-bold ${featured.auction?.status === "OPEN" ? "text-agri-gold" : "text-agri-green"}`}>
                          {featured.auction?.status === "OPEN" ? timer.label : "Terminé"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-4 bg-agri-green/5 rounded-xl border-l-4 border-[#1B4332]">
                      <ShieldCheck className="text-agri-green w-5 h-5" />
                      <span className="text-xs font-semibold text-agri-green">Authentification Blockchain certifiée par l'État</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-agri-cream rounded-2xl flex items-center justify-center text-agri-green/10 mx-auto">
                    <Sprout size={32} />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-agri-earth/30">Recherche d'opportunités...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-agri-gold mb-4">Notre Expertise</h2>
            <p className="serif text-4xl text-agri-green">Une infrastructure de pointe pour des résultats concrets sur le terrain.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="card-agri p-10 rounded-[32px]">
              <div className="w-14 h-14 bg-agri-green/5 text-agri-green rounded-2xl flex items-center justify-center mb-8">
                <Smartphone />
              </div>
              <h3 className="text-xl font-bold mb-4">Vente Hybride Web/SMS</h3>
              <p className="text-[#2D2424]/60 leading-relaxed text-sm">Pas besoin d'Internet 5G pour réussir. Notre technologie exclusive permet de gérer vos stocks et vos ventes via de simples SMS sécurisés.</p>
            </div>
            
            <div className="card-agri p-10 rounded-[32px]">
              <div className="w-14 h-14 bg-agri-green/5 text-agri-green rounded-2xl flex items-center justify-center mb-8">
                <LinkIcon />
              </div>
              <h3 className="text-xl font-bold mb-4">Traçabilité Inviolable</h3>
              <p className="text-[#2D2424]/60 leading-relaxed text-sm">Chaque contrat, chaque paiement est gravé sur une blockchain publique. Éliminez la corruption et gagnez la confiance des acheteurs internationaux.</p>
            </div>
            
            <div className="card-agri p-10 rounded-[32px]">
              <div className="w-14 h-14 bg-agri-green/5 text-agri-green rounded-2xl flex items-center justify-center mb-8">
                <Truck />
              </div>
              <h3 className="text-xl font-bold mb-4">Logistique Automatisée</h3>
              <p className="text-[#2D2424]/60 leading-relaxed text-sm">Dès qu'une vente est conclue, nos partenaires logistiques certifiés reçoivent l'ordre de ramassage. Vous n'avez qu'à préparer vos sacs.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 bg-agri-green text-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-md">
            <h2 className="serif text-3xl mb-4">Ils nous font confiance pour leur croissance.</h2>
            <p className="opacity-60 text-sm">Nous collaborons avec les ministères de l'agriculture et les coopératives leaders pour standardiser le commerce équitable.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-10 opacity-40 grayscale brightness-200">
            <span className="font-black text-xl italic tracking-tighter">AGRI-GOV</span>
            <span className="font-black text-xl italic tracking-tighter">ECO-BANK</span>
            <span className="font-black text-xl italic tracking-tighter">TRANS-AFRICA</span>
            <span className="font-black text-xl italic tracking-tighter">SGS-CERTIFIED</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="bg-agri-gold/10 p-16 rounded-[48px] border border-[#D4A373]/20 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-agri-gold/20 rounded-full blur-3xl text-white"></div>
            <h2 className="serif text-5xl text-agri-green mb-8">Prêt à changer de dimension ?</h2>
            <p className="text-lg text-[#2D2424]/70 mb-12 max-w-2xl mx-auto leading-relaxed">
              Rejoignez les producteurs qui ont augmenté leurs marges de 40% en moyenne dès la première année grâce à notre système d'enchères transparentes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn-premium px-12 py-5 rounded-full font-bold uppercase tracking-widest text-sm shadow-2xl">
                Créer mon compte gratuitement
              </Link>
              <Link to="/login" className="px-12 py-5 rounded-full font-bold uppercase tracking-widest text-sm bg-white border border-[#1B4332]/10 hover:bg-agri-cream transition-colors">
                Parler à un conseiller
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[#1B4332]/10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-agri-green rounded flex items-center justify-center text-white">
              <Sprout size={12} />
            </div>
            <span className="text-sm font-bold uppercase tracking-tighter text-agri-green">FarmLogistics</span>
          </div>
          
          <div className="flex items-center gap-4">
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-40 font-bold">
              © 2026 FarmLogistics Systems — Digitalisation de la terre.
            </p>
            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${apiOk === null ? "bg-gray-100 text-gray-500" : apiOk ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
               {apiOk === null ? "Vérification..." : apiOk ? "Systèmes Opérationnels" : "Système en Maintenance"}
            </span>
          </div>
          
          <div className="flex gap-6 text-[10px] uppercase font-bold tracking-widest opacity-60">
            <a href="#" className="hover:text-agri-green">Politique</a>
            <a href="#" className="hover:text-agri-green">API</a>
            <a href="#" className="hover:text-agri-green">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
