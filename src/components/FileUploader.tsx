import React, { useCallback, useState, useEffect } from 'react';
import { UploadCloud, ShieldCheck, Cpu, Database, Activity, ScanLine } from 'lucide-react';
import { Card, CardContent } from './ui';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onUpload: (file: File) => void;
  isLoading: boolean;
}

export function FileUploader({ onUpload, isLoading }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setLoadingStep((prev) => (prev < 3 ? prev + 1 : prev));
      }, 1200);
      return () => clearInterval(interval);
    } else {
      setLoadingStep(0);
    }
  }, [isLoading]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files[0]);
    }
  }, [onUpload]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files[0]);
    }
  };

  const loadingMessages = [
    "Inicializando motor de análisis predictivo...",
    "Validando integridad estructural de datos...",
    "Correlacionando matrices de riesgo y desempeño...",
    "Construyendo modelos de visualización operativa..."
  ];

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f8fafc] p-4 relative overflow-hidden">
      {/* Dynamic Background during loading */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.05),_transparent_60%)]" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!isLoading ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-xl z-10"
          >
            <Card className="border-0 shadow-[0_20px_50px_rgba(15,23,42,0.05)] rounded-[2.5rem] bg-white overflow-hidden p-2">
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <Database size={200} />
              </div>
              <CardContent className="p-10 relative z-10">
                <div className="flex flex-col items-center text-center">
                  <motion.div 
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    className="mb-8 p-5 bg-indigo-50 text-indigo-600 rounded-3xl shadow-sm border border-indigo-100/50"
                  >
                    <UploadCloud size={48} strokeWidth={1.5} />
                  </motion.div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-3">Motor de Análisis</h2>
                  <p className="text-sm font-medium text-slate-500 mb-10 max-w-sm">
                    Sincronice su entorno de datos para activar los dashboards analíticos y métricas ejecutivas.
                  </p>

                  <label
                    className={`relative flex w-full cursor-pointer flex-col items-center justify-center rounded-[2rem] border-2 border-dashed p-12 transition-all duration-300 group ${
                      isDragging ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02] shadow-xl shadow-indigo-100' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50 hover:border-indigo-300'
                    }`}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                  >
                    <div className="absolute inset-0 bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem]" />
                    <ScanLine size={32} className={`mb-4 transition-colors ${isDragging ? 'text-indigo-500' : 'text-slate-400'}`} />
                    <span className="text-lg font-bold text-slate-800 relative z-10">
                      Arrastre el dataset Excel aquí
                    </span>
                    <span className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-400 relative z-10">
                      o haga clic para explorar archivos locales
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx, .xls, .csv"
                      onChange={onFileChange}
                      disabled={isLoading}
                    />
                  </label>

                  <div className="mt-10 flex items-start gap-4 rounded-2xl bg-emerald-50/50 p-5 text-left border border-emerald-100/50">
                    <ShieldCheck className="text-emerald-500 shrink-0" size={24} />
                    <div>
                      <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-1">Entorno Aislado VZero</p>
                      <p className="text-xs font-medium text-emerald-800/80 leading-relaxed">
                        Procesamiento Client-Side. No interfiere con servidores externos, garantizando el cumplimiento normativo y privacidad de datos.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl z-10"
          >
            <Card className="border-0 shadow-2xl rounded-[3rem] bg-slate-900 border border-slate-800 overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.15),_transparent)]" />
              <CardContent className="p-16 relative z-10 flex flex-col items-center justify-center text-center">
                
                <div className="relative mb-12">
                   {/* Cool pulsating rings */}
                   <motion.div 
                     animate={{ scale: [1, 1.5, 2], opacity: [0.5, 0.2, 0] }} 
                     transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }} 
                     className="absolute inset-0 bg-indigo-500 rounded-full blur-xl"
                   />
                   <div className="relative w-24 h-24 bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl flex items-center justify-center isolate overflow-hidden">
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-[3px] border-dashed border-indigo-500/30 rounded-3xl"
                      />
                      <Cpu size={40} className="text-indigo-400" />
                   </div>
                </div>

                <motion.div 
                   key={loadingStep}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="space-y-4"
                >
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase whitespace-nowrap">
                    Procesando Neural Engine
                  </h3>
                  <div className="flex items-center gap-3 justify-center text-indigo-400">
                     <Activity size={16} className="animate-pulse" />
                     <p className="text-xs font-bold uppercase tracking-[0.2em]">
                       {loadingMessages[loadingStep]}
                     </p>
                  </div>
                </motion.div>

                {/* Progress bar */}
                <div className="w-full max-w-sm mt-12 space-y-2">
                   <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 tracking-widest">
                      <span>Inyección de Datos</span>
                      <span>{Math.round((loadingStep + 1) * 25)}%</span>
                   </div>
                   <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(loadingStep + 1) * 25}%` }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                        className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                      />
                   </div>
                </div>

              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
