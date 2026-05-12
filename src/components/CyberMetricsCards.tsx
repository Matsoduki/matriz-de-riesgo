import React from 'react';
import { Card, CardContent } from './ui';
import { Shield, ShieldAlert, CheckCircle2, Clock, Activity, Flame, Hourglass, Zap, Target } from 'lucide-react';
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
    governanceCount: number;
    weeklyCreated?: number;
    weeklyResolved?: number;
    chiVal?: number;
  };
  onCardClick?: (type: 'chi' | 'critical' | 'sla' | 'aging') => void;
}

export const CyberMetricsCards: React.FC<Props> = ({ metrics, onCardClick }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card 
        onClick={() => onCardClick?.('chi')}
        className="border-0 shadow-2xl bg-slate-900 border border-slate-800 rounded-[2.5rem] relative overflow-hidden group cursor-pointer hover:ring-2 hover:ring-brand-500/50 transition-all duration-300 active:scale-95"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000 opacity-50" />
        <CardContent className="p-8 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tactical Resiliency</span>
              <span className="text-xs font-bold text-brand-400">Cyber Health Index</span>
            </div>
            <div className="p-3 bg-brand-500/10 text-brand-400 rounded-2xl group-hover:rotate-12 transition-transform shadow-lg shadow-brand-500/20">
              <Activity size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-5xl font-black tracking-tighter text-white">{metrics.chiVal || 0}%</p>
            <div className={`flex items-center text-[9px] font-black px-2 py-0.5 rounded-lg ${(metrics.chiVal || 0) > 85 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {(metrics.chiVal || 0) > 85 ? 'HEALTHY' : 'AT RISK'}
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Postura MAC</span>
              <span className="text-xs font-black text-brand-500">Score Consolidado</span>
            </div>
            <Shield size={16} className="text-white/10" />
          </div>
        </CardContent>
      </Card>

      <Card 
        onClick={() => onCardClick?.('critical')}
        className="border-0 shadow-2xl bg-white border border-slate-100 rounded-[2.5rem] relative overflow-hidden group cursor-pointer hover:ring-2 hover:ring-rose-500/50 transition-all duration-300 active:scale-95"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000 opacity-50" />
        <CardContent className="p-8 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Risk Exposure</span>
              <span className="text-xs font-bold text-rose-600">Alta Criticidad</span>
            </div>
            <div className={`p-3 rounded-2xl group-hover:rotate-12 transition-transform ${metrics.critical > 0 ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-rose-50 text-rose-500'}`}>
              <ShieldAlert size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-5xl font-black tracking-tighter text-slate-900">{metrics.critical}</p>
            <div className={`flex items-center text-[9px] font-black px-2 py-0.5 rounded-lg ${metrics.critical > 5 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
              {metrics.critical > 5 ? 'CRÍTICO' : 'BAJO'}
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Creación Semana</span>
              <span className="text-xs font-black text-rose-500">+{metrics.weeklyCreated || 0} Gaps</span>
            </div>
            <Flame size={16} className={metrics.critical > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-200'} />
          </div>
        </CardContent>
      </Card>

      <Card 
        onClick={() => onCardClick?.('sla')}
        className="border-0 shadow-2xl bg-white border border-slate-100 rounded-[2.5rem] relative overflow-hidden group cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition-all duration-300 active:scale-95"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000 opacity-50" />
        <CardContent className="p-8 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Service Integrity</span>
              <span className="text-xs font-bold text-emerald-600">SLA Performance</span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:rotate-12 transition-transform">
              <Zap size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-5xl font-black tracking-tighter text-slate-900">{metrics.complianceRate}%</p>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Resuelto</span>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Cierres Semana</span>
              <span className="text-xs font-black text-emerald-500">-{metrics.weeklyResolved || 0} Gaps</span>
            </div>
            <CheckCircle2 size={16} className="text-emerald-300" />
          </div>
        </CardContent>
      </Card>

      <Card 
        onClick={() => onCardClick?.('aging')}
        className="border-0 shadow-2xl bg-white border border-slate-100 rounded-[2.5rem] relative overflow-hidden group cursor-pointer hover:ring-2 hover:ring-slate-500/50 transition-all duration-300 active:scale-95"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000 opacity-50" />
        <CardContent className="p-8 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Response Speed</span>
              <span className="text-xs font-bold text-slate-600">Aging Promedio</span>
            </div>
            <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl group-hover:rotate-12 transition-transform">
              <Hourglass size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-5xl font-black tracking-tighter text-slate-900">{metrics.avgAging}</p>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Días</span>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">MTTC Corporativo</span>
              <span className="text-xs font-black text-slate-600">Higiene Temporal</span>
            </div>
            <Clock size={16} className="text-slate-200" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
