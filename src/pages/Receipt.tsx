import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiUrl } from "../api";
import { FileText, ArrowLeft, Download, CheckCircle, MapPin, User, Calendar, Hash } from "lucide-react";

interface ReceiptData {
  receiptNumber: string;
  date: string;
  product: {
    title: string;
    quantity: number;
    unit: string;
  };
  amount: number;
  currency: string;
  buyer: {
    name: string;
    phone: string;
  };
  seller: {
    name: string;
    phone: string;
  };
  transactionId: string;
}

export default function Receipt() {
  const { auctionId } = useParams();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const res = await fetch(apiUrl(`/api/payments/receipt/${auctionId}`));
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setReceipt(data.receipt);
        }
      } catch (err) {
        setError("Impossible de charger le reçu.");
      } finally {
        setLoading(false);
      }
    };
    fetchReceipt();
  }, [auctionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-agri-cream">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-agri-green/20 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-agri-green/10 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-agri-cream p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText size={32} />
          </div>
          <h1 className="text-2xl font-bold text-agri-earth mb-2">Reçu non trouvé</h1>
          <p className="text-agri-earth/60 mb-8">{error === "PAYMENT_NOT_COMPLETED" ? "Le paiement de cette enchère n'a pas encore été finalisé." : "Ce reçu n'existe pas ou n'est plus disponible."}</p>
          <Link to="/" className="inline-flex items-center gap-2 text-agri-green font-bold hover:underline">
            <ArrowLeft size={18} /> Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-agri-cream py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-agri-earth/60 hover:text-agri-earth transition-colors">
            <ArrowLeft size={20} /> <span className="font-medium">Retour</span>
          </Link>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-agri-green/5">
          {/* Header */}
          <div className="bg-agri-green p-10 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} />
              </div>
              <h1 className="text-3xl font-black uppercase tracking-widest mb-2">Reçu de Paiement</h1>
              <p className="text-white/80 font-medium">FarmLogistics - Marketplace Agricole</p>
            </div>
          </div>

          {/* Body */}
          <div className="p-10">
            <div className="flex flex-col md:flex-row justify-between gap-8 mb-12 pb-12 border-b border-agri-earth/10">
              <div>
                <p className="text-xs font-bold text-agri-earth/40 uppercase tracking-tighter mb-1">Numéro de Reçu</p>
                <p className="text-xl font-mono font-bold text-agri-earth">{receipt.receiptNumber}</p>
              </div>
              <div className="md:text-right">
                <p className="text-xs font-bold text-agri-earth/40 uppercase tracking-tighter mb-1">Date du Paiement</p>
                <p className="text-lg font-bold text-agri-earth">{new Date(receipt.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-12 mb-12">
              <div className="space-y-6">
                <h3 className="flex items-center gap-2 text-agri-green font-black uppercase tracking-widest text-sm">
                  <User size={16} /> Acheteur
                </h3>
                <div>
                  <p className="text-xl font-bold text-agri-earth">{receipt.buyer.name}</p>
                  <p className="text-agri-earth/60 font-medium">{receipt.buyer.phone}</p>
                </div>
              </div>
              <div className="space-y-6">
                <h3 className="flex items-center gap-2 text-agri-green font-black uppercase tracking-widest text-sm">
                  <User size={16} /> Vendeur
                </h3>
                <div>
                  <p className="text-xl font-bold text-agri-earth">{receipt.seller.name}</p>
                  <p className="text-agri-earth/60 font-medium">{receipt.seller.phone}</p>
                </div>
              </div>
            </div>

            <div className="bg-agri-cream/50 rounded-3xl p-8 mb-12 border border-agri-green/5">
              <h3 className="text-agri-green font-black uppercase tracking-widest text-sm mb-6">Détails de la Production</h3>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-2xl font-black text-agri-earth mb-1">{receipt.product.title}</p>
                  <p className="text-agri-earth/60 font-bold uppercase tracking-widest text-xs">Quantité: {receipt.product.quantity} {receipt.product.unit}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-agri-earth/40 uppercase tracking-tighter mb-1">Montant Total</p>
                  <p className="text-4xl font-black text-agri-green">{receipt.amount} <span className="text-xl">{receipt.currency}</span></p>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-8 border-t border-dashed border-agri-earth/20">
              <div className="flex items-center gap-3 text-agri-earth/60">
                <Hash size={16} />
                <p className="text-xs font-medium">Transaction ID: <span className="font-mono">{receipt.transactionId}</span></p>
              </div>
              <p className="text-[10px] text-agri-earth/40 text-center uppercase tracking-widest leading-relaxed">
                Ce document constitue une preuve officielle de paiement certifiée par la plateforme FarmLogistics.<br/>
                La transaction est enregistrée de manière immuable dans notre registre numérique.
              </p>
            </div>
          </div>
          
          {/* Footer Decoration */}
          <div className="h-4 bg-agri-green flex">
             {[...Array(20)].map((_, i) => (
               <div key={i} className="flex-1 border-r border-white/10"></div>
             ))}
          </div>
        </div>
        
        <p className="mt-8 text-center text-agri-earth/30 text-xs font-medium">
          &copy; 2026 FarmLogistics. Tous droits réservés. Transparence & Traçabilité.
        </p>
      </div>
    </div>
  );
}
