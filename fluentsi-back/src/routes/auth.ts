import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db';

const router = Router();

router.post(
  '/register',
  body('usuario').isLength({ min: 3 }),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { usuario, password, nombre, ap_paterno, correo_recuperacion, privilegios } = req.body;
    try {
      const [rows]: any = await pool.query('SELECT id_admin FROM administradores WHERE usuario = ?', [usuario]);
      if (rows.length) return res.status(400).json({ message: 'Usuario ya existe' });

      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(password, salt);

      const result: any = await pool.query(
        'INSERT INTO administradores (nombre, ap_paterno, ap_materno, usuario, password, privilegios, correo_recuperacion) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [nombre || '', ap_paterno || '', '', usuario, hashed, privilegios || 1, correo_recuperacion || '']
      );

      const insertId = (result as any)[0]?.insertId || null;
      res.status(201).json({ id: insertId, usuario });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error del servidor' });
    }
  }
);

router.post('/login', body('usuario').exists(), body('password').exists(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { usuario, password } = req.body;
  try {
    const [rows]: any = await pool.query('SELECT id_admin, password FROM administradores WHERE usuario = ?', [usuario]);
    if (!rows.length) return res.status(400).json({ message: 'Credenciales inválidas' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Credenciales inválidas' });

    const token = jwt.sign({ id: user.id_admin, usuario }, process.env.JWT_SECRET || 'secret', { expiresIn: '2h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

router.post(
  '/student/register',
  body('nombre').notEmpty(),
  body('ap_paterno').notEmpty(),
  body('correo').isEmail(),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nombre, ap_paterno, ap_materno, correo, password } = req.body;
    try {
      const [rows]: any = await pool.query('SELECT id_estudiante FROM estudiantes WHERE correo = ?', [correo]);
      if (rows.length) return res.status(400).json({ message: 'El correo ya está registrado' });

      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(password, salt);
      const fechaIngreso = new Date().toISOString().split('T')[0];

      const result: any = await pool.query(
        'INSERT INTO estudiantes (nombre, ap_paterno, ap_materno, correo, password, fecha_ingreso) VALUES (?, ?, ?, ?, ?, ?)',
        [nombre, ap_paterno, ap_materno || '', correo, hashed, fechaIngreso]
      );

      const insertId = (result as any)[0]?.insertId || null;
      const token = jwt.sign({ id: insertId, correo, role: 'student' }, process.env.JWT_SECRET || 'secret', { expiresIn: '2h' });

      res.status(201).json({ token, userId: insertId, role: 'student', nombre, ap_paterno, message: 'Registro exitoso' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error del servidor' });
    }
  }
);

router.post(
  '/student/login',
  body('correo').isEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { correo, password } = req.body;
    try {
      const [rows]: any = await pool.query('SELECT id_estudiante, password, nombre, ap_paterno FROM estudiantes WHERE correo = ?', [correo]);
      if (!rows.length) {

        const [teacherRows]: any = await pool.query('SELECT id_instructor FROM instructores WHERE correo = ?', [correo]);
        if (teacherRows.length) {
          return res.status(400).json({ message: 'Este correo no pertenece a un estudiante.' });
        }
        return res.status(400).json({ message: 'Credenciales inválidas' });
      }

      const user = rows[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(400).json({ message: 'Credenciales inválidas' });

      const token = jwt.sign({ id: user.id_estudiante, correo, role: 'student', nombre: user.nombre, ap_paterno: user.ap_paterno }, process.env.JWT_SECRET || 'secret', { expiresIn: '2h' });
      res.json({ token, userId: user.id_estudiante, role: 'student', nombre: user.nombre, ap_paterno: user.ap_paterno });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error del servidor' });
    }
  }
);

router.post(
  '/teacher/login',
  body('correo').isEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { correo, password } = req.body;
    try {
      const [rows]: any = await pool.query('SELECT id_instructor, password, nombre FROM instructores WHERE correo = ?', [correo]);
      if (!rows.length) {

        const [studentRows]: any = await pool.query('SELECT id_estudiante FROM estudiantes WHERE correo = ?', [correo]);
        if (studentRows.length) {
          return res.status(400).json({ message: 'Este correo no pertenece a un profesor.' });
        }
        return res.status(400).json({ message: 'Credenciales inválidas' });
      }

      const user = rows[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(400).json({ message: 'Credenciales inválidas' });

      const token = jwt.sign({ id: user.id_instructor, correo, role: 'teacher', nombre: user.nombre }, process.env.JWT_SECRET || 'secret', { expiresIn: '2h' });
      res.json({ token, userId: user.id_instructor, role: 'teacher', nombre: user.nombre });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error del servidor' });
    }
  }
);

export default router;
