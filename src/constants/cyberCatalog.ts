
export type PriorityLevel = 'Crítico' | 'Alto' | 'Medio' | 'Bajo';

export interface SLAPolicy {
  external: number;
  internal: number;
  endpoint: number;
}

export const CYBER_SLA_POLICIES: Record<PriorityLevel, SLAPolicy> = {
  'Crítico': { external: 5, endpoint: 7, internal: 30 },
  'Alto': { external: 30, endpoint: 60, internal: 90 },
  'Medio': { external: 60, endpoint: 90, internal: 120 },
  'Bajo': { external: 90, endpoint: 180, internal: 360 }, // N/C represented as long periods
};

export const SCOPE_MAPPING: Record<string, string> = {
  vulnerabilidades: 'Vulnerability Management',
  tanium: 'Vulnerability Management',
  defender: 'Vulnerability Management',
  trendmicro: 'Vulnerability Management',
  mandiant: 'Vulnerability Management',
  zscaler: 'Vulnerability Management',
  pathfinder: 'Vulnerability Management',
  'ethical hacker': 'Vulnerability Management',
  flexera: 'Vulnerability Management',
  cyberark: 'IAM (Identity & Access Management)',
  'local admin': 'IAM (Identity & Access Management)',
  'cuentas de usuario': 'IAM (Identity & Access Management)',
  om: 'Operations Management',
  hotfix: 'Operations Management',
  lyra: 'Operations Management',
  'lyra lis': 'Operations Management',
  rce: 'Operations Management',
  agfa: 'Operations Management',
  run: 'Operations Management',
  'portal unico': 'Operations Management',
  sensr: 'Operations Management',
  'cierre de tickets': 'Operations Management',
  'app moviles': 'Application Security',
  'evaluaciones de programas': 'Application Security',
  'bloqueos de maquinas': 'Application Security',
  kpi: 'Governance & Compliance',
  comité: 'Governance & Compliance',
  comite: 'Governance & Compliance',
  auditoria: 'Governance & Compliance',
  'politicas y/o normas ebm': 'Governance & Compliance',
  'enterprise information security': 'Governance & Compliance',
  'enterprise information security (eis) optum': 'Governance & Compliance',
  'eis optum': 'Governance & Compliance',
  'reuniones uhg': 'Meetings & Collaboration',
  'reuniones internas': 'Meetings & Collaboration',
  'war room': 'Meetings & Collaboration',
  'actualización ppt': 'Meetings & Collaboration',
  proveedores: 'Vendor Management',
  'solicitudes extraordinarias uhg': 'Vendor Management',
  'incidencia operacional': 'Incident Management',
};

export const AMBITO_GROUPS: Record<string, string> = {
  usb: 'Dispositivos',
  proyectos: 'Gestión',
  troubleshooting: 'Soporte',
  mfa: 'Seguridad/IAM',
  'incidentes operacionales': 'Operaciones',
  'aplcaciones no autorizadas': 'Seguridad/Apps',
  'trafico sospechoso': 'Seguridad/Red',
  'ejecuciones sospechisas': 'Seguridad/Endpoint',
  brigth: 'Herramientas',
  'security platform': 'Herramientas',
  'bloqueos de maquinas': 'Operaciones',
  pathfinder: 'Herramientas',
  'aprobación de puertos': 'Seguridad/Red',
  'aprobación usb': 'Dispositivos',
  'reglas de red': 'Seguridad/Red',
  'excepción zscaler': 'Excepciones',
  'excepción paloalto': 'Excepciones',
  'excepcion soc': 'Excepciones',
  reuniones: 'Gestión',
  'actualización ppt': 'Documentación',
  defender: 'Herramientas',
  tanium: 'Herramientas',
  trendmicro: 'Herramientas',
  'enterprise information security (eis) optum': 'Compliance',
  vulnerabilidades: 'Seguridad',
  'cuentas de usuario': 'Seguridad/IAM',
  hotfix: 'Operaciones',
  eds: 'Operaciones',
  ecab: 'Operaciones',
  entrenamiento: 'Capacitación',
  presentaciones: 'Documentación',
  'aprovisionamiento usuario': 'Seguridad/IAM',
  'compra de licencia': 'Adquisiciones',
};
