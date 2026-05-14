import React, { useState } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip, Legend } from 'recharts';
import { Card, CardHeader, CardContent } from './ui';
import { BrainCircuit, X, Info, Layers, Zap, Target, Calculator, TrendingUp, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const METRIC_DEFINITIONS: Record<string, any> = {
  "SLA": {
    formula: "Σ (T_sla / T_resolution) / N",
    description: "Cumplimiento de objetivos de nivel de servicio. Es la métrica maestra para asegurar que los compromisos con el negocio se están honrando.",
    logic: "Validación binaria (Cumple/No Cumple) normalizada por la criticidad del ticket.",
    impact: "Confianza estructural y reputación del área de servicio.",
    gradient: "from-tisal-gold to-brand-500",
    icon: Zap
  },
  "SLA Speed": {
    formula: "Σ (T_sla / T_resolution) / N",
    description: "Mide la velocidad promediada contra el objetivo de SLA. Valores superiores a 80 indican una respuesta 'Flash' que supera las expectativas del negocio.",
    logic: "Compara el tiempo de resolución real contra el límite de SLA definido por prioridad de cada ticket.",
    impact: "Impacto directo en la satisfacción del cliente y retención de niveles de servicio (SLO).",
    gradient: "from-blue-500 to-indigo-600",
    icon: Zap
  },
  "Resolution": {
    formula: "(Resolved / (Resolved + Open)) * 100",
    description: "Capacidad neta de resolución del periodo. Refleja la estabilidad del backlog; si el indicador baja, el fondo de tickets está acumulándose peligrosamente.",
    logic: "Balance de flujo (entrada vs salida) de requerimientos en el intervalo de tiempo seleccionado.",
    impact: "Salud y sostenibilidad del ciclo de vida de los requerimientos técnicos.",
    gradient: "from-emerald-500 to-teal-600",
    icon: CheckCircle2
  },
  "Efficiency": {
    formula: "WeightedAvg(MTTR, SLA, Score)",
    description: "Índice de aprovechamiento operacional. No es solo rapidez, sino la combinación de precisión técnica, bajo retrabajo y cumplimiento normativo.",
    logic: "Normalización de MTTR contra benchmarks históricos internos agregando el peso de cumplimiento de SLA.",
    impact: "Optimización de costos operativos por unidad de trabajo resuelta.",
    gradient: "from-brand-600 to-indigo-800",
    icon: Target
  },
  "Complexity": {
    formula: "Log(PriorityWeight * Volume)",
    description: "Dificultad técnica del volumen de trabajo realizado. Un valor alto indica que el equipo está resolviendo retos transformacionales y no solo tareas repetitivas.",
    logic: "Asignación de coeficientes matemáticos según la severidad, impacto y categoría técnica de cada ticket.",
    impact: "Crecimiento del capital intelectual y expertise técnico del squad.",
    gradient: "from-amber-500 to-orange-600",
    icon: Layers
  },
  "Agility": {
    formula: "100 - (Variance / Mean * 100)",
    description: "Previsibilidad del flujo de entrega. Un equipo ágil es un equipo constante. Poca varianza en tiempos de ciclo se traduce en alta predictibilidad para el negocio.",
    logic: "Cálculo de la desviación estándar de los tiempos de entrega (Cycle Time) normalizados a una escala centesimal.",
    impact: "Confianza en las fechas de compromiso entregadas a los stakeholders.",
    gradient: "from-fuchsia-500 to-pink-600",
    icon: TrendingUp
  },
  "Load Balance": {
    formula: "100 - (CV * 100)",
    description: "Distribución equitativa del esfuerzo. Evita la dependencia de héroes (cuellos de botella) y previene proactivamente el agotamiento laboral (burnout).",
    logic: "Análisis del Coeficiente de Variación (CV) de la distribución de tickets resueltos por integrante del equipo.",
    impact: "Sostenibilidad humana y resiliencia estructural del equipo a largo plazo.",
    gradient: "from-cyan-500 to-blue-600",
    icon: BrainCircuit
  }
};

import { CheckCircle } from 'lucide-react';

interface Props {
  data: any[];
  dataKeyA?: string;
  dataKeyB?: string;
  dataKeyC?: string;
  nameA?: string;
  nameB?: string;
  nameC?: string;
  title?: string;
  headerActions?: React.ReactNode;
}

export const PerformanceRadar: React.FC<Props> = ({ 
  data, 
  dataKeyA = "A", 
  dataKeyB, 
  dataKeyC,
  nameA = "Selección A", 
  nameB = "Selección B",
  nameC = "Selección C",
  title = "Balance de Capacidades",
  headerActions
}) => {
  const [activeMetric, setActiveMetric] = useState<string | null>(null);

  const CustomTick = (props: any) => {
    const { x, y, payload } = props;
    const isClickable = !!METRIC_DEFINITIONS[payload.value];
    
    return (
      <g transform={`translate(${x},${y})`} onClick={() => isClickable && setActiveMetric(payload.value)} className={isClickable ? "cursor-pointer group" : ""}>
        <text
          x={0}
          y={0}
          dy={4}
          textAnchor="middle"
          fill={isClickable ? "#475569" : "#94a3b8"}
          className={`text-[9px] font-black uppercase tracking-widest transition-all ${isClickable ? "group-hover:fill-brand-600 group-hover:scale-110" : ""}`}
          style={{ cursor: isClickable ? 'pointer' : 'default', fontWeight: 900 }}
        >
          {payload.value} {isClickable && "ⓘ"}
        </text>
        {isClickable && (
          <circle cx={0} cy={-12} r={2} fill="#6366f1" className="opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </g>
    );
  };

  return (
    <Card className="border-0 shadow-2xl rounded-[3rem] bg-white border border-slate-100 overflow-hidden h-full relative">
      <AnimatePresence>
        {activeMetric && METRIC_DEFINITIONS[activeMetric] && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md"
            onClick={(e) => {
               if (e.target === e.currentTarget) setActiveMetric(null);
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden relative"
            >
              <button 
                onClick={() => setActiveMetric(null)}
                className="absolute top-6 right-6 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors z-10"
              >
                <X size={16} className="text-slate-400" />
              </button>

              <div className={`h-32 bg-gradient-to-br ${METRIC_DEFINITIONS[activeMetric].gradient} p-10 flex items-end relative`}>
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   {React.createElement(METRIC_DEFINITIONS[activeMetric].icon || Info, { size: 120 })}
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                    {React.createElement(METRIC_DEFINITIONS[activeMetric].icon || Info, { size: 24, className: "text-white" })}
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">{activeMetric}</h3>
                </div>
              </div>

              <div className="p-10 space-y-8">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Calculator size={14} className="text-brand-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Fórmula de Cálculo</span>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <code className="text-brand-600 font-mono text-sm font-bold">{METRIC_DEFINITIONS[activeMetric].formula}</code>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Info size={14} className="text-brand-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Definición Analítica</span>
                  </div>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">
                    {METRIC_DEFINITIONS[activeMetric].description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="block text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest">Lógica Interna</span>
                      <p className="text-[10px] text-slate-500 font-bold leading-snug">{METRIC_DEFINITIONS[activeMetric].logic}</p>
                   </div>
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="block text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest">Valor de Negocio</span>
                      <p className="text-[10px] text-slate-500 font-bold leading-snug">{METRIC_DEFINITIONS[activeMetric].impact}</p>
                   </div>
                </div>

                <button 
                  onClick={() => setActiveMetric(null)}
                  className={`w-full py-4 rounded-2xl bg-gradient-to-r ${METRIC_DEFINITIONS[activeMetric].gradient} text-white font-black text-[11px] uppercase tracking-widest shadow-lg hover:shadow-xl transition-all active:scale-95`}
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CardHeader className="p-10 border-b border-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BrainCircuit size={18} className="text-brand-500" />
            <div className="flex items-center gap-2 mb-2">
               <div className="h-1 w-4 bg-tisal-gold rounded-full" />
               <span className="text-[10px] font-black uppercase tracking-widest text-tisal-gold">ADN Operativo</span>
            </div>
          </div>
          <h4 className="text-xl font-black text-slate-900 tracking-tighter">{title}</h4>
        </div>
        {headerActions}
      </CardHeader>
      <CardContent className="h-[450px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="82%" data={data}>
            <PolarGrid stroke="#f1f5f9" strokeWidth={2} />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={<CustomTick />} 
            />
            <Radar
              name={nameA}
              dataKey={dataKeyA}
              stroke="#ffcd00"
              strokeWidth={4}
              fill="#ffcd00"
              fillOpacity={0.5}
            />
            {dataKeyB && (
              <Radar
                name={nameB}
                dataKey={dataKeyB}
                stroke="#005bb7"
                strokeWidth={4}
                fill="#005bb7"
                fillOpacity={0.3}
              />
            )}
            {dataKeyC && (
              <Radar
                name={nameC}
                dataKey={dataKeyC}
                stroke="#94a3b8"
                strokeWidth={2}
                fill="#94a3b8"
                fillOpacity={0.1}
                strokeDasharray="5 5"
              />
            )}
            <Tooltip 
              contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', background: '#0f172a', color: '#fff' }}
              itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}
            />
            <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', paddingTop: '10px' }} />
          </RadarChart>
        </ResponsiveContainer>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[85%]">
           <div className="py-3 px-6 bg-slate-900/5 backdrop-blur-sm rounded-2xl border border-slate-200/50 italic text-[9px] text-slate-500 text-center font-bold tracking-tight">
             Mapeo multidimensional basado en normalización de SLAs y volúmenes tácticos.
           </div>
        </div>
      </CardContent>
    </Card>
  );
};
