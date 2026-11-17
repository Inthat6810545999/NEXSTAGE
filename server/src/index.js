import { createApp } from './app.js';
import { pool, connectMongo } from './config.js';
import { retryPending } from './booking.js';

const port=Number(process.env.PORT||4000);
try {
  const app = createApp();
  await pool.query('SELECT 1');
  await connectMongo();
  await retryPending();
  setInterval(()=>retryPending().catch(err=>console.error('Sync retry',err.message)),30000).unref();
  app.listen(port,'127.0.0.1',()=>console.log(`NEXSTAGE API running at http://127.0.0.1:${port}`));
} catch(err) {
  console.error('API startup failed:',err.message);
  console.error('Run docker compose up -d and npm run seed first.');
  process.exitCode=1;
  await pool.end();
}
