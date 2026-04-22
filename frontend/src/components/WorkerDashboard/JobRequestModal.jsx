import { useState, useEffect } from "react";
import {
  X, Loader2, Calendar, AlertTriangle, Clock,
  Image, CheckCircle, XCircle, Search, DollarSign
} from "lucide-react";
import api from "../../services/api";
import ImageLightbox from "./modals/ImageLightbox";
import EstimateModal from "./modals/EstimateModal";

const API_BASE = "http://localhost:5114";

const STATUS_LABELS = {
  pending:               { label: "Čeka odgovor",   color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  accepted:              { label: "Prihvaćen",      color: "bg-green-500/20 text-green-400 border-green-500/30"   },
  confirmed:             { label: "Potvrđen",       color: "bg-blue-500/20 text-blue-400 border-blue-500/30"      },
  declined_by_craftsman: { label: "Odbijen",        color: "bg-red-500/20 text-red-400 border-red-500/30"         },
  declined_by_user:      { label: "Korisnik odbio", color: "bg-red-500/20 text-red-400 border-red-500/30"         },
};

export default function JobRequestModal({ requestId, onClose, onActionDone }) {
  const [request, setRequest]               = useState(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [lightboxIndex, setLightboxIndex]   = useState(null);
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [actionLoading, setActionLoading]   = useState(false);
  const [actionDone, setActionDone]         = useState(null); // 'accepted' | 'declined' | 'survey_proposed'

  // Survey proposal form state
  const [showSurveyForm, setShowSurveyForm] = useState(false);
  const [surveyDate, setSurveyDate]         = useState("");
  const [surveyTime, setSurveyTime]         = useState("");
  const [surveyPrice, setSurveyPrice]       = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getJobRequest(requestId);
        if (!res.success) throw new Error("Zahtev nije pronađen.");
        setRequest(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [requestId]);

  // Zatvori na Escape (samo kad lightbox i estimate modal nisu otvoreni)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && !showEstimateModal && lightboxIndex === null) {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showEstimateModal, lightboxIndex, onClose]);

  const handleAccept = async (hours, mins) => {
    setActionLoading(true);
    try {
      await api.acceptJobRequest(requestId, hours, mins);
      setActionDone("accepted");
      setShowEstimateModal(false);
      onActionDone?.("accepted");
    } catch (err) {
      alert("Greška pri prihvatanju: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm("Da li ste sigurni da želite da odbijete ovaj zahtev?")) return;
    setActionLoading(true);
    try {
      await api.declineJobRequest(requestId, "craftsman");
      setActionDone("declined");
      onActionDone?.("declined");
    } catch (err) {
      alert("Greška pri odbijanju: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleProposeSurvey = async () => {
    if (!surveyDate || !surveyPrice || Number(surveyPrice) <= 0) {
      alert("Unesite datum i cenu izviđanja.");
      return;
    }
    setActionLoading(true);
    try {
      const scheduledTime = surveyTime ? surveyTime + ":00" : null;
      await api.proposeSurvey(requestId, surveyDate, scheduledTime, Number(surveyPrice));
      setActionDone("survey_proposed");
      onActionDone?.("survey_proposed");
    } catch (err) {
      alert("Greška pri slanju predloga: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const statusMeta = request
    ? (STATUS_LABELS[request.status] ?? {
        label: request.status,
        color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      })
    : null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal kontejner */}
        <div
          className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-white font-bold text-lg">Detalji zahteva</h2>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sadržaj */}
          <div className="p-6">
            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="text-center py-10">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* Ekran nakon akcije */}
            {actionDone && (
              <div className="text-center py-10">
                {actionDone === "accepted" && (
                  <>
                    <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-4" />
                    <h3 className="text-white font-bold text-xl mb-2">Zahtev prihvaćen!</h3>
                    <p className="text-gray-400 text-sm">
                      Korisnik će biti obavešten o vašoj proceni i ceni. Čekajte njegovu potvrdu.
                    </p>
                  </>
                )}
                {actionDone === "declined" && (
                  <>
                    <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
                    <h3 className="text-white font-bold text-xl mb-2">Zahtev odbijen</h3>
                    <p className="text-gray-400 text-sm">
                      Korisnik će biti obavešten da ste odbili zahtev.
                    </p>
                  </>
                )}
                {actionDone === "survey_proposed" && (
                  <>
                    <Search className="w-14 h-14 text-amber-400 mx-auto mb-4" />
                    <h3 className="text-white font-bold text-xl mb-2">Predlog izviđanja poslat!</h3>
                    <p className="text-gray-400 text-sm">
                      Korisnik će biti obavešten i mora da prihvati predlog i plati izviđanje.
                    </p>
                  </>
                )}
                <button
                  onClick={onClose}
                  className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition"
                >
                  Zatvori
                </button>
              </div>
            )}

            {/* Prikaz zahteva */}
            {request && !loading && !actionDone && (
              <div className="flex flex-col gap-4">

                {/* Naslov + status */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="text-white font-bold text-xl leading-tight">
                      {request.title}
                    </h3>
                    <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border ${statusMeta.color}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {new Date(request.scheduledDate).toLocaleDateString("sr-RS", {
                        weekday: "long", day: "2-digit", month: "long", year: "numeric",
                      })}
                    </span>
                    {request.urgent && (
                      <span className="flex items-center gap-1.5 text-red-400 font-medium">
                        <AlertTriangle className="w-4 h-4" /> Hitno
                      </span>
                    )}
                    <span className="text-gray-600 text-xs">
                      Zahtev #{request.requestId}
                    </span>
                  </div>
                </div>

                {/* Opis */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
                  <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
                    Opis posla
                  </h4>
                  <p className="text-white leading-relaxed whitespace-pre-wrap">
                    {request.description}
                  </p>
                </div>

                {/* Slike */}
                {request.imagePaths?.length > 0 && (
                  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
                    <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Priložene slike ({request.imagePaths.length})
                    </h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {request.imagePaths.map((path, i) => (
                        <button
                          key={i}
                          onClick={() => setLightboxIndex(i)}
                          className="aspect-square rounded-xl overflow-hidden border border-gray-600 hover:border-blue-500 transition group"
                        >
                          <img
                            src={`${API_BASE}/${path}`}
                            alt={`slika-${i + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Procena (ako postoji) */}
                {request.estimatedMinutes != null && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5">
                    <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Procena majstora
                    </h4>
                    <div className="flex gap-6">
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Vreme</p>
                        <p className="text-white font-bold text-xl">
                          {Math.floor(request.estimatedMinutes / 60)}h{" "}
                          {request.estimatedMinutes % 60}min
                        </p>
                      </div>
                      {request.estimatedPrice != null && (
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Procenjena cena</p>
                          <p className="text-white font-bold text-xl">
                            {Number(request.estimatedPrice).toLocaleString("sr-RS")} RSD
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Akcije — samo za pending */}
                {request.status === "pending" && !showSurveyForm && (
                  <div className="flex gap-2 pt-1 flex-wrap">
                    <button
                      onClick={handleDecline}
                      disabled={actionLoading}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 transition font-semibold disabled:opacity-50 text-sm"
                    >
                      <XCircle className="w-4 h-4" /> Odbij
                    </button>
                    <button
                      onClick={() => setShowSurveyForm(true)}
                      disabled={actionLoading}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 rounded-xl border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition font-semibold disabled:opacity-50 text-sm"
                    >
                      <Search className="w-4 h-4" /> Izviđanje
                    </button>
                    <button
                      onClick={() => setShowEstimateModal(true)}
                      disabled={actionLoading}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold transition disabled:opacity-50 text-sm"
                    >
                      <CheckCircle className="w-4 h-4" /> Prihvati
                    </button>
                  </div>
                )}

                {/* Forma za predlog izviđanja */}
                {request.status === "pending" && showSurveyForm && (
                  <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Search className="w-4 h-4 text-amber-400" />
                      <h4 className="text-amber-400 font-semibold text-sm">Predlog izviđanja terena</h4>
                    </div>
                    <p className="text-gray-400 text-xs">
                      Korisnik će biti obavešten i mora da plati izviđanje pre nego što se termin zakaže.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Datum izviđanja *</label>
                        <input
                          type="date"
                          value={surveyDate}
                          min={new Date().toISOString().split("T")[0]}
                          onChange={e => setSurveyDate(e.target.value)}
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Vreme (opciono)</label>
                        <input
                          type="time"
                          value={surveyTime}
                          onChange={e => setSurveyTime(e.target.value)}
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Cena izviđanja (RSD) *</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="number"
                          min="1"
                          placeholder="npr. 2000"
                          value={surveyPrice}
                          onChange={e => setSurveyPrice(e.target.value)}
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => { setShowSurveyForm(false); setSurveyDate(""); setSurveyTime(""); setSurveyPrice(""); }}
                        disabled={actionLoading}
                        className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-300 hover:text-white transition text-sm font-medium disabled:opacity-50"
                      >
                        Nazad
                      </button>
                      <button
                        onClick={handleProposeSurvey}
                        disabled={actionLoading || !surveyDate || !surveyPrice}
                        className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {actionLoading
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Šalje se...</>
                          : <><Search className="w-4 h-4" /> Pošalji predlog</>
                        }
                      </button>
                    </div>
                  </div>
                )}

                {/* Info za ostale statuse */}
                {request.status !== "pending" && (
                  <p className="text-center text-gray-500 text-sm py-2">
                    {request.status === "accepted" && "Prihvaćen — čeka potvrdu korisnika."}
                    {request.status === "confirmed" && "Korisnik je potvrdio zahtev — posao je zakazan."}
                    {request.status === "survey_proposed" && "Predlog izviđanja je poslat — čeka odgovor korisnika."}
                    {request.status === "survey_scheduled" && "Izviđanje je zakazano."}
                    {request.status === "declined_by_craftsman" && "Ovaj zahtev je odbijen."}
                    {request.status === "declined_by_user" && "Korisnik je odbio vašu ponudu."}
                  </p>
                )}

              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={request.imagePaths}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Modal za procenu */}
      {showEstimateModal && (
        <EstimateModal
          onConfirm={handleAccept}
          onCancel={() => setShowEstimateModal(false)}
          loading={actionLoading}
        />
      )}
    </>
  );
}