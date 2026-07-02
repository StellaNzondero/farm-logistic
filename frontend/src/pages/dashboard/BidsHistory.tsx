import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../api";
import { useDashboardUser } from "../../state/dashboard";
import { RefreshCw, History, Calendar, Hash, DollarSign, Trophy, FileText } from "lucide-react";
import { Link } from "react-router-dom";

type Bid = {
  id: number;
  productId: number;
  auctionId?: number;
  productTitle: string;
  amount: number;
  currency: string;
  createdAt: string;
  bidderUserId: number;
  auctionStatus: "OPEN" | "CLOSED";
  paymentStatus: "NONE" | "PENDING" | "COMPLETED" | "FAILED";
  isWinning: boolean;
};

function PaymentBadge({ status }: { status: Bid["paymentStatus"] }) {
  if (status === "NONE") return null;
  if (status === "PENDING") return (
    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest border border-blue-200">
      Payement en cours
    </span>
  );
  if (status === "COMPLETED") return (
    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest border border-green-200">
      Payé
    </span>
  );
  return (
    <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-widest border border-red-200">
      Échec Payement
    </span>
  );
}

function StatusBadge({ bid }: { bid: Bid }) {
  if (bid.auctionStatus === "OPEN") {
    if (bid.isWinning) {
      return (
        <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest border border-green-200 animate-pulse">
          En tête
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-widest border border-orange-200">
        Dépassé
      </span>
    );
  } else {
    if (bid.isWinning) {
      return (
        <span className="px-3 py-1 rounded-full bg-agri-gold text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-agri-gold/20 flex items-center gap-1 w-fit">
          <Trophy size={10} />
          Remporté
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full bg-agri-earth/5 text-agri-earth/40 text-[10px] font-black uppercase tracking-widest border border-agri-earth/10">
        Terminé
      </span>
    );
  }
}

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

export default function DashboardBidsHistory() {
  const me = useDashboardUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiFetch<{ bids: Bid[] }>("/api/my/bids", {
      method: "GET",
      auth: true
    });
    if (!res.ok) {
      setError("Erreur lors de la récupération de l'historique.");
      setLoading(false);
      return;
    }
    setBids(res.data.bids || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-agri-green tracking-tight mb-2">Historique des Offres</h2>
          <p className="text-agri-earth/60 font-medium max-w-2xl">
            {me.role === "acheteur" 
              ? "Retrouvez l'intégralité de vos propositions contractuelles sur le marché." 
              : "Suivi chronologique des offres reçues sur vos productions certifiées."}
          </p>
        </div>
        <button 
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-white border border-agri-green/10 text-agri-green text-sm font-bold shadow-sm hover:bg-agri-cream transition-all"
          onClick={refresh} 
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          Rafraîchir
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="bg-white border border-agri-green/5 rounded-[40px] shadow-2xl shadow-agri-green/5 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center space-y-4">
            <RefreshCw size={40} className="mx-auto text-agri-gold animate-spin" />
            <p className="text-agri-earth/40 font-bold uppercase tracking-widest text-[10px]">Chargement de l'historique...</p>
          </div>
        ) : bids.length === 0 ? (
          <div className="p-20 text-center space-y-6">
            <div className="w-20 h-20 bg-agri-cream rounded-[32px] flex items-center justify-center text-agri-green/10 mx-auto shadow-inner">
              <History size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-agri-green">Aucune offre enregistrée</h3>
              <p className="text-agri-earth/40 font-medium">Votre historique d'enchères est actuellement vide.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-agri-cream/50 border-b border-agri-green/5">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-agri-green/40">
                    <div className="flex items-center gap-2">
                      <History size={14} />
                      Produit
                    </div>
                  </th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-agri-green/40">
                    <div className="flex items-center gap-2">
                      <DollarSign size={14} />
                      Montant
                    </div>
                  </th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-agri-green/40">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      Date & Heure
                    </div>
                  </th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-agri-green/40">
                    <div className="flex items-center gap-2">
                      <Trophy size={14} />
                      Statut
                    </div>
                  </th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-agri-green/40">
                    <div className="flex items-center gap-2">
                      <Hash size={14} />
                      Référence
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-agri-green/5">
                {bids.map((b) => (
                  <tr key={b.id} className="group hover:bg-agri-cream/30 transition-colors">
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-agri-green group-hover:text-agri-gold transition-colors">{b.productTitle}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-black text-agri-green">{formatMoney(b.amount, b.currency)}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-xs font-bold text-agri-earth/40 uppercase tracking-widest">
                        {new Date(b.createdAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-2">
                        <StatusBadge bid={b} />
                        <PaymentBadge status={b.paymentStatus} />
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-3">
                        <div className="text-[10px] font-black text-agri-gold bg-agri-gold/5 px-2 py-1 rounded-md w-fit uppercase tracking-widest">
                          #{b.id}
                        </div>
                        {b.paymentStatus === "COMPLETED" && b.auctionId && (
                          <Link 
                            to={`/receipt/${b.auctionId}`}
                            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-agri-green hover:text-agri-gold transition-colors"
                          >
                            <FileText size={12} />
                            Voir le Reçu
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
