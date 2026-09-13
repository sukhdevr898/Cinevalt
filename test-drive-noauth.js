import { google } from 'googleapis';
async function run() {
  const drive = google.drive({ version: 'v3' });
  try {
    const res = await drive.files.list({
      q: `'1w3w4n2-3VnUeR4m9L0vT3Wv8u0qU0D8c' in parents`,
      fields: 'files(id, name, mimeType)'
    });
    console.log(res.data);
  } catch(e) {
    console.error(e.message);
  }
}
run();
