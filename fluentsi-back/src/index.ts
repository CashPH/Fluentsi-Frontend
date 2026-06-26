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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));