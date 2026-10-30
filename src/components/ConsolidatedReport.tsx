import { useMemo, useEffect, useCallback, useState, useRef } from 'react';
import { Printer, X, FileText, Layers, CheckCircle2, ExternalLink } from 'lucide-react';
import { Ficha, ProjectData } from '../types';
import { calculateArea, sanitizeFilename, formatTimestamp, getProjectVerificationChecklist } from '../utils/helpers';
import { GSARITAMA_HEADER_LOGO } from '../constants/logoData';
import { normalizePathologySourceReference } from '../utils/pathologyTransfer';

interface ConsolidatedReportProps {
  fichas: Ficha[];
  projectData: ProjectData;
  onClose: () => void;
  onOpenFicha?: (fichaId: string) => void;
  initialViewMode?: 'all' | 'summary';
}

export function ConsolidatedReport({
  fichas,
  projectData,
  onClose,
  onOpenFicha,
  initialViewMode = 'all',
}: ConsolidatedReportProps) {
  // Estado para alternar entre ver todo o únicamente el resumen consolidado
  const [viewFilter, setViewFilter] = useState<'all' | 'summary'>(initialViewMode);
  // Estado transitorio durante la exportación a PDF del resumen independiente
  const [isExportingSummary, setIsExportingSummary] = useState(false);
  const checklist = useMemo(() => getProjectVerificationChecklist(fichas), [fichas]);

  const printScopeRef = useRef<'all' | 'summary'>(initialViewMode);
  const isTemporaryPrintRef = useRef(false);

  // Nombres normalizados de archivo para la exportación a PDF
  const getSummaryFilename = useCallback(
    () => `Relevamiento_${(projectData.proyecto || 'Proyecto').trim()}_Resumen_Consolidado`,
    [projectData.proyecto]
  );

  const getFullFilename = useCallback(
    () => `Relevamiento_${(projectData.proyecto || 'Proyecto').trim()}_TODO_PROYECTO`,
    [projectData.proyecto]
  );

  // Configuración de impresión idéntica a la del resto de la aplicación (título de documento y reemplazo de controles)
  useEffect(() => {
    let originalTitle = '';

    const beforePrint = () => {
      originalTitle = document.title;
      const targetFilename =
        printScopeRef.current === 'summary' ? getSummaryFilename() : getFullFilename();
      document.title = `${sanitizeFilename(targetFilename)}_${formatTimestamp()}`;

      // Reemplazo de controles (input, select, textarea) por elementos de texto estáticos para impresión limpia
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

      if (isTemporaryPrintRef.current) {
        isTemporaryPrintRef.current = false;
        setIsExportingSummary(false);
        printScopeRef.current = viewFilter;
      }
    };

    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, [getSummaryFilename, getFullFilename, viewFilter]);

  /**
   * Exporta el resumen consolidado como un archivo PDF independiente,
   * utilizando la misma lógica de impresión que el resto de la aplicación.
   */
  const handleExportSummaryPDF = useCallback(() => {
    printScopeRef.current = 'summary';
    isTemporaryPrintRef.current = true;
    setIsExportingSummary(true);

    // Pequeño retardo para asegurar que el DOM oculte las fichas detalladas antes de abrir el diálogo de impresión
    setTimeout(() => {
      window.print();
    }, 150);
  }, []);

  /**
   * Exporta el reporte completo (resumen consolidado + desglose detallado de todos los ambientes) como PDF.
   */
  const handleExportFullReportPDF = useCallback(() => {
    printScopeRef.current = 'all';
    isTemporaryPrintRef.current = false;
    setIsExportingSummary(false);

    setTimeout(() => {
      window.print();
    }, 150);
  }, []);

  const sortedFichas = useMemo(() => {
    return [...fichas].sort((a, b) =>
      (a.codigo || a.ambiente).localeCompare(b.codigo || b.ambiente)
    );
  }, [fichas]);

  const { areaTotal, counts } = useMemo(() => {
    let total = 0;
    const c: Record<string, number> = { Bueno: 0, Regular: 0, Malo: 0, Crítico: 0 };
    sortedFichas.forEach((f) => {
      total += calculateArea(f);
      const st = f.estadoDimensional || f.diagestado || 'Regular';
      if (c[st] !== undefined) c[st]++;
    });
    return { areaTotal: total, counts: c };
  }, [sortedFichas]);

  const consolidatedCuan = useMemo(() => {
    const map: Record<
      string,
      { elemento: string; actividad: string; unidad: string; total: number; ambientes: Set<string> }
    > = {};

    sortedFichas.forEach((f) => {
      f.cuan.forEach((item) => {
        const elem = (item.elemento || '').trim();
        const act = (item.actividad || '').trim();
        const un = (item.unidad || 'u').trim();
        const qty = parseFloat(String(item.cantidad).replace(',', '.'));
        if (!isNaN(qty) && qty > 0 && (elem || act)) {
          const key = `${elem.toLowerCase()}|${act.toLowerCase()}|${un.toLowerCase()}`;
          if (!map[key]) {
            map[key] = {
              elemento: elem,
              actividad: act,
              unidad: un,
              total: 0,
              ambientes: new Set(),
            };
          }
          map[key].total += qty;
          map[key].ambientes.add(f.codigo || f.ambiente || 'S/N');
        }
      });
    });

    return Object.values(map).sort((a, b) => a.elemento.localeCompare(b.elemento));
  }, [sortedFichas]);

  const isSummaryOnlyMode = isExportingSummary || viewFilter === 'summary';
  const verificationLabel = checklist.reviewedCount === 0
    ? 'SIN FICHAS PARA VERIFICAR'
    : checklist.hasPending
      ? 'CONTROLES CON OBSERVACIONES'
      : checklist.informationCount > 0
        ? 'SIN ALERTAS · HAY DATOS NO EVALUABLES'
        : 'CONTROLES SIN OBSERVACIONES';
  const verificationClass = checklist.hasPending
    ? 'border-amber-600 bg-amber-50 text-amber-900'
    : checklist.informationCount > 0 || checklist.reviewedCount === 0
      ? 'border-sky-600 bg-sky-50 text-sky-900'
      : 'border-emerald-600 bg-emerald-50 text-emerald-900';
  const verificationStatusLabel = (status: string) => ({
    ok: 'Correcto',
    info: 'No evaluable',
    warning: 'Advertencia',
    error: 'Dato requerido',
  }[status] || 'Revisión');
  const verificationStatusClass = (status: string) => ({
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    error: 'border-rose-200 bg-rose-50 text-rose-800',
  }[status] || 'border-slate-200 bg-slate-50 text-slate-700');
  const findingSeverityClass = (severity: string) => ({
    info: 'border-sky-200 bg-sky-50 text-sky-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    error: 'border-rose-200 bg-rose-50 text-rose-800',
  }[severity] || 'border-slate-200 bg-slate-50 text-slate-700');

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Top Bar for actions */}
      <div className="bg-slate-800 text-white p-3 sm:p-4 print:hidden flex flex-wrap justify-between items-center sticky top-0 z-50 shadow-md gap-3">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="report-logo-plate shrink-0 w-[160px] sm:w-[190px] h-[38px] sm:h-[45px] flex items-center justify-center rounded-sm overflow-visible">
            <img
              src={GSARITAMA_HEADER_LOGO}
              alt="GSARITAMA ARQ."
              className="h-full w-full shrink-0 object-contain object-center block"
            />
          </div>
          <div>
            <h2 className="text-sm sm:text-lg font-bold truncate">
              Reporte Consolidado ({fichas.length} amb.)
            </h2>
            <p className="text-[11px] text-slate-300 hidden md:block">
              {isSummaryOnlyMode
                ? 'Visualizando únicamente resumen ejecutivo y cuantificación'
                : 'Visualizando resumen y fichas de ambientes'}
            </p>
          </div>
        </div>

        {/* Selector de modo de visualización en pantalla */}
        <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-700 text-xs">
          <button
            type="button"
            onClick={() => {
              setViewFilter('all');
              printScopeRef.current = 'all';
            }}
            className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              viewFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Ver reporte con todos los ambientes y fotos"
          >
            <Layers size={13} className="shrink-0" />
            <span>Todo ({fichas.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setViewFilter('summary');
              printScopeRef.current = 'summary';
            }}
            className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              viewFilter === 'summary'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Ver únicamente la carátula y el resumen consolidado"
          >
            <FileText size={13} className="shrink-0" />
            <span>Solo Resumen</span>
          </button>
        </div>

        {/* Botones de exportación a PDF */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Botón principal: Exportar resumen consolidado como PDF independiente */}
          <button
            type="button"
            onClick={handleExportSummaryPDF}
            className="flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold text-xs sm:text-sm transition-colors shadow-xs cursor-pointer"
            title="Exportar únicamente el resumen consolidado en un archivo PDF independiente"
          >
            <FileText size={16} className="mr-1.5 shrink-0" />
            <span>PDF Resumen</span>
          </button>

          {/* Botón secundario: Exportar todo el proyecto con desglose en PDF */}
          <button
            type="button"
            onClick={handleExportFullReportPDF}
            className="flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold text-xs sm:text-sm transition-colors shadow-xs cursor-pointer"
            title="Exportar el informe completo con el desglose de todos los ambientes ({fichas.length})"
          >
            <Printer size={16} className="mr-1.5 shrink-0" />
            <span className="hidden sm:inline">PDF Completo</span>
            <span className="sm:hidden">Todo</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
            title="Cerrar reporte y volver a la app"
          >
            <X size={16} className="mr-1 shrink-0" />
            <span>Cerrar</span>
          </button>
        </div>
      </div>

      {/* Main Report Body */}
      <div className="p-4 sm:p-8 max-w-5xl mx-auto text-slate-800">
        <div className={isSummaryOnlyMode ? 'mb-8' : 'print-page-break'}>
          {/* Header */}
          <div className="flex items-center border-b-2 border-slate-800 pb-3 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="report-logo-plate flex h-[54px] w-[220px] shrink-0 items-center justify-center overflow-visible">
                <img
                  src={GSARITAMA_HEADER_LOGO}
                  alt="GSARITAMA ARQ."
                  className="report-document-logo h-full w-full shrink-0 object-contain object-center block"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-xl font-bold text-[#17365d] uppercase tracking-wide">
                  FICHA DE RELEVAMIENTO ARQUITECTÓNICO
                </div>
                <span className={'px-2 py-1 rounded text-[8pt] sm:text-[9pt] font-black tracking-wide uppercase border ' + verificationClass + ' print:border-black print:text-black'}>
                  {verificationLabel}
                </span>
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-[#17365d] border-b-2 border-slate-200 pb-2 mb-6 uppercase">
            Relevamiento Arquitectónico
            <br />
            <span className="text-xl text-slate-500 normal-case">
              {isSummaryOnlyMode
                ? 'Resumen Consolidado Ejecutivo del Proyecto'
                : 'Informe Consolidado del Proyecto'}
            </span>
          </h1>

          {/* Project Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="border border-slate-200 p-3 rounded bg-slate-50">
              <span className="block text-xs font-bold text-slate-500 uppercase">Proyecto</span>
              <span className="font-medium">{projectData.proyecto || '—'}</span>
            </div>
            <div className="border border-slate-200 p-3 rounded bg-slate-50">
              <span className="block text-xs font-bold text-slate-500 uppercase">Ubicación</span>
              <span className="font-medium">{projectData.ubicacion || '—'}</span>
            </div>
            <div className="border border-slate-200 p-3 rounded bg-slate-50">
              <span className="block text-xs font-bold text-slate-500 uppercase">Bloque / Edificio</span>
              <span className="font-medium">{projectData.bloque || 'Varios'}</span>
            </div>
            <div className="border border-slate-200 p-3 rounded bg-slate-50">
              <span className="block text-xs font-bold text-slate-500 uppercase">Fecha de Emisión</span>
              <span className="font-medium">{new Date().toLocaleDateString('es-EC')}</span>
            </div>
          </div>

          {/* Control técnico automático del proyecto */}
          <section className="mb-8 rounded-xl border border-slate-300 bg-white p-4 sm:p-5 shadow-sm print:shadow-none print:break-inside-auto">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#17365d]">Control de revisión técnica del proyecto</h2>
                <p className="mt-1 text-xs text-slate-600">
                  Revisión automática de identificación, superficies comparables, estados y registro fotográfico.
                </p>
              </div>
              <span className={'inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ' + verificationClass}>
                {verificationLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-2xl font-bold tabular-nums text-slate-900">{checklist.reviewedCount}</div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fichas revisadas</div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="text-2xl font-bold tabular-nums text-amber-900">{checklist.affectedFichaCount}</div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">Fichas con observaciones</div>
              </div>
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <div className="text-2xl font-bold tabular-nums text-rose-900">{checklist.errorCount}</div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-800">Datos requeridos</div>
              </div>
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
                <div className="text-2xl font-bold tabular-nums text-sky-900">{checklist.informationCount}</div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-800">Datos no evaluables</div>
              </div>
            </div>

            <div className="space-y-3">
              {checklist.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 p-3 sm:p-4 print:break-inside-avoid">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-800">{item.title}</h3>
                    <span className={'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ' + verificationStatusClass(item.status) + ' print:border-black print:text-black'}>
                      {verificationStatusLabel(item.status)} · {item.count}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{item.detail}</p>

                  {item.findings.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {item.findings.map((finding) => (
                        <div key={finding.id} className="rounded-md border border-slate-200 bg-slate-50/70 p-3 print:break-inside-avoid">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs font-bold text-slate-800">
                              {finding.codigo} · {finding.ambiente}
                            </div>
                            <span className={'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ' + findingSeverityClass(finding.severity) + ' print:border-black print:text-black'}>
                              {finding.severity === 'error' ? 'Dato requerido' : finding.severity === 'warning' ? 'Advertencia' : 'Informativo'}
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] font-semibold text-slate-500">{finding.section}</div>
                          <p className="mt-1 text-xs leading-5 text-slate-800">{finding.detail}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            <strong>Acción recomendada:</strong> {finding.action}
                          </p>
                          {onOpenFicha && (
                            <button
                              type="button"
                              onClick={() => onOpenFicha(finding.fichaId)}
                              className="mt-2 inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 print:hidden"
                            >
                              Abrir ficha
                              <ExternalLink size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-2 text-xs font-medium text-emerald-700">
                      <CheckCircle2 size={14} />
                      Sin observaciones detectadas en este control.
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-slate-200 pt-3 text-[11px] leading-5 text-slate-500">
              Este control es una ayuda automática de revisión. Los resultados deben contrastarse con la inspección y el criterio profesional; la aplicación no corrige ni modifica datos por sí sola.
            </div>
          </section>

          {/* Summary Table */}
          <h2 className="text-xl font-bold text-[#17365d] mb-4">Resumen General de Ambientes</h2>
          <table className="w-full text-sm text-left border-collapse border border-slate-300 mb-8">
            <thead className="bg-slate-100 uppercase text-xs font-semibold">
              <tr>
                <th className="px-3 py-2 border border-slate-300">Métrica</th>
                <th className="px-3 py-2 border border-slate-300">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2 border border-slate-300 font-medium">Ambientes Levantados</td>
                <td className="px-3 py-2 border border-slate-300">{fichas.length}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 border border-slate-300 font-medium">Área Total Evaluada</td>
                <td className="px-3 py-2 border border-slate-300">{areaTotal.toFixed(2)} m²</td>
              </tr>
              <tr>
                <td className="px-3 py-2 border border-slate-300 font-medium">Estado: Bueno</td>
                <td className="px-3 py-2 border border-slate-300 text-green-600 font-bold">{counts.Bueno}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 border border-slate-300 font-medium">Estado: Regular</td>
                <td className="px-3 py-2 border border-slate-300 text-yellow-600 font-bold">{counts.Regular}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 border border-slate-300 font-medium">Estado: Malo</td>
                <td className="px-3 py-2 border border-slate-300 text-orange-600 font-bold">{counts.Malo}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 border border-slate-300 font-medium">Estado: Crítico</td>
                <td className="px-3 py-2 border border-slate-300 text-red-600 font-bold">{counts.Crítico}</td>
              </tr>
            </tbody>
          </table>

          {/* Consolidated Quantification */}
          <h2 className="text-xl font-bold text-[#17365d] mb-2">
            Resumen Cuantificado del Proyecto (Sección 8)
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Consolidación de las cantidades registradas en todos los ambientes. Los elementos iguales se acumulan automáticamente.
          </p>

          {consolidatedCuan.length > 0 ? (
            <table className="w-full text-sm text-left border-collapse border border-slate-300">
              <thead className="bg-slate-100 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-3 py-2 border border-slate-300">Elemento</th>
                  <th className="px-3 py-2 border border-slate-300">Actividad</th>
                  <th className="px-3 py-2 border border-slate-300 text-right">Cantidad Total</th>
                  <th className="px-3 py-2 border border-slate-300 text-center">Unidad</th>
                  <th className="px-3 py-2 border border-slate-300 text-center">Apariciones</th>
                </tr>
              </thead>
              <tbody>
                {consolidatedCuan.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 border border-slate-300 font-medium">{item.elemento}</td>
                    <td className="px-3 py-2 border border-slate-300">{item.actividad}</td>
                    <td className="px-3 py-2 border border-slate-300 text-right font-bold text-blue-700">
                      {item.total.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 border border-slate-300 text-center">{item.unidad}</td>
                    <td className="px-3 py-2 border border-slate-300 text-center text-xs text-slate-500">
                      {item.ambientes.size} amb.
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded text-slate-500 italic">
              No existen cantidades registradas en la sección 8 para consolidar.
            </div>
          )}

          {/* Cierre institucional del resumen consolidado */}
          <div className="mt-8 pt-4 border-t-2 border-slate-200 flex justify-end items-center text-xs text-slate-500">
            <div className="font-mono text-[11px] text-slate-500">
              Documento consolidado • Relevamiento Arquitectónico GASV
            </div>
          </div>
        </div>

        {/* Detailed Breakdown for each Environment */}
        <div className={isSummaryOnlyMode ? 'hidden print:hidden' : ''}>
          {sortedFichas.map((f, idx) => {
            const area = calculateArea(f);
            return (
              <div
                key={f.id}
                className="mt-12 pt-8 border-t-4 border-slate-800 print:mt-8 print:pt-4 print:break-before-page"
              >
              <h1 className="text-2xl font-bold text-[#17365d] mb-1 uppercase">Ambiente {idx + 1}</h1>
              <h2 className="text-lg font-semibold text-slate-600 mb-4">
                {f.codigo || 'S/C'} · {f.ambiente || 'Sin nombre'}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 text-sm">
                <div className="border border-slate-200 p-2 rounded bg-slate-50">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Bloque</span>
                  <span className="font-medium">{f.bloque || projectData.bloque || '—'}</span>
                </div>
                <div className="border border-slate-200 p-2 rounded bg-slate-50">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Nivel</span>
                  <span className="font-medium">{f.nivel || '—'}</span>
                </div>
                <div className="border border-slate-200 p-2 rounded bg-slate-50">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Geometría</span>
                  <span className="font-medium">{f.geometria === 'irregular' ? 'Irregular' : 'Regular'}</span>
                </div>
                <div className="border border-slate-200 p-2 rounded bg-slate-50">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Área</span>
                  <span className="font-medium">{isNaN(area) ? '0.00' : area.toFixed(2)} m²</span>
                </div>
              </div>

              {/* Constructivos */}
              {f.cons && f.cons.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-[#17365d] mb-2 border-b border-slate-200 pb-1">
                    Elementos Constructivos y Acabados
                  </h3>
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-1 border border-slate-300">Elemento</th>
                        <th className="p-1 border border-slate-300">Descripción</th>
                        <th className="p-1 border border-slate-300">Dimensión</th>
                        <th className="p-1 border border-slate-300">Cantidad</th>
                        <th className="p-1 border border-slate-300">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {f.cons.map((row, rIdx) => (
                        <tr key={rIdx}>
                          <td className="p-1 border border-slate-300">{row.elemento}</td>
                          <td className="p-1 border border-slate-300">{row.descripcion}</td>
                          <td className="p-1 border border-slate-300">{row.dimension || ''}</td>
                          <td className="p-1 border border-slate-300">
                            {row.cantidad} {row.unidad}
                          </td>
                          <td className="p-1 border border-slate-300">{row.estado}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Patologías */}
              {f.pat && f.pat.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-[#17365d] mb-2 border-b border-slate-200 pb-1">
                    Patologías y Deficiencias
                  </h3>
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead className="bg-red-50 text-red-900">
                      <tr>
                        <th className="p-1 border border-slate-300">Elemento</th>
                        <th className="p-1 border border-slate-300">Patología</th>
                        <th className="p-1 border border-slate-300">Cantidad afectada</th>
                        <th className="p-1 border border-slate-300">Severidad</th>
                        <th className="p-1 border border-slate-300">Referencia de inventario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {f.pat.map((row, rIdx) => (
                        <tr key={rIdx}>
                          <td className="p-1 border border-slate-300">{row.elemento}</td>
                          <td className="p-1 border border-slate-300">{row.patologia}</td>
                          <td className="p-1 border border-slate-300">
                            {row.cantidad} {row.unidad}
                          </td>
                          <td className="p-1 border border-slate-300">{row.severidad}</td>
                          <td className="p-1 border border-slate-300 break-words">{normalizePathologySourceReference(row.referenciaOrigen) || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Cuantificación */}
              {f.cuan && f.cuan.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-[#17365d] mb-2 border-b border-slate-200 pb-1">
                    Cuantificación Preliminar
                  </h3>
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead className="bg-blue-50 text-blue-900">
                      <tr>
                        <th className="p-1 border border-slate-300">Elemento</th>
                        <th className="p-1 border border-slate-300">Actividad</th>
                        <th className="p-1 border border-slate-300 text-right">Cantidad</th>
                        <th className="p-1 border border-slate-300 text-center">Unidad</th>
                        <th className="p-1 border border-slate-300">Prioridad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {f.cuan.map((row, rIdx) => (
                        <tr key={rIdx}>
                          <td className="p-1 border border-slate-300">{row.elemento}</td>
                          <td className="p-1 border border-slate-300">{row.actividad}</td>
                          <td className="p-1 border border-slate-300 text-right font-bold">{row.cantidad}</td>
                          <td className="p-1 border border-slate-300 text-center">{row.unidad}</td>
                          <td className="p-1 border border-slate-300">{row.prioridad}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Evaluación técnica y observaciones generales unificadas */}
              <div className="mb-4">
                <h3 className="text-sm font-bold text-[#17365d] mb-2 border-b border-slate-200 pb-1">
                  Evaluación general y observaciones
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-3 rounded border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-600">Estado general:</span> {f.estadoDimensional || f.diagestado || 'No consignado'}
                  </div>
                  <div>
                    <span className="font-bold text-slate-600">Intervención recomendada:</span> {f.interv || 'No consignada'}
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold text-slate-600">Observaciones generales:</span>
                    <p className="mt-1 whitespace-pre-wrap">{f.obs || f.diag || f.obsdim || 'Sin observaciones'}</p>
                  </div>
                </div>
              </div>

              {/* Fotos */}
              {f.fotos && f.fotos.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-[#17365d] mb-2 border-b border-slate-200 pb-1">
                    Registro Fotográfico
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {f.fotos.map((photo, pIdx) => (
                      <div
                        key={photo.id}
                        className="border border-slate-200 p-2 rounded bg-slate-50 break-inside-avoid"
                      >
                        <img
                          src={photo.src}
                          alt="relevamiento"
                          className="w-full max-h-48 object-contain rounded mb-2 bg-white"
                        />
                        <div className="text-xs text-slate-600">
                          <span className="font-bold">Foto {pIdx + 1}:</span> {photo.desc || 'Sin descripción'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        </div>

        {fichas.length === 0 && (
          <p className="text-center text-slate-500 italic mt-10">
            No existen ambientes guardados para consolidar.
          </p>
        )}
      </div>
    </div>
  );
}
