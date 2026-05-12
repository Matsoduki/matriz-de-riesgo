import React, { useState } from 'react';
import { DashboardData } from '../lib/excelParser';
import { exportToStyledExcel } from '../lib/utils';
import { 
  BarChart3, 
  LayoutDashboard, 
  Download, 
  FileSpreadsheet, 
  Activity,
  LogOut,
  Users,
  ShieldAlert,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSearch,
  Target,
  TrendingUp,
  Shield
} from 'lucide-react';
import { Button, Card, CardContent } from './ui';
import JiraView from './JiraView';
import SensorView from './SensorView';
import CyberView from './CyberView';
import { GapFinderView } from './GapFinderView';
import TeamPerformanceView from './TeamPerformanceView';
import { motion, AnimatePresence } from 'motion/react';

import { SCOPE_MAPPING } from '../constants/cyberCatalog';

interface Props {
  data: DashboardData;
  onReset: () => void;
}

export type ViewType = 'overview' | 'jira2025' | 'jira2026' | 'teamInitiatives' | 'sensor' | 'teamSupport' | 'mandoYControl' | 'gapFinder' | 'teamPerformance';

const NavItem = ({ icon, label, isActive, onClick, alert }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void, alert?: boolean }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${
      isActive 
        ? 'bg-brand-600 text-white shadow-lg shadow-brand-200 ring-1 ring-brand-400' 
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
    }`}
  >
    <div className="flex items-center gap-3 relative z-10">
      <div className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-500'} transition-colors`}>
        {icon}
      </div>
      <span className={`text-sm tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
    </div>
    {alert && !isActive && (
      <span className="relative flex h-2 w-2 z-10">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
      </span>
    )}
    {isActive && (
      <motion.div 
        layoutId="activeNav"
        className="absolute inset-0 bg-brand-600"
        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      />
    )}
  </button>
);

const StatCard = ({ title, value, subtitle, subvalue, icon: Icon, color, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="h-full"
  >
    <Card className="h-full group relative overflow-hidden border-0 shadow-sm bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
      <CardContent className="p-8 h-full flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 font-sans">{title}</p>
            <div className={`p-3 rounded-2xl ${color} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}>
              <Icon size={24} />
            </div>
          </div>
          <h4 className="text-4xl font-black tracking-tight text-slate-900 leading-none mb-2">{value}</h4>
        </div>
        <div className="flex items-center gap-2 pt-6 border-t border-slate-50 mt-4">
          <span className={`text-xs font-bold ${color.includes('rose') ? 'text-rose-600' : 'text-brand-600'} flex items-center gap-0.5`}>
            {subvalue}
            <ArrowUpRight size={12} />
          </span>
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{subtitle}</span>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export default function ExecutiveDashboard({ data, onReset }: Props) {
  const [currentView, setCurrentView] = useState<ViewType>('overview');

  const globalMetrics = React.useMemo(() => {
        const sensor = data.sensor || [];
    const mandoYControl = data.mandoYControl || [];
    const jira2026 = data.jira2026 || [];
    const jira2025 = data.jira2025 || [];

    const totalItems = jira2025.length + sensor.length + mandoYControl.length;
    
    // Better critical logic (handles dashes and N/A correctly)
    const criticalSecurity = mandoYControl.filter(m => {
      const p = String(m.Prioridad || m.Criticidad || m['CRITICIDAD'] || '').toLowerCase().trim();
      if (p === '-' || p === '' || p === 'n/a' || p === 'no aplica') return false;
      return (p.includes('alta') || p.includes('criti') || p.includes('high')) && !p.includes('no critico') && !p.includes('no crítico');
    }).length;

    // Detect Governance Gaps for sidebar alert
    const governanceGapsCount = mandoYControl.filter(m => {
      const project = String(m['PROYECTO O TAREA'] || m['Proyecto'] || m['Tarea'] || '').trim().toLowerCase();
      // Skip if it's just a dash or empty
      if (!project || project === '-' || project === 'n/a') return false;
      
      let mapped = false;
      for (const key of Object.keys(SCOPE_MAPPING)) {
        if (project.includes(key.toLowerCase())) {
          mapped = true;
          break;
        }
      }
      return !mapped;
    }).length;

    // Governance coverage %
    const validMandoItems = mandoYControl.filter(m => {
      const p = String(m['PROYECTO O TAREA'] || m['Proyecto'] || m['Tarea'] || '').trim();
      return p && p !== '-';
    }).length;
    const governanceCoverage = validMandoItems > 0 
      ? Math.round(((validMandoItems - governanceGapsCount) / validMandoItems) * 100) 
      : 0;
    
    const completionRate = jira2025.filter(j => 
       String(j.Status || '').toLowerCase().match(/done|resuelto|cerrado|closed|completado/)
    ).length / (jira2025.length || 1);

    const securityPostcheck = 1 - (criticalSecurity / (mandoYControl.length || 1));
    const globalHealthIndex = Math.round((completionRate * 0.4 + securityPostcheck * 0.6) * 100);

    const jira2026Metrics = {
      total: jira2026.length,
      active: jira2026.filter(j => !String(j.Status || '').toLowerCase().match(/done|resuelto|cerrado|closed|completado/)).length,
      completed: jira2026.filter(j => String(j.Status || '').toLowerCase().match(/done|resuelto|cerrado|closed|completado/)).length,
    };

    const resolvedSensor = sensor.filter(s => String(s.Status || '').toLowerCase().match(/cerrado|resuelto|done|closed|completado/)).length;
    const weeklyPerformance = {
      resolved: Math.max(resolvedSensor, Math.round(resolvedSensor / 4)),
      overdue: sensor.filter(s => {
        const sla = String(s['SLA Status'] || s['semaforo'] || '').toLowerCase();
        return sla.includes('fuera') || sla.includes('atrasado') || sla.includes('vencido');
      }).length,
      compliance: (resolvedSensor / (sensor.length || 1)) * 100
    };

    return { totalItems, criticalSecurity, globalHealthIndex, jira2026Metrics, weeklyPerformance, governanceGaps: governanceGapsCount, governanceCoverage };
  }, [data]);

  const handleExport = () => {
    let exportData: any[] = [];
    let filename = '';

    if (currentView === 'overview' || currentView === 'jira2025') {
      exportData = data.jira2025;
      filename = 'Reporte_Jira_2025.xlsx';
    } else if (currentView === 'jira2026') {
      exportData = data.jira2026;
      filename = 'Reporte_Jira_2026.xlsx';
    } else if (currentView === 'teamInitiatives') {
      exportData = data.jira2026;
      filename = 'Reporte_Desempeño_Iniciativas.xlsx';
    } else if (currentView === 'sensor') {
      exportData = data.sensor;
      filename = 'Reporte_Sensor.xlsx';
    } else if (currentView === 'teamSupport') {
      exportData = data.sensor;
      filename = 'Reporte_Desempeño_Soporte.xlsx';
    } else if (currentView === 'mandoYControl') {
      exportData = data.mandoYControl;
      filename = 'Reporte_Mando_Control.xlsx';
    } else if (currentView === 'teamPerformance') {
      exportData = data.mandoYControl;
      filename = 'Reporte_Desempeño_Cyber.xlsx';
    }

    if (exportData.length > 0) {
      exportToStyledExcel(exportData, filename, filename.replace('.xlsx', '').replace(/_/g, ' '));
    } else {
      alert("No hay datos para exportar en esta vista.");
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col hide-scrollbar relative z-30">
        <div className="p-8">
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <div className="h-8 w-8 bg-brand-600 rounded-lg flex items-center justify-center text-white">
              <Shield size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tighter leading-none">MAC<span className="text-brand-600">.</span></span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Matriz Actividades Ciberseguridad</span>
            </div>
          </h1>
        </div>
        
        <nav className="flex-1 space-y-1 px-4 py-2">
          <NavItem 
            icon={<LayoutDashboard size={18} />} 
            label="Centro de Mando" 
            isActive={currentView === 'overview'} 
            onClick={() => setCurrentView('overview')} 
          />
          <div className="mt-8 mb-4 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Proyectos & KPI
          </div>
          <NavItem 
            icon={<Activity size={18} />} 
            label="Seguimiento 2025" 
            isActive={currentView === 'jira2025'} 
            onClick={() => setCurrentView('jira2025')} 
          />
          <NavItem 
            icon={<Target size={18} />} 
            label="Iniciativas 2026" 
            isActive={currentView === 'jira2026'} 
            onClick={() => setCurrentView('jira2026')} 
          />
          <NavItem 
            icon={<TrendingUp size={18} />} 
            label="Desempeño Iniciativas" 
            isActive={currentView === 'teamInitiatives'} 
            onClick={() => setCurrentView('teamInitiatives')} 
          />
          <div className="mt-8 mb-4 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Operaciones
          </div>
          <NavItem 
            icon={<Activity size={18} />} 
            label="Soporte Técnico" 
            isActive={currentView === 'sensor'} 
            onClick={() => setCurrentView('sensor')} 
          />
          <NavItem 
            icon={<Users size={18} />} 
            label="Desempeño Soporte" 
            isActive={currentView === 'teamSupport'} 
            onClick={() => setCurrentView('teamSupport')} 
          />
          <NavItem 
            icon={<ShieldAlert size={18} />} 
            label="Matriz MAC (Ciberseguridad)" 
            isActive={currentView === 'mandoYControl'} 
            onClick={() => setCurrentView('mandoYControl')} 
            alert={globalMetrics.criticalSecurity > 0}
          />
          <NavItem 
            icon={<Users size={18} />} 
            label="Desempeño de Equipo" 
            isActive={currentView === 'teamPerformance'} 
            onClick={() => setCurrentView('teamPerformance')} 
          />
          <NavItem 
            icon={<FileSearch size={18} />} 
            label="Gap Intelligence" 
            isActive={currentView === 'gapFinder'} 
            onClick={() => setCurrentView('gapFinder')} 
            alert={globalMetrics.governanceGaps > 0}
          />
        </nav>

        <div className="p-6 border-t border-slate-100 space-y-3 bg-slate-50/50">
          <Button variant="outline" className="w-full justify-start border-slate-200 text-slate-600 h-10 px-4 rounded-xl text-xs font-semibold" onClick={handleExport}>
            <Download size={14} className="mr-2 opacity-60" />
            Exportar CSV
          </Button>
          <Button variant="ghost" className="w-full justify-start text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-10 px-4 rounded-xl text-xs font-semibold" onClick={onReset}>
            <LogOut size={14} className="mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[#FBFBFC] relative">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between px-10 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl">
          <div className="flex flex-col">
             <h3 className="text-xl font-bold text-slate-900 tracking-tight">
               {currentView === 'overview' ? 'Resumen Ejecutivo' :
                currentView === 'sensor' ? 'Gestión de Telemetría' :
                currentView === 'mandoYControl' ? 'Resiliencia de Postura MAC' :
                currentView === 'gapFinder' ? 'Gap Intelligence & Bestiary Mapping' :
                currentView === 'teamInitiatives' ? 'Desempeño Iniciativas 2026' :
                currentView === 'teamSupport' ? 'Desempeño Soporte Técnico' :
                currentView === 'teamPerformance' ? 'Desempeño de Equipo' :
                `Portfolio de Proyectos ${currentView.replace('jira', '')}`}
             </h3>
             <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">
               {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
             </p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/40">
               <div className="px-4 py-2 bg-white rounded-xl shadow-sm text-xs font-bold text-slate-700 flex items-center gap-2">
                 <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 Sincronización Activa
               </div>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-brand-200 ring-4 ring-brand-50">
              MC
            </div>
          </div>
        </header>

        <div className="p-10 max-w-[1600px] mx-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {currentView === 'overview' && (
                <div className="space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    <div className="md:col-span-12 xl:col-span-5">
                      <Card className="h-full border-0 shadow-2xl shadow-brand-100/40 bg-slate-900 text-white overflow-hidden relative group rounded-3xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/50 to-transparent z-0" />
                        <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-1000 z-0">
                          <Activity size={240} />
                        </div>
                        <CardContent className="p-12 relative z-10 flex flex-col h-full">
                          <p className="text-brand-300 text-[10px] font-bold uppercase tracking-[0.25em] mb-10 opacity-70">Salud de Ejecución Global</p>
                          <div className="flex items-baseline gap-4 mb-2">
                            <span className="text-8xl font-black tracking-tighter text-white">{globalMetrics.globalHealthIndex}%</span>
                            <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-widest">
                              Estable
                            </div>
                          </div>
                          <div className="mt-auto space-y-4">
                             <div className="flex justify-between items-end">
                                <p className="text-xs font-medium text-brand-200/60 uppercase tracking-widest">Integridad Operativa</p>
                                <p className="text-sm font-bold text-brand-400">{globalMetrics.globalHealthIndex}%</p>
                             </div>
                             <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${globalMetrics.globalHealthIndex}%` }}
                                  transition={{ duration: 1.5, ease: "circOut" }}
                                  className="h-full bg-brand-500 shadow-[0_0_20px_rgba(99,102,241,0.6)]" 
                                />
                             </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="md:col-span-12 xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-8">
                       <StatCard 
                          title="Resiliencia Global"
                          value={`${globalMetrics.globalHealthIndex}%`}
                          subvalue="+2.4%"
                          subtitle="Salud Estratégica"
                          icon={Activity}
                          color="bg-brand-50 text-brand-600"
                          delay={0.1}
                       />
                       <StatCard 
                          title="Exposición de Riesgo"
                          value={globalMetrics.criticalSecurity}
                          subvalue={globalMetrics.criticalSecurity > 5 ? "Crítica" : "Controlada"}
                          subtitle="Iniciativas Sensibles"
                          icon={ShieldAlert}
                          color="bg-rose-50 text-rose-600"
                          delay={0.2}
                       />
                       <StatCard 
                          title="Gobernanza Cyber"
                          value={`${globalMetrics.governanceCoverage}%`}
                          subvalue={globalMetrics.governanceGaps > 0 ? `-${globalMetrics.governanceGaps} Gaps` : "Mapeo Total"}
                          subtitle="Alineación Estratégica"
                          icon={Target}
                          color="bg-emerald-50 text-emerald-600"
                          delay={0.3}
                       />
                       <StatCard 
                          title="Tickets en Caliente"
                          value={globalMetrics.weeklyPerformance.overdue}
                          subvalue="Retraso"
                          subtitle="Fuera de Fecha"
                          icon={AlertCircle}
                          color="bg-amber-50 text-amber-600"
                          delay={0.4}
                       />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-4">
                    <div className="space-y-6">
                       <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                             <div className="h-4 w-1 bg-brand-600 rounded-full" />
                             Métricas Proyectos TI
                          </h4>
                          <Button variant="ghost" size="sm" className="text-[10px] font-bold text-brand-600 uppercase tracking-widest hover:bg-brand-50 rounded-lg" onClick={() => setCurrentView('jira2025')}>
                             Ver Detalles <ArrowUpRight size={12} className="ml-1" />
                          </Button>
                       </div>
                       <JiraView data={data.jira2025} title="Estado Proyectos Activos" isOverview />
                    </div>

                    <div className="space-y-6">
                       <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                             <div className="h-4 w-1 bg-emerald-600 rounded-full" />
                             Continuidad Operativa
                          </h4>
                          <Button variant="ghost" size="sm" className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest hover:bg-emerald-50 rounded-lg" onClick={() => setCurrentView('sensor')}>
                             Ver Detalles <ArrowUpRight size={12} className="ml-1" />
                          </Button>
                       </div>
                       <SensorView data={data.sensor} isOverview />
                    </div>
                  </div>
                </div>
              )}
              
              {currentView === 'jira2025' && <JiraView data={data.jira2025} title="Gestión TI 2025" />}
              {currentView === 'jira2026' && <JiraView data={data.jira2026} title="Hoja de Ruta 2026" />}
              {currentView === 'teamInitiatives' && <TeamPerformanceView data={data.jira2026} title="Desempeño Iniciativas 2026" subtitle="Análisis de ejecución y efectividad del equipo TI en proyectos estratégicos (Tickets Jira)." />}
              {currentView === 'sensor' && <SensorView data={data.sensor} />}
              {currentView === 'teamSupport' && <TeamPerformanceView data={data.sensor} title="Desempeño Soporte Técnico" subtitle="Auditoría de resolución de tickets, atención al usuario y cumplimiento de SLA operativo." />}
              {currentView === 'mandoYControl' && <CyberView data={data.mandoYControl || []} title="Cumplimiento & Riesgos" />}
              {currentView === 'gapFinder' && <GapFinderView data={data.mandoYControl || []} />}
              {currentView === 'teamPerformance' && <TeamPerformanceView data={data.mandoYControl || []} title="Productividad Ciberseguridad" subtitle="Auditoría de velocidad y gestión del equipo ante vulnerabilidades y cumplimiento." />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
