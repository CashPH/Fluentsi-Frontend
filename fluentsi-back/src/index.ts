import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs'; 

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


app.get('/api/protected', verifyToken, (req, res) => {
  res.json({ message: 'This is a protected route', user: (req as any).user });
});


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

// ==========================================
// RUTAS CRM: PROSPECTOS Y GRUPOS DE DIFUSIÓN
// ==========================================


app.get('/api/admin/prospectos', async (req: Request, res: Response): Promise<any> => {
  try {
    const query = `
      SELECT p.*, 
             GROUP_CONCAT(g.id_grupo_difusion) as grupos_ids,
             GROUP_CONCAT(g.nombre_grupo) as grupos_nombres
      FROM prospectos p
      LEFT JOIN prospectos_grupos pg ON p.id_prospecto = pg.id_prospecto
      LEFT JOIN grupos_difusion g ON pg.id_grupo_difusion = g.id_grupo_difusion
      GROUP BY p.id_prospecto
      ORDER BY p.fecha_registro DESC
    `;
    const [rows] = await pool.execute(query);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('ERROR SQL AL OBTENER PROSPECTOS:', error);
    res.status(500).json({ error: 'Error al obtener prospectos' });
  }
});


app.get('/api/admin/grupos-difusion', async (req: Request, res: Response): Promise<any> => {
  try {
    const query = `
      SELECT g.*, COUNT(pg.id_prospecto) as total_prospectos 
      FROM grupos_difusion g
      LEFT JOIN prospectos_grupos pg ON g.id_grupo_difusion = pg.id_grupo_difusion
      GROUP BY g.id_grupo_difusion
      ORDER BY g.fecha_creacion ASC
    `;
    const [rows] = await pool.execute(query);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('ERROR SQL AL OBTENER GRUPOS:', error);
    res.status(500).json({ error: 'Error al obtener grupos' });
  }
});


app.post('/api/admin/grupos-difusion', async (req: Request, res: Response): Promise<any> => {
  try {
    const { nombre_grupo, descripcion } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO grupos_difusion (nombre_grupo, descripcion) VALUES (?, ?)',
      [nombre_grupo, descripcion || '']
    );
    res.status(201).json({ success: true, id_grupo: (result as any).insertId });
  } catch (error) {
    console.error('ERROR SQL AL CREAR GRUPO:', error);
    res.status(500).json({ error: 'Error al crear grupo' });
  }
});


app.post('/api/admin/prospectos-grupos', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id_prospecto, id_grupo_difusion } = req.body;
    
    
    const [existing]: any = await pool.execute(
      'SELECT * FROM prospectos_grupos WHERE id_prospecto = ? AND id_grupo_difusion = ?',
      [id_prospecto, id_grupo_difusion]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'El prospecto ya está en este grupo' });
    }

    await pool.execute(
      'INSERT INTO prospectos_grupos (id_prospecto, id_grupo_difusion) VALUES (?, ?)',
      [id_prospecto, id_grupo_difusion]
    );
    res.status(201).json({ success: true, mensaje: 'Prospecto agregado al grupo' });
  } catch (error) {
    console.error('ERROR SQL AL ASIGNAR GRUPO:', error);
    res.status(500).json({ error: 'Error al asignar al grupo' });
  }
});


app.post('/api/web/prospectos', async (req: Request, res: Response): Promise<any> => {
  try {
    const { nombre, ap_paterno, correo_electronico, telefono, ciudad, mensaje } = req.body;
    
    const [result]: any = await pool.execute(
      'INSERT INTO prospectos (nombre, ap_paterno, correo_electronico, telefono, ciudad, mensaje, estado) VALUES (?, ?, ?, ?, ?, ?, "Pendiente")',
      [nombre, ap_paterno, correo_electronico, telefono, ciudad, mensaje]
    );
    
    const id_prospecto = result.insertId;

    await pool.execute(
      'INSERT INTO prospectos_grupos (id_prospecto, id_grupo_difusion) VALUES (?, 1)',
      [id_prospecto]
    );

    res.status(201).json({ success: true, mensaje: 'Prospecto registrado y asignado a Nuevos' });
  } catch (error) {
    console.error('ERROR SQL AL REGISTRAR PROSPECTO:', error);
    res.status(500).json({ error: 'Error al registrar prospecto' });
  }
});


app.delete('/api/admin/grupos-difusion/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    
    
    if (id === '1') {
      return res.status(400).json({ error: 'No puedes borrar el grupo default (Nuevos)' });
    }

    await pool.execute('DELETE FROM grupos_difusion WHERE id_grupo_difusion = ?', [id]);
    res.json({ success: true, mensaje: 'Grupo eliminado con éxito' });
  } catch (error) {
    console.error('ERROR SQL AL ELIMINAR GRUPO:', error);
    res.status(500).json({ error: 'Error al eliminar el grupo' });
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
    
    const [rows] = await pool.execute(
      'SELECT id_admin, nombre, ap_paterno, ap_materno, usuario AS correo, correo_recuperacion, privilegios, 1 AS activo FROM administradores ORDER BY id_admin DESC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('ERROR SQL:', error);
    res.status(500).json({ error: 'Error al obtener administradores' });
  }
});

