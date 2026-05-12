import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Users, User, Target, TrendingUp, Zap, Clock, Shield, Search, Filter, 
  ChevronRight, ArrowRight, Activity, Percent, BarChart, Maximize2,
  GitCompare, Trophy, AlertTriangle, Scale
} from 'lucide-react';
import { Card, CardHeader, CardContent } from './ui';
import { PerformanceRadar } from './PerformanceRadar';
import { 
  ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell,
  LineChart, Line
} from 'recharts';

interface Props {
  metrics: any;
  allData: any[];
}

export const VSPerformanceAnalytics: React.FC<Props> = ({ metrics, allData }) => {
  const [selectedA, setSelectedA] = useState<string>('all');
  const [selectedB, setSelectedB] = useState<string>('all');
  const [viewType, setViewType] = useState<'individual' | 'team'>('individual');

  const collaborators = metrics.collabList;

  const compareData = useMemo(() => {
    const memberA = collaborators.find((c: any) => c.name === selectedA) || { 
      name: 'Equipo (Promedio)', 
      efficiencyScore: metrics.avgEfficiency,
      total: metrics.total / metrics.teamSize,
      resolved: metrics.resolved / metrics.teamSize,
      compliance: metrics.timeCompliance,
      rawMttr: metrics.avgMTTR || 0,
      estado: 'Squad',
      radarData: metrics.radarData.map((r: any) => ({ subject: r.subject, A: r.A }))
    };

    const memberB = collaborators.find((c: any) => c.name === selectedB) || { 
      name: 'Equipo (Promedio)', 
      efficiencyScore: metrics.avgEfficiency,
      total: metrics.total / metrics.teamSize,
      resolved: metrics.resolved / metrics.teamSize,
      compliance: metrics.timeCompliance,
      rawMttr: metrics.avgMTTR || 0,
      estado: 'Squad',
      radarData: metrics.radarData.map((r: any) => ({ subject: r.subject, A: r.A }))
    };

    const squadAvg = {
      name: 'Squad Average',
      efficiencyScore: metrics.avgEfficiency,
      total: metrics.total / metrics.teamSize,
      resolved: metrics.resolved / metrics.teamSize,
      compliance: metrics.timeCompliance,
      rawMttr: metrics.avgMTTR || 0,
      radarData: metrics.radarData
    };

    const chartData = [
      { name: 'Productividad', A: memberA.total, B: memberB.total, squad: squadAvg.total },
      { name: 'Eficiencia', A: memberA.efficiencyScore, B: memberB.efficiencyScore, squad: squadAvg.efficiencyScore },
      { name: 'SLA', A: memberA.compliance, B: memberB.compliance, squad: squadAvg.compliance },
      { name: 'Resueltos', A: memberA.resolved, B: memberB.resolved, squad: squadAvg.resolved }
    ];

    const radarA = memberA.radarData || chartData.map(d => ({ subject: d.name, A: d.A }));
    const radarCombined = radarA.map((r: any, idx: number) => {
      const subjectMap: Record<string, string> = {
        'Throughput': 'Productividad',
        'Efficiency': 'Eficiencia',
        'Compliance': 'SLA',
        'Velocity': 'Velocidad',
        'Quality': 'Calidad',
        'Reliability': 'Confiabilidad'
      };
      
      return {
        subject: subjectMap[r.subject] || r.subject,
        A: r.A,
        B: (memberB.radarData ? memberB.radarData[idx]?.A : chartData[idx]?.B) || 0,
        squad: (squadAvg.radarData ? squadAvg.radarData[idx]?.A : (chartData[idx] as any).squad) || 0
      };
    });

    return { memberA, memberB, squadAvg, chartData, radarCombined };
  }, [selectedA, selectedB, collaborators, metrics]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md p-6 rounded-[3rem] border border-slate-100 shadow-sm">
         <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><User size={16} /></div>
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entidad de Comparación A</span>
            </div>
            <select 
              value={selectedA}
              onChange={(e) => setSelectedA(e.target.value)}
              className="w-full h-16 px-6 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand-500 transition-all outline-none"
            >
              <option value="all">Promedio de Equipo</option>
              {collaborators.map((c: any) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
         </div>

         <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-brand-50 text-brand-600 rounded-xl"><GitCompare size={16} /></div>
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entidad de Comparación B</span>
            </div>
            <select 
              value={selectedB}
              onChange={(e) => setSelectedB(e.target.value)}
              className="w-full h-16 px-6 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand-500 transition-all outline-none"
            >
              <option value="all">Promedio de Equipo</option>
              {collaborators.map((c: any) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Summary Card A */}
        <div className="lg:col-span-3">
          <Card className={`border-0 shadow-xl rounded-[3rem] overflow-hidden ${selectedA === 'all' ? 'bg-brand-500 text-white' : 'bg-white'}`}>
            <CardContent className="p-10 text-center space-y-6">
              <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black ${selectedA === 'all' ? 'bg-white/20' : 'bg-slate-100 text-slate-400 font-mono'}`}>
                {selectedA === 'all' ? <Users /> : selectedA.charAt(0)}
              </div>
              <div>
                <h4 className="text-xl font-black tracking-tight mb-2 uppercase">{compareData.memberA.name}</h4>
                <div className={`inline-flex px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedA === 'all' ? 'bg-white/10 text-white' : 'bg-brand-50 text-brand-600'}`}>
                   Score: {Math.round(compareData.memberA.efficiencyScore)}
                </div>
                <p className={`mt-3 text-[9px] font-bold uppercase tracking-widest ${selectedA === 'all' ? 'opacity-60' : 'text-slate-400'}`}>
                  {selectedA === 'all' ? 'Métrica de Referencia Colectiva' : `${compareData.memberA.estado} Specialist`}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-left border-t border-slate-100 pt-6">
                 <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Volumen</p>
                    <p className="text-xl font-black">{Math.round(compareData.memberA.total)}</p>
                 </div>
                 <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">MTTR</p>
                    <p className="text-xl font-black">{compareData.memberA.rawMttr.toFixed(1)}h</p>
                 </div>
                 <div className="col-span-2 pt-2 border-t border-slate-50">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Cierre SLA</p>
                    <p className="text-xl font-black text-brand-600">{Math.round(compareData.memberA.compliance)}%</p>
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comparison Radar */}
        <div className="lg:col-span-6 h-[400px]">
          <PerformanceRadar 
            data={compareData.radarCombined} 
            dataKeyA="A"
            dataKeyB="B"
            dataKeyC={viewType === 'team' ? "squad" : undefined}
            nameA={compareData.memberA.name}
            nameB={compareData.memberB.name}
            nameC="Promedio Squad"
            title={viewType === 'team' ? "Balance de Capacidades vs Squad" : "Balance de Capacidades (VS)"}
          />
        </div>

        {/* Summary Card B */}
        <div className="lg:col-span-3">
          <Card className={`border-0 shadow-xl rounded-[3rem] overflow-hidden ${selectedB === 'all' ? 'bg-indigo-500 text-white' : 'bg-white'}`}>
            <CardContent className="p-10 text-center space-y-6">
              <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black ${selectedB === 'all' ? 'bg-white/20' : 'bg-slate-100 text-slate-400 font-mono'}`}>
                {selectedB === 'all' ? <Users /> : selectedB.charAt(0)}
              </div>
              <div>
                <h4 className="text-xl font-black tracking-tight mb-2 uppercase">{compareData.memberB.name}</h4>
                <div className={`inline-flex px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedB === 'all' ? 'bg-white/10 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                   Score: {Math.round(compareData.memberB.efficiencyScore)}
                </div>
                <p className={`mt-3 text-[9px] font-bold uppercase tracking-widest ${selectedB === 'all' ? 'opacity-60' : 'text-slate-400'}`}>
                  {selectedB === 'all' ? 'Métrica de Referencia Colectiva' : `${compareData.memberB.estado} Specialist`}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-left border-t border-slate-100 pt-6">
                 <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Volumen</p>
                    <p className="text-xl font-black">{Math.round(compareData.memberB.total)}</p>
                 </div>
                 <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">MTTR</p>
                    <p className="text-xl font-black">{compareData.memberB.rawMttr.toFixed(1)}h</p>
                 </div>
                 <div className="col-span-2 pt-2 border-t border-slate-50">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Cierre SLA</p>
                    <p className="text-xl font-black text-indigo-600">{Math.round(compareData.memberB.compliance)}%</p>
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Advanced Charting */}
      <Card className="border-0 shadow-2xl rounded-[3.5rem] bg-white border border-slate-100 overflow-hidden">
        <CardHeader className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
           <div>
              <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-1">Gap Analysis</p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Diferencial de Rendimiento Operativo</h3>
           </div>
           <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2">
              <button onClick={() => setViewType('individual')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewType === 'individual' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Individual</button>
              <button onClick={() => setViewType('team')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewType === 'team' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Vs Squad</button>
           </div>
        </CardHeader>
        <CardContent className="p-10">
           <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                 <ReBarChart data={compareData.chartData} barGap={12}>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b', textTransform: 'uppercase' }} 
                    />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '1.5rem' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
                    <Bar name={compareData.memberA.name} dataKey="A" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={34} />
                    <Bar name={compareData.memberB.name} dataKey="B" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={34} />
                    {viewType === 'team' && (
                      <Bar name="Promedio Squad" dataKey="squad" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} opacity={0.6} strokeDasharray="4 4" />
                    )}
                 </ReBarChart>
              </ResponsiveContainer>
           </div>
        </CardContent>
      </Card>
      
      {/* Delta Analysis Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Brecha de Eficiencia', val: Math.abs(compareData.memberA.efficiencyScore - compareData.memberB.efficiencyScore).toFixed(1), icon: <Zap size={18} />, color: 'indigo' },
          { label: 'Diferencial de Velocidad', val: Math.abs(compareData.memberA.rawMttr - compareData.memberB.rawMttr).toFixed(1), icon: <Clock size={18} />, color: 'amber' },
          { label: 'Gap de Productividad', val: Math.abs(compareData.memberA.total - compareData.memberB.total).toFixed(0), icon: <Target size={18} />, color: 'brand' }
        ].map((delta, i) => (
          <Card key={i} className="border-0 shadow-lg bg-white rounded-3xl p-8 flex items-center gap-6 group hover:border-brand-500 border border-transparent transition-all">
             <div className={`p-4 bg-${delta.color}-50 text-${delta.color}-600 rounded-2xl group-hover:rotate-12 transition-transform`}>
                {delta.icon}
             </div>
             <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{delta.label}</p>
                <div className="flex items-baseline gap-2">
                   <h4 className="text-3xl font-black text-slate-900 tracking-tighter">{delta.val}</h4>
                   <span className="text-[10px] font-bold text-slate-300 uppercase">Puntos</span>
                </div>
             </div>
          </Card>
        ))}
      </div>
    </motion.div>
  );
};
