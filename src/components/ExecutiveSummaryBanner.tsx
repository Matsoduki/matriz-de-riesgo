import React from 'react';
import { motion } from 'motion/react';
import { BrainCircuit, TrendingUp, ShieldCheck, Target, Zap } from 'lucide-react';

interface Props {
  metrics: any;
}

export const ExecutiveSummaryBanner: React.FC<Props> = ({ metrics }) => {
  if (!metrics) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-10 p-10 rounded-[3rem] bg-gradient-to-br from-slate-900 via-slate-800 to-brand-900 text-white shadow-3xl relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform group-hover:rotate-0">
        <BrainCircuit size={200} />
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-1 h-brand-500 rounded-full" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-400">Executive Performance Briefing</p>
          </div>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tighter leading-none">
            Estatus Operativo: <span className="text-brand-400">Optimization Ready</span>
          </h2>
          <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-2xl">
            El equipo mantiene una eficiencia de <span className="text-white font-black">{metrics.avgEfficiency}%</span> con un throughput de 
            <span className="text-white font-black"> {metrics.throughput} ítems/semana</span>. Se detecta una oportunidad de mejora en el lead time promedio de <span className="text-white font-black">{metrics.avgMTTRDisplay}</span> para alcanzar el benchmark de excelencia.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">Infrastructure: Stable</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl">
              <Target size={16} className="text-brand-400" />
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">SLA Goals: {metrics.timeCompliance}%</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 grid grid-cols-2 gap-6 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-sm">
          <div className="space-y-1">
             <div className="flex items-center gap-2 text-brand-400 mb-2">
                <Zap size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">Velocity</span>
             </div>
             <p className="text-3xl font-black tracking-tighter">{metrics.avgEfficiency} PT</p>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Score</p>
          </div>
          <div className="space-y-1">
             <div className="flex items-center gap-2 text-indigo-400 mb-2">
                <TrendingUp size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">Throughput</span>
             </div>
             <p className="text-3xl font-black tracking-tighter">{metrics.throughput}</p>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Closed / Week</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
