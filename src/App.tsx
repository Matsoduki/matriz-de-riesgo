import React, { useState } from 'react';
import { FileUploader } from './components/FileUploader';
import ExecutiveDashboard from './components/ExecutiveDashboard';
import { parseExcelFile, DashboardData } from './lib/excelParser';

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const handleZoom = () => {
      if (window.innerWidth < 1400) {
        (document.body.style as any).zoom = "0.75";
      } else {
        (document.body.style as any).zoom = "1";
      }
    };
    handleZoom();
    window.addEventListener('resize', handleZoom);
    return () => window.removeEventListener('resize', handleZoom);
  }, []);

  const handleUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const parsedData = await parseExcelFile(file);
      setData(parsedData);
    } catch (err: any) {
      console.error(err);
      setError("Error al leer el archivo. Asegúrate de que sea un archivo Excel (.xlsx) o CSV (.csv) válido.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setData(null);
  };

  if (data) {
    return <ExecutiveDashboard data={data} onReset={handleReset} />;
  }

  return (
    <div className="relative min-h-screen bg-slate-50">
      {error && (
        <div className="absolute top-4 inset-x-0 mx-auto max-w-md bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-center z-50">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button 
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            &times;
          </button>
        </div>
      )}
      <FileUploader onUpload={handleUpload} isLoading={isLoading} />
    </div>
  );
}
