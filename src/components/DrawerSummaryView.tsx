import React, { useState, useMemo } from 'react';
import { Layers, Building2, ChevronDown, ChevronUp, ArrowRight, CheckCircle2, AlertTriangle, AlertCircle, XCircle } from 'lucide-react';
import { Ficha, ProjectData } from '../types';
import { calculateArea } from '../utils/helpers';

interface DrawerSummaryViewProps {
  fichas: Ficha[];
  projectData: ProjectData;
  onSelectAmbiente?: (id: string) => void;
  onFilterInList?: (term: string) => void;
}

type GroupBy = 'nivel' | 'bloque';

interface GroupData {
  name: string;
  count: number;
  area: number;
  fichas: Ficha[];
  statuses: {
    Bueno: number;
    Regular: number;
    Malo: number;
    Crítico: number;
  };
}

export function DrawerSummaryView({
  fichas,
  projectData,
  onSelectAmbiente,
  onFilterInList,
}: DrawerSummaryViewProps) {
  const [groupBy, setGroupBy] = useState<GroupBy>('nivel');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  // Totales globales del proyecto
  const overallStats = useMemo(() => {
    let totalArea = 0;
    const statuses = { Bueno: 0, Regular: 0, Malo: 0, Crítico: 0 };

    fichas.forEach((f) => {
      totalArea += calculateArea(f);
      const st = (f.estadoDimensional || f.diagestado || 'Regular') as keyof typeof statuses;
      if (statuses[st] !== undefined) {
        statuses[st]++;
      } else {
        statuses.Regular++;
      }
    });

    return { totalArea, statuses, totalCount: fichas.length };
  }, [fichas]);

  // Agrupamiento por Nivel o por Bloque
  const groups = useMemo<GroupData[]>(() => {
    const map = new Map<string, GroupData>();

    fichas.forEach((f) => {
      let key = '';
      if (groupBy === 'nivel') {
        key = String(f.nivel || '').trim() || 'Sin nivel especificado';
      } else {
        key = String(f.bloque || projectData.bloque || '').trim() || 'Sin bloque especificado';
      }

      if (!map.has(key)) {
        map.set(key, {
          name: key,
          count: 0,
          area: 0,
          fichas: [],
          statuses: { Bueno: 0, Regular: 0, Malo: 0, Crítico: 0 },
        });
      }

      const grp = map.get(key)!;
      grp.count++;
      grp.area += calculateArea(f);
      grp.fichas.push(f);

      const st = (f.estadoDimensional || f.diagestado || 'Regular') as keyof typeof grp.statuses;
      if (grp.statuses[st] !== undefined) {
        grp.statuses[st]++;
      } else {
        grp.statuses.Regular++;
      }
    });

    // Ordenar alfabéticamente o por nombre de grupo
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
  }, [fichas, groupBy, projectData.bloque]);

  if (fichas.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500">
        <Layers size={36} className="mx-auto text-slate-300 mb-2" />
        <p className="text-sm font-semibold text-slate-700">Sin datos para resumir</p>
        <p className="text-xs text-slate-500 mt-1">
          Registre o cargue ambientes para ver el cómputo de áreas y estados por bloque o nivel.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Selector de modo de agrupación */}
      <div className="flex items-center justify-between bg-slate-100 p-1 rounded-lg text-xs font-semibold">
        <button
          type="button"
          onClick={() => setGroupBy('nivel')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all cursor-pointer ${
            groupBy === 'nivel'
              ? 'bg-white text-blue-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers size={13} className={groupBy === 'nivel' ? 'text-blue-600' : 'text-slate-400'} />
          <span>Por Nivel ({new Set(fichas.map((f) => f.nivel || 'Sin nivel')).size})</span>
        </button>
        <button
          type="button"
          onClick={() => setGroupBy('bloque')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all cursor-pointer ${
            groupBy === 'bloque'
              ? 'bg-white text-blue-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 size={13} className={groupBy === 'bloque' ? 'text-blue-600' : 'text-slate-400'} />
          <span>Por Bloque ({new Set(fichas.map((f) => f.bloque || projectData.bloque || 'Sin bloque')).size})</span>
        </button>
      </div>

      {/* Tarjeta de métricas totales consolidadas */}
      <div className="bg-gradient-to-br from-slate-900 to-[#17365d] text-white p-3.5 rounded-xl shadow-xs">
        <div className="flex justify-between items-start mb-2.5">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-sky-300">
              Cómputo Total del Proyecto
            </span>
            <div className="text-xl font-black text-white mt-0.5">
              {overallStats.totalArea.toFixed(2)} <span className="text-xs font-normal text-sky-200">m²</span>
            </div>
          </div>
          <span className="bg-white/15 text-white px-2 py-0.5 rounded-full text-xs font-bold">
            {overallStats.totalCount} {overallStats.totalCount === 1 ? 'ambiente' : 'ambientes'}
          </span>
        </div>

        {/* Resumen de estados global */}
        <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-white/15 text-center text-[10px]">
          <div className="bg-emerald-500/20 border border-emerald-400/30 rounded py-1 px-0.5">
            <span className="block font-bold text-emerald-300">{overallStats.statuses.Bueno}</span>
            <span className="text-emerald-100 text-[9px]">Bueno</span>
          </div>
          <div className="bg-yellow-500/20 border border-yellow-400/30 rounded py-1 px-0.5">
            <span className="block font-bold text-yellow-300">{overallStats.statuses.Regular}</span>
            <span className="text-yellow-100 text-[9px]">Regular</span>
          </div>
          <div className="bg-orange-500/20 border border-orange-400/30 rounded py-1 px-0.5">
            <span className="block font-bold text-orange-300">{overallStats.statuses.Malo}</span>
            <span className="text-orange-100 text-[9px]">Malo</span>
          </div>
          <div className="bg-rose-500/20 border border-rose-400/30 rounded py-1 px-0.5">
            <span className="block font-bold text-rose-300">{overallStats.statuses.Crítico}</span>
            <span className="text-rose-100 text-[9px]">Crítico</span>
          </div>
        </div>
      </div>

      {/* Lista de grupos desglosados */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1">
          <span>Desglose por {groupBy === 'nivel' ? 'Nivel' : 'Bloque'}</span>
          <span>{groups.length} {groups.length === 1 ? 'grupo' : 'grupos'}</span>
        </div>

        {groups.map((grp) => {
          const isExpanded = Boolean(expandedGroups[grp.name]);
          const percentage = overallStats.totalArea > 0
            ? ((grp.area / overallStats.totalArea) * 100).toFixed(1)
            : '0.0';

          return (
            <div
              key={grp.name}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:border-slate-300 transition-colors"
            >
              {/* Encabezado del grupo */}
              <div
                onClick={() => toggleGroup(grp.name)}
                className="p-3 cursor-pointer hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800 truncate" title={grp.name}>
                      {grp.name}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold shrink-0">
                      {grp.count} {grp.count === 1 ? 'amb.' : 'ambs.'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                    <span className="font-bold text-blue-900">{grp.area.toFixed(2)} m²</span>
                    <span className="text-slate-400 text-[10px]">•</span>
                    <span className="text-slate-500 text-[11px] font-mono">{percentage}% del área total</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    className="p-1 text-slate-400 hover:text-slate-600 rounded"
                    aria-label={isExpanded ? 'Contraer grupo' : 'Expandir grupo'}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Barra de progreso de área */}
              <div className="w-full bg-slate-100 h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, parseFloat(percentage)))}%` }}
                />
              </div>

              {/* Conteo de estados por grupo */}
              <div className="px-3 py-2 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {grp.statuses.Bueno > 0 && (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold text-[10px]">
                      <CheckCircle2 size={10} className="text-emerald-600" /> {grp.statuses.Bueno}
                    </span>
                  )}
                  {grp.statuses.Regular > 0 && (
                    <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0.2 rounded font-semibold text-[10px]">
                      <AlertTriangle size={10} className="text-yellow-600" /> {grp.statuses.Regular}
                    </span>
                  )}
                  {grp.statuses.Malo > 0 && (
                    <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.2 rounded font-semibold text-[10px]">
                      <AlertCircle size={10} className="text-orange-600" /> {grp.statuses.Malo}
                    </span>
                  )}
                  {grp.statuses.Crítico > 0 && (
                    <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded font-semibold text-[10px]">
                      <XCircle size={10} className="text-rose-600" /> {grp.statuses.Crítico}
                    </span>
                  )}
                </div>

                {onFilterInList && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFilterInList(grp.name);
                    }}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-0.5 cursor-pointer ml-auto"
                    title={`Filtrar lista por ${grp.name}`}
                  >
                    <span>Ver lista</span>
                    <ArrowRight size={10} />
                  </button>
                )}
              </div>

              {/* Lista expandible de ambientes individuales en este grupo */}
              {isExpanded && (
                <div className="border-t border-slate-200 divide-y divide-slate-100 bg-white">
                  {grp.fichas.map((f) => {
                    const st = f.estadoDimensional || f.diagestado || 'Regular';
                    const stColor =
                      st === 'Crítico'
                        ? 'text-rose-700 bg-rose-50 border-rose-200'
                        : st === 'Malo'
                        ? 'text-orange-700 bg-orange-50 border-orange-200'
                        : st === 'Regular'
                        ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
                        : 'text-emerald-700 bg-emerald-50 border-emerald-200';

                    return (
                      <div
                        key={f.id}
                        className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[10px] bg-slate-100 text-blue-900 border border-slate-200 px-1 py-0.2 rounded font-bold">
                              {f.codigo || 'S/C'}
                            </span>
                            <span className="font-medium text-slate-800 truncate">
                              {f.ambiente || 'Sin nombre'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {calculateArea(f).toFixed(2)} m² · {groupBy === 'nivel' ? f.bloque || projectData.bloque : f.nivel}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${stColor}`}>
                            {st}
                          </span>
                          {onSelectAmbiente && (
                            <button
                              type="button"
                              onClick={() => onSelectAmbiente(f.id)}
                              className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold hover:bg-blue-100 cursor-pointer"
                            >
                              Cargar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
