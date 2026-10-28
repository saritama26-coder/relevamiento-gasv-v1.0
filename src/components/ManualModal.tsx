import { useState } from 'react';
import { BookOpen, X, ChevronRight } from 'lucide-react';
import { GSARITAMA_LOGO_PNG } from '../constants/logoData';

interface ManualModalProps {
  onClose: () => void;
}

export function ManualModal({ onClose }: ManualModalProps) {
  const [activeSection, setActiveSection] = useState('intro');

  const menu = [
    { id: 'intro', label: '1. Objetivo y Flujo de Trabajo' },
    { id: 'globales', label: '2. Datos Globales del Proyecto' },
    { id: 'sec1', label: '3. Sección 1: Datos Generales' },
    { id: 'sec2', label: '4. Sección 2: Levantamiento Dimensional' },
    { id: 'sec3-6', label: '5. Secciones 3-6: Elementos e Instalaciones' },
    { id: 'sec7', label: '6. Sección 7: Patologías y Deficiencias' },
    { id: 'sec8', label: '7. Sección 8: Cuantificación Preliminar' },
    { id: 'sec9', label: '8. Sección 9: Registro Fotográfico' },
    { id: 'sec10', label: '9. Sección 10: Diagnóstico' },
    { id: 'gestion', label: '10. Gestión de Fichas y Ambientes' },
    { id: 'auto', label: '11. Autoguardado y Respaldo del Proyecto' },
    { id: 'catalogo', label: '12. Catálogos Personalizados' },
    { id: 'impresion', label: '13. Impresión y PDF' },
    { id: 'resumen', label: '14. Resumen de la Ficha' },
    { id: 'movil', label: '15. Uso en Móvil y Asociación con PC' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 sm:p-6 print:hidden">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#17365d] text-white p-3 sm:p-4 flex justify-between items-center shrink-0 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-1 rounded-sm shrink-0 flex items-center justify-center border border-slate-300">
              <img
                src={GSARITAMA_LOGO_PNG}
                alt="GSARITAMA ARQ."
                className="h-8 sm:h-10 w-auto max-w-[180px] object-contain block"
              />
            </div>
            <div className="border-l border-white/30 pl-3">
              <h2 className="text-base sm:text-lg font-bold">Manual Detallado de Uso</h2>
              <p className="text-[11px] text-sky-200">Arq. Gabriel Saritama Veira</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded transition-colors text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          {/* Sidebar */}
          <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 overflow-y-auto shrink-0 flex flex-row md:flex-col">
            {menu.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveSection(m.id)}
                className={`flex items-center justify-between text-left p-3 text-sm font-medium transition-colors border-b border-slate-200 md:border-b-0 md:border-l-4 min-w-[200px] md:min-w-0 ${
                  activeSection === m.id
                    ? 'bg-blue-50 text-blue-800 border-l-blue-600'
                    : 'text-slate-600 hover:bg-slate-100 border-l-transparent'
                }`}
              >
                <span>{m.label}</span>
                {activeSection === m.id && <ChevronRight size={16} className="hidden md:block" />}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 p-6 overflow-y-auto bg-white text-slate-700 space-y-6">
            {activeSection === 'intro' && (
              <section className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-800">1. Objetivo y Flujo de Trabajo</h3>
                <p>
                  La aplicación <strong>Relevamiento Arquitectónico</strong> permite registrar de forma ágil y
                  estructurada el estado de distintos ambientes en un proyecto arquitectónico, registrar patologías,
                  generar cuantificaciones automáticas y exportar todo de manera 100% <em>offline</em>.
                </p>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-blue-900">
                  <strong>Flujo Recomendado:</strong>
                  <ol className="list-decimal ml-5 mt-2 space-y-1 text-sm">
                    <li>Ingrese los <strong>Datos Globales</strong> del proyecto (Nombre, Ubicación, Bloque).</li>
                    <li>Cree un nuevo ambiente, llene sus dimensiones y elementos constructivos o instalaciones.</li>
                    <li>En la <strong>Sección 7</strong> registre las patologías/daños encontrados.</li>
                    <li>Utilice el botón <strong>&quot;Pasar a sección 8&quot;</strong> para convertir los daños en trabajos cuantificables.</li>
                    <li>Suba fotografías en la <strong>Sección 9</strong> y ajuste el diagnóstico final.</li>
                    <li>Guarde la ficha y expórtela a PDF o planilla CSV consolidada.</li>
                  </ol>
                </div>
                <p>
                  Todos los datos se guardan en la base de datos de su navegador (IndexedDB), sin límite de fotos o registros.
                </p>
              </section>
            )}

            {activeSection === 'globales' && (
              <section className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-800">2. Datos Globales del Proyecto</h3>
                <p>
                  Ubicados en la parte superior del panel principal. Son campos que <strong>se heredan automáticamente</strong> a cada ficha nueva que se cree, evitando escribir lo mismo repetidas veces.
                </p>
                <ul className="list-disc ml-5 space-y-2">
                  <li><strong>Proyecto / Inmueble:</strong> Nombre general del edificio, escuela, hospital, etc.</li>
                  <li><strong>Ubicación:</strong> Ciudad, barrio o dirección.</li>
                  <li><strong>Bloque / Edificio:</strong> Actúa como valor predeterminado si el proyecto tiene varios módulos. En la ficha de cada ambiente puede modificarlo de manera individual.</li>
                </ul>
              </section>
            )}

            {activeSection === 'sec1' && (
              <section className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-800">3. Sección 1: Datos Generales</h3>
                <p>Esta sección identifica unívocamente al ambiente que se está inspeccionando:</p>
                <ul className="list-disc ml-5 space-y-2">
                  <li><strong>Ambiente / Área:</strong> Nombre descriptivo (ej. &quot;Aula 1&quot;, &quot;Batería Sanitaria Mujeres&quot;).</li>
                  <li><strong>Código:</strong> Un identificador corto (ej. &quot;A-01&quot;, &quot;B-02&quot;). <strong>Importante:</strong> Se requiere ingresar el Ambiente o el Código para guardar.</li>
                  <li><strong>Fecha y Responsable:</strong> Fecha de la inspección y nombre del profesional que levanta la información.</li>
                </ul>
              </section>
            )}

            {activeSection === 'sec2' && (
              <section className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-800">4. Sección 2: Levantamiento Dimensional</h3>
                <p>Permite registrar las medidas y calcular automáticamente el área y perímetro:</p>
                <div className="bg-slate-100 p-4 rounded border border-slate-200">
                  <ul className="space-y-3">
                    <li><strong>Geometría Regular:</strong> Ingrese el Largo y Ancho en metros. El sistema calculará el <em>Área registrada (m²)</em> y el <em>Perímetro (m)</em> instantáneamente.</li>
                    <li><strong>Geometría Irregular:</strong> Si el espacio no es rectangular, el sistema le permite ingresar directamente el Área y la Altura, prescindiendo del perímetro.</li>
                    <li><strong>Estado General:</strong> Permite evaluar globalmente la situación dimensional del espacio.</li>
                  </ul>
                </div>
              </section>
            )}

            {activeSection === 'sec3-6' && (
              <section className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-800">5. Secciones 3 a 6: Elementos e Instalaciones</h3>
                <p>Agrupa Constructivos, Equipamiento, Eléctricas e Hidrosanitarias. Estas secciones responden a la pregunta <strong>&quot;¿Qué existe en el ambiente?&quot;</strong>.</p>
                <ul className="list-disc ml-5 space-y-2">
                  <li><strong>Campos Autocompletables:</strong> Al hacer clic en campos como <em>Elemento</em> o <em>Unidad</em>, se desplegará una lista de sugerencias. Sin embargo, <strong>usted puede escribir cualquier texto libremente</strong> si no encuentra la opción que necesita.</li>
                  <li><strong>Botones de Acción:</strong> Cada fila tiene botones a la derecha para <em>Subir</em>, <em>Bajar</em> o <em>Eliminar</em> la fila de la tabla.</li>
                  <li><strong>No anote daños aquí:</strong> Si algo está roto, debe declararlo en la Sección 7. Las secciones 3 a 6 son inventarios de existencia.</li>
                </ul>
              </section>
            )}

            {activeSection === 'sec7' && (
              <section className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-800">6. Sección 7: Patologías y Deficiencias</h3>
                <p>Sección fundamental. Responde a <strong>&quot;¿Qué está dañado?&quot;</strong>.</p>
                <ul className="list-disc ml-5 space-y-2 mb-4">
                  <li><strong>Elemento Afectado:</strong> ¿Qué está dañado? (Ej. &quot;Paredes&quot;, &quot;Piso&quot;).</li>
                  <li><strong>Patología:</strong> ¿Cuál es el daño? (Ej. &quot;Humedad&quot;, &quot;Fisuras&quot;, &quot;Desprendimiento&quot;).</li>
                  <li><strong>Ubicación:</strong> ¿Dónde? (Ej. &quot;Junto a la ventana&quot;, &quot;Parte alta&quot;).</li>
                  <li><strong>Cantidad y Unidad:</strong> Especifique <em>solamente</em> la cantidad afectada (Ej. &quot;4.5 m²&quot;), no el área total.</li>
                  <li><strong>Severidad:</strong> (Leve, Moderada, Severa, Crítica). Define la prioridad del trabajo posterior.</li>
                  <li><strong>Intervención Recomendada:</strong> ¿Qué sugiere hacer? (Ej. &quot;Reposición parcial&quot;, &quot;Reparación&quot;).</li>
                </ul>
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded text-green-900">
                  <strong>Botón &quot;Pasar a sección 8&quot;:</strong><br />
                  Este botón toma todas las patologías declaradas y genera automáticamente las tareas en la tabla de Cuantificación (Sección 8). Combina la intervención, el elemento y el daño para redactar el &quot;Trabajo a ejecutar&quot;.
                </div>
              </section>
            )}

            {activeSection === 'sec8' && (
              <section className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-800">7. Sección 8: Cuantificación Preliminar</h3>
                <p>Responde a <strong>&quot;¿Qué hay que hacer y cuánto?&quot;</strong>. Sirve como insumo principal para elaborar los Presupuestos (APU) posteriormente.</p>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-blue-900 my-4">
                  <strong>Asistente de cuantificación:</strong>
                  <p className="mt-2 text-sm">
                    Sobre la tabla encontrará un bloque de seis campos que redacta la actividad y toma la cantidad ya levantada:
                  </p>
                  <ol className="list-decimal ml-5 mt-2 space-y-1 text-sm">
                    <li>Al elegir el <strong>Elemento</strong> se propone el texto del trabajo y su unidad.</li>
                    <li>La <strong>cantidad</strong> se toma automáticamente: <em>Piso</em> y <em>Cielo raso</em> usan el área de la Sección 2; <em>Paredes</em> usa perímetro × altura; el resto busca la cantidad registrada en las Secciones 3 a 6. Debajo del bloque se indica de dónde salió el dato.</li>
                    <li>El <strong>Estado</strong> define la prioridad de la fila: Crítico y Malo generan prioridad Alta, Regular genera Media y Bueno genera Baja. Si elige Crítico, la intervención cambia a &quot;Intervención integral&quot;.</li>
                    <li><strong>Agregar a la tabla</strong> crea la fila con el código del ambiente ya cargado.</li>
                  </ol>
                </div>
              </section>
            )}

            {activeSection === 'sec9' && (
              <section className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-800">8. Sección 9: Registro Fotográfico</h3>
                <p>Permite respaldar visualmente los hallazgos:</p>
                <ul className="list-disc ml-5 space-y-2">
                  <li><strong>Compresión Inteligente:</strong> El sistema comprime y recorta automáticamente las imágenes grandes a un tamaño óptimo (máx 1400px en JPEG 70%) para mantener la base de datos ligera y ágil.</li>
                  <li><strong>Descripción:</strong> Debajo de cada foto aparece una casilla de texto para indicar qué muestra la imagen (Ej. &quot;Fisura estructural en columna norte&quot;).</li>
                  <li><strong>Eliminar:</strong> Un botón rojo de papelera le permite descartar la imagen si hubo un error.</li>
                </ul>
              </section>
            )}

            {activeSection === 'sec10' && (
              <section className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-800">9. Sección 10: Diagnóstico</h3>
                <p>Aquí el profesional técnico emite su juicio final sobre el ambiente inspeccionado:</p>
                <ul className="list-disc ml-5 space-y-2">
                  <li><strong>Estado:</strong> Valoración global (Bueno, Regular, Malo, Crítico).</li>
                  <li><strong>Intervención:</strong> La medida macro recomendada (Mantenimiento preventivo, correctivo, integral, etc.).</li>
                  <li><strong>Criterio Técnico:</strong> Campo de texto libre para detallar conclusiones, justificaciones y análisis del problema.</li>
                </ul>
              </section>
            )}

            {activeSection === 'gestion' && (
              <section className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-800">10. Gestión de Fichas y Ambientes</h3>
                <p>
                  Debajo de los Datos Globales se encuentra la tabla <strong>Ambientes del Proyecto</strong>, que lista todos los ambientes guardados con su código, bloque, nivel, área y estado. Al pie muestra el <strong>área total evaluada</strong> y el conteo por estado (B / R / M / C).
                </p>
                <p>
                  La barra superior contiene los controles maestros. Al hacer clic en <strong>Fichas Guardadas</strong> se abre el panel lateral:
                </p>
                <div className="bg-slate-100 p-4 rounded border border-slate-200">
                  <ul className="space-y-4">
                    <li><strong>Cargar:</strong> Abre una ficha previamente guardada para poder editarla, añadir fotos o corregir cálculos.</li>
                    <li><strong>Duplicar (Como plantilla):</strong> Ideal cuando hay ambientes repetitivos (Ej. &quot;Aula 1&quot;, &quot;Aula 2&quot;). Esta función copia toda la ficha y vacía las Secciones 8 y 9. Al pulsarlo se propone el consecutivo siguiente.</li>
                    <li><strong>Exportar CSV:</strong> Extrae toda la Cuantificación de TODAS las fichas guardadas, formando una planilla Excel perfecta para presupuestos.</li>
                  </ul>
                </div>
              </section>
            )}

            {activeSection === 'auto' && (
              <section className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-800">11. Autoguardado y Respaldo del Proyecto</h3>
                <ul className="list-disc ml-5 space-y-2 mb-4">
                  <li><strong>Autoguardado:</strong> la ficha se guarda sola 2,5 segundos después de la última edición. Se informa en la franja superior el estado en tiempo real.</li>
                  <li><strong>Requisito:</strong> necesita el Código o el Ambiente para autoguardarse.</li>
                  <li><strong>Aviso de salida:</strong> si intenta cerrar la pestaña con cambios pendientes, el navegador pide confirmación.</li>
                </ul>
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded text-green-900 mb-4">
                  <strong>Exportar proyecto / Importar proyecto:</strong>
                  <p className="mt-2 text-sm">
                    <strong>Exportar proyecto</strong> descarga un archivo <code>.json</code> con todos los ambientes, los datos del proyecto y sus catálogos personalizados, nombrado con el bloque y sello de fecha y hora.
                  </p>
                  <p className="mt-2 text-sm">
                    <strong>Importar proyecto</strong> vuelve a cargar ese archivo: los ambientes se agregan o actualizan limpiamente. También acepta respaldos de la versión 3.1.
                  </p>
                </div>

                <div className="bg-sky-50 border-l-4 border-sky-500 p-4 rounded text-sky-900">
                  <strong>Respaldo en la Nube con Google Drive:</strong>
                  <p className="mt-2 text-sm">
                    Al vincular su cuenta mediante el botón <strong>Google Drive</strong> en la barra superior:
                  </p>
                  <ul className="list-disc ml-5 mt-2 space-y-1 text-sm">
                    <li>Se crea automáticamente la carpeta <code>Relevamiento_Arquitectonico_Backups</code> en su Google Drive.</li>
                    <li>Cada vez que edite o guarde ambientes, se sube una copia de seguridad en segundo plano.</li>
                    <li>Si borra la caché o el historial de su navegador, puede restaurar al instante todos sus ambientes directamente desde Google Drive con un solo clic.</li>
                    <li>Puede además generar copias fechadas de respaldo en cualquier momento.</li>
                  </ul>
                </div>
              </section>
            )}

            {activeSection === 'catalogo' && (
              <section className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-800">12. Catálogos Personalizados</h3>
                <p>Los campos con sugerencias (Elemento, Unidad, Patología, Ubicación) pueden ampliarse con su propia terminología:</p>
                <ol className="list-decimal ml-5 space-y-2">
                  <li>Escriba el valor nuevo en el campo, por ejemplo &quot;Mampara de aluminio&quot;.</li>
                  <li>En la columna <strong>Acciones</strong> de esa fila aparece un botón verde de marcador. Al pulsarlo, el valor queda guardado.</li>
                  <li>Desde ese momento el término figura en las sugerencias de todas las fichas y sobrevive al cierre del navegador.</li>
                </ol>
              </section>
            )}

            {activeSection === 'impresion' && (
              <section className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-800">13. Impresión y PDF</h3>
                <p>Haciendo clic en el botón <strong>PDF / Imprimir</strong> en la barra superior:</p>
                <ul className="list-disc ml-5 space-y-2">
                  <li>La aplicación activa hojas de estilo especiales de impresión (<code>@media print</code>).</li>
                  <li>Se ocultan barras de navegación, botones y bordes innecesarios, transformando el formulario en un reporte limpio y formal.</li>
                  <li><strong>Texto completo:</strong> los campos se sustituyen por texto continuo sin recortar descripciones largas.</li>
                  <li><strong>Nombre del archivo:</strong> se propone automáticamente con el proyecto, ambiente y fecha/hora.</li>
                </ul>
              </section>
            )}

            {activeSection === 'resumen' && (
              <section className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-800">14. Resumen de la Ficha</h3>
                <p>
                  Al final del formulario, la <strong>Sección 13</strong> muestra cuatro contadores automáticos:
                  Constructivos, Equipamiento, Patologías y Actividades cuantificadas. Sirven como verificación rápida antes de cerrar el ambiente.
                </p>
              </section>
            )}

            {activeSection === 'movil' && (
              <section className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-800">15. Uso en Móvil y Asociación con PC</h3>
                <p>
                  La aplicación está optimizada con tecnología <strong>Progressive Web App (PWA)</strong> e interfaz responsiva para ser operada de forma complementaria entre el teléfono (en obra) y la computadora (en oficina).
                </p>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-blue-900 space-y-2">
                  <h4 className="font-bold text-sm">A. Cómo abrir en tu Celular (Android o iOS)</h4>
                  <p className="text-xs leading-relaxed">
                    1. En la barra superior de la computadora haz clic en <strong>&quot;Móvil &amp; PC&quot;</strong>.<br />
                    2. Escanea el código QR proyectado con la cámara de tu teléfono móvil o copia el enlace directo.<br />
                    3. La aplicación se abrirá al instante en tu navegador móvil sin pasar por tiendas de aplicaciones.
                  </p>
                </div>

                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded text-emerald-900 space-y-2">
                  <h4 className="font-bold text-sm">B. Instalar en el Celular (App de pantalla completa y Offline)</h4>
                  <p className="text-xs leading-relaxed">
                    • <strong>Android / Chrome / Edge:</strong> Aparece el botón <strong>&quot;Instalar App&quot;</strong> en la barra superior. Al tocarlo se añade el ícono de Relevamiento Arquitectónico a tu pantalla de inicio.<br />
                    • <strong>iPhone / iPad (Safari):</strong> Toca el botón <em>Compartir</em> (ícono de cuadro con flecha) y selecciona <em>&quot;Agregar a inicio&quot;</em>.<br />
                    • <strong>Ventaja clave:</strong> Podrás realizar levantamientos en sótanos, zonas rurales o sitios sin señal ni internet, tomando fotos directas con la cámara del celular.
                  </p>
                </div>

                <div className="bg-slate-100 p-4 rounded border border-slate-200 space-y-2">
                  <h4 className="font-bold text-sm text-slate-800">C. Cómo transferir los datos del Celular a la PC</h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Una vez concluido el relevamiento en campo con el teléfono:<br />
                    1. En el móvil toca <strong>&quot;Móvil &amp; PC&quot; &gt; &quot;2. Traspasar Datos entre Equipos&quot;</strong>.<br />
                    2. Pulsa <strong>&quot;Copiar código de transferencia rápida&quot;</strong> (o pulsa &quot;Descargar archivo .json&quot; y envíatelo por correo o WhatsApp).<br />
                    3. En la PC abre la misma ventana, pega el código y haz clic en <strong>&quot;Importar y Sincronizar Ambientes&quot;</strong>.<br />
                    4. ¡Listo! Todos los ambientes, fotos y mediciones quedarán cargados en la computadora para emitir los reportes consolidados o imprimir a PDF.
                  </p>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
