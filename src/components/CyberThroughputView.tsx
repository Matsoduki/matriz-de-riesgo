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
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { getISOFromExcelDate, getISOWeek, isResolvedStatus } from '../lib/excelParser';

interface Props {
  data: any[];
  dateKey: string;
  statusKey: string;
}

export const CyberThroughputView: React.FC<Props> = ({ data, dateKey, statusKey }) => {
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('weekly');

  const stats = useMemo(() => {
    if (!data.length) return null;

    const grouped = data.reduce((acc: any, row) => {
      const fieldVal = row[dateKey];
      let period = "S/F";
      
      if (fieldVal) {
        if (timeframe === 'monthly') {
          const iso = getISOFromExcelDate(fieldVal);
          if (iso) period = iso.substring(0, 7);
        } else {
          period = getISOWeek(fieldVal);
        }
      }

      if (period === "S/F") return acc;

      if (!acc[period]) {
        acc[period] = { period, created: 0, resolved: 0 };
      }
      
      acc[period].created += 1;
      if (isResolvedStatus(row[statusKey])) {
        acc[period].resolved += 1;
      }
      
      return acc;
    }, {});

    const trendData = Object.values(grouped).sort((a: any, b: any) => a.period.localeCompare(b.period));
    
    // Last two periods for "VS" comparison
    const current = trendData[trendData.length - 1] as any || { created: 0, resolved: 0 };
    const previous = trendData[trendData.length - 2] as any || { created: 0, resolved: 0 };

    const createdDelta = previous.created > 0 
      ? Math.round(((current.created - previous.created) / previous.created) * 100)
      : 0;
    
    const resolvedDelta = previous.resolved > 0 
      ? Math.round(((current.resolved - previous.resolved) / previous.resolved) * 100)
      : 0;

    return {
      trendData,
      current,
      previous,
      createdDelta,
      resolvedDelta
    };
  }, [data, timeframe, dateKey, statusKey]);

  if (!stats) return null;

  return (
    <div className="space-y-8">
      {/* Comparison Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-xl rounded-[2rem] bg-indigo-900 text-white overflow-hidden relative">
          <div className="absolute -right-4 -top-4 opacity-10 bg-white w-24 h-24 rounded-full" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Created (This {timeframe === 'weekly' ? 'Week' : 'Month'})</span>
              <Calendar size={16} className="opacity-40" />
            </div>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-black">{stats.current.created}</span>
              <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full mb-1 ${stats.createdDelta > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                {stats.createdDelta > 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                {Math.abs(stats.createdDelta)}%
              </div>
            </div>
            <p className="text-[10px] opacity-40 mt-2 font-medium">vs {stats.previous.created} in previous period</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl rounded-[2rem] bg-emerald-600 text-white overflow-hidden relative">
          <div className="absolute -right-4 -top-4 opacity-10 bg-white w-24 h-24 rounded-full" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Resolved (This {timeframe === 'weekly' ? 'Week' : 'Month'})</span>
              <CheckCircle2 size={16} className="opacity-40" />
            </div>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-black">{stats.current.resolved}</span>
              <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full mb-1 ${stats.resolvedDelta >= 0 ? 'bg-white/20 text-white' : 'bg-rose-500/30 text-rose-100'}`}>
                {stats.resolvedDelta >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                {Math.abs(stats.resolvedDelta)}%
              </div>
            </div>
            <p className="text-[10px] opacity-40 mt-2 font-medium">vs {stats.previous.resolved} in previous period</p>
          </CardContent>
        </Card>

        {/* Burn Rate / Agility Metric */}
        <Card className="border-0 shadow-xl rounded-[2rem] bg-white border border-slate-100 overflow-hidden col-span-1 lg:col-span-2">
          <CardContent className="p-6 flex items-center justify-between h-full">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status de Mitigación</p>
              <h4 className="text-xl font-bold text-slate-800">
                {stats.current.resolved >= stats.current.created ? 'Backlog Reduciéndose' : 'Backlog Creciendo'}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Relación de cierre: <span className="font-bold text-indigo-600">{Math.round((stats.current.resolved / (stats.current.created || 1)) * 100)}%</span>
              </p>
            </div>
            <div className="flex gap-2">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stats.current.resolved >= stats.current.created ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                <ArrowUpRight size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Bar Chart */}
      <Card className="border-0 shadow-2xl rounded-[2.5rem] bg-white overflow-hidden border border-slate-50">
        <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between space-y-0">
          <div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Throughput Operativo</h4>
            <p className="text-xs text-slate-400 mt-1">Análisis histórico de captura vs resolución</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setTimeframe('weekly')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-tight rounded-lg transition-all ${timeframe === 'weekly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
              Semanal
            </button>
            <button 
              onClick={() => setTimeframe('monthly')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-tight rounded-lg transition-all ${timeframe === 'monthly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
              Mensual
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-8 h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.trendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="period" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
              <Bar dataKey="created" name="Capturados" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
              <Bar dataKey="resolved" name="Resueltos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
