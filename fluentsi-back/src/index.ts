import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRouter from './routes/auth';
import { verifyToken } from './middleware/auth';
import { pool } from './db';

dotenv.config();

const app = express();

app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRouter);

// Endpoint protegido
app.get('/api/protected', verifyToken, (req, res) => {
  res.json({ message: 'This is a protected route', user: (req as any).user });
});

// Endpoint de verificación
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// ==========================================
// RUTAS DE CURSOS
// ==========================================

app.post('/api/cursos', async (req: Request, res: Response) => {
  try {
    const { titulo, descripcion, id_idioma, nivel_recomendado, es_gratuito, precio } = req.body;

    const query = `
      INSERT INTO cursos 
      (titulo, descripcion, id_idioma, nivel_recomendado, es_gratuito, precio) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      titulo,
      descripcion,
      id_idioma,
      nivel_recomendado,
      es_gratuito,
      precio || 0
    ]);

    res.status(201).json({
      mensaje: 'Curso creado con éxito',
      id_curso: (result as any).insertId
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Hubo un problema al guardar el curso en la base de datos' });
  }
});

app.get('/api/cursos', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM cursos');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener la lista de cursos' });
  }
});

app.get('/api/cursos/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const [rows]: any = await pool.execute('SELECT * FROM cursos WHERE id_curso = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el curso de la base de datos' });
  }
});

app.put('/api/cursos/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, id_idioma, nivel_recomendado, es_gratuito, precio } = req.body;

    const query = `
      UPDATE cursos 
      SET titulo = ?, descripcion = ?, id_idioma = ?, nivel_recomendado = ?, es_gratuito = ?, precio = ?
      WHERE id_curso = ?
    `;

    const [result]: any = await pool.execute(query, [
      titulo, descripcion, id_idioma, nivel_recomendado, es_gratuito, precio || 0, id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'No se encontró el curso para actualizar' });
    }

    res.json({ mensaje: '¡Curso actualizado con éxito de punta a punta!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el curso' });
  }
});

// ==========================================
// RUTAS DE LECCIONES Y EXÁMENES
// ==========================================

app.get('/api/examenes/:id/completo', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [preguntas]: any = await pool.execute('SELECT * FROM preguntas WHERE id_examen = ?', [id]);

    for (let pregunta of preguntas) {
      const [opciones]: any = await pool.execute('SELECT * FROM opciones_respuesta WHERE id_pregunta = ?', [pregunta.id_pregunta]);
      pregunta.opciones = opciones;
    }

    res.json(preguntas);
  } catch (error) {
    console.error('ERROR AL OBTENER DETALLES DEL EXAMEN:', error);
    res.status(500).json({ error: 'Error al obtener el examen' });
  }
});

app.get('/api/cursos/:id/lecciones', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute('SELECT * FROM lecciones WHERE id_curso = ? ORDER BY orden ASC', [id]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener las lecciones' });
  }
});

app.post('/api/lecciones', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id_curso, titulo, tipo_contenido, contenido, orden, preguntas } = req.body;

    if (tipo_contenido === 'Quiz') {
      const queryExamen = `INSERT INTO examenes (id_curso, titulo, orden) VALUES (?, ?, ?)`;
      const [resExamen] = await pool.execute(queryExamen, [id_curso, titulo, orden || 1]);
      const id_examen = (resExamen as any).insertId;

      const queryLeccion = `
        INSERT INTO lecciones (id_curso, titulo, tipo_contenido, contenido_html, orden) 
        VALUES (?, ?, ?, ?, ?)
      `;
      const [resLeccion] = await pool.execute(queryLeccion, [
        id_curso, titulo, tipo_contenido, id_examen.toString(), orden || 1
      ]);
      const id_leccion = (resLeccion as any).insertId;

      if (preguntas && preguntas.length > 0) {
        for (const pregunta of preguntas) {
          const queryPregunta = `INSERT INTO preguntas (id_examen, pregunta_texto) VALUES (?, ?)`;
          const [resPreg] = await pool.execute(queryPregunta, [id_examen, pregunta.pregunta_texto]);
          const id_pregunta = (resPreg as any).insertId;

          for (const opcion of pregunta.opciones) {
            const queryOpcion = `INSERT INTO opciones_respuesta (id_pregunta, opcion_texto, es_correcta) VALUES (?, ?, ?)`;
            const es_correcta_int = opcion.es_correcta ? 1 : 0;
            await pool.execute(queryOpcion, [id_pregunta, opcion.opcion_texto, es_correcta_int]);
          }
        }
      }
      return res.status(201).json({ mensaje: '¡Examen completo guardado!', id_leccion });

    } else {
      const query = `
        INSERT INTO lecciones (id_curso, titulo, tipo_contenido, contenido_html, orden) 
        VALUES (?, ?, ?, ?, ?)
      `;
      const [result] = await pool.execute(query, [
        id_curso, titulo, tipo_contenido, contenido || '', orden || 1
      ]);
      return res.status(201).json({ mensaje: '¡Lección agregada!', id_leccion: (result as any).insertId });
    }
  } catch (error) {
    console.error('ERROR SQL AL GUARDAR:', error);
    res.status(500).json({ error: 'Error al guardar en la base de datos' });
  }
});

app.put('/api/lecciones/:id_leccion', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id_leccion } = req.params;
    const { titulo, tipo_contenido, contenido, orden, preguntas } = req.body;

    if (tipo_contenido === 'Quiz') {

      const [leccionRow]: any = await pool.execute('SELECT contenido_html FROM lecciones WHERE id_leccion = ?', [id_leccion]);
      const id_examen = leccionRow[0]?.contenido_html;

      if (!id_examen) return res.status(404).json({ error: 'Examen no encontrado' });

      await pool.execute('UPDATE lecciones SET titulo = ?, orden = ? WHERE id_leccion = ?', [titulo, orden || 1, id_leccion]);
      await pool.execute('UPDATE examenes SET titulo = ?, orden = ? WHERE id_examen = ?', [titulo, orden || 1, id_examen]);

      await pool.execute('DELETE FROM preguntas WHERE id_examen = ?', [id_examen]);

      if (preguntas && preguntas.length > 0) {
        for (const pregunta of preguntas) {
          const queryPregunta = `INSERT INTO preguntas (id_examen, pregunta_texto) VALUES (?, ?)`;
          const [resPreg] = await pool.execute(queryPregunta, [id_examen, pregunta.pregunta_texto]);
          const id_pregunta = (resPreg as any).insertId;

          for (const opcion of pregunta.opciones) {
            const queryOpcion = `INSERT INTO opciones_respuesta (id_pregunta, opcion_texto, es_correcta) VALUES (?, ?, ?)`;
            const es_correcta_int = opcion.es_correcta ? 1 : 0;
            await pool.execute(queryOpcion, [id_pregunta, opcion.opcion_texto, es_correcta_int]);
          }
        }
      }
      return res.json({ mensaje: '¡Examen actualizado con éxito!' });

    } else {
      const query = `
        UPDATE lecciones 
        SET titulo = ?, tipo_contenido = ?, contenido_html = ?, orden = ?
        WHERE id_leccion = ?
      `;
      await pool.execute(query, [titulo, tipo_contenido, contenido || '', orden || 1, id_leccion]);
      return res.json({ mensaje: '¡Lección actualizada con éxito!' });
    }
  } catch (error) {
    console.error('ERROR SQL AL ACTUALIZAR LECCIÓN:', error);
    res.status(500).json({ error: 'Error al actualizar la lección' });
  }
});

// ==========================================
// RUTA PARA ELIMINAR LECCIONES (DELETE)
// ==========================================
app.delete('/api/lecciones/:id_leccion', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id_leccion } = req.params;

    const [rows]: any = await pool.execute('SELECT tipo_contenido, contenido_html FROM lecciones WHERE id_leccion = ?', [id_leccion]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lección no encontrada' });
    }

    const leccion = rows[0];

    if (leccion.tipo_contenido === 'Quiz' && leccion.contenido_html) {
      const id_examen = leccion.contenido_html;
      await pool.execute('DELETE FROM examenes WHERE id_examen = ?', [id_examen]);
    }

    await pool.execute('DELETE FROM lecciones WHERE id_leccion = ?', [id_leccion]);

    res.json({ mensaje: '¡Lección eliminada alv!' });
  } catch (error) {
    console.error('ERROR SQL AL ELIMINAR LECCIÓN:', error);
    res.status(500).json({ error: 'Error al eliminar la lección' });
  }
});

// ==========================================
// RUTAS PANEL ADMINISTRATIVO (DASHBOARD)
// ==========================================

app.get('/api/admin/dashboard/metrics', async (req: Request, res: Response): Promise<any> => {
  try {
    const [alumnos]: any = await pool.execute('SELECT COUNT(*) AS total FROM estudiantes WHERE activo = 1');

    const [instructores]: any = await pool.execute('SELECT COUNT(*) AS total FROM instructores WHERE activo = 1');

    const [grupos]: any = await pool.execute('SELECT COUNT(*) AS total FROM grupos');

    res.json({
      success: true,
      data: {
        totalAlumnos: alumnos[0].total,
        instructoresActivos: instructores[0].total,
        gruposActivos: grupos[0].total
      }
    });

  } catch (error) {
    console.error('ERROR SQL AL CARGAR MÉTRICAS DEL DASHBOARD:', error);
    res.status(500).json({ error: 'Error al obtener las métricas del dashboard administrativo' });
  }
});

// RUTAS NUEVAS PARA PROSPECTOS
app.get('/api/admin/dashboard/prospectos-recientes', async (req: Request, res: Response): Promise<any> => {
  try {
    const [prospectos]: any = await pool.execute(
      'SELECT id_prospecto, nombre, ap_paterno, telefono, estado, fecha_registro FROM prospectos ORDER BY fecha_registro DESC LIMIT 5'
    );

    res.json({
      success: true,
      data: prospectos
    });
  } catch (error) {
    console.error('ERROR SQL AL CARGAR PROSPECTOS RECIENTES:', error);
    res.status(500).json({ error: 'Error al obtener los prospectos recientes' });
  }
});

// ==========================================
// RUTAS DE ESTUDIANTES (ADMIN - para dropdowns)
// ==========================================
app.get('/api/admin/estudiantes', async (req: Request, res: Response): Promise<any> => {
  try {
    const [rows] = await pool.execute(
      'SELECT id_estudiante, nombre, ap_paterno, ap_materno, correo FROM estudiantes ORDER BY nombre ASC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('ERROR AL OBTENER ESTUDIANTES:', error);
    res.status(500).json({ error: 'Error al obtener la lista de estudiantes' });
  }
});

// ==========================================
// RUTAS DE INSTRUCTORES (ADMIN)
// ==========================================
app.get('/api/admin/instructores', async (req: Request, res: Response): Promise<any> => {
  try {
    const [rows] = await pool.execute(
      'SELECT id_instructor, nombre, ap_paterno, ap_materno, correo, num_telefono, activo, fecha_ingreso FROM instructores ORDER BY id_instructor DESC'
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('ERROR SQL AL OBTENER INSTRUCTORES:', error);
    res.status(500).json({ error: 'Error al obtener la lista de instructores' });
  }
});

app.post('/api/admin/instructores', async (req: Request, res: Response): Promise<any> => {
  try {
    const { nombre, ap_paterno, ap_materno, correo, num_telefono } = req.body;

    const query = `
      INSERT INTO instructores (nombre, ap_paterno, ap_materno, correo, num_telefono, activo)
      VALUES (?, ?, ?, ?, ?, 1)
    `;

    const [result] = await pool.execute(query, [
      nombre,
      ap_paterno,
      ap_materno || '',
      correo,
      num_telefono || ''
    ]);

    res.status(201).json({
      success: true,
      mensaje: 'Instructor creado con éxito',
      id_instructor: (result as any).insertId
    });

  } catch (error) {
    console.error('ERROR SQL AL CREAR INSTRUCTOR:', error);
    res.status(500).json({ error: 'Hubo un problema al guardar el instructor' });
  }
});

// Actualizar Instructor (Editar)
app.put('/api/admin/instructores/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { nombre, ap_paterno, ap_materno, correo, num_telefono } = req.body;

    const query = `
      UPDATE instructores
      SET nombre = ?, ap_paterno = ?, ap_materno = ?, correo = ?, num_telefono = ?
      WHERE id_instructor = ?
    `;

    await pool.execute(query, [nombre, ap_paterno, ap_materno || '', correo, num_telefono || '', id]);
    res.json({ success: true, mensaje: 'Instructor actualizado con éxito' });
  } catch (error) {
    console.error('ERROR SQL AL ACTUALIZAR:', error);
    res.status(500).json({ error: 'Error al actualizar el instructor' });
  }
});

// Eliminar Instructor
app.delete('/api/admin/instructores/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM instructores WHERE id_instructor = ?', [id]);
    res.json({ success: true, mensaje: 'Instructor eliminado' });
  } catch (error) {
    console.error('ERROR SQL AL ELIMINAR:', error);
    res.status(500).json({ error: 'Error al eliminar el instructor' });
  }
});

// ==========================================
// RUTAS DE ADMINISTRADORES (CON ROLES)
// ==========================================

app.get('/api/admin/administradores', async (req: Request, res: Response): Promise<any> => {
  try {
    // Agregamos 'privilegios' a la consulta
    const [rows] = await pool.execute(
      'SELECT id_admin, nombre, usuario AS correo, privilegios, 1 AS activo FROM administradores ORDER BY id_admin DESC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('ERROR SQL:', error);
    res.status(500).json({ error: 'Error al obtener administradores' });
  }
});

app.post('/api/admin/administradores', async (req: Request, res: Response): Promise<any> => {
  try {
    const { nombre, correo, password, privilegios } = req.body;
    // Insertamos el valor real de privilegios
    const query = `INSERT INTO administradores (nombre, ap_paterno, usuario, password, privilegios) VALUES (?, 'N/A', ?, ?, ?)`;
    const [result] = await pool.execute(query, [nombre, correo, password || '123456', privilegios]);

    res.status(201).json({ success: true, id_admin: (result as any).insertId });
  } catch (error) {
    console.error('ERROR SQL:', error);
    res.status(500).json({ error: 'Error al guardar administrador' });
  }
});

app.put('/api/admin/administradores/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { nombre, correo, privilegios } = req.body;
    // Actualizamos también los privilegios
    await pool.execute('UPDATE administradores SET nombre = ?, usuario = ?, privilegios = ? WHERE id_admin = ?', [nombre, correo, privilegios, id]);
    res.json({ success: true, mensaje: 'Admin actualizado' });
  } catch (error) {
    console.error('ERROR SQL:', error);
    res.status(500).json({ error: 'Error al actualizar administrador' });
  }
});

// El DELETE se queda exactamente igual
app.delete('/api/admin/administradores/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM administradores WHERE id_admin = ?', [id]);
    res.json({ success: true, mensaje: 'Admin eliminado' });
  } catch (error) {
    console.error('ERROR SQL:', error);
    res.status(500).json({ error: 'Error al eliminar administrador' });
  }
});

// ==========================================
// RUTAS DE INSCRIPCIONES
// ==========================================

// GET: Cursos inscritos de un estudiante (con progreso)
app.get('/api/inscripciones/:id_estudiante', async (req: Request, res: Response) => {
  try {
    const { id_estudiante } = req.params;
    const query = `
      SELECT
        ci.id_inscripcion_curso,
        ci.id_curso,
        ci.porcentaje_avance,
        ci.fecha_inscripcion,
        ci.pago_realizado,
        c.titulo,
        c.nivel_recomendado,
        c.es_gratuito,
        c.precio,
        c.descripcion
      FROM cursos_inscripciones ci
      JOIN cursos c ON ci.id_curso = c.id_curso
      WHERE ci.id_estudiante = ?
      ORDER BY ci.fecha_inscripcion DESC
    `;
    const [rows] = await pool.execute(query, [id_estudiante]);
    res.json(rows);
  } catch (error) {
    console.error('ERROR AL OBTENER INSCRIPCIONES:', error);
    res.status(500).json({ error: 'Error al obtener los cursos inscritos' });
  }
});

// POST: Inscribir a un estudiante en un curso
app.post('/api/inscripciones', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id_estudiante, id_curso } = req.body;
    if (!id_estudiante || !id_curso) {
      return res.status(400).json({ error: 'Se requiere id_estudiante e id_curso' });
    }

    // Verificar si ya está inscrito
    const [existing]: any = await pool.execute(
      'SELECT id_inscripcion_curso FROM cursos_inscripciones WHERE id_estudiante = ? AND id_curso = ?',
      [id_estudiante, id_curso]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Ya estás inscrito en este curso' });
    }

    const fechaHoy = new Date().toISOString().split('T')[0];
    const [result] = await pool.execute(
      'INSERT INTO cursos_inscripciones (id_estudiante, id_curso, pago_realizado, porcentaje_avance, fecha_inscripcion) VALUES (?, ?, 0, 0.00, ?)',
      [id_estudiante, id_curso, fechaHoy]
    );

    res.status(201).json({
      mensaje: '¡Inscripción exitosa!',
      id_inscripcion_curso: (result as any).insertId
    });
  } catch (error) {
    console.error('ERROR AL INSCRIBIR:', error);
    res.status(500).json({ error: 'Error al inscribir al estudiante' });
  }
});

// ==========================================
// RUTAS DEL PROFESOR (TEACHER)
// ==========================================

// Stats del profesor: alumnos asignados + sesiones de la semana
app.get('/api/teacher/:id/stats', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const [alumnos]: any = await pool.execute(
      'SELECT COUNT(*) AS total FROM asignaciones_instructor WHERE id_instructor = ? AND activo = 1',
      [id]
    );

    // Sesiones de esta semana
    const [sesiones]: any = await pool.execute(
      `SELECT COUNT(*) AS total FROM sesiones_clases 
       WHERE id_instructor = ? 
         AND estado = 'programada'
         AND fecha >= CURDATE()
         AND fecha < DATE_ADD(CURDATE(), INTERVAL (7 - WEEKDAY(CURDATE())) DAY)`,
      [id]
    );

    res.json({
      alumnosAsignados: alumnos[0].total,
      sesionesPendientes: sesiones[0].total
    });
  } catch (error) {
    console.error('ERROR AL OBTENER STATS DEL PROFESOR:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas del profesor' });
  }
});

// Próxima sesión del profesor
app.get('/api/teacher/:id/next-session', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const [rows]: any = await pool.execute(
      `SELECT 
         s.id_sesion, s.fecha, s.hora, s.objetivo, s.estado,
         GROUP_CONCAT(CONCAT(e.nombre, ' ', e.ap_paterno) SEPARATOR ', ') AS nombre_alumno
       FROM sesiones_clases s
       LEFT JOIN sesiones_estudiantes se ON s.id_sesion = se.id_sesion
       LEFT JOIN estudiantes e ON se.id_estudiante = e.id_estudiante
       WHERE s.id_instructor = ? AND s.estado = 'programada' AND s.fecha >= CURDATE()
       GROUP BY s.id_sesion
       ORDER BY s.fecha ASC, s.hora ASC
       LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return res.json(null);
    }

    const sesion = rows[0];
    res.json({
      ...sesion,
      nombre_alumno: sesion.nombre_alumno || 'Sin alumnos asignados'
    });
  } catch (error) {
    console.error('ERROR AL OBTENER PRÓXIMA SESIÓN:', error);
    res.status(500).json({ error: 'Error al obtener la próxima sesión' });
  }
});

// Sesiones de la semana del profesor (para la agenda)
app.get('/api/teacher/:id/sesiones', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { fecha_inicio, fecha_fin } = req.query;

    let whereExtra = '';
    const params: any[] = [id];

    if (fecha_inicio && fecha_fin) {
      whereExtra = 'AND s.fecha BETWEEN ? AND ?';
      params.push(fecha_inicio, fecha_fin);
    } else {
      // Por defecto: semana actual (Lunes a Domingo)
      whereExtra = `AND s.fecha BETWEEN 
        DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) 
        AND DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY)`;
    }

    const [rows]: any = await pool.execute(
      `SELECT 
         s.id_sesion, s.fecha, s.hora, s.objetivo, s.notas, s.estado,
         GROUP_CONCAT(CONCAT(e.nombre, ' ', e.ap_paterno) SEPARATOR ', ') AS nombre_alumno
       FROM sesiones_clases s
       LEFT JOIN sesiones_estudiantes se ON s.id_sesion = se.id_sesion
       LEFT JOIN estudiantes e ON se.id_estudiante = e.id_estudiante
       WHERE s.id_instructor = ? ${whereExtra}
       GROUP BY s.id_sesion
       ORDER BY s.fecha ASC, s.hora ASC`,
      params
    );

    const sesiones = rows.map((s: any) => ({
      ...s,
      nombre_alumno: s.nombre_alumno || 'Sin alumnos'
    }));

    res.json(sesiones);
  } catch (error) {
    console.error('ERROR AL OBTENER SESIONES DEL PROFESOR:', error);
    res.status(500).json({ error: 'Error al obtener las sesiones' });
  }
});

