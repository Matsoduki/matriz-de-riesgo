import React from 'react';
import { Card, CardContent } from './ui';
import { Shield, ShieldAlert, CheckCircle2, Clock, Activity, Flame, Hourglass, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  metrics: {
    total: number;
    critical: number;
    resolved: number;
    pending: number;
    avgAging: number;
    complianceRate: number;
    onTimeRate: number;
    mttr: string;
  };
}

export const CyberMetricsCards: React.FC<Props> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-900 rounded-[2rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-20"><Shield size={48} /></div>
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Total Vulnerabilidades</span>
          </div>
          <p className="text-4xl font-black tracking-tight">{metrics.total}</p>
          <p className="text-[10px] mt-2 font-bold text-indigo-500 flex items-center gap-1">
             <Activity size={10} /> Inventario General 2026
          </p>
        </CardContent>
      </Card>

      <Card className={`border-0 shadow-lg bg-gradient-to-br from-rose-50 to-red-50 text-rose-900 rounded-[2rem] relative overflow-hidden ${metrics.critical > 0 ? 'ring-2 ring-rose-500/20' : ''}`}>
        <div className="absolute top-0 right-0 p-4 opacity-20"><ShieldAlert size={48} /></div>
        {metrics.critical > 0 && <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.4, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-rose-400/10 pointer-events-none" 
        />}
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">Riesgo Crítico</span>
          </div>
          <p className="text-4xl font-black tracking-tight">{metrics.critical}</p>
          <p className="text-[10px] mt-2 font-bold text-rose-500 flex items-center gap-1">
             <Flame size={10} /> Requiere Acción Inmediata
          </p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-900 rounded-[2rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-20"><CheckCircle2 size={48} /></div>
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">SLA Cumplimiento</span>
          </div>
          <p className="text-4xl font-black tracking-tight">{metrics.complianceRate}%</p>
          <p className="text-[10px] mt-2 font-bold text-emerald-600 flex items-center gap-1">
             <Zap size={10} /> Resoluciones vs Total
          </p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-white border border-slate-100 text-slate-900 rounded-[2rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-20 text-slate-200"><Hourglass size={48} /></div>
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aging Promedio</span>
          </div>
          <p className="text-4xl font-black tracking-tight">{metrics.avgAging} <span className="text-sm font-medium">días</span></p>
          <p className="text-[10px] mt-2 font-bold text-slate-400 flex items-center gap-1">
             <Clock size={10} /> Tiempo medio de exposición
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
