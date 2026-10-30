import React, { useState, useMemo, useRef } from 'react';
import {
  WandSparkles,
  Trash,
  Camera,
  Image as ImageIcon,
  Copy,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { Ficha, ProjectData, PrintSectionsConfig, DEFAULT_PRINT_SECTIONS } from '../types';
import { ROOM_TEMPLATES, applyRoomTemplate } from '../constants/roomTemplates';
import { collectPathologyTransferCandidates, createPathologyRowsFromCandidates, normalizePathologySourceReference, type PathologyTransferCandidate } from '../utils/pathologyTransfer';
import { DataTable } from './DataTable';
import { useCatalogos } from '../context/CatalogContext';
import {
  ESTADOS,
  SEVERIDADES,
  PRIORIDADES,
  INTERVENCIONES,
  ASISTENTE_ELEMENTOS,
  ASISTENTE_INTERVENCIONES,
  ASISTENTE_DEFAULTS,
  getElementoDefaults,
  suggestIntervencion,
} from '../constants/catalogos';
import {
  compressImage,
  calculateArea,
  calculatePerimeter,
  priorityFromState,
  lookupReference,
  calculateFinishesTotals,
  getWorstSeverityState,
  getFichaValidationWarnings,
} from '../utils/helpers';

export const SUGGESTED_PHOTOS_TARGET = 4;

interface FichaFormProps {
  ficha: Ficha;
  projectData: ProjectData;
  onChange: (patch: Partial<Ficha>) => void;
  printSections?: PrintSectionsConfig;
  onFinalizarAmbiente?: () => void;
}

export function FichaForm({
  ficha,
  projectData,
  onChange,
  printSections = DEFAULT_PRINT_SECTIONS,
  onFinalizarAmbiente,
}: FichaFormProps) {
  const { listas } = useCatalogos();
  const codigoMissing = !String(ficha.codigo || '').trim();
  const ambienteMissing = !String(ficha.ambiente || '').trim();
  const [observationVariant, setObservationVariant] = useState(0);
  const [selectedRoomTemplate, setSelectedRoomTemplate] = useState('');
  const [showPathologyTransfer, setShowPathologyTransfer] = useState(false);
  const [pathologyTransferCandidates, setPathologyTransferCandidates] = useState<PathologyTransferCandidate[]>([]);
  const [selectedPathologySources, setSelectedPathologySources] = useState<string[]>([]);

  // Redacción técnica asistida, basada únicamente en los datos registrados en la ficha.
  // El código identificador se excluye deliberadamente del texto generado.
  const buildObservationDraft = (variant: number): string => {
    const identity = [
      ficha.ambiente ? `ambiente ${ficha.ambiente}` : '',
      ficha.bloque ? `bloque ${ficha.bloque}` : '',
    ].filter(Boolean).join(', ');

    const facts: string[] = [];
    if (ficha.geometria) {
      facts.push(`Configuración geométrica registrada: ${ficha.geometria === 'irregular' ? 'irregular' : 'regular'}.`);
    }

    const dimensions = [
      ficha.largo ? `longitud ${ficha.largo} m` : '',
      ficha.ancho ? `ancho ${ficha.ancho} m` : '',
      ficha.altura ? `altura libre ${ficha.altura} m` : '',
    ].filter(Boolean);
    if (dimensions.length) facts.push(`Levantamiento dimensional: ${dimensions.join(', ')}.`);

    const area = calculateArea(ficha);
    const perimeter = calculatePerimeter(ficha);
    if (area > 0) facts.push(`Superficie calculada: ${area.toFixed(2)} m².`);
    if (perimeter > 0) facts.push(`Perímetro calculado: ${perimeter.toFixed(2)} m.`);

    const state = ficha.estadoDimensional || ficha.diagestado;
    if (state) facts.push(`Estado general consignado: ${state}.`);
    if (ficha.interv) facts.push(`Criterio de intervención registrado: ${ficha.interv}.`);

    const describeRows = (
      title: string,
      rows: any[],
      fields: string[],
      limit = 3,
    ) => {
      const descriptions = (Array.isArray(rows) ? rows : [])
        .map((row) => {
          const element = String(row.elemento || row.descripcion || 'Elemento no especificado').trim();
          const details = fields
            .map((field) => {
              const rawValue = String(row[field] ?? '').trim();
              if (!rawValue) return '';
              const labels: Record<string, string> = {
                descripcion: 'descripción',
                dimension: 'dimensión',
                cantidad: 'cantidad',
                unidad: 'unidad',
                estado: 'estado',
                observacion: 'observación',
              };
              return `${labels[field] || field}: ${rawValue}`;
            })
            .filter(Boolean);
          if (!element || element === 'Elemento no especificado') return '';
          return details.length ? `${element} (${details.join(', ')})` : element;
        })
        .filter(Boolean)
        .slice(0, limit);
      if (descriptions.length) facts.push(`${title}: ${descriptions.join('; ')}.`);
    };

    describeRows('Elementos constructivos y acabados', ficha.cons, [
      'descripcion', 'dimension', 'cantidad', 'unidad', 'estado', 'observacion',
    ], 3);
    describeRows('Aparatos y equipamiento', ficha.equip, [
      'descripcion', 'cantidad', 'unidad', 'estado', 'observacion',
    ], 3);
    describeRows('Instalaciones eléctricas', ficha.elec, [
      'cantidad', 'unidad', 'estado', 'observacion',
    ], 3);
    describeRows('Instalaciones hidrosanitarias', ficha.hidro, [
      'cantidad', 'unidad', 'estado', 'observacion',
    ], 3);

    const pathologies = (Array.isArray(ficha.pat) ? ficha.pat : [])
      .filter((row) => row.elemento || row.patologia)
      .map((row) => {
        const details = [
          row.patologia ? `patología: ${row.patologia}` : '',
          row.cantidad ? `cantidad afectada: ${row.cantidad}` : '',
          row.unidad ? `unidad: ${row.unidad}` : '',
          row.severidad ? `severidad: ${row.severidad}` : '',
          row.intervencion ? `intervención recomendada: ${row.intervencion}` : '',
        ].filter(Boolean);
        return `${row.elemento || 'Elemento afectado'}${details.length ? ` (${details.join(', ')})` : ''}`;
      })
      .slice(0, 4);
    if (pathologies.length) facts.push(`Patologías y deficiencias registradas: ${pathologies.join('; ')}.`);

    if (Array.isArray(ficha.fotos) && ficha.fotos.length) {
      facts.push(`Registro fotográfico asociado: ${ficha.fotos.length} fotografía(s).`);
    }

    const openings = [
      `En la inspección arquitectónica del ${identity || 'ambiente evaluado'}, se registran los siguientes aspectos técnicos.`,
      `El relevamiento del ${identity || 'ambiente evaluado'} consigna las condiciones dimensionales y los componentes descritos a continuación.`,
      `La evaluación visual del ${identity || 'ambiente evaluado'} se resume a partir de los datos incorporados en la ficha.`,
    ];
    const closing = 'La descripción se limita a la información registrada y debe contrastarse con la inspección técnica en sitio.';
    const orderedFacts = variant % 3 === 1
      ? [...facts].reverse()
      : variant % 3 === 2
        ? facts.filter((_, index) => index % 2 === 0).concat(facts.filter((_, index) => index % 2 === 1))
        : facts;
    const fullText = [openings[variant % 3], ...orderedFacts, closing].join(' ');
    return fullText.trim().split(/\\s+/).slice(0, 200).join(' ');
  };

  const handleGenerateObservation = (regenerate = false) => {
    if (String(ficha.obs || '').trim() && !window.confirm('La observación general ya contiene texto. ¿Desea reemplazarlo con una nueva propuesta?')) return;
    const nextVariant = regenerate ? (observationVariant + 1) % 3 : 0;
    onChange({ obs: buildObservationDraft(nextVariant) });
    setObservationVariant(nextVariant);
  };

  const handleCopyObservations = async () => {
    const text = String(ficha.obs || '').trim();
    if (!text) {
      alert('No hay observaciones para copiar.');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      alert('Observaciones copiadas.');
    } catch {
      window.prompt('Copie las observaciones generales:', text);
    }
  };

  const handleClearObservations = () => {
    if (!String(ficha.obs || '').trim()) return;
    if (window.confirm('¿Desea limpiar las observaciones generales?')) onChange({ obs: '' });
  };

  const handleApplyRoomTemplate = () => {
    const template = ROOM_TEMPLATES.find((item) => item.id === selectedRoomTemplate);
    if (!template) return;

    const result = applyRoomTemplate(ficha, template);
    if (result.addedCount === 0) {
      alert('La ficha ya contiene todos los elementos de esta plantilla. No se modificó ningún dato.');
      return;
    }

    const detail = [
      `• Elementos constructivos: ${result.addedBySection.cons}`,
      `• Equipamiento: ${result.addedBySection.equip}`,
      `• Instalaciones eléctricas: ${result.addedBySection.elec}`,
      `• Instalaciones hidrosanitarias: ${result.addedBySection.hidro}`,
    ].join('\n');

    const confirmed = window.confirm(
      `Se agregarán ${result.addedCount} elementos de referencia para "${template.label}":\n\n${detail}\n\nNo se reemplazarán los registros existentes. Las cantidades, dimensiones, estados y observaciones quedarán vacíos para su verificación en sitio.\n\n¿Desea aplicar la plantilla?`
    );
    if (!confirmed) return;

    onChange({
      ...result.patch,
      ...(String(ficha.ambiente || '').trim() ? {} : { ambiente: template.ambiente }),
    });
  };

  const [asistente, setAsistente] = useState({
    elemento: '',
    estado: 'Bueno',
    intervencion: 'Reparación',
    actividad: '',
    cantidad: '',
    unidad: '',
    origen: '',
  });

  const handleAsistenteElementoChange = (elem: string) => {
    const updated = { ...asistente, elemento: elem };
    const defaults = ASISTENTE_DEFAULTS[elem];
    if (elem && defaults) {
      updated.actividad = defaults[0];
      updated.unidad = defaults[1];
    }
    if (updated.estado === 'Crítico') {
      updated.intervencion = 'Intervención integral';
    }

    const ref = lookupReference(ficha, elem);
    updated.origen = '';
    if (ref) {
      if (!String(updated.cantidad || '').trim()) {
        updated.cantidad = ref.cantidad;
      }
      if (!String(updated.unidad || '').trim()) {
        updated.unidad = ref.unidad;
      }
      updated.cantidad = ref.cantidad;
      updated.unidad = ref.unidad || updated.unidad;
      updated.origen = 'Referencia automática: ' + ref.origen;
    }
    setAsistente(updated);
  };

  const handleAsistenteEstadoChange = (st: string) => {
    setAsistente((prev) => ({
      ...prev,
      estado: st,
      intervencion: st === 'Crítico' ? 'Intervención integral' : prev.intervencion,
    }));
  };

  const handleAgregarAsistente = () => {
    if (!asistente.elemento.trim()) {
      alert('Seleccione el elemento que desea cuantificar.');
      return;
    }
    if (!asistente.actividad.trim() || !String(asistente.cantidad).trim() || !asistente.unidad.trim()) {
      alert('Complete actividad, cantidad y unidad.');
      return;
    }

    const nuevaFila = {
      id: Math.random().toString(),
      codigo: ficha.codigo,
      elemento: asistente.elemento,
      actividad: asistente.actividad,
      cantidad: asistente.cantidad,
      unidad: asistente.unidad,
      estado: asistente.estado,
      prioridad: priorityFromState(asistente.estado),
    };

    onChange({ cuan: [...ficha.cuan, nuevaFila] });
    setAsistente((prev) => ({
      ...prev,
      elemento: '',
      actividad: '',
      cantidad: '',
      unidad: '',
      origen: '',
    }));
  };

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadFotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    e.target.value = '';
    const newFotos = await Promise.all(
      files.map(async (file) => {
        const compressed = await compressImage(file);
        return {
          id: Math.random().toString(),
          src: compressed,
          desc: '',
        };
      })
    );
    onChange({ fotos: [...ficha.fotos, ...newFotos] });
  };

  const handlePasarSeccion8 = () => {
    const patologias = Array.isArray(ficha.pat) ? ficha.pat : [];
    const cuantificaciones = Array.isArray(ficha.cuan) ? ficha.cuan : [];
    const buildQuantification = (p: (typeof patologias)[number]) => {
      const estado = p.severidad === 'Crítica' ? 'Crítico' : p.severidad === 'Severa' ? 'Malo' : 'Regular';
      const prioridad = p.severidad === 'Crítica' || p.severidad === 'Severa'
        ? 'Alta'
        : p.severidad === 'Moderada' ? 'Media' : 'Baja';
      const actividad = `${p.intervencion || 'Reparación'} de ${p.elemento.toLowerCase()} por ${p.patologia.toLowerCase()}`.trim();
      return { estado, prioridad, actividad };
    };
    const normalizeFingerprintPart = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase();
    const fingerprint = (row: {
      codigo?: string; elemento?: string; actividad?: string; cantidad?: string;
      unidad?: string; estado?: string; prioridad?: string;
    }) => [
      row.codigo, row.elemento, row.actividad, row.cantidad, row.unidad, row.estado, row.prioridad,
    ].map(normalizeFingerprintPart).join('|');

    const diagnosticosCompletos = patologias.filter((p) => {
      const cantidad = Number(String(p.cantidad || '').replace(',', '.'));
      return Boolean(
        String(p.elemento || '').trim() &&
        String(p.patologia || '').trim() &&
        String(p.unidad || '').trim() &&
        String(p.severidad || '').trim() &&
        Number.isFinite(cantidad) &&
        cantidad > 0
      );
    });
    const pendientes = patologias.filter((p) =>
      String(p.elemento || '').trim() &&
      String(p.patologia || '').trim() &&
      !(
        String(p.unidad || '').trim() &&
        String(p.severidad || '').trim() &&
        Number.isFinite(Number(String(p.cantidad || '').replace(',', '.'))) &&
        Number(String(p.cantidad || '').replace(',', '.')) > 0
      )
    );

    // Vincula también las actividades creadas por versiones anteriores,
    // que todavía no tenían origenPatologiaId, usando su contenido exacto.
    const pathologyByFingerprint = new Map(
      diagnosticosCompletos.map((p) => {
        const details = buildQuantification(p);
        return [fingerprint({
          codigo: ficha.codigo,
          elemento: p.elemento,
          actividad: details.actividad,
          cantidad: p.cantidad,
          unidad: p.unidad,
          estado: details.estado,
          prioridad: details.prioridad,
        }), p.id] as const;
      })
    );
    const cuantificacionesVinculadas = cuantificaciones.map((item) => {
      if (item.origenPatologiaId) return item;
      const sourceId = pathologyByFingerprint.get(fingerprint(item));
      return sourceId ? { ...item, origenPatologiaId: sourceId } : item;
    });
    const transferidasActualizadas = new Set(
      cuantificacionesVinculadas.map((item) => String(item.origenPatologiaId || '')).filter(Boolean)
    );
    const nuevas = diagnosticosCompletos.filter((p) => !transferidasActualizadas.has(String(p.id)));
    const omitidasPorDuplicado = diagnosticosCompletos.length - nuevas.length;

    if (!nuevas.length) {
      alert(
        diagnosticosCompletos.length === 0
          ? 'No hay patologías completas para cuantificar. Complete patología, cantidad afectada, unidad y severidad en la Sección 7.'
          : 'Las patologías completas ya fueron transferidas a la Sección 8. No se generaron duplicados.'
      );
      return;
    }

    const filas = nuevas.map((p) => {
      const details = buildQuantification(p);
      return {
        id: Math.random().toString(),
        codigo: ficha.codigo,
        elemento: p.elemento,
        actividad: details.actividad,
        cantidad: p.cantidad,
        unidad: p.unidad,
        estado: details.estado,
        prioridad: details.prioridad,
        origenPatologiaId: p.id,
      };
    });

    onChange({ cuan: [...cuantificacionesVinculadas, ...filas] });
    alert(
      `${filas.length} actividad(es) transferida(s) a la Sección 8.` +
      (omitidasPorDuplicado ? ` ${omitidasPorDuplicado} ya existían y no se duplicaron.` : '') +
      (pendientes.length ? ` ${pendientes.length} diagnóstico(s) siguen pendientes de completar cantidad, unidad o severidad.` : '')
    );
  };

  const areaCalculada = useMemo(() => calculateArea(ficha).toFixed(2), [ficha]);
  const perimetroCalculado = useMemo(() => {
    if (ficha.geometria === 'irregular') return 'No calculado';
    return calculatePerimeter(ficha).toFixed(2);
  }, [ficha]);

  const safeNum = (v: string) => {
    if (typeof (window as any).Gsv2d === 'function') {
      return (window as any).Gsv2d(v);
    }
    const n = parseFloat(String(v || '').replace(',', '.'));
    return isNaN(n) ? v : n.toFixed(2);
  };

  /**
   * Asistencia de la sección 7:
   * - Al seleccionar un elemento, solo propone la unidad de referencia.
   * - La patología, ubicación, cantidad afectada y severidad son decisiones del inspector.
   * - Sugiere la intervención únicamente después de registrar patología o severidad.
   */
  const handleOpenPathologyTransfer = () => {
    const candidates = collectPathologyTransferCandidates(ficha);
    setPathologyTransferCandidates(candidates);
    setSelectedPathologySources([]);
    setShowPathologyTransfer(true);
  };

  const handleTogglePathologySource = (key: string) => {
    setSelectedPathologySources((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  };

  const handleSelectAllPathologySources = () => {
    setSelectedPathologySources(pathologyTransferCandidates.map((candidate) => candidate.key));
  };

  const handleClearPathologySources = () => {
    setSelectedPathologySources([]);
  };

  const handleApplyPathologyTransfer = () => {
    // Releer las secciones de origen justo antes de transferir para no usar
    // una selección que quedó desactualizada mientras el panel estaba abierto.
    const freshCandidates = collectPathologyTransferCandidates(ficha);
    const rows = createPathologyRowsFromCandidates(
      freshCandidates,
      selectedPathologySources,
    );
    if (!rows.length) {
      alert('Los registros seleccionados ya fueron transferidos o no hay elementos nuevos.');
      return;
    }

    onChange({ pat: [...(Array.isArray(ficha.pat) ? ficha.pat : []), ...rows] });
    setShowPathologyTransfer(false);
    setPathologyTransferCandidates([]);
    setSelectedPathologySources([]);
  };

  const handlePatTableChange = (newData: any[]) => {
    const updated = newData.map((row, idx) => {
      const prev = ficha.pat[idx];
      let newRow = { ...row };

      // Al seleccionar el elemento solo se sugiere la unidad.
      // No se presume daño, severidad, cantidad afectada, ubicación ni intervención.
      if ((!prev || row.elemento !== prev.elemento) && row.elemento) {
        const defaults = getElementoDefaults(row.elemento);
        if (defaults?.unidad && (!row.unidad || (prev && row.unidad === prev.unidad))) {
          newRow.unidad = defaults.unidad;
        }
      }

      // La intervención se sugiere únicamente cuando ya se ha registrado
      // una patología o severidad de forma expresa.
      const patologiaChanged = prev && row.patologia !== prev.patologia;
      const severidadChanged = prev && row.severidad !== prev.severidad;
      const intervencionChangedByUser = prev && row.intervencion !== prev.intervencion;

      if (!intervencionChangedByUser && (patologiaChanged || severidadChanged || (!newRow.intervencion && (newRow.patologia || newRow.severidad)))) {
        const suggested = suggestIntervencion(newRow.patologia, newRow.severidad, newRow.elemento);
        if (suggested) {
          newRow.intervencion = suggested;
        }
      }

      return newRow;
    });

    onChange({ pat: updated });
  };

  const handleGenericElemTableChange = (key: 'cons' | 'equip' | 'elec' | 'hidro', newData: any[]) => {
    const prevList = (ficha[key] as any[]) || [];
    const updated = newData.map((row, idx) => {
      const prev = prevList[idx];
      let newRow = { ...row };
      if (!prev || row.elemento !== prev.elemento) {
        if (row.elemento) {
          const defaults = getElementoDefaults(row.elemento);
          if (defaults) {
            if (defaults.unidad && (!row.unidad || (prev && row.unidad === prev.unidad))) {
              newRow.unidad = defaults.unidad;
            }
            if ((newRow.unidad === 'u' || defaults.unidad === 'u') && (!newRow.cantidad || newRow.cantidad === '0.00' || newRow.cantidad === '0')) {
              newRow.cantidad = '1.00';
            }
          }
        }
      }
      return newRow;
    });
    onChange({ [key]: updated });
  };

  const fotoCount = Array.isArray(ficha.fotos) ? ficha.fotos.length : 0;
  const photoPercentage = Math.min(100, Math.round((fotoCount / SUGGESTED_PHOTOS_TARGET) * 100));
  const hasZeroPhotos = fotoCount === 0;
  const hasMetPhotoTarget = fotoCount >= SUGGESTED_PHOTOS_TARGET;

  const finishesTotals = useMemo(() => calculateFinishesTotals(ficha), [ficha]);
  const worstSeverityInfo = useMemo(() => getWorstSeverityState(ficha.pat), [ficha.pat]);
  const validationWarnings = useMemo(() => getFichaValidationWarnings(ficha), [ficha]);

  const handleFinalizarClick = () => {
    if (codigoMissing || ambienteMissing) {
      alert('Por favor complete el Código y el Nombre de Ambiente antes de finalizar.');
      return;
    }
    if (hasZeroPhotos) {
      const proceed = confirm(
        '⚠️ Alerta de Registro Fotográfico:\n\nEste ambiente tiene 0 fotografías registradas (se sugiere un objetivo de al menos 4 fotos representativas).\n\n¿Deseas finalizar y guardar este ambiente sin fotografías, o prefieres cargarlas ahora?'
      );
      if (!proceed) {
        document.getElementById('seccion-registro-fotografico')?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    if (validationWarnings.length > 0) {
      const summaryText = validationWarnings.slice(0, 3).map((w) => `• ${w}`).join('\n');
      const moreCount = validationWarnings.length > 3 ? `\n• ...y ${validationWarnings.length - 3} aviso(s) más.` : '';
      const proceed = confirm(
        `⚠️ Avisos informativos de revisión técnica (${validationWarnings.length}):\n\n${summaryText}${moreCount}\n\n¿Deseas finalizar y guardar el ambiente de todos modos?`
      );
      if (!proceed) return;
    }
    if (onFinalizarAmbiente) {
      onFinalizarAmbiente();
    } else {
      alert('Ambiente validado y guardado correctamente.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 print:hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-blue-950">Registro rápido por plantilla</h2>
            <p className="mt-1 text-xs text-blue-800">
              Cargue una lista inicial de elementos según el tipo de ambiente. Revise y elimine lo que no exista en sitio.
            </p>
            <label htmlFor="gasv-room-template" className="mt-3 block text-xs font-semibold text-slate-700">
              Tipo de ambiente
            </label>
            <select
              id="gasv-room-template"
              className="mt-1 w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm sm:max-w-md"
              value={selectedRoomTemplate}
              onChange={(event) => setSelectedRoomTemplate(event.target.value)}
            >
              <option value="" disabled>Seleccione un tipo de ambiente</option>
              {ROOM_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>{template.label}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-600">
              {ROOM_TEMPLATES.find((template) => template.id === selectedRoomTemplate)?.description || 'Seleccione una plantilla para consultar los elementos sugeridos.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleApplyRoomTemplate}
            disabled={!selectedRoomTemplate}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <WandSparkles size={16} />
            Aplicar plantilla
          </button>
        </div>
        <p className="mt-2 text-[11px] text-blue-900">
          La plantilla no asigna cantidades ni estados. Solo agrega referencias; la inspección profesional determina los datos reales.
        </p>
      </div>
      {/* 1. Datos Generales */}
      <div className={`print-card bg-white p-6 rounded-lg shadow-sm border border-gray-200 ${!printSections.datosGenerales ? 'print:hidden' : ''}`}>
        <h2 className="text-xl font-semibold text-blue-900 mb-4 border-b pb-2 print:text-lg">
          1. Datos generales
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500">Proyecto</label>
            <input className="w-full p-2 border rounded bg-gray-50 text-xs sm:text-sm" readOnly value={projectData.proyecto} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500">Ubicación</label>
            <input className="w-full p-2 border rounded bg-gray-50 text-xs sm:text-sm" readOnly value={projectData.ubicacion} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500">Bloque / Edificio</label>
            <input
              className="w-full p-2 border rounded text-xs sm:text-sm"
              value={ficha.bloque || projectData.bloque}
              onChange={(e) => onChange({ bloque: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500">Nivel / Planta</label>
            <input
              className="w-full p-2 border rounded text-xs sm:text-sm"
              value={ficha.nivel}
              onChange={(e) => onChange({ nivel: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500">Ambiente / Área</label>
            <input
              className={`w-full p-2 border rounded text-xs sm:text-sm transition-all ${
                ambienteMissing
                  ? 'border-2 border-red-500 bg-red-50/40 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-600'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              }`}
              aria-invalid={ambienteMissing}
              placeholder="Ej. Sala de Estar, Dormitorio..."
              value={ficha.ambiente}
              onChange={(e) => onChange({ ambiente: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500">Código</label>
            <input
              className={`w-full p-2 border rounded text-xs sm:text-sm transition-all ${
                codigoMissing
                  ? 'border-2 border-red-500 bg-red-50/40 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-600'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              }`}
              aria-invalid={codigoMissing}
              placeholder="Ej. A-01, LAB-02..."
              value={ficha.codigo}
              onChange={(e) => onChange({ codigo: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500">Fecha</label>
            <input
              type="date"
              className="w-full p-2 border rounded text-xs sm:text-sm"
              value={ficha.fecha}
              onChange={(e) => onChange({ fecha: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500">Responsable</label>
            <input
              className="w-full p-2 border rounded text-xs sm:text-sm"
              value={ficha.responsable || projectData.profesional || 'Arq. Gabriel Saritama Veira'}
              onChange={(e) => onChange({ responsable: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* 2. Levantamiento dimensional */}
      <div className={`print-card bg-white p-6 rounded-lg shadow-sm border border-gray-200 ${!printSections.dimensional ? 'print:hidden' : ''}`}>
        <h2 className="text-xl font-semibold text-blue-900 mb-4 border-b pb-2 print:text-lg">
          2. Levantamiento dimensional
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500">Tipo de geometría</label>
            <select
              className="w-full p-2 border rounded text-xs sm:text-sm"
              value={ficha.geometria}
              onChange={(e) => onChange({ geometria: e.target.value as 'regular' | 'irregular' })}
            >
              <option value="regular">Regular</option>
              <option value="irregular">Irregular</option>
            </select>
          </div>

          {ficha.geometria === 'regular' ? (
            <>
              <div>
                <label className="text-xs font-bold text-gray-500">Largo (m)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full p-2 border rounded"
                  value={ficha.largo}
                  onBlur={(e) => onChange({ largo: safeNum(e.target.value) })}
                  onChange={(e) => onChange({ largo: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">Ancho (m)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full p-2 border rounded"
                  value={ficha.ancho}
                  onBlur={(e) => onChange({ ancho: safeNum(e.target.value) })}
                  onChange={(e) => onChange({ ancho: e.target.value })}
                />
              </div>
            </>
          ) : (
            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-500">Área del ambiente (m²)</label>
              <input
                type="number"
                step="0.01"
                className="w-full p-2 border rounded"
                value={ficha.areaDirecta}
                onBlur={(e) => onChange({ areaDirecta: safeNum(e.target.value) })}
                onChange={(e) => onChange({ areaDirecta: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-500">Altura libre (m)</label>
            <input
              type="number"
              step="0.01"
              className="w-full p-2 border rounded"
              value={ficha.altura}
              onBlur={(e) => onChange({ altura: safeNum(e.target.value) })}
              onChange={(e) => onChange({ altura: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500">Área registrada (m²)</label>
            <input className="w-full p-2 border rounded bg-gray-50" readOnly value={areaCalculada} />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500">Perímetro calculado (m)</label>
            <input className="w-full p-2 border rounded bg-gray-50" readOnly value={perimetroCalculado} />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500">Estado general de conservación</label>
            <select
              className="w-full p-2 border rounded"
              value={ficha.estadoDimensional || ficha.diagestado || 'Bueno'}
              onChange={(e) => onChange({ estadoDimensional: e.target.value, diagestado: e.target.value })}
            >
              {ESTADOS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
            {ficha.pat.length > 0 && worstSeverityInfo.estado && (ficha.estadoDimensional || ficha.diagestado) !== worstSeverityInfo.estado && (
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200">
                <span>Peor severidad: <strong>{worstSeverityInfo.severidadMax}</strong> ({worstSeverityInfo.estado})</span>
                <button
                  type="button"
                  onClick={() => onChange({ estadoDimensional: worstSeverityInfo.estado, diagestado: worstSeverityInfo.estado })}
                  className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded font-bold transition-colors cursor-pointer text-[10px]"
                >
                  Sincronizar a {worstSeverityInfo.estado}
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500">Intervención recomendada</label>
            <select
              className="w-full p-2 border rounded"
              value={ficha.interv || 'Mantenimiento preventivo'}
              onChange={(e) => onChange({ interv: e.target.value })}
            >
              {INTERVENCIONES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Elementos constructivos y acabados */}
      <div className={`print-card bg-white p-6 rounded-lg shadow-sm border border-gray-200 ${!printSections.constructivos ? 'print:hidden' : ''}`}>
        <h2 className="text-xl font-semibold text-blue-900 mb-4 border-b pb-2 print:text-lg">
          3. Elementos constructivos y acabados
        </h2>
        <DataTable
          data={ficha.cons}
          onChange={(newData) => handleGenericElemTableChange('cons', newData)}
          columns={[
            { key: 'elemento', label: 'Elemento', type: 'text', dataListId: 'list-cons-elem' },
            { key: 'descripcion', label: 'Descripción', type: 'text' },
            { key: 'dimension', label: 'Dimensión', type: 'text' },
            { key: 'cantidad', label: 'Cantidad', type: 'number', width: '10%' },
            { key: 'unidad', label: 'Unidad', type: 'text', dataListId: 'list-unidades', width: '10%' },
            { key: 'estado', label: 'Estado', type: 'select', options: ESTADOS, width: '15%' },
            { key: 'observacion', label: 'Observación', type: 'text' },
          ]}
        />
      </div>

      {/* 4. Aparatos y equipamiento */}
      <div className={`print-card bg-white p-6 rounded-lg shadow-sm border border-gray-200 ${!printSections.equipamiento ? 'print:hidden' : ''}`}>
        <h2 className="text-xl font-semibold text-blue-900 mb-4 border-b pb-2 print:text-lg">
          4. Aparatos y equipamiento
        </h2>
        <DataTable
          data={ficha.equip}
          onChange={(newData) => handleGenericElemTableChange('equip', newData)}
          columns={[
            { key: 'elemento', label: 'Elemento', type: 'text', dataListId: 'list-equip-elem' },
            { key: 'descripcion', label: 'Descripción', type: 'text' },
            { key: 'cantidad', label: 'Cantidad', type: 'number', width: '10%' },
            { key: 'unidad', label: 'Unidad', type: 'text', dataListId: 'list-unidades', width: '10%' },
            { key: 'estado', label: 'Estado', type: 'select', options: ESTADOS, width: '15%' },
            { key: 'observacion', label: 'Observación', type: 'text' },
          ]}
        />
      </div>

      {/* 5. Instalaciones eléctricas */}
      <div className={`print-card bg-white p-6 rounded-lg shadow-sm border border-gray-200 ${!printSections.electricas ? 'print:hidden' : ''}`}>
        <h2 className="text-xl font-semibold text-blue-900 mb-4 border-b pb-2 print:text-lg">
          5. Instalaciones eléctricas
        </h2>
        <DataTable
          data={ficha.elec}
          onChange={(newData) => handleGenericElemTableChange('elec', newData)}
          columns={[
            { key: 'elemento', label: 'Elemento', type: 'text', dataListId: 'list-elec-elem' },
            { key: 'cantidad', label: 'Cantidad', type: 'number', width: '15%' },
            { key: 'unidad', label: 'Unidad', type: 'text', dataListId: 'list-unidades', width: '15%' },
            { key: 'estado', label: 'Estado', type: 'select', options: ESTADOS, width: '20%' },
            { key: 'observacion', label: 'Observación', type: 'text' },
          ]}
        />
      </div>

      {/* 6. Instalaciones hidrosanitarias */}
      <div className={`print-card bg-white p-6 rounded-lg shadow-sm border border-gray-200 ${!printSections.hidrosanitarias ? 'print:hidden' : ''}`}>
        <h2 className="text-xl font-semibold text-blue-900 mb-4 border-b pb-2 print:text-lg">
          6. Instalaciones hidrosanitarias
        </h2>
        <DataTable
          data={ficha.hidro}
          onChange={(newData) => handleGenericElemTableChange('hidro', newData)}
          columns={[
            { key: 'elemento', label: 'Elemento', type: 'text', dataListId: 'list-hidro-elem' },
            { key: 'cantidad', label: 'Cantidad', type: 'number', width: '15%' },
            { key: 'unidad', label: 'Unidad', type: 'text', dataListId: 'list-unidades', width: '15%' },
            { key: 'estado', label: 'Estado', type: 'select', options: ESTADOS, width: '20%' },
            { key: 'observacion', label: 'Observación', type: 'text' },
          ]}
        />
      </div>

      {/* 7. Patologías y deficiencias */}
      <div className={`print-card bg-white p-6 rounded-lg shadow-sm border border-gray-200 ${!printSections.patologias ? 'print:hidden' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b pb-2">
          <h2 className="text-xl font-semibold text-blue-900 print:text-lg">
            7. Patologías y deficiencias
          </h2>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button
              type="button"
              onClick={handleOpenPathologyTransfer}
              className="text-sm bg-emerald-100 text-emerald-800 px-3 py-2 rounded hover:bg-emerald-200 font-semibold"
            >
              Detectar novedades de secciones 3–6
            </button>
            <button
              type="button"
              onClick={handlePasarSeccion8}
              className="text-sm bg-blue-100 text-blue-800 px-3 py-2 rounded hover:bg-blue-200 font-medium"
            >
              Pasar a sección 8
            </button>
          </div>
        </div>
        <p className="mb-3 text-xs text-slate-600 print:hidden">
          La detección propone elementos con estado Regular, Malo o Crítico, o con observaciones informativas.
          La cantidad y unidad se precargan desde el inventario como referencia editable; confirme o ajuste la cantidad realmente afectada.
          La transferencia no confirma una patología: el daño y la severidad deben verificarse. La ubicación se documenta mediante fotografías del sector afectado.
        </p>
        {showPathologyTransfer && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 print:hidden">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-emerald-950">Revisar novedades del inventario</h3>
                <p className="mt-1 text-xs text-emerald-900">
                  Seleccione únicamente los registros que requieren diagnóstico en la sección 7.
                  Los elementos en buen estado sin observaciones no se muestran.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPathologyTransfer(false)}
                className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-white"
              >
                Cerrar
              </button>
            </div>
            {pathologyTransferCandidates.length === 0 ? (
              <div className="mt-3 rounded-md border border-emerald-100 bg-white p-3 text-sm text-slate-600">
                No se encontraron novedades pendientes. Puede revisar los estados y observaciones de las secciones 3, 4, 5 y 6.
              </div>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-emerald-950">
                    {pathologyTransferCandidates.length} registro(s) disponible(s) · {selectedPathologySources.length} seleccionado(s)
                  </span>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleSelectAllPathologySources} className="text-xs font-semibold text-emerald-800 underline">
                      Seleccionar todos
                    </button>
                    <button type="button" onClick={handleClearPathologySources} className="text-xs text-slate-600 underline">
                      Limpiar selección
                    </button>
                  </div>
                </div>
                <div className="mt-2 max-h-72 space-y-2 overflow-y-auto">
                  {pathologyTransferCandidates.map((candidate) => (
                    <label key={candidate.key} className="flex cursor-pointer items-start gap-3 rounded-md border border-emerald-100 bg-white p-3 hover:border-emerald-300">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-emerald-700"
                        checked={selectedPathologySources.includes(candidate.key)}
                        onChange={() => handleTogglePathologySource(candidate.key)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
                          {candidate.element}
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            {candidate.state || 'Con detalle registrado'}
                          </span>
                        </span>
                        <span className="mt-1 block text-[11px] text-slate-500">{candidate.sourceLabel}</span>
                        {candidate.quantity && (
                          <span className="mt-1 block text-xs text-slate-600">
                            Cantidad inventariada: {candidate.quantity} {candidate.unit}
                          </span>
                        )}
                        {candidate.detail && (
                          <span className="mt-1 block text-xs text-slate-700">{candidate.detail}</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPathologyTransfer(false)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={selectedPathologySources.length === 0}
                    onClick={handleApplyPathologyTransfer}
                    className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    Transferir seleccionados ({selectedPathologySources.length})
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        <DataTable
          data={ficha.pat.map((row) => ({
            ...row,
            referenciaOrigen: normalizePathologySourceReference(row.referenciaOrigen),
          }))}
          onChange={handlePatTableChange}
          fixedLayout
          actionWidth="14%"
          actionMinWidth={172}
          columns={[
            { key: 'elemento', label: 'Elemento afectado', type: 'text', dataListId: 'list-pat-elem', width: '15%' },
            { key: 'patologia', label: 'Patología / deficiencia', type: 'text', dataListId: 'list-pat-tipos', width: '13%' },
            
            { key: 'cantidad', label: 'Cantidad afectada', type: 'number', width: '8%' },
            { key: 'unidad', label: 'Unidad', type: 'text', dataListId: 'list-unidades', width: '6%' },
            { key: 'severidad', label: 'Severidad', type: 'select', options: SEVERIDADES, width: '10%' },
            { key: 'intervencion', label: 'Intervención recomendada', type: 'select', options: INTERVENCIONES, width: '12%' },
            { key: 'referenciaOrigen', label: 'Referencia de origen', type: 'text', width: '22%', displayOnly: true },
          ]}
        />
      </div>

      {/* 8. Cuantificación preliminar */}
      <div className={`print-card bg-white p-6 rounded-lg shadow-sm border border-gray-200 ${!printSections.cuantificacion ? 'print:hidden' : ''}`}>
        <h2 className="text-xl font-semibold text-blue-900 mb-4 border-b pb-2 print:text-lg">
          8. Cuantificación preliminar
        </h2>

        {/* Totales sumados automáticamente de cerámica y pintura */}
        {(finishesTotals.ceramicaTotal > 0 || finishesTotals.pinturaTotal > 0) && (
          <div className="print:hidden mb-4 p-3 bg-blue-50/80 border border-blue-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-700">
              <strong className="text-blue-950">Totales calculados de acabados:</strong>{' '}
              {finishesTotals.ceramicaTotal > 0 && <span>Cerámica: <strong className="text-blue-900">{finishesTotals.ceramicaTotal.toFixed(2)} m²</strong> </span>}
              {finishesTotals.pinturaTotal > 0 && <span>· Pintura: <strong className="text-blue-900">{finishesTotals.pinturaTotal.toFixed(2)} m²</strong></span>}
            </span>
            <div className="flex flex-wrap gap-2">
              {finishesTotals.ceramicaTotal > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const row = {
                      id: Math.random().toString(),
                      codigo: ficha.codigo,
                      elemento: 'Cerámica',
                      actividad: 'Reposición / reparación de cerámica según alcance',
                      cantidad: finishesTotals.ceramicaTotal.toFixed(2),
                      unidad: 'm²',
                      estado: ficha.estadoDimensional || 'Bueno',
                      prioridad: priorityFromState(ficha.estadoDimensional || 'Bueno'),
                    };
                    onChange({ cuan: [...ficha.cuan, row] });
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-800 border border-blue-300 rounded font-semibold transition-colors cursor-pointer text-xs"
                >
                  + Agregar Cerámica ({finishesTotals.ceramicaTotal.toFixed(2)} m²)
                </button>
              )}
              {finishesTotals.pinturaTotal > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const row = {
                      id: Math.random().toString(),
                      codigo: ficha.codigo,
                      elemento: 'Pintura',
                      actividad: 'Pintura y resanes de superficies según alcance',
                      cantidad: finishesTotals.pinturaTotal.toFixed(2),
                      unidad: 'm²',
                      estado: ficha.estadoDimensional || 'Bueno',
                      prioridad: priorityFromState(ficha.estadoDimensional || 'Bueno'),
                    };
                    onChange({ cuan: [...ficha.cuan, row] });
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-800 border border-blue-300 rounded font-semibold transition-colors cursor-pointer text-xs"
                >
                  + Agregar Pintura ({finishesTotals.pinturaTotal.toFixed(2)} m²)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Asistente */}
        <div className="print:hidden mb-5 bg-slate-50 border border-slate-200 rounded p-4">
          <div className="flex items-center mb-3">
            <WandSparkles size={16} className="text-blue-700 mr-2" />
            <h3 className="text-sm font-bold text-blue-900">Asistente de cuantificación</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500">1. Elemento</label>
              <select
                className="w-full p-2 border rounded"
                value={asistente.elemento}
                onChange={(e) => handleAsistenteElementoChange(e.target.value)}
              >
                <option value="">Seleccione...</option>
                {ASISTENTE_ELEMENTOS.map((el) => (
                  <option key={el} value={el}>
                    {el}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">2. Estado</label>
              <select
                className="w-full p-2 border rounded"
                value={asistente.estado}
                onChange={(e) => handleAsistenteEstadoChange(e.target.value)}
              >
                {ESTADOS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">3. Intervención</label>
              <select
                className="w-full p-2 border rounded"
                value={asistente.intervencion}
                onChange={(e) => setAsistente({ ...asistente, intervencion: e.target.value })}
              >
                {ASISTENTE_INTERVENCIONES.map((it) => (
                  <option key={it} value={it}>
                    {it}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 md:col-span-3">
              <label className="text-xs font-bold text-gray-500">4. Trabajo a ejecutar</label>
              <input
                className="w-full p-2 border rounded"
                value={asistente.actividad}
                onChange={(e) => setAsistente({ ...asistente, actividad: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">5. Cantidad</label>
              <input
                type="number"
                step="0.01"
                className="w-full p-2 border rounded"
                value={asistente.cantidad}
                onBlur={(e) => setAsistente({ ...asistente, cantidad: safeNum(e.target.value) })}
                onChange={(e) => setAsistente({ ...asistente, cantidad: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">6. Unidad</label>
              <input
                className="w-full p-2 border rounded"
                list="list-unidades"
                value={asistente.unidad}
                onChange={(e) => setAsistente({ ...asistente, unidad: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 md:col-span-2 flex items-end">
              <button
                type="button"
                onClick={handleAgregarAsistente}
                className="w-full bg-blue-700 hover:bg-blue-600 text-white py-2 rounded text-sm font-semibold transition-colors shadow-xs"
              >
                Agregar a la tabla
              </button>
            </div>
            <div className="sm:col-span-2 md:col-span-2 flex items-end">
              <p className="text-xs text-slate-500 italic">
                {asistente.origen || 'La cantidad se toma de las secciones 2 a 6 cuando existe el dato.'}
              </p>
            </div>
          </div>
        </div>

        <DataTable
          data={ficha.cuan}
          onChange={(newData) => onChange({ cuan: newData })}
          columns={[
            { key: 'codigo', label: 'Código', type: 'text', width: '10%' },
            { key: 'elemento', label: 'Elemento', type: 'text', dataListId: 'list-pat-elem' },
            { key: 'actividad', label: 'Trabajo a ejecutar', type: 'text' },
            { key: 'cantidad', label: 'Cantidad', type: 'number', width: '10%' },
            { key: 'unidad', label: 'Unidad', type: 'text', dataListId: 'list-unidades', width: '10%' },
            { key: 'estado', label: 'Estado', type: 'select', options: ESTADOS, width: '15%' },
            { key: 'prioridad', label: 'Prioridad', type: 'select', options: PRIORIDADES, width: '15%' },
          ]}
        />
      </div>

      {/* 9. Registro fotográfico */}
      <div
        id="seccion-registro-fotografico"
        className={`print-card bg-white p-6 rounded-lg shadow-sm border border-gray-200 transition-all ${
          hasZeroPhotos ? 'ring-1 ring-rose-200' : ''
        } ${!printSections.fotografico ? 'print:hidden' : ''}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 border-b pb-2 gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-semibold text-blue-900 print:text-lg">
              9. Registro fotográfico
            </h2>

            {/* Validación visual: comparación con objetivo sugerido */}
            <div className="print:hidden">
              {hasZeroPhotos ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                  <AlertTriangle size={13} className="text-rose-600 shrink-0" />
                  <span>0 de {SUGGESTED_PHOTOS_TARGET} fotos · Alerta: Sin fotos</span>
                </span>
              ) : fotoCount < SUGGESTED_PHOTOS_TARGET ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <Camera size={13} className="text-amber-700 shrink-0" />
                  <span>{fotoCount} de {SUGGESTED_PHOTOS_TARGET} fotos sugeridas ({photoPercentage}%)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>{fotoCount} fotos · Objetivo sugerido cumplido</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 print:hidden">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Camera size={16} className="mr-1.5" />
              <span>Tomar Foto (Cámara)</span>
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs sm:text-sm font-semibold border border-slate-300 transition-colors cursor-pointer"
            >
              <ImageIcon size={16} className="mr-1.5 text-slate-600" />
              <span>Subir de Galería / PC</span>
            </button>
          </div>
        </div>

        {/* Barra de progreso visual y panel de validación */}
        <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl p-3.5 print:hidden space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <span>Cobertura fotográfica del ambiente:</span>
              <strong className={hasZeroPhotos ? 'text-rose-700' : fotoCount < SUGGESTED_PHOTOS_TARGET ? 'text-amber-700' : 'text-emerald-700'}>
                {fotoCount} de {SUGGESTED_PHOTOS_TARGET} fotos sugeridas
              </strong>
            </span>
            <span className="font-mono text-[11px] font-bold text-slate-600">
              {photoPercentage}%
            </span>
          </div>

          {/* Barra de progreso */}
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                hasZeroPhotos ? 'bg-rose-500 w-0' : fotoCount < SUGGESTED_PHOTOS_TARGET ? 'bg-amber-500' : 'bg-emerald-600'
              }`}
              style={{ width: `${photoPercentage}%` }}
            />
          </div>

          {/* Mensajes de validación y alerta */}
          {hasZeroPhotos && (
            <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Alerta: Este ambiente no tiene fotografías registradas.</p>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  Para un relevamiento técnico completo y auditable, se sugiere cargar al menos {SUGGESTED_PHOTOS_TARGET} fotos (ingreso, esquinas o vistas generales y detalles constructivos) antes de finalizar.
                </p>
              </div>
            </div>
          )}

          {!hasZeroPhotos && fotoCount < SUGGESTED_PHOTOS_TARGET && (
            <p className="text-[11px] text-amber-800 flex items-center gap-1.5 mt-1 font-medium">
              <AlertTriangle size={13} className="text-amber-600 shrink-0" />
              <span>Faltan {SUGGESTED_PHOTOS_TARGET - fotoCount} fotografías para alcanzar el objetivo sugerido de {SUGGESTED_PHOTOS_TARGET} tomas representativas.</span>
            </p>
          )}

          {hasMetPhotoTarget && (
            <p className="text-[11px] text-emerald-800 flex items-center gap-1.5 mt-1 font-medium">
              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
              <span>Excelente: Objetivo sugerido cumplido con {fotoCount} fotografías registradas.</span>
            </p>
          )}
        </div>

        {/* Hidden File Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleUploadFotos}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleUploadFotos}
          className="hidden"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ficha.fotos.map((foto, idx) => (
            <div key={foto.id} className="border p-2 rounded bg-gray-50 flex flex-col items-center">
              <img
                src={foto.src}
                alt="relevamiento"
                className="w-full h-48 object-cover rounded mb-2"
              />
              <input
                className="w-full p-1.5 border rounded text-sm mb-2"
                placeholder="Descripción"
                value={foto.desc}
                onChange={(e) => {
                  const copy = [...ficha.fotos];
                  copy[idx].desc = e.target.value;
                  onChange({ fotos: copy });
                }}
              />
              <button
                type="button"
                onClick={() => onChange({ fotos: ficha.fotos.filter((f) => f.id !== foto.id) })}
                className="print:hidden text-red-500 text-sm hover:underline"
              >
                <Trash size={16} className="inline mr-1" />
                Eliminar
              </button>
            </div>
          ))}
          {ficha.fotos.length === 0 && (
            <p className="text-sm text-gray-500 italic col-span-full">No hay fotografías.</p>
          )}
        </div>
      </div>

      {/* 10. Observaciones generales y 11. Verificación */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${(!printSections.observaciones && !printSections.verificacion) ? 'print:hidden' : ''}`}>
        <div className={`print-card bg-white p-6 rounded-lg shadow-sm border border-gray-200 ${!printSections.observaciones ? 'print:hidden' : ''}`}>
          <h2 className="text-xl font-semibold text-blue-900 mb-4 border-b pb-2 print:text-lg">
            10. Observaciones generales
          </h2>
          <textarea
            className="w-full p-2 border rounded min-h-40"
            rows={7}
            value={ficha.obs}
            onChange={(e) => onChange({ obs: e.target.value })}
          />

          <div className="print:hidden mt-3 rounded-lg border border-sky-200 bg-sky-50/70 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <WandSparkles size={16} className="text-blue-700 shrink-0" />
              <h3 className="text-sm font-bold text-blue-900">Asistente de redacción técnica</h3>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Genera una observación técnica de hasta 200 palabras con terminología arquitectónica, basada únicamente en dimensiones, estado, intervención, elementos, patologías y fotografías registradas. Omite el código de la ficha. Revisa el texto antes de guardar.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => handleGenerateObservation(false)} className="inline-flex items-center gap-1.5 rounded bg-blue-700 hover:bg-blue-600 px-3 py-2 text-xs font-semibold text-white">
                <WandSparkles size={14} /> Generar
              </button>
              <button type="button" onClick={() => handleGenerateObservation(true)} className="inline-flex items-center gap-1.5 rounded bg-slate-700 hover:bg-slate-600 px-3 py-2 text-xs font-semibold text-white">
                <RefreshCw size={14} /> Regenerar
              </button>
              <button type="button" onClick={handleCopyObservations} className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                <Copy size={14} /> Copiar
              </button>
              <button type="button" onClick={handleClearObservations} className="inline-flex items-center gap-1.5 rounded border border-rose-200 bg-white hover:bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                <Trash size={14} /> Limpiar
              </button>
            </div>
          </div>
        </div>

        <div className={`print-card bg-white p-6 rounded-lg shadow-sm border border-gray-200 ${!printSections.verificacion ? 'print:hidden' : ''}`}>
          <h2 className="text-xl font-semibold text-blue-900 mb-4 border-b pb-2 print:text-lg">
            11. Verificación
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500">Responsable</label>
              <input
                className="w-full p-2 border rounded"
                value={ficha.fir1 || projectData.profesional || 'Arq. Gabriel Saritama Veira'}
                onChange={(e) => onChange({ fir1: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">Revisión</label>
              <input
                className="w-full p-2 border rounded"
                value={ficha.fir2}
                onChange={(e) => onChange({ fir2: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">Aprobación</label>
              <input
                className="w-full p-2 border rounded"
                value={ficha.fir3}
                onChange={(e) => onChange({ fir3: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">Fecha</label>
              <input
                type="date"
                className="w-full p-2 border rounded"
                value={ficha.fir4}
                onChange={(e) => onChange({ fir4: e.target.value })}
              />
            </div>

            {/* Control de calidad de fotos antes de verificar */}
            <div className="pt-2 print:hidden border-t border-slate-200">
              <span className="text-xs font-bold text-slate-600 block mb-1">
                Control de Fotografías:
              </span>
              {hasZeroPhotos ? (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                    <span className="font-semibold truncate">0 fotos registradas (Alerta: se sugieren {SUGGESTED_PHOTOS_TARGET})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => document.getElementById('seccion-registro-fotografico')?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-2.5 py-1 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-700 shrink-0 cursor-pointer"
                  >
                    Subir fotos
                  </button>
                </div>
              ) : (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span className="font-medium">{fotoCount} de {SUGGESTED_PHOTOS_TARGET} fotos registradas ({hasMetPhotoTarget ? 'Objetivo cumplido' : 'Cobertura parcial'})</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 12. Resumen de la ficha */}
      <div className={`print-card bg-white p-6 rounded-lg shadow-sm border border-gray-200 ${!printSections.resumen ? 'print:hidden' : ''}`}>
        <h2 className="text-xl font-semibold text-blue-900 mb-4 border-b pb-2 print:text-lg">
          12. Resumen de la ficha
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 print:grid-cols-5">
          {[
            ['Constructivos', ficha.cons.length],
            ['Equipamiento', ficha.equip.length],
            ['Patologías', ficha.pat.length],
            ['Actividades', ficha.cuan.length],
          ].map(([label, count]) => (
            <div key={label as string} className="p-3 border border-gray-200 rounded bg-slate-50 print:p-2">
              <span className="block text-xs font-bold text-gray-500 uppercase">{label}</span>
              <b className="block text-2xl font-bold text-[#17365d] print:text-base">{count}</b>
            </div>
          ))}
          <div className={`p-3 border rounded print:p-2 ${hasZeroPhotos ? 'border-rose-300 bg-rose-50/60' : 'border-gray-200 bg-slate-50'}`}>
            <span className="block text-xs font-bold text-gray-500 uppercase">Fotografías</span>
            <b className={`block text-2xl font-bold print:text-base ${hasZeroPhotos ? 'text-rose-600' : 'text-[#17365d]'}`}>
              {fotoCount} <span className="text-xs font-normal text-slate-500">/ {SUGGESTED_PHOTOS_TARGET}</span>
            </b>
            <span className={`text-[10px] font-bold block mt-0.5 ${hasZeroPhotos ? 'text-rose-600' : fotoCount < SUGGESTED_PHOTOS_TARGET ? 'text-amber-600' : 'text-emerald-600'}`}>
              {hasZeroPhotos ? '⚠️ Alerta: 0 fotos' : fotoCount < SUGGESTED_PHOTOS_TARGET ? '🟡 Cobertura parcial' : '🟢 Meta cumplida'}
            </span>
          </div>
        </div>
      </div>

      {/* Panel Informativo de Validaciones y Coherencia Técnica */}
      {validationWarnings.length > 0 && (
        <div className="print:hidden bg-amber-50/90 border border-amber-300 rounded-xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={17} className="text-amber-700 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-amber-950">
              Avisos informativos de coherencia técnica ({validationWarnings.length})
            </h3>
          </div>
          <p className="text-[11px] text-amber-800">
            Los siguientes puntos se señalan como sugerencia preventiva para evitar discrepancias en el relevamiento. Son únicamente informativos y no modifican datos existentes:
          </p>
          <ul className="text-xs text-amber-900 space-y-1 pl-4 list-disc">
            {validationWarnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Barra de acción: Finalizar Relevamiento del Ambiente */}
      <div className="bg-gradient-to-r from-[#17365d] to-[#286b9e] text-white p-4 sm:p-5 rounded-xl shadow-md print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold">Finalizar Relevamiento de este Ambiente</h3>
            {hasZeroPhotos ? (
              <span className="text-[10px] bg-rose-500 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
                Alerta: 0 fotos registradas
              </span>
            ) : hasMetPhotoTarget ? (
              <span className="text-[10px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full">
                Objetivo fotográfico cumplido ({fotoCount})
              </span>
            ) : (
              <span className="text-[10px] bg-amber-400 text-slate-900 font-bold px-2 py-0.5 rounded-full">
                Fotos parciales ({fotoCount}/{SUGGESTED_PHOTOS_TARGET})
              </span>
            )}
          </div>
          <p className="text-xs text-sky-100 mt-1">
            Ambiente actual: <strong>{ficha.codigo || 'S/C'} - {ficha.ambiente || 'Sin nombre'}</strong> · Verifica la información antes de concluir.
          </p>
        </div>

        <button
          type="button"
          onClick={handleFinalizarClick}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Check size={16} />
          <span>Finalizar y Guardar Ambiente</span>
        </button>
      </div>

      {/* Datalists */}
      {Object.keys(listas).map((key) => (
        <datalist key={key} id={key}>
          {(listas[key] || []).map((val) => (
            <option key={val} value={val} />
          ))}
        </datalist>
      ))}
    </div>
  );
}
