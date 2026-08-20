-- =========================================================
-- Sistema de Reclamos — Urgencias Prestacionales
-- Superintendencia de Servicios de Salud
-- =========================================================

-- ---------- ENUMS ----------

create type tipo_entidad as enum ('Obra Social', 'Empresa de Medicina Prepaga');
create type tipo_informe as enum ('IFSOL', 'IFDER');

-- ---------- FUNCIÓN COMPARTIDA PARA updated_at ----------

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------- OBRAS SOCIALES / EMP ----------

create table obras_sociales (
  id uuid primary key default gen_random_uuid(),
  tipo tipo_entidad not null,
  rnas text,
  nombre text not null,

  dg_nombre text,
  dg_cargo text,
  dg_telefono text,
  dg_movil text,
  dg_email text,
  dg_notas text,

  am_nombre text,
  am_cargo text,
  am_telefono text,
  am_movil text,
  am_email text,
  am_notas text,

  ad_nombre text,
  ad_cargo text,
  ad_telefono text,
  ad_movil text,
  ad_email text,
  ad_notas text,

  info_adicional text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_obras_sociales_nombre on obras_sociales(nombre);
create index idx_obras_sociales_rnas on obras_sociales(rnas);

create trigger trg_obras_sociales_updated_at
before update on obras_sociales
for each row execute function set_updated_at();

-- ---------- PATOLOGÍAS ----------

create table patologias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz not null default now()
);

-- ---------- DROGAS ----------

create table drogas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  nombre_comercial text,
  numero_anmat text,
  created_at timestamptz not null default now()
);

create index idx_drogas_nombre on drogas(nombre);

-- ---------- COMBINACIÓN DROGA + PATOLOGÍA ----------

create table droga_patologia (
  id uuid primary key default gen_random_uuid(),
  droga_id uuid not null references drogas(id) on delete cascade,
  patologia_id uuid not null references patologias(id) on delete cascade,
  fundamentacion_texto text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (droga_id, patologia_id)
);

create trigger trg_droga_patologia_updated_at
before update on droga_patologia
for each row execute function set_updated_at();

-- ---------- EXPEDIENTES ----------

create table expedientes (
  id uuid primary key default gen_random_uuid(),
  numero_ee text not null unique,

  fecha_ingreso date not null,
  fecha_cierre date,
  fecha_limite date,

  nombre_paciente text not null,
  telefono_paciente text,
  email_paciente text,

  patologia_id uuid references patologias(id),
  diagnostico_detalle text not null,
  resumen_hc text,

  obra_social_id uuid references obras_sociales(id),

  pasos_resolucion text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_expedientes_numero_ee on expedientes(numero_ee);
create index idx_expedientes_fecha_limite on expedientes(fecha_limite);
create index idx_expedientes_obra_social on expedientes(obra_social_id);

create trigger trg_expedientes_updated_at
before update on expedientes
for each row execute function set_updated_at();

-- ---------- MEDICACIÓN SOLICITADA POR EXPEDIENTE ----------

create table expediente_medicamentos (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references expedientes(id) on delete cascade,
  droga_id uuid not null references drogas(id),
  created_at timestamptz not null default now(),
  unique (expediente_id, droga_id)
);

-- ---------- INFORMES (IFSOL / IFDER) ----------

create table informes (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references expedientes(id) on delete cascade,
  tipo tipo_informe not null,
  fecha_generacion date not null default current_date,
  generado_por text,
  created_at timestamptz not null default now()
);

create index idx_informes_expediente on informes(expediente_id);

-- ---------- ADJUNTOS DE EVIDENCIA ----------

create table expediente_adjuntos (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references expedientes(id) on delete cascade,
  archivo_url text not null,
  nombre_archivo text not null,
  descripcion text,
  subido_por text,
  created_at timestamptz not null default now()
);

create index idx_adjuntos_expediente on expediente_adjuntos(expediente_id);

-- ---------- ROW LEVEL SECURITY ----------
-- Sin login por ahora (staff interno con la anon key). RLS abierto.

alter table obras_sociales enable row level security;
alter table patologias enable row level security;
alter table drogas enable row level security;
alter table droga_patologia enable row level security;
alter table expedientes enable row level security;
alter table expediente_medicamentos enable row level security;
alter table informes enable row level security;
alter table expediente_adjuntos enable row level security;

create policy "acceso_abierto" on obras_sociales for all using (true) with check (true);
create policy "acceso_abierto" on patologias for all using (true) with check (true);
create policy "acceso_abierto" on drogas for all using (true) with check (true);
create policy "acceso_abierto" on droga_patologia for all using (true) with check (true);
create policy "acceso_abierto" on expedientes for all using (true) with check (true);
create policy "acceso_abierto" on expediente_medicamentos for all using (true) with check (true);
create policy "acceso_abierto" on informes for all using (true) with check (true);
create policy "acceso_abierto" on expediente_adjuntos for all using (true) with check (true);

-- ---------- STORAGE BUCKET PARA ADJUNTOS ----------

insert into storage.buckets (id, name, public)
values ('adjuntos', 'adjuntos', true)
on conflict (id) do nothing;

create policy "adjuntos_acceso_abierto" on storage.objects
  for all using (bucket_id = 'adjuntos') with check (bucket_id = 'adjuntos');
