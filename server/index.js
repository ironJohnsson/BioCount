import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDatabase } from './db.js';
import authRoutes from './routes/auth.js';
import specimenRoutes from './routes/specimens.js';
import presenceRoutes from './routes/presence.js';
import activityRoutes from './routes/activity.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Inicializa banco de dados (Turso ou SQLite local)
initDatabase().catch(err => {
  console.error('Falha ao inicializar banco de dados:', err);
});

// Rotas de API
app.use('/api', authRoutes);
app.use('/api/specimens', specimenRoutes);
app.use('/api/presence', presenceRoutes);
app.use('/api/activity', activityRoutes);

// Rota de Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BioCount API',
    timestamp: new Date().toISOString()
  });
});

// Servir arquivos estáticos do Vite em produção (para deploy no Render)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback SPA (compatível com Express 5)
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Inicia servidor
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🔬 Servidor BioCount ativo na porta ${PORT}`);
  console.log(`📡 URL da API: http://localhost:${PORT}/api`);
  console.log(`=========================================`);
});
