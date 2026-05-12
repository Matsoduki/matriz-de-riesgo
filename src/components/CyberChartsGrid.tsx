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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Card className="border-0 shadow-2xl rounded-[3rem] bg-white overflow-hidden border border-slate-100">
        <CardHeader className="p-10 border-b border-slate-50 flex items-center justify-between">
          <div className="flex flex-col">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Estado Operativo</h4>
            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">Distribución Global</span>
          </div>
        </CardHeader>
        <CardContent className="p-8 h-[350px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                innerRadius={70}
                outerRadius={100}
                paddingAngle={8}
                dataKey="value"
                stroke="none"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[entry.name] || '#cbd5e1'} cornerRadius={10} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '2rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', padding: '16px' }}
                itemStyle={{ fontWeight: '900', textTransform: 'uppercase', fontSize: '10px' }}
              />
              <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-12 text-center pointer-events-none">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">Total</p>
            <p className="text-3xl font-black text-slate-800 tracking-tighter">
              {statusData.reduce((acc, curr) => acc + curr.value, 0)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-2xl rounded-[3rem] bg-white overflow-hidden border border-slate-100">
        <CardHeader className="p-10 border-b border-slate-50 flex items-center justify-between">
          <div className="flex flex-col">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Severidad</h4>
            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">Criticidad de Hallazgos</span>
          </div>
        </CardHeader>
        <CardContent className="p-8 h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priorityData} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="6 6" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={70} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }} 
              />
              <Tooltip 
                cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
                contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                itemStyle={{ fontSize: '10px', fontWeight: '900' }}
              />
              <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={24}>
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[entry.name] || '#f43f5e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-2xl rounded-[3rem] bg-white overflow-hidden border border-slate-100 group">
        <CardHeader className="p-10 border-b border-slate-50 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-150 transition-transform duration-700">
             <Target size={80} />
          </div>
          <div className="flex flex-col relative z-10">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Impacto Estratégico</h4>
            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">Dominios Afectados</span>
          </div>
        </CardHeader>
        <CardContent className="p-8 h-[350px] bg-slate-50/20">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={categoryData.slice(0, 8).sort((a, b) => b.value - a.value)} 
              layout="vertical"
              margin={{ left: 10, right: 40 }}
            >
              <defs>
                <linearGradient id="domainGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="6 6" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={120} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 9, fontWeight: 900, textTransform: 'uppercase' }} 
              />
              <Tooltip 
                cursor={{ fill: '#f1f5f9', opacity: 0.5 }}
                contentStyle={{ borderRadius: '2rem', border: 'none', shadow: '2xl', padding: '16px' }}
                itemStyle={{ fontSize: '10px', fontWeight: '900' }}
              />
              <Bar dataKey="value" radius={[0, 12, 12, 0]} barSize={22}>
                {categoryData.slice(0, 8).map((entry, index) => {
                  const barColors = [
                    '#4f46e5', // Domain 1
                    '#8b5cf6', // Domain 2
                    '#ec4899', // Domain 3
                    '#f43f5e', // Domain 4
                    '#f97316', // Domain 5
                    '#eab308', // Domain 6
                    '#22c55e', // Domain 7
                    '#06b6d4'  // Domain 8
                  ];
                  return <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} fillOpacity={0.9} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
