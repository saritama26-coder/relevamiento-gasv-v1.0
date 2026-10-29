import React, { useState, useMemo } from 'react';
import {
  FileText,
  Printer,
  X,
  CheckSquare,
  Square,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck,
} from 'lucide-react';
import { Ficha, ProjectData, PrintSectionsConfig, DEFAULT_PRINT_SECTIONS } from '../types';
import { getProjectVerificationChecklist } from '../utils/helpers';

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  ficha: Ficha;
  fichas?: Ficha[];
  projectData: ProjectData;
  config: PrintSectionsConfig;
  onChangeConfig: (config: PrintSectionsConfig) => void;
  onConfirmPrint: (porVerificar?: boolean) => void;
}

interface SectionMeta {
  key: keyof PrintSectionsConfig;
  number?: string;
  name: string;
  description: string;
  count?: number;
  countLabel?: string;
}

export function ExportPdfModal({
  isOpen,
  onClose,
  ficha,
  fichas = [],
  projectData,
  config,
  onChangeConfig,
  onConfirmPrint,
}: ExportPdfModalProps) {
  const [rememberPreference, setRememberPreference] = useState(true);

  const checklist = useMemo(() => {
    const listToVerify = fichas && fichas.length > 0 ? fichas : [ficha];
    return getProjectVerificationChecklist(listToVerify);
  }, [fichas, ficha]);

  if (!isOpen) return null;

  const sectionsList: SectionMeta[] = [
    {
      key: 'encabezadoDoc',
      name: 'Membrete institucional',
      description: 'Logo GSARITAMA, título formal y datos profesionales',
    },
    {
      key: 'datosGenerales',
      number: '1',
      name: 'Datos generales',
      description: 'Proyecto, ubicación, bloque, nivel, ambiente, código y fecha',
    },
    {
      key: 'dimensional',
      number: '2',
      name: 'Levantamiento dimensional',
      description: 'Geometría, largo, ancho, altura, área calculada, perímetro y estado',
    },
    {
      key: 'constructivos',
      number: '3',
      name: 'Elementos constructivos y acabados',
      description: 'Pisos, paredes, techos, puertas, ventanas y revestimientos',
      count: ficha.cons?.length || 0,
      countLabel: 'ítems',
    },
    {
      key: 'equipamiento',
      number: '4',
      name: 'Aparatos y equipamiento',
      description: 'Mobiliario, sanitarios y equipamiento fijo o móvil',
      count: ficha.equip?.length || 0,
      countLabel: 'ítems',
    },
    {
      key: 'electricas',
      number: '5',
      name: 'Instalaciones eléctricas',
      description: 'Puntos de luz, tomacorrientes, interruptores y tableros',
      count: ficha.elec?.length || 0,
      countLabel: 'ítems',
    },
    {
      key: 'hidrosanitarias',
      number: '6',
      name: 'Instalaciones hidrosanitarias',
      description: 'Puntos de agua potable, desagües y ventilación',
      count: ficha.hidro?.length || 0,
      countLabel: 'ítems',
    },
    {
      key: 'patologias',
      number: '7',
      name: 'Patologías y deficiencias',
      description: 'Fisuras, humedades, desprendimientos, severidad e intervención',
      count: ficha.pat?.length || 0,
      countLabel: 'patologías',
    },
    {
      key: 'cuantificacion',
      number: '8',
      name: 'Cuantificación preliminar',
      description: 'Trabajos a ejecutar, cantidades, unidades y prioridades',
      count: ficha.cuan?.length || 0,
      countLabel: 'actividades',
    },
    {
      key: 'fotografico',
      number: '9',
      name: 'Registro fotográfico',
      description: 'Fotografías del ambiente con descripción detallada',
      count: ficha.fotos?.length || 0,
      countLabel: 'fotos',
    },
    {
      key: 'observaciones',
      number: '10',
      name: 'Observaciones generales',
      description: 'Diagnóstico técnico cualitativo y notas de campo',
    },
    {
      key: 'verificacion',
      number: '11',
      name: 'Verificación y firmas',
      description: 'Responsable técnico, revisión, aprobación y fechas',
    },
    {
      key: 'resumen',
      number: '12',
      name: 'Resumen de la ficha',
      description: 'Conteo sintético de elementos, patologías y actividades',
    },
  ];

  const totalSections = sectionsList.length;
  const activeCount = Object.values(config).filter(Boolean).length;

  const handleToggle = (key: keyof PrintSectionsConfig) => {
    onChangeConfig({
      ...config,
      [key]: !config[key],
    });
  };

  const handleSelectAll = () => {
    const updated = { ...config };
    sectionsList.forEach((s) => {
      updated[s.key] = true;
    });
    onChangeConfig(updated);
  };

  const handleDeselectAll = () => {
    const updated = { ...config };
    sectionsList.forEach((s) => {
      // Keep at least datosGenerales checked so something renders
      updated[s.key] = s.key === 'datosGenerales';
    });
    onChangeConfig(updated);
  };

  const handleApplyPreset = (preset: 'completa' | 'sinFotos' | 'patologias' | 'basica') => {
    if (preset === 'completa') {
      onChangeConfig({ ...DEFAULT_PRINT_SECTIONS });
    } else if (preset === 'sinFotos') {
      onChangeConfig({
        ...DEFAULT_PRINT_SECTIONS,
        fotografico: false,
      });
    } else if (preset === 'patologias') {
      onChangeConfig({
        encabezadoDoc: true,
        datosGenerales: true,
        dimensional: true,
        constructivos: false,
        equipamiento: false,
        electricas: false,
        hidrosanitarias: false,
        patologias: true,
        cuantificacion: true,
        fotografico: false,
        observaciones: true,
        verificacion: true,
        resumen: true,
      });
    } else if (preset === 'basica') {
      onChangeConfig({
        encabezadoDoc: true,
        datosGenerales: true,
        dimensional: true,
        constructivos: true,
        equipamiento: true,
        electricas: false,
        hidrosanitarias: false,
        patologias: false,
        cuantificacion: false,
        fotografico: false,
        observaciones: true,
        verificacion: true,
        resumen: true,
      });
    }
  };

  const handlePrint = () => {
    if (rememberPreference) {
      try {
        localStorage.setItem('gasv_print_sections', JSON.stringify(config));
      } catch (e) {
        // ignore localStorage errors
      }
    }
    onConfirmPrint(checklist.hasPending);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-export-pdf-title"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full flex flex-col max-h-[92vh] overflow-hidden text-slate-800">
        {/* Header */}
        <div className="bg-[#17365d] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/20 border border-red-400/40 flex items-center justify-center text-red-300">
              <FileText size={20} />
            </div>
            <div>
              <h2 id="modal-export-pdf-title" className="text-base sm:text-lg font-bold leading-tight">
                Personalizar Exportación a PDF / Impresión
              </h2>
              <p className="text-xs text-sky-200 font-normal">
                Selecciona las secciones de la ficha que se incluirán en el reporte
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Current Ambiente Info Strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-500">Ficha activa:</span>
            <span className="font-bold text-[#17365d] bg-white px-2 py-0.5 rounded border border-slate-200">
              {ficha.codigo || 'S/C'}
            </span>
            <span className="font-medium text-slate-700">
              {ficha.ambiente || 'Sin nombre'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-slate-500">
              Proyecto: <strong className="text-slate-700">{projectData.proyecto || 'General'}</strong>
            </span>
          </div>
        </div>

        {/* PRIORIDAD 5: Lista de verificación antes de exportar */}
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <ClipboardCheck size={14} className="text-[#17365d]" />
              Lista de verificación previa a la exportación
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                checklist.hasPending
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}
            >
              {checklist.hasPending ? `${checklist.pendingCount} por verificar` : '100% Verificado'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {checklist.items.map((item) => (
              <div
                key={item.id}
                className={`p-2 rounded border flex items-start gap-2 ${
                  item.status === 'ok'
                    ? 'bg-white border-slate-200 text-slate-700'
                    : 'bg-amber-50/80 border-amber-200 text-amber-950'
                }`}
              >
                {item.status === 'ok' ? (
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[11px] leading-tight text-slate-800">{item.title}</div>
                  <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{item.detail}</div>
                </div>
              </div>
            ))}
          </div>

          {checklist.hasPending && (
            <div className="mt-2 px-2.5 py-1.5 rounded bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-900">
              <AlertTriangle size={14} className="text-amber-600 shrink-0" />
              <span className="text-[11px]">
                Existen puntos pendientes: el documento se exportará con la marca visible <strong>[POR VERIFICAR]</strong>.
              </span>
            </div>
          )}
        </div>

        {/* Presets Bar */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-100 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Sparkles size={13} className="text-amber-500" /> Plantillas rápidas
            </span>
            <div className="flex items-center space-x-2 text-xs font-semibold">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                Marcar todas
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-slate-500 hover:text-slate-700 hover:underline"
              >
                Desmarcar
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleApplyPreset('completa')}
              className="px-2.5 py-1 rounded text-xs font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 transition-colors"
            >
              Ficha completa (12/12)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('sinFotos')}
              className="px-2.5 py-1 rounded text-xs font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 transition-colors"
              title="Excluye solo las fotos para ahorrar hojas"
            >
              Sin fotos (Ecológico / Rápido)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('patologias')}
              className="px-2.5 py-1 rounded text-xs font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 transition-colors"
            >
              Diagnóstico y Patologías
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('basica')}
              className="px-2.5 py-1 rounded text-xs font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 transition-colors"
            >
              Ficha técnica básica
            </button>
          </div>
        </div>

        {/* Sections Scrollable Checklist */}
        <div className="px-5 py-3 overflow-y-auto space-y-2 flex-1 divide-y divide-slate-100">
          {sectionsList.map((sec) => {
            const isChecked = !!config[sec.key];
            return (
              <label
                key={sec.key}
                className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors pt-2.5 ${
                  isChecked
                    ? 'bg-blue-50/50 hover:bg-blue-50 border border-blue-200/60'
                    : 'bg-white hover:bg-slate-50 border border-transparent opacity-75'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggle(sec.key)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs sm:text-sm text-slate-900 leading-tight">
                      {sec.number ? `${sec.number}. ` : ''}{sec.name}
                    </span>
                    {sec.count !== undefined && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                          sec.count > 0
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {sec.count} {sec.countLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                    {sec.description}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">
              {activeCount} de {totalSections}
            </span>
            <span>secciones incluidas</span>
            {config.fotografico === false && (
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                Sin fotos (ahorro papel)
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={activeCount === 0}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-xs transition-colors ${
                activeCount > 0
                  ? 'bg-blue-700 hover:bg-blue-600 cursor-pointer'
                  : 'bg-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <FileText size={15} className="text-red-300" />
              <Printer size={15} />
              <span>Imprimir / Guardar PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
