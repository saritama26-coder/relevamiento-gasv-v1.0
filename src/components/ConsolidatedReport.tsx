import { useMemo, useEffect, useCallback } from 'react';
import { Printer, X } from 'lucide-react';
import { Ficha, ProjectData } from '../types';
import { calculateArea, sanitizeFilename, formatTimestamp } from '../utils/helpers';
import { GSARITAMA_HEADER_LOGO } from '../constants/logoData';

interface ConsolidatedReportProps {
  fichas: Ficha[];
  projectData: ProjectData;
  onClose: () => void;
}

export function ConsolidatedReport({ fichas, projectData, onClose }: ConsolidatedReportProps) {
  // Print setup hook
  const getFilename = useCallback(
    () => `Relevamiento_${projectData.proyecto || 'Proyecto'}_TODO_PROYECTO`,
    [projectData.proyecto]
  );

  useEffect(() => {
    let originalTitle = '';
    const beforePrint = () => {
      originalTitle = document.title;
      document.title = `${sanitizeFilename(getFilename())}_${formatTimestamp()}`;
    };
    const afterPrint = () => {
      if (originalTitle) document.title = originalTitle;
    };

    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, [getFilename]);

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

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Top Bar for actions */}
      <div className="bg-slate-800 text-white p-3 sm:p-4 print:hidden flex flex-wrap justify-between items-center sticky top-0 z-50 shadow-md gap-2">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="report-logo-plate shrink-0 w-[190px] h-[45px] flex items-center justify-center rounded-sm overflow-visible">
            <img
              src={GSARITAMA_HEADER_LOGO}
              alt="GSARITAMA ARQ."
              className="h-full w-full shrink-0 object-contain object-center block"
            />
          </div>
          <h2 className="text-base sm:text-lg font-bold truncate">
            Reporte Consolidado ({fichas.length} amb.)
          </h2>
        </div>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-500 rounded font-semibold text-xs sm:text-sm transition-colors"
          >
            <Printer size={16} className="mr-1.5" /> PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-600 hover:bg-slate-500 rounded font-semibold text-xs sm:text-sm transition-colors"
          >
            <X size={16} className="mr-1.5" /> Cerrar
          </button>
        </div>
      </div>

      {/* Main Report Body */}
      <div className="p-4 sm:p-8 max-w-5xl mx-auto text-slate-800">
        <div className="print-page-break">
          {/* Header */}
          <div className="flex items-end justify-between border-b-2 border-slate-800 pb-3 mb-6">
            <div className="flex items-center space-x-3">
              <div className="report-logo-plate flex h-[54px] w-[220px] shrink-0 items-center justify-center overflow-visible">
                <img
                  src={GSARITAMA_HEADER_LOGO}
                  alt="GSARITAMA ARQ."
                  className="report-document-logo h-full w-full shrink-0 object-contain object-center block"
                />
              </div>
              <div className="text-xl font-bold text-[#17365d] uppercase tracking-wide">
                FICHA DE RELEVAMIENTO ARQUITECTÓNICO
              </div>
            </div>
            <div className="text-right text-sm leading-tight text-slate-700">
              <div className="font-bold text-slate-900 text-base">
                {projectData.profesional || 'Arq. Gabriel Saritama Veira'}
              </div>
              <div className="text-slate-600 font-medium">Arquitecto</div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                {projectData.contacto || 'saritama26@gmail.com'}
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-[#17365d] border-b-2 border-slate-200 pb-2 mb-6 uppercase">
            Relevamiento Arquitectónico
            <br />
            <span className="text-xl text-slate-500 normal-case">Informe Consolidado del Proyecto</span>
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
        </div>

        {/* Detailed Breakdown for each Environment */}
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
                        <th className="p-1 border border-slate-300">Ubicación</th>
                        <th className="p-1 border border-slate-300">Cantidad</th>
                        <th className="p-1 border border-slate-300">Severidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {f.pat.map((row, rIdx) => (
                        <tr key={rIdx}>
                          <td className="p-1 border border-slate-300">{row.elemento}</td>
                          <td className="p-1 border border-slate-300">{row.patologia}</td>
                          <td className="p-1 border border-slate-300">{row.ubicacion}</td>
                          <td className="p-1 border border-slate-300">
                            {row.cantidad} {row.unidad}
                          </td>
                          <td className="p-1 border border-slate-300">{row.severidad}</td>
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

        {fichas.length === 0 && (
          <p className="text-center text-slate-500 italic mt-10">
            No existen ambientes guardados para consolidar.
          </p>
        )}
      </div>
    </div>
  );
}
