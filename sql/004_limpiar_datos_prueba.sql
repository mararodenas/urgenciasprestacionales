-- Borra el expediente y catálogo de prueba generados al testear el sistema.
delete from expedientes where numero_ee = 'EE-2026-TEST01';
delete from droga_patologia where droga_id in (select id from drogas where nombre = 'Adalimumab Test');
delete from drogas where nombre = 'Adalimumab Test';
delete from patologias where nombre = 'Artritis Reumatoidea Test';
