Node.js server example for audio transcription

This example shows a minimal Express server that accepts an audio file upload (`/transcribe`) and uses Google Cloud Speech-to-Text to transcribe audio to Hindi (`hi-IN`).

Prerequisites
- Node.js 18+ (or compatible)
- A Google Cloud project with the Speech-to-Text API enabled
- Service account JSON credentials. Set environment variable:
  - `GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json`

Install

    cd server_example
    npm install

Run

    npm start

Usage
- POST multipart/form-data to `http://localhost:3000/transcribe` with field name `audio` containing the audio file (WebM/Opus recommended).
- Response JSON: { "transcription": "..." }

Security
- Do not expose your Google credentials to the browser. Use this server as a proxy if you need reliable, server-side transcription.

Notes
- The example sets `encoding: 'WEBM_OPUS'` and `sampleRateHertz: 48000`. Adjust config to match your audio format.
- For production, add authentication, rate-limiting, and input validation.
