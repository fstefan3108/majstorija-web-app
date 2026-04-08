import { Briefcase, Loader2 } from "lucide-react";
import ServicesTable from "../../ServicesTable";

export default function ScheduledTab({ services, onDelete, isLoading }) {
  const scheduled = services.filter((s) => {
    const st = (s.status || "").toLowerCase();
    return st === "zakazano" || st === "u toku" || st === "pauzirano";
  });

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Učitavanje poslova...</p>
      </div>
    );
  }

  if (scheduled.length === 0) {
    return (
      <div className="text-center py-16">
        <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">Nema zakazanih poslova</p>
        <p className="text-gray-600 text-sm mt-1">
          Zakazani poslovi će se ovde pojaviti nakon što korisnik potvrdi zahtev
        </p>
      </div>
    );
  }

  return (
    <ServicesTable
      services={scheduled}
      onDelete={onDelete}
      isWorker={true}
    />
  );
}