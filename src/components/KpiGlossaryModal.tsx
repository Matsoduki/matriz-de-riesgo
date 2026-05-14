import React from 'react';
import { 
  X, 
  Target, 
  Clock, 
  Activity, 
  TrendingUp, 
  ShieldCheck, 
  Info,
  Terminal,
  Calculator,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Kpi {
  id: string;
  name: string;
  formula: string;
  description: string;
  impact: string;
  thresholds: {
    low: string;
    mid: string;
    high: string;
  };
  icon: any;
}

const KPI_DEFINITIONS: Kpi[] = [
  {
    id: 'backlog_balance',
    name: 'Backlog Balance',
    formula: '(Unresolved Tasks / Weekly Throughput) * 100',
    description: 'Mide la presión operativa instantánea sobre el equipo. Indica cuántas semanas de trabajo se acumulan frente a la velocidad de salida actual.',
    impact: 'Detecta cuellos de botella antes de que afecten el SLA de incidentes críticos.',
    thresholds: {
      low: '0-100% (Optimizado)',
      mid: '101-250% (Saturación en Proceso)',
      high: '>250% (Riesgo de Burnout/Bloqueo)'
    },
    icon: Activity
  },
  {
    id: 'mttr',
    name: 'MTTR (Mean Time To Resolve)',
    formula: 'Sum(Resolution Time) / Total Items Resolved',
    description: 'Promedio de tiempo transcurrido desde la asignación hasta el cierre definitivo del ítem.',
    impact: 'Crucial para la resiliencia del negocio; un MTTR bajo reduce la ventana de exposición al riesgo.',
    thresholds: {
      low: '< 2 Días (Excelencia)',
      mid: '2-5 Días (Estándar)',
      high: '> 5 Días (Degradación de Servicio)'
    },
    icon: Clock
  },
  {
    id: 'lead_time',
    name: 'Lead Time / Cycle Time',
    formula: 'Total Duration / Completed Units',
    description: 'Tiempo total que un requerimiento permanece en la línea de producción desde su creación hasta su entrega.',
    impact: 'Mide la agilidad del equipo y la eficiencia de los procesos de escalamiento.',
    thresholds: {
      low: 'Alta Agilidad',
      mid: 'Proceso Estable',
      high: 'Ineficiencia Administrativa'
    },
    icon: TrendingUp
  }
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function KpiGlossaryModal({ isOpen, onClose }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-[101] overflow-y-auto"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-brand-500 text-white rounded-2xl shadow-lg shadow-brand-500/20">
                    <Terminal size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Diccionario de Métricas</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metodología MAC v4.0</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {KPI_DEFINITIONS.map((kpi) => (
                  <div key={kpi.id} className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 group hover:border-brand-200 transition-all">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 bg-white shadow-sm text-slate-400 group-hover:text-brand-500 rounded-xl transition-colors">
                        <kpi.icon size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">{kpi.name}</h3>
                        <div className="flex items-center gap-2 text-[9px] font-mono bg-slate-200/50 px-2 py-0.5 rounded text-slate-500 border border-slate-200">
                          <Calculator size={10} />
                          {kpi.formula}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <p className="text-xs font-medium text-slate-500 leading-relaxed">
                        {kpi.description}
                      </p>
                      
                      <div className="p-4 bg-white/60 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle size={12} className="text-brand-500" />
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Umbrales de Control</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-emerald-600 font-bold">Óptimo</span>
                            <span className="font-mono text-slate-600">{kpi.thresholds.low}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-amber-600 font-bold">Atención</span>
                            <span className="font-mono text-slate-600">{kpi.thresholds.mid}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-rose-600 font-bold">Crítico</span>
                            <span className="font-mono text-slate-600">{kpi.thresholds.high}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <div className="h-10 w-1 bg-brand-500 rounded-full" />
                        <div>
                          <p className="text-[9px] font-black uppercase text-brand-600 tracking-widest mb-1">Impacto Ejecutivo</p>
                          <p className="text-[11px] font-bold text-slate-700 leading-tight">
                            {kpi.impact}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>


            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
