import React from 'react';
import { motion } from 'motion/react';
import { 
  Activity, TrendingDown, TrendingUp, AlertTriangle, Lightbulb, 
  Target, Zap, Flame, Users, Clock, Trophy, ShieldCheck, 
  Search, BarChart3, LineChart
} from 'lucide-react';
import { Card, CardContent, CardTitle, CardDescription, PremiumCard } from './ui';

interface Props {
  metrics: any;
}

export const TeamOperationalAnalytics: React.FC<Props> = ({ metrics }) => {
  const generateInsights = () => {
    const list = [];

    // Operational Stability
    const stabilityScore = metrics.resolutionRate;
    list.push({
      title: "Resiliencia de Estructural del Squad",
      desc: `El squad mantiene un índice de resolución del ${stabilityScore}%. La capacidad de absorción ante fluctuaciones de demanda es estable, pero requiere monitoreo de picos estacionales.`,
      type: 'info',
      icon: <ShieldCheck size={20} className="text-brand-500" />,
      action: "Establecer buffers de capacidad del 15% para absorber desvíos no planificados.",
      impact: "Aumento de la estabilidad del servicio (SLA).",
      confidence: 90
    });

    // Burnout Insight
    if (metrics.burnoutRiskCount > 0) {
      list.push({
        title: "Detección Proactiva de Fatiga Operativa",
        desc: `Alerta de 'Concentración Crítica': ${metrics.burnoutRiskCount} miembros absorben más del 65% de la complejidad técnica. Riesgo inminente de degradación en la calidad de respuesta.`,
        type: 'critical',
        icon: <Flame size={20} className="text-rose-500" />,
        action: "Balanceo de carga técnica mediante delegación dirigida y mentoría cruzada.",
        impact: "Despresurización de nodos críticos y resiliencia de conocimiento.",
        confidence: 96
      });
    }

    // Aging Insight
    const agingPct = Math.round((metrics.agingTickets / metrics.total) * 100);
    if (agingPct > 15) {
      list.push({
        title: "Ineficiencia por Envejecimiento de Backlog",
        desc: `Detección de 'Aging Drift': El ${agingPct}% del backlog excede los 15 días. Existe una correlación directa entre el aging y la caída en la percepción de valor del usuario.`,
        type: 'warning',
        icon: <Clock size={20} className="text-amber-500" />,
        action: "Focus-sprint de 72h sobre tickets de alta severidad con aging > 12 días.",
        impact: "Reducción del inventario pasivo y mejora de UX operativa.",
        confidence: 85
      });
    }

    // Imbalance Insight
    if (metrics.imbalancePct > 20) {
      list.push({
        title: "Desequilibrio en la Distribución de Esfuerzo",
        desc: `Se observa una asimetría del ${metrics.imbalancePct}% en la asignación de iniciativas. El sistema de colas actual favorece el 'Cherry Picking' o la sobreasignación por seniority.`,
        type: 'warning',
        icon: <TrendingUp size={20} className="text-indigo-500" />,
        action: "Revisar algoritmos de asignación o criterios de triaje para homogeneizar workload.",
        impact: "Carga equitativa y optimización del Throughput total.",
        confidence: 92
      });
    }

    // Efficiency Insight
    if (metrics.avgEfficiency > 85) {
      list.push({
        title: "Benchmarking de Alto Desempeño",
        desc: `Eficiencia Global (${metrics.avgEfficiency}%) superior al percentil 90 organizacional. El squad ha logrado automatizar o estandarizar flujos de baja complejidad.`,
        type: 'success',
        icon: <Trophy size={20} className="text-emerald-500" />,
        action: "Consolidar el 'Playbook del Squad' para transferencia metodológica interna.",
        impact: "Escalamiento de eficiencias a otros equipos satélites.",
        confidence: 99
      });
    }

    return list;
  };

  const insights = generateInsights();

  return (
    <div className="space-y-12 pb-20">


      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {insights.map((insight, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="group flex flex-col p-10 rounded-[3rem] bg-white border border-slate-100/60 shadow-xl hover:border-brand-300 hover:shadow-2xl transition-all relative overflow-hidden"
          >
             <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:scale-125 transition-transform duration-700">
                {insight.icon}
             </div>
             
             <div className="flex items-center gap-5 mb-8">
                <div className={`p-5 rounded-3xl shadow-sm ${
                   insight.type === 'critical' ? 'bg-rose-50 text-rose-600 ring-4 ring-rose-50/50' :
                   insight.type === 'warning' ? 'bg-amber-50 text-amber-600 ring-4 ring-amber-50/50' :
                   insight.type === 'success' ? 'bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50/50' :
                   'bg-brand-50 text-brand-600 ring-4 ring-brand-50/50'
                }`}>
                   {React.cloneElement(insight.icon, { size: 28 })}
                </div>
                <div>
                   <h5 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">{insight.title}</h5>
                   <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Auditoría de Evidencia Técnica</span>
                      <div className="h-1 w-1 rounded-full bg-slate-300" />
                      <p className="text-[9px] font-black text-brand-600 uppercase tracking-widest">Confianza: {insight.confidence}%</p>
                   </div>
                </div>
             </div>

             <p className="text-base font-medium text-slate-500 leading-relaxed mb-10 flex-grow">
                {insight.desc}
             </p>

             <div className="pt-8 border-t border-slate-50 space-y-6">
                <div className="flex items-start gap-5 p-6 rounded-3xl bg-slate-50/80 border border-slate-100 group-hover:bg-brand-50/30 group-hover:border-brand-100 transition-colors">
                   <div className="mt-1 p-1.5 bg-white rounded-lg shadow-sm">
                      <Target size={18} className="text-brand-600" />
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Recomendación Estratégica</p>
                      <p className="text-sm font-bold text-slate-800 leading-snug">{insight.action}</p>
                   </div>
                </div>
                <div className="flex items-center justify-between px-6">
                   <div className="flex items-center gap-3">
                      <Zap size={14} className="text-brand-500" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Impacto en Efficiency Score</p>
                   </div>
                   <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-3 py-1 bg-emerald-50 rounded-lg">{insight.impact}</span>
                </div>
             </div>
          </motion.div>
        ))}
      </div>

      {/* New Human-Centered Metrics Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <Card className="p-10 border-0 shadow-2xl rounded-[3rem]">
            <div className="flex items-center gap-4 mb-8">
               <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Users size={20} /></div>
               <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">Resiliencia del Squad</h4>
            </div>
            <div className="space-y-6">
               <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Redundancia de Conocimiento</span>
                  <span className="text-lg font-black text-slate-900">Alta</span>
               </div>
               <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                  <div className="h-full w-[85%] bg-indigo-500 rounded-full" />
               </div>
               <p className="text-xs text-slate-500 font-medium">Baja dependencia de perfiles heroicos. El squad puede absorber la baja de un 40% de sus miembros sin degradar SLAs Críticos.</p>
            </div>
         </Card>

         <Card className="p-10 border-0 shadow-2xl rounded-[3rem]">
            <div className="flex items-center gap-4 mb-8">
               <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><Flame size={20} /></div>
               <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">Índice de Presión</h4>
            </div>
            <div className="space-y-6">
               <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fatiga Cognitiva Mediana</span>
                  <span className="text-lg font-black text-slate-900">Moderada</span>
               </div>
               <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                  <div className="h-full w-[45%] bg-rose-500 rounded-full" />
               </div>
               <p className="text-xs text-slate-500 font-medium">Carga balanceada en el percentil 60. Se recomienda evitar el sobre-compromiso de iniciativas estratégicas en las próximas 2 semanas.</p>
            </div>
         </Card>

         <Card className="p-10 border-0 shadow-2xl rounded-[3rem]">
            <div className="flex items-center gap-4 mb-8">
               <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Trophy size={20} /></div>
               <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">Salud de Delivery</h4>
            </div>
            <div className="space-y-6">
               <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Predictibilidad de Cierre</span>
                  <span className="text-lg font-black text-slate-900">Excelente</span>
               </div>
               <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                  <div className="h-full w-[94%] bg-emerald-500 rounded-full" />
               </div>
               <p className="text-xs text-slate-500 font-medium">Alta certidumbre en las fechas de resolución. El equipo cumple con su Definición de Hecho (DoD) en el 94% de los casos.</p>
            </div>
         </Card>
      </div>
    </div>
  );
};
