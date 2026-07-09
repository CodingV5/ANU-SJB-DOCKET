import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import admin from 'firebase-admin';

dotenv.config();

// Initialize Firebase Admin
const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });
    console.log('✅ Firebase Admin: Initialized successfully.');
  } catch (e) {
    console.error('❌ Firebase Admin: Failed to initialize.');
    console.error(`   Looking for file at: ${serviceAccountPath}`);
    console.error('   Please ensure you have downloaded the service-account.json from Firebase Console.');
  }
}

async function startServer() {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  Warning: GEMINI_API_KEY is not set in your .env file. AI features will fail.');
  }
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  // Log incoming requests for debugging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Gemini Initialization
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  // API Routes
  app.post('/api/notify-summon', async (req, res) => {
    try {
      const { recipientName, recipientEmail, caseTitle, caseId } = req.body;

      if (!recipientName || !caseTitle || !recipientEmail) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // 1. Get the recipient's FCM token from Firestore
      let fcmToken = null;
      try {
        const userDoc = await admin.firestore().collection('users').where('email', '==', recipientEmail).get();
        if (!userDoc.empty) {
          fcmToken = userDoc.docs[0].data().fcmToken;
        }
      } catch (dbErr) {
        console.warn('Could not fetch FCM token from DB:', dbErr);
      }

      // 2. Use Gemini to generate a professional legal notice
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Generate a one-sentence urgent judicial alert for a person named ${recipientName}.
      They have been summoned for "${caseTitle}". Tell them to open the ANU SJB DOCKET app immediately.`;

      const aiResponse = await model.generateContent(prompt);
      const bodyText = aiResponse.response.text().trim();

      // 3. Send Push Notification if token exists
      if (fcmToken) {
        await admin.messaging().send({
          token: fcmToken,
          notification: {
            title: '📜 OFFICIAL JUDICIAL SUMMONS',
            body: bodyText,
          },
          data: {
            caseId: String(caseId),
            type: 'summons'
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'default',
              sound: 'default'
            }
          }
        });
        console.log(`Push notification sent to ${recipientName}`);
      } else {
        console.log(`No FCM token found for ${recipientEmail}. Logged only.`);
      }

      res.json({ 
        success: true, 
        message: fcmToken ? 'Push notification dispatched.' : 'Summon logged (user offline).',
        preview: bodyText
      });
    } catch (error) {
      console.error('Notification Error:', error);
      res.status(500).json({ error: 'Failed to process notification' });
    }
  });

  app.post('/api/summarize-case', async (req, res) => {
    try {
      const { description, title } = req.body;

      if (!description) {
        return res.status(400).json({ error: 'No description provided' });
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `You are a Senior Judicial Clerk for the ANU Student Judicial Board.
        Analyze the following student petition titled "${title}" and provide a concise "Case Brief" for the Judge.
        Format your response in three clear sections:
        1. LEGAL GROUNDS: (What rules or rights are being cited?)
        2. CORE DISPUTE: (A one-sentence summary of the conflict)
        3. EVIDENCE CITED: (List what the petitioner is claiming as proof)

        Keep the tone neutral and professional. Here is the petition: ${description}`;

      const response = await model.generateContent(prompt);
      res.json({ summary: response.response.text() });
    } catch (error) {
      console.error('AI Summary Error:', error);
      res.status(500).json({ error: 'AI failed to process the case: ' + (error instanceof Error ? error.message : String(error)) });
    }
  });

  app.post('/api/legal-assistant', async (req, res) => {
    try {
      const { message, history } = req.body;
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const chat = model.startChat({
        history: history || [],
        generationConfig: { maxOutputTokens: 500 }
      });

      const systemPrompt = `You are the ANU Student Judicial Board (SJB) AI Assistant.
      Your goal is to help students navigate the ANU judicial system procedures.

      OFFICIAL ANU PROCEDURAL STEPS:
      1. FILING: Petitioner submits a formal case with Title, Description, and Respondent Email.
      2. EVIDENCE: High-integrity digital artifacts (images/PDFs) must be attached.
      3. SUMMONS: The Board issues a digital notice to the respondent via the relay.
      4. REVIEW: The Court Clerk or Judge examines the preliminary evidence.
      5. HEARING: A formal session is scheduled via the app calendar.
      6. RESOLUTION: The Judge issues an official Directive and a downloadable Certificate.

      RULES:
      1. ONLY explain these steps.
      2. NEVER provide legal interpretations of specific case facts.
      3. If asked about the SRC Constitution, explain that it is the supreme governing document of the student body.
      4. Remain neutral and authoritative.`;

      const result = await chat.sendMessage(`${systemPrompt}\n\nUser Question: ${message}`);
      res.json({ response: result.response.text() });
    } catch (error) {
      console.error('Legal Assistant Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Assistant is currently offline.';
      res.status(500).json({ error: errorMessage });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
