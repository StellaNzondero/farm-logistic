import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../api";
import { useDashboardUser } from "../../state/dashboard";
import { RefreshCw, UserPlus, Users, Phone, Calendar, Hash, Mail } from "lucide-react";

type FarmerUser = {
  id: number;
  fullName: string;
  phone: string;
  email?: string | null;
  role: string;
  createdAt?: string | null;
};

export default function DashboardFarmers() {
  const me = useDashboardUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<FarmerUser[]>([]);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: ""
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiFetch<{ users: FarmerUser[] }>("/api/agent/users", {
      method: "GET",
      auth: true
    });
    if (!res.ok) {
      setError("Impossible de charger les agriculteurs.");
      setLoading(false);
      return;
    }
    setUsers(res.data.users || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onCreateFarmer(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const res = await apiFetch<{ user: FarmerUser }>("/api/agent/users", {
      method: "POST",
      auth: true,
      body: JSON.stringify({
        ...form,
        email: form.email || null
      })
    });
    if (!res.ok) {
      setError("Erreur lors de la création de l'agriculteur (téléphone déjà utilisé ?).");
      return;
    }
    setSuccess(`Agriculteur ${res.data.user.fullName} enregistré avec succès !`);
    setForm({ fullName: "", phone: "", email: "", password: "" });
    await refresh();
  }

  return (
    <section className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-agri-green tracking-tight mb-2">Registre des Producteurs</h2>
          <p className="text-agri-earth/60 font-medium max-w-2xl">
            Enregistrement manuel des agriculteurs pour l'inclusion numérique.
          </p>
        </div>
        <button 
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-white border border-agri-green/10 text-agri-green text-sm font-bold shadow-sm hover:bg-agri-cream transition-all"
          onClick={refresh} 
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          Actualiser la liste
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-green-700 text-sm font-medium">
          {success}
        </div>
      )}

      {/* Registration Form */}
      <div className="bg-white border border-agri-green/5 rounded-[40px] shadow-2xl shadow-agri-green/5 overflow-hidden">
        <div className="p-8 border-b border-agri-green/5 bg-agri-cream/30">
          <h3 className="text-xl font-bold text-agri-green flex items-center gap-3">
            <UserPlus className="text-agri-gold" size={24} />
            Nouvelle Inscription Manuelle
          </h3>
        </div>
        <form onSubmit={onCreateFarmer} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 px-1">Nom Complet</label>
              <input 
                value={form.fullName}
                onChange={e => setForm(s => ({ ...s, fullName: e.target.value }))}
                required
                placeholder="Ex: Jean Dupont"
                className="w-full px-4 py-3 bg-agri-cream border border-agri-green/10 rounded-xl focus:outline-none focus:border-agri-gold transition-all text-sm font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 px-1">Téléphone (Identifiant)</label>
              <input 
                value={form.phone}
                onChange={e => setForm(s => ({ ...s, phone: e.target.value }))}
                required
                placeholder="+243..."
                className="w-full px-4 py-3 bg-agri-cream border border-agri-green/10 rounded-xl focus:outline-none focus:border-agri-gold transition-all text-sm font-bold"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 px-1">Email (Optionnel)</label>
              <input 
                type="email"
                value={form.email}
                onChange={e => setForm(s => ({ ...s, email: e.target.value }))}
                placeholder="Ex: producteur@gmail.com"
                className="w-full px-4 py-3 bg-agri-cream border border-agri-green/10 rounded-xl focus:outline-none focus:border-agri-gold transition-all text-sm font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 px-1">Mot de passe</label>
              <input 
                type="password"
                value={form.password}
                onChange={e => setForm(s => ({ ...s, password: e.target.value }))}
                required
                minLength={6}
                placeholder="••••••"
                className="w-full px-4 py-3 bg-agri-cream border border-agri-green/10 rounded-xl focus:outline-none focus:border-agri-gold transition-all text-sm font-bold"
              />
            </div>
          </div>
          <button className="btn-premium w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg">
            Inscrire au Registre
          </button>
        </form>
      </div>

      {/* List Card */}
      <div className="bg-white border border-agri-green/5 rounded-[40px] shadow-2xl shadow-agri-green/5 overflow-hidden">
        <div className="p-8 border-b border-agri-green/5 bg-agri-cream/30 flex items-center justify-between">
          <h3 className="text-xl font-bold text-agri-green flex items-center gap-3">
            <Users className="text-agri-gold" size={24} />
            Registre des Agriculteurs ({users.length})
          </h3>
        </div>
        
        {loading ? (
          <div className="p-20 text-center space-y-4">
            <RefreshCw size={40} className="mx-auto text-agri-gold animate-spin" />
            <p className="text-agri-earth/40 font-bold uppercase tracking-widest text-[10px]">Chargement du registre...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-20 text-center space-y-6">
            <div className="w-20 h-20 bg-agri-cream rounded-[32px] flex items-center justify-center text-agri-green/10 mx-auto shadow-inner">
              <Users size={40} />
            </div>
            <p className="text-agri-earth/40 font-medium">Aucun agriculteur enregistré par vos soins.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-agri-cream/50 border-b border-agri-green/5">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-agri-green/40">
                    <div className="flex items-center gap-2">
                      <Hash size={14} />
                      Producteur
                    </div>
                  </th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-agri-green/40">
                    <div className="flex items-center gap-2">
                      <Phone size={14} />
                      Téléphone
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
                      Date d'inscription
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
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        }) : "—"}
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