app.post('/api/admin/administradores', async (req: Request, res: Response): Promise<any> => {
  try {
    const { nombre, ap_paterno, ap_materno, correo, correo_recuperacion, password, privilegios } = req.body;
    
    
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password || '123456', salt);

    
    const privilegiosJSON = typeof privilegios === 'object' ? JSON.stringify(privilegios) : privilegios;

    const query = `INSERT INTO administradores (nombre, ap_paterno, ap_materno, usuario, correo_recuperacion, password, privilegios) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const [result] = await pool.execute(query, [
      nombre, 
      ap_paterno, 
      ap_materno || null, 
      correo, 
      correo_recuperacion || null, 
      hashed, 
      privilegiosJSON
    ]);

    res.status(201).json({ success: true, id_admin: (result as any).insertId });
  } catch (error) {
    console.error('ERROR SQL:', error);
    res.status(500).json({ error: 'Error al guardar administrador' });
  }
});

app.put('/api/admin/administradores/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { nombre, ap_paterno, ap_materno, correo, correo_recuperacion, privilegios, password } = req.body;
    
    
    const privilegiosJSON = typeof privilegios === 'object' ? JSON.stringify(privilegios) : privilegios;

    
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(password, salt);

      await pool.execute(
        'UPDATE administradores SET nombre = ?, ap_paterno = ?, ap_materno = ?, usuario = ?, correo_recuperacion = ?, privilegios = ?, password = ? WHERE id_admin = ?', 
        [nombre, ap_paterno, ap_materno || null, correo, correo_recuperacion || null, privilegiosJSON, hashed, id]
      );
    } else {
      
      await pool.execute(
        'UPDATE administradores SET nombre = ?, ap_paterno = ?, ap_materno = ?, usuario = ?, correo_recuperacion = ?, privilegios = ? WHERE id_admin = ?', 
        [nombre, ap_paterno, ap_materno || null, correo, correo_recuperacion || null, privilegiosJSON, id]
      );
    }
    
    res.json({ success: true, mensaje: 'Admin actualizado correctamente' });
  } catch (error) {
    console.error('ERROR SQL AL EDITAR:', error);
    res.status(500).json({ error: 'Error al actualizar administrador' });
  }
});


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


app.post('/api/inscripciones', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id_estudiante, id_curso } = req.body;
    if (!id_estudiante || !id_curso) {
      return res.status(400).json({ error: 'Se requiere id_estudiante e id_curso' });
    }

    
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


app.get('/api/teacher/:id/stats', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const [alumnos]: any = await pool.execute(
      'SELECT COUNT(*) AS total FROM asignaciones_instructor WHERE id_instructor = ? AND activo = 1',
      [id]
    );

    
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


app.post('/api/admin/asignaciones', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id_instructor, id_estudiante } = req.body;

    if (!id_instructor || !id_estudiante) {
      return res.status(400).json({ error: 'Se requieren id_instructor e id_estudiante' });
    }

    
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

// ==========================================
// RUTAS DE PROGRESO Y QUIZ INTENTOS
// ==========================================


app.get('/api/progreso/:id_inscripcion', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id_inscripcion } = req.params;
    const [rows]: any = await pool.execute(
      'SELECT id_leccion, fecha_completado FROM progreso_lecciones WHERE id_inscripcion_curso = ?',
      [id_inscripcion]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('ERROR AL OBTENER PROGRESO:', error);
    res.status(500).json({ error: 'Error al obtener el progreso' });
  }
});


app.post('/api/progreso', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id_inscripcion_curso, id_leccion } = req.body;

    if (!id_inscripcion_curso || !id_leccion) {
      return res.status(400).json({ error: 'Se requieren id_inscripcion_curso e id_leccion' });
    }

    
    const [existing]: any = await pool.execute(
      'SELECT id_progreso FROM progreso_lecciones WHERE id_inscripcion_curso = ? AND id_leccion = ?',
      [id_inscripcion_curso, id_leccion]
    );

    if (existing.length === 0) {
      await pool.execute(
        'INSERT INTO progreso_lecciones (id_inscripcion_curso, id_leccion) VALUES (?, ?)',
        [id_inscripcion_curso, id_leccion]
      );
    }

    
    const [cursoRow]: any = await pool.execute(
      `SELECT ci.id_curso 
       FROM cursos_inscripciones ci 
       WHERE ci.id_inscripcion_curso = ?`,
      [id_inscripcion_curso]
    );

    if (cursoRow.length === 0) {
      return res.status(404).json({ error: 'Inscripción no encontrada' });
    }

    const id_curso = cursoRow[0].id_curso;

    const [totalLeccionesRows]: any = await pool.execute(
      'SELECT COUNT(*) AS total FROM lecciones WHERE id_curso = ?',
      [id_curso]
    );

    const totalLecciones = totalLeccionesRows[0].total || 1;

    const [completadasRows]: any = await pool.execute(
      'SELECT COUNT(*) AS completadas FROM progreso_lecciones WHERE id_inscripcion_curso = ?',
      [id_inscripcion_curso]
    );

    const completadas = completadasRows[0].completadas;
    const porcentaje = Math.min(100, Math.round((completadas / totalLecciones) * 100 * 100) / 100);

    const fechaCompletado = porcentaje >= 100 ? new Date() : null;

    await pool.execute(
      'UPDATE cursos_inscripciones SET porcentaje_avance = ?, fecha_completado = ? WHERE id_inscripcion_curso = ?',
      [porcentaje, fechaCompletado, id_inscripcion_curso]
    );

    res.json({
      success: true,
      mensaje: 'Progreso actualizado',
      porcentaje,
      completadas,
      totalLecciones
    });

  } catch (error) {
    console.error('ERROR AL GUARDAR PROGRESO:', error);
    res.status(500).json({ error: 'Error al actualizar el progreso' });
  }
});


app.post('/api/quiz/intentos', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id_estudiante, id_examen, id_leccion, id_inscripcion_curso, respuestas_json, puntaje } = req.body;

    if (!id_estudiante || !id_examen || !id_leccion || !id_inscripcion_curso) {
      return res.status(400).json({ error: 'Faltan campos requeridos para guardar el intento' });
    }

    const respStr = typeof respuestas_json === 'object' ? JSON.stringify(respuestas_json) : respuestas_json;

    const [result]: any = await pool.execute(
      `INSERT INTO quiz_intentos 
       (id_estudiante, id_examen, id_leccion, id_inscripcion_curso, respuestas_json, puntaje)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_estudiante, id_examen, id_leccion, id_inscripcion_curso, respStr || '[]', puntaje || 0]
    );

    res.status(201).json({
      success: true,
      mensaje: 'Intento de quiz guardado exitosamente',
      id_intento: result.insertId
    });
  } catch (error) {
    console.error('ERROR AL GUARDAR INTENTO DE QUIZ:', error);
    res.status(500).json({ error: 'Error al guardar el intento de quiz' });
  }
});


