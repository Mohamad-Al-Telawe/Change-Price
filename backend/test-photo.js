require('dotenv').config();
const { google } = require('googleapis');

const code = process.argv[2];
if (!code) {
  console.log('usage: node test-photo.js <code>');
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});
const drive = google.drive({ version: 'v3', auth });
const FOLDER = process.env.DRIVE_PHOTOS_FOLDER_ID;
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

async function list(label, q) {
  console.log('\n---', label);
  console.log('q =', q);
  try {
    const r = await drive.files.list({
      q,
      pageSize: 10,
      fields: 'files(id,name,mimeType,parents)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    if (!r.data.files.length) console.log('(لا نتائج)');
    r.data.files.forEach((f) => console.log(f.name, '|', f.mimeType, '|', f.parents));
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}

(async () => {
  console.log('code =', JSON.stringify(code), '| FOLDER =', FOLDER);

  try {
    const f = await drive.files.get({ fileId: FOLDER, fields: 'id,name,mimeType', supportsAllDrives: true });
    console.log('المجلد:', f.data.name, '|', f.data.mimeType);
  } catch (e) {
    console.log('لا يمكن الوصول للمجلد:', e.message);
    return;
  }

  await list('أول 10 ملفات في المجلد', `'${FOLDER}' in parents and trashed=false`);
  await list('name contains داخل المجلد', `name contains '${esc(code)}' and '${FOLDER}' in parents and trashed=false`);
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    await list(`مطابقة تامة .${ext}`, `name = '${esc(code)}.${ext}' and '${FOLDER}' in parents and trashed=false`);
  }
  await list('name contains في كل Drive (بدون تحديد المجلد)', `name contains '${esc(code)}' and trashed=false`);
})();