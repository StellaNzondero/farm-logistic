import { useDashboardUser } from "../../state/dashboard";
import { User, Shield, Phone, Mail, BadgeCheck } from "lucide-react";

export default function DashboardProfile() {
  const user = useDashboardUser();

  return (
    <section className="space-y-10">
      <div>
        <h2 className="text-3xl font-bold text-agri-green tracking-tight mb-2">Configuration du Profil</h2>
        <p className="text-agri-earth/60 font-medium">Gérez vos informations personnelles et les paramètres de sécurité de votre tableau de bord.</p>
      </div>

      <div className="max-w-3xl">
        <div className="bg-white border border-agri-green/5 rounded-[40px] shadow-2xl shadow-agri-green/5 overflow-hidden">
          <div className="p-8 md:p-12 border-b border-agri-green/5 bg-agri-cream/30 flex flex-col md:flex-row items-center gap-8">
            <div className="w-24 h-24 bg-agri-green text-white rounded-[32px] flex items-center justify-center text-4xl font-black shadow-2xl shadow-agri-green/20 shrink-0">
              {user.fullName.slice(0, 1).toUpperCase()}
            </div>
            <div className="text-center md:text-left space-y-2">
              <h3 className="text-2xl font-bold text-agri-green flex items-center justify-center md:justify-start gap-2">
                {user.fullName}
                <BadgeCheck className="text-agri-gold" size={20} />
              </h3>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-agri-green/10 text-agri-green text-[10px] font-black uppercase tracking-widest border border-agri-green/20">
                Membre Certifié : {user.role}
              </div>
            </div>
          </div>

          <div className="p-8 md:p-12 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 flex items-center gap-2 px-1">
                  <Mail size={12} />
                  Adresse Email
                </label>
                <div className="w-full px-5 py-4 bg-agri-cream/50 border border-agri-green/10 rounded-2xl font-bold text-agri-green">
                  {user.fullName}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 flex items-center gap-2 px-1">
                  <Mail size={12} />
                  Adresse Email
                </label>
                <div className="w-full px-5 py-4 bg-agri-cream/50 border border-agri-green/10 rounded-2xl font-bold text-agri-green uppercase tracking-widest text-xs">
                  {user.role}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 flex items-center gap-2 px-1">
                  <Phone size={12} />
                  Téléphone Professionnel
                </label>
                <div className="w-full px-5 py-4 bg-agri-cream/50 border border-agri-green/10 rounded-2xl font-bold text-agri-green">
                  {user.phone}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-agri-green/40 flex items-center gap-2 px-1">
                  <Mail size={12} />
                  Adresse Email
                </label>
                <div className="w-full px-5 py-4 bg-agri-cream/50 border border-agri-green/10 rounded-2xl font-bold text-agri-green">
                  {user.email || "Non renseignée"}
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-agri-green/5">
              <div className="p-6 bg-agri-cream rounded-[32px] border border-agri-gold/20 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h4 className="text-sm font-bold text-agri-green mb-1">Sécurité du Compte</h4>
                  <p className="text-[10px] font-medium text-agri-earth/40 uppercase tracking-widest">Votre session est actuellement protégée par chiffrement de bout en bout.</p>
                </div>
                <button className="px-6 py-3 rounded-full border border-agri-green/10 text-agri-green text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-sm">
                  Modifier le mot de passe
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
