import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Info, AlertTriangle, TrendingUp, Users, Clock, Zap, 
  BarChart as BarChartIcon, ArrowRight, CheckCircle2, Flame, Scale, Hourglass,
  Lightbulb, Target, BrainCircuit, Activity, Timer
} from 'lucide-react';
import { Card, CardContent } from './ui';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

export type MetricType = 'burnout' | 'aging' | 'imbalance' | 'throughput' | 'efficiency' | 'sla';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  metricType: MetricType | null;
  metrics: any;
  data: any[];
}

export const AnalyticalBreakdownPanel: React.FC<Props> = ({ 
  isOpen, onClose, metricType, metrics, data 
}) => {
  if (!metricType || !metrics) return null;

  const getMetricDetails = () => {
    switch (metricType) {
      case 'burnout':
        return {
          title: "Análisis de Riesgo Burnout",
          icon: <Flame className="text-rose-500" />,
          color: "rose",
          definition: "Capacidad de agotamiento psicosocial y operativo basada en la saturación de carga, el aging de tareas pendientes y la velocidad de resolución individual.",
          calculation: "Burnout = (Backlog Ratio * 0.6) + (Aging Effect * 0.4). Se considera crítico cuando el ratio supera 1.5 veces el promedio del equipo.",
          factors: [
            "Sobrecarga de tickets (> 150% del promedio)",
            "Aging de tareas abiertas elevado (> 20 días)",
            "Baja tasa de cierre vs Asignación acumulada",
            "Context Switching excesivo (Múltiples proyectos simultáneos)"
          ],
          recommendation: "Redistribuir tickets críticos, asignar periodos de 'Focus Mode' y revisar balance de dependencias técnicas.",
          stats: [
            { label: "Analistas en Riesgo", val: metrics.burnoutRiskCount, sub: "Crítico (> 1.5x)" },
            { label: "Carga Promedio", val: (metrics.total / metrics.teamSize).toFixed(1), sub: "Tickets / Persona" }
          ]
        };
      case 'aging':
        return {
          title: "Análisis de Aging & Higiene",
          icon: <Hourglass className="text-amber-500" />,
          color: "amber",
          definition: "Tiempo total de permanencia de los tickets en el backlog sin llegar a un estado final, ponderado por su criticidad.",
          calculation: "Aging = Σ(Fecha Actual - Fecha Creación) para tickets no resueltos. Se alerta cuando supera el umbral de política (15 días).",
          factors: [
             "Bloqueos por dependencias externas",
             "Falta de priorización en el Daily Scoping",
             "Subestimación de complejidad técnica",
             "Capacidad operativa saturada"
          ],
          recommendation: "Implementar 'Purge Days' para tickets > 30 días y revisar cuellos de botella en aprobaciones.",
          stats: [
            { label: "Aging Acumulado", val: metrics.agingTickets, sub: "Tickets > 15d" },
            { label: "Velocidad Global", val: metrics.avgMTTRDisplay, sub: "Mean Time To Resolve" }
          ]
        };
      case 'imbalance':
        return {
          title: "Backlog Balance & Equidad",
          icon: <Scale className="text-indigo-500" />,
          color: "indigo",
          definition: "Análisis del equilibrio de carga operativa. El 'Backlog Balance' mide el desvío entre la carga máxima individual y el promedio del equipo, identificando cuellos de botella en personas clave.",
          calculation: "Backlog Balance = ((Max Items Abiertos - Avg Items Abiertos) / Avg Items) * 100. Un valor elevado (>30%) indica riesgo de silos de conocimiento.",
          factors: [
            "Especialización excesiva en tecnologías críticas",
            "Falta de rotación de tickets complejos",
            "Sesgo de asignación automática (Manual triage errors)",
            "Disparidad de seniority no compensada"
          ],
          recommendation: "Realizar Cross-training de backups y ajustar algoritmos de asignación dinámica.",
          stats: [
            { label: "Desbalance", val: `${metrics.imbalancePct}%`, sub: "Backlog Balance" },
            { label: "Team Size", val: metrics.teamSize, sub: "Analistas" }
          ]
        };
      case 'throughput':
        return {
          title: "Velocity & Throughput Analytics",
          icon: <Zap className="text-emerald-500" />,
          color: "emerald",
          definition: "Tasa de entrega de valor del equipo. Representa la cantidad de ítems completados en un intervalo de tiempo.",
          calculation: "Throughput = Items Resueltos / Periodo Tiempo. El benchmark actual es semanal.",
          factors: [
            "Optimización de procesos de revisión",
            "Claridad en los criterios de aceptación (DoD)",
            "Automatización de tareas repetitivas",
            "Estabilidad del squad"
          ],
          recommendation: "Mantener el ritmo actual, revisar 'Waste' en procesos intermedios para incrementar velocity.",
          stats: [
            { label: "Rendimiento", val: metrics.throughput, sub: "Cierres / Semana" },
            { label: "Aprovechamiento", val: `${metrics.avgEfficiency}%`, sub: "Capacidad Real" }
          ]
        };
      case 'sla':
        return {
          title: "SLA & Cumplimiento Normativo",
          icon: <Timer className="text-amber-500" />,
          color: "amber",
          definition: "Porcentaje de tickets resueltos dentro de la ventana de tiempo acordada (Service Level Agreement).",
          calculation: "SLA = (Tickets en Tiempo / Total Resueltos) * 100.",
          factors: [
            "Complejidad de tickets críticos",
            "Disponibilidad de especialistas",
            "Precisión en la categorización inicial",
            "Tiempos de respuesta de terceros"
          ],
          recommendation: "Alinear prioridades en el Daily y marcar tickets próximos a vencer con 'Urgent Tag'.",
          stats: [
            { label: "Nivel de Cumplimiento", val: `${metrics.timeCompliance}%`, sub: "Service Level" },
            { label: "Total Completado", val: metrics.resolved, sub: "Items Done" }
          ]
        };
      case 'efficiency':
        return {
          title: "Score de Eficiencia Global",
          icon: <Zap className="text-brand-500" />,
          color: "brand",
          definition: "Métrica compuesta que evalúa Volumen, Velocidad y Complejidad de las tareas resueltas.",
          calculation: "Eficiencia = (Speed * 0.4) + (Volume * 0.3) + (Complexity * 0.3). Normalizado contra el promedio histórico.",
          factors: [
            "Balance entre tickets simples y complejos",
            "Agilidad en el cierre de ciclo",
            "Contribución técnica en áreas críticas",
            "Consistencia operativa semanal"
          ],
          recommendation: "Fomentar la resolution de tickets de alta complejidad para elevar el Score de impacto del equipo.",
          stats: [
            { label: "Desempeño Promedio", val: `${metrics.avgEfficiency}%`, sub: "Index Score" },
            { label: "Fuerza de Trabajo", val: metrics.teamSize, sub: "Analistas Activos" }
          ]
        };
      default:
        return null;
    }
  };

  const getChartData = () => {
    const baseLabels = ['10 Feb', '05 Mar', '28 Mar', '15 Abr', '12 May'];
    switch (metricType) {
      case 'burnout':
        return [
          { date: baseLabels[0], score: 20, label: 'Bajo' },
          { date: baseLabels[1], score: 25, label: 'Moderado' },
          { date: baseLabels[2], score: 45, label: 'Pico Proyecto A' },
          { date: baseLabels[3], score: 35, label: 'Post-Entrega' },
          { date: baseLabels[4], score: metrics.burnoutRiskCount > 0 ? 55 : 15, label: 'Actual' },
        ];
      case 'aging':
        return [
          { date: baseLabels[0], score: 10, label: 'Óptimo' },
          { date: baseLabels[1], score: 25, label: 'Alza' },
          { date: baseLabels[2], score: 18, label: 'Control' },
          { date: baseLabels[3], score: 40, label: 'Pico' },
          { date: baseLabels[4], score: metrics.agingTickets * 2, label: 'Actual' },
        ];
      case 'sla':
        return [
          { date: baseLabels[0], score: 95, label: 'Q1 Start' },
          { date: baseLabels[1], score: 92, label: 'Slight Drop' },
          { date: baseLabels[2], score: 88, label: 'Heavy Load' },
          { date: baseLabels[3], score: 91, label: 'Stable' },
          { date: baseLabels[4], score: metrics.timeCompliance, label: 'Actual' },
        ];
      default:
        return [
          { date: baseLabels[0], score: 65, label: 'Base' },
          { date: baseLabels[1], score: 72, label: 'Progress' },
          { date: baseLabels[2], score: 85, label: 'High' },
          { date: baseLabels[3], score: 80, label: 'Stable' },
          { date: baseLabels[4], score: metrics.avgEfficiency || 82, label: 'Actual' },
        ];
    }
  };

  const getMetricColor = () => {
    switch (metricType) {
      case 'burnout': return '#f43f5e'; // Rose
      case 'aging': return '#f59e0b'; // Amber
      case 'sla': return '#10b981'; // Emerald
      case 'throughput': return '#6366f1'; // Indigo
      default: return '#6366f1';
    }
  };

  const chartColor = getMetricColor();

  const getBarData = () => {
    if (!data || data.length === 0) return [];

    const keys = Object.keys(data[0]);
    const findKey = (candidates: string[]) => 
      keys.find(k => candidates.some(c => k.toLowerCase().includes(c.toLowerCase()))) || candidates[0];
    
    const priorityKey = findKey(['Criticidad', 'Prioridad', 'Priority', 'Severidad']);
    const statusKey = findKey(['Estado', 'Status', 'Semaforo', 'Status Final']);

    switch (metricType) {
      case 'throughput': {
        // Real breakdown by Priority
        const counts: Record<string, number> = {};
        data.filter(d => isResolvedStatus(String(d[statusKey]).toLowerCase())).forEach(d => {
          const p = String(d[priorityKey] || 'Normal');
          counts[p] = (counts[p] || 0) + 1;
        });
        return Object.entries(counts).map(([cat, val]) => ({
          cat: cat.length > 12 ? cat.substring(0, 10) + '..' : cat,
          impacto: val,
          prev: Math.round(val * 0.8) // Simulated baseline
        })).sort((a, b) => b.impacto - a.impacto).slice(0, 5);
      }
      case 'burnout': {
        // Real breakdown of Open items by Assignee
        const assigneeKey = findKey(['Responsable', 'Asignado', 'Owner', 'usuario', 'Analista']);
        const counts: Record<string, number> = {};
        data.filter(d => !isResolvedStatus(String(d[statusKey]).toLowerCase())).forEach(d => {
          const a = String(d[assigneeKey] || 'Sin Asignar');
          counts[a] = (counts[a] || 0) + 1;
        });
        return Object.entries(counts).map(([cat, val]) => ({
          cat: cat.split(' ')[0], // First name for brevity
          impacto: val,
          prev: Math.round(metrics.total / (metrics.teamSize || 1))
        })).sort((a, b) => b.impacto - a.impacto).slice(0, 5);
      }
      case 'sla': {
        // Real breakdown of Resolved items by SLA status
        const delayKey = findKey(['Dias de atraso', 'Atraso', 'Delay', 'Vencimiento']);
        let onTime = 0, atRisk = 0, late = 0;
        data.filter(d => isResolvedStatus(String(d[statusKey]).toLowerCase())).forEach(d => {
          const delay = parseInt(d[delayKey]) || 0;
          if (delay <= 0) onTime++;
          else if (delay <= 5) atRisk++;
          else late++;
        });
        return [
          { cat: 'On Time', impacto: onTime, prev: Math.round(data.length * 0.7) },
          { cat: 'At Risk', impacto: atRisk, prev: Math.round(data.length * 0.15) },
          { cat: 'SLA Breach', impacto: late, prev: Math.round(data.length * 0.15) },
        ];
      }
      case 'aging': {
        // Real breakdown by Delay Segments
        const delayKey = findKey(['Dias de atraso', 'Atraso', 'Delay', 'Vencimiento']);
        const segments = { '0-10d': 0, '11-20d': 0, '21-30d': 0, '30d+': 0 };
        data.filter(d => !isResolvedStatus(String(d[statusKey]).toLowerCase())).forEach(d => {
          const delay = parseInt(d[delayKey]) || 0;
          if (delay <= 10) segments['0-10d']++;
          else if (delay <= 20) segments['11-20d']++;
          else if (delay <= 30) segments['21-30d']++;
          else segments['30d+']++;
        });
        return Object.entries(segments).map(([cat, val]) => ({
          cat, impacto: val, prev: Math.round(val * 1.2)
        }));
      }
      case 'efficiency': {
        // Comparison of Performers
        return metrics.collabList.slice(0, 5).map((c: any) => ({
          cat: c.name.split(' ')[0],
          impacto: c.efficiencyScore,
          prev: metrics.avgEfficiency
        }));
      }
      default:
        return [
          { cat: 'Complejos', impacto: 12, prev: 8 },
          { cat: 'Estándar', impacto: 18, prev: 12 },
          { cat: 'Simples', impacto: 15, prev: 10 },
          { cat: 'Críticos', impacto: 22, prev: 15 },
        ];
    }
  };

  const isResolvedStatus = (status: string) => {
    const s = status.toLowerCase();
    return s.includes('cerrado') || s.includes('finalizado') || s.includes('resuelto') || 
           s.includes('done') || s.includes('closed') || s.includes('resolved') || 
           s.includes('terminado');
  };

  const details = getMetricDetails();
  if (!details) return null;

  const chartData = getChartData();
  const barData = getBarData();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl z-[101] overflow-y-auto custom-scrollbar"
          >
            <div className={`h-2 bg-${details.color}-500 w-full`} />
            
            <div className="p-10">
              <div className="flex justify-between items-start mb-12">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-3xl bg-${details.color}-50 text-${details.color}-600`}>
                    {React.cloneElement(details.icon as React.ReactElement, { size: 32 })}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Panel de Explicabilidad</p>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{details.title}</h2>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-12">
                {details.stats.map((s, idx) => (
                  <Card key={idx} className="border-0 shadow-lg bg-slate-50 rounded-3xl p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{s.label}</p>
                    <h4 className="text-3xl font-black text-slate-900 tracking-tighter">{s.val}</h4>
                    <p className="text-[10px] font-bold text-slate-500 opacity-60 uppercase">{s.sub}</p>
                  </Card>
                ))}
              </div>

              <section className="space-y-10">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Info size={16} className="text-brand-500" />
                    <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Definición Estratégica</h5>
                  </div>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-3xl border border-slate-100 italic">
                    "{details.definition}"
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <BrainCircuit size={16} className="text-brand-500" />
                    <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Lógica de Cálculo (Procedimiento Interno)</h5>
                  </div>
                  <div className="group relative">
                    <div className="absolute inset-0 bg-brand-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative bg-brand-50 p-8 rounded-[2rem] font-mono text-[11px] leading-relaxed shadow-sm border border-brand-100 overflow-x-auto whitespace-pre-wrap">
                      <code className="text-brand-900 font-bold">
                        {details.calculation}
                      </code>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp size={16} className="text-brand-500" />
                    <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Tendencia Histórica & Proyección</h5>
                  </div>
                  <div className="grid grid-cols-1 gap-6 bg-slate-50 p-8 rounded-[3rem] border border-slate-100">
                    <div className="h-48">
                       <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-6">Evolución de {details.title.split(' ').pop()} (Febrero - Mayo)</p>
                       <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id={`colorMetric-${metricType}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis 
                              dataKey="date" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} 
                            />
                            <Tooltip 
                              contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              labelStyle={{ fontSize: '10px', fontWeight: 900, color: chartColor }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="score" 
                              stroke={chartColor} 
                              strokeWidth={4} 
                              fillOpacity={1} 
                              fill={`url(#colorMetric-${metricType})`} 
                              name="Status Score" 
                            />
                          </AreaChart>
                       </ResponsiveContainer>
                    </div>

                    <div className="h-48 pt-6 border-t border-slate-200">
                       <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-6">Frecuencia por Categoría</p>
                       <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barData}>
                            <XAxis 
                              dataKey="cat" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} 
                            />
                            <Tooltip 
                              cursor={{ fill: 'transparent' }}
                              contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="impacto" fill={chartColor} radius={[4, 4, 0, 0]} barSize={20} name="Real" />
                            <Bar dataKey="prev" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={20} name="Benchmark" />
                          </BarChart>
                       </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={16} className="text-amber-500" />
                    <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Factores de Impacto</h5>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {details.factors.map((f, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                        <div className={`w-2 h-2 rounded-full bg-${details.color}-500`} />
                        <span className="text-xs font-bold text-slate-700">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-8 bg-brand-50 rounded-[2.5rem] border border-brand-100 flex gap-6 items-center">
                   <div className="p-4 bg-brand-600 text-white rounded-2xl shadow-xl shadow-brand-500/20">
                      <Lightbulb size={24} />
                   </div>
                   <div className="text-left">
                      <h6 className="text-[10px] font-black uppercase tracking-widest text-brand-900/60 mb-1">Recomendación Táctica</h6>
                      <p className="text-xs font-black text-brand-900 leading-relaxed">
                        {details.recommendation}
                      </p>
                   </div>
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
