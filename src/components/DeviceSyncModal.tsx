import React, { useState } from 'react';
import { QrCode, Smartphone, Laptop, ArrowRightLeft, X, Copy, Check, Share2 } from 'lucide-react';
import { Ficha, ProjectData } from '../types';
import { exportProjectBackup, parseProjectBackup } from '../utils/helpers';

interface DeviceSyncModalProps {
  fichas: Ficha[];
  projectData: ProjectData;
  catalogos: Record<string, string[]>;
  onImportFichas: (fichas: Ficha[], project?: ProjectData, catalogos?: Record<string, string[]>) => void;
  onClose: () => void;
}

export const DeviceSyncModal: React.FC<DeviceSyncModalProps> = ({
  fichas,
  projectData,
  catalogos,
  onImportFichas,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'qr' | 'code'>('link');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const currentUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';

  // Generate lightweight sync code for easy transfer between PC & Mobile
  const generateTransferPackage = () => {
    return JSON.stringify({
      v: 4,
      ts: Date.now(),
      p: projectData,
      f: fichas.map((f) => ({
        ...f,
        // Include fotos if not excessively large, otherwise keep essentials
        fotos: f.fotos.slice(0, 10),
      })),
      c: catalogos,
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Relevamiento Arquitectónico',
          text: `Accede a la herramienta de relevamiento arquitectónico: ${projectData.proyecto || 'Proyecto'}`,
          url: currentUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyDataCode = async () => {
    try {
      const code = btoa(unescape(encodeURIComponent(generateTransferPackage())));
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch (err) {
      alert('No se pudo copiar el código automáticamente. Usa la exportación de archivo.');
    }
  };

  const handleApplyDataCode = () => {
    try {
      if (!inputCode.trim()) {
        alert('Ingresa el código de sincronización.');
        return;
      }
      const jsonStr = decodeURIComponent(escape(atob(inputCode.trim())));
      const pkg = JSON.parse(jsonStr);

      if (!pkg || !Array.isArray(pkg.f)) {
        throw new Error('Estructura de datos no válida.');
      }

      onImportFichas(pkg.f, pkg.p, pkg.c);
      setImportStatus(`¡Sincronizado! Se cargaron ${pkg.f.length} ambiente(s).`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      alert('Error al leer el código de transferencia: ' + (err.message || 'Código inválido'));
    }
  };

  // QR Code URL using public static API (safe, no keys required)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(
    currentUrl
  )}`;

  return (
    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 print:hidden animate-in fade-in">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#17365d] text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-2.5">
            <ArrowRightLeft size={20} className="text-sky-300" />
            <div>
              <h2 className="text-base sm:text-lg font-bold">Vincular & Asociar PC y Móvil</h2>
              <p className="text-xs text-sky-200/80">Trabaja en campo con el celular y continúa en la computadora</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Device association visual */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-center space-x-4 text-xs font-medium text-slate-600">
          <div className="flex items-center space-x-1.5 text-blue-900">
            <Laptop size={18} className="text-blue-700" />
            <span>Computadora (Oficina)</span>
          </div>
          <ArrowRightLeft size={16} className="text-slate-400" />
          <div className="flex items-center space-x-1.5 text-emerald-900">
            <Smartphone size={18} className="text-emerald-600" />
            <span>Teléfono / Tablet (Obra)</span>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-200 bg-white text-xs sm:text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              activeTab === 'link'
                ? 'border-blue-600 text-blue-800 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Abrir en Móvil (QR / Link)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              activeTab === 'code'
                ? 'border-blue-600 text-blue-800 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            2. Traspasar Datos entre Equipos
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-slate-700">
          {activeTab === 'link' && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-800">
                  Escanea el código QR con la cámara de tu celular
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Se abrirá la aplicación directamente en tu navegador móvil sin necesidad de instalar nada desde la tienda.
                </p>
              </div>

              {/* QR display */}
              <div className="flex justify-center p-3 bg-slate-50 rounded-xl border border-slate-200 max-w-xs mx-auto">
                <img
                  src={qrImageUrl}
                  alt="Código QR para abrir en móvil"
                  className="w-48 h-48 object-contain rounded-lg shadow-sm bg-white p-2"
                />
              </div>

              {/* URL field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">O copia el enlace directo para enviártelo:</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={currentUrl}
                    className="flex-1 p-2 bg-slate-100 border border-slate-300 rounded text-xs text-slate-700 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold shrink-0 transition-colors"
                  >
                    {copiedLink ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
                    {copiedLink ? '¡Copiado!' : 'Copiar'}
                  </button>
                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <button
                      type="button"
                      onClick={handleNativeShare}
                      className="flex items-center px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-semibold shrink-0 transition-colors"
                      title="Compartir enlace"
                    >
                      <Share2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded text-xs text-emerald-900">
                <strong>Consejo Móvil:</strong> Una vez que abras el enlace en tu celular, pulsa el botón verde <strong>&quot;Instalar App&quot;</strong> en la barra superior (o en Safari: <em>Compartir &gt; Agregar a pantalla de inicio</em>). Podrás usar la app en campo incluso sin conexión a internet.
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-5">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-sm font-bold text-blue-900 mb-1">
                  Paso A: Enviar datos desde este equipo
                </h4>
                <p className="text-xs text-slate-600 mb-3">
                  Genera una clave de traspaso rápida con todos los ambientes actuales ({fichas.length} registrados).
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCopyDataCode}
                    className="flex items-center px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                  >
                    {copiedCode ? <Check size={14} className="mr-1.5" /> : <Copy size={14} className="mr-1.5" />}
                    {copiedCode ? '¡Código copiado al portapapeles!' : 'Copiar código de transferencia rápida'}
                  </button>
                  <button
                    type="button"
                    onClick={() => exportProjectBackup(fichas, projectData, catalogos)}
                    className="flex items-center px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Descargar archivo .json
                  </button>
                </div>
              </div>

              <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200">
                <h4 className="text-sm font-bold text-blue-900 mb-1">
                  Paso B: Recibir datos en este equipo
                </h4>
                <p className="text-xs text-slate-600 mb-2">
                  Pega aquí el código copiado desde tu celular u otra PC para fusionar los ambientes:
                </p>
                <textarea
                  rows={3}
                  placeholder="Pega aquí el código de transferencia..."
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:ring-2 focus:ring-blue-500 mb-2"
                />
                <button
                  type="button"
                  onClick={handleApplyDataCode}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center justify-center"
                >
                  <ArrowRightLeft size={14} className="mr-1.5" /> Importar y Sincronizar Ambientes
                </button>
                {importStatus && (
                  <p className="mt-2 text-xs font-bold text-emerald-700 text-center animate-pulse">
                    {importStatus}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
