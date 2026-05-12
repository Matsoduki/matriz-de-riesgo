import React from 'react';
import { Card, CardContent } from './ui';
import { Users, CheckCircle2, Flame, Timer, Activity, Zap, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  metrics: {
    total: number;
    resolved: number;
    burnoutRiskCount: number;
    avgEfficiency: number;
    throughput: string;
    teamSize: number;
    timeCompliance?: number;
    avgMTTRDisplay?: string;
  };
  onCardClick?: (type: MetricType) => void;
}

import { MetricType } from './AnalyticalBreakdownPanel';

export const TeamMetricsCards: React.FC<Props> = ({ metrics, onCardClick }) => {
  const cards = [
    {
      label: "Fuerza Operativa",
      val: metrics.teamSize,
      sub: "Miembros Activos",
      icon: Users,
      color: "indigo",
      type: null
    },
    {
      label: "Efficiency Global",
      val: `${metrics.avgEfficiency}%`,
      sub: "Ponderado Vol/Vel",
      icon: Zap,
      color: "brand",
      type: 'efficiency' as MetricType
    },
    {
      label: "Throughput",
      val: metrics.throughput,
      sub: "Cierres / Semana",
      icon: Activity,
      color: "emerald",
      type: 'throughput' as MetricType
    },
    {
      label: "Avg Lead Time",
      val: metrics.avgMTTRDisplay || "N/A",
      sub: "MTTR Global",
      icon: Clock,
      color: "blue",
      type: 'aging' as MetricType
    },
    {
      label: "SLA Global",
      val: `${metrics.timeCompliance}%`,
      sub: "Tickets On-Time",
      icon: Timer,
      color: "amber",
      type: 'sla' as MetricType
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {cards.map((card, i) => (
        <Card 
          key={i} 
          onClick={() => card.type && onCardClick?.(card.type)}
          className={`border-0 shadow-xl bg-white rounded-[2.5rem] p-8 relative overflow-hidden group hover:scale-[1.02] transition-all ${card.type ? 'cursor-pointer' : ''}`}
        >
          <div className={`absolute top-0 right-0 p-8 opacity-5 text-${card.color}-500 group-hover:rotate-12 transition-transform`}>
            <card.icon size={80} />
          </div>
          <CardContent className="p-0 relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{card.label}</p>
            <h4 className="text-4xl font-black tracking-tighter text-slate-900 mb-4">{card.val}</h4>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-3 py-1 rounded-full bg-${card.color}-50 text-${card.color}-600 uppercase tracking-widest`}>
                {card.sub}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
