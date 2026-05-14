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
  AlertTriangle,
  Zap,
  ShieldAlert,
  Users,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Kpi {
  id: string;
  name: string;
  formula: string;
  description: string;
  impact: string;
  threshold?: string;
  thresholds: {
    low: string;
    mid: string;
    high: string;
  };
  icon: any;
}

const KPI_DEFINITIONS: Kpi[] = [
  {
    id: 'compliance_sla',
    name: 'Compliance SLA (Service Level Agreement)',
    formula: '(Items Resolved within Deadline / Total Items) * 100',
    description: 'Porcentaje de requerimientos resueltos dentro de la ventana de tiempo acordada. Es la métrica maestra de la calidad de servicio.',
    impact: 'Garantiza la operatividad del negocio y minimiza las fricciones entre departamentos técnicos y usuarios finales.',
    threshold: '100%',
    thresholds: {
      low: '> 95% (Elite)',
      mid: '85-95% (Riesgo de Incumplimiento)',
      high: '< 85% (Penalización Contractual)'
    },
    icon: ShieldCheck
  },
  {
    id: 'efficiency_score',
    name: 'Efficiency Score (Productividad Relativa)',
    formula: '(Throughput * Compliance) / MTTR',
    description: 'Un indicador compuesto que normaliza la producción física frente a la calidad y la velocidad. Permite comparar equipos de diferentes tamaños.',
    impact: 'Identifica los talentos de alto impacto y orienta la redistribución de carga de trabajo basada en mérito operativo.',
    threshold: '0-100',
    thresholds: {
      low: '> 85 pts (Alto Desempeño)',
      mid: '60-85 pts (En Desarrollo)',
      high: '< 60 pts (Necesita Intervención)'
    },
    icon: Zap
  },
  {
    id: 'governance_gap',
    name: 'Governance Gap Index',
    formula: '(Unmapped Risks / Total Risk Catalog) * 100',
    description: 'Cuantifica la brecha entre los activos/tareas identificados y el catálogo oficial de gobierno. Mide el "Shadow IT" o tareas fuera de control.',
    impact: 'Crucial para auditorías. Un gap alto indica que el equipo está trabajando en temas no alineados con la estrategia de riesgo.',
    threshold: '0%',
    thresholds: {
      low: '< 5% (Gobernanza Total)',
      mid: '5-15% (Derivación Operativa)',
      high: '> 15% (Descontrol de Activos)'
    },
    icon: Search
  },
  {
    id: 'mttr',
    name: 'MTTR (Mean Time To Resolve)',
    formula: 'Sum(Resolution Time) / Total Items Resolved',
    description: 'Promedio de tiempo transcurrido desde la asignación hasta el cierre definitivo del ítem. Es la unidad básica de velocidad operativa.',
    impact: 'Crucial para la resiliencia del negocio; un MTTR bajo reduce exponencialmente la ventana de exposición al riesgo y pérdida de ingresos.',
    threshold: 'T < 3d',
    thresholds: {
      low: '< 2 Días (Excelencia)',
      mid: '2-5 Días (Estándar)',
      high: '> 5 Días (Degradación de Servicio)'
    },
    icon: Clock
  },
  {
    id: 'backlog_balance',
    name: 'Backlog Burn-rate',
    formula: '(New Requests / Resolved Requests) Ratio',
    description: 'Mide la sostenibilidad del flujo de trabajo. Un ratio > 1 indica que el backlog está creciendo más rápido de lo que el equipo puede resolver.',
    impact: 'Métricas predictivas de colapso. Permite justificar incrementos de headcount o cambios en la prioridad de proyectos.',
    threshold: 'Ratio 1.0',
    thresholds: {
      low: '< 0.8 (Vaciado de Backlog)',
      mid: '0.8-1.2 (Equilibrio de Flujo)',
      high: '> 1.2 (Acumulación Insostenible)'
    },
    icon: Activity
  },
  {
    id: 'critical_exposure',
    name: 'Critical Exposure Time',
    formula: 'Σ(Current Time - Detection Time) for High Risks',
    description: 'Mide cuánto tiempo han estado activos los riesgos críticos en la matriz MAC sin ser mitigados.',
    impact: 'Es el KPI de mayor peso para la dirección de seguridad. Define el "Tiempo de Exposición" a incidentes graves.',
    threshold: '24h',
    thresholds: {
      low: '< 12h (Resiliencia Extrema)',
      mid: '12-48h (Ventana Vulnerable)',
      high: '> 48h (Falla de Cumplimiento)'
    },
    icon: ShieldAlert
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
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">{kpi.name}</h3>
                          {kpi.threshold && (
                            <div className="bg-brand-50 text-brand-600 px-2 py-0.5 rounded-lg border border-brand-100 flex items-center gap-1.5">
                              <Target size={10} />
                              <span className="text-[9px] font-black uppercase tracking-widest">Meta: {kpi.threshold}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[9px] font-mono bg-slate-200/50 px-2 py-0.5 rounded text-slate-500 border border-slate-200 w-fit">
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
