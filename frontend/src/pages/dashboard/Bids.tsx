import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, apiUrl } from "../../api";
import { useDashboardUser } from "../../state/dashboard";
import { Gavel, Clock, MapPin, Package, RefreshCw, ShieldCheck, Trophy, User, History, X } from "lucide-react";

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

type BidResponse = { bid: { amount: number }; auction: Auction };

type BidRecord = {
  id: number;
  bidderName: string;
  amount: number;
  createdAt: string;
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

export default function DashboardBids() {
  const me = useDashboardUser();
  const title = me.role === "acheteur" ? "Marché aux Enchères" : "Suivi des Enchères";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [bidAmount, setBidAmount] = useState<string>("");
  const [nowTick, setNowTick] = useState(0);

  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [historyBids, setHistoryBids] = useState<BidRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const selected = useMemo(
    () => items.find((p) => p.id === selectedId) || null,
    [items, selectedId]
  );

  const endpoint = useMemo(
    () => (me.role === "agriculteur" ? "/api/my/products" : "/api/products"),
    [me.role]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiFetch<{ products: Product[] }>(endpoint, {
      method: "GET",
      auth: me.role === "agriculteur"
    });
    if (!res.ok) {
      setError("Synchronisation impossible.");
      setLoading(false);
      return;
    }
    const list = (res.data.products || []).filter(
      (p) => p.status === "PUBLISHED" && p.auction
    );
    setItems(list);
    setLoading(false);
    if (selectedId === null && list.length) setSelectedId(list[0].id);
  }, [endpoint, me.role, selectedId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  async function fetchHistory(pid: number) {
    setShowHistory(true);
    setHistoryLoading(true);
    const res = await apiFetch<{ bids: BidRecord[] }>(`/api/products/${pid}/bids`, { auth: true });
    if (res.ok) {
      setHistoryBids(res.data.bids || []);
    }
    setHistoryLoading(false);
  }

  const sseRef = useRef<EventSource | null>(null);
  useEffect(() => {
    if (!selectedId) return;

    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    const es = new EventSource(apiUrl(`/api/stream/products/${selectedId}`));
    sseRef.current = es;

    function safeUpdate(product: Product) {
      setItems((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, ...product } : p))
      );
    }

    es.addEventListener("init", (e) => {
      try {
        const payload = JSON.parse((e as MessageEvent).data) as { product: Product };
        safeUpdate(payload.product);
      } catch { /* ignore */ }
    });

    es.addEventListener("bid", (e) => {
      try {
        const payload = JSON.parse((e as MessageEvent).data) as {
          productId: number;
          auction: Auction;
        };
        setItems((prev) =>
          prev.map((p) =>
            p.id === payload.productId ? { ...p, auction: payload.auction } : p
          )
        );
      } catch { /* ignore */ }
    });

    return () => es.close();
  }, [selectedId]);

  async function onBid(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selected) return;
    const amount = Number(bidAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Format de montant invalide.");
      return;
    }
    const res = await apiFetch<BidResponse>("/api/bids", {
      method: "POST",
      auth: true,
      body: JSON.stringify({ productId: selected.id, amount })
    });
    if (!res.ok) {
      const err = res.error as any;
      if (err?.error === "BID_TOO_LOW") setError(`Mise insuffisante. Minimum: ${formatMoney(err.min, selected.currency)}`);
      else if (err?.error === "AUCTION_CLOSED") setError("L'enchère est désormais clôturée.");
      else setError("Erreur lors du placement de l'offre.");
      return;
    }
    setBidAmount("");
    setItems((prev) =>
      prev.map((p) => (p.id === selected.id ? { ...p, auction: res.data.auction } : p))
    );
  }

  const { label: timerLabel, expired } = timeLeft(selected?.auction?.endsAt);
  const isClosed = selected?.auction?.status === "CLOSED";
  const showExpiredWarning = expired && !isClosed;

  return (
    <section className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-agri-green tracking-tight mb-2">{title}</h2>
          <p className="text-agri-earth/60 font-medium max-w-2xl">
            {me.role === "acheteur" 
              ? "Engagez des offres stratégiques sur les stocks disponibles en temps réel." 
              : "Surveillance en temps réel de vos flux d'enchères et des adjudications."}
          </p>
        </div>
        <button 
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-white border border-agri-green/10 text-agri-green text-sm font-bold shadow-sm hover:bg-agri-cream transition-all"
          onClick={refresh} 
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          Rafraîchir les flux
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium">
          {error}
        </div>
      )}

      {selected ? (
        <div className="bg-white border border-agri-green/5 rounded-[48px] shadow-2xl shadow-agri-green/5 overflow-hidden grid lg:grid-cols-2">
          <div className="p-8 md:p-12 space-y-8">
             <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    isClosed 
                      ? "bg-agri-earth/5 text-agri-earth/40 border-agri-earth/10" 
                      : "bg-agri-green/10 text-agri-green border-agri-green/20"
                  }`}>
                    {isClosed ? "Session Clôturée" : "Enchère Active"}
                  </span>
                  {!isClosed && (
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 text-red-600 border border-red-100 text-[10px] font-black uppercase tracking-widest animate-pulse">
                      <Clock size={12} />
                      {timerLabel} restant
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => fetchHistory(selected.id)}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-agri-cream text-agri-green text-[10px] font-black uppercase tracking-widest hover:bg-agri-green hover:text-white transition-all border border-agri-green/5"
                >
                  <History size={12} />
                  Historique
                </button>
             </div>

             <div>
               <h3 className="text-4xl font-bold text-agri-green tracking-tight mb-4">{selected.title}</h3>
               <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-agri-earth/40 text-sm font-bold uppercase tracking-widest">
                 <div className="flex items-center gap-2">
                   <MapPin size={14} className="text-agri-gold" />
                   {selected.location}
                 </div>
                 <div className="flex items-center gap-2">
                   <Package size={14} className="text-agri-gold" />
                   {selected.quantity} {selected.unit}
                 </div>
                 <div className="flex items-center gap-2">
                   <Gavel size={14} className="text-agri-gold" />
                   Départ: {formatMoney(selected.startingPrice, selected.currency)}
                 </div>
               </div>
             </div>

             {isClosed ? (
               <div className="bg-agri-cream p-8 rounded-[32px] border border-agri-gold/20 space-y-4">
                 <div className="flex justify-between items-start">
                   <div className="text-[10px] font-black uppercase tracking-widest text-agri-gold flex items-center gap-2">
                     <Trophy size={14} />
                     Adjudication Finale
                   </div>
                   {selected.auction?.paymentStatus === "PENDING" && (
                     <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[9px] font-black uppercase border border-blue-200 animate-pulse">Payement Mobile Money envoyé...</span>
                   )}
                   {selected.auction?.paymentStatus === "COMPLETED" && (
                     <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-[9px] font-black uppercase border border-green-200">Transaction Confirmée ✅</span>
                   )}
                   {selected.auction?.paymentStatus === "FAILED" && (
                     <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-[9px] font-black uppercase border border-red-200">Échec du payement</span>
                   )}
                 </div>
                 <div className="text-xl font-bold text-agri-green">
                   {selected.auction?.currentWinnerName ? (
                     <>Remporté par <span className="text-agri-gold">{selected.auction.currentWinnerName}</span></>
                   ) : "Aucun enchérisseur"}
                 </div>
                 <div className="text-4xl font-black text-agri-green">
                   {formatMoney(selected.auction?.currentPrice || 0, selected.currency)}
                 </div>
               </div>
             ) : (
               <div className="space-y-6">
                {showExpiredWarning && (
                  <div className="p-4 bg-orange-50 border border-orange-100 text-orange-700 rounded-2xl text-xs font-bold flex items-center gap-3">
                    <RefreshCw size={16} className="animate-spin" />
                    Clôture imminente (Synchronisation en cours...)
                  </div>
                )}
                {me.role === "acheteur" && (
                  <form onSubmit={onBid} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 flex items-center gap-2 px-1">
                          <Gavel size={12} />
                          Votre Offre
                        </label>
                        <input
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          placeholder="Saisir montant"
                          className="w-full px-5 py-4 bg-agri-cream border border-agri-green/10 rounded-2xl focus:outline-none focus:border-agri-gold focus:ring-1 focus:ring-agri-gold transition-all font-black text-xl text-agri-green"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 flex items-center gap-2 px-1">
                          <ShieldCheck size={12} />
                          Minimum Requis
                        </label>
                        <div className="w-full px-5 py-4 bg-agri-green/5 border border-agri-green/10 rounded-2xl font-black text-xl text-agri-green flex items-center">
                          {formatMoney((selected.auction?.currentPrice || selected.startingPrice) + 1, selected.currency)}
                        </div>
                      </div>
                    </div>
                    <button className="btn-premium w-full py-5 rounded-full font-bold uppercase tracking-widest text-sm shadow-xl flex items-center justify-center gap-3" type="submit">
                      Soumettre l'offre contractuelle
                    </button>
                  </form>
                )}
               </div>
             )}
          </div>

          <div className="relative h-96 lg:h-full bg-agri-cream border-l border-agri-green/5">
             {selected.imageUrl ? (
               <img src={apiUrl(selected.imageUrl)} alt="" className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-agri-green/10">
                 <Package size={80} />
                 <span className="text-xs font-black uppercase tracking-[0.2em]">Visuel Certifié</span>
               </div>
             )}
             <div className="absolute inset-0 bg-gradient-to-t from-agri-green/60 to-transparent"></div>
             <div className="absolute bottom-10 left-10 right-10 flex items-center justify-between bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[32px] shadow-2xl">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Offre en tête</div>
                  <div className="text-3xl font-black text-white">{formatMoney(selected.auction?.currentPrice || 0, selected.currency)}</div>
                </div>
                {selected.auction?.currentWinnerName && (
                  <div className="text-right">
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Enchérisseur</div>
                    <div className="flex items-center gap-2 text-white font-bold">
                      <User size={16} className="text-agri-gold" />
                      {selected.auction.full_name || selected.auction.currentWinnerName}
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((p) => {
          const sRes = timeLeft(p.auction?.endsAt);
          const sClosed = p.auction?.status === "CLOSED";
          return (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`group relative bg-white border rounded-[32px] p-4 text-left transition-all duration-300 hover:-translate-y-2 ${
                p.id === selectedId 
                  ? 'border-agri-gold shadow-2xl shadow-agri-gold/10' 
                  : 'border-agri-green/5 shadow-xl shadow-agri-green/5'
              }`}
            >
              <div className="h-40 rounded-2xl overflow-hidden bg-agri-cream mb-6 relative">
                {p.imageUrl ? (
                  <img src={apiUrl(p.imageUrl)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="h-full flex items-center justify-center text-agri-green/10">
                    <Package size={32} />
                  </div>
                )}
                {p.id === selectedId && (
                  <div className="absolute inset-0 bg-agri-gold/20 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white text-agri-gold flex items-center justify-center shadow-lg">
                      <Gavel size={20} />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="px-2 space-y-4">
                <div>
                  <div className="text-sm font-bold text-agri-green mb-1 line-clamp-1 group-hover:text-agri-gold transition-colors">{p.title}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-agri-earth/30 flex items-center gap-1">
                    <MapPin size={10} className="text-agri-gold" />
                    {p.location}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-agri-green/5">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-agri-green/30">En cours</span>
                    <span className={`text-sm font-black ${sClosed ? 'text-agri-earth/40' : 'text-agri-green'}`}>
                      {formatMoney(p.auction?.currentPrice || 0, p.currency)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black uppercase tracking-widest text-agri-green/30">Temps</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${sClosed ? 'text-agri-earth/40' : 'text-red-500 animate-pulse'}`}>
                      {sClosed ? "Clôturé" : timeLeft(p.auction?.endsAt).label}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* History Modal */}
      {showHistory && selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-agri-green/40 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-3xl flex flex-col overflow-hidden">
            <div className="p-8 border-b border-agri-green/5 flex items-center justify-between bg-agri-cream/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-agri-green rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <History size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-agri-green">Historique des Offres</h4>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-agri-gold">{selected.title}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistory(false)}
                className="w-10 h-10 rounded-full border border-agri-green/10 flex items-center justify-center text-agri-green hover:bg-red-50 hover:text-red-500 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto max-h-[500px]">
              {historyLoading ? (
                <div className="py-20 text-center opacity-30 animate-pulse">
                   <RefreshCw size={40} className="mx-auto mb-4 animate-spin" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Récupération des données...</span>
                </div>
              ) : historyBids.length === 0 ? (
                <div className="py-20 text-center opacity-30">
                   <History size={40} className="mx-auto mb-4" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Aucune offre déposée.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyBids.map((b, idx) => (
                    <div key={b.id} className="flex items-center justify-between p-6 bg-agri-cream/30 rounded-3xl border border-agri-green/5 group hover:border-agri-gold/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white border border-agri-green/10 flex items-center justify-center text-agri-green font-black text-xs shadow-sm">
                          {idx === 0 ? <Trophy size={18} className="text-agri-gold" /> : (historyBids.length - idx)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-agri-green">{b.bidderName}</div>
                          <div className="text-[10px] font-bold text-agri-earth/40 uppercase tracking-widest">
                            {new Date(b.createdAt).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="text-lg font-black text-agri-green">
                        {formatMoney(b.amount, selected.currency)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
