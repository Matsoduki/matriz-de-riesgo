import React from "react";
import { 
  ShieldAlert, Activity, Target, Clock, ShieldCheck, 
  Layout, AlertOctagon, Download, ChevronRight 
} from "lucide-react";
import { Modal, Button } from "./ui";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vendor: string | null;
  vendorData: any[];
  keys: any;
  isCriticalPriority: (p: any) => boolean;
  onRowClick: (row: any) => void;
  onExport: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  "Resuelto": "#10b981",
  "En Proceso": "#3b82f6",
  "Abierto": "#64748b",
  "Atrasado": "#f43f5e",
  "Pendiente": "#f59e0b"
};

export const CyberVendorDetailModal: React.FC<Props> = ({
  isOpen,
  onClose,
  vendor,
  vendorData,
  keys,
  isCriticalPriority,
  onRowClick,
  onExport
}) => {
  if (!vendor) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Business Report: ${vendor}`}
    >
      <div className="space-y-6">
        <div className="bg-[#0f172a] p-10 rounded-[2rem] text-white relative overflow-hidden border border-white/5">
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-50/10 rounded-full blur-[80px] translate-y-1/2" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">
                Hallazgo Analítico / Socio Estratégico
              </p>
            </div>
            <h3 className="text-4xl font-black tracking-tighter text-white mb-8">
              {vendor}
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Layout size={12} className="text-brand-400" /> Total Casos
                </p>
                <p className="text-3xl font-black text-white leading-none">
                  {vendorData.length}
                </p>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <AlertOctagon size={12} className="text-rose-400" /> Nivel Crítico
                </p>
                <p className="text-3xl font-black text-rose-500 leading-none">
                  {
                    vendorData.filter((r) =>
                      isCriticalPriority(r[keys?.priorityKey || ""]),
                    ).length
                  }
                </p>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Clock size={12} className="text-amber-400" /> En Atraso
                </p>
                <p className="text-3xl font-black text-amber-500 leading-none">
                  {
                    vendorData.filter(
                      (r) => Number(r["Dias de atraso"] || 0) > 0,
                    ).length
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-h-[450px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {vendorData.map((row, idx) => {
            const priority = String(row[keys?.priorityKey || ""]).trim();
            const status = String(row[keys?.statusKey || ""]).trim();
            const title = row[keys?.gapKey || "GAP"] || 
                          row[keys?.vulnKey || "Vulnerabilidades"] ||
                          row["PROYECTO O TAREA"] ||
                          "Nodo de Riesgo";

            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between group hover:border-brand-500/50 hover:shadow-md transition-all cursor-pointer"
                onClick={() => onRowClick(row)}
              >
                <div className="flex-1 pr-6">
                  <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight mb-2 line-clamp-1 group-hover:text-brand-600 transition-colors">
                    {title}
                  </p>
                  <div className="flex items-center gap-3">
                     <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] || '#94a3b8' }} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{status}</span>
                     </div>
                     <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                       <Target size={11} /> 
                       {String(row[keys?.projectKey || ""] || row["Proyecto"] || "General")}
                     </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                   <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${isCriticalPriority(priority) ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                      {priority}
                   </div>
                   {Number(row["Dias de atraso"] || 0) > 0 && (
                      <div className="flex items-center gap-1 text-rose-600">
                         <Clock size={10} />
                         <span className="text-[8px] font-black uppercase tracking-widest">+{row["Dias de atraso"]}d Atraso</span>
                      </div>
                   )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-4">
          <Button
            variant="outline"
            className="flex-1 h-14 rounded-2xl border-2 border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors"
            onClick={onClose}
          >
            Regresar
          </Button>
          <Button
            className="flex-1 h-14 rounded-2xl bg-[#0f172a] text-white text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-xl"
            onClick={onExport}
          >
            <Download size={18} className="mr-2" /> Exportar Reporte
          </Button>
        </div>
      </div>
    </Modal>
  );
};