app.get('/api/teacher/:id/intentos-quiz', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    
    let query = `
      SELECT 
        qi.*,
        CONCAT(e.nombre, ' ', e.ap_paterno) AS nombre_alumno,
        e.nivel_actual,
        c.titulo AS titulo_curso,
        l.titulo AS titulo_leccion,
        ex.titulo AS titulo_examen
      FROM quiz_intentos qi
      JOIN estudiantes e ON qi.id_estudiante = e.id_estudiante
      JOIN lecciones l ON qi.id_leccion = l.id_leccion
      JOIN examenes ex ON qi.id_examen = ex.id_examen
      JOIN cursos c ON l.id_curso = c.id_curso
      JOIN asignaciones_instructor ai ON ai.id_estudiante = e.id_estudiante
      WHERE ai.id_instructor = ? AND ai.activo = 1
      ORDER BY qi.fecha_intento DESC
    `;

    let [rows]: any = await pool.execute(query, [id]);

    
    if (rows.length === 0) {
      const fallbackQuery = `
        SELECT 
          qi.*,
          CONCAT(e.nombre, ' ', e.ap_paterno) AS nombre_alumno,
          e.nivel_actual,
          c.titulo AS titulo_curso,
          l.titulo AS titulo_leccion,
          ex.titulo AS titulo_examen
        FROM quiz_intentos qi
        JOIN estudiantes e ON qi.id_estudiante = e.id_estudiante
        JOIN lecciones l ON qi.id_leccion = l.id_leccion
        JOIN examenes ex ON qi.id_examen = ex.id_examen
        JOIN cursos c ON l.id_curso = c.id_curso
        ORDER BY qi.fecha_intento DESC
      `;
      [rows] = await pool.execute(fallbackQuery);
    }

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('ERROR AL OBTENER INTENTOS DE QUIZ:', error);
    res.status(500).json({ error: 'Error al obtener intentos de quiz' });
  }
});


app.put('/api/quiz/intentos/:id/feedback', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { feedback_texto } = req.body;

    await pool.execute(
      'UPDATE quiz_intentos SET feedback_texto = ? WHERE id_intento = ?',
      [feedback_texto || '', id]
    );

    res.json({ success: true, mensaje: 'Retroalimentación guardada con éxito' });
  } catch (error) {
    console.error('ERROR AL GUARDAR FEEDBACK:', error);
    res.status(500).json({ error: 'Error al guardar retroalimentación' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
