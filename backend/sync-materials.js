require('dotenv').config();
const { COMPANY_DB_MAP, queryDbByKey } = require('./db');

const COMPANY = 'UAE';
const SYNC_URL = process.env.MATERIALS_SYNC_URL;
const SYNC_KEY = process.env.MATERIALS_SYNC_KEY;
const FORCE = process.argv.includes('--force');

async function main() {
  if (!SYNC_URL || !SYNC_KEY) {
    throw new Error('MATERIALS_SYNC_URL and MATERIALS_SYNC_KEY must be set');
  }
  if (!Object.prototype.hasOwnProperty.call(COMPANY_DB_MAP, COMPANY)) {
    throw new Error(`Unknown company: ${COMPANY}`);
  }

  const rows = await queryDbByKey(
    COMPANY_DB_MAP[COMPANY],
    `SELECT DISTINCT Material_code FROM material
     WHERE Material_code IS NOT NULL AND TRIM(Material_code) <> ''`
  );
  const codes = rows.map((r) => String(r.Material_code).trim());
  console.log(`[${new Date().toISOString()}] read ${codes.length} codes from ${COMPANY}`);

  const res = await fetch(SYNC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-sync-key': SYNC_KEY },
    body: JSON.stringify({ codes, force: FORCE }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`sync failed ${res.status}: ${text}`);
  console.log('sync ok:', text);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`[${new Date().toISOString()}] ${err.message}`);
    process.exit(1);
  });