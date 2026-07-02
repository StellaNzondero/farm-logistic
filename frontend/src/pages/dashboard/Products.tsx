import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, apiUpload, apiUrl } from "../../api";
import { useDashboardUser } from "../../state/dashboard";
import { RefreshCw, Plus, Package, MapPin, Scale, DollarSign, Image as ImageIcon, FileText, Send, Edit, Trash2, X, RotateCw } from "lucide-react";

type Product = {
  id: number;
  title: string;
  description?: string | null;
  location?: string | null;
  unit?: string | null;
  quantity?: number | null;
  startingPrice: number;
  currency: string;
  status: "DRAFT" | "PUBLISHED" | string;
  ownerUserId: number;
  catalogEntryId?: number | null;
  catalogEntry?: {
    id: number;
    label: string;
    admin1: string;
    admin2: string;
    market: string;
    marketId: number;
    category: string;
    commodity: string;
  } | null;
  imageUrl?: string | null;
};

type CatalogEntry = {
  id: number;
  label: string;
  admin1: string;
  admin2: string;
  market: string;
  marketId: number;
  latitude: number;
  longitude: number;
  category: string;
  commodity: string;
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

export default function DashboardProducts() {
  const user = useDashboardUser();
  const title = user.role === "agriculteur" ? "Gestion des Stocks" : "Catalogue de Production";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Product[]>([]);
  const [catalogEntries, setCatalogEntries] = useState<CatalogEntry[]>([]);
  const [predictionsById, setPredictionsById] = useState<Record<number, number | null>>({});
  const [predictingId, setPredictingId] = useState<number | null>(null);

  const canCreate = user.role === "agriculteur";

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    unit: "",
    quantity: "",
    startingPrice: "",
    currency: "USD",
    catalogEntryId: ""
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const selectedCatalogEntry = useMemo(
    () => catalogEntries.find((entry) => entry.id === Number(form.catalogEntryId)),
    [catalogEntries, form.catalogEntryId]
  );

  const listEndpoint = useMemo(
    () => (user.role === "agriculteur" ? "/api/my/products" : "/api/products"),
    [user.role]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [productsRes, catalogRes] = await Promise.all([
      apiFetch<{ products: Product[] }>(listEndpoint, {
        method: "GET",
        auth: user.role === "agriculteur"
      }),
      apiFetch<{ entries: CatalogEntry[] }>("/api/catalog/entries", {
        method: "GET"
      })
    ]);
    if (!productsRes.ok) {
      setError("Erreur de synchronisation du catalogue.");
      setLoading(false);
      return;
    }
    setItems(productsRes.data.products || []);
    if (catalogRes.ok) {
      setCatalogEntries(catalogRes.data.entries || []);
    }
    setLoading(false);
  }, [listEndpoint, user.role]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      unit: form.unit.trim() || null,
      quantity: form.quantity ? Number(form.quantity) : null,
      startingPrice: Number(form.startingPrice || 0),
      currency: (form.currency || "USD").toUpperCase(),
      catalogEntryId: form.catalogEntryId ? Number(form.catalogEntryId) : null
    };

    let productId: number;
    if (editingId) {
      const res = await apiFetch<{ product: Product }>(`/api/my/products/${editingId}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        setError("Erreur lors de la mise à jour.");
        return;
      }
      productId = editingId;
    } else {
      const res = await apiFetch<{ product: Product }>("/api/my/products", {
        method: "POST",
        auth: true,
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        setError("Erreur lors de l'enregistrement. Vérifiez les champs obligatoires.");
        return;
      }
      productId = res.data.product.id;
    }

    if (photo) {
      const fd = new FormData();
      fd.append("file", photo);
      const up = await apiUpload<{ product: Product }>(
        `/api/my/products/${productId}/photo`,
        fd,
        { auth: true }
      );
      if (!up.ok) {
        setError("Produit enregistré, mais l'image n'a pu être traitée.");
      }
    }

    cancelEdit();
    await refresh();
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      title: p.title || "",
      description: p.description || "",
      location: p.location || "",
      unit: p.unit || "",
      quantity: p.quantity?.toString() || "",
      startingPrice: p.startingPrice.toString() || "",
      currency: p.currency || "USD",
      catalogEntryId: p.catalogEntryId?.toString() || ""
    });
    setPhoto(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({
      title: "",
      description: "",
      location: "",
      unit: "",
      quantity: "",
      startingPrice: "",
      currency: "USD",
      catalogEntryId: ""
    });
    setPhoto(null);
  }

  async function onDelete(productId: number) {
    if (!confirm("Voulez-vous vraiment supprimer ce lot en brouillon ?")) return;
    setError(null);
    const res = await apiFetch(`/api/my/products/${productId}`, {
      method: "DELETE",
      auth: true
    });
    if (!res.ok) {
      setError("Erreur lors de la suppression.");
      return;
    }
    await refresh();
  }

  async function publish(productId: number) {
    setError(null);
    const res = await apiFetch<{ product: Product }>(
      `/api/my/products/${productId}/publish`,
      { method: "POST", auth: true, body: JSON.stringify({}) }
    );
    if (!res.ok) {
      setError("Échec de la mise en marché. Le produit est peut-être incomplet.");
      return;
    }
    await refresh();
  }

  async function predictPrice(productId: number) {
    setError(null);
    setPredictingId(productId);
    const res = await apiFetch<{ estimatedPrice: number }>(
      `/api/my/products/${productId}/predict-price`,
      { method: "POST", auth: true, body: JSON.stringify({}) }
    );
    setPredictingId(null);
    if (!res.ok) {
      setError("Impossible d'obtenir l'estimation pour ce produit.");
      return;
    }
    setPredictionsById((prev) => ({ ...prev, [productId]: res.data.estimatedPrice }));
  }

  async function relaunch(productId: number) {
    setError(null);
    const res = await apiFetch<{ product: Product }>(
      `/api/my/products/${productId}/relaunch`,
      { method: "POST", auth: true, body: JSON.stringify({}) }
    );
    if (!res.ok) {
      setError("Échec de la relance de l'enchère. L'enchère doit être terminée et sans offre.");
      return;
    }
    await refresh();
  }

  return (
    <section className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-agri-green tracking-tight mb-2">{title}</h2>
          <p className="text-agri-earth/60 font-medium max-w-2xl">
            {user.role === "agriculteur"
              ? "Référencez vos lots et initiez des cycles d'enchères certifiés sur la blockchain."
              : "Consultez les opportunités d'acquisition et les stocks certifiés par nos agents."}
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

      {canCreate && (
        <div className="bg-white border border-agri-green/5 rounded-[32px] shadow-2xl shadow-agri-green/5 overflow-hidden">
          <div className="p-8 border-b border-agri-green/5 bg-agri-cream/30 flex justify-between items-center">
            <h3 className="text-xl font-bold text-agri-green flex items-center gap-3">
              {editingId ? <Edit className="text-agri-gold" size={24} /> : <Plus className="text-agri-gold" size={24} />}
              {editingId ? "Modifier le Brouillon" : "Nouvelle Référence Stock"}
            </h3>
            {editingId && (
              <button 
                onClick={cancelEdit}
                className="text-agri-earth/40 hover:text-red-500 transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-widest"
              >
                <X size={16} />
                Annuler
              </button>
            )}
          </div>
          <form className="p-8 space-y-8" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 flex items-center gap-2 px-1">
                  <Package size={12} />
                  Désignation du produit
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                  placeholder="ex: Cacao Grade A (Sac 50kg)"
                  required
                  className="w-full px-5 py-3.5 bg-agri-cream/50 border border-agri-green/10 rounded-2xl focus:outline-none focus:border-agri-gold focus:ring-1 focus:ring-agri-gold transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 flex items-center gap-2 px-1">
                  <MapPin size={12} />
                  Référence de marché
                </label>
                <select
                  value={form.catalogEntryId}
                  onChange={(e) => setForm((s) => ({ ...s, catalogEntryId: e.target.value }))}
                  required
                  className="w-full px-5 py-3.5 bg-agri-cream/50 border border-agri-green/10 rounded-2xl focus:outline-none focus:border-agri-gold focus:ring-1 focus:ring-agri-gold transition-all"
                >
                  <option value="">Choisir une référence du catalogue</option>
                  {catalogEntries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                </select>
                {selectedCatalogEntry && (
                  <p className="text-[11px] text-agri-earth/50 font-medium px-1">
                    {selectedCatalogEntry.admin1} · {selectedCatalogEntry.market} · {selectedCatalogEntry.category}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 flex items-center gap-2 px-1">
                  <MapPin size={12} />
                  Localisation du lot
                </label>
                <input
                  value={form.location}
                  onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))}
                  placeholder="ex: Entrepôt San Pedro"
                  className="w-full px-5 py-3.5 bg-agri-cream/50 border border-agri-green/10 rounded-2xl focus:outline-none focus:border-agri-gold focus:ring-1 focus:ring-agri-gold transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 flex items-center gap-2 px-1">
                    <Scale size={12} />
                    Unité
                  </label>
                  <input
                    value={form.unit}
                    onChange={(e) => setForm((s) => ({ ...s, unit: e.target.value }))}
                    placeholder="ex: tonnes"
                    className="w-full px-5 py-3.5 bg-agri-cream/50 border border-agri-green/10 rounded-2xl focus:outline-none focus:border-agri-gold focus:ring-1 focus:ring-agri-gold transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 flex items-center gap-2 px-1">
                    <Package size={12} />
                    Quantité
                  </label>
                  <input
                    value={form.quantity}
                    onChange={(e) => setForm((s) => ({ ...s, quantity: e.target.value }))}
                    inputMode="decimal"
                    placeholder="ex: 25"
                    className="w-full px-5 py-3.5 bg-agri-cream/50 border border-agri-green/10 rounded-2xl focus:outline-none focus:border-agri-gold focus:ring-1 focus:ring-agri-gold transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 flex items-center gap-2 px-1">
                    <DollarSign size={12} />
                    Prix de départ
                  </label>
                  <input
                    value={form.startingPrice}
                    onChange={(e) => setForm((s) => ({ ...s, startingPrice: e.target.value }))}
                    inputMode="numeric"
                    placeholder="Montant total"
                    required
                    className="w-full px-5 py-3.5 bg-agri-cream/50 border border-agri-green/10 rounded-2xl focus:outline-none focus:border-agri-gold focus:ring-1 focus:ring-agri-gold transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 flex items-center gap-2 px-1">
                    <DollarSign size={12} />
                    Devise
                  </label>
                  <input
                    value={form.currency}
                    onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value }))}
                    placeholder="USD"
                    className="w-full px-5 py-3.5 bg-agri-cream/50 border border-agri-green/10 rounded-2xl focus:outline-none focus:border-agri-gold focus:ring-1 focus:ring-agri-gold transition-all"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 flex items-center gap-2 px-1">
                  <ImageIcon size={12} />
                  Preuve Visuelle (Photo)
                </label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full px-5 py-8 bg-agri-cream/30 border-2 border-dashed border-agri-green/10 rounded-[32px] flex flex-col items-center justify-center gap-3 group-hover:bg-agri-cream/50 group-hover:border-agri-gold/50 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-agri-gold shadow-sm">
                      <ImageIcon size={24} />
                    </div>
                    <span className="text-sm font-bold text-agri-green/60">
                      {photo ? photo.name : "Cliquez ou déposez une image pour certifier le lot"}
                    </span>
                    <span className="text-[10px] font-bold text-agri-earth/30 uppercase tracking-widest italic">PNG, JPG ou WEBP acceptés</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 flex items-center gap-2 px-1">
                  <FileText size={12} />
                  Description & Caractéristiques
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                  placeholder="Précisez la qualité, l'origine, la date de récolte..."
                  rows={4}
                  className="w-full px-5 py-4 bg-agri-cream/50 border border-agri-green/10 rounded-[32px] focus:outline-none focus:border-agri-gold focus:ring-1 focus:ring-agri-gold transition-all resize-none"
                />
              </div>
            </div>

            <button className="btn-premium w-full py-5 rounded-full font-bold uppercase tracking-widest text-sm shadow-xl flex items-center justify-center gap-3" type="submit">
              {editingId ? <Edit size={20} /> : <Package size={20} />}
              {editingId ? "Mettre à jour le Brouillon" : "Enregistrer comme Brouillon"}
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {items.map((p) => (
          <article key={p.id} className="group bg-white border border-agri-green/5 rounded-[40px] overflow-hidden shadow-xl shadow-agri-green/5 hover:border-agri-gold/30 hover:-translate-y-2 transition-all duration-300">
            <div className="h-64 relative bg-agri-cream flex items-center justify-center overflow-hidden">
              {p.imageUrl ? (
                <img 
                  src={apiUrl(p.imageUrl)} 
                  alt={p.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-agri-green/10">
                  <Package size={64} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Visuel non disponible</span>
                </div>
              )}
              <div className="absolute top-6 left-6">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-lg border ${
                  p.status === 'PUBLISHED' 
                    ? 'bg-agri-green/90 text-white border-white/20' 
                    : 'bg-white/90 text-agri-earth/60 border-agri-green/10'
                }`}>
                  {p.status === 'PUBLISHED' ? 'En Marché' : 'Brouillon'}
                </span>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <h4 className="text-xl font-bold text-agri-green mb-2 group-hover:text-agri-gold transition-colors">{p.title}</h4>
                <div className="flex items-center gap-2 text-agri-earth/40 text-xs font-bold uppercase tracking-widest">
                  <MapPin size={12} className="text-agri-gold" />
                  <span>{p.location || 'Localisation inconnue'}</span>
                  <span className="text-agri-gold/30">•</span>
                  <span>{p.quantity || '—'} {p.unit}</span>
                </div>
                {p.catalogEntry?.label && (
                  <div className="mt-2 text-[11px] font-bold text-agri-green/50 uppercase tracking-widest">
                    {p.catalogEntry.label}
                  </div>
                )}
              </div>
              
              <div className="bg-agri-cream/50 p-6 rounded-[32px] border border-agri-green/5">
                <div className="text-[10px] font-black uppercase tracking-widest text-agri-green/30 mb-1">Prix de Départ</div>
                <div className="text-2xl font-black text-agri-green">{formatMoney(p.startingPrice, p.currency)}</div>
              </div>

              {user.role === "agriculteur" && p.status === "DRAFT" && (
                <div className="space-y-3">
                  <button
                    className="btn-premium w-full py-4 rounded-full font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg group-hover:shadow-agri-green/20"
                    onClick={() => publish(p.id)}
                  >
                    <Send size={16} />
                    Lancer l'Enchère
                  </button>
                  <button
                    className="w-full py-3 rounded-full bg-white border border-agri-green/10 text-agri-green text-[10px] font-black uppercase tracking-widest hover:bg-agri-cream transition-colors flex items-center justify-center gap-2"
                    onClick={() => predictPrice(p.id)}
                    disabled={predictingId === p.id}
                  >
                    <Scale size={14} />
                    {predictingId === p.id ? "Estimation..." : "Estimer le prix"}
                  </button>
                  {predictionsById[p.id] != null && (
                    <div className="text-sm font-bold text-agri-green uppercase tracking-widest text-center">
                      Estimation: {formatMoney(predictionsById[p.id] ?? 0, p.currency)}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => startEdit(p)}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-agri-cream text-agri-green text-[10px] font-black uppercase tracking-widest hover:bg-agri-gold/10 transition-colors border border-agri-green/5"
                    >
                      {/* <Edit size={14} /> */}
                      Modifier
                    </button>
                    <button
                      onClick={() => onDelete(p.id)}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors border border-red-100"
                    >
                      {/* <Trash2 size={14} /> */}
                      Supprimer
                    </button>
                  </div>
                </div>
              )}

              {user.role === "agriculteur" && p.status === "PUBLISHED" && (
                <div className="pt-2">
                   <button
                    className="w-full py-4 rounded-full font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 bg-agri-cream text-agri-green hover:bg-agri-gold/10 transition-colors border border-agri-green/5"
                    onClick={() => relaunch(p.id)}
                  >
                    <RotateCw size={14} />
                    Relancer (si sans enchères)
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
        
        {items.length === 0 && !loading && (
          <div className="col-span-full bg-white border border-agri-green/5 rounded-[48px] p-24 text-center">
            <div className="w-24 h-24 bg-agri-cream rounded-[40px] flex items-center justify-center text-agri-green/10 mx-auto mb-8 shadow-inner">
              <Package size={48} />
            </div>
            <h3 className="text-2xl font-bold text-agri-green mb-2 tracking-tight">Aucune référence disponible</h3>
            <p className="text-agri-earth/40 font-medium">Le catalogue est actuellement vide ou en attente de synchronisation.</p>
          </div>
        )}
      </div>
    </section>
  );
}
