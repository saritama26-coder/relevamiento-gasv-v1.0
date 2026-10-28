export const UNIDADES_BASE = [
  "m²", "m", "ml", "u", "pza", "jgo", "par", "glb", "kg", "t", "l", "día", "h", "Otro"
];

export const CONSTRUCTIVOS_ELEM_BASE = [
  "Piso", "Zócalos", "Paredes", "Divisiones de cabinas", "Cielo raso", "Cubierta",
  "Puerta", "Puertas", "Puerta de cabinas", "Ventanas", "Escaleras", "Barandas",
  "Mesón de lavamanos", "Urinario colectivo", "Otros"
];

export const EQUIPAMIENTO_ELEM_BASE = [
  "Inodoro", "Lavamanos", "Urinario", "Fregadero", "Ducha", "Hidromasaje",
  "Espejo", "Dispensador de jabón", "Dispensador de papel", "Secador de manos",
  "Accesorios sanitarios", "Mobiliario fijo", "Equipamiento", "Otro"
];

export const ELECTRICAS_ELEM_BASE = [
  "Punto de luz", "Lámpara / luminaria", "Sensor de movimiento",
  "Tomacorriente", "Tomacorriente doble", "Tomacorriente regulado",
  "Interruptor simple", "Interruptor doble", "Interruptor temporizador",
  "Conmutador", "Tablero eléctrico", "Caja de paso", "Ventilador", "Otro"
];

export const HIDROSANITARIAS_ELEM_BASE = [
  "Inodoro", "Lavamanos", "Urinario", "Fregadero", "Ducha", "Llave de paso",
  "Llave de lavamanos", "Manguera abasto lavamanos", "Manguera abasto inodoro",
  "Juego de herraje", "Juego de herraje para inodoro", "Accesorios sanitarios",
  "Punto de desagüe", "Sifón", "Sifón de lavamanos", "Coladera / sumidero",
  "Punto de agua", "Tubería visible", "Otro"
];

export const ESTADOS = ["Bueno", "Regular", "Malo", "Crítico"];

export const SEVERIDADES = ["Leve", "Moderada", "Severa", "Crítica"];

export const PRIORIDADES = ["Alta", "Media", "Baja"];

export const INTERVENCIONES = [
  "Mantenimiento preventivo",
  "Mantenimiento correctivo",
  "Reparación",
  "Reposición parcial",
  "Reposición total",
  "Retiro y reposición",
  "Intervención integral",
  "Solicitar criterio técnico especializado"
];

export const PATOLOGIAS_ELEM_BASE = [
  "Piso", "Ceramica en piso", "Zócalos", "Paredes", "Ceramica en pared",
  "Pintura en paredes", "Divisiones", "Cielo raso", "Cubierta", "Puerta",
  "Puertas", "Puerta de aluminio y vidrio", "Puerta de cabinas", "Puerta de ingreso",
  "Ventanas", "Escaleras", "Barandas", "Estructura", "Inodoro", "Lavamanos",
  "Urinario", "Ducha", "Llave de lavamanos", "Juego de herraje para inodoro",
  "Instalaciones hidrosanitarias", "Instalaciones eléctricas", "Tomacorriente",
  "Interruptor simple", "Interruptor doble", "Interruptor temporizador",
  "Lámpara / luminaria", "Mobiliario / equipamiento", "Otro"
];

export const PATOLOGIAS_TIPOS_BASE = [
  "Fisuras", "Grietas", "Humedad", "Filtración", "Fuga de agua", "Desprendimiento",
  "Desgaste", "Oxidación", "Piezas rotas", "Elemento faltante", "Deterioro severo",
  "Mantenimiento", "Otro"
];

export const PATOLOGIAS_UBICACION_BASE = [
  "General", "Generalizado en el ambiente", "Puntual", "Ingreso", "Centro del ambiente",
  "Esquina", "Perímetro", "Junto a puerta", "Junto a ventana", "Parte alta",
  "Parte baja", "Zona húmeda", "Otro"
];

export const ASISTENTE_ELEMENTOS = [
  "Piso", "Paredes", "Cielo raso", "Puerta", "Ventana", "Inodoro", "Lavamanos",
  "Urinario", "Punto de luz", "Tomacorriente", "Interruptor", "Tubería", "Otro"
];

