import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronUp, ChevronDown, BookmarkPlus, Trash, Copy, MoreVertical } from 'lucide-react';
import { useCatalogos } from '../context/CatalogContext';

export interface ColumnDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  width?: string;
  options?: string[];
  dataListId?: string;
  /** Muestra el valor como texto de solo lectura, permitiendo ajuste de línea. */
  displayOnly?: boolean;
  /** Presentación compacta de referencias internas a secciones del inventario. */
  displayKind?: 'sourceReference';
}

interface DataTableProps {
  columns: ColumnDef[];
  data: any[];
  onChange: (newData: any[]) => void;
  /** Distribuye las columnas con anchos definidos para tablas de muchas columnas. */
  fixedLayout?: boolean;
  /** Ancho reservado para los controles de fila en tablas con distribución fija. */
  actionWidth?: string;
  /** Ancho mínimo de la celda de acciones cuando hay varios botones. */
  actionMinWidth?: number;
  /** Sustituye los iconos visibles por un menú contextual compacto. */
  actionMenu?: boolean;
  /** Acción opcional al seleccionar un campo de solo lectura. */
  onDisplayOnlyClick?: (row: any) => void;
}

function isCustomValue(listas: Record<string, string[]>, listId: string, val: any): boolean {
  const str = String(val || '').trim();
  if (!str) return false;
  const list = listas[listId] || [];
  return !list.some((item) => item.toLowerCase() === str.toLowerCase());
}

interface CatalogInputProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  className: string;
}

/**
 * Editable text field with a visible dropdown button.
 * Unlike the browser's native datalist, this opens the full catalog on demand
 * and still allows custom values to be typed.
 */
function CatalogInput({ value, options, onChange, className }: CatalogInputProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const positionMenu = () => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect || typeof window === 'undefined') return;
    const maxHeight = Math.min(260, Math.max(100, window.innerHeight - 24));
    const estimatedHeight = Math.min(Math.max(options.length * 34 + 8, 44), maxHeight);
    const above = window.innerHeight - rect.bottom < estimatedHeight && rect.top > estimatedHeight;
    const top = above
      ? Math.max(8, rect.top - estimatedHeight - 4)
      : Math.min(rect.bottom + 3, window.innerHeight - estimatedHeight - 8);
    const width = Math.min(Math.max(rect.width, 180), window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    setMenuStyle({ position: 'fixed', top, left, width, maxHeight, zIndex: 10000 });
  };

  const openMenu = (resetFilter = false) => {
    if (resetFilter) setFilter('');
    positionMenu();
    setOpen(true);
  };

  const handleSelectOption = (option: string) => {
    onChange(option);
    setFilter('');
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!wrapperRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const closeForViewportChange = (event: Event) => {
      // No cerrar si el scroll proviene de dentro del menú desplegable
      if (menuRef.current && (event.target === menuRef.current || menuRef.current.contains(event.target as Node))) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('resize', closeForViewportChange);
    window.addEventListener('scroll', closeForViewportChange, true);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('resize', closeForViewportChange);
      window.removeEventListener('scroll', closeForViewportChange, true);
    };
  }, [open]);

  const filteredOptions = options.filter((option) => {
    if (!filter.trim()) return true;
    const normOption = option.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normFilter = filter.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normOption.includes(normFilter);
  });

  return (
    <>
      <div ref={wrapperRef} className="relative flex w-full min-w-0 items-center">
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          className={className + ' pr-7'}
          value={value ?? ''}
          onFocus={() => openMenu(true)}
          onChange={(event) => {
            const nextValue = event.target.value;
            onChange(nextValue);
            setFilter(nextValue);
            positionMenu();
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              if (open && filteredOptions.length > 0) {
                event.preventDefault();
                handleSelectOption(filteredOptions[0]);
              } else {
                setOpen(false);
              }
            } else if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
        <button
          type="button"
          aria-label="Mostrar lista de opciones"
          title="Mostrar lista de opciones"
          className="absolute right-0 top-0 flex h-full w-7 items-center justify-center text-slate-500 hover:bg-blue-50 hover:text-blue-700 rounded-r cursor-pointer"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => openMenu(true)}
        >
          <ChevronDown size={15} />
        </button>
      </div>
      {open && menuStyle && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={menuStyle}
          className="fixed overflow-y-auto rounded-md border border-slate-300 bg-white py-1 shadow-xl print:hidden z-[10000]"
          onMouseDown={(event) => event.stopPropagation()}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                type="button"
                key={option}
                className="block w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none cursor-pointer"
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleSelectOption(option);
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  handleSelectOption(option);
                }}
              >
                {option}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-slate-500">
              Sin coincidencias. Puede conservar el texto escrito.
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

export function DataTable({ columns, data, onChange, fixedLayout = false, actionWidth, actionMinWidth, actionMenu = false, onDisplayOnlyClick }: DataTableProps) {
  const { listas, agregar } = useCatalogos();
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<{ rowIndex: number; top: number; left: number } | null>(null);

  const getCustomTokens = (row: any) => {
    return columns
      .filter((col) => col.dataListId && isCustomValue(listas, col.dataListId, row[col.key]))
      .map((col) => ({
        listId: col.dataListId!,
        valor: String(row[col.key]).trim(),
      }));
  };

  const handleAddRow = () => {
    const newRow: any = { id: Math.random().toString() };
    columns.forEach((col) => {
      newRow[col.key] = col.key === 'ubicacion' ? 'General' : '';
    });
    // Si la unidad es 'u' o 'pza', inicializar cantidad en '1.00'
    if (newRow.unidad === 'u' || newRow.unidad === 'pza') {
      newRow.cantidad = '1.00';
    }
    onChange([...data, newRow]);
  };

  const handleDuplicate = (idx: number) => {
    const copy = [...data];
    const sourceRow = copy[idx];
    const duplicatedRow = {
      ...sourceRow,
      id: Math.random().toString(),
    };
    copy.splice(idx + 1, 0, duplicatedRow);
    onChange(copy);
  };

  const handleUpdate = (idx: number, key: string, value: any) => {
    const copy = [...data];
    let updatedRow = { ...copy[idx], [key]: value };

    // Al seleccionar unidad 'u' o 'pza', si la cantidad está vacía o en 0, inicializar en '1.00'
    if (key === 'unidad' && (value === 'u' || value === 'pza')) {
      const q = String(updatedRow.cantidad ?? '').trim();
      if (!q || q === '0' || q === '0.00') {
        updatedRow.cantidad = '1.00';
      }
    }

    // Si se modifica 'dimension' en elementos con unidad 'm²', calcular largo * ancho automáticamente
    if (key === 'dimension' && (updatedRow.unidad === 'm²' || updatedRow.unidad === 'm2' || !updatedRow.unidad)) {
      const s = String(value || '').replace(/\s*(m|ml|mts)\b/gi, '').trim();
      const match = s.match(/^([0-9]+(?:[.,][0-9]+)?)\s*([xX*×])\s*([0-9]+(?:[.,][0-9]+)?)$/);
      if (match) {
        const l = parseFloat(match[1].replace(',', '.'));
        const a = parseFloat(match[3].replace(',', '.'));
        if (!isNaN(l) && !isNaN(a) && l > 0 && a > 0) {
          updatedRow.cantidad = (l * a).toFixed(2);
          if (!updatedRow.unidad) updatedRow.unidad = 'm²';
        }
      }
    }

    copy[idx] = updatedRow;
    onChange(copy);
  };

  const handleDelete = (idx: number) => {
    const copy = [...data];
    copy.splice(idx, 1);
    onChange(copy);
  };

  const handleMove = (idx: number, delta: number) => {
    const target = idx + delta;
    if (target < 0 || target >= data.length) return;
    const copy = [...data];
    const temp = copy[idx];
    copy[idx] = copy[target];
    copy[target] = temp;
    onChange(copy);
  };

  const showRowActions = (
    event: React.MouseEvent<HTMLButtonElement>,
    rowIndex: number,
    hasCatalogActions: boolean,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 208;
    const menuHeight = hasCatalogActions ? 210 : 176;
    const showAbove = window.innerHeight - rect.bottom < menuHeight + 12 && rect.top > menuHeight + 12;
    const top = showAbove
      ? Math.max(8, rect.top - menuHeight - 6)
      : Math.min(rect.bottom + 6, Math.max(8, window.innerHeight - menuHeight - 8));
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
    setOpenActionMenu({ rowIndex, top, left });
  };

  useEffect(() => {
    if (!openActionMenu) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenActionMenu(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [openActionMenu]);

  const actionMenuRow = openActionMenu ? data[openActionMenu.rowIndex] : null;
  const actionMenuTokens = actionMenuRow ? getCustomTokens(actionMenuRow) : [];

  return (
    <div className="space-y-3">
      {/* Mobile Card Layout (< md screens) */}
      <div className="block md:hidden space-y-3 print:hidden">
        {data.map((row, idx) => {
          const customTokens = getCustomTokens(row);
          return (
            <div
              key={row.id || idx}
              className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Fila #{idx + 1}
                </span>
                <div className="flex items-center space-x-1">
                  {actionMenu ? (
                    <button
                      type="button"
                      aria-label={`Acciones de la fila ${idx + 1}`}
                      aria-haspopup="menu"
                      aria-expanded={openActionMenu?.rowIndex === idx}
                      onClick={(event) => openActionMenu?.rowIndex === idx
                        ? setOpenActionMenu(null)
                        : showRowActions(event, idx, customTokens.length > 0)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      title="Ver acciones"
                    >
                      <MoreVertical size={18} />
                    </button>
                  ) : (
                    <>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, -1)}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md active:bg-slate-200"
                      title="Subir"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 1)}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md active:bg-slate-200"
                      title="Bajar"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(idx)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md active:bg-blue-100"
                      title="Duplicar fila"
                    >
                      <Copy size={16} />
                    </button>
                    {customTokens.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          agregar(customTokens);
                          alert('Guardado en el catálogo: ' + customTokens.map((t) => t.valor).join(', '));
                        }}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md active:bg-emerald-100"
                        title={'Guardar en el catálogo: ' + customTokens.map((t) => t.valor).join(', ')}
                      >
                        <BookmarkPlus size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(idx)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-md active:bg-red-100"
                      title="Eliminar"
                    >
                      <Trash size={16} />
                    </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {columns.map((col) => {
                  const cellKey = `mob-${idx}|${col.key}`;
                  const isQty = col.key === 'cantidad';
                  const val = row[col.key] ?? '';
                  const isFullWidth = col.displayOnly || col.key === 'descripcion' || col.key === 'observacion' || col.key === 'actividad' || col.key === 'elemento';

                  return (
                    <div
                      key={col.key}
                      className={isFullWidth ? 'col-span-2' : 'col-span-1'}
                    >
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        {col.label}
                      </label>
                      {col.displayOnly ? (
                        col.displayKind === 'sourceReference' ? (() => {
                          const raw = String(val || '').trim();
                          const match = raw.match(/^(S[3-6])(?:\\s*[·:–-]\\s*(.*))?$/i);
                          const section = match?.[1]?.toUpperCase() || '';
                          const detail = (match?.[2] || raw || 'Sin referencia').replace(/^Detalle:\\s*/i, '').trim();
                          const content = (
                            <span className="inline-flex max-w-full min-w-0 items-center gap-1.5 text-left">
                              {section && <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">{section}</span>}
                              <span className="min-w-0 truncate text-xs font-medium text-slate-700">{detail}</span>
                              {section && <span className="shrink-0 text-[10px] text-blue-600">↗</span>}
                            </span>
                          );
                          return section && onDisplayOnlyClick ? (
                            <button type="button" onClick={() => onDisplayOnlyClick(row)} title={raw} className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-left hover:border-blue-300 hover:bg-blue-50">{content}</button>
                          ) : (
                            <div className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2" title={raw}>{content}</div>
                          );
                        })() : (
                          <div className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs leading-5 whitespace-normal break-words" title={String(val || '')}>{String(val || '—')}</div>
                        )
                      ) : col.type === 'select' ? (
                        <select
                          className="w-full p-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg text-xs"
                          value={val}
                          onChange={(e) => handleUpdate(idx, col.key, e.target.value)}
                        >
                          <option value="">Seleccione...</option>
                          {col.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : col.dataListId ? (
                        <CatalogInput
                          value={String(val)}
                          options={listas[col.dataListId] || []}
                          onChange={(nextValue) => handleUpdate(idx, col.key, nextValue)}
                          className="w-full min-w-0 p-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg text-xs"
                        />
                      ) : (
                        <input
                          type={col.type}
                          step={isQty ? '0.01' : undefined}
                          className="w-full p-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg text-xs"
                          value={val}
                          onFocus={() => setActiveCell(cellKey)}
                          onBlur={() => {
                            if (isQty) {
                              const parsed = parseFloat(String(val).replace(',', '.'));
                              if (!isNaN(parsed)) {
                                handleUpdate(idx, col.key, parsed.toFixed(2));
                              }
                            }
                            setActiveCell(null);
                          }}
                          onChange={(e) => handleUpdate(idx, col.key, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {data.length === 0 && (
          <div className="p-4 text-center text-slate-500 bg-white rounded-xl border border-slate-200 text-xs">
            No hay registros. Toca &quot;+ Agregar fila&quot; para añadir uno.
          </div>
        )}
      </div>

      {/* Desktop / Print Table Layout (>= md or @media print) */}
      <div className="hidden md:block print:block overflow-x-auto">
        <table className={`w-full text-sm text-left border-collapse border border-gray-300 print:text-[10px] ${fixedLayout ? 'table-fixed' : ''}`}>
          <thead className="bg-slate-100 text-slate-800 text-xs uppercase font-semibold print:bg-gray-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-2 py-1.5 border border-gray-300 align-top break-words"
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
              <th
                className="px-2 py-1.5 border border-gray-300 print:hidden text-center whitespace-nowrap"
                style={fixedLayout ? { width: actionWidth || '10%', minWidth: actionMinWidth || 124 } : undefined}
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => {
              const customTokens = getCustomTokens(row);
              return (
                <tr
                  key={row.id || idx}
                  className="bg-white hover:bg-slate-50 border-b border-gray-300"
                >
                  {columns.map((col) => {
                    const cellKey = `${idx}|${col.key}`;
                    const isQty = col.key === 'cantidad';
                    const val = row[col.key] ?? '';

                    let displayVal = val;
                    if (isQty && activeCell !== cellKey && String(val).trim() !== '') {
                      const parsed = parseFloat(String(val).replace(',', '.'));
                      if (!isNaN(parsed)) {
                        displayVal = parsed.toFixed(2);
                      }
                    }

                    return (
                      <td
                        key={col.key}
                        className={`p-1 border border-gray-300 align-top ${col.displayOnly ? 'bg-slate-50/70' : ''}`}
                        style={fixedLayout ? { width: col.width } : undefined}
                      >
                        {col.displayOnly ? (
                          col.displayKind === 'sourceReference' ? (() => {
                            const raw = String(val || '').trim();
                            const match = raw.match(/^(S[3-6])(?:\\s*[·:–-]\\s*(.*))?$/i);
                            const section = match?.[1]?.toUpperCase() || '';
                            const detail = (match?.[2] || raw || 'Sin referencia').replace(/^Detalle:\\s*/i, '').trim();
                            const content = (
                              <span className="inline-flex max-w-full min-w-0 items-center gap-1.5 text-left">
                                {section && <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">{section}</span>}
                                <span className="min-w-0 truncate text-xs font-medium text-slate-700">{detail}</span>
                                {section && <span className="shrink-0 text-[10px] text-blue-600">↗</span>}
                              </span>
                            );
                            return section && onDisplayOnlyClick ? (
                              <button type="button" onClick={() => onDisplayOnlyClick(row)} title={raw} className="w-full min-w-0 rounded px-1 py-1 text-left hover:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-400">{content}</button>
                            ) : (
                              <div className="w-full min-w-0 px-1 py-1" title={raw}>{content}</div>
                            );
                          })() : (
                            <div className="w-full min-w-0 px-1 py-1 text-xs leading-5 whitespace-normal break-words" title={String(val || '')}>{String(val || '—')}</div>
                          )
                        ) : col.type === 'select' ? (
                          <select
                            className="w-full p-1 bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded text-sm print:text-[10px]"
                            value={val}
                            onChange={(e) => handleUpdate(idx, col.key, e.target.value)}
                          >
                            <option value="">Seleccione...</option>
                            {col.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : col.dataListId ? (
                          <CatalogInput
                            value={String(val)}
                            options={listas[col.dataListId] || []}
                            onChange={(nextValue) => handleUpdate(idx, col.key, nextValue)}
                            className="w-full min-w-0 p-1 bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded text-sm print:text-[10px]"
                          />
                        ) : (
                          <input
                            type={col.type}
                            step={isQty ? '0.01' : undefined}
                            className="w-full p-1 bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded text-sm print:text-[10px]"
                            value={displayVal}
                            onFocus={() => setActiveCell(cellKey)}
                            onBlur={() => {
                              if (isQty) {
                                const parsed = parseFloat(String(val).replace(',', '.'));
                                if (!isNaN(parsed)) {
                                  handleUpdate(idx, col.key, parsed.toFixed(2));
                                }
                              }
                              setActiveCell(null);
                            }}
                            onChange={(e) => handleUpdate(idx, col.key, e.target.value)}
                          />
                        )}
                      </td>
                    );
                  })}
                  <td
                    className="p-1 border border-gray-300 print:hidden text-center whitespace-nowrap"
                    style={fixedLayout ? { width: actionWidth || '10%', minWidth: actionMinWidth || 124 } : undefined}
                  >
                    {actionMenu ? (
                      <button
                        type="button"
                        aria-label={`Acciones de la fila ${idx + 1}`}
                        aria-haspopup="menu"
                        aria-expanded={openActionMenu?.rowIndex === idx}
                        onClick={(event) => openActionMenu?.rowIndex === idx
                          ? setOpenActionMenu(null)
                          : showRowActions(event, idx, customTokens.length > 0)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                        title="Ver acciones"
                      >
                        <MoreVertical size={18} />
                      </button>
                    ) : (
                    <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleMove(idx, -1)}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-200"
                      title="Subir"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 1)}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-200"
                      title="Bajar"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(idx)}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-blue-600 hover:bg-blue-50"
                      title="Duplicar fila"
                    >
                      <Copy size={16} />
                    </button>
                    {customTokens.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          agregar(customTokens);
                          alert('Guardado en el catálogo: ' + customTokens.map((t) => t.valor).join(', '));
                        }}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-emerald-600 hover:bg-emerald-50"
                        title={'Guardar en el catálogo: ' + customTokens.map((t) => t.valor).join(', ')}
                      >
                        <BookmarkPlus size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(idx)}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-red-500 hover:bg-red-50"
                      title="Eliminar"
                    >
                      <Trash size={16} />
                    </button>
                    </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="p-4 text-center text-slate-500">
                  No hay registros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {openActionMenu && actionMenuRow && typeof document !== 'undefined' && createPortal(
        <>
          <button
            type="button"
            aria-label="Cerrar menú de acciones"
            className="fixed inset-0 z-[9998] cursor-default bg-transparent print:hidden"
            onClick={() => setOpenActionMenu(null)}
          />
          <div
            role="menu"
            aria-label={`Acciones para la fila ${openActionMenu.rowIndex + 1}`}
            style={{ position: 'fixed', top: openActionMenu.top, left: openActionMenu.left, width: 208, zIndex: 9999 }}
            className="fixed overflow-hidden rounded-lg border border-slate-200 bg-white py-1.5 shadow-xl print:hidden"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              disabled={openActionMenu.rowIndex === 0}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => { const rowIndex = openActionMenu.rowIndex; setOpenActionMenu(null); handleMove(rowIndex, -1); }}
            >
              <ChevronUp size={16} className="text-slate-500" />
              Subir
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={openActionMenu.rowIndex === data.length - 1}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => { const rowIndex = openActionMenu.rowIndex; setOpenActionMenu(null); handleMove(rowIndex, 1); }}
            >
              <ChevronDown size={16} className="text-slate-500" />
              Bajar
            </button>
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50"
              onClick={() => { const rowIndex = openActionMenu.rowIndex; setOpenActionMenu(null); handleDuplicate(rowIndex); }}
            >
              <Copy size={16} className="text-blue-600" />
              Duplicar fila
            </button>
            {actionMenuTokens.length > 0 && (
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50"
                onClick={() => {
                  agregar(actionMenuTokens);
                  alert('Guardado en el catálogo: ' + actionMenuTokens.map((token) => token.valor).join(', '));
                  setOpenActionMenu(null);
                }}
              >
                <BookmarkPlus size={16} className="text-emerald-600" />
                Guardar en catálogo
              </button>
            )}
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              onClick={() => { const rowIndex = openActionMenu.rowIndex; setOpenActionMenu(null); handleDelete(rowIndex); }}
            >
              <Trash size={16} />
              Eliminar fila
            </button>
          </div>
        </>,
        document.body
      )}

      <button
        type="button"
        onClick={handleAddRow}
        className="w-full sm:w-auto px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold transition-colors print:hidden flex items-center justify-center"
      >
        + Agregar fila
      </button>
    </div>
  );
}
