import React from 'react';
import { Card, CardContent, CardHeader } from './ui';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

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
      <Card className="border-0 shadow-xl rounded-[2.5rem] bg-white overflow-hidden border border-slate-100">
        <CardHeader className="p-8 border-b border-slate-50">
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Distribución por Estado</h4>
        </CardHeader>
        <CardContent className="p-6 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[entry.name] || '#cbd5e1'} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-xl rounded-[2.5rem] bg-white overflow-hidden border border-slate-100">
        <CardHeader className="p-8 border-b border-slate-50">
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Criticidad de Hallazgos</h4>
        </CardHeader>
        <CardContent className="p-6 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priorityData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[entry.name] || '#f43f5e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-xl rounded-[2.5rem] bg-white overflow-hidden border border-slate-100">
        <CardHeader className="p-8 border-b border-slate-50">
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Top Dominios Afectados</h4>
        </CardHeader>
        <CardContent className="p-6 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
