import { pool } from './config.js';

// Safe on existing databases: checks column existence before adding new metadata.
const additions = [
  ['audience_groups', "JSON NULL COMMENT 'Audience segments: student, university, working, senior, everyone'"],
  ['benefits', "JSON NULL COMMENT 'Value tags: portfolio, volunteer, certificate, wellness, entertainment'"],
];
try {
  for (const [column, definition] of additions) {
    const [[found]] = await pool.query(
      'SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      ['events', column]
    );
    if (!found.n) {
      await pool.query(`ALTER TABLE events ADD COLUMN ${column} ${definition}`);
      console.log(`Added events.${column}`);
    } else {
      console.log(`Already present: events.${column}`);
    }
  }
  const [r] = await pool.query("UPDATE events SET audience_groups = JSON_ARRAY('everyone') WHERE audience_groups IS NULL");
  await pool.query('UPDATE events SET benefits = JSON_ARRAY() WHERE benefits IS NULL');
  console.log(`V2 migration complete. Existing events retained; ${r.affectedRows} event(s) classified for everyone.`);
} catch (error) {
  console.error('V2 migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
