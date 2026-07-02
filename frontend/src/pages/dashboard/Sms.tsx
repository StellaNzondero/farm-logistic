import { useCallback, useEffect, useState } from "react";
import { apiFetch, apiUpload, apiUrl } from "../../api";
import { useDashboardUser } from "../../state/dashboard";
import { RefreshCw, MessageSquare, ImageIcon, MapPin, Send, ExternalLink, Scale } from "lucide-react";

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
};

export default function DashboardSms() {
  const me = useDashboardUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Product[]>([]);
  const [selectedFileById, setSelectedFileById] = useState<Record<number, File | null>>(
    {}
  );
  const [predictionsById, setPredictionsById] = useState<Record<number, number | null>>({});
  const [predictingId, setPredictingId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiFetch<{ products: Product[] }>(
      "/api/agent/products/needs-photo",
      { method: "GET", auth: true }
    );
    if (!res.ok) {
      setError("Impossible de charger la file (agent).");
      setLoading(false);
      return;
    }
    setItems(res.data.products || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function upload(productId: number) {
    setError(null);
    const file = selectedFileById[productId];
    if (!file) {
      setError("Choisis une image avant d’uploader.");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    const res = await apiUpload<{ product: Product }>(
      `/api/agent/products/${productId}/photo`,
      fd,
      { auth: true }
    );
    if (!res.ok) {
      setError("Upload impossible (jpg/png/webp).");
      return;
    }
    setSelectedFileById((s) => ({ ...s, [productId]: null }));
    await refresh();
  }

  async function publish(productId: number) {
    setError(null);
    const res = await apiFetch<{ product: Product }>(
      `/api/agent/products/${productId}/publish`,
      { method: "POST", auth: true, body: JSON.stringify({}) }
    );
    if (!res.ok) {
      setError("Publication impossible (photo requise).");
      return;
    }
    await refresh();
  }

  async function predictPrice(productId: number) {
    setError(null);
    setPredictingId(productId);
    const res = await apiFetch<{ estimatedPrice: number }>(
      `/api/agent/products/${productId}/predict-price`,
      { method: "POST", auth: true, body: JSON.stringify({}) }
    );
    setPredictingId(null);
    if (!res.ok) {
      setError("Impossible d'obtenir l'estimation pour ce produit.");
      return;
    }
    setPredictionsById((prev) => ({ ...prev, [productId]: res.data.estimatedPrice }));
  }

  return (
    <section className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-agri-green tracking-tight mb-2">Centre SMS (Flux Photos)</h2>
          <p className="text-agri-earth/60 font-medium max-w-2xl">
            Certification visuelle des produits enregistrés via le canal SMS.
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

      <div className="space-y-6">
        <h3 className="text-xl font-bold text-agri-green tracking-tight flex items-center gap-3 px-1">
          <MessageSquare className="text-agri-gold" size={24} />
          Produits en attente ({items.length})
        </h3>
        
        {loading ? (
          <div className="p-20 text-center space-y-4 bg-white border border-agri-green/5 rounded-[48px]">
            <RefreshCw size={40} className="mx-auto text-agri-gold animate-spin" />
            <p className="text-agri-earth/40 font-bold uppercase tracking-widest text-[10px]">Synchronisation de la file...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-20 text-center space-y-6 bg-white border border-agri-green/5 rounded-[48px]">
            <div className="w-20 h-20 bg-agri-cream rounded-[32px] flex items-center justify-center text-agri-green/10 mx-auto shadow-inner">
              <MessageSquare size={40} />
            </div>
            <p className="text-agri-earth/40 font-medium text-lg">Aucun produit SMS en attente de traitement.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((p) => (
              <article key={p.id} className="group bg-white border border-agri-green/5 rounded-[40px] overflow-hidden shadow-xl shadow-agri-green/5 hover:border-agri-gold/30 hover:-translate-y-2 transition-all duration-300">
                <div className="h-56 relative bg-agri-cream flex items-center justify-center overflow-hidden">
                  {p.imageUrl ? (
                    <img 
                      src={apiUrl(p.imageUrl)} 
                      alt={p.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-agri-green/10">
                      <ImageIcon size={64} />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Photo Requise</span>
                    </div>
                  )}
                  <div className="absolute top-6 left-6">
                    <span className="bg-agri-gold/90 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-lg border border-white/20">
                      SMS DRAFT
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
                  </div>

                  <div className="space-y-4">
                    <div className="relative group/input">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) =>
                          setSelectedFileById((s) => ({
                            ...s,
                            [p.id]: e.target.files?.[0] || null
                          }))
                        }
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="w-full px-4 py-3 bg-agri-cream border border-agri-green/10 rounded-2xl flex items-center justify-between group-hover/input:border-agri-gold transition-all">
                        <span className="text-xs font-bold text-agri-green/50 truncate max-w-[150px]">
                          {selectedFileById[p.id] ? selectedFileById[p.id]?.name : "Sélectionner photo"}
                        </span>
                        <ImageIcon size={16} className="text-agri-gold" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <button 
                          className="flex-1 bg-white border border-agri-green/10 text-agri-green py-3 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-agri-cream transition-all flex items-center justify-center gap-2"
                          onClick={() => upload(p.id)}
                        >
                          <ImageIcon size={14} />
                          Uploader
                        </button>
                        <button 
                          className="flex-1 bg-white border border-agri-green/10 text-agri-green py-3 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-agri-cream transition-all flex items-center justify-center gap-2"
                          onClick={() => predictPrice(p.id)}
                          disabled={predictingId === p.id}
                        >
                          <Scale size={14} />
                          {predictingId === p.id ? "Estimation..." : "Estimer"}
                        </button>
                      </div>
                      {predictionsById[p.id] != null && (
                        <div className="text-sm font-bold text-agri-green uppercase tracking-widest text-center">
                          Estimation: {predictionsById[p.id]?.toFixed(0)} {p.currency}
                        </div>
                      )}
                      <button 
                        className="w-full btn-premium py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"
                        onClick={() => publish(p.id)}
                      >
                        <Send size={14} />
                        Publier
                      </button>
                    </div>

                    {p.imageUrl && (
                      <a 
                        href={apiUrl(p.imageUrl)} 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-agri-green/40 hover:text-agri-gold transition-colors pt-2"
                      >
                        <ExternalLink size={12} />
                        Voir l'original certifié
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
