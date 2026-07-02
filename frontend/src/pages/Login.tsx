import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, setToken } from "../api";
import { Sprout, Lock, User } from "lucide-react";

type LoginResponse = {
  accessToken: string;
  user: { fullName: string; role: string };
};

export default function Login() {
  const nav = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password })
      });
      if (!res.ok) {
        const errorData = res.error as { error?: string };
        const code = errorData?.error;

        if (code === "INVALID_CREDENTIALS") {
          setError("Identifiants incorrects. Veuillez réessayer.");
        } else if (code === "IDENTIFIER_REQUIRED") {
          setError("Veuillez saisir votre email ou numéro de téléphone.");
        } else if (code === "PASSWORD_REQUIRED") {
          setError("Veuillez saisir votre mot de passe.");
        } else {
          setError("Connexion impossible. Vérifiez vos informations.");
        }
        return;
      }
      setToken(res.data.accessToken);
      nav("/dashboard", { replace: true });
    } catch {
      setError("Erreur de connexion au serveur sécurisé.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="agri-lp antialiased min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="fixed w-full z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-agri-green rounded-xl flex items-center justify-center text-white">
              <Sprout size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight uppercase text-agri-green">FarmLogistics</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/register" className="text-sm font-bold uppercase tracking-wider text-agri-green/70 hover:text-agri-green transition-colors">Pas encore membre ?</Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center pt-20 p-6 hero-gradient relative overflow-hidden">
        {/* Decorative Orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-agri-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-agri-green/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

        <div className="w-full max-w-[480px] bg-white rounded-[32px] shadow-2xl p-8 md:p-12 border border-agri-green/5 z-10 relative">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-agri-cream border border-agri-gold/30 text-agri-gold text-[10px] font-black uppercase tracking-widest mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-agri-gold animate-pulse"></span>
              Authentification Sécurisée
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-agri-green mb-3">Bon retour parmi nous</h1>
            <p className="text-sm text-agri-earth/60 leading-relaxed">
              Accédez à votre tableau de bord et gérez vos enchères en temps réel.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/50 flex items-center gap-2 px-1">
                <User size={12} />
                Identifiant Professionnel
              </label>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email ou numéro de téléphone"
                autoComplete="username"
                required
                className="w-full px-5 py-4 bg-agri-cream border border-agri-green/10 rounded-2xl focus:outline-none focus:border-agri-gold focus:ring-1 focus:ring-agri-gold transition-all text-agri-earth placeholder:text-agri-earth/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/50 flex items-center gap-2 px-1">
                <Lock size={12} />
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                required
                className="w-full px-5 py-4 bg-agri-cream border border-agri-green/10 rounded-2xl focus:outline-none focus:border-agri-gold focus:ring-1 focus:ring-agri-gold transition-all text-agri-earth placeholder:text-agri-earth/30"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium text-center">
                {error}
              </div>
            )}

            <button
              className="btn-premium w-full py-5 rounded-full font-bold uppercase tracking-widest text-sm shadow-xl disabled:opacity-50"
              type="submit"
              disabled={loading}
            >
              {loading ? "Vérification en cours..." : "Ouvrir ma session"}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-agri-green/5 text-center text-sm">
            <span className="text-agri-earth/50">Nouveau sur la plateforme ?</span>{" "}
            <Link to="/register" className="text-agri-green font-bold hover:underline">
              Créer un compte pro
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-[10px] uppercase font-bold tracking-[0.2em] opacity-40">
        © 2026 FarmLogistics Systems — Digitalisation de la terre.
      </footer>
    </div>
  );
}