export const ASISTENTE_INTERVENCIONES = [
  "Reparación", "Reposición", "Mantenimiento correctivo", "Mantenimiento preventivo", "Intervención integral"
];

export const ASISTENTE_DEFAULTS: Record<string, [string, string]> = {
  Piso: ["Retiro y reposición / reparación de piso según alcance", "m²"],
  Paredes: ["Reparación / reposición de revestimiento de paredes según alcance", "m²"],
  "Cielo raso": ["Reparación / reposición de cielo raso según alcance", "m²"],
  Puerta: ["Reparación / reposición de puerta según alcance", "u"],
  Puertas: ["Reparación / reposición de puertas según alcance", "u"],
  Ventana: ["Reparación / reposición de ventana según alcance", "u"],
  Ventanas: ["Reparación / reposición de ventanas según alcance", "u"],
  Inodoro: ["Revisión / reparación / reposición de inodoro", "u"],
  Lavamanos: ["Revisión / reparación / reposición de lavamanos", "u"],
  Urinario: ["Revisión / reparación / reposición de urinario", "u"],
  "Punto de luz": ["Revisión / adecuación de punto de luz", "u"],
  Tomacorriente: ["Revisión / adecuación de tomacorriente", "u"],
  Interruptor: ["Revisión / adecuación de interruptor", "u"],
  "Interruptor simple": ["Revisión / adecuación de interruptor simple", "u"],
  "Interruptor doble": ["Revisión / adecuación de interruptor doble", "u"],
  Tubería: ["Reparación / reposición de tubería", "ml"],
  Otro: ["Actividad de mantenimiento según diagnóstico", "u"]
};

export const LISTAS_DEFAULT: Record<string, string[]> = {
  "list-unidades": UNIDADES_BASE,
  "list-cons-elem": CONSTRUCTIVOS_ELEM_BASE,
  "list-equip-elem": EQUIPAMIENTO_ELEM_BASE,
  "list-elec-elem": ELECTRICAS_ELEM_BASE,
  "list-hidro-elem": HIDROSANITARIAS_ELEM_BASE,
  "list-pat-elem": PATOLOGIAS_ELEM_BASE,
  "list-pat-tipos": PATOLOGIAS_TIPOS_BASE,
  "list-pat-ubic": PATOLOGIAS_UBICACION_BASE
};

