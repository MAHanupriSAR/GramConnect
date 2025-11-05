const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const {SpeechClient} = require('@google-cloud/speech');

// Configure upload
const upload = multer({ dest: path.join(__dirname, 'uploads/') });
const app = express();
app.use(express.json());

// Initialize Google Speech client - requires GOOGLE_APPLICATION_CREDENTIALS env var
const client = new SpeechClient();

app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filename = req.file.path;
    const fileBytes = fs.readFileSync(filename).toString('base64');

    const audio = { content: fileBytes };
    const config = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: 'hi-IN'
    };
    const request = { audio, config };

    const [response] = await client.recognize(request);
    const transcription = response.results.map(r => r.alternatives[0].transcript).join('\n');

    // cleanup
    fs.unlinkSync(filename);

    res.json({ transcription });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

app.listen(3000, () => console.log('Server listening on port 3000'));
