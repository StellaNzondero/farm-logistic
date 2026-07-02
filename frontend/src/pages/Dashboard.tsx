import { useEffect, useState, useRef } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { apiFetch, clearToken } from "../api";
import { DashboardUserProvider } from "../state/dashboard";
import { 
  Sprout, 
  LayoutDashboard, 
  Package, 
  Gavel, 
  History, 
  MessageSquare, 
  Shield, 
  Settings, 
  Menu, 
  Search, 
  ChevronDown, 
  User, 
  LogOut,
  X
} from "lucide-react";

type MeResponse = {
  user: {
    id: number;
    fullName: string;
    role: string;
    email?: string | null;
    phone: string;
  };
};

export default function Dashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let didCancel = false;
    const controller = new AbortController();
    async function load() {
      try {
        setLoading(true);
        setLoadError(null);
        const res = await apiFetch<MeResponse>("/api/auth/me", {
          method: "GET",
          auth: true,
          signal: controller.signal
        });
        if (didCancel) return;
        if (!res.ok) {
          setLoadError("Session expirée ou invalide.");
          setLoading(false);
          return;
        }
        setMe(res.data.user);
        setLoading(false);
      } catch (err: unknown) {
        if (didCancel) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError("Erreur lors de la synchronisation du profil.");
        setLoading(false);
      }
    }
    void load();
    return () => {
      didCancel = true;
      controller.abort();
    };
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [nav]);

  function logout() {
    clearToken();
    nav("/");
  }

  if (loading) {
    return (
      <div className="agri-lp antialiased min-h-screen bg-agri-cream flex flex-col items-center justify-center p-6 hero-gradient">
        <div className="w-16 h-16 bg-agri-green rounded-2xl flex items-center justify-center text-white animate-bounce shadow-2xl mb-6">
          <Sprout size={32} />
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-agri-gold/30 text-agri-gold text-[10px] font-black uppercase tracking-widest shadow-sm">
          <span className="w-2 h-2 rounded-full bg-agri-gold animate-pulse"></span>
          Initialisation du tableau de bord...
        </div>
      </div>
    );
  }

  if (loadError || !me) {
    return (
      <div className="agri-lp antialiased min-h-screen bg-agri-cream flex items-center justify-center p-6 hero-gradient">
        <div className="w-full max-w-[480px] bg-white rounded-[32px] shadow-2xl p-8 md:p-12 border border-agri-green/5 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-agri-green mb-3">Incident de Connexion</h1>
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium mb-8">
            {loadError || "Profil utilisateur introuvable."}
          </div>
          <button 
            className="btn-premium px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs shadow-xl"
            onClick={() => { clearToken(); nav("/login"); }}
          >
            Retour à l'authentification
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { to: "/dashboard/overview", label: "Vue d'ensemble", icon: <LayoutDashboard size={20} /> },
    { to: "/dashboard/products", label: me.role === "agriculteur" ? "Mes Stocks" : "Catalogue", icon: <Package size={20} /> },
    { to: "/dashboard/bids", label: "Enchères", icon: <Gavel size={20} /> },
    { to: "/dashboard/bids-history", label: "Historique", icon: <History size={20} /> },
    ...(me.role === "agent" ? [
      { to: "/dashboard/sms", label: "Centre SMS", icon: <MessageSquare size={20} /> },
      { to: "/dashboard/farmers", label: "Agriculteurs", icon: <User size={20} /> }
    ] : []),
    ...(me.role === "admin" ? [{ to: "/dashboard/admin", label: "Administration", icon: <Shield size={20} /> }] : []),
    { to: "/dashboard/profile", label: "Configuration", icon: <Settings size={20} /> }
  ];

  return (
    <DashboardUserProvider user={me}>
      <div className="agri-lp antialiased min-h-screen bg-agri-cream flex">
        {/* Sidebar for Desktop */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-agri-green/5 transition-transform duration-300 lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-full flex flex-col p-6">
            <div className="flex items-center justify-between mb-12">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-9 h-9 bg-agri-green rounded-xl flex items-center justify-center text-white">
                  <Sprout size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black tracking-tight uppercase text-agri-green leading-none">FarmLogistics</span>
                  <span className="text-[9px] font-black tracking-[0.2em] text-agri-gold uppercase mt-1">Tableau de bord</span>
                </div>
              </Link>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-agri-green/40 hover:text-agri-green transition-colors">
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto">
              <div className="px-4 mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-agri-green/30">Menu Principal</div>
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all group ${
                    isActive 
                      ? "bg-agri-green text-white shadow-lg shadow-agri-green/20" 
                      : "text-agri-green/50 hover:bg-agri-green/5 hover:text-agri-green"
                  }`}
                >
                  <span className={`${isSidebarOpen ? 'text-white' : ''}`}>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto pt-6 border-t border-agri-green/5">
              <button 
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-sm text-red-500 hover:bg-red-50 transition-all group"
              >
                <LogOut size={20} />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-agri-green/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {/* Topbar */}
          <header className="h-20 flex items-center justify-between px-6 md:px-10 glass-nav border-b border-agri-green/5 shrink-0 z-30">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden w-10 h-10 flex items-center justify-center bg-white border border-agri-green/5 rounded-xl text-agri-green shadow-sm"
              >
                <Menu size={20} />
              </button>
              <h2 className="hidden md:block text-lg font-bold text-agri-green tracking-tight">Tableau de bord</h2>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden sm:flex items-center relative">
                <Search size={18} className="absolute left-4 text-agri-green/30" />
                <input 
                  placeholder="Rechercher..."
                  className="pl-11 pr-4 py-2.5 bg-agri-cream border border-agri-green/10 rounded-full text-sm focus:outline-none focus:border-agri-gold focus:ring-1 focus:ring-agri-gold transition-all w-64"
                />
              </div>

              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 group"
                >
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-sm font-bold text-agri-green group-hover:text-agri-gold transition-colors">{me.fullName}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-agri-gold/70">{me.role}</span>
                  </div>
                  <div className="w-10 h-10 bg-agri-green text-white rounded-xl flex items-center justify-center font-black text-sm shadow-lg shadow-agri-green/20">
                    {me.fullName.slice(0, 1).toUpperCase()}
                  </div>
                  <ChevronDown size={16} className={`text-agri-green/30 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl border border-agri-green/5 p-2 z-50">
                    <div className="px-4 py-4 border-b border-agri-green/5 mb-2">
                      <div className="text-sm font-bold text-agri-green">{me.fullName}</div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-agri-gold mt-1">{me.role}</div>
                    </div>
                    <Link 
                      to="/dashboard/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-agri-earth/60 hover:bg-agri-cream hover:text-agri-green transition-all"
                    >
                      <User size={18} />
                      Mon Profil
                    </Link>
                    <button 
                      onClick={logout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all text-left"
                    >
                      <LogOut size={18} />
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-6 md:p-10 hero-gradient">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </DashboardUserProvider>
  );
}
