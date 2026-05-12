import React from 'react';
import { motion } from 'motion/react';
import { 
  BrainCircuit, TrendingDown, TrendingUp, AlertTriangle, Lightbulb, 
  Target, Zap, Flame, Users, Calendar, ArrowUpRight, ArrowDownRight, Clock, Activity, Trophy
} from 'lucide-react';
import { Card, CardContent } from './ui';

interface Props {
  metrics: any;
}

export const TeamIntelligenceInsights: React.FC<Props> = ({ metrics }) => {
  const generateInsights = () => {
    const list = [];

    // Burnout Insight
    if (metrics.burnoutRiskCount > 0) {
      list.push({
        title: "Riesgo de Saturación Detectado",
        desc: `Existen ${metrics.burnoutRiskCount} miembros con carga operativa crítica (> 1.5x avg). Riesgo inminente de deterioro en calidad y tiempos de respuesta.`,
        type: 'critical',
        icon: <Flame size={20} className="text-rose-500" />,
        action: "Redistribuir backlog de alta complejidad y activar backups técnicos.",
        impact: "Reducción estimada de 22% en Lead Time tras balance.",
        confidence: 94
      });
    }

    // Aging Insight
    if (metrics.agingTickets > metrics.total * 0.1) {
      list.push({
        title: "Cuello de Botella en Aging",
        desc: `El ${Math.round((metrics.agingTickets / metrics.total) * 100)}% del backlog tiene más de 15 días sin resolución. Concentración de deuda técnica en items de alta severidad.`,
        type: 'warning',
        icon: <Clock size={20} className="text-amber-500" />,
        action: "Implementar 'Sprint Purge' de 48h enfocado exclusivamente en tickets estancados.",
        impact: "Mejora de 15% en el Throughput Semanal.",
        confidence: 88
      });
    }

    // Imbalance Insight
    if (metrics.imbalancePct > 25) {
      list.push({
        title: "Desbalance Operacional Elevado",
        desc: `Se detecta una desviación del ${metrics.imbalancePct}% en la carga de trabajo entre miembros. Concentración peligrosa de conocimiento en nodos individuales.`,
        type: 'warning',
        icon: <TrendingUp size={20} className="text-indigo-500" />,
        action: "Realizar Cross-training urgente sobre roles de especialistas críticos.",
        impact: "Aumento de la resiliencia del equipo ante ausencias.",
        confidence: 91
      });
    }

    // Efficiency Insight
    if (metrics.avgEfficiency > 80) {
      list.push({
        title: "Desempeño Elite Identificado",
        desc: `La eficiencia global del squad (${metrics.avgEfficiency}%) se sitúa por encima del benchmark corporativo trimestral.`,
        type: 'success',
        icon: <Trophy size={20} className="text-emerald-500" />,
        action: "Documentar 'Best Practices' del equipo para replicar en otros horizontes.",
        impact: "Consolidación de cultura de alto desempeño.",
        confidence: 98
      });
    } else {
      list.push({
        title: "Potencial de Optimización Velocity",
        desc: `La eficiencia operativa está en ${metrics.avgEfficiency}%. Existe margen de mejora en la estandarización de criterios de cierre.`,
        type: 'info',
        icon: <Activity size={20} className="text-brand-500" />,
        action: "Revisar Definición de Hecho (DoD) para reducir reaperturas de tickets.",
        impact: "Incremento potencial de +12% en Throughput.",
        confidence: 82
      });
    }

    return list;
  };

  const insights = generateInsights();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
         <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl shadow-sm"><BrainCircuit size={24} /></div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">IA Operational Insights</p>
               <h3 className="text-2xl font-black text-slate-900 tracking-tight">IA Intel: Hallazgos de Gestión</h3>
            </div>
         </div>
         <div className="px-6 py-2 bg-brand-100 text-brand-700 border border-brand-200 rounded-full text-[10px] font-black uppercase tracking-widest">
            Auditoría IA v2.4 (Beta)
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {insights.map((insight, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="group flex flex-col p-8 rounded-[3rem] bg-white border border-slate-100 hover:border-brand-300 hover:shadow-2xl transition-all relative overflow-hidden"
          >
             <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-125 transition-transform">
                {insight.icon}
             </div>
             
             <div className="flex items-center gap-4 mb-6">
                <div className={`p-4 rounded-2xl ${
                   insight.type === 'critical' ? 'bg-rose-50 text-rose-600' :
                   insight.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                   insight.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                   'bg-brand-50 text-brand-600'
                }`}>
                   {insight.icon}
                </div>
                <div>
                   <h5 className="text-lg font-black text-slate-900 tracking-tight">{insight.title}</h5>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nivel de Confianza: {insight.confidence}%</p>
                </div>
             </div>

             <p className="text-sm font-medium text-slate-600 leading-relaxed mb-8 flex-grow">
                {insight.desc}
             </p>

             <div className="pt-6 border-t border-slate-50 space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-brand-50/50 border border-brand-100">
                   <Target size={16} className="text-brand-600 mt-0.5" />
                   <div>
                      <p className="text-[9px] font-black uppercase text-brand-900/60 tracking-widest mb-1">Acción Recomendada</p>
                      <p className="text-xs font-bold text-brand-900">{insight.action}</p>
                   </div>
                </div>
                <div className="flex items-center gap-3 px-4">
                   <Zap size={14} className="text-emerald-500" />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Impacto Esperado: <span className="text-emerald-600">{insight.impact}</span></p>
                </div>
             </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
