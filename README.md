# Relevamiento Arquitectónico

> **Herramienta técnica de levantamiento, diagnóstico, registro fotográfico y cuantificación de proyectos arquitectónicos.**  
> Diseñada para el **Arq. Gabriel Saritama Veira**.

[![CI Build & Test](https://github.com/saritama26/relevamiento-arquitectonico/actions/workflows/ci.yml/badge.svg)](https://github.com/saritama26/relevamiento-arquitectonico/actions)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646cff.svg?style=flat&logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![LocalForage](https://img.shields.io/badge/Storage-IndexedDB_Offline-brightgreen.svg)](https://localforage.github.io/localForage/)

---

## 📌 Características Principales

1. **Datos Globales Heredables:**
   - Proyecto, Ubicación y Bloque predeterminados que se heredan automáticamente a cada nueva ficha.
2. **Levantamiento Dimensional:**
   - Geometrías regulares (cálculo instantáneo de área en m² y perímetro en m a partir de largo y ancho).
   - Geometrías irregulares (ingreso directo de área y altura).
3. **Inventario por Secciones Especializadas:**
   - Sección 3: Elementos constructivos y acabados.
   - Sección 4: Aparatos y equipamiento.
   - Sección 5: Instalaciones eléctricas.
   - Sección 6: Instalaciones hidrosanitarias.
4. **Registro de Patologías & Traspaso Automático:**
   - Sección 7 con severidad (Leve, Moderada, Severa, Crítica) y tipos de daño.
   - Botón **"Pasar a sección 8"** para generar automáticamente actividades cuantificables.
5. **Asistente de Cuantificación Preliminar (Sección 8):**
   - Autocompleta actividades y toma cantidades medidas en las secciones previas.
6. **Registro Fotográfico con Compresión en Cliente (Sección 9):**
   - Compresión a Canvas (máx. 1400px en JPEG 70%) que evita saturar la memoria y el almacenamiento.
7. **Diagnóstico & Verificación (Secciones 10, 11 y 12):**
   - Estado general, intervención macro recomendada, justificación técnica y firmas de control.
8. **Resumen de la Ficha en Tiempo Real (Sección 13):**
   - Contadores activos de elementos constructivos, equipamiento, patologías y actividades.
9. **Modo Offline & Autoguardado con IndexedDB:**
   - Almacenamiento local mediante `localforage` que persiste sin conexión a internet y sin límites de tamaño de localStorage.
   - Autoguardado con debounce de 2.5s.
10. **Reporte Consolidado del Proyecto:**
    - Vista ejecutiva que suma todas las áreas, consolida las cantidades globales de obra y presenta el desglose ambiente por ambiente.
11. **Exportación e Importación:**
    - Exportación de planilla CSV con codificación UTF-8 para Excel / Presupuestos.
    - Exportación y restauración de respaldos completos en formato JSON (compatible con versiones v3.1 y v4).
12. **Impresión Profesional & PDF:**
    - Estilos `@media print` optimizados para A4 vertical.
    - Sustitución de cajas de texto por texto continuo para evitar cortes.
13. **Adaptabilidad Móvil & Progressive Web App (PWA):**
    - Compatible con pantallas de celulares y tablets con diseño responsive y tarjetas compactas.
    - Botón directo para tomar fotos con la cámara del dispositivo móvil (`capture="environment"`).
    - Instalable en pantalla de inicio en Android, iOS (Safari) y Windows/Mac como app nativa.
    - Funciona 100% offline gracias a Service Worker con precaché.
14. **Asociación y Sincronización PC y Móvil:**
    - Código QR interactivo en el botón **"Móvil & PC"** para abrir inmediatamente en el celular.
    - Copia de código de transferencia rápida o respaldo `.json` para traspasar datos de campo a la oficina en segundos.

---

## 🚀 Inicio Rápido en Local

### Requisitos
- [Node.js](https://nodejs.org/) v18+ o v20+
- `npm` o `pnpm` o `yarn`

### Instalación y Ejecución

```bash
# 1. Clonar el repositorio
git clone https://github.com/<tu-usuario>/relevamiento-arquitectonico.git
cd relevamiento-arquitectonico

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo
npm run dev
```

Abra su navegador en [http://localhost:3000](http://localhost:3000).

### Compilar para Producción

```bash
npm run build
```

Los archivos estáticos optimizados se generarán en la carpeta `dist/`.

---

## 🛠️ Cómo Subir este Proyecto a GitHub

Si deseas subir este proyecto a un nuevo repositorio en tu cuenta de GitHub, sigue estos pasos:

1. **Crea un nuevo repositorio en GitHub:**
   - Ve a [github.com/new](https://github.com/new)
   - Nombre sugerido: `relevamiento-arquitectonico`
   - Déjalo vacío (sin README, sin .gitignore)

2. **Ejecuta en tu terminal:**

```bash
# Inicializar git si aún no está inicializado
git init -b main

# Agregar todos los archivos
git add .

# Crear el primer commit
git commit -m "feat: Relevamiento Arquitectónico - versión completa lista para producción"

# Conectar con tu repositorio de GitHub (reemplaza con tu usuario y repo)
git remote add origin https://github.com/<TU_USUARIO>/relevamiento-arquitectonico.git

# Subir los cambios a GitHub
git push -u origin main
```

---

## 📂 Estructura del Código

```
├── .github/
│   └── workflows/
│       └── ci.yml               # Flujo de CI para GitHub Actions
├── public/                      # Archivos estáticos públicos
├── src/
│   ├── components/
│   │   ├── ConsolidatedReport.tsx # Reporte consolidado imprimible
│   │   ├── DataTable.tsx         # Tabla editable con sugerencias y orden
│   │   ├── FichaForm.tsx         # Formulario con las 13 secciones
│   │   └── ManualModal.tsx       # Manual de usuario interactivo
│   ├── constants/
│   │   └── catalogos.ts          # Catálogos base de elementos, unidades y logo
│   ├── context/
│   │   └── CatalogContext.tsx    # Contexto para catálogos ampliables
│   ├── services/
│   │   └── storage.ts            # Persistencia con IndexedDB (localforage)
│   ├── types/
│   │   └── index.ts              # Tipos TypeScript
│   ├── utils/
│   │   └── helpers.ts            # Cálculos, exportación CSV/JSON, compresión
│   ├── App.tsx                   # Componente raíz y orquestador
│   ├── index.css                 # Tailwind CSS v4 y estilos de impresión
│   └── main.tsx                  # Entrada de React
├── index.html                    # Entrada HTML con metadatos y scripts
├── metadata.json                 # Metadatos del proyecto
├── package.json                  # Dependencias y scripts
├── tsconfig.json                 # Configuración de TypeScript
└── vite.config.ts                # Configuración de Vite
```

---

## 📄 Licencia

Desarrollado para fines profesionales y académicos. Todos los derechos reservados.
