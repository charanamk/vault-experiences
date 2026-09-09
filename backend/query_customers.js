const pool = require('./config/db');
(async ()=>{
  try {
    const r = await pool.query("SELECT id,email,is_guest,created_at FROM customers ORDER BY created_at DESC LIMIT 5");
    console.log(JSON.stringify(r.rows,null,2));
  } catch (e) {
    console.error('DB-QUERY-ERROR', e.message);
  } finally {
    await pool.end();
  }
})();
