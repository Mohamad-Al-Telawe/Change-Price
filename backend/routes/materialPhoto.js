const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pipeline } = require('stream/promises');
const { google } = require('googleapis');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

const MAX_CODE_LENGTH = 50;
const EXTS = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 10 * 60 * 1000;

const cacheDir = () => process.env.PHOTO_CACHE_DIR || path.join(__dirname, '../photo-cache');
const hashOf = (code) => crypto.createHash('sha1').update(code).digest('hex');
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const misses = new Map();
const inflight = new Map();

let driveClient;
function getDrive() {
    if (!driveClient) {
        const auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });
        driveClient = google.drive({ version: 'v3', auth });
    }
    return driveClient;
}

async function findCached(code) {
    const base = hashOf(code);
    for (const ext of Object.keys(EXTS)) {
        const p = path.join(cacheDir(), `${base}.${ext}`);
        try {
            const st = await fs.promises.stat(p);
            if (Date.now() - st.mtimeMs < CACHE_TTL_MS) return { path: p, type: EXTS[ext] };
        } catch {
            /* غير موجود */
        }
    }
    return null;
}

async function downloadFromDrive(code) {
    
    console.log('[material_photo] code:', JSON.stringify(code));
    
    const drive = getDrive();
    const names = Object.keys(EXTS).map((e) => `name = '${esc(code)}.${e}'`).join(' or ');
    const q = `'${process.env.DRIVE_PHOTOS_FOLDER_ID}' in parents and trashed = false and (${names})`;
    
    console.log('[material_photo] q:', q);
    
    const list = await drive.files.list({
        q,
        pageSize: 1,
        fields: 'files(id,name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
    });
    const file = list.data.files && list.data.files[0];
    if (!file) return null;

    const ext = file.name.split('.').pop().toLowerCase();
    await fs.promises.mkdir(cacheDir(), { recursive: true });
    const finalPath = path.join(cacheDir(), `${hashOf(code)}.${ext}`);
    const tmpPath = `${finalPath}.${process.pid}.tmp`;

    const resp = await drive.files.get(
        { fileId: file.id, alt: 'media', supportsAllDrives: true },
        { responseType: 'stream' }
    );
    await pipeline(resp.data, fs.createWriteStream(tmpPath));
    await fs.promises.rename(tmpPath, finalPath);
    return { path: finalPath, type: EXTS[ext] };
}

// POST /api/v1/material_photo  { code }
router.post('/', async (req, res) => {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    if (!code || code.length > MAX_CODE_LENGTH) {
        return res.status(400).json({ message: 'invalid code' });
    }
    if (!process.env.DRIVE_PHOTOS_FOLDER_ID) {
        return res.status(500).json({ message: 'Photo service is not configured' });
    }

    try {
        if ((misses.get(code) || 0) > Date.now()) {
            return res.status(404).json({ message: 'Photo not found' });
        }

        let hit = await findCached(code);
        if (!hit) {
            if (!inflight.has(code)) {
                inflight.set(code, downloadFromDrive(code).finally(() => inflight.delete(code)));
            }
            hit = await inflight.get(code);
        }

        if (!hit) {
            misses.set(code, Date.now() + MISS_TTL_MS);
            return res.status(404).json({ message: 'Photo not found' });
        }

        res.set('Cache-Control', 'private, max-age=86400');
        res.type(hit.type);
        return res.sendFile(hit.path);
    } catch (err) {
        console.error('material_photo error:', err.message);
        return res.status(502).json({ message: 'Failed to fetch photo' });
    }
});

module.exports = router;