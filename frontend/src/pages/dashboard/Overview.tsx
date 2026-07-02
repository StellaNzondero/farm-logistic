import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../api";
import { useDashboardUser } from "../../state/dashboard";
import { 
  Activity, 
  Gavel, 
  ShieldCheck, 
  Plus, 
  Search, 
  Wallet, 
  TrendingUp, 
  Package, 
  Users, 
  Database,
  History,
  UserPlus,
  MessageSquare
} from "lucide-react";

function formatMoney(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amount);
}

export default function DashboardOverview() {
  const user = useDashboardUser();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await apiFetch<{ stats: any }>("/api/my/dashboard/stats", { auth: true });
      if (res.ok) {
        setStats(res.data.stats);
      }
      setLoading(false);
    }
    void load();
  }, []);

  const quickActions = useMemo(() => {
    if (user.role === "agriculteur") {
      return [
        { 
          title: "Nouvelle Mise en Marché", 
          desc: "Enregistrez un nouveau lot pour ouverture d'enchères.", 
          icon: <Plus size={24} />,
          link: "/dashboard/products"
        },
        { 
          title: "Monitoring des Offres", 
          desc: "Analysez les enchères actives sur vos productions.", 
          icon: <Activity size={24} />,
          link: "/dashboard/bids"
        }
      ];
    } else if (user.role === "agent") {
      return [
        { 
          title: "Inscrire un Producteur", 
          desc: "Enregistrement manuel des agriculteurs sans smartphone.", 
          icon: <UserPlus size={24} />,
          link: "/dashboard/farmers"
        },
        { 
          title: "Traiter les Flux SMS", 
          desc: "Certification et publication des produits reçus par SMS.", 
          icon: <MessageSquare size={24} />,
          link: "/dashboard/sms"
        }
      ];
    } else if (user.role === "admin") {
      return [
        { 
          title: "Registre des Utilisateurs", 
          desc: "Supervision et habilitation des agents et producteurs.", 
          icon: <Users size={24} />,
          link: "/dashboard/admin"
        },
        { 
          title: "Audit de la Blockchain", 
          desc: "Consultation du ledger immuable des transactions.", 
          icon: <Database size={24} />,
          link: "/dashboard/admin"
        }
      ];
    }
    return [
      { 
        title: "Explorer le Catalogue", 
        desc: "Accédez aux lots premium disponibles pour acquisition.", 
        icon: <Search size={24} />,
        link: "/dashboard/products"
      },
      { 
        title: "Historique des Offres", 
        desc: "Gérez vos positions et suivez vos mises en temps réel.", 
        icon: <History size={24} />,
        link: "/dashboard/bids-history"
      }
    ];
  }, [user.role]);

  const cards = useMemo(() => {
    if (loading) return [];
    
    if (user.role === "agriculteur") {
      return [
        { label: "Produits Actifs", val: stats?.activeProducts ?? 0, icon: <Package size={14} />, trend: "En vente", sub: "Lots publiés" },
        { label: "Revenus Totaux", val: formatMoney(stats?.totalRevenue ?? 0), icon: <TrendingUp size={14} />, trend: "Cumulé", sub: "Ventes & En-cours" },
        { label: "Lots Vendus", val: stats?.soldCount ?? 0, icon: <Gavel size={14} />, trend: "Clôturé", sub: "Adjudications" },
      ];
    } else if (user.role === "acheteur") {
      return [
        { label: "Enchères Actives", val: stats?.activeBids ?? 0, icon: <Activity size={14} />, trend: "Participation", sub: "Lots suivis" },
        { label: "Positions Gagnantes", val: stats?.winningBids ?? 0, icon: <TrendingUp size={14} />, trend: "En tête", sub: "Enchères ouvertes" },
        { label: "Total Investi", val: formatMoney(stats?.totalSpent ?? 0), icon: <Wallet size={14} />, trend: "Acquis", sub: "Lots remportés" },
      ];
    } else if (user.role === "agent") {
      return [
        { label: "Producteurs Inscrits", val: stats?.farmersCount ?? 0, icon: <Users size={14} />, trend: "Terrain", sub: "Inclusion numérique" },
        { label: "Flux à Traiter", val: stats?.pendingProducts ?? 0, icon: <MessageSquare size={14} />, trend: "SMS Draft", sub: "Certification requise" },
        { label: "Opérations", val: stats?.operationsCount ?? 0, icon: <ShieldCheck size={14} />, trend: "Ledger", sub: "Actions certifiées" },
      ];
    } else if (user.role === "admin") {
      return [
        { label: "Utilisateurs", val: stats?.totalUsers ?? 0, icon: <Users size={14} />, trend: "Platform", sub: "Communauté totale" },
        { label: "Produits Totaux", val: stats?.totalProducts ?? 0, icon: <Package size={14} />, trend: "Catalogue", sub: "Lots enregistrés" },
        { label: "Volume Global", val: formatMoney(stats?.totalVolume ?? 0), icon: <TrendingUp size={14} />, trend: "Marché", sub: "Valeur échangée" },
      ];
    }
    return [];
  }, [user.role, stats, loading]);

  return (
    <section className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-agri-green tracking-tight mb-2">Vue d'ensemble</h2>
          <p className="text-agri-earth/60 font-medium">
            Ravi de vous revoir, <b className="text-agri-green">{user.fullName}</b>. Voici l'analyse de vos activités.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-agri-gold/30 text-agri-gold text-[10px] font-black uppercase tracking-widest shadow-sm">
          <span className="w-2 h-2 rounded-full bg-agri-gold animate-pulse"></span>
          Systèmes Opérationnels
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-agri-green/5 p-8 rounded-[32px] shadow-xl shadow-agri-green/5 animate-pulse h-44"></div>
          ))
        ) : cards.map((c, idx) => (
          <div key={idx} className="bg-white border border-agri-green/5 p-8 rounded-[32px] shadow-xl shadow-agri-green/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 text-agri-green/5 group-hover:text-agri-green/10 transition-colors">
              {c.icon}
            </div>
            <div className="relative z-10">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-agri-green/40 mb-4 flex items-center gap-2">
                {c.icon}
                {c.label}
              </div>
              <div className="text-4xl font-black text-agri-green mb-4 truncate" title={String(c.val)}>
                {c.val}
              </div>
              <div className="flex items-center gap-2 text-agri-gold text-[10px] font-bold uppercase tracking-wider bg-agri-gold/5 px-3 py-1.5 rounded-full w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-agri-gold animate-pulse"></span>
                {c.trend} • {c.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold text-agri-green tracking-tight flex items-center gap-3">
          <Plus className="text-agri-gold" size={20} />
          Actions Prioritaires
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quickActions.map((a) => (
            <Link key={a.title} to={a.link} className="group bg-white border border-agri-green/5 p-8 rounded-[32px] shadow-xl shadow-agri-green/5 hover:border-agri-gold/30 hover:-translate-y-1 transition-all cursor-pointer flex items-center gap-8">
              <div className="w-16 h-16 rounded-2xl bg-agri-cream text-agri-green flex items-center justify-center shrink-0 group-hover:bg-agri-green group-hover:text-white transition-all">
                {a.icon}
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold text-agri-green mb-1">{a.title}</div>
                <div className="text-sm text-agri-earth/60 leading-relaxed font-medium">{a.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
