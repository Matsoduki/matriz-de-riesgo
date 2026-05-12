import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from './ui';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  Target
} from 'lucide-react';
import { motion } from 'motion/react';
import { getISOFromExcelDate, getISOWeek, getWeekLabel, isResolvedStatus } from '../lib/excelParser';

interface Props {
  data: any[];
  dateKey: string;
  statusKey: string;
}

const getMonthLabel = (isoMonth: string): string => {
  if (isoMonth === "S/F" || !isoMonth.includes('-')) return isoMonth;
  const [year, month] = isoMonth.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return new Intl.DateTimeFormat('es-AR', { month: 'short', year: '2-digit' }).format(date);
};

export const CyberThroughputView: React.FC<Props> = ({ data, dateKey, statusKey }) => {
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('weekly');

  const stats = useMemo(() => {
    if (!data.length) return null;

    // Friday-based Weekly Cutoff logic (Week starts Saturday, ends Friday)
    const getFridayCutoffStart = () => {
      const today = new Date();
      const day = today.getDay(); // 0:Sun, 1:Mon, ..., 5:Fri, 6:Sat
      // Days since last Saturday: Sat=0, Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6
      const daysSinceSaturday = (day + 1) % 7;
      const saturday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysSinceSaturday);
      saturday.setHours(0, 0, 0, 0);
      return saturday;
    };

    const currentWeekStart = getFridayCutoffStart();

    // 1. Grouped historic data for charts
    const grouped = data.reduce((acc: any, row) => {
      const fieldVal = row[dateKey];
      let period = "S/F";
      let displayLabel = "S/F";
      
      if (fieldVal) {
        if (timeframe === 'monthly') {
          const iso = getISOFromExcelDate(fieldVal);
          if (iso && iso.match(/^\d{4}-\d{2}/)) {
            period = iso.substring(0, 7);
            displayLabel = getMonthLabel(period);
          }
        } else {
          period = getISOWeek(fieldVal);
          displayLabel = getWeekLabel(fieldVal);
        }
      }

      if (period === "S/F") return acc;

      if (!acc[period]) {
        acc[period] = { period, displayLabel, created: 0, resolved: 0 };
      }
      
      acc[period].created += 1;
      if (isResolvedStatus(row[statusKey])) {
        acc[period].resolved += 1;
      }
      
      return acc;
    }, {});

    const trendData = Object.values(grouped)
      .sort((a: any, b: any) => a.period.localeCompare(b.period))
      .map((item: any) => ({
        ...item,
        backlogDelta: item.created - item.resolved
      }));
    
    // 2. Real-time metrics based on Cutoff
    let thisWeekCreated = 0;
    let thisWeekResolved = 0;

    data.forEach(row => {
      const fieldVal = row[dateKey];
      if (!fieldVal) return;
      const iso = getISOFromExcelDate(fieldVal);
      if (!iso) return;
      const date = new Date(iso);
      
      if (date >= currentWeekStart) {
        thisWeekCreated++;
        if (isResolvedStatus(row[statusKey])) {
          thisWeekResolved++;
        }
      }
    });

    // Last two periods for "VS" comparison
    const currentPeriodData = trendData[trendData.length - 1] as any || { created: 0, resolved: 0 };
    const previousPeriodData = trendData[trendData.length - 2] as any || { created: 0, resolved: 0 };

    const createdDelta = previousPeriodData.created > 0 
      ? Math.round(((currentPeriodData.created - previousPeriodData.created) / previousPeriodData.created) * 100)
      : 0;
    
    const resolvedDelta = previousPeriodData.resolved > 0 
      ? Math.round(((currentPeriodData.resolved - previousPeriodData.resolved) / previousPeriodData.resolved) * 100)
      : 0;

    return {
      trendData,
      current: {
        created: thisWeekCreated,
        resolved: thisWeekResolved,
      },
      periodic: currentPeriodData,
      previous: previousPeriodData,
      createdDelta,
      resolvedDelta,
      lastUpdate: currentWeekStart.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
    };
  }, [data, timeframe, dateKey, statusKey]);

  if (!stats) return null;

  return (
    <div className="space-y-8">
      {/* Comparison Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-2xl rounded-[2.5rem] bg-indigo-900 text-white overflow-hidden relative group">
          <div className="absolute -right-4 -top-4 opacity-10 bg-white w-24 h-24 rounded-full group-hover:scale-150 transition-transform duration-700" />
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Nuevos Registros</span>
                <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Desde {stats.lastUpdate}</span>
              </div>
              <Calendar size={18} className="text-indigo-400" />
            </div>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-black tracking-tighter">{stats.current.created}</span>
              <div className={`flex items-center text-[10px] font-black px-2 py-1 rounded-lg mb-1.5 ${stats.createdDelta > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                {stats.createdDelta > 0 ? <TrendingUp size={10} className="mr-1" /> : <TrendingDown size={10} className="mr-1" />}
                {Math.abs(stats.createdDelta)}%
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[9px] font-bold opacity-30 uppercase tracking-widest leading-none">Anterior: {stats.previous.created}</span>
              <div className="h-1 w-12 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-brand-400 w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-2xl rounded-[2.5rem] bg-emerald-600 text-white overflow-hidden relative group">
          <div className="absolute -right-4 -top-4 opacity-10 bg-white w-24 h-24 rounded-full group-hover:scale-150 transition-transform duration-700" />
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">Cierres Ejecutados</span>
                <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Desde {stats.lastUpdate}</span>
              </div>
              <CheckCircle2 size={18} className="text-emerald-300" />
            </div>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-black tracking-tighter">{stats.current.resolved}</span>
              <div className={`flex items-center text-[10px] font-black px-2 py-1 rounded-lg mb-1.5 ${stats.resolvedDelta >= 0 ? 'bg-white/20 text-white' : 'bg-rose-500/30 text-rose-100'}`}>
                {stats.resolvedDelta >= 0 ? <TrendingUp size={10} className="mr-1" /> : <TrendingDown size={10} className="mr-1" />}
                {Math.abs(stats.resolvedDelta)}%
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[9px] font-bold opacity-30 uppercase tracking-widest leading-none">Anterior: {stats.previous.resolved}</span>
              <div className="h-1 w-12 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-white w-2/3" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-2xl rounded-[2.5rem] bg-white border border-slate-100 overflow-hidden col-span-1 lg:col-span-2 group">
          <CardContent className="p-8 flex items-center justify-between h-full relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-50 rounded-full -mr-8 -mt-8 opacity-50 group-hover:scale-150 transition-transform duration-700" />
            <div className="flex flex-col relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Target size={14} className="text-brand-500" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Objetivo Resiliencia</p>
              </div>
              <h4 className="text-2xl font-black text-slate-900 tracking-tight">
                {stats.current.resolved >= stats.current.created ? 'Superávit Operativo' : 'Déficit Operativo'}
              </h4>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                Velocity Ratio: <span className={`font-black ${stats.current.resolved >= stats.current.created ? 'text-emerald-600' : 'text-rose-600'}`}>{Math.round((stats.current.resolved / (stats.current.created || 1)) * 100)}%</span>
              </p>
            </div>
            <div className="flex gap-4 relative z-10">
              <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg transition-transform group-hover:rotate-12 ${stats.current.resolved >= stats.current.created ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-rose-500 text-white shadow-rose-200'}`}>
                <ArrowUpRight size={32} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Bar Chart */}
      <Card className="border-0 shadow-2xl rounded-[3rem] bg-white overflow-hidden border border-slate-100">
        <CardHeader className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 space-y-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Throughout Operativo</h4>
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Capacidad de Respuesta</h3>
          </div>
          <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            <button 
              onClick={() => setTimeframe('weekly')}
              className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${timeframe === 'weekly' ? 'bg-white text-brand-600 shadow-xl ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Semanal
            </button>
            <button 
              onClick={() => setTimeframe('monthly')}
              className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${timeframe === 'monthly' ? 'bg-white text-brand-600 shadow-xl ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Mensual
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-10 h-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={stats.trendData} 
              margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
              barGap={8}
            >
              <defs>
                <linearGradient id="barBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#4f46e5" />
                </linearGradient>
                <linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="displayLabel" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                dy={15}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                dx={-10}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                contentStyle={{ 
                  borderRadius: '2rem', 
                  border: 'none', 
                  padding: '20px', 
                  boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)'
                }}
                itemStyle={{ display: 'flex', justifyContent: 'space-between', gap: '20px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }}
                labelStyle={{ marginBottom: '10px', fontStyle: 'italic', color: '#64748b' }}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '30px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
              <Bar dataKey="created" name="Capturados" fill="url(#barBlue)" radius={[6, 6, 0, 0]} barSize={28}>
                {stats.trendData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fillOpacity={0.8 + (index / stats.trendData.length) * 0.2} />
                ))}
              </Bar>
              <Bar dataKey="resolved" name="Resueltos" fill="url(#barGreen)" radius={[6, 6, 0, 0]} barSize={28}>
                {stats.trendData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fillOpacity={0.8 + (index / stats.trendData.length) * 0.2} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
