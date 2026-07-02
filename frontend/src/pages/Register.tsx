import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, setToken } from "../api";
import { Sprout, User, Phone, Mail, Lock, Briefcase } from "lucide-react";

type RegisterResponse = {
  accessToken: string;
  user: { fullName: string; role: string };
};

type Role = "acheteur" | "agriculteur";

export default function Register() {
  const nav = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("acheteur");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<RegisterResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName,
          email: email || null,
          phone,
          password,
          role
        })
      });
      if (!res.ok) {
        const errorData = res.error as { error?: string };
        const code = errorData?.error;

        if (code === "PHONE_ALREADY_USED") {
          setError("Ce numéro de téléphone est déjà utilisé par un autre compte.");
        } else if (code === "EMAIL_ALREADY_USED") {
          setError("Cette adresse email est déjà associée à un compte.");
        } else if (code === "PASSWORD_TOO_SHORT") {
          setError("Le mot de passe est trop court (min. 6 caractères).");
        } else if (code === "INVALID_EMAIL") {
          setError("Format d'adresse email invalide.");
        } else if (code === "FULL_NAME_REQUIRED") {
          setError("Le nom complet est obligatoire.");
        } else if (code === "PHONE_REQUIRED") {
          setError("Le numéro de téléphone est obligatoire.");
        } else {
          setError("Création impossible. Vérifiez vos informations.");
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
            <Link to="/login" className="text-sm font-bold uppercase tracking-wider text-agri-green/70 hover:text-agri-green transition-colors">Déjà inscrit ?</Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center pt-24 p-6 hero-gradient relative overflow-hidden">
        {/* Decorative Orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-agri-gold/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-agri-green/5 rounded-full blur-3xl translate-y-1/2 translate-x-1/2"></div>

        <div className="w-full max-w-[560px] bg-white rounded-[32px] shadow-2xl p-8 md:p-12 border border-agri-green/5 z-10 relative">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-agri-cream border border-agri-gold/30 text-agri-gold text-[10px] font-black uppercase tracking-widest mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-agri-gold animate-pulse"></span>
              Adhésion au Réseau
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-agri-green mb-3">Créer un compte pro</h1>
            <p className="text-sm text-agri-earth/60 leading-relaxed">
              Rejoignez l'infrastructure d'élite du commerce agricole.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/50 flex items-center gap-2 px-1">
                  <User size={12} />
                  Nom Complet
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ex: Jean Dupont"
                  required
                  className="w-full px-5 py-3.5 bg-agri-cream border border-agri-green/10 rounded-2xl focus:outline-none focus:border-agri-gold focus:ring-1 focus:ring-agri-gold transition-all text-agri-earth placeholder:text-agri-earth/30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/50 flex items-center gap-2 px-1">
                  <Phone size={12} />
                  Téléphone
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="ex: 080..."
                  required
                  className="w-full px-5 py-3.5 bg-agri-cream border border-agri-green/10 rounded-2xl focus:outline-none focus:border-agri-gold focus:ring-1 focus:ring-agri-gold transition-all text-agri-earth placeholder:text-agri-earth/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/50 flex items-center gap-2 px-1">
                <Mail size={12} />
                Email (Optionnel)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex: contact@entreprise.com"
                className="w-full px-5 py-3.5 bg-agri-cream border border-agri-green/10 rounded-2xl focus:outline-none focus:border-agri-gold focus:ring-1 focus:ring-agri-gold transition-all text-agri-earth placeholder:text-agri-earth/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/50 flex items-center gap-2 px-1">
                <Lock size={12} />
                Mot de passe sécurisé
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                placeholder="Min. 6 caractères"
                required
                className="w-full px-5 py-3.5 bg-agri-cream border border-agri-green/10 rounded-2xl focus:outline-none focus:border-agri-gold focus:ring-1 focus:ring-agri-gold transition-all text-agri-earth placeholder:text-agri-earth/30"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/50 flex items-center gap-2 px-1">
                <Briefcase size={12} />
                Votre Profil
              </label>
              <div className="p-1 bg-agri-cream border border-agri-green/10 rounded-2xl flex gap-1">
                <button
                  type="button"
                  className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                    role === "acheteur"
                      ? "bg-agri-green text-white shadow-lg"
                      : "text-agri-green/50 hover:bg-agri-green/5"
                  }`}
                  onClick={() => setRole("acheteur")}
                >
                  Acheteur
                </button>
                <button
                  type="button"
                  className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                    role === "agriculteur"
                      ? "bg-agri-green text-white shadow-lg"
                      : "text-agri-green/50 hover:bg-agri-green/5"
                  }`}
                  onClick={() => setRole("agriculteur")}
                >
                  Agriculteur
                </button>
              </div>
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
              {loading ? "Initialisation du compte..." : "Finaliser mon inscription"}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-agri-green/5 text-center text-sm">
            <span className="text-agri-earth/50">Déjà un compte ?</span>{" "}
            <Link to="/login" className="text-agri-green font-bold hover:underline">
              Se connecter
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
