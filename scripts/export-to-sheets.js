#!/usr/bin/env node
// scripts/export-to-sheets.js
// Usage:
// GOOGLE_APPLICATION_CREDENTIALS=path/to/sa.json node scripts/export-to-sheets.js --userUid=<UID> --sheetId=<SHEET_ID>

const { google } = require('googleapis');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(a => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  });
  return args;
}

(async () => {
  try {
    const args = parseArgs();
    const userUid = args.userUid || process.env.USER_UID;
    const sheetId = args.sheetId || process.env.SHEET_ID;
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!userUid) throw new Error('Missing --userUid or USER_UID env');
    if (!sheetId) throw new Error('Missing --sheetId or SHEET_ID env');
    if (!keyPath || !fs.existsSync(keyPath)) throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS to service account JSON file path');

    // Initialize admin SDK
    const serviceAccount = require(path.resolve(keyPath));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    const db = admin.firestore();

    // Read transactions for user
    const txSnap = await db.collection('users').doc(userUid).collection('transactions').orderBy('createdAt', 'desc').get();
    const rows = [];
    rows.push(['Tanggal', 'Tipe', 'Kategori', 'Jumlah', 'Catatan', 'Deskripsi', 'Icon']);

    txSnap.forEach(doc => {
      const d = doc.data();
      const date = d.date && d.date.toDate ? d.date.toDate().toLocaleDateString('id-ID') : '';
      const type = d.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
      rows.push([date, type, d.category || '', d.amount ?? 0, d.note || '', d.description || '', d.icon || '']);
    });

    // Authorize to Sheets API
    const scopes = ['https://www.googleapis.com/auth/spreadsheets'];
    const jwtClient = new google.auth.JWT(serviceAccount.client_email, null, serviceAccount.private_key, scopes);
    await jwtClient.authorize();
    const sheets = google.sheets({ version: 'v4', auth: jwtClient });

    // Clear sheet (assume first sheet)
    await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: 'Sheet1' });

    // Append rows
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows }
    });

    // Styling: bold header, set column widths, format currency for column D
    const requests = [
      { repeatCell: { range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { textFormat: { bold: true } } }, fields: 'userEnteredFormat.textFormat.bold' } },
      { updateDimensionProperties: { range: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: 7 }, properties: { pixelSize: 120 }, fields: 'pixelSize' } },
      { repeatCell: { range: { sheetId: 0, startRowIndex: 1, startColumnIndex: 3, endColumnIndex: 4 }, cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: 'Rp#,##0' } } }, fields: 'userEnteredFormat.numberFormat' } },
    ];

    await sheets.spreadsheets.batchUpdate({ spreadsheetId: sheetId, requestBody: { requests } });

    console.log(`Exported ${rows.length - 1} transactions to sheet ${sheetId}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