export const LOGO_GSARITAMA =
  "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%201000%20230%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%3C%21--%20Rectangular%20Outer%20Border%20--%3E%0A%20%20%3Crect%20x%3D%228%22%20y%3D%228%22%20width%3D%22984%22%20height%3D%22214%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%2211%22%20stroke-linejoin%3D%22miter%22%20/%3E%0A%0A%20%20%3C%21--%20Continuous%20horizontal%20axis%20rule%3A%20extends%20from%20middle%20of%20G%20across%20the%20entire%20logo%20--%3E%0A%20%20%3Cline%20x1%3D%22125%22%20y1%3D%22126%22%20x2%3D%22980%22%20y2%3D%22126%22%20stroke%3D%22currentColor%22%20stroke-width%3D%226.5%22%20stroke-linecap%3D%22square%22%20/%3E%0A%0A%20%20%3C%21--%20Monogram%20G%3A%20Large%20circular%20arc%20with%20left%20vertical%20cutoff%20%26%20filled%20crescent%20--%3E%0A%20%20%3Cg%20id%3D%22letter-G%22%3E%0A%20%20%20%20%3C%21--%20Left%20crescent%20%28solid%20black/white%20between%20chord%20and%20outer%20arc%29%20--%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%2094%2040%0A%20%20%20%20%20%20%20%20%20%20%20%20%20A%2088%2088%200%200%200%2094%20212%0A%20%20%20%20%20%20%20%20%20%20%20%20%20Z%22%0A%20%20%20%20%20%20%20%20%20%20fill%3D%22currentColor%22%20/%3E%0A%20%20%20%20%0A%20%20%20%20%3C%21--%20Outer%20arc%20extending%20top%20and%20bottom%20--%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%2094%2040%0A%20%20%20%20%20%20%20%20%20%20%20%20%20A%2088%2088%200%200%201%20185%2040%22%0A%20%20%20%20%20%20%20%20%20%20fill%3D%22none%22%0A%20%20%20%20%20%20%20%20%20%20stroke%3D%22currentColor%22%0A%20%20%20%20%20%20%20%20%20%20stroke-width%3D%2216%22%0A%20%20%20%20%20%20%20%20%20%20stroke-linecap%3D%22square%22%20/%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%2094%20212%0A%20%20%20%20%20%20%20%20%20%20%20%20%20A%2088%2088%200%200%200%20185%20212%22%0A%20%20%20%20%20%20%20%20%20%20fill%3D%22none%22%0A%20%20%20%20%20%20%20%20%20%20stroke%3D%22currentColor%22%0A%20%20%20%20%20%20%20%20%20%20stroke-width%3D%2216%22%0A%20%20%20%20%20%20%20%20%20%20stroke-linecap%3D%22square%22%20/%3E%0A%0A%20%20%20%20%3C%21--%20Vertical%20boundary%20line%20of%20the%20chord%20--%3E%0A%20%20%20%20%3Cline%20x1%3D%2294%22%20y1%3D%2236%22%20x2%3D%2294%22%20y2%3D%22216%22%20stroke%3D%22currentColor%22%20stroke-width%3D%226%22%20/%3E%0A%20%20%3C/g%3E%0A%0A%20%20%3C%21--%20Monogram%20S%3A%20Elegant%20classical%20serif%20S%20overlapping%20G%20--%3E%0A%20%20%3Cg%20id%3D%22letter-S%22%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%20282%2040%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%20246%2038%2C%20196%2050%2C%20190%2078%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%20185%20104%2C%20206%20116%2C%20232%20122%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%20264%20130%2C%20290%20136%2C%20290%20158%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%20290%20180%2C%20264%20194%2C%20234%20194%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%20202%20194%2C%20172%20182%2C%20164%20158%0A%20%20%20%20%20%20%20%20%20%20%20%20%20L%20138%20162%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%20146%20198%2C%20186%20216%2C%20234%20216%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%20286%20216%2C%20318%20190%2C%20318%20154%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%20318%20126%2C%20292%20112%2C%20260%20105%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%20232%2098%2C%20214%2091%2C%20214%2074%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%20214%2059%2C%20232%2054%2C%20252%2054%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%20278%2054%2C%20300%2065%2C%20306%2084%0A%20%20%20%20%20%20%20%20%20%20%20%20%20L%20332%2078%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%20322%2048%2C%20294%2040%2C%20282%2040%20Z%22%0A%20%20%20%20%20%20%20%20%20%20fill%3D%22currentColor%22%20/%3E%0A%20%20%3C/g%3E%0A%0A%20%20%3C%21--%20Letter%20A%20in%20ARIT%20--%3E%0A%20%20%3Cg%20transform%3D%22translate%28325%2C%2048%29%22%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%2046%200%20L%2010%20148%20L%2028%20148%20L%2038%20102%20L%2078%20102%20L%2088%20148%20L%20106%20148%20Z%0A%20%20%20%20%20%20%20%20%20%20%20%20%20M%2058%2026%20L%2072%2082%20L%2044%2082%20Z%22%0A%20%20%20%20%20%20%20%20%20%20fill%3D%22currentColor%22%20/%3E%0A%20%20%20%20%3Crect%20x%3D%220%22%20y%3D%22142%22%20width%3D%2238%22%20height%3D%226%22%20fill%3D%22currentColor%22%20/%3E%0A%20%20%20%20%3Crect%20x%3D%2280%22%20y%3D%22142%22%20width%3D%2238%22%20height%3D%226%22%20fill%3D%22currentColor%22%20/%3E%0A%20%20%20%20%3Crect%20x%3D%2236%22%20y%3D%220%22%20width%3D%2220%22%20height%3D%225%22%20fill%3D%22currentColor%22%20/%3E%0A%20%20%3C/g%3E%0A%0A%20%20%3C%21--%20Letter%20R%20--%3E%0A%20%20%3Cg%20transform%3D%22translate%28435%2C%2048%29%22%3E%0A%20%20%20%20%3Crect%20x%3D%2212%22%20y%3D%220%22%20width%3D%2222%22%20height%3D%22148%22%20fill%3D%22currentColor%22%20/%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%2028%200%20L%2065%200%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%2088%200%2C%20104%2014%2C%20104%2044%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%20104%2074%2C%2088%2086%2C%2065%2086%0A%20%20%20%20%20%20%20%20%20%20%20%20%20L%2028%2086%20Z%0A%20%20%20%20%20%20%20%20%20%20%20%20%20M%2034%2018%20L%2060%2018%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%2074%2018%2C%2080%2028%2C%2080%2044%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%2080%2060%2C%2074%2068%2C%2060%2068%0A%20%20%20%20%20%20%20%20%20%20%20%20%20L%2034%2068%20Z%22%0A%20%20%20%20%20%20%20%20%20%20fill%3D%22currentColor%22%20/%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%2054%2082%20L%2090%20148%20L%20116%20148%20L%2076%2078%20Z%22%20fill%3D%22currentColor%22%20/%3E%0A%20%20%20%20%3Crect%20x%3D%222%22%20y%3D%220%22%20width%3D%2234%22%20height%3D%226%22%20fill%3D%22currentColor%22%20/%3E%0A%20%20%20%20%3Crect%20x%3D%222%22%20y%3D%22142%22%20width%3D%2238%22%20height%3D%226%22%20fill%3D%22currentColor%22%20/%3E%0A%20%20%3C/g%3E%0A%0A%20%20%3C%21--%20Letter%20I%20--%3E%0A%20%20%3Cg%20transform%3D%22translate%28545%2C%2048%29%22%3E%0A%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%220%22%20width%3D%2222%22%20height%3D%22148%22%20fill%3D%22currentColor%22%20/%3E%0A%20%20%20%20%3Crect%20x%3D%224%22%20y%3D%220%22%20width%3D%2254%22%20height%3D%226%22%20fill%3D%22currentColor%22%20/%3E%0A%20%20%20%20%3Crect%20x%3D%224%22%20y%3D%22142%22%20width%3D%2254%22%20height%3D%226%22%20fill%3D%22currentColor%22%20/%3E%0A%20%20%3C/g%3E%0A%0A%20%20%3C%21--%20Letter%20T%20--%3E%0A%20%20%3Cg%20transform%3D%22translate%28605%2C%2048%29%22%3E%0A%20%20%20%20%3Crect%20x%3D%2228%22%20y%3D%220%22%20width%3D%2222%22%20height%3D%22148%22%20fill%3D%22currentColor%22%20/%3E%0A%20%20%20%20%3Crect%20x%3D%220%22%20y%3D%220%22%20width%3D%2278%22%20height%3D%2216%22%20fill%3D%22currentColor%22%20/%3E%0A%20%20%20%20%3Crect%20x%3D%220%22%20y%3D%2214%22%20width%3D%227%22%20height%3D%2210%22%20fill%3D%22currentColor%22%20/%3E%0A%20%20%20%20%3Crect%20x%3D%2271%22%20y%3D%2214%22%20width%3D%227%22%20height%3D%2210%22%20fill%3D%22currentColor%22%20/%3E%0A%20%20%20%20%3Crect%20x%3D%2214%22%20y%3D%22142%22%20width%3D%2250%22%20height%3D%226%22%20fill%3D%22currentColor%22%20/%3E%0A%20%20%3C/g%3E%0A%0A%20%20%3C%21--%20Architect%20Compass%20with%20Target%20Crosshairs%20%28Forms%20letter%20A%20in%20SARITAMA%29%20--%3E%0A%20%20%3Cg%20id%3D%22compass%22%20transform%3D%22translate%28684%2C%2016%29%22%3E%0A%20%20%20%20%3C%21--%20Top%20needle%20axis%20pin%20--%3E%0A%20%20%20%20%3Cline%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%2238%22%20stroke%3D%22currentColor%22%20stroke-width%3D%224.5%22%20stroke-linecap%3D%22round%22%20/%3E%0A%20%20%20%20%0A%20%20%20%20%3C%21--%20Outer%20crosshairs%20circle%20/%20target%20--%3E%0A%20%20%20%20%3Ccircle%20cx%3D%220%22%20cy%3D%2246%22%20r%3D%2230%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%225%22%20/%3E%0A%20%20%20%20%3Ccircle%20cx%3D%220%22%20cy%3D%2246%22%20r%3D%2214%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%223.5%22%20/%3E%0A%20%20%20%20%3C%21--%20Reticle%20crosshairs%20--%3E%0A%20%20%20%20%3Cline%20x1%3D%22-38%22%20y1%3D%2246%22%20x2%3D%2238%22%20y2%3D%2246%22%20stroke%3D%22currentColor%22%20stroke-width%3D%223.5%22%20/%3E%0A%20%20%20%20%3Cline%20x1%3D%220%22%20y1%3D%2212%22%20x2%3D%220%22%20y2%3D%2280%22%20stroke%3D%22currentColor%22%20stroke-width%3D%223.5%22%20/%3E%0A%20%20%20%20%3Ccircle%20cx%3D%220%22%20cy%3D%2246%22%20r%3D%225%22%20fill%3D%22currentColor%22%20/%3E%0A%0A%20%20%20%20%3C%21--%20Left%20Leg%20--%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%20-6%2052%20%0A%20%20%20%20%20%20%20%20%20%20%20%20%20L%20-56%20182%0A%20%20%20%20%20%20%20%20%20%20%20%20%20L%20-40%20184%0A%20%20%20%20%20%20%20%20%20%20%20%20%20L%200%2068%20Z%22%20%0A%20%20%20%20%20%20%20%20%20%20fill%3D%22currentColor%22%20/%3E%0A%0A%20%20%20%20%3C%21--%20Right%20Leg%20--%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%206%2052%20%0A%20%20%20%20%20%20%20%20%20%20%20%20%20L%2056%20182%0A%20%20%20%20%20%20%20%20%20%20%20%20%20L%2040%20184%0A%20%20%20%20%20%20%20%20%20%20%20%20%20L%200%2068%20Z%22%20%0A%20%20%20%20%20%20%20%20%20%20fill%3D%22currentColor%22%20/%3E%0A%0A%20%20%20%20%3C%21--%20Compass%20needle%20tips%20--%3E%0A%20%20%20%20%3Cpolygon%20points%3D%22-52%2C182%20-56%2C182%20-48%2C198%22%20fill%3D%22currentColor%22%20/%3E%0A%20%20%20%20%3Cpolygon%20points%3D%2252%2C182%2056%2C182%2048%2C198%22%20fill%3D%22currentColor%22%20/%3E%0A%0A%20%20%20%20%3C%21--%20Adjustment%20thumbscrew%20--%3E%0A%20%20%20%20%3Crect%20x%3D%22-30%22%20y%3D%22106%22%20width%3D%2260%22%20height%3D%229%22%20rx%3D%223%22%20fill%3D%22currentColor%22%20/%3E%0A%20%20%20%20%3Cline%20x1%3D%22-24%22%20y1%3D%22110.5%22%20x2%3D%2224%22%20y2%3D%22110.5%22%20stroke%3D%22currentColor%22%20stroke-width%3D%221.5%22%20/%3E%0A%20%20%3C/g%3E%0A%0A%20%20%3C%21--%20Letter%20M%20%28Top%20right%20above%20axis%20line%29%20--%3E%0A%20%20%3Cg%20transform%3D%22translate%28750%2C%2048%29%22%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%200%200%20L%2026%200%20L%2052%2074%20L%2078%200%20L%20104%200%20L%20104%2078%20L%2084%2078%20L%2084%2026%20L%2062%2078%20L%2042%2078%20L%2020%2026%20L%2020%2078%20L%200%2078%20Z%22%0A%20%20%20%20%20%20%20%20%20%20fill%3D%22currentColor%22%20/%3E%0A%20%20%3C/g%3E%0A%0A%20%20%3C%21--%20Letter%20A%20%28Top%20right%20above%20axis%20line%29%20--%3E%0A%20%20%3Cg%20transform%3D%22translate%28860%2C%2048%29%22%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%2040%200%20L%2010%2078%20L%2026%2078%20L%2034%2056%20L%2066%2056%20L%2074%2078%20L%2090%2078%20Z%0A%20%20%20%20%20%20%20%20%20%20%20%20%20M%2050%2014%20L%2062%2046%20L%2038%2046%20Z%22%0A%20%20%20%20%20%20%20%20%20%20fill%3D%22currentColor%22%20/%3E%0A%20%20%20%20%3Crect%20x%3D%222%22%20y%3D%2274%22%20width%3D%2228%22%20height%3D%224%22%20fill%3D%22currentColor%22%20/%3E%0A%20%20%20%20%3Crect%20x%3D%2270%22%20y%3D%2274%22%20width%3D%2228%22%20height%3D%224%22%20fill%3D%22currentColor%22%20/%3E%0A%20%20%3C/g%3E%0A%0A%20%20%3C%21--%20Subtitle%3A%20ARQ.%20%28Below%20the%20axis%20line%3A%20A%20under%20compass%2C%20R%20under%20M%2C%20Q.%20under%20A%29%20--%3E%0A%20%20%3C%21--%20A%20under%20compass%20--%3E%0A%20%20%3Cg%20transform%3D%22translate%28660%2C%20134%29%22%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%2024%200%20L%204%2060%20L%2018%2060%20L%2023%2042%20L%2043%2042%20L%2048%2060%20L%2062%2060%20Z%0A%20%20%20%20%20%20%20%20%20%20%20%20%20M%2033%2012%20L%2040%2032%20L%2026%2032%20Z%22%0A%20%20%20%20%20%20%20%20%20%20fill%3D%22currentColor%22%20/%3E%0A%20%20%3C/g%3E%0A%0A%20%20%3C%21--%20R%20under%20M%20--%3E%0A%20%20%3Cg%20transform%3D%22translate%28760%2C%20134%29%22%3E%0A%20%20%20%20%3Crect%20x%3D%228%22%20y%3D%220%22%20width%3D%2216%22%20height%3D%2260%22%20fill%3D%22currentColor%22%20/%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%2022%200%20L%2044%200%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%2058%200%2C%2068%207%2C%2068%2019%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%2068%2031%2C%2058%2038%2C%2044%2038%0A%20%20%20%20%20%20%20%20%20%20%20%20%20L%2022%2038%20Z%0A%20%20%20%20%20%20%20%20%20%20%20%20%20M%2024%2010%20L%2040%2010%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%2048%2010%2C%2052%2013%2C%2052%2019%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%2052%2025%2C%2048%2028%2C%2040%2028%0A%20%20%20%20%20%20%20%20%20%20%20%20%20L%2024%2028%20Z%22%0A%20%20%20%20%20%20%20%20%20%20fill%3D%22currentColor%22%20/%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%2036%2034%20L%2060%2060%20L%2076%2060%20L%2050%2032%20Z%22%20fill%3D%22currentColor%22%20/%3E%0A%20%20%20%20%3Crect%20x%3D%220%22%20y%3D%2256%22%20width%3D%2226%22%20height%3D%224%22%20fill%3D%22currentColor%22%20/%3E%0A%20%20%3C/g%3E%0A%0A%20%20%3C%21--%20Q%20under%20A%20--%3E%0A%20%20%3Cg%20transform%3D%22translate%28855%2C%20134%29%22%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%2036%200%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%2016%200%2C%200%2014%2C%200%2031%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%200%2048%2C%2016%2062%2C%2036%2062%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%2056%2062%2C%2072%2048%2C%2072%2031%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%2072%2014%2C%2056%200%2C%2036%200%20Z%0A%20%20%20%20%20%20%20%20%20%20%20%20%20M%2036%2010%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%2048%2010%2C%2056%2019%2C%2056%2031%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%2056%2043%2C%2048%2052%2C%2036%2052%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%2024%2052%2C%2016%2043%2C%2016%2031%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%2016%2019%2C%2024%2010%2C%2036%2010%20Z%22%0A%20%20%20%20%20%20%20%20%20%20fill%3D%22currentColor%22%20/%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%2044%2044%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%2052%2044%2C%2062%2052%2C%2074%2060%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%2082%2065%2C%2088%2068%2C%2092%2070%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%2088%2072%2C%2076%2070%2C%2064%2062%0A%20%20%20%20%20%20%20%20%20%20%20%20%20C%2056%2056%2C%2048%2050%2C%2044%2044%20Z%22%0A%20%20%20%20%20%20%20%20%20%20fill%3D%22currentColor%22%20/%3E%0A%20%20%20%20%3Ccircle%20cx%3D%22106%22%20cy%3D%2256%22%20r%3D%226%22%20fill%3D%22currentColor%22%20/%3E%0A%20%20%3C/g%3E%0A%3C/svg%3E%0A";
