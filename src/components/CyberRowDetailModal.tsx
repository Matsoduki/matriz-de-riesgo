import React from "react";
import { 
  ShieldAlert, Activity, Target, Clock, ShieldCheck, 
  Users, Layout, ExternalLink 
} from "lucide-react";
import { Modal, Button } from "./ui";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  row: any;
  metrics: any;
  isCriticalPriority: (p: any) => boolean;
  displayDate: (d: any) => string;
}

const STATUS_COLORS: Record<string, string> = {
  "Resuelto": "#10b981",
  "En Proceso": "#3b82f6",
  "Abierto": "#64748b",
  "Atrasado": "#f43f5e",
  "Pendiente": "#f59e0b"
};

export const CyberRowDetailModal: React.FC<Props> = ({
  isOpen,
  onClose,
  row,
  metrics,
  isCriticalPriority,
  displayDate
}) => {
  if (!row) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        row
          ? `Reporte Detallado: ${metrics?.idKey && row[metrics.idKey] ? row[metrics.idKey] : "Snapshot"}`
          : "Detalle de Ejecución"
      }
    >
      <div className="space-y-6">
        <div className="bg-[#0f172a] p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden border border-white/5">
          <div className="absolute top-0 right-0 p-10 opacity-5">
            <ShieldAlert size={180} />
          </div>
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-2 bg-brand-500/10 rounded-xl">
               <Activity size={16} className="text-brand-400" />
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">
              Security Control Hub / Análisis de Registro
            </p>
          </div>
          
          <h3 className="text-3xl font-black mb-8 tracking-tighter leading-[1.1] relative z-10 text-white max-w-2xl">
            {row["GAPS"] ||
              row["Vulnerabilidades"] ||
              row["Proyecto o Tarea"] ||
              row["PROYECTO O TAREA"] ||
              "Registro de Control"}
          </h3>

          <div className="flex flex-wrap gap-3 relative z-10">
            <div className="flex flex-col gap-1 px-5 py-2.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
               <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Nivel Crítico</span>
               <span className={`text-[11px] font-black uppercase tracking-widest ${isCriticalPriority(row["CRITICIDAD"] || row[metrics.priorityKey || ""]) ? 'text-rose-400' : 'text-slate-300'}`}>
                  {row["CRITICIDAD"] || row[metrics.priorityKey || ""] || "BASE"}
               </span>
            </div>
            <div className="flex flex-col gap-1 px-5 py-2.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
               <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Estado</span>
               <span className="text-[11px] font-black uppercase tracking-widest text-brand-400 font-mono">
                  {row["SEMAFORO"] || row[metrics.statusKey || ""] || "ACTIVO"}
               </span>
            </div>
            <div className="flex flex-col gap-1 px-5 py-2.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
               <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Time Gap</span>
               <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
                  {row["Dias de Atraso"] || row["Dias de atraso"] || "0"} Días Atraso
               </span>
            </div>
            {row["Nro."] && (
              <div className="flex flex-col gap-1 px-5 py-2.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
                 <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Folio</span>
                 <span className="text-[11px] font-black text-slate-400">#{row["Nro."]}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { 
              label: "Gobierno Seg.", 
              icon: Users, 
              val: row["Responsable Seguridad"] || "S/A",
              sub: row["Backup"] ? `Backup: ${row["Backup"]}` : null 
            },
            { 
              label: "Solicitante", 
              icon: Target, 
              val: row["Area Solicitante"] || row["Ámbito"] || "General",
              sub: row["Persona Solicitante"] || null
            },
            { 
              label: "Cronología", 
              icon: Clock, 
              val: displayDate(row["FECHA INICIO (DD-MM-YYYY)"] || row["MES Inicio"]) || "S/D",
              sub: row["Fecha de compromiso"] ? `Compromiso: ${displayDate(row["Fecha de compromiso"])}` : null
            },
            { 
              label: "Estado Final", 
              icon: ShieldCheck, 
              val: displayDate(row["Fecha de Cierre"]) || "Proceso",
              sub: row["Dias Abierto"] ? `${row["Dias Abierto"]} días activo` : null
            }
          ].map((item, i) => (
            <div key={i} className="bg-slate-50 border border-slate-100 p-6 rounded-[1.5rem] shadow-sm group hover:bg-white hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <item.icon size={14} className="text-slate-600 group-hover:text-brand-500 transition-colors" />
                  <span className="text-[12px] font-black text-slate-600 uppercase tracking-widest">{item.label}</span>
                </div>
                <p className="text-sm font-black text-slate-900 break-words tracking-tight uppercase mb-1">
                  {item.val}
                </p>
              </div>
              {item.sub && (
                <p className="text-xs font-bold text-slate-700 mt-2 italic leading-tight">
                  {item.sub}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
           <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-brand-50 rounded-xl text-brand-600">
                 <Layout size={18} />
              </div>
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">Inteligencia Operacional</h4>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="space-y-8">
                <div>
                  <p className="text-[12px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">Contexto de Actividad</p>
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <span className="text-[11px] font-black text-slate-600 uppercase block mb-1">Categoría / Ámbito</span>
                       <p className="text-sm font-bold text-slate-800">
                         {row["CATEGORÍA"]} - {row["AMBITO"]}
                       </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <span className="text-[11px] font-black text-slate-600 uppercase block mb-1">Proyecto / Tarea</span>
                       <p className="text-sm font-bold text-slate-800">
                         {row["Proyecto o Tarea"] || row["PROYECTO O TAREA"]}
                       </p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                      <span className="text-[11px] font-black text-indigo-600 uppercase block mb-1">Horas Totales</span>
                      <p className="text-xl font-black text-indigo-700">{row["Horas Totales"] || "0"}<span className="text-xs ml-1 font-bold italic">hrs</span></p>
                   </div>
                   <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                      <span className="text-[11px] font-black text-emerald-600 uppercase block mb-1">Periodicidad</span>
                      <p className="text-sm font-black text-emerald-700 uppercase tracking-tighter">{row["PERIODICIDAD"] || "ÚNICA"}</p>
                   </div>
                </div>
             </div>
             
             <div className="space-y-6">
                <div>
                  <p className="text-[12px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">Narrativa Operativa</p>
                  <div className="bg-slate-900 rounded-2xl p-6 space-y-6">
                     <div>
                        <span className="text-[11px] font-black text-brand-400 uppercase block mb-2">Situación Actual</span>
                        <p className="text-sm font-medium text-slate-300 leading-relaxed italic">
                           "{row["Sitación Actual"] || "Sin registro de estado situacional"}"
                        </p>
                     </div>
                     <div>
                        <span className="text-[11px] font-black text-brand-400 uppercase block mb-2">Acciones Realizadas</span>
                        <p className="text-sm font-medium text-slate-300 leading-relaxed">
                           {row["Acciones"] || "No se han documentado acciones específicas."}
                        </p>
                     </div>
                     {row["Plan de Mitigación"] && row["Plan de Mitigación"] !== "No Aplica" && (
                       <div className="pt-4 border-t border-white/5">
                          <span className="text-[11px] font-black text-rose-400 uppercase block mb-2">Plan de Mitigación</span>
                          <p className="text-sm font-medium text-slate-400 leading-relaxed">
                             {row["Plan de Mitigación"]}
                          </p>
                       </div>
                     )}
                  </div>
                </div>
             </div>
           </div>
        </div>

        <div className="flex items-center gap-4">
          <Button 
              onClick={onClose}
              className="flex-1 h-14 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all"
          >
              Regresar al Dash
          </Button>
          {row["ARCHIVOS ADJUNTOS\n(URL ONE DRIVE)"] && row["ARCHIVOS ADJUNTOS\n(URL ONE DRIVE)"] !== "-" && (
             <Button 
                className="h-14 px-8 bg-brand-50 text-brand-600 border-2 border-brand-100 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2"
                onClick={() => window.open(row["ARCHIVOS ADJUNTOS\n(URL ONE DRIVE)"], '_blank')}
             >
                <ExternalLink size={14} /> Evidencias
             </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
