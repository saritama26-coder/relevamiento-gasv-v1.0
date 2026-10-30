import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  Home,
  Folder,
  Settings,
  User,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  Search,
  AlertTriangle,
  PieChart,
} from 'lucide-react';
import { Ficha, ProjectData, CatalogosMap, PrintSectionsConfig, DEFAULT_PRINT_SECTIONS } from './types';
import { StorageService } from './services/storage';
import { CatalogProvider } from './context/CatalogContext';
import { FichaForm } from './components/FichaForm';
import { ManualModal } from './components/ManualModal';
import { ConsolidatedReport } from './components/ConsolidatedReport';
import { PWAInstallButton } from './components/PWAInstallButton';
import { DeviceSyncModal } from './components/DeviceSyncModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { DrawerSummaryView } from './components/DrawerSummaryView';
import { GSARITAMA_HEADER_LOGO } from './constants/logoData';
import { suggestIntervencion } from './constants/catalogos';
import { GoogleDriveBackupModal } from './components/GoogleDriveBackupModal';
import { ExportPdfModal } from './components/ExportPdfModal';
import { GoogleDriveService, BackupPayload } from './services/googleDriveService';
import { getAccessToken } from './services/googleAuth';
import {
  NotificationService,
  NotificationState,
  getNotificationPermission,
  requestNotificationPermission,
  notifyGoogleDriveBackupFailed,
  notifyLongSessionAutoSave,
  sendBrowserNotification,
} from './services/notificationService';
import { Cloud, CloudCheck, CloudUpload, Bell, BellOff, BellRing } from 'lucide-react';
import {
  createEmptyFicha,
  exportCSV,
  exportProjectBackup,
  parseProjectBackup,
  calculateArea,
  sanitizeFilename,
  formatTimestamp,
  nextConsecutive,
  getProjectVerificationChecklist,
} from './utils/helpers';

/**
 * Resalta en negrita el texto coincidente de una búsqueda dentro de una cadena dada,
 * respetando mayúsculas/minúsculas originales y tolerando tildes/acentos.
 */
