insert into categorias (nombre, tipo) values
  ('Sueldo', 'ingreso'),
  ('Préstamos', 'ingreso'),
  ('Cuotas de plataformas', 'ingreso'),
  ('Préstamos', 'egreso'),
  ('Alquiler', 'egreso'),
  ('Taxi', 'egreso'),
  ('Comida', 'egreso'),
  ('Servicios', 'egreso'),
  ('Plataformas', 'egreso'),
  ('Salud', 'egreso'),
  ('Mascota', 'egreso');

insert into categorias (nombre, tipo, padre_id)
select sub.nombre, 'egreso', c.id
from categorias c
cross join (values ('Comida'), ('Arena'), ('Chuches')) as sub (nombre)
where c.nombre = 'Mascota' and c.tipo = 'egreso' and c.padre_id is null;

-- Patrones sin tildes y en minúsculas. Una misma palabra puede apuntar a una
-- categoría de ingreso y otra de egreso (ej: netflix); el texto decide cuál.
insert into reglas (patron, categoria_id)
select r.patron, c.id
from (values
  ('ingreso', null, 'Sueldo', 'sueldo'),
  ('ingreso', null, 'Sueldo', 'salario'),
  ('ingreso', null, 'Sueldo', 'quincena'),
  ('ingreso', null, 'Préstamos', 'prestamo'),
  ('ingreso', null, 'Préstamos', 'deuda'),
  ('ingreso', null, 'Cuotas de plataformas', 'netflix'),
  ('ingreso', null, 'Cuotas de plataformas', 'hbo'),
  ('ingreso', null, 'Cuotas de plataformas', 'disney'),
  ('ingreso', null, 'Cuotas de plataformas', 'spotify'),
  ('ingreso', null, 'Cuotas de plataformas', 'prime'),
  ('ingreso', null, 'Cuotas de plataformas', 'youtube'),
  ('egreso', null, 'Préstamos', 'prestamo'),
  ('egreso', null, 'Préstamos', 'deuda'),
  ('egreso', null, 'Alquiler', 'alquiler'),
  ('egreso', null, 'Alquiler', 'renta'),
  ('egreso', null, 'Taxi', 'taxi'),
  ('egreso', null, 'Taxi', 'uber'),
  ('egreso', null, 'Taxi', 'cabify'),
  ('egreso', null, 'Taxi', 'indrive'),
  ('egreso', null, 'Taxi', 'didi'),
  ('egreso', null, 'Comida', 'comida'),
  ('egreso', null, 'Comida', 'almuerzo'),
  ('egreso', null, 'Comida', 'desayuno'),
  ('egreso', null, 'Comida', 'cena'),
  ('egreso', null, 'Comida', 'menu'),
  ('egreso', null, 'Comida', 'cafe'),
  ('egreso', null, 'Comida', 'rappi'),
  ('egreso', null, 'Comida', 'pedidosya'),
  ('egreso', null, 'Comida', 'pedidos ya'),
  ('egreso', null, 'Comida', 'minimarket'),
  ('egreso', null, 'Comida', 'tambo'),
  ('egreso', null, 'Comida', 'oxxo'),
  ('egreso', null, 'Comida', 'metro'),
  ('egreso', null, 'Comida', 'tottus'),
  ('egreso', null, 'Comida', 'plaza vea'),
  ('egreso', null, 'Comida', 'wong'),
  ('egreso', null, 'Servicios', 'luz'),
  ('egreso', null, 'Servicios', 'agua'),
  ('egreso', null, 'Servicios', 'internet'),
  ('egreso', null, 'Servicios', 'gas'),
  ('egreso', null, 'Servicios', 'celular'),
  ('egreso', null, 'Servicios', 'claro'),
  ('egreso', null, 'Servicios', 'movistar'),
  ('egreso', null, 'Servicios', 'entel'),
  ('egreso', null, 'Servicios', 'bitel'),
  ('egreso', null, 'Servicios', 'sedapal'),
  ('egreso', null, 'Servicios', 'calidda'),
  ('egreso', null, 'Servicios', 'enel'),
  ('egreso', null, 'Servicios', 'luz del sur'),
  ('egreso', null, 'Plataformas', 'netflix'),
  ('egreso', null, 'Plataformas', 'hbo'),
  ('egreso', null, 'Plataformas', 'disney'),
  ('egreso', null, 'Plataformas', 'spotify'),
  ('egreso', null, 'Plataformas', 'prime'),
  ('egreso', null, 'Plataformas', 'youtube'),
  ('egreso', null, 'Plataformas', 'icloud'),
  ('egreso', null, 'Plataformas', 'chatgpt'),
  ('egreso', null, 'Plataformas', 'claude'),
  ('egreso', null, 'Salud', 'farmacia'),
  ('egreso', null, 'Salud', 'inkafarma'),
  ('egreso', null, 'Salud', 'mifarma'),
  ('egreso', null, 'Salud', 'medico'),
  ('egreso', null, 'Salud', 'doctor'),
  ('egreso', null, 'Salud', 'clinica'),
  ('egreso', null, 'Salud', 'consulta'),
  ('egreso', null, 'Salud', 'medicina'),
  ('egreso', null, 'Salud', 'dentista'),
  ('egreso', null, 'Mascota', 'veterinaria'),
  ('egreso', null, 'Mascota', 'mascota'),
  ('egreso', 'Mascota', 'Comida', 'comida gato'),
  ('egreso', 'Mascota', 'Comida', 'comida perro'),
  ('egreso', 'Mascota', 'Comida', 'croquetas'),
  ('egreso', 'Mascota', 'Comida', 'ricocat'),
  ('egreso', 'Mascota', 'Comida', 'ricocan'),
  ('egreso', 'Mascota', 'Arena', 'arena'),
  ('egreso', 'Mascota', 'Chuches', 'chuches'),
  ('egreso', 'Mascota', 'Chuches', 'chuche')
) as r (tipo, padre, categoria, patron)
join categorias c
  on c.nombre = r.categoria
  and c.tipo = r.tipo::tipo_movimiento
left join categorias p on p.id = c.padre_id
where p.nombre is not distinct from r.padre;
