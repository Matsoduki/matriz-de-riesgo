import React from 'react';
import { Card, CardContent, CardHeader } from './ui';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Target } from 'lucide-react';

interface ChartData {
  name: string;
  value: number;
}

interface Props {
  statusData: ChartData[];
  priorityData: ChartData[];
  categoryData: ChartData[];
  colors: Record<string, string>;
}

export const CyberChartsGrid: React.FC<Props> = ({ statusData, priorityData, categoryData, colors }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {/* Estado Operativo - Square Card */}
      <Card className="lg:col-span-1 border-0 shadow-2xl rounded-[3rem] bg-white overflow-hidden border border-slate-100 group transition-all duration-500 hover:shadow-brand-100/20">
        <CardHeader className="p-10 border-b border-slate-50 flex items-center justify-between">
          <div className="flex flex-col">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Estado Operativo</h4>
            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">Distribución Global</span>
          </div>
        </CardHeader>
        <CardContent className="p-8 h-[380px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                innerRadius={75}
                outerRadius={105}
                paddingAngle={6}
                dataKey="value"
                stroke="none"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[entry.name] || '#cbd5e1'} cornerRadius={12} className="hover:opacity-80 transition-opacity outline-none" />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }}
                itemStyle={{ fontWeight: '900', textTransform: 'uppercase', fontSize: '9px' }}
                cursor={false}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-12 text-center pointer-events-none group-hover:scale-110 transition-transform">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] leading-none mb-1">Volumen</p>
            <p className="text-4xl font-black text-slate-800 tracking-tighter">
              {statusData.reduce((acc, curr) => acc + curr.value, 0)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Severidad - Dynamic Bar Chart */}
      <Card className="lg:col-span-1 border-0 shadow-2xl rounded-[3rem] bg-white overflow-hidden border border-slate-100 group transition-all duration-500 hover:shadow-brand-100/20">
        <CardHeader className="p-10 border-b border-slate-50 flex items-center justify-between">
          <div className="flex flex-col">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Severidad</h4>
            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">Criticidad Focalizada</span>
          </div>
        </CardHeader>
        <CardContent className="p-8 h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priorityData} layout="vertical" margin={{ left: 5, right: 30, top: 10 }}>
              <CartesianGrid strokeDasharray="8 8" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={75} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }} 
              />
              <Tooltip 
                cursor={{ fill: 'rgba(241, 245, 249, 0.4)', radius: 10 }}
                contentStyle={{ borderRadius: '1.25rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                itemStyle={{ fontSize: '9px', fontWeight: '900' }}
              />
              <Bar dataKey="value" radius={[0, 12, 12, 0]} barSize={26}>
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[entry.name] || '#f43f5e'} className="hover:opacity-90 transition-opacity" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Impacto Estratégico - Large Featured Card */}
      <Card className="md:col-span-2 lg:col-span-2 border-0 shadow-2xl rounded-[3rem] bg-white overflow-hidden border border-slate-100 group transition-all duration-500 hover:shadow-brand-100/20 relative">
        <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:scale-125 group-hover:opacity-[0.05] transition-all duration-1000 pointer-events-none">
           <Target size={180} />
        </div>
        <CardHeader className="p-10 md:px-14 border-b border-slate-50 flex items-center justify-between relative z-10">
          <div className="flex flex-col">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1 text-brand-500">Impacto Estratégico</h4>
            <span className="text-xl font-black text-slate-800 uppercase tracking-tight">Análisis de Dominios MAC Corporativos</span>
          </div>
        </CardHeader>
        <CardContent className="p-10 md:p-14 h-[380px] bg-slate-50/20 relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={categoryData.length > 0 ? categoryData.slice(0, 10).sort((a, b) => b.value - a.value) : [{ name: 'Sin Datos', value: 0 }]} 
              layout="vertical"
              margin={{ left: 10, right: 60, top: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="8 8" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={160} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#475569', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }} 
              />
              <Tooltip 
                cursor={{ fill: '#f1f5f9', radius: 15 }}
                contentStyle={{ borderRadius: '2rem', border: 'none', shadow: '3xl', padding: '16px' }}
                itemStyle={{ fontSize: '10px', fontWeight: '900' }}
              />
              <Bar dataKey="value" radius={[0, 15, 15, 0]} barSize={24}>
                {(categoryData.length > 0 ? categoryData.slice(0, 10) : []).map((entry, index) => {
                  const barColors = [
                    '#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe',
                    '#e0e7ff', '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa'
                  ];
                  return <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} className="hover:brightness-95 transition-all" />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
