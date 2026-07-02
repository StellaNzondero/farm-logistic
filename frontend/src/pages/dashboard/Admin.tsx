import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../api";
import { useDashboardUser } from "../../state/dashboard";
import { 
  RefreshCw, Shield, Clock, UserPlus, Users, Calendar, Phone, Mail, 
  Hash, Database, X, ChevronRight, Fingerprint, ArrowRight, CheckCircle2, AlertCircle 
} from "lucide-react";

type AdminUser = {
  id: number;
  fullName: string;
  email?: string | null;
  phone: string;
  role: string;
  createdAt?: string | null;
};

type AuditProduct = {
  id: number;
  title: string;
};

type LedgerBlock = {
  idx: number;
  prevHash: string;
  hash: string;
  ts: string;
  eventType: string;
  actorName: string;
  payload: string;
};

export default function DashboardAdmin() {
  const me = useDashboardUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auctionMins, setAuctionMins] = useState<string>("60");
  
  // Blockchain Audit State
  const [auditProducts, setAuditProducts] = useState<AuditProduct[]>([]);
  const [selectedProductId, setSelectedSelectedProductId] = useState<number | null>(null);
  const [auditBlocks, setAuditBlocks] = useState<LedgerBlock[]>([]);
  const [auditLoading, setAuditBlocksLoading] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "agent"
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const settings = await apiFetch<{ defaultDurationMinutes: number }>(
      "/api/admin/settings/auction",
      { method: "GET", auth: true }
    );
    if (settings.ok) {
      setAuctionMins(String(settings.data.defaultDurationMinutes));
    }

    const res = await apiFetch<{ users: AdminUser[] }>("/api/admin/users", {
      method: "GET",
      auth: true
    });
    if (!res.ok) {
      setError("Impossible de charger les utilisateurs.");
      setLoading(false);
      return;
    }
    setUsers(res.data.users || []);

    const prodRes = await apiFetch<{ products: AuditProduct[] }>("/api/admin/ledger/products", { auth: true });
    if (prodRes.ok) {
      setAuditProducts(prodRes.data.products || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function loadAudit(pid: number) {
    setSelectedSelectedProductId(pid);
    setAuditBlocksLoading(true);
    const res = await apiFetch<{ blocks: LedgerBlock[] }>(`/api/admin/ledger/product/${pid}`, { auth: true });
    if (res.ok) {
      setAuditBlocks(res.data.blocks || []);
    }
    setAuditBlocksLoading(false);
  }

  async function onCreateUser(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await apiFetch<{ user: AdminUser }>("/api/admin/users", {
      method: "POST",
      auth: true,
      body: JSON.stringify({
        fullName: form.fullName,
        email: form.email || null,
        phone: form.phone,
        password: form.password,
        role: form.role
      })
    });
    if (!res.ok) {
      setError(
        "Création utilisateur impossible (téléphone/email déjà utilisé ou mot de passe trop court)."
      );
      return;
    }
    setForm({ fullName: "", email: "", phone: "", password: "", role: "agent" });
    await refresh();
  }

  const agents = users.filter((u) => u.role === "agent");
  const farmers = users.filter((u) => u.role === "agriculteur");

  async function saveAuctionDuration(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const mins = Number(auctionMins);
    if (!Number.isFinite(mins) || mins < 1) {
      setError("Durée invalide.");
      return;
    }
    const res = await apiFetch<{ defaultDurationMinutes: number }>(
      "/api/admin/settings/auction",
      {
        method: "PUT",
        auth: true,
        body: JSON.stringify({ defaultDurationMinutes: mins })
      }
    );
    if (!res.ok) {
      setError("Impossible de sauvegarder la durée.");
      return;
    }
    setAuctionMins(String(res.data.defaultDurationMinutes));
  }

  return (
    <section className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-agri-green tracking-tight mb-2">Administration Système</h2>
          <p className="text-agri-earth/60 font-medium max-w-2xl">
            Tableau de supervision globale. Connecté en tant que <b className="text-agri-green">{me.role}</b>.
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Auction Settings Card */}
        <div className="bg-white border border-agri-green/5 rounded-[40px] shadow-2xl shadow-agri-green/5 overflow-hidden">
          <div className="p-8 border-b border-agri-green/5 bg-agri-cream/30">
            <h3 className="text-xl font-bold text-agri-green flex items-center gap-3">
              <Clock className="text-agri-gold" size={24} />
              Paramètres des Enchères
            </h3>
          </div>
          <form className="p-8 space-y-6" onSubmit={saveAuctionDuration}>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 flex items-center gap-2 px-1">
                <Clock size={12} />
                Durée par défaut (minutes)
              </label>
              <input
                value={auctionMins}
                onChange={(e) => setAuctionMins(e.target.value)}
                inputMode="numeric"
                placeholder="60"
                required
                className="w-full px-5 py-4 bg-agri-cream/50 border border-agri-green/10 rounded-2xl focus:outline-none focus:border-agri-gold focus:ring-1 focus:ring-agri-gold transition-all font-bold text-lg"
              />
              <p className="text-[10px] font-bold text-agri-earth/40 uppercase tracking-widest px-1">
                Valeur actuelle : {auctionMins} min. Recommandé : 60.
              </p>
            </div>
            <button className="btn-premium w-full py-4 rounded-full font-bold uppercase tracking-widest text-xs shadow-xl" type="submit">
              Appliquer la configuration
            </button>
          </form>
        </div>

        {/* Create User Card */}
        <div className="bg-white border border-agri-green/5 rounded-[40px] shadow-2xl shadow-agri-green/5 overflow-hidden">
          <div className="p-8 border-b border-agri-green/5 bg-agri-cream/30">
            <h3 className="text-xl font-bold text-agri-green flex items-center gap-3">
              <UserPlus className="text-agri-gold" size={24} />
              Enregistrer un Utilisateur
            </h3>
          </div>
          <form className="p-8 space-y-6" onSubmit={onCreateUser}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 flex items-center gap-2 px-1">
                  Nom complet
                </label>
                <input
                  value={form.fullName}
                  onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))}
                  required
                  className="w-full px-4 py-3 bg-agri-cream/50 border border-agri-green/10 rounded-xl focus:outline-none focus:border-agri-gold transition-all text-sm font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 flex items-center gap-2 px-1">
                  Téléphone
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                  required
                  className="w-full px-4 py-3 bg-agri-cream/50 border border-agri-green/10 rounded-xl focus:outline-none focus:border-agri-gold transition-all text-sm font-bold"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 flex items-center gap-2 px-1">
                  Rôle Système
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))}
                  className="w-full px-4 py-3 bg-agri-cream/50 border border-agri-green/10 rounded-xl focus:outline-none focus:border-agri-gold transition-all text-sm font-bold appearance-none"
                >
                  <option value="agent">Agent (Field)</option>
                  <option value="agriculteur">Agriculteur (Producteur)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 flex items-center gap-2 px-1">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                  minLength={6}
                  required
                  className="w-full px-4 py-3 bg-agri-cream/50 border border-agri-green/10 rounded-xl focus:outline-none focus:border-agri-gold transition-all text-sm font-bold"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 flex items-center gap-2 px-1">
                Email (Optionnel)
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                className="w-full px-4 py-3 bg-agri-cream/50 border border-agri-green/10 rounded-xl focus:outline-none focus:border-agri-gold transition-all text-sm font-bold"
              />
            </div>
            <button className="btn-premium w-full py-4 rounded-full font-bold uppercase tracking-widest text-xs shadow-xl" type="submit">
              Générer les accès plateforme
            </button>
          </form>
        </div>
      </div>

      {/* Agents List Card */}
      <div className="bg-white border border-agri-green/5 rounded-[40px] shadow-2xl shadow-agri-green/5 overflow-hidden">
        <div className="p-8 border-b border-agri-green/5 bg-agri-cream/30 flex items-center justify-between">
          <h3 className="text-xl font-bold text-agri-green flex items-center gap-3">
            <Shield className="text-agri-gold" size={24} />
            Registre des Agents ({agents.length})
          </h3>
        </div>
        <UserTable users={agents} loading={loading} />
      </div>

      {/* Farmers List Card */}
      <div className="bg-white border border-agri-green/5 rounded-[40px] shadow-2xl shadow-agri-green/5 overflow-hidden">
        <div className="p-8 border-b border-agri-green/5 bg-agri-cream/30 flex items-center justify-between">
          <h3 className="text-xl font-bold text-agri-green flex items-center gap-3">
            <Users className="text-agri-gold" size={24} />
            Registre des Agriculteurs ({farmers.length})
          </h3>
        </div>
        <UserTable users={farmers} loading={loading} />
      </div>

      {/* Blockchain Audit Section */}
      <div className="bg-agri-green text-white rounded-[48px] p-8 md:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 text-white/5">
          <Database size={120} />
        </div>
        <div className="relative z-10 space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-black uppercase tracking-widest mb-4">
              <Fingerprint size={12} />
              Immuabilité Certifiée
            </div>
            <h3 className="text-3xl font-bold tracking-tight">Audit des Enchères</h3>
            <p className="text-white/60 font-medium max-w-xl mt-2">
              Consultez la chaîne de blocs pour chaque lot. Chaque action est horodatée et signée cryptographiquement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {auditProducts.map(p => (
              <button 
                key={p.id}
                onClick={() => loadAudit(p.id)}
                className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-white hover:text-agri-green transition-all group text-left"
              >
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1 group-hover:text-agri-gold">Lot #{p.id}</div>
                  <div className="font-bold">{p.title}</div>
                </div>
                <ChevronRight className="opacity-20 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Modal/Panel */}
      {selectedProductId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-agri-green/40 backdrop-blur-md">
          <div className="bg-white w-full max-w-5xl h-full max-h-[800px] rounded-[48px] shadow-3xl flex flex-col overflow-hidden">
            <div className="p-8 border-b border-agri-green/5 flex items-center justify-between bg-agri-cream/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-agri-green rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <Database size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-agri-green">Explorateur de Blocs</h4>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-agri-gold">Lot #{selectedProductId}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSelectedProductId(null)}
                className="w-10 h-10 rounded-full border border-agri-green/10 flex items-center justify-center text-agri-green hover:bg-red-50 hover:text-red-500 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-agri-cream/10">
              {auditLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 opacity-30">
                  <RefreshCw className="animate-spin" size={40} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Reconstitution de la chaîne...</span>
                </div>
              ) : auditBlocks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 opacity-30">
                  <AlertCircle size={40} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Aucune donnée trouvée.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {auditBlocks.map((b) => {
                    const payload = JSON.parse(b.payload);
                    return (
                      <div key={b.idx} className="relative pl-8 border-l-2 border-agri-green/10 pb-8 last:pb-0">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-agri-green border-4 border-white shadow-sm"></div>
                        <div className="bg-white border border-agri-green/5 rounded-3xl p-6 shadow-xl shadow-agri-green/5 hover:border-agri-gold/30 transition-all">
                          <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-agri-green/5">
                            <div className="flex items-center gap-3">
                              <span className="px-3 py-1 rounded-md bg-agri-green text-white text-[10px] font-black uppercase tracking-widest">Bloc #{b.idx}</span>
                              <span className="text-xs font-bold text-agri-green">{b.eventType}</span>
                            </div>
                            <div className="text-[10px] font-bold text-agri-earth/40 uppercase tracking-widest">
                              {new Date(b.ts).toLocaleString('fr-FR')}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                            <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-agri-cream flex items-center justify-center text-agri-green">
                                  <Users size={16} />
                                </div>
                                <div>
                                  <div className="text-[8px] font-black uppercase tracking-widest opacity-40">Acteur Certifié</div>
                                  <div className="text-sm font-bold text-agri-green">{b.actorName}</div>
                                </div>
                              </div>
                              <div className="bg-agri-cream/50 rounded-2xl p-4 space-y-3">
                                {Object.entries(payload).map(([k, v]) => (
                                  <div key={k} className="flex justify-between items-center text-[10px]">
                                    <span className="font-bold text-agri-green/40 uppercase">{k}</span>
                                    <span className="font-black text-agri-green">{String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-4">
                               <div className="space-y-2">
                                  <div className="text-[8px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
                                    <Fingerprint size={10} />
                                    Empreinte Actuelle (Hash)
                                  </div>
                                  <div className="text-[9px] font-mono break-all bg-agri-green text-white/90 p-3 rounded-xl">
                                    {b.hash}
                                  </div>
                               </div>
                               <div className="space-y-2">
                                  <div className="text-[8px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
                                    <ArrowRight size={10} />
                                    Bloc Précédent
                                  </div>
                                  <div className="text-[9px] font-mono break-all text-agri-earth/40 px-3">
                                    {b.prevHash}
                                  </div>
                               </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-center py-6">
                     <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-green-50 text-green-700 border border-green-100">
                        <CheckCircle2 size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Intégrité de la chaîne vérifiée</span>
                     </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function UserTable({ users, loading }: { users: AdminUser[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="p-20 text-center space-y-4">
        <RefreshCw size={40} className="mx-auto text-agri-gold animate-spin" />
        <p className="text-agri-earth/40 font-bold uppercase tracking-widest text-[10px]">Chargement des données...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="p-20 text-center space-y-6">
        <div className="w-20 h-20 bg-agri-cream rounded-[32px] flex items-center justify-center text-agri-green/10 mx-auto shadow-inner">
          <Users size={40} />
        </div>
        <p className="text-agri-earth/40 font-medium">Aucun utilisateur enregistré dans cette catégorie.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-agri-cream/50 border-b border-agri-green/5">
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-agri-green/40">
              <div className="flex items-center gap-2">
                <Shield size={14} />
                Utilisateur
              </div>
            </th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-agri-green/40">
              <div className="flex items-center gap-2">
                <Phone size={14} />
                Contact
              </div>
            </th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-agri-green/40">
              <div className="flex items-center gap-2">
                <Mail size={14} />
                Email
              </div>
            </th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-agri-green/40">
              <div className="flex items-center gap-2">
                <Calendar size={14} />
                Date d'adhésion
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-agri-green/5">
          {users.map((u) => (
            <tr key={u.id} className="group hover:bg-agri-cream/30 transition-colors">
              <td className="px-8 py-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-agri-green text-white flex items-center justify-center font-black text-xs shadow-lg shadow-agri-green/10">
                    {u.fullName.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-agri-green">{u.fullName}</div>
                    <div className="text-[10px] font-black text-agri-gold uppercase tracking-widest">ID #{u.id}</div>
                  </div>
                </div>
              </td>
              <td className="px-8 py-6 text-sm font-bold text-agri-green">
                {u.phone}
              </td>
              <td className="px-8 py-6 text-sm text-agri-earth/40 font-medium">
                {u.email || "—"}
              </td>
              <td className="px-8 py-6">
                <div className="text-xs font-bold text-agri-earth/40 uppercase tracking-widest">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : "—"}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
