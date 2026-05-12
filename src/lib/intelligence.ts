import { isResolvedStatus } from './excelParser';

export interface Insight {
  type: 'risk' | 'opportunity' | 'achievement' | 'trend';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  metric?: string;
  priority: number; // 0 to 10
}

export interface OperationalAnalysis {
  healthScore: number;
  burnoutRisk: number; // 0 to 100
  throughputVelocity: number;
  slaCompliance: number;
  bottlenecks: string[];
  insights: Insight[];
}

/**
 * Motor de Análisis Operativo para Gestión de Riesgos (GRC)
 * Analiza dinámicamente los datos operativos para generar hallazgos de auditoría y negocio.
 */
export function analyzeOperationalData(data: any[]): OperationalAnalysis {
  if (!data || data.length === 0) {
    return {
      healthScore: 0,
      burnoutRisk: 0,
      throughputVelocity: 0,
      slaCompliance: 0,
      bottlenecks: [],
      insights: []
    };
  }

  const total = data.length;
  // Búsqueda exhaustiva de estados de resolución
  const resolved = data.filter(r => {
    const s = String(r.Status || r.Estado || r['Finalizado'] || '').toLowerCase();
    return isResolvedStatus(s) || s.includes('cerr') || s.includes('resolve') || s.includes('done');
  }).length;
  
  const inProgress = data.filter(r => {
    const s = String(r.Status || r.Estado || '').toLowerCase();
    return s.includes('prog') || s.includes('dev') || s.includes('work') || s.includes('anal');
  }).length;

  const slaComplianceCount = data.filter(r => {
    const s = String(r['SLA Status'] || r['Cumplimiento'] || r['semaforo'] || r['SLA'] || '').toLowerCase();
    return s.includes('cumple') || s.includes('dentro') || s.includes('ok') || s === 'verde' || s.includes('yes');
  }).length;

  const slaCompliance = (slaComplianceCount / total) * 100;
  const throughput = (resolved / total) * 100;
  
  // Concentración de Carga (Riesgo Operativo / GRC)
  const assigneeCounts: Record<string, number> = {};
  data.forEach(r => {
    const assignee = String(r.Asignado || r.Responsable || r['Owner'] || r['Analista'] || 'Sin Asignar');
    assigneeCounts[assignee] = (assigneeCounts[assignee] || 0) + 1;
  });

  const memberCounts = Object.values(assigneeCounts);
  const avgLoad = total / Math.max(Object.keys(assigneeCounts).length, 1);
  const maxLoad = Math.max(...memberCounts);
  const loadConcentration = maxLoad / Math.max(avgLoad, 1);
  // Re-mapear Burnout a Saturación de Recurso Crítico
  const burnoutRisk = Math.min(Math.max((loadConcentration - 1.5) * 50, 0), 100);

  const insights: Insight[] = [];

  // Lógica de Generación de Hallazgos (Auditoría)
  if (burnoutRisk > 70) {
    insights.push({
      type: 'risk',
      title: 'Crítico: Concentración de Riesgo en Recurso',
      description: `Se detectó dependencia crítica (${loadConcentration.toFixed(1)}x sobre el promedio) en roles específicos. Incumplimiento potencial por falta de redundancia operativa.`,
      impact: 'high',
      priority: 9
    });
  }

  if (slaCompliance < 85) {
    insights.push({
      type: 'trend',
      title: 'Desviación en Nivel de Servicio (SLA)',
      description: `El cumplimiento consolidado está en ${slaCompliance.toFixed(1)}%. Se requiere ajuste en la matriz de prioridades o recursos de soporte.`,
      impact: 'high',
      priority: 8
    });
  }

  if (throughput > 40 && inProgress < 20) {
    insights.push({
      type: 'opportunity',
      title: 'Capacidad Operativa Disponible',
      description: 'El ratio de cierre supera la ingesta actual. Oportunidad para saneamiento de registros históricos o auditoría interna.',
      impact: 'medium',
      priority: 4
    });
  }

  const criticalIssues = data.filter(r => {
    const p = String(r.Prioridad || r.Criticidad || r['Priority'] || '').toLowerCase();
    return p.includes('alta') || p.includes('criti') || p.includes('high') || p.includes('1');
  }).length;

  if (criticalIssues > (total * 0.3)) {
    insights.push({
      type: 'risk',
      title: 'Hallazgo: Alta Densidad de Incidencias Críticas',
      description: 'Más del 30% de la matriz se clasifica como Crítica/Alta. Riesgo de degradación de servicio por saturación de escalamientos.',
      impact: 'high',
      priority: 10
    });
  }

  const healthScore = Math.round((throughput * 0.4 + slaCompliance * 0.5 + (100 - burnoutRisk) * 0.1));

  return {
    healthScore,
    burnoutRisk,
    throughputVelocity: throughput,
    slaCompliance,
    bottlenecks: [], 
    insights: insights.sort((a, b) => b.priority - a.priority)
  };
}
