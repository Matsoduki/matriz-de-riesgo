import React, { useCallback, useState } from 'react';
import { UploadCloud, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from './ui';

interface Props {
  onUpload: (file: File) => void;
  isLoading: boolean;
}

export function FileUploader({ onUpload, isLoading }: Props) {
  const [isDragging, setIsDragging] = useState(false);

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

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-blue-100 p-3 text-blue-600">
              <UploadCloud size={40} />
            </div>
            <h2 className="mb-2 text-xl font-bold text-slate-800">Cargar Archivo Excel</h2>
            <p className="mb-6 text-sm text-slate-500">
              Carga tu excel para visualizar tus métricas y cuadros de mando.
            </p>

            <label
              className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
              }`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <span className="text-sm font-medium text-slate-600">
                {isLoading ? "Procesando..." : "Arrastra y suelta tu archivo aquí"}
              </span>
              <span className="mt-1 text-xs text-slate-400">o haz clic para explorar</span>
              <input
                type="file"
                className="hidden"
                accept=".xlsx, .xls, .csv"
                onChange={onFileChange}
                disabled={isLoading}
              />
            </label>

            <div className="mt-6 flex items-start gap-3 rounded-lg bg-green-50 p-4 text-left border border-green-100">
              <ShieldCheck className="mt-0.5 text-green-600 shrink-0" size={18} />
              <p className="text-xs text-green-800 leading-relaxed">
                <strong>Privacidad garantizada:</strong> Tu información está segura. Este dashboard funciona completamente en tu navegador (Client-Side). El archivo Excel que subas no se enviará a la nube, ni será almacenado en ningún servidor externo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
