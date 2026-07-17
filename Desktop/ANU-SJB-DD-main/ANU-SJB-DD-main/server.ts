import express from 'express';
import cors from 'cors';
import path from 'path';
import nodemailer from 'nodemailer';
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

  // Email Transporter Initialization
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'anustudentjudicialbody6@gmail.com',
      pass: process.env.EMAIL_APP_PASSWORD, // Use App Password for security
    },
  });

  // API Routes
  app.post('/api/notify-summon', async (req, res) => {
    try {
      const { recipientName, recipientEmail, caseTitle, caseId } = req.body;

      if (!recipientName || !caseTitle || !recipientEmail) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // 1. Use Gemini to generate a professional judicial letter body
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Write a formal and authoritative judicial summon letter body for ${recipientName} regarding the case "${caseTitle}".
      Mention that this is a digital summon from the ANU Student Judicial Board.
      The letter should be professional, brief, and instruct them to log into the SJB DOCKET app for full details.
      Do not include headers or footers, just the main body paragraph.`;

      const aiResponse = await model.generateContent(prompt);
      const letterBody = aiResponse.response.text().trim();

      // 2. Send Official Email
      const mailOptions = {
        from: '"ANU Student Judicial Board" <anustudentjudicialbody6@gmail.com>',
        to: recipientEmail,
        subject: `📜 OFFICIAL SUMMONS: ${caseTitle.toUpperCase()}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
            <div style="background-color: #0f172a; padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 20px; letter-spacing: 2px;">ANU SJB DOCKET</h1>
              <p style="color: #10b981; margin: 4px 0 0; font-size: 10px; font-weight: bold; text-transform: uppercase;">Official Judicial Registry</p>
            </div>
            <div style="padding: 32px; background-color: #ffffff;">
              <p style="color: #64748b; font-size: 12px; margin-bottom: 24px;">Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <h2 style="color: #0f172a; font-size: 18px; margin-bottom: 16px;">Notice of Judicial Proceedings</h2>
              <div style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                ${letterBody.replace(/\n/g, '<br>')}
              </div>
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 32px;">
                <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase;">Docket Reference</p>
                <p style="margin: 4px 0 0; font-size: 16px; color: #059669; font-weight: bold;">${caseId}</p>
              </div>
              <a href="https://anu-sjb-docket.onrender.com" style="display: block; background-color: #059669; color: white; padding: 16px; text-align: center; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px;">Access Secure Docket</a>
            </div>
            <div style="padding: 24px; background-color: #f1f5f9; text-align: center; color: #94a3b8; font-size: 10px;">
              This is an automated judicial dispatch. All Nation University Student Judicial Board.
            </div>
          </div>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`Judicial Email dispatched to ${recipientEmail}`);
      } catch (emailErr) {
        console.error('Email Dispatch Error:', emailErr);
      }

      // 3. Get the recipient's FCM token from Firestore for Push Notification
      let fcmToken = null;
      try {
        const userDoc = await admin.firestore().collection('users').where('email', '==', recipientEmail).get();
        if (!userDoc.empty) {
          fcmToken = userDoc.docs[0].data().fcmToken;
        }
      } catch (dbErr) {
        console.warn('Could not fetch FCM token from DB:', dbErr);
      }

      // 4. Send Push Notification if token exists
      if (fcmToken) {
        await admin.messaging().send({
          token: fcmToken,
          notification: {
            title: '📜 OFFICIAL JUDICIAL SUMMONS',
            body: `You have been summoned regarding: ${caseTitle}. Open the app to respond.`,
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
      }

      res.json({ 
        success: true, 
        message: 'Judicial Summon dispatched via Email & Push.'
      });
    } catch (error) {
      console.error('Summons Notification Error:', error);
      res.status(500).json({ error: 'Failed to process judicial dispatch' });
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
