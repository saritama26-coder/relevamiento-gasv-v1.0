import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Plus,
  Save,
  LayoutList,
  Layers,
  BookOpen,
  FileDown,
  Download,
  Upload,
  Printer,
  Pencil,
  Copy,
  Trash,
  ArrowRightLeft,
  Smartphone,
  Menu,
  X,
} from 'lucide-react';
import { Ficha, ProjectData, CatalogosMap } from './types';
import { StorageService } from './services/storage';
import { CatalogProvider } from './context/CatalogContext';
import { FichaForm } from './components/FichaForm';
import { ManualModal } from './components/ManualModal';
import { ConsolidatedReport } from './components/ConsolidatedReport';
import { PWAInstallButton } from './components/PWAInstallButton';
import { DeviceSyncModal } from './components/DeviceSyncModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { GSARITAMA_HEADER_LOGO } from './constants/logoData';
import { GoogleDriveBackupModal } from './components/GoogleDriveBackupModal';
import { GoogleDriveService, BackupPayload } from './services/googleDriveService';
import { getAccessToken } from './services/googleAuth';
import { Cloud, CloudCheck, CloudUpload } from 'lucide-react';
import {
  createEmptyFicha,
  exportCSV,
  exportProjectBackup,
  parseProjectBackup,
  calculateArea,
  sanitizeFilename,
  formatTimestamp,
  nextConsecutive,
} from './utils/helpers';

