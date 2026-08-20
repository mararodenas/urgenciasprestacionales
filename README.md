# Sistema de Reclamos — Urgencias Prestacionales

Superintendencia de Servicios de Salud — Gerencia de Control Prestacional (GCP)

Sistema para que GCP cargue expedientes de reclamos de urgencias
prestacionales y genere los informes IFSOL/IFDER en Word, a partir de los
datos ya cargados. Backend en Supabase, frontend en React + Vite. Sin login
por ahora (staff interno, RLS abierto).

## Estructura

```
reclamos-pacientes/
├── sql/
│   ├── 002_schema_urgencias_prestacionales.sql   ← schema completo, ya corrido
│   └── 004_limpiar_datos_prueba.sql              ← limpieza de datos de testing
├── app/                                          ← proyecto React + Vite
│   └── src/
│       ├── components/
│       ├── lib/
│       │   ├── supabaseClient.js
│       │   ├── informeTemplates.js   ← textos fijos del informe (encabezado/cierre)
│       │   └── informeGenerator.js   ← arma y descarga el .docx
│       ├── App.jsx
│       └── main.jsx
└── README.md
```

## 1. Backend (Supabase)

Proyecto: **URGENCIAS PRESTACIONALES** (organización DA-SALUD, región São Paulo)
`https://wpfbdoedglpnvcaagcau.supabase.co`

El schema (`sql/002_schema_urgencias_prestacionales.sql`) ya está corrido sobre
el proyecto. Si necesitás recrearlo desde cero en otro proyecto, ejecutalo en
el SQL Editor de Supabase.

## 2. Frontend

```bash
cd app
npm install
cp .env.example .env
```

Completá `.env` con la URL y la anon key del proyecto (Project Settings → API),
después:

```bash
npm run dev       # desarrollo
npm run build     # build de producción (queda en app/dist/)
```

## Qué incluye

- **Expedientes**: alta con N° EE, fechas (ingreso/límite/cierre), datos del
  afiliado, patología, una o varias drogas solicitadas, y Obra Social/EMP.
  Listado con alerta visual de fecha límite ("Vence en Xd" / "Vencido hace
  Xd").
- **Catálogo droga + patología**: cada combinación guarda su texto de
  fundamentación (indicaciones médicas / mecanismo de acción), reusable —
  se autocompleta la próxima vez que aparece esa misma combinación.
- **Obras Sociales / EMP**: ficha con los 3 bloques de contacto (Dirección
  General, Auditoría Médica, contacto adicional).
- **Informes IFSOL / IFDER**: se generan en Word (.docx) a partir de los
  datos ya cargados del expediente. El texto fijo (encabezado, marco legal,
  cierre) está en `app/src/lib/informeTemplates.js` — conviene ajustarlo a
  la redacción oficial exacta antes de emitir informes reales.
- **Adjuntos**: evidencia (mails enviados/recibidos) subida a Supabase
  Storage, bucket `adjuntos`.

## Seguridad

RLS está habilitado pero con políticas abiertas — cualquiera con la `anon
key` puede leer y escribir. Es razonable mientras el sistema no tenga login
y no esté expuesto en una URL pública. Si más adelante se suma
autenticación, hay que reemplazar las políticas por unas que validen
`auth.uid()`.
