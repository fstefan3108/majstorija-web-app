import { useState, useEffect, useCallback } from "react";
import { MessageCircle, InboxIcon, Briefcase, History, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";

import Header from "../components/Header";
import Footer from "../components/Footer";
import WorkerProfile from "../components/WorkerProfile";
import NewRequestsAlert from "../components/WorkerDashboard/NewRequestsAlert";
import JobRequestModal from "../components/WorkerDashboard/JobRequestModal";
import RequestsTab from "../components/WorkerDashboard/tabs/RequestsTab";
import ScheduledTab from "../components/WorkerDashboard/tabs/ScheduledTab";
import HistoryTab from "../components/WorkerDashboard/tabs/HistoryTab";
import AvailabilityTab from "../components/WorkerDashboard/tabs/AvailabilityTab";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

// ─────────────────────────────────────────────────────────────
// Konstante
// ─────────────────────────────────────────────────────────────

const TABS = [
  { id: "requests",     label: "Zahtevi za posao",  icon: InboxIcon    },
  { id: "scheduled",   label: "Zakazani poslovi",   icon: Briefcase    },
  { id: "history",     label: "Evidencija poslova", icon: History      },
  { id: "availability",label: "Raspored",            icon: CalendarDays },
];

// ─────────────────────────────────────────────────────────────
// WorkerDashboard
// ─────────────────────────────────────────────────────────────

export default function WorkerDashboard() {
  const { user } = useAuth();

  const [workerData, setWorkerData]                 = useState(null);
  const [originalWorkerData, setOriginalWorkerData] = useState(null);
  const [services, setServices]                     = useState([]);
  const [jobRequests, setJobRequests]               = useState([]);
  const [isLoading, setIsLoading]                   = useState(true);
  const [error, setError]                           = useState("");

  const [activeTab, setActiveTab]                   = useState("requests");
  const [selectedRequestId, setSelectedRequestId]   = useState(null);
  const [showAlert, setShowAlert]                   = useState(false);

  const pendingCount = jobRequests.filter((r) => r.status === "pending").length;

  // ── Fetch ───────────────────────────────────────────────────

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchJobs();
      fetchJobRequests();
    }
  }, [user]);

  // Prikaži alert kad ima pending zahteva
  useEffect(() => {
    if (pendingCount > 0) setShowAlert(true);
  }, [pendingCount]);

  const fetchProfile = async () => {
    try {
      const response = await api.getCraftsmanProfile(user.id);
      const craftsman = response.data || response;
      setOriginalWorkerData(craftsman);
      setWorkerData({
        craftsmanId:   craftsman.craftsmanId,
        firstName:     craftsman.firstName,
        lastName:      craftsman.lastName,
        email:         craftsman.email,
        phone:         craftsman.phone,
        profession:    craftsman.profession,
        experience:    craftsman.experience,
        workingHours:  craftsman.workingHours,
        hourlyRate:    craftsman.hourlyRate,
        location:      craftsman.location || "",
        averageRating: craftsman.averageRating || 0,
        ratingCount:   craftsman.ratingCount || 0,
      });
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Greška pri učitavanju profila");
    }
  };

  const fetchJobRequests = async () => {
    try {
      const res = await api.getJobRequestsByCraftsman(user.id);
      const list = res.data || res;
      const active = Array.isArray(list)
        ? list.filter((r) => r.status === "pending" || r.status === "accepted")
        : [];
      setJobRequests(active);
    } catch {
      // Tiho ignoriši
    }
  };

  const fetchJobs = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await api.getJobOrdersByCraftsman(user.id);
      const jobs = response.data || response;
      setServices(Array.isArray(jobs) ? jobs : []);
    } catch (err) {
      console.error("Error fetching jobs:", err);
      setError("Greška pri učitavanju poslova");
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Handlers ────────────────────────────────────────────────

  const handleProfileUpdate = async (updatedData) => {
    try {
      const craftsmanUpdate = {
        ...originalWorkerData,
        firstName:    updatedData.firstName,
        lastName:     updatedData.lastName,
        phone:        updatedData.phone,
        location:     updatedData.location,
        profession:   updatedData.profession,
        experience:   parseInt(updatedData.experience),
        hourlyRate:   parseFloat(updatedData.hourlyRate),
        workingHours: updatedData.workingHours,
      };
      const response = await api.updateCraftsman(user.id, craftsmanUpdate);
      if (response.success) {
        setOriginalWorkerData(craftsmanUpdate);
        setWorkerData(updatedData);
        alert("Profil uspešno ažuriran!");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Greška pri ažuriranju profila: " + err.message);
      throw err;
    }
  };

  const handleDelete = async (jobId) => {
    if (!confirm("Da li ste sigurni da želite da obrišete ovaj posao?")) return;
    try {
      await api.deleteJobOrder(jobId);
      setServices((prev) => prev.filter((job) => job.jobId !== jobId));
      alert("Posao uspešno obrisan!");
    } catch (err) {
      console.error("Error deleting job:", err);
      alert("Greška pri brisanju posla: " + err.message);
    }
  };

  // Nakon akcije u modalu, refreshuj listu zahteva
  const handleModalActionDone = useCallback(() => {
    fetchJobRequests();
    setTimeout(() => setSelectedRequestId(null), 1800);
  }, []);

  // ── Loading state ───────────────────────────────────────────

  if (!workerData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Učitavanje...</p>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <Header />

      <main className="flex-1 p-6 lg:p-10">
        <div className="max-w-6xl mx-auto">

          {/* Top bar */}
          <div className="mb-6 flex justify-between items-center">
            <div className="text-white">
              <h1 className="text-2xl font-bold">Dobrodošli, {workerData.firstName}!</h1>
              <p className="text-gray-300">Email: {workerData.email}</p>
            </div>
            <Link to="/workers/chat">
              <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold">
                <MessageCircle className="w-5 h-5" />
                Moje Poruke
              </button>
            </Link>
          </div>

          {/* Profil */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 mb-8">
            <WorkerProfile data={workerData} onUpdate={handleProfileUpdate} />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 bg-red-500/20 border border-red-500 rounded-2xl p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Alert za nove zahteve */}
          {showAlert && pendingCount > 0 && (
            <NewRequestsAlert
              count={pendingCount}
              onView={() => { setActiveTab("requests"); setShowAlert(false); }}
              onDismiss={() => setShowAlert(false)}
            />
          )}

          {/* Tabovi */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 overflow-hidden">

            {/* Tab navigacija */}
            <div className="flex border-b border-gray-700 overflow-x-auto scrollbar-none">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const badge = tab.id === "requests" && jobRequests.length > 0
                  ? jobRequests.length
                  : null;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 sm:px-6 py-4 text-sm font-semibold transition whitespace-nowrap border-b-2 -mb-px flex-shrink-0
                      ${isActive
                        ? "border-blue-500 text-blue-400 bg-blue-500/5"
                        : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-700/30"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {badge && (
                      <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/30">
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab sadržaj */}
            <div className="p-6 lg:p-8">
              {activeTab === "requests" && (
                <RequestsTab
                  requests={jobRequests}
                  onRequestClick={(id) => setSelectedRequestId(id)}
                />
              )}
              {activeTab === "scheduled" && (
                <ScheduledTab
                  services={services}
                  onDelete={handleDelete}
                  isLoading={isLoading}
                  craftsmanId={workerData?.craftsmanId}
                />
              )}
              {activeTab === "history" && (
                <HistoryTab
                  services={services}
                  isLoading={isLoading}
                />
              )}
              {activeTab === "availability" && workerData && (
                <AvailabilityTab craftsmanId={workerData.craftsmanId} />
              )}
            </div>
          </div>

        </div>
      </main>

      <Footer />

      {/* Modal za zahtev */}
      {selectedRequestId !== null && (
        <JobRequestModal
          requestId={selectedRequestId}
          onClose={() => setSelectedRequestId(null)}
          onActionDone={handleModalActionDone}
        />
      )}
    </div>
  );
}


