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
      await pool.execute(query, [ titulo, tipo_contenido, contenido || '', orden || 1, id_leccion ]);
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


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));