// ====================================================
// ASR Training - Google Apps Script
// הדבק קוד זה ב-script.google.com → פרויקט חדש
// ====================================================

// 1. צור גוגל שיטס חדש
// 2. העתק את ה-ID מה-URL: docs.google.com/spreadsheets/d/[ID_HERE]/edit
// 3. הדבק אותו כאן:
const SHEET_ID = '1ma9l6BZaNcnUKK7aN4Gu-rQqf5axOUij1UreRPMZjb0';

// כתובת דף התודה שלך
const THANK_YOU_URL = 'https://asr-legsprogram.com/thank-you/';

// מחרוזת סודית - אל תשנה אחרי הפריסה!
const SECRET = 'ASRShaulov2025SecretKey#RunStrong';

// ====================================================
// פונקציה ראשית - מקבלת redirect מסאמיט
// ====================================================
function doGet(e) {
  const action = e.parameter.action || '';

  if (action === 'validate') {
    return validateCode(e);
  }

  // ברירת מחדל: עיבוד רכישה מסאמיט
  return processPurchase(e);
}

// ====================================================
// עיבוד רכישה מסאמיט + הפניה לדף תודה
// ====================================================
function processPurchase(e) {
  // סאמיט שולח פרמטרים שונים - מנסים כולם
  const tid    = e.parameter.tid || e.parameter.TransactionId || e.parameter.transactionId || '';
  const name   = decodeParam(e.parameter.name || e.parameter.PayerName || e.parameter.buyerName || 'לקוח');
  const email  = decodeParam(e.parameter.email || e.parameter.PayerEmail || e.parameter.buyerEmail || '');
  const amount = e.parameter.amount || e.parameter.Total || '239';

  // יוצרים קוד ייחודי
  const seed = tid || email || Date.now().toString();
  const code = generateCode(seed);

  // שומרים בגוגל שיטס
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    // כותרות בשורה ראשונה אם השיטס ריק
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['תאריך', 'שם', 'אימייל', 'מזהה עסקה', 'קוד', 'סטטוס', 'כניסה אחרונה', 'הערות']);
      sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([
      new Date().toLocaleString('he-IL'),
      name,
      email,
      tid,
      code,
      'פעיל',
      '',
      ''
    ]);
  } catch (err) {
    Logger.log('שגיאת שיטס: ' + err);
  }

  // מפנים לדף תודה עם הקוד
  const redirect = THANK_YOU_URL
    + '?code=' + encodeURIComponent(code)
    + '&name=' + encodeURIComponent(name);

  return HtmlService.createHtmlOutput(
    '<script>window.location.href="' + redirect + '";</script>'
  );
}

// ====================================================
// אימות קוד מהאפליקציה (JSONP)
// ====================================================
function validateCode(e) {
  const code     = (e.parameter.code || '').toUpperCase().trim();
  const callback = e.parameter.callback || '';

  let result = {valid: false};

  if (code.length >= 7) {
    try {
      const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
      const data  = sheet.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        const rowCode  = (data[i][4] || '').toString().toUpperCase().trim();
        const status   = (data[i][5] || '').toString();

        if (rowCode === code) {
          if (status === 'חסום') {
            result = {valid: false, error: 'קוד חסום'};
          } else {
            // מעדכנים זמן כניסה אחרונה
            sheet.getRange(i + 1, 7).setValue(new Date().toLocaleString('he-IL'));
            result = {valid: true, name: data[i][1]};
          }
          break;
        }
      }
    } catch (err) {
      Logger.log('שגיאת אימות: ' + err);
      result = {valid: false, error: 'שגיאת מערכת'};
    }
  }

  const json = JSON.stringify(result);

  // JSONP אם נדרש (לאפליקציות web)
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

// ====================================================
// יצירת קוד ייחודי (FNV hash)
// ====================================================
function generateCode(seed) {
  const input = seed.toString() + SECRET;
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'ASR';
  let n = Math.abs(h);
  for (let i = 0; i < 5; i++) {
    code += chars[n % chars.length];
    n = Math.floor(n / chars.length);
  }
  return code; // דוגמה: ASRNP3K7Q
}

function decodeParam(str) {
  try { return decodeURIComponent(str); } catch(e) { return str; }
}
