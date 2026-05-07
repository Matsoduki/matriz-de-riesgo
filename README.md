# Matriz de Actividades y Cuadro de Mando Ejecutivo

Este proyecto es una aplicación web SPA (Single Page Application) diseñada para ofrecer un **Dashboard Ejecutivo y de Operaciones** a partir de la importación de datos en formato Excel. Su principal objetivo es proporcionar una visualización clara y procesable de iniciativas, estado de proyectos y métricas de seguridad o riesgo (sensores, KPIs operativos, etc.).

## Características Principales

*   **Carga Local y Segura (Client-Side):** El procesamiento del archivo Excel se realiza de manera íntegra en el navegador. No se envía información a servidores externos ni a la nube, garantizando así la privacidad de los datos sensibles y el cumplimiento de las políticas de seguridad.
*   **Gestión TI y Hoja de Ruta:** Visualización del portfolio de proyectos e iniciativas para el ciclo de gestión, permitiendo analizar estados, prioridades y tiempos.
*   **Desempeño y Carga Operativa:** Herramienta enfocada en analizar el rendimiento individual y de equipo respecto a la resolución de tickets y las cargas de trabajo asignadas.
*   **Cumplimiento y Riesgos (Mando y Control):** Visualización táctica orientada al área de Ciberseguridad, permitiendo tener control sobre vulnerabilidades, riesgos y resiliencia corporativa.
*   **Exportación Segmentada:** Funcionalidad integrada para exportar reportes procesados a archivos Excel, conservando los filtros aplicados en el cuadro de mando.

## Arquitectura y Tecnologías

El proyecto se fundamenta en un _stack_ tecnológico moderno y optimizado para el ecosistema frontend:

*   **Framework Base:** [React](https://reactjs.org/) (Versión 18+)
*   **Herramienta de Construcción:** [Vite](https://vitejs.dev/)
*   **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
*   **Estilos y Componentes:** [Tailwind CSS](https://tailwindcss.com/)
*   **Librería de Gráficos:** [Recharts](https://recharts.org/)
*   **Íconos:** [Lucide-React](https://lucide.dev/)
*   **Manejo de Formularios/Datos:** Exportación y manipulación de Excel en cliente (XLSX).

## Despliegue y Consideraciones de Seguridad

Esta herramienta está concebida para ser desplegada en entornos estáticos y controlados (por ejemplo, Netlify, Vercel, o servidores web internos). 

### Seguridad y Configuración (Headers)

Para asegurar la integridad de la herramienta, se han preconfigurado estrictas políticas de CSP (Content-Security-Policy) a través del archivo `netlify.toml` cuando se haga el pase a un servidor de despliegue como Netlify. Esto contempla medidas como:
*   Bloqueo de peticiones externas (XHR/Fetch) a dominios ajenos.
*   Evitar inyección y ejecución de scripts arbitrarios en entorno de producción.
*   Bloqueo contra _clickjacking_ (`X-Frame-Options`).

## Desarrollo y Uso Local

Para desplegar la aplicación en tu entorno de desarrollo, sigue estos pasos:

### 1. Clonar e Instalar
Debes clonar este repositorio en tu sistema y luego instalar las dependencias con NPM (o tu gestor de paquetes favorito):

```sh
npm install
```

### 2. Levantar el Servidor de Desarrollo
Para correr la aplicación de forma local, utiliza el siguiente comando:

```sh
npm run dev
```

La aplicación se ejecutará en modo local y podrás acceder a ella a través de la ruta que Vite te proporcionará en la consola de comandos.

### 3. Construcción para Producción
Para compilar la aplicación y prepararla para el paso a producción (Hosting Estático):

```sh
npm run build
```

Este comando tomará todos los recursos, los minimizará y generará la carpeta `dist/` que está lista para ser desplegada sin necesidad de backend o bases de datos externas asociadas al aplicativo web en sí mismo.
