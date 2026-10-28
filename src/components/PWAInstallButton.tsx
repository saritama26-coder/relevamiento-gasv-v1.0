import React, { useState } from 'react';
import { Smartphone, Download, Check, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already installed and running standalone, hide button
  if (isInstalled) {
    return (
      <span className="hidden md:inline-flex items-center text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded">
        <Check size={13} className="mr-1 text-emerald-400" /> App Instalada
      </span>
    );
  }

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 4000);
    }
  };

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <>
        <button
          type="button"
          onClick={handleInstallClick}
          className="flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs sm:text-sm font-semibold shadow-sm transition-all animate-pulse hover:animate-none"
          title="Instalar como aplicación en este dispositivo (móvil o PC)"
        >
          <Smartphone size={16} className="mr-1.5" />
          <span>Instalar App</span>
        </button>
        {installSuccess && (
          <div className="fixed top-16 right-4 z-50 bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-xl text-sm flex items-center">
            <Check size={16} className="mr-2" /> ¡Aplicación instalada exitosamente!
          </div>
        )}
      </>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs sm:text-sm font-semibold border border-slate-500/40 transition-colors"
          title="Instalar en iPhone o iPad"
        >
          <Download size={15} className="mr-1.5 text-blue-300" />
          <span>Instalar en iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-2">
                  <Smartphone className="text-blue-600" size={24} />
                  <h3 className="text-lg font-bold">Instalar en iPhone / iPad</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Para usar la aplicación en pantalla completa sin conexión y como app nativa:
              </p>
              <ol className="list-decimal ml-5 text-sm space-y-2 text-slate-700 mb-5">
                <li>
                  Toca el botón <strong>Compartir</strong> (ícono de cuadro con flecha hacia arriba) en la barra inferior de Safari.
                </li>
                <li>
                  Desliza hacia abajo y presiona <strong>&quot;Agregar a inicio&quot;</strong> (o <em>Add to Home Screen</em>).
                </li>
                <li>
                  Confirma tocando <strong>&quot;Agregar&quot;</strong> en la esquina superior derecha.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