export default function App() {
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [projectData, setProjectData] = useState<ProjectData>({
    proyecto: '',
    ubicacion: '',
    bloque: '',
  });
  const [activeFicha, setActiveFicha] = useState<Ficha>(createEmptyFicha());
  const [catalogos, setCatalogos] = useState<CatalogosMap>({});

  // UI States
  const [showDrawer, setShowDrawer] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showConsolidated, setShowConsolidated] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showGDriveModal, setShowGDriveModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedAmbienteId, setSelectedAmbienteId] = useState<string | null>(null);

  // Google Drive cloud backup states
  const [gdriveAutoStatus, setGdriveAutoStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastGdriveBackupTime, setLastGdriveBackupTime] = useState<string | null>(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage
        ? localStorage.getItem('gdrive_last_backup_time')
        : null;
    } catch {
      return null;
    }
  });
  const [gdriveAutoError, setGdriveAutoError] = useState<string | null>(null);

  // Auto-save & Status
  const [saveStatus, setSaveStatus] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Duplicate modal
  const [dupTargetId, setDupTargetId] = useState<string | null>(null);
  const [dupCodigo, setDupCodigo] = useState('');
  const [dupAmbiente, setDupAmbiente] = useState('');

  const isFirstMount = useRef(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const projectBackupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load initial data
  useEffect(() => {
    StorageService.getProjectData().then(setProjectData);
    StorageService.getFichas().then(setFichas);
    StorageService.getCatalogos().then(setCatalogos);

  }, []);

  // Trigger Google Drive auto-backup when fichas or project data are updated
  const triggerGoogleDriveAutoBackup = useCallback(
    async (currentFichas: Ficha[], currentProj: ProjectData, currentCats: CatalogosMap) => {
      let isEnabled = true;
      try {
        isEnabled = localStorage.getItem('gdrive_auto_backup_enabled') !== 'false';
      } catch {
        isEnabled = false;
      }
      if (!isEnabled) return;

      const token = await getAccessToken();
      if (!token) {
        // Do not misreport a missing/expired OAuth token as a successful backup.
        if (lastGdriveBackupTime) {
          setGdriveAutoStatus('error');
          setGdriveAutoError('Vuelve a autorizar Google Drive para continuar con los respaldos.');
        }
        return;
      }

      setGdriveAutoStatus('syncing');
      setGdriveAutoError(null);

      try {
        const payload: BackupPayload = {
          version: '4.0',
          app: 'Relevamiento Arquitectonico GSARITAMA',
          timestamp: new Date().toISOString(),
          projectData: currentProj,
          catalogosPersonalizados: currentCats,
          fichas: currentFichas,
        };

        await GoogleDriveService.uploadBackup(token, payload, false);
        const now = new Date().toISOString();
        setLastGdriveBackupTime(now);
        try {
          localStorage.setItem('gdrive_last_backup_time', now);
        } catch {
          // ignore in sandboxed environments
        }
        setGdriveAutoStatus('synced');
      } catch (err: any) {
        console.error('Error in Google Drive auto-backup:', err);
        setGdriveAutoStatus('error');
        setGdriveAutoError(err.message || 'Error al respaldar en Drive');
      }
    },
    [lastGdriveBackupTime]
  );

  // Manual backup trigger helper for modal
  const handleManualGDriveBackup = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) throw new Error('Autoriza nuevamente Google Drive para crear el respaldo.');

    const payload: BackupPayload = {
      version: '4.0',
      app: 'Relevamiento Arquitectonico GSARITAMA',
      timestamp: new Date().toISOString(),
      projectData,
      catalogosPersonalizados: catalogos,
      fichas,
    };

    await GoogleDriveService.uploadBackup(token, payload, true);
    const now = new Date().toISOString();
    setLastGdriveBackupTime(now);
    try {
      localStorage.setItem('gdrive_last_backup_time', now);
    } catch {
      // ignore
    }
    setGdriveAutoStatus('synced');
  }, [projectData, catalogos, fichas]);

  // Autosave ficha with debounce
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (!String(activeFicha.codigo || '').trim() || !String(activeFicha.ambiente || '').trim()) {
      setSaveStatus('');
      return;
    }

    setHasUnsavedChanges(true);
    setSaveStatus('Cambios sin guardar…');

    const timer = setTimeout(async () => {
      try {
        await StorageService.saveFicha(activeFicha);
        const updatedFichas = await StorageService.getFichas();
        setFichas(updatedFichas);
        setHasUnsavedChanges(false);
        setSaveStatus(`Guardado automático ${new Date().toLocaleTimeString('es-EC')}`);
        // Auto-backup to Google Drive in background
        triggerGoogleDriveAutoBackup(updatedFichas, projectData, catalogos);
      } catch (err) {
        console.error('Error in autosave:', err);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [activeFicha]);

  // Warn on page unload if unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Sync print document title and text formatting
  const getPrintFilename = useCallback(() => {
    return `Relevamiento_${projectData.proyecto || 'Proyecto'}_${activeFicha.codigo || activeFicha.ambiente || 'Ficha'}`;
  }, [projectData.proyecto, activeFicha.codigo, activeFicha.ambiente]);

  useEffect(() => {
    let originalTitle = '';
    const beforePrint = () => {
      originalTitle = document.title;
      document.title = `${sanitizeFilename(getPrintFilename())}_${formatTimestamp()}`;
      // Replace input elements with text spans for print
      document.querySelectorAll('input, select, textarea').forEach((el) => {
        if (el instanceof HTMLInputElement && ['file', 'radio', 'checkbox', 'hidden'].includes(el.type)) return;
        const span = document.createElement('span');
        span.className = 'gsv-print-value';

        let textVal = '';
        if (el instanceof HTMLSelectElement) {
          textVal = el.selectedOptions[0]?.textContent ?? el.value ?? '';
        } else if (el instanceof HTMLTextAreaElement) {
          textVal = el.value || '';
        } else if (el instanceof HTMLInputElement) {
          if (el.type === 'number' && String(el.value).trim() !== '') {
            const num = parseFloat(String(el.value).replace(',', '.'));
            textVal = isNaN(num) ? el.value : num.toFixed(2);
          } else if (el.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(el.value)) {
            const [y, m, d] = el.value.split('-');
            textVal = `${d}/${m}/${y}`;
          } else {
            textVal = el.value || '';
          }
        }

        span.textContent = textVal;
        (el as any).dataset.gsvDisplay = (el as HTMLElement).style.display;
        (el as HTMLElement).style.display = 'none';
        el.insertAdjacentElement('afterend', span);
      });
    };

    const afterPrint = () => {
      document.querySelectorAll('.gsv-print-value').forEach((s) => s.remove());
      document.querySelectorAll('[data-gsv-display]').forEach((el) => {
        (el as HTMLElement).style.display = (el as any).dataset.gsvDisplay || '';
        delete (el as any).dataset.gsvDisplay;
      });
      if (originalTitle) document.title = originalTitle;
    };

    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, [getPrintFilename]);

  const loadFicha = (f: Ficha) => {
    isFirstMount.current = true;
    setActiveFicha(f);
    setHasUnsavedChanges(false);
    setSaveStatus('');
  };

  const handleAddCatalogos = async (items: { listId: string; valor: string }[]) => {
    const updated = { ...catalogos };
    items.forEach(({ listId, valor }) => {
      const list = updated[listId] || [];
      if (!list.some((it) => it.toLowerCase() === valor.toLowerCase())) {
        updated[listId] = [...list, valor];
      }
    });
    setCatalogos(updated);
    await StorageService.saveCatalogos(updated);
    const currentFichas = await StorageService.getFichas();
    triggerGoogleDriveAutoBackup(currentFichas, projectData, updated);
  };

  const handleUpdateProjectData = (field: keyof ProjectData, val: string) => {
    const updated = { ...projectData, [field]: val };
    setProjectData(updated);
    void StorageService.saveProjectData(updated);
    if (projectBackupTimer.current) clearTimeout(projectBackupTimer.current);
    projectBackupTimer.current = setTimeout(async () => {
      const [currentFichas, currentCatalogos] = await Promise.all([
        StorageService.getFichas(),
        StorageService.getCatalogos(),
      ]);
      triggerGoogleDriveAutoBackup(currentFichas, updated, currentCatalogos);
    }, 2500);
  };

  const isFormValid = Boolean(String(activeFicha.codigo || '').trim() && String(activeFicha.ambiente || '').trim());

  const handleManualSave = async () => {
    if (!String(activeFicha.codigo || '').trim() || !String(activeFicha.ambiente || '').trim()) {
      return;
    }
    await StorageService.saveFicha(activeFicha);
    const updated = await StorageService.getFichas();
    setFichas(updated);
    setHasUnsavedChanges(false);
    setSaveStatus(`Guardado ${new Date().toLocaleTimeString('es-EC')}`);
    triggerGoogleDriveAutoBackup(updated, projectData, catalogos);
    alert('Ficha guardada correctamente en el navegador.');
  };

  const handleNuevoAmbiente = () => {
    if (hasUnsavedChanges) {
      const ok = confirm('La ficha actual tiene cambios sin guardar. ¿Crear un ambiente nuevo de todos modos?');
      if (!ok) return;
    } else {
      const ok = confirm('¿Crear un ambiente nuevo? Asegúrese de haber guardado sus cambios.');
      if (!ok) return;
    }
    loadFicha(createEmptyFicha());
  };

  const handleSelectAmbiente = (id: string) => {
    const found = fichas.find((f) => f.id === id);
    if (found) {
      loadFicha(found);
      setShowDrawer(false);
    }
  };

  const handleDeleteAmbiente = async (id: string) => {
    if (confirm('¿Eliminar definitivamente esta ficha?')) {
      await StorageService.deleteFicha(id);
      const updated = await StorageService.getFichas();
      setFichas(updated);
      triggerGoogleDriveAutoBackup(updated, projectData, catalogos);
      if (selectedAmbienteId === id) setSelectedAmbienteId(null);
      if (activeFicha.id === id) loadFicha(createEmptyFicha());
    }
  };

  const handleOpenDuplicate = (id: string) => {
    const target = fichas.find((f) => f.id === id);
    if (!target) {
      alert('Seleccione un ambiente.');
      return;
    }
    setDupCodigo(nextConsecutive(target.codigo));
    setDupAmbiente(nextConsecutive(target.ambiente));
    setDupTargetId(target.id);
  };

  const handleConfirmDuplicate = async () => {
    const target = fichas.find((f) => f.id === dupTargetId);
    if (!target) return;

    const cod = String(dupCodigo || '').trim();
    const amb = String(dupAmbiente || '').trim();

    if (!cod && !amb) {
      alert('Ingrese al menos el Código o el Ambiente para identificar la nueva ficha.');
      return;
    }

    if (
      cod &&
      fichas.some((f) => String(f.codigo || '').trim().toLowerCase() === cod.toLowerCase()) &&
      !confirm(`Ya existe un ambiente con el código "${cod}". ¿Desea continuar de todos modos?`)
    ) {
      return;
    }

    const duplicated: Ficha = JSON.parse(JSON.stringify(target));
    duplicated.id = 'F' + Date.now();
    duplicated.cuan = [];
    duplicated.fotos = [];
    duplicated.codigo = cod;
    duplicated.ambiente = amb;

    loadFicha(duplicated);
    setDupTargetId(null);
    setShowDrawer(false);

    await StorageService.saveFicha(duplicated);
    const updated = await StorageService.getFichas();
    setFichas(updated);
    setSaveStatus(`Ambiente duplicado y guardado ${new Date().toLocaleTimeString('es-EC')}`);
  };

  const handleExportProject = () => {
    if (!fichas.length && !confirm('No hay ambientes guardados. ¿Exportar de todos modos?')) {
      return;
    }
    exportProjectBackup(fichas, projectData, catalogos);
  };

  const handleImportProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const parsed = await parseProjectBackup(file);
      const incoming = parsed.fichas || [];
      const ok = confirm(
        `El archivo contiene ${incoming.length} ambiente(s). Se agregarán a los ${fichas.length} existentes y se reemplazarán los que tengan el mismo identificador. ¿Continuar?`
      );
      if (!ok) return;

      const map = new Map<string, Ficha>();
      fichas.forEach((f) => map.set(f.id, f));
      incoming.forEach((f) => {
        if (f && f.id) map.set(f.id, f);
      });

      const merged = Array.from(map.values());
      await StorageService.replaceFichas(merged);
      setFichas(merged);

      if (parsed.proyecto) {
        const p: ProjectData = {
          proyecto: parsed.proyecto.proyecto || '',
          ubicacion: parsed.proyecto.ubicacion || '',
          bloque: parsed.proyecto.bloque || '',
        };
        setProjectData(p);
        await StorageService.saveProjectData(p);
      }

      if (parsed.catalogosPersonalizados) {
        const catCopy = { ...catalogos };
        Object.entries(parsed.catalogosPersonalizados).forEach(([k, vals]) => {
          const base = [...(catCopy[k] || [])];
          (vals || []).forEach((v) => {
            if (typeof v === 'string' && v.trim() && !base.some((b) => b.toLowerCase() === v.trim().toLowerCase())) {
              base.push(v.trim());
            }
          });
          catCopy[k] = base;
        });
        setCatalogos(catCopy);
        await StorageService.saveCatalogos(catCopy);
      }

      alert(`Respaldo importado: ${merged.length} ambiente(s) en total.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const stats = useMemo(() => {
    let area = 0;
    const c: Record<string, number> = { Bueno: 0, Regular: 0, Malo: 0, Crítico: 0 };
    fichas.forEach((f) => {
      area += calculateArea(f);
      const st = f.estadoDimensional || f.diagestado || 'Regular';
      if (c[st] !== undefined) c[st]++;
    });
    return { area, c };
  }, [fichas]);

  const sortedAmbientes = useMemo(() => {
    return [...fichas].sort((a, b) =>
      (a.codigo || a.ambiente || '').localeCompare(b.codigo || b.ambiente || '')
    );
  }, [fichas]);

  if (showConsolidated) {
    return (
      <ConsolidatedReport
        fichas={fichas}
        projectData={projectData}
        onClose={() => setShowConsolidated(false)}
      />
    );
  }

  return (
    <CatalogProvider personalizados={catalogos} agregar={handleAddCatalogos}>
      <div className="min-h-screen bg-gray-100 text-gray-900 font-sans pb-10">
        {/* Top Sticky Navigation Bar */}
        <header className="bg-[#17365d] text-white px-3 sm:px-5 py-2.5 sm:py-3 shadow-md print:hidden sticky top-0 z-50 overflow-x-clip">
          <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:gap-4 max-w-7xl mx-auto">
            {/* Left: Architect Details & Title */}
            <div className="flex min-w-0 flex-1 lg:flex-none items-center space-x-2 sm:space-x-3.5">
              <div className="gasv-mobile-icon-lockup flex items-center shrink-0">
                <img
                  src={`${(import.meta.env?.BASE_URL || '/').replace(/\/$/, '')}/gasv-logo.png`}
                  alt="GSARITAMA ARQ."
                  className="h-8 sm:h-11 w-auto max-w-[92px] sm:max-w-[190px] object-contain block select-none"
                />
              </div>

              <div className="min-w-0 flex-1 lg:flex-none border-l border-white/30 pl-2 sm:pl-3.5">
                <h1 className="text-[9px] sm:text-sm lg:text-base font-bold tracking-[0.04em] sm:tracking-wider leading-tight text-white uppercase whitespace-nowrap">
                  RELEVAMIENTO ARQUITECTÓNICO
                </h1>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                  <span className="text-[11px] sm:text-xs font-semibold text-sky-300 whitespace-nowrap">
                    {projectData.profesional || 'Arq. Gabriel Saritama Veira'}
                  </span>
                  <span className="hidden sm:inline text-sky-400/50 text-xs">•</span>
                  <span className="text-[10px] sm:text-xs text-slate-300 font-mono hidden sm:inline whitespace-nowrap">
                    {projectData.contacto || 'saritama26@gmail.com'}
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Controls (Visible from lg: 1024px) - Exactly 2 rows */}
            <div className="hidden lg:flex flex-col items-end gap-1.5 shrink-0">
              {/* FILA 1: Acciones principales y navegación: [Nuevo] [Guardar] | [Ambientes] [Consolidado] [Manual] */}
              <div className="flex items-center justify-end gap-1.5 xl:gap-2">
                {/* GRUPO 1: Acciones principales: [Nuevo] | [Guardar] */}
                <div className="flex items-center bg-black/20 p-0.5 rounded-md border border-white/10 space-x-1">
                  <button
                    type="button"
                    onClick={handleNuevoAmbiente}
                    className="flex items-center px-2.5 xl:px-3 py-1.5 bg-[#286b9e] hover:bg-blue-600 rounded text-xs xl:text-sm font-semibold transition-colors shadow-xs"
                    title="Crear un nuevo ambiente"
                  >
                    <Plus size={15} className="mr-1 shrink-0" /> Nuevo
                  </button>
                  <button
                    type="button"
                    onClick={handleManualSave}
                    disabled={!isFormValid}
                    className={`flex items-center px-2.5 xl:px-3 py-1.5 rounded text-xs xl:text-sm font-semibold transition-all shadow-xs ${
                      isFormValid
                        ? 'bg-[#16794b] hover:bg-green-600 text-white cursor-pointer'
                        : 'bg-slate-600/70 text-slate-300 cursor-not-allowed opacity-50 shadow-none'
                    }`}
                    title={
                      isFormValid
                        ? 'Guardar cambios'
                        : 'Complete Código y Ambiente para habilitar Guardar'
                    }
                  >
                    <Save size={15} className="mr-1 shrink-0" /> Guardar
                  </button>
                </div>

                {/* GRUPO 2: Navegación: [Ambientes] | [Consolidado] | [Manual] */}
                <div className="flex items-center bg-black/20 p-0.5 rounded-md border border-white/10 space-x-1">
                  <button
                    type="button"
                    onClick={() => setShowDrawer(true)}
                    className="flex items-center px-2 xl:px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs xl:text-sm font-semibold transition-colors"
                    title="Listado y selección de ambientes registrados"
                  >
                    <LayoutList size={14} className="mr-1 shrink-0" /> Ambientes ({fichas.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConsolidated(true)}
                    className="flex items-center px-2 xl:px-2.5 py-1.5 bg-indigo-700 hover:bg-indigo-600 rounded text-xs xl:text-sm font-semibold transition-colors"
                    title="Ver reporte consolidado con cómputos y fotos"
                  >
                    <Layers size={14} className="mr-1 shrink-0" /> Consolidado
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowManual(true)}
                    className="flex items-center px-2 xl:px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs xl:text-sm font-semibold transition-colors"
                    title="Manual de uso detallado"
                  >
                    <BookOpen size={14} className="mr-1 shrink-0" /> Manual
                  </button>
                </div>

                <PWAInstallButton />
              </div>

              {/* FILA 2: Gestión, sincronización y exportación: [Importar] [Sincronizar] [Google Drive] [Exportar] [CSV] [PDF] */}
              <div className="flex items-center justify-end gap-1.5 xl:gap-2">
                <div className="flex items-center bg-black/20 p-0.5 rounded-md border border-white/10 space-x-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center px-2 xl:px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs xl:text-sm font-semibold transition-colors"
                    title="Importar archivo JSON de respaldo"
                  >
                    <Upload size={14} className="mr-1 shrink-0" /> Importar
                  </button>

                  {/* Botón sincronización Móvil & PC (accesible rápido) junto a Importar */}
                  <button
                    type="button"
                    onClick={() => setShowSync(true)}
                    className="flex items-center px-2 xl:px-2.5 py-1.5 bg-sky-600/80 hover:bg-sky-500 text-white rounded text-xs xl:text-sm font-semibold transition-colors"
                    title="Vincular con Celular o Computadora"
                  >
                    <ArrowRightLeft size={14} className="mr-1 shrink-0" />
                    <span>Sincronizar</span>
                  </button>

                  {/* Botón Respaldo en la Nube (Google Drive) junto a Sincronizar e Importar */}
                  <button
                    type="button"
                    onClick={() => setShowGDriveModal(true)}
                    className={`flex items-center px-2 xl:px-2.5 py-1.5 rounded text-xs xl:text-sm font-semibold transition-colors shadow-xs ${
                      gdriveAutoStatus === 'synced'
                        ? 'bg-emerald-600/90 hover:bg-emerald-500 text-white'
                        : gdriveAutoStatus === 'syncing'
                        ? 'bg-amber-600/90 hover:bg-amber-500 text-white animate-pulse'
                        : gdriveAutoStatus === 'error'
                        ? 'bg-rose-600/90 hover:bg-rose-500 text-white'
                        : 'bg-[#1e5282] hover:bg-sky-600 text-white'
                    }`}
                    title={
                      gdriveAutoStatus === 'synced'
                        ? `Google Drive: respaldo confirmado${lastGdriveBackupTime ? ` — ${new Date(lastGdriveBackupTime).toLocaleString('es-EC')}` : ''}`
                        : gdriveAutoStatus === 'syncing'
                        ? 'Google Drive: sincronizando datos'
                        : gdriveAutoStatus === 'error'
                        ? `Google Drive: error de respaldo — ${gdriveAutoError || 'revise la conexión'}`
                        : navigator.onLine
                        ? 'Google Drive: configure o revise el respaldo'
                        : 'Sin conexión: respaldo en espera'
                    }
                  >
                    {gdriveAutoStatus === 'synced' ? (
                      <CloudCheck size={14} className="mr-1 shrink-0 text-emerald-200" />
                    ) : gdriveAutoStatus === 'syncing' ? (
                      <CloudUpload size={14} className="mr-1 shrink-0 animate-bounce" />
                    ) : (
                      <Cloud size={14} className="mr-1 shrink-0" />
                    )}
                    <span>
                      {gdriveAutoStatus === 'synced'
                        ? 'Drive guardado'
                        : gdriveAutoStatus === 'syncing'
                        ? 'Sincronizando…'
                        : gdriveAutoStatus === 'error'
                        ? 'Error Drive'
                        : 'Google Drive'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportProject}
                    className="flex items-center px-2 xl:px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs xl:text-sm font-semibold transition-colors"
                    title="Exportar archivo JSON de respaldo completo"
                  >
                    <Download size={14} className="mr-1 shrink-0" /> Exportar
                  </button>
                  <button
                    type="button"
                    onClick={() => exportCSV(fichas, projectData)}
                    className="flex items-center px-2 xl:px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs xl:text-sm font-semibold transition-colors"
                    title="Exportar datos en tabla Excel/CSV"
                  >
                    <FileDown size={14} className="mr-1 shrink-0" /> CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center px-2 xl:px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs xl:text-sm font-semibold transition-colors"
                    title="Imprimir o guardar como PDF"
                  >
                    <Printer size={14} className="mr-1 shrink-0" /> PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Encabezado móvil: mantener únicamente el acceso al menú */}
            <div className="flex lg:hidden items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex h-9 w-9 shrink-0 items-center justify-center p-0 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Menú móvil anterior en formato de lista: todas las acciones dentro */}
          {mobileMenuOpen && (
            <div className="lg:hidden mt-3 pt-3 border-t border-white/20 text-sm space-y-1.5">
              <p className="px-2 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-sky-300">Acciones principales</p>
              <button type="button" onClick={() => { handleNuevoAmbiente(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left font-semibold bg-[#286b9e] hover:bg-blue-600">
                <Plus size={17} className="shrink-0" /> Nuevo ambiente
              </button>
              <button type="button" onClick={() => { if (!isFormValid) return; handleManualSave(); setMobileMenuOpen(false); }} disabled={!isFormValid} title={isFormValid ? "Guardar cambios" : "Complete Código y Ambiente para habilitar Guardar"} className={`w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left font-semibold transition-colors ${isFormValid ? "bg-[#16794b] hover:bg-green-600 text-white" : "bg-slate-600/70 text-slate-300 cursor-not-allowed opacity-60"}`}>
                <Save size={17} className="shrink-0" /> Guardar
              </button>

              <p className="px-2 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-sky-300">Navegación</p>
              <button type="button" onClick={() => { setShowDrawer(true); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left font-semibold bg-slate-700 hover:bg-slate-600">
                <LayoutList size={17} className="shrink-0" /> Ambientes ({fichas.length})
              </button>
              <button type="button" onClick={() => { setShowConsolidated(true); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left font-semibold bg-indigo-700 hover:bg-indigo-600">
                <Layers size={17} className="shrink-0" /> Consolidado
              </button>
              <button type="button" onClick={() => { setShowManual(true); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left font-semibold bg-slate-700 hover:bg-slate-600">
                <BookOpen size={17} className="shrink-0" /> Manual
              </button>

              <p className="px-2 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-sky-300">Sincronización y respaldos</p>
              <button type="button" onClick={() => { setShowSync(true); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left font-semibold bg-sky-600/90 hover:bg-sky-500">
                <ArrowRightLeft size={17} className="shrink-0" /> Sincronizar con celular o computadora
              </button>
              <button type="button" onClick={() => { setShowGDriveModal(true); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left font-semibold ${gdriveAutoStatus === "synced" ? "bg-emerald-700 hover:bg-emerald-600" : gdriveAutoStatus === "syncing" ? "bg-amber-700 hover:bg-amber-600" : gdriveAutoStatus === "error" ? "bg-rose-700 hover:bg-rose-600" : "bg-[#1e5282] hover:bg-sky-600"}`}>
                {gdriveAutoStatus === "synced" ? <CloudCheck size={17} className="shrink-0" /> : gdriveAutoStatus === "syncing" ? <CloudUpload size={17} className="shrink-0 animate-pulse" /> : <Cloud size={17} className="shrink-0" />}
                {gdriveAutoStatus === "synced" ? "Google Drive · Respaldo guardado" : gdriveAutoStatus === "syncing" ? "Google Drive · Sincronizando…" : gdriveAutoStatus === "error" ? "Google Drive · Revisar error" : "Google Drive · Copia de seguridad"}
              </button>

              <p className="px-2 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-sky-300">Importación y exportación</p>
              <button type="button" onClick={() => { fileInputRef.current?.click(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left font-semibold bg-slate-700 hover:bg-slate-600">
                <Upload size={17} className="shrink-0" /> Importar respaldo
              </button>
              <button type="button" onClick={() => { handleExportProject(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left font-semibold bg-slate-700 hover:bg-slate-600">
                <Download size={17} className="shrink-0" /> Exportar respaldo
              </button>
              <button type="button" onClick={() => { exportCSV(fichas, projectData); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left font-semibold bg-slate-700 hover:bg-slate-600">
                <FileDown size={17} className="shrink-0" /> Exportar CSV
              </button>
              <button type="button" onClick={() => { window.print(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left font-semibold bg-slate-700 hover:bg-slate-600">
                <Printer size={17} className="shrink-0" /> Imprimir / Guardar PDF
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportProject}
          />
        </header>

        {/* Auto-save Status Strip */}
        <div className="print:hidden bg-white border-b border-gray-200 px-4 py-1.5 text-xs">
          <span className={hasUnsavedChanges ? 'text-amber-700 font-semibold' : 'text-slate-500'}>
            {saveStatus || 'Autoguardado activo: los cambios se registran 2,5 s después de la última edición.'}
          </span>
        </div>

        {/* Print Header */}
        <div className="p-4 print:p-0">
          <div className="hidden print:flex items-end justify-between border-b-2 border-slate-800 pb-3 mb-5">
            <div className="flex items-center space-x-3">
              <div className="report-logo-plate flex h-[54px] w-[220px] shrink-0 items-center justify-center overflow-visible">
                <img
                  src={GSARITAMA_HEADER_LOGO}
                  alt="GSARITAMA ARQ."
                  className="report-document-logo h-full w-full shrink-0 object-contain object-center block"
                />
              </div>
              <div className="font-bold text-[#17365d] text-lg uppercase tracking-wide">
                FICHA DE RELEVAMIENTO ARQUITECTÓNICO
              </div>
            </div>
            <div className="text-right text-[10pt] leading-tight text-slate-800">
              <div className="font-semibold text-slate-900">
                {projectData.profesional || 'Arq. Gabriel Saritama Veira'}
              </div>
              <div className="text-xs text-slate-600 font-mono">
                {projectData.contacto || 'saritama26@gmail.com'}
              </div>
            </div>
          </div>

          {/* Datos Globales del Proyecto */}
          <div className="max-w-7xl mx-auto bg-white p-5 rounded-lg shadow-sm border border-gray-200 mb-6 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 border-b pb-2 gap-2">
              <h2 className="text-lg font-semibold text-blue-900">
                Datos Globales del Proyecto
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                Profesional a cargo:{' '}
                <strong className="text-slate-800">{projectData.profesional || 'Arq. Gabriel Saritama Veira'}</strong>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Proyecto / Inmueble</label>
                <input
                  className="w-full p-2 border rounded text-xs sm:text-sm"
                  placeholder="Se hereda a los ambientes"
                  value={projectData.proyecto}
                  onChange={(e) => handleUpdateProjectData('proyecto', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Ubicación</label>
                <input
                  className="w-full p-2 border rounded text-xs sm:text-sm"
                  placeholder="Ciudad, Dirección..."
                  value={projectData.ubicacion}
                  onChange={(e) => handleUpdateProjectData('ubicacion', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Bloque / Edificio (Por defecto)</label>
                <input
                  className="w-full p-2 border rounded text-xs sm:text-sm"
                  placeholder="Bloque A..."
                  value={projectData.bloque}
                  onChange={(e) => handleUpdateProjectData('bloque', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Profesional Responsable</label>
                <input
                  className="w-full p-2 border rounded text-xs sm:text-sm font-semibold text-slate-800 bg-slate-50"
                  value={projectData.profesional || 'Arq. Gabriel Saritama Veira'}
                  onChange={(e) => handleUpdateProjectData('profesional', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Ambientes del Proyecto */}
          <div className="max-w-7xl mx-auto bg-white p-3.5 sm:p-5 rounded-lg shadow-sm border border-gray-200 mb-6 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 border-b pb-2 gap-2">
              <h2 className="text-base sm:text-lg font-semibold text-blue-900">
                Ambientes del Proyecto ({fichas.length})
              </h2>
              <div className="flex flex-wrap gap-1.5 sm:space-x-2">
                <button
                  type="button"
                  onClick={() =>
                    selectedAmbienteId ? handleSelectAmbiente(selectedAmbienteId) : alert('Seleccione un ambiente.')
                  }
                  className="flex items-center px-2.5 sm:px-3 py-1.5 bg-blue-50 text-blue-700 rounded text-xs sm:text-sm font-semibold hover:bg-blue-100"
                >
                  <Pencil size={14} className="mr-1" /> Editar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    selectedAmbienteId ? handleOpenDuplicate(selectedAmbienteId) : alert('Seleccione un ambiente.')
                  }
                  className="flex items-center px-2.5 sm:px-3 py-1.5 bg-green-50 text-green-700 rounded text-xs sm:text-sm font-semibold hover:bg-green-100"
                >
                  <Copy size={14} className="mr-1" /> Duplicar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    selectedAmbienteId ? handleDeleteAmbiente(selectedAmbienteId) : alert('Seleccione un ambiente.')
                  }
                  className="flex items-center px-2.5 sm:px-3 py-1.5 bg-red-50 text-red-600 rounded text-xs sm:text-sm font-semibold hover:bg-red-100"
                >
                  <Trash size={14} className="mr-1" /> Eliminar
                </button>
              </div>
            </div>

            {/* Mobile Cards for Ambientes */}
            <div className="block sm:hidden space-y-2 mb-3">
              {sortedAmbientes.map((item) => {
                const isSelected = selectedAmbienteId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedAmbienteId(item.id)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="ambsel-mobile"
                          checked={isSelected}
                          onChange={() => setSelectedAmbienteId(item.id)}
                        />
                        <span className="font-bold text-slate-800 text-sm">{item.codigo || 'S/C'}</span>
                      </div>
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {calculateArea(item).toFixed(2)} m²
                      </span>
                    </div>
                    <div className="font-medium text-slate-700 mb-1 ml-5">{item.ambiente || 'Sin nombre'}</div>
                    <div className="flex justify-between items-center text-slate-500 ml-5 text-[11px]">
                      <span>{item.bloque || projectData.bloque} · {item.nivel || 'N/A'}</span>
                      <span className={`font-semibold ${
                        item.diagestado === 'Crítico' ? 'text-red-600' :
                        item.diagestado === 'Malo' ? 'text-orange-600' :
                        item.diagestado === 'Regular' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {item.diagestado || 'Regular'}
                      </span>
                    </div>
                  </div>
                );
              })}
              {fichas.length === 0 && (
                <p className="text-center text-slate-500 italic py-4 text-xs">
                  No hay ambientes registrados.
                </p>
              )}
            </div>

            {/* Desktop Table for Ambientes */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse border border-gray-300">
                <thead className="bg-slate-100 text-slate-800 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-2 py-1.5 border border-gray-300 w-10 text-center">Sel.</th>
                    <th className="px-2 py-1.5 border border-gray-300">Código</th>
                    <th className="px-2 py-1.5 border border-gray-300">Ambiente</th>
                    <th className="px-2 py-1.5 border border-gray-300">Bloque</th>
                    <th className="px-2 py-1.5 border border-gray-300">Nivel</th>
                    <th className="px-2 py-1.5 border border-gray-300 text-right">Área (m²)</th>
                    <th className="px-2 py-1.5 border border-gray-300">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAmbientes.map((item) => (
                    <tr
                      key={item.id}
                      className={
                        'border-b border-gray-300 ' +
                        (selectedAmbienteId === item.id ? 'bg-blue-50' : 'bg-white hover:bg-slate-50')
                      }
                    >
                      <td className="p-1 border border-gray-300 text-center">
                        <input
                          type="radio"
                          name="ambsel"
                          checked={selectedAmbienteId === item.id}
                          onChange={() => setSelectedAmbienteId(item.id)}
                        />
                      </td>
                      <td className="p-1.5 border border-gray-300 font-medium">{item.codigo || 'S/C'}</td>
                      <td className="p-1.5 border border-gray-300">{item.ambiente || 'Sin nombre'}</td>
                      <td className="p-1.5 border border-gray-300">{item.bloque || projectData.bloque}</td>
                      <td className="p-1.5 border border-gray-300">{item.nivel}</td>
                      <td className="p-1.5 border border-gray-300 text-right">{calculateArea(item).toFixed(2)}</td>
                      <td className="p-1.5 border border-gray-300">{item.estadoDimensional || item.diagestado}</td>
                    </tr>
                  ))}
                  {fichas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-500">
                        No hay ambientes registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {fichas.length > 0 && (
              <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex flex-wrap justify-between items-center gap-2">
                <span>Área total evaluada: <strong className="text-blue-900">{stats.area.toFixed(2)} m²</strong></span>
                <span className="space-x-1.5">
                  <span className="text-green-700">B: {stats.c.Bueno}</span> ·{' '}
                  <span className="text-yellow-700">R: {stats.c.Regular}</span> ·{' '}
                  <span className="text-orange-700">M: {stats.c.Malo}</span> ·{' '}
                  <span className="text-red-700">C: {stats.c.Crítico}</span>
                </span>
              </div>
            )}
          </div>

          {/* Active Ficha Form */}
          <FichaForm
            ficha={activeFicha}
            projectData={projectData}
            onChange={(patch) => setActiveFicha((prev) => ({ ...prev, ...patch }))}
          />
        </div>

        {/* Saved Fichas Drawer Modal */}
        {showDrawer && (
          <div className="fixed inset-0 bg-black/50 z-50 flex justify-end print:hidden">
            <div className="w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto flex flex-col">
              <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-blue-900">Fichas Guardadas</h2>
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  className="text-slate-500 hover:text-slate-800 font-bold px-2 py-1"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                {fichas.length === 0 && (
                  <p className="text-gray-500 italic text-center mt-10">No hay fichas guardadas.</p>
                )}
                {fichas.map((f) => (
                  <div
                    key={f.id}
                    className="border border-slate-200 rounded p-3 bg-white shadow-sm hover:shadow transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-sm text-slate-800">
                          {f.codigo || 'S/C'} - {f.ambiente || 'Sin nombre'}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {f.bloque || projectData.bloque} | {f.nivel}
                        </p>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded">
                        Fotos: {f.fotos?.length || 0}
                      </span>
                    </div>
                    <div className="flex space-x-2 mt-3">
                      <button
                        type="button"
                        onClick={() => handleSelectAmbiente(f.id)}
                        className="flex-1 bg-blue-50 text-blue-700 py-1.5 rounded text-xs font-semibold hover:bg-blue-100"
                      >
                        Cargar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDuplicate(f.id)}
                        className="flex-1 bg-green-50 text-green-700 py-1.5 rounded text-xs font-semibold hover:bg-green-100 flex items-center justify-center"
                      >
                        <Copy size={12} className="mr-1" /> Duplicar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAmbiente(f.id)}
                        className="bg-red-50 text-red-600 p-1.5 rounded hover:bg-red-100"
                        title="Eliminar"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Modal */}
        {dupTargetId && (
          <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 print:hidden">
            <div className="bg-white w-full max-w-md rounded-lg shadow-2xl overflow-hidden">
              <div className="bg-[#17365d] text-white px-4 py-3 flex items-center">
                <Copy size={18} className="mr-2" />
                <h2 className="text-base font-bold">Duplicar ambiente como nueva plantilla</h2>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-slate-600">
                  Se copiarán todos los datos de la ficha seleccionada, excepto la Sección 8 (Cuantificación preliminar) y
                  la Sección 9 (Registro fotográfico). Indique la identificación del nuevo ambiente.
                </p>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Código</label>
                  <input
                    autoFocus
                    className="w-full p-2 border rounded"
                    placeholder="Ej. A-02"
                    value={dupCodigo}
                    onChange={(e) => setDupCodigo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmDuplicate();
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Ambiente / Área</label>
                  <input
                    className="w-full p-2 border rounded"
                    placeholder="Ej. Aula 2"
                    value={dupAmbiente}
                    onChange={(e) => setDupAmbiente(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmDuplicate();
                    }}
                  />
                </div>
              </div>
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDupTargetId(null)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded text-sm font-semibold hover:bg-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDuplicate}
                  className="px-3 py-1.5 bg-[#16794b] text-white rounded text-sm font-semibold hover:bg-green-600"
                >
                  Crear ambiente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Modal */}
        {showManual && <ManualModal onClose={() => setShowManual(false)} />}

        {/* Device Sync & Association Modal (Mobile & PC) */}
        {showSync && (
          <DeviceSyncModal
            fichas={fichas}
            projectData={projectData}
            catalogos={catalogos}
            onImportFichas={async (importedFichas, impProj, impCats) => {
              const map = new Map<string, Ficha>();
              fichas.forEach((f) => map.set(f.id, f));
              importedFichas.forEach((f) => {
                if (f && f.id) map.set(f.id, f);
              });
              const merged = Array.from(map.values());
              await StorageService.replaceFichas(merged);
              setFichas(merged);

              if (impProj) {
                setProjectData(impProj);
                await StorageService.saveProjectData(impProj);
              }

              if (impCats) {
                const catCopy = { ...catalogos };
                Object.entries(impCats).forEach(([k, vals]) => {
                  const base = [...(catCopy[k] || [])];
                  (vals || []).forEach((v) => {
                    if (typeof v === 'string' && v.trim() && !base.some((b) => b.toLowerCase() === v.trim().toLowerCase())) {
                      base.push(v.trim());
                    }
                  });
                  catCopy[k] = base;
                });
                setCatalogos(catCopy);
                await StorageService.saveCatalogos(catCopy);
              }
            }}
            onClose={() => setShowSync(false)}
          />
        )}

        {/* Google Drive Cloud Backup & Restore Modal */}
        {showGDriveModal && (
          <GoogleDriveBackupModal
            isOpen={showGDriveModal}
            onClose={() => setShowGDriveModal(false)}
            fichas={fichas}
            projectData={projectData}
            catalogos={catalogos}
            onRestoreBackup={async (newFichas, newProjectData, newCatalogos) => {
              await StorageService.replaceFichas(newFichas);
              const restoredFichas = await StorageService.getFichas();
              setFichas(restoredFichas);
              await StorageService.saveProjectData(newProjectData);
              setProjectData(newProjectData);
              await StorageService.saveCatalogos(newCatalogos);
              setCatalogos(newCatalogos);
              if (restoredFichas.length > 0) {
                loadFicha(restoredFichas[0]);
              } else {
                loadFicha(createEmptyFicha());
              }
            }}
            lastAutoBackupTime={lastGdriveBackupTime}
            autoBackupStatus={gdriveAutoStatus}
            autoBackupError={gdriveAutoError}
            onManualBackupTrigger={handleManualGDriveBackup}
            onAutomaticBackupTrigger={() => triggerGoogleDriveAutoBackup(fichas, projectData, catalogos)}
          />
        )}

        {/* Offline Status Indicator */}
        <OfflineIndicator />
      </div>
    </CatalogProvider>
  );
}
