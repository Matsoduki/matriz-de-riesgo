import React from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip, Legend } from 'recharts';
import { Card, CardHeader, CardContent } from './ui';
import { BrainCircuit } from 'lucide-react';

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
  return (
    <Card className="border-0 shadow-2xl rounded-[3rem] bg-white border border-slate-100 overflow-hidden h-full">
      <CardHeader className="p-10 border-b border-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BrainCircuit size={18} className="text-brand-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ADN Operativo</span>
          </div>
          <h4 className="text-xl font-black text-slate-900 tracking-tighter">{title}</h4>
        </div>
        {headerActions}
      </CardHeader>
      <CardContent className="h-[450px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="82%" data={data}>
            <PolarGrid stroke="#e2e8f0" strokeWidth={1.5} />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: '#475569', fontSize: 9, fontWeight: 900, textTransform: 'uppercase' }} 
            />
            <Radar
              name={nameA}
              dataKey={dataKeyA}
              stroke="#0f172a"
              strokeWidth={3}
              fill="#0f172a"
              fillOpacity={0.4}
            />
            {dataKeyB && (
              <Radar
                name={nameB}
                dataKey={dataKeyB}
                stroke="#4f46e5"
                strokeWidth={3}
                fill="#4f46e5"
                fillOpacity={0.3}
              />
            )}
            {dataKeyC && (
              <Radar
                name={nameC}
                dataKey={dataKeyC}
                stroke="#cbd5e1"
                strokeWidth={2}
                fill="#f1f5f9"
                fillOpacity={0.5}
                strokeDasharray="4 4"
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
