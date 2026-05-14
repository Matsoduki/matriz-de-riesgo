import React from 'react';
import { Trophy, Medal, Award, Rocket, Shield, Users, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  performers: any[];
  onSelect: (member: any) => void;
}

export const TeamHallOfFame: React.FC<Props> = ({ performers, onSelect }) => {
  // We expect at least 3 performers for a podium
  if (!performers || performers.length < 3) return null;
  const top3 = performers.slice(0, 3);

  return (
    <div className="relative mb-16">
      {/* Decorative Links (Eslabones) */}
      <div className="absolute top-1/2 left-[30%] right-[30%] h-px border-t-2 border-dashed border-slate-200 -translate-y-1/2 hidden lg:block z-0" />
      <div className="absolute top-1/2 left-[30%] w-4 h-4 rounded-full bg-slate-100 border-2 border-slate-200 -translate-x-1/2 -translate-y-1/2 hidden lg:block z-0" />
      <div className="absolute top-1/2 right-[30%] w-4 h-4 rounded-full bg-slate-100 border-2 border-slate-200 translate-x-1/2 -translate-y-1/2 hidden lg:block z-0" />

      <div className="flex flex-col lg:flex-row items-end justify-center gap-6 px-4 relative z-10">
        {/* Position 2 (Left) */}
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           whileInView={{ opacity: 1, x: 0 }}
           viewport={{ once: true }}
           className="w-full lg:w-1/3 order-2 lg:order-1"
           onClick={() => onSelect(top3[1])}
        >
          <div className="bg-white border border-slate-100 shadow-xl rounded-[2.5rem] p-8 relative overflow-hidden group cursor-pointer hover:shadow-2xl transition-all h-[320px] flex flex-col items-center justify-center text-center">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1">
               {[1, 2, 3].map(i => <div key={i} className="w-4 h-1 bg-slate-200 rounded-full" />)}
            </div>
            <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-sm group-hover:scale-110 transition-transform">
              <Medal size={24} className="text-brand-500" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Puesto #2</p>
            <h3 className="text-2xl font-black text-slate-900 mb-6">{top3[1].name}</h3>
            <div className="flex gap-4">
               <div className="text-center">
                  <p className="text-[8px] font-black uppercase text-slate-400">Eficiencia</p>
                  <p className="text-xl font-black text-brand-600">{top3[1].efficiencyScore}</p>
               </div>
               <div className="w-px h-8 bg-slate-100" />
               <div className="text-center">
                  <p className="text-[8px] font-black uppercase text-slate-400">MTTR</p>
                  <p className="text-xl font-black text-slate-900">{top3[1].mttrDisplay}</p>
               </div>
            </div>
          </div>
        </motion.div>

        {/* Position 1 (Center) */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="w-full lg:w-1/3 order-1 lg:order-2 z-10"
          onClick={() => onSelect(top3[0])}
        >
          <div className="bg-brand-50 border-4 border-brand-200 shadow-[0_35px_60px_-15px_rgba(99,102,241,0.2)] rounded-[3rem] p-10 relative overflow-hidden group cursor-pointer hover:shadow-brand-500/30 transition-all h-[400px] flex flex-col items-center justify-center text-center">
            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-1.5">
               {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-6 h-1.5 bg-brand-200 rounded-full" />)}
            </div>
            <div className="absolute top-0 right-0 p-8 opacity-5">
               <Trophy size={140} className="text-brand-600" />
            </div>
            <div className="w-24 h-24 bg-brand-500 rounded-full flex items-center justify-center mb-8 border-8 border-white shadow-xl group-hover:scale-110 transition-transform">
              <Trophy size={40} className="text-white" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-brand-600 mb-2">Máximo Desempeño #1</p>
            <h3 className="text-4xl font-black text-slate-900 mb-8 tracking-tighter leading-none">{top3[0].name}</h3>
            <div className="flex gap-8">
               <div className="text-center">
                  <p className="text-[9px] font-black uppercase text-brand-500">Eficiencia</p>
                  <p className="text-3xl font-black text-brand-600">{top3[0].efficiencyScore}</p>
               </div>
               <div className="w-px h-12 bg-brand-200" />
               <div className="text-center">
                  <p className="text-[9px] font-black uppercase text-brand-500">MTTR</p>
                  <p className="text-3xl font-black text-slate-900">{top3[0].mttrDisplay}</p>
               </div>
            </div>
          </div>
        </motion.div>

        {/* Position 3 (Right) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="w-full lg:w-1/3 order-3 lg:order-3"
          onClick={() => onSelect(top3[2])}
        >
          <div className="bg-white border border-slate-100 shadow-xl rounded-[2.5rem] p-8 relative overflow-hidden group cursor-pointer hover:shadow-2xl transition-all h-[280px] flex flex-col items-center justify-center text-center">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1">
               {[1, 2].map(i => <div key={i} className="w-4 h-1 bg-slate-200 rounded-full" />)}
            </div>
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-5 border-4 border-white shadow-sm group-hover:scale-110 transition-transform">
              <Award size={22} className="text-emerald-500" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Puesto #3</p>
            <h3 className="text-xl font-black text-slate-900 mb-5">{top3[2].name}</h3>
            <div className="flex gap-4">
               <div className="text-center">
                  <p className="text-[8px] font-black uppercase text-slate-400">Eficiencia</p>
                  <p className="text-lg font-black text-brand-600">{top3[2].efficiencyScore}</p>
               </div>
               <div className="w-px h-6 bg-slate-100" />
               <div className="text-center">
                  <p className="text-[8px] font-black uppercase text-slate-400">MTTR</p>
                  <p className="text-lg font-black text-slate-900">{top3[2].mttrDisplay}</p>
               </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