function renderHighlightedText(text: string, query: string): React.ReactNode {
  if (!text) return text;
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return text;

  // Escapar caracteres especiales de expresión regular
  const escaped = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Permitir coincidencias con o sin tildes en vocales y ñ
  const pattern = escaped
    .replace(/[aáàäâ]/gi, '[aáàäâAÁÀÄÂ]')
    .replace(/[eéèëê]/gi, '[eéèëêEÉÈËÊ]')
    .replace(/[iíìïî]/gi, '[iíìïîIÍÌÏÎ]')
    .replace(/[oóòöô]/gi, '[oóòöôOÓÒÖÔ]')
    .replace(/[uúùüû]/gi, '[uúùüûUÚÙÜÛ]')
    .replace(/[nñ]/gi, '[nñNÑ]');

  try {
    const regex = new RegExp(`(${pattern})`, 'gi');
    const parts = text.split(regex);
    if (parts.length <= 1) return text;

    return parts.map((part, i) => {
      if (!part) return null;
      if (new RegExp(`^${pattern}$`, 'i').test(part)) {
        return (
          <strong
            key={i}
            className="font-black text-slate-950 bg-amber-200/90 rounded-xs px-0.5"
          >
            {part}
          </strong>
        );
      }
      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
  } catch {
    return text;
  }
}

/**
 * Función lógica en la gestión de estados de activeFicha:
 * Al cambiar el 'tipo de daño' (patologia) y la 'severidad' en la tabla de elementos (ficha.pat),
 * sugiere automáticamente una 'acción de reposición' (intervencion) coherente basada en el catálogo.
 * Respeta en todo momento la selección manual del usuario.
 */
export function processActiveFichaStateUpdate(
  prev: Ficha,
  patch: Partial<Ficha>
): Ficha {
  if (!patch.pat) {
    return { ...prev, ...patch };
  }

  const prevPatMap = new Map((prev.pat || []).map((row) => [row.id, row]));
  const updatedPat = patch.pat.map((row) => {
    const prevRow = prevPatMap.get(row.id);
    if (!prevRow) return row;

    const patologiaChanged = row.patologia !== prevRow.patologia;
    const severidadChanged = row.severidad !== prevRow.severidad;
    const intervencionChangedByUser = row.intervencion !== prevRow.intervencion;

    // Si cambió patología o severidad y no se alteró manualmente la intervención:
    if (!intervencionChangedByUser && (patologiaChanged || severidadChanged || (!row.intervencion && (row.patologia || row.severidad)))) {
      const suggested = suggestIntervencion(row.patologia, row.severidad, row.elemento);
      if (suggested) {
        return { ...row, intervencion: suggested };
      }
    }

    return row;
  });

  return {
    ...prev,
    ...patch,
    pat: updatedPat,
  };
}

export default function App() {
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [projectData, setProjectData] = useState<ProjectData>({
    proyecto: '',
    ubicacion: '',
    bloque: '',
  });
  const [activeFicha, setActiveFicha] = useState<Ficha>(createEmptyFicha());

  const handleActiveFichaChange = useCallback((patch: Partial<Ficha>) => {
    setActiveFicha((prev) => processActiveFichaStateUpdate(prev, patch));
  }, []);
  const [catalogos, setCatalogos] = useState<CatalogosMap>({});
  const [storageReadError, setStorageReadError] = useState<string | null>(null);

  // UI States
  const [showDrawer, setShowDrawer] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showConsolidated, setShowConsolidated] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showGDriveModal, setShowGDriveModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedAmbienteId, setSelectedAmbienteId] = useState<string | null>(null);
  const [drawerSearchQuery, setDrawerSearchQuery] = useState('');
  const [drawerActiveTab, setDrawerActiveTab] = useState<'ambientes' | 'resumen'>('ambientes');
  const [showNuevoRelevamientoModal, setShowNuevoRelevamientoModal] = useState(false);

  // Configuración de secciones activas para la exportación a PDF / Impresión
  const [printSections, setPrintSections] = useState<PrintSectionsConfig>(() => {
    try {
      const saved = localStorage.getItem('gasv_print_sections');
      if (saved) return { ...DEFAULT_PRINT_SECTIONS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_PRINT_SECTIONS;
  });

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
  const [autoBackupEnabled, setAutoBackupEnabled] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage
        ? localStorage.getItem('gdrive_auto_backup_enabled') !== 'false'
        : true;
    } catch {
      return true;
    }
  });

  // Auto-save & Status
  const [saveStatus, setSaveStatus] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Duplicate modal
  const [dupTargetId, setDupTargetId] = useState<string | null>(null);
  const [dupCodigo, setDupCodigo] = useState('');
  const [dupAmbiente, setDupAmbiente] = useState('');
  const [isPorVerificarPrint, setIsPorVerificarPrint] = useState(false);

  // Web Notifications & Session tracking
  const [notificationPermission, setNotificationPermission] = useState<NotificationState>(() =>
    getNotificationPermission()
  );
  const sessionStartTimeRef = useRef<number>(Date.now());
  const lastLongSessionNotifiedRef = useRef<number>(0);

  const handleRequestNotificationPermission = async () => {
    const granted = await requestNotificationPermission();
    setNotificationPermission(getNotificationPermission());
    if (granted) {
      sendBrowserNotification('🔔 Alertas de escritorio activadas', {
        body: 'Te avisaremos si un respaldo en Google Drive falla o cuando tu trabajo se guarde en sesiones largas.',
        tag: 'gasv-welcome-notification',
      });
    }
  };

  const isFirstMount = useRef(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const exportButtonRef = useRef<HTMLButtonElement | null>(null);
  const exportDropdownRef = useRef<HTMLDivElement | null>(null);
  const projectBackupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleToggleExportDropdown = () => {
    if (!exportDropdownOpen && exportButtonRef.current) {
      const rect = exportButtonRef.current.getBoundingClientRect();
      setDropdownCoords({
        top: rect.bottom + 4,
        left: Math.max(8, rect.left),
      });
    }
    setExportDropdownOpen((prev) => !prev);
  };

  // Click outside to close export dropdown and track position
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(target) &&
        exportButtonRef.current &&
        !exportButtonRef.current.contains(target)
      ) {
        setExportDropdownOpen(false);
      }
    }

    const updatePosition = () => {
      if (exportButtonRef.current) {
        const rect = exportButtonRef.current.getBoundingClientRect();
        setDropdownCoords({
          top: rect.bottom + 4,
          left: Math.max(8, rect.left),
        });
      }
    };

    if (exportDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [exportDropdownOpen]);

  // Load all local data as one operation: a failed read must never look like an empty project.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      StorageService.getProjectData(),
      StorageService.getFichas(),
      StorageService.getCatalogos(),
    ])
      .then(([project, storedFichas, storedCatalogos]) => {
        if (cancelled) return;
        setProjectData(project);
        setFichas(storedFichas);
        setCatalogos(storedCatalogos);
        setStorageReadError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('No se pudo inicializar el almacenamiento local:', error);
        setStorageReadError(
          error instanceof Error
            ? error.message
            : 'No se pudo leer la información local. No se han modificado los registros.'
        );
      });
    return () => {
      cancelled = true;
    };
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
          const errMsg = 'Vuelve a autorizar Google Drive para continuar con los respaldos.';
          setGdriveAutoStatus('error');
          setGdriveAutoError(errMsg);
          notifyGoogleDriveBackupFailed(errMsg, false);
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
        const errMsg = err?.message || 'Error al respaldar en Drive';
        setGdriveAutoError(errMsg);
        notifyGoogleDriveBackupFailed(errMsg, false);
      }
    },
    [lastGdriveBackupTime]
  );

  // Manual backup trigger helper for modal
  const handleManualGDriveBackup = useCallback(async () => {
    if (storageReadError) {
      throw new Error('No se puede respaldar una sesión cuyo almacenamiento local no pudo leerse.');
    }
    const token = await getAccessToken();
    if (!token) {
      const errMsg = 'Autoriza nuevamente Google Drive para crear el respaldo.';
      notifyGoogleDriveBackupFailed(errMsg, true);
      throw new Error(errMsg);
    }

    const payload: BackupPayload = {
      version: '4.0',
      app: 'Relevamiento Arquitectonico GSARITAMA',
      timestamp: new Date().toISOString(),
      projectData,
      catalogosPersonalizados: catalogos,
      fichas,
    };

    try {
      await GoogleDriveService.uploadBackup(token, payload, true);
      const now = new Date().toISOString();
      setLastGdriveBackupTime(now);
      try {
        localStorage.setItem('gdrive_last_backup_time', now);
      } catch {
        // ignore
      }
      setGdriveAutoStatus('synced');
    } catch (err: any) {
      console.error('Error in manual Google Drive backup:', err);
      const errMsg = err?.message || 'Error al crear la copia de seguridad en Google Drive';
      notifyGoogleDriveBackupFailed(errMsg, true);
      throw err;
    }
  }, [projectData, catalogos, fichas, storageReadError]);

  const handleToggleAutoBackup = useCallback(
    async (enabled: boolean) => {
      setAutoBackupEnabled(enabled);
      try {
        localStorage.setItem('gdrive_auto_backup_enabled', enabled ? 'true' : 'false');
      } catch {
        // ignore
      }
      if (enabled) {
        const token = await getAccessToken();
        if (token) {
          triggerGoogleDriveAutoBackup(fichas, projectData, catalogos);
        }
      } else {
        setGdriveAutoStatus('idle');
        setGdriveAutoError(null);
      }
    },
    [fichas, projectData, catalogos, triggerGoogleDriveAutoBackup]
  );

  // Autosave ficha with debounce
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (storageReadError) {
      setHasUnsavedChanges(true);
      setSaveStatus('Guardado suspendido: almacenamiento local no disponible');
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

        // Verificación de notificación nativa tras sesión larga de trabajo
        const now = Date.now();
        const sessionMinutes = (now - sessionStartTimeRef.current) / (1000 * 60);
        const minutesSinceLastNotif = (now - lastLongSessionNotifiedRef.current) / (1000 * 60);

        // Umbral de sesión larga: al menos 15 minutos de trabajo acumulado, espaciado cada 15 min
        if (sessionMinutes >= 15 && minutesSinceLastNotif >= 15) {
          notifyLongSessionAutoSave({
            sessionMinutes,
            totalAmbientes: updatedFichas.length,
            projectName: projectData.proyecto || undefined,
          });
          lastLongSessionNotifiedRef.current = now;
        }

        // Auto-backup to Google Drive in background
        triggerGoogleDriveAutoBackup(updatedFichas, projectData, catalogos);
      } catch (err) {
        console.error('Error in autosave:', err);
        setStorageReadError(
          err instanceof Error
            ? err.message
            : 'Falló la lectura o escritura del almacenamiento local. No continúe modificando datos.'
        );
        setSaveStatus('Error de almacenamiento: guardado suspendido');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [activeFicha, storageReadError]);

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
    if (storageReadError) {
      alert('No se pueden modificar los catálogos hasta recuperar la lectura del almacenamiento local.');
      return;
    }
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
    if (storageReadError) {
      alert('No se pueden modificar los datos del proyecto hasta recuperar la lectura del almacenamiento local.');
      return;
    }
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
    if (storageReadError) {
      alert('Guardado bloqueado: no se pudo confirmar la lectura de los registros existentes. Recargue la aplicación e inténtelo nuevamente.');
      return;
    }
    if (!String(activeFicha.codigo || '').trim() || !String(activeFicha.ambiente || '').trim()) {
      return;
    }

    // PRIORIDAD 4: Control de duplicados - advertencia si dos ambientes del mismo bloque tienen las mismas dimensiones
    const currentBloque = (activeFicha.bloque || projectData.bloque || '').trim().toLowerCase();
    const currentLargo = parseFloat(String(activeFicha.largo || '0').replace(',', '.'));
    const currentAncho = parseFloat(String(activeFicha.ancho || '0').replace(',', '.'));
    const currentArea = calculateArea(activeFicha);

    const sameBlockSameDim = fichas.filter((f) => {
      if (f.id === activeFicha.id) return false;
      const b = (f.bloque || projectData.bloque || '').trim().toLowerCase();
      if (b !== currentBloque) return false;
      if (activeFicha.geometria === 'irregular') {
        const fArea = calculateArea(f);
        return Math.abs(fArea - currentArea) < 0.01 && currentArea > 0;
      }
      const fLargo = parseFloat(String(f.largo || '0').replace(',', '.'));
      const fAncho = parseFloat(String(f.ancho || '0').replace(',', '.'));
      return fLargo === currentLargo && fAncho === currentAncho && currentLargo > 0 && currentAncho > 0;
    });

    if (sameBlockSameDim.length > 0) {
      const dimDesc = activeFicha.geometria === 'irregular'
        ? `área ${currentArea.toFixed(2)} m²`
        : `L: ${activeFicha.largo || '0.00'}m × A: ${activeFicha.ancho || '0.00'}m`;
      const names = sameBlockSameDim.map((f) => `• ${f.codigo || 'S/C'} - ${f.ambiente || 'Ambiente'}`).join('\n');
      const proceed = confirm(
        `⚠️ Control de duplicados en el bloque:\n\nExisten otros ambientes en este bloque con las mismas dimensiones registradas (${dimDesc}):\n${names}\n\n¿Confirmar que es un ambiente con dimensiones idénticas (tipo o espejo) y guardar?`
      );
      if (!proceed) return;
    }

    if (activeFicha.fotos.length === 0) {
      const proceed = confirm(
        '⚠️ Alerta de Registro Fotográfico:\n\nEste ambiente tiene 0 fotografías registradas (se sugiere un objetivo de al menos 4 fotos representativas).\n\n¿Deseas finalizar y guardar este ambiente sin fotografías, o prefieres cargarlas ahora?'
      );
      if (!proceed) {
        document.getElementById('seccion-registro-fotografico')?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
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
    if (storageReadError) {
      alert('No se puede iniciar otro ambiente hasta recuperar la lectura del almacenamiento local.');
      return;
    }
    if (activeFicha.codigo && activeFicha.ambiente && activeFicha.fotos.length === 0) {
      const okFotos = confirm(
        '⚠️ Alerta de Registro Fotográfico:\n\nEl ambiente actual no cuenta con fotografías registradas (objetivo sugerido: al menos 4 fotos).\n\n¿Deseas darlo por finalizado y crear un nuevo ambiente sin fotografías?'
      );
      if (!okFotos) {
        document.getElementById('seccion-registro-fotografico')?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    if (hasUnsavedChanges) {
      const ok = confirm('La ficha actual tiene cambios sin guardar. ¿Crear un ambiente nuevo de todos modos?');
      if (!ok) return;
    } else {
      const ok = confirm('¿Crear un ambiente nuevo? Asegúrese de haber guardado sus cambios.');
      if (!ok) return;
    }
    loadFicha(createEmptyFicha());
  };

  const handleResetRelevamiento = async () => {
    if (storageReadError) {
      alert('Restablecimiento bloqueado para proteger los registros existentes: primero debe recuperarse la lectura del almacenamiento local.');
      return;
    }
    const initialProject: ProjectData = {
      proyecto: '',
      ubicacion: '',
      bloque: '',
      profesional: 'Arq. Gabriel Saritama Veira',
      contacto: 'saritama26@gmail.com',
    };
    const emptyFicha = createEmptyFicha();

    setProjectData(initialProject);
    setFichas([]);
    loadFicha(emptyFicha);
    setSelectedAmbienteId(null);
    setDrawerSearchQuery('');
    setHasUnsavedChanges(false);
    setSaveStatus('Nuevo relevamiento iniciado');

    await StorageService.replaceFichas([]);
    await StorageService.saveProjectData(initialProject);
    triggerGoogleDriveAutoBackup([], initialProject, catalogos);
  };

  const handleSelectAmbiente = (id: string) => {
    const found = fichas.find((f) => f.id === id);
    if (found) {
      loadFicha(found);
      setShowDrawer(false);
      setDrawerSearchQuery('');
    }
  };

  const handleDeleteAmbiente = async (id: string) => {
    if (storageReadError) {
      alert('Eliminación bloqueada: no se pudo confirmar la lectura de los registros existentes.');
      return;
    }
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
    if (storageReadError) {
      alert('No se puede duplicar una ficha hasta recuperar la lectura del almacenamiento local.');
      return;
    }
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

    // PRIORIDAD 4: Al duplicar un ambiente, advertir si existen ambientes con las mismas dimensiones en el mismo bloque
    const targetBloque = (target.bloque || projectData.bloque || '').trim().toLowerCase();
    const targetLargo = parseFloat(String(target.largo || '0').replace(',', '.'));
    const targetAncho = parseFloat(String(target.ancho || '0').replace(',', '.'));
    const targetArea = calculateArea(target);

    const sameBlockSameDim = fichas.filter((f) => {
      if (f.id === target.id) return false;
      const b = (f.bloque || projectData.bloque || '').trim().toLowerCase();
      if (b !== targetBloque) return false;
      if (target.geometria === 'irregular') {
        const fArea = calculateArea(f);
        return Math.abs(fArea - targetArea) < 0.01 && targetArea > 0;
      }
      const fLargo = parseFloat(String(f.largo || '0').replace(',', '.'));
      const fAncho = parseFloat(String(f.ancho || '0').replace(',', '.'));
      return fLargo === targetLargo && fAncho === targetAncho && targetLargo > 0 && targetAncho > 0;
    });

    if (sameBlockSameDim.length > 0) {
      const dimDesc = target.geometria === 'irregular'
        ? `área ${targetArea.toFixed(2)} m²`
        : `L: ${target.largo || '0.00'}m × A: ${target.ancho || '0.00'}m`;
      const names = sameBlockSameDim.map((f) => `• ${f.codigo || 'S/C'} - ${f.ambiente || 'Ambiente'}`).join('\n');
      const proceed = confirm(
        `⚠️ Control de duplicados en el bloque:\n\nYa existen otros ambientes en este bloque con dimensiones idénticas (${dimDesc}):\n${names}\n\n¿Confirmar que es un ambiente tipo o espejo y crear la nueva ficha?`
      );
      if (!proceed) return;
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

  // PRIORIDAD 5: Lista de verificación antes de exportar CSV
  const handleExportCSVWithChecklist = () => {
    const listToVerify = fichas.length > 0 ? fichas : [activeFicha];
    const checklist = getProjectVerificationChecklist(listToVerify);
    if (checklist.hasPending) {
      const summary = checklist.items
        .filter((i) => i.status === 'warning')
        .map((i) => `• ${i.title}: ${i.detail}`)
        .join('\n');
      const proceed = confirm(
        `⚠️ Lista de verificación antes de exportar CSV (${checklist.pendingCount} observaciones):\n\n${summary}\n\n¿Deseas exportar de todos modos incluyendo la marca [POR VERIFICAR] en el documento?`
      );
      if (!proceed) return;
      exportCSV(fichas, projectData, true);
    } else {
      exportCSV(fichas, projectData, false);
    }
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
    if (storageReadError) {
      alert('Importación bloqueada para evitar reemplazar datos mientras el almacenamiento local no pueda leerse. Recargue e inténtelo nuevamente.');
      return;
    }

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

  const filteredDrawerFichas = useMemo(() => {
    const raw = drawerSearchQuery.trim();
    if (!raw) return sortedAmbientes;
    const query = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return sortedAmbientes.filter((f) => {
      const code = (f.codigo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const amb = (f.ambiente || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return code.includes(query) || amb.includes(query);
    });
  }, [sortedAmbientes, drawerSearchQuery]);

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
        {storageReadError && (
          <div role="alert" className="mx-auto mt-3 max-w-7xl rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 print:hidden">
            <p className="font-bold">Almacenamiento local no disponible</p>
            <p className="mt-1">No se ha confirmado la lectura de las fichas y configuraciones. Las operaciones que puedan sobrescribir o eliminar información están bloqueadas.</p>
            <p className="mt-1 break-words">{storageReadError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 rounded bg-red-800 px-3 py-1.5 font-semibold text-white hover:bg-red-700"
            >
              Reintentar lectura
            </button>
          </div>
        )}
        {/* Top Sticky Navigation Bar */}
        <header className="bg-[#17365d] text-white shadow-md print:hidden sticky top-0 z-50">
          {/* Fila superior para móvil (< lg) */}
          <div className="lg:hidden px-3 sm:px-5 py-2.5 sm:py-3">
            <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:gap-4 max-w-7xl mx-auto">
              {/* Left: Architect Details & Title */}
              <div className="flex min-w-0 flex-1 items-center space-x-2 sm:space-x-3.5">
                <div className="gasv-mobile-icon-lockup flex items-center shrink-0">
                  <img
                    src={`${(import.meta.env?.BASE_URL || '/').replace(/\/$/, '')}/gasv-logo.png`}
                    alt="GSARITAMA ARQ."
                    className="h-8 sm:h-11 w-auto max-w-[92px] sm:max-w-[190px] object-contain block select-none"
                  />
                </div>

                <div className="min-w-0 flex-1 border-l border-white/30 pl-2 sm:pl-3.5">
                  <h1 className="text-[9px] sm:text-sm font-bold tracking-[0.04em] sm:tracking-wider leading-tight text-white uppercase whitespace-nowrap">
                    RELEVAMIENTO ARQUITECTÓNICO
                  </h1>
                </div>
              </div>

              {/* Encabezado móvil: mantener únicamente el acceso al menú */}
              <div className="flex items-center justify-end shrink-0">
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
              <div className="mt-3 pt-3 border-t border-white/20 text-sm space-y-1.5 max-w-7xl mx-auto">
                <p className="px-2 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-sky-300">Acciones principales</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowNuevoRelevamientoModal(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-xs"
                >
                  <Plus size={17} className="shrink-0" /> Nuevo relevamiento
                </button>
                <button type="button" onClick={() => { handleNuevoAmbiente(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left font-semibold bg-[#286b9e] hover:bg-blue-600 text-white cursor-pointer">
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
                <button type="button" onClick={() => { setShowGDriveModal(true); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left font-semibold ${!autoBackupEnabled ? "bg-amber-800 hover:bg-amber-700" : gdriveAutoStatus === "synced" ? "bg-emerald-700 hover:bg-emerald-600" : gdriveAutoStatus === "syncing" ? "bg-amber-700 hover:bg-amber-600" : gdriveAutoStatus === "error" ? "bg-rose-700 hover:bg-rose-600" : "bg-[#1e5282] hover:bg-sky-600"}`}>
                  {!autoBackupEnabled ? <Cloud size={17} className="shrink-0 text-amber-200" /> : gdriveAutoStatus === "synced" ? <CloudCheck size={17} className="shrink-0" /> : gdriveAutoStatus === "syncing" ? <CloudUpload size={17} className="shrink-0 animate-pulse" /> : <Cloud size={17} className="shrink-0" />}
                  {!autoBackupEnabled ? "Google Drive · Auto-respaldo pausado" : gdriveAutoStatus === "synced" ? "Google Drive · Respaldo guardado" : gdriveAutoStatus === "syncing" ? "Google Drive · Sincronizando…" : gdriveAutoStatus === "error" ? "Google Drive · Revisar error" : "Google Drive · Copia de seguridad"}
                </button>

                <p className="px-2 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-sky-300">Importación y exportación</p>
                <button type="button" onClick={() => { fileInputRef.current?.click(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left font-semibold bg-slate-700 hover:bg-slate-600">
                  <Upload size={17} className="shrink-0" /> Importar respaldo
                </button>
                <button type="button" onClick={() => { handleExportProject(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left font-semibold bg-slate-700 hover:bg-slate-600">
                  <Download size={17} className="shrink-0" /> Exportar respaldo
                </button>
                <button type="button" onClick={() => { handleExportCSVWithChecklist(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left font-semibold bg-slate-700 hover:bg-slate-600">
                  <FileDown size={17} className="shrink-0" /> Exportar CSV
                </button>
                <button type="button" onClick={() => { setShowExportModal(true); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left font-semibold bg-slate-700 hover:bg-slate-600">
                  <FileText size={17} className="shrink-0 text-red-400" /> Exportar PDF (elegir secciones)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const checklist = getProjectVerificationChecklist(fichas.length > 0 ? fichas : [activeFicha]);
                    setIsPorVerificarPrint(checklist.hasPending);
                    window.print();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left font-semibold bg-slate-700 hover:bg-slate-600"
                >
                  <Printer size={17} className="shrink-0" /> Imprimir directo
                </button>
              </div>
            )}
          </div>

          {/* Desktop Header - Modelo 1 (Fila Superior) */}
          <div className="hidden lg:flex w-full items-center justify-between px-4 sm:px-6 py-2.5 max-w-7xl mx-auto">
            {/* Izquierda: Logo gasv-logo.png sobre fondo azul, separador, título y subtítulo */}
            <div className="flex items-center space-x-3.5">
              <div className="flex items-center shrink-0">
                <img
                  src={`${(import.meta.env?.BASE_URL || '/').replace(/\/$/, '')}/gasv-logo.png`}
                  alt="GSARITAMA ARQ."
                  className="h-11 w-auto max-w-[190px] object-contain block select-none"
                />
              </div>
              <div className="h-8 w-px bg-white/30" />
              <div>
                <h1 className="text-sm xl:text-base font-bold tracking-wider leading-tight text-white uppercase whitespace-nowrap">
                  RELEVAMIENTO ARQUITECTÓNICO
                </h1>
              </div>
            </div>

            {/* Derecha: Inicio (house), Proyectos (folder), Configuración (gear), Avatar circular con flecha */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="p-2 rounded-lg hover:bg-white/10 text-white/90 hover:text-white transition-colors"
                title="Inicio"
              >
                <Home size={18} />
              </button>
              <button
                type="button"
                onClick={() => setShowDrawer(true)}
                className="p-2 rounded-lg hover:bg-white/10 text-white/90 hover:text-white transition-colors"
                title="Proyectos"
              >
                <Folder size={18} />
              </button>
              <button
                type="button"
                onClick={() => setShowSync(true)}
                className="p-2 rounded-lg hover:bg-white/10 text-white/90 hover:text-white transition-colors"
                title="Configuración"
              >
                <Settings size={18} />
              </button>
              <button
                type="button"
                onClick={() => setShowGDriveModal(true)}
                className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full hover:bg-white/10 transition-colors border border-transparent hover:border-white/20"
                title={
                  !autoBackupEnabled
                    ? 'Google Drive: auto-respaldo pausado temporalmente (sesión autorizada)'
                    : gdriveAutoStatus === 'synced'
                    ? `Google Drive: respaldo confirmado${lastGdriveBackupTime ? ` — ${new Date(lastGdriveBackupTime).toLocaleString('es-EC')}` : ''}`
                    : gdriveAutoStatus === 'syncing'
                    ? 'Google Drive: sincronizando…'
                    : gdriveAutoStatus === 'error'
                    ? `Google Drive: error — ${gdriveAutoError || 'revise la conexión'}`
                    : 'Google Drive / Perfil'
                }
              >
                <div className="w-7 h-7 rounded-full bg-slate-600 border border-white/50 flex items-center justify-center text-white relative shadow-xs">
                  <User size={14} />
                  {!autoBackupEnabled && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-[#17365d]" title="Pausado temporalmente" />
                  )}
                  {autoBackupEnabled && gdriveAutoStatus === 'synced' && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#17365d]" />
                  )}
                  {autoBackupEnabled && gdriveAutoStatus === 'syncing' && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse ring-2 ring-[#17365d]" />
                  )}
                  {autoBackupEnabled && gdriveAutoStatus === 'error' && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-400 ring-2 ring-[#17365d]" />
                  )}
                </div>
                <ChevronDown size={14} className="text-white/80" />
              </button>
            </div>
          </div>

          {/* Desktop Header - Modelo 1 (Fila Inferior de Botones) */}
          <div className="hidden lg:block bg-[#0e223b] border-t border-white/10 px-4 sm:px-6 py-2 shadow-inner overflow-visible">
            <div className="max-w-7xl mx-auto flex items-center gap-1.5 xl:gap-2 overflow-visible text-xs">
              {/* 1. Nuevo relevamiento (azul brillante primero) */}
              <button
                type="button"
                onClick={() => setShowNuevoRelevamientoModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold transition-colors shadow-xs shrink-0 cursor-pointer"
                title="Iniciar un nuevo relevamiento (borra todo el proyecto)"
              >
                <Plus size={14} className="shrink-0" />
                <span>Nuevo relevamiento</span>
              </button>

              {/* 2. Nuevo */}
              <button
                type="button"
                onClick={handleNuevoAmbiente}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded font-semibold transition-colors shrink-0 shadow-xs cursor-pointer"
                title="Crear un nuevo ambiente"
              >
                <Plus size={14} className="shrink-0" />
                <span>Nuevo</span>
              </button>

              {/* 3. Guardar en verde */}
              <button
                type="button"
                onClick={handleManualSave}
                disabled={!isFormValid}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-semibold transition-all shrink-0 shadow-xs ${
                  isFormValid
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                    : 'bg-slate-700/60 text-slate-400 cursor-not-allowed opacity-60 shadow-none'
                }`}
                title={
                  isFormValid
                    ? 'Guardar cambios'
                    : 'Complete Código y Ambiente para habilitar Guardar'
                }
              >
                <Save size={14} className="shrink-0" />
                <span>Guardar</span>
              </button>

              {/* 4. Fichas Guardadas (N) */}
              <button
                type="button"
                onClick={() => setShowDrawer(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded font-semibold transition-colors shrink-0 shadow-xs cursor-pointer"
                title="Listado y selección de ambientes registrados"
              >
                <LayoutList size={14} className="shrink-0" />
                <span>Fichas Guardadas ({fichas.length})</span>
              </button>

              {/* 5. Reporte Consolidado en morado */}
              <button
                type="button"
                onClick={() => setShowConsolidated(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded font-semibold transition-colors shrink-0 shadow-xs cursor-pointer"
                title="Ver reporte consolidado con cómputos y fotos"
              >
                <Layers size={14} className="shrink-0" />
                <span>Reporte Consolidado</span>
              </button>

              {/* 6. Importar proyecto */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded font-semibold transition-colors shrink-0 shadow-xs cursor-pointer"
                title="Importar archivo JSON de respaldo"
              >
                <Upload size={14} className="shrink-0" />
                <span>Importar proyecto</span>
              </button>

              {/* 7. Menú desplegable Exportar (une CSV, Exportar proyecto e Imprimir / PDF) */}
              <button
                ref={exportButtonRef}
                type="button"
                onClick={handleToggleExportDropdown}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded font-semibold transition-colors shrink-0 shadow-xs cursor-pointer"
                title="Opciones de exportación"
                aria-expanded={exportDropdownOpen}
                aria-haspopup="true"
              >
                <Download size={14} className="shrink-0" />
                <span>Exportar</span>
                <ChevronDown size={13} className={`shrink-0 transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Portal para el menú desplegable: renderizado en document.body para evitar cualquier recorte o scrollbar */}
              {exportDropdownOpen && typeof document !== 'undefined' && createPortal(
                <div
                  ref={exportDropdownRef}
                  style={{ top: `${dropdownCoords.top}px`, left: `${dropdownCoords.left}px` }}
                  className="fixed z-[9999] w-48 bg-slate-800 text-white border border-slate-700 rounded-lg shadow-2xl py-1 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => {
                      handleExportCSVWithChecklist();
                      setExportDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet size={15} className="text-emerald-400 shrink-0" />
                    <span>Exportar CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleExportProject();
                      setExportDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <Download size={15} className="text-sky-400 shrink-0" />
                    <span>Exportar proyecto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowConsolidated(true);
                      setExportDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-700 transition-colors border-t border-slate-700/60 cursor-pointer"
                  >
                    <Layers size={15} className="text-purple-400 shrink-0" />
                    <span>Resumen Consolidado (PDF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportModal(true);
                      setExportDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-700 transition-colors border-t border-slate-700/60 cursor-pointer"
                  >
                    <FileText size={15} className="text-red-400 shrink-0" />
                    <span>Exportar PDF (personalizado)</span>
                  </button>
                </div>,
                document.body
              )}

              {/* 8. Imprimir / PDF */}
              <button
                type="button"
                onClick={() => {
                  setShowExportModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded font-semibold transition-colors shrink-0 shadow-xs cursor-pointer"
                title="Personalizar e imprimir ficha o guardar como PDF"
              >
                <Printer size={14} className="shrink-0" />
                <span>Imprimir / PDF</span>
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportProject}
          />
        </header>

        {/* Auto-save Status Strip */}
        <div className="print:hidden bg-white border-b border-gray-200 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2">
          <span className={hasUnsavedChanges ? 'text-amber-700 font-semibold' : 'text-slate-500'}>
            {saveStatus || 'Autoguardado activo: los cambios se registran 2,5 s después de la última edición.'}
          </span>

          <div className="flex items-center gap-2 text-slate-500">
            {notificationPermission === 'default' && (
              <button
                type="button"
                onClick={handleRequestNotificationPermission}
                className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-900 font-medium hover:underline cursor-pointer"
                title="Habilitar notificaciones en el navegador para fallos de Drive y aviso tras sesiones largas"
              >
                <Bell size={13} className="text-sky-600 animate-pulse" />
                <span>Activar alertas de escritorio</span>
              </button>
            )}
            {notificationPermission === 'granted' && (
              <span
                className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium cursor-help"
                title="Alertas activas: el navegador te notificará si falla un respaldo o tras guardar en sesiones largas de trabajo"
              >
                <Bell size={12} className="text-emerald-600" />
                <span>Alertas activas</span>
              </span>
            )}
            {notificationPermission === 'denied' && (
              <span
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 cursor-help"
                title="Notificaciones bloqueadas en los permisos del navegador"
              >
                <BellOff size={12} className="text-slate-400" />
                <span>Alertas bloqueadas</span>
              </span>
            )}
          </div>
        </div>

        {/* Print Header */}
        <div className={`p-4 print:p-0 ${!printSections.encabezadoDoc ? 'print:hidden' : ''}`}>
          <div className="hidden print:flex items-end justify-between border-b-2 border-slate-800 pb-3 mb-5">
            <div className="flex items-center space-x-3">
              <div className="report-logo-plate flex h-[54px] w-[220px] shrink-0 items-center justify-center overflow-visible">
                <img
                  src={GSARITAMA_HEADER_LOGO}
                  alt="GSARITAMA ARQ."
                  className="report-document-logo h-full w-full shrink-0 object-contain object-center block"
                />
              </div>
              <div className="flex items-center gap-2.5">
                <div className="font-bold text-[#17365d] text-lg uppercase tracking-wide">
                  FICHA DE RELEVAMIENTO ARQUITECTÓNICO
                </div>
                {isPorVerificarPrint && (
                  <span className="px-2 py-0.5 rounded text-[10pt] font-black tracking-wider uppercase border-2 border-amber-600 bg-amber-50 text-amber-900 print:border-black print:text-black">
                    POR VERIFICAR
                  </span>
                )}
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
            onChange={handleActiveFichaChange}
            printSections={printSections}
            onFinalizarAmbiente={handleManualSave}
          />
        </div>

        {/* Saved Fichas Drawer Modal */}
        {showDrawer && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex justify-end print:hidden"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowDrawer(false);
                setDrawerSearchQuery('');
              }
            }}
          >
            <div className="w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto flex flex-col">
              {/* Encabezado del panel */}
              <div className="p-4 border-b bg-[#17365d] text-white flex justify-between items-center shrink-0">
                <div className="flex items-center space-x-2">
                  <LayoutList size={20} className="text-sky-300" />
                  <h2 className="text-base sm:text-lg font-bold tracking-wide">Fichas Guardadas</h2>
                  <span className="text-xs bg-white/20 text-sky-100 px-2 py-0.5 rounded-full font-semibold">
                    {fichas.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDrawer(false);
                    setDrawerSearchQuery('');
                  }}
                  className="text-white/80 hover:text-white font-bold p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                  title="Cerrar panel"
                  aria-label="Cerrar panel"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Selector de pestañas del panel: Ambientes vs Resumen */}
              <div className="flex border-b border-slate-200 bg-white shrink-0 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setDrawerActiveTab('ambientes')}
                  className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
                    drawerActiveTab === 'ambientes'
                      ? 'border-blue-600 text-blue-900 font-bold bg-blue-50/40'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <LayoutList size={14} className={drawerActiveTab === 'ambientes' ? 'text-blue-600' : 'text-slate-400'} />
                  <span>Ambientes ({fichas.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerActiveTab('resumen')}
                  className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
                    drawerActiveTab === 'resumen'
                      ? 'border-blue-600 text-blue-900 font-bold bg-blue-50/40'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <PieChart size={14} className={drawerActiveTab === 'resumen' ? 'text-blue-600' : 'text-slate-400'} />
                  <span>Resumen (Áreas y Estados)</span>
                </button>
              </div>

              {drawerActiveTab === 'resumen' ? (
                <div className="flex-1 overflow-y-auto">
                  <DrawerSummaryView
                    fichas={fichas}
                    projectData={projectData}
                    onSelectAmbiente={handleSelectAmbiente}
                    onFilterInList={(term) => {
                      setDrawerSearchQuery(term);
                      setDrawerActiveTab('ambientes');
                    }}
                  />
                </div>
              ) : (
                <>
                  {/* Campo de búsqueda en tiempo real */}
                  <div className="p-3 bg-slate-50 border-b border-slate-200 shrink-0">
                    <div className="relative flex items-center">
                      <Search size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={drawerSearchQuery}
                        onChange={(e) => setDrawerSearchQuery(e.target.value)}
                        placeholder="Buscar por código o nombre de ambiente..."
                        className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 placeholder-slate-400 transition-all shadow-2xs"
                        autoFocus
                      />
                      {drawerSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setDrawerSearchQuery('')}
                          className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                          title="Borrar búsqueda"
                          aria-label="Borrar búsqueda"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Resumen de resultados del filtro */}
                    {fichas.length > 0 && (
                      <div className="flex justify-between items-center mt-2 px-1 text-[11px] text-slate-500">
                        <span>
                          {drawerSearchQuery.trim()
                            ? `${filteredDrawerFichas.length} de ${fichas.length} ${filteredDrawerFichas.length === 1 ? 'ambiente encontrado' : 'ambientes encontrados'}`
                            : `${fichas.length} ${fichas.length === 1 ? 'ambiente guardado' : 'ambientes guardados'}`}
                        </span>
                        {drawerSearchQuery.trim() && (
                          <button
                            type="button"
                            onClick={() => setDrawerSearchQuery('')}
                            className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                          >
                            Limpiar filtro
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Lista de ambientes filtrados */}
                  <div className="p-4 flex-1 overflow-y-auto space-y-3">
                    {fichas.length === 0 ? (
                      <div className="text-center py-12 px-4">
                        <p className="text-slate-500 italic text-sm">No hay fichas guardadas aún.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDrawer(false);
                            handleNuevoAmbiente();
                          }}
                          className="mt-3 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-500 transition-colors cursor-pointer"
                        >
                          Crear nuevo ambiente
                        </button>
                      </div>
                    ) : filteredDrawerFichas.length === 0 ? (
                      <div className="text-center py-10 px-4 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                        <Search size={28} className="mx-auto text-slate-400 mb-2" />
                        <p className="text-sm font-semibold text-slate-700">Sin coincidencias</p>
                        <p className="text-xs text-slate-500 mt-1">
                          No se encontraron ambientes con &ldquo;{drawerSearchQuery}&rdquo; en código o nombre.
                        </p>
                        <button
                          type="button"
                          onClick={() => setDrawerSearchQuery('')}
                          className="mt-3 px-3 py-1.5 bg-blue-100 text-blue-800 rounded text-xs font-semibold hover:bg-blue-200 transition-colors cursor-pointer"
                        >
                          Mostrar todos los ambientes
                        </button>
                      </div>
                    ) : (
                      filteredDrawerFichas.map((f) => {
                        const isActive = activeFicha.id === f.id;
                        return (
                          <div
                            key={f.id}
                            className={`border rounded-lg p-3 bg-white shadow-xs hover:shadow-md transition-all ${
                              isActive ? 'border-blue-500 ring-1 ring-blue-300 bg-blue-50/20' : 'border-slate-200'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="min-w-0 pr-2">
                                <h3 className="font-bold text-sm text-slate-800 flex items-center flex-wrap gap-1.5">
                                  <span className="font-mono text-xs bg-slate-100 text-blue-900 border border-slate-200 px-1.5 py-0.5 rounded font-bold">
                                    {renderHighlightedText(f.codigo || 'S/C', drawerSearchQuery)}
                                  </span>
                                  <span className="truncate">
                                    {renderHighlightedText(f.ambiente || 'Sin nombre', drawerSearchQuery)}
                                  </span>
                                  {isActive && (
                                    <span className="text-[10px] bg-blue-600 text-white font-semibold px-1.5 py-0.2 rounded-full">
                                      En edición
                                    </span>
                                  )}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                  {f.bloque || projectData.bloque || 'Sin bloque'} | {f.nivel || 'Sin nivel'}
                                </p>
                              </div>
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded shrink-0">
                                Fotos: {f.fotos?.length || 0}
                              </span>
                            </div>
                            <div className="flex space-x-2 mt-3">
                              <button
                                type="button"
                                onClick={() => handleSelectAmbiente(f.id)}
                                className="flex-1 bg-blue-50 text-blue-700 py-1.5 rounded text-xs font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
                              >
                                {isActive ? 'Recargar' : 'Cargar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDuplicate(f.id)}
                                className="flex-1 bg-green-50 text-green-700 py-1.5 rounded text-xs font-semibold hover:bg-green-100 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <Copy size={12} className="mr-1" /> Duplicar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAmbiente(f.id)}
                                className="bg-red-50 text-red-600 p-1.5 rounded hover:bg-red-100 transition-colors cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Duplicate Modal - PRIORIDAD 4: Control de duplicados */}
        {dupTargetId && (() => {
          const target = fichas.find((f) => f.id === dupTargetId);
          return (
            <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 print:hidden">
              <div className="bg-white w-full max-w-md rounded-lg shadow-2xl overflow-hidden">
                <div className="bg-[#17365d] text-white px-4 py-3 flex items-center">
                  <Copy size={18} className="mr-2" />
                  <h2 className="text-base font-bold">Duplicar ambiente como nueva plantilla</h2>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-slate-600">
                    Se copiarán los datos dimensionales, constructivos, equipamiento e instalaciones del ambiente.
                    Revise y confirme el nombre y las dimensiones antes de crear la copia.
                  </p>

                  {target && (
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-slate-700">
                        <span>Origen: {target.codigo || 'S/C'} - {target.ambiente || 'Sin nombre'}</span>
                        <span className="text-blue-700 font-semibold uppercase text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {target.geometria || 'regular'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-100">
                        <div>Largo: <strong className="text-slate-800">{target.largo || '0.00'} m</strong></div>
                        <div>Ancho: <strong className="text-slate-800">{target.ancho || '0.00'} m</strong></div>
                        <div>Altura: <strong className="text-slate-800">{target.altura || '0.00'} m</strong></div>
                      </div>
                      <div className="text-[11px] text-slate-600 flex justify-between items-center pt-0.5">
                        <span>Superficie calculada:</span>
                        <strong className="text-emerald-700 font-bold">{calculateArea(target).toFixed(2)} m²</strong>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Nuevo Código</label>
                    <input
                      autoFocus
                      className="w-full p-2 border rounded text-xs sm:text-sm"
                      placeholder="Ej. A-02"
                      value={dupCodigo}
                      onChange={(e) => setDupCodigo(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirmDuplicate();
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Nuevo Ambiente / Área</label>
                    <input
                      className="w-full p-2 border rounded text-xs sm:text-sm"
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
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded text-sm font-semibold hover:bg-slate-300 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDuplicate}
                    className="px-3 py-1.5 bg-[#16794b] text-white rounded text-sm font-semibold hover:bg-green-600 cursor-pointer"
                  >
                    Confirmar y crear
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Manual Modal */}
        {showManual && <ManualModal onClose={() => setShowManual(false)} />}

        {/* Device Sync & Association Modal (Mobile & PC) */}
        {showSync && (
          <DeviceSyncModal
            fichas={fichas}
            projectData={projectData}
            catalogos={catalogos}
            onImportFichas={async (importedFichas, impProj, impCats) => {
              if (storageReadError) {
                throw new Error('Importación bloqueada: primero debe recuperarse la lectura del almacenamiento local.');
              }
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
            autoBackupEnabled={autoBackupEnabled}
            onToggleAutoBackup={handleToggleAutoBackup}
            onOpenGoogleDriveModal={() => {
              setShowSync(false);
              setShowGDriveModal(true);
            }}
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
              if (storageReadError) {
                throw new Error('Restauración bloqueada para proteger los registros locales mientras el almacenamiento no pueda leerse.');
              }
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
            autoBackupEnabled={autoBackupEnabled}
            onToggleAutoBackup={handleToggleAutoBackup}
          />
        )}

        {/* Modal de personalización de secciones para Exportar PDF / Imprimir */}
        <ExportPdfModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          ficha={activeFicha}
          fichas={fichas}
          projectData={projectData}
          config={printSections}
          onChangeConfig={setPrintSections}
          onConfirmPrint={(porVerificar) => {
            setIsPorVerificarPrint(Boolean(porVerificar));
            setShowExportModal(false);
            setTimeout(() => {
              window.print();
            }, 150);
          }}
        />

        {/* Modal de confirmación para Nuevo Relevamiento */}
        {showNuevoRelevamientoModal && (
          <div
            className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 print:hidden"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowNuevoRelevamientoModal(false);
            }}
          >
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-slate-200">
              {/* Header */}
              <div className="bg-red-700 text-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle size={20} className="text-amber-300 shrink-0" />
                  <h2 className="text-base font-bold tracking-wide">Nuevo relevamiento</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNuevoRelevamientoModal(false)}
                  className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                  title="Cerrar"
                  aria-label="Cerrar diálogo"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Contenido con el mensaje exacto */}
              <div className="p-5 space-y-4">
                <p className="text-sm text-slate-800 leading-relaxed font-medium">
                  {`Se borrará todo el relevamiento actual (${fichas.length} ambientes, ${fichas.length} fichas). Esta acción no se puede deshacer. ¿Deseas exportar una copia de seguridad antes de continuar?`}
                </p>
              </div>

              {/* Botones de acción solicitados */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowNuevoRelevamientoModal(false)}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold transition-colors cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleResetRelevamiento();
                    setShowNuevoRelevamientoModal(false);
                  }}
                  className="px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors cursor-pointer text-center shadow-xs"
                >
                  Continuar sin exportar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    exportProjectBackup(fichas, projectData, catalogos);
                    await handleResetRelevamiento();
                    setShowNuevoRelevamientoModal(false);
                  }}
                  className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors cursor-pointer text-center shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Download size={14} className="shrink-0" />
                  <span>Exportar y continuar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Offline Status Indicator */}
        <OfflineIndicator />
      </div>
    </CatalogProvider>
  );
}