// ==========================================
// RUTAS DE ASIGNACIONES (ADMIN)
// ==========================================

// GET: Todas las asignaciones con info de instructor y alumno
app.get('/api/admin/asignaciones', async (req: Request, res: Response): Promise<any> => {
  try {
    const [rows] = await pool.execute(
      `SELECT 
         a.id_asignacion, a.fecha_asignacion, a.activo,
         i.id_instructor, i.nombre AS nombre_instructor, i.ap_paterno AS ap_instructor,
         e.id_estudiante, e.nombre AS nombre_alumno, e.ap_paterno AS ap_alumno, e.correo
       FROM asignaciones_instructor a
       JOIN instructores i ON a.id_instructor = i.id_instructor
       JOIN estudiantes e ON a.id_estudiante = e.id_estudiante
       WHERE a.activo = 1
       ORDER BY i.nombre ASC, e.nombre ASC`
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('ERROR AL OBTENER ASIGNACIONES:', error);
    res.status(500).json({ error: 'Error al obtener las asignaciones' });
  }
});

// GET: Alumnos de un instructor específico
app.get('/api/admin/asignaciones/instructor/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT 
         a.id_asignacion, a.fecha_asignacion,
         e.id_estudiante, e.nombre, e.ap_paterno, e.correo
       FROM asignaciones_instructor a
       JOIN estudiantes e ON a.id_estudiante = e.id_estudiante
       WHERE a.id_instructor = ? AND a.activo = 1
       ORDER BY e.nombre ASC`,
      [id]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('ERROR AL OBTENER ALUMNOS DEL INSTRUCTOR:', error);
    res.status(500).json({ error: 'Error al obtener los alumnos' });
  }
});

// POST: Asignar un alumno a un instructor
app.post('/api/admin/asignaciones', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id_instructor, id_estudiante } = req.body;

    if (!id_instructor || !id_estudiante) {
      return res.status(400).json({ error: 'Se requieren id_instructor e id_estudiante' });
    }

    // Verificar si ya existe
    const [existing]: any = await pool.execute(
      'SELECT id_asignacion FROM asignaciones_instructor WHERE id_instructor = ? AND id_estudiante = ? AND activo = 1',
      [id_instructor, id_estudiante]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Este alumno ya está asignado a este instructor' });
    }

    const [result] = await pool.execute(
      'INSERT INTO asignaciones_instructor (id_instructor, id_estudiante, fecha_asignacion, activo) VALUES (?, ?, CURDATE(), 1)',
      [id_instructor, id_estudiante]
    );

    res.status(201).json({
      success: true,
      mensaje: 'Alumno asignado con éxito',
      id_asignacion: (result as any).insertId
    });
  } catch (error) {
    console.error('ERROR AL ASIGNAR ALUMNO:', error);
    res.status(500).json({ error: 'Error al realizar la asignación' });
  }
});

// DELETE: Desasignar alumno de instructor
app.delete('/api/admin/asignaciones/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    await pool.execute('UPDATE asignaciones_instructor SET activo = 0 WHERE id_asignacion = ?', [id]);
    res.json({ success: true, mensaje: 'Asignación eliminada' });
  } catch (error) {
    console.error('ERROR AL ELIMINAR ASIGNACIÓN:', error);
    res.status(500).json({ error: 'Error al eliminar la asignación' });
  }
});

// ==========================================
// RUTAS DE SESIONES DE CLASE (ADMIN)
// ==========================================

// GET: Todas las sesiones (con listado de alumnos de cada sesión)
app.get('/api/admin/sesiones', async (req: Request, res: Response): Promise<any> => {
  try {
    const [rows] = await pool.execute(
      `SELECT 
         s.id_sesion, s.fecha, s.hora, s.objetivo, s.notas, s.estado,
         i.id_instructor, i.nombre AS nombre_instructor, i.ap_paterno AS ap_instructor,
         GROUP_CONCAT(e.id_estudiante) AS estudiantes_ids,
         GROUP_CONCAT(CONCAT(e.nombre, ' ', e.ap_paterno) SEPARATOR ', ') AS nombres_alumnos
       FROM sesiones_clases s
       JOIN instructores i ON s.id_instructor = i.id_instructor
       LEFT JOIN sesiones_estudiantes se ON s.id_sesion = se.id_sesion
       LEFT JOIN estudiantes e ON se.id_estudiante = e.id_estudiante
       GROUP BY s.id_sesion
       ORDER BY s.fecha DESC, s.hora ASC`
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('ERROR AL OBTENER SESIONES:', error);
    res.status(500).json({ error: 'Error al obtener las sesiones' });
  }
});

// POST: Crear sesión de clase (con uno o más alumnos)
app.post('/api/admin/sesiones', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id_instructor, estudiantes_ids, fecha, hora, objetivo, notas } = req.body;

    if (!id_instructor || !fecha || !hora) {
      return res.status(400).json({ error: 'Se requieren: id_instructor, fecha y hora' });
    }

    const [result]: any = await pool.execute(
      `INSERT INTO sesiones_clases (id_instructor, fecha, hora, objetivo, notas, estado)
       VALUES (?, ?, ?, ?, ?, 'programada')`,
      [id_instructor, fecha, hora, objetivo || '', notas || '']
    );

    const id_sesion = result.insertId;

    if (Array.isArray(estudiantes_ids) && estudiantes_ids.length > 0) {
      for (const id_estudiante of estudiantes_ids) {
        await pool.execute(
          `INSERT INTO sesiones_estudiantes (id_sesion, id_estudiante) VALUES (?, ?)`,
          [id_sesion, id_estudiante]
        );
      }
    }

    res.status(201).json({
      success: true,
      mensaje: 'Sesión creada con éxito',
      id_sesion
    });
  } catch (error) {
    console.error('ERROR AL CREAR SESIÓN:', error);
    res.status(500).json({ error: 'Error al crear la sesión' });
  }
});

// PUT: Editar sesión (cambiar hora, fecha, instructor, objetivo, notas, estado o agregar/quitar alumnos)
app.put('/api/admin/sesiones/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { id_instructor, estudiantes_ids, fecha, hora, objetivo, notas, estado } = req.body;

    await pool.execute(
      `UPDATE sesiones_clases 
       SET id_instructor = ?, fecha = ?, hora = ?, objetivo = ?, notas = ?, estado = ?
       WHERE id_sesion = ?`,
      [id_instructor, fecha, hora, objetivo || '', notas || '', estado || 'programada', id]
    );

    await pool.execute('DELETE FROM sesiones_estudiantes WHERE id_sesion = ?', [id]);

    if (Array.isArray(estudiantes_ids) && estudiantes_ids.length > 0) {
      for (const id_estudiante of estudiantes_ids) {
        await pool.execute(
          `INSERT INTO sesiones_estudiantes (id_sesion, id_estudiante) VALUES (?, ?)`,
          [id, id_estudiante]
        );
      }
    }

    res.json({ success: true, mensaje: 'Sesión actualizada con éxito' });
  } catch (error) {
    console.error('ERROR AL EDITAR SESIÓN:', error);
    res.status(500).json({ error: 'Error al editar la sesión' });
  }
});

// DELETE: Cancelar/eliminar sesión
app.delete('/api/admin/sesiones/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    await pool.execute("UPDATE sesiones_clases SET estado = 'cancelada' WHERE id_sesion = ?", [id]);
    res.json({ success: true, mensaje: 'Sesión cancelada' });
  } catch (error) {
    console.error('ERROR AL CANCELAR SESIÓN:', error);
    res.status(500).json({ error: 'Error al cancelar la sesión' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
