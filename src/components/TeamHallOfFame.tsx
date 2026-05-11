import React from 'react';
import { Trophy, Medal, Award, Rocket } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  performers: any[];
  onSelect: (member: any) => void;
}

export const TeamHallOfFame: React.FC<Props> = ({ performers, onSelect }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {performers.map((member, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`relative p-8 rounded-[2.5rem] overflow-hidden cursor-pointer group transition-all hover:scale-[1.02] ${
            i === 0 ? 'bg-slate-900 text-white shadow-2xl' : 'bg-white border border-slate-100 shadow-xl'
          }`}
          onClick={() => onSelect(member)}
        >
          {i === 0 && (
            <div className="absolute -right-8 -top-8 rotate-12 opacity-10">
              <Trophy size={160} />
            </div>
          )}
          <div className="flex items-center gap-4 mb-6">
            <div className={`p-3 rounded-2xl ${i === 0 ? 'bg-brand-500' : 'bg-slate-50 text-slate-400'}`}>
              {i === 0 ? <Medal size={24} /> : i === 1 ? <Award size={24} /> : <Rocket size={24} />}
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${i === 0 ? 'text-brand-400' : 'text-slate-400'}`}>
                Ranking #{i + 1}
              </p>
              <h3 className={`text-xl font-black tracking-tight ${i === 0 ? 'text-white' : 'text-slate-900'}`}>{member.name}</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-2xl ${i === 0 ? 'bg-white/10' : 'bg-slate-50'}`}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-slate-400">Efficiency</p>
              <p className="text-2xl font-black text-brand-500">{member.efficiencyScore}</p>
            </div>
            <div className={`p-4 rounded-2xl ${i === 0 ? 'bg-white/10' : 'bg-slate-50'}`}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-slate-400">Lead Time</p>
              <p className="text-2xl font-black">{member.mttrDisplay}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
              i === 0 ? 'bg-brand-500/20 text-brand-400' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {member.estado}
            </span>
            <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{member.total} Casos</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
