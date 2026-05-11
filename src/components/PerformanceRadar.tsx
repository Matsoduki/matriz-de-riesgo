import React from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from 'recharts';
import { Card, CardHeader, CardContent } from './ui';
import { BrainCircuit } from 'lucide-react';

interface Props {
  data: any[];
  teamName?: string;
}

export const PerformanceRadar: React.FC<Props> = ({ data, teamName = "Equipo Cyber" }) => {
  return (
    <Card className="border-0 shadow-2xl rounded-[3rem] bg-white border border-slate-100 overflow-hidden h-full">
      <CardHeader className="p-10 border-b border-slate-50">
        <div className="flex items-center gap-3 mb-2">
          <BrainCircuit size={18} className="text-brand-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ADN Operativo</span>
        </div>
        <h4 className="text-xl font-black text-slate-900 tracking-tighter">Balance de Capacidades</h4>
      </CardHeader>
      <CardContent className="p-4 h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} />
            <Radar
              name={teamName}
              dataKey="A"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.4}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
          </RadarChart>
        </ResponsiveContainer>
        <div className="px-6 pb-6 mt-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-[10px] text-slate-500 text-center font-medium">
            Mapeo multidimensional basado en normalización de SLAs y volúmenes táticos.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
