// Añadir esta función en functions/api/expedientes.js
export async function onRequestDelete({ request, env }) {
  try {
    const { codigo } = await request.json();
    
    if (!codigo) {
      return new Response(JSON.stringify({ error: 'Falta el código de expediente' }), { status: 400 });
    }

    await env.DB.prepare('DELETE FROM expedientes_seguimiento WHERE codigo = ?')
      .bind(codigo)
      .run();

    return new Response(JSON.stringify({ ok: true, eliminado: codigo }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}

export async function onRequestGet({ env }) {
  try {
    const query = `
      SELECT * FROM expedientes_seguimiento 
      WHERE resuelto = 0 
      ORDER BY 
        CASE prioridad 
          WHEN 'alta' THEN 1 
          WHEN 'media' THEN 2 
          WHEN 'baja' THEN 3 
        END, 
        fecha_limite ASC
    `;
    const { results } = await env.DB.prepare(query).all();
    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();
    const query = `
      INSERT INTO expedientes_seguimiento 
        (codigo, titulo, interesado, localizacion, fecha_registro, estado_bloqueo, fecha_limite, notas, prioridad, url_iternova)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(codigo) DO UPDATE SET
        titulo=excluded.titulo,
        interesado=excluded.interesado,
        localizacion=excluded.localizacion,
        estado_bloqueo=excluded.estado_bloqueo,
        fecha_limite=excluded.fecha_limite,
        notas=excluded.notas,
        prioridad=excluded.prioridad,
        url_iternova=excluded.url_iternova,
        resuelto=0,
        updated_at=CURRENT_TIMESTAMP
    `;
    
    await env.DB.prepare(query).bind(
      data.codigo,
      data.titulo || '',
      data.interesado || '',
      data.localizacion || '',
      data.fechaRegistro || '',
      data.estado_bloqueo || 'requerimiento',
      data.fecha_limite || null,
      data.notas || '',
      data.prioridad || 'media',
      data.url_iternova || null
    ).run();

    return new Response(JSON.stringify({ ok: true, codigo: data.codigo }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}

export async function onRequestPatch({ request, env }) {
  try {
    const { codigo, estado_bloqueo, resuelto } = await request.json();
    
    if (resuelto !== undefined) {
      await env.DB.prepare('UPDATE expedientes_seguimiento SET resuelto = ?, updated_at = CURRENT_TIMESTAMP WHERE codigo = ?')
        .bind(resuelto, codigo)
        .run();
    } else if (estado_bloqueo) {
      await env.DB.prepare('UPDATE expedientes_seguimiento SET estado_bloqueo = ?, updated_at = CURRENT_TIMESTAMP WHERE codigo = ?')
        .bind(estado_bloqueo, codigo)
        .run();
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
