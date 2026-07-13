# 🏛️ ANU SJB DOCKET

**The Official Judicial Management System for All Nations University (ANU)**

ANU SJB DOCKET is a high-security, enterprise-grade digital ledger and case management platform designed for the Student Judicial Board. It streamlines the entire judicial lifecycle—from petition filing and evidence preservation to board deliberations and final directive issuance.

---

## 🌟 Key Features

### ⚖️ Judicial Case Management
- **Official Sequential IDs:** Every case is assigned a unique, immutable reference ID (e.g., `SJB/2026/001`).
- **Real-time Status Tracking:** Track cases through five stages: *Pending*, *Reviewing*, *Hearing*, *Resolved*, or *Dismissed*.
- **Judicial Audit Trail:** Permanent logging of every status change, identifying the presiding official and timestamp.

### 🛡️ Evidence & Security
- **Digital Integrity Proof:** Client-side SHA-256 hashing for all uploaded evidence to prevent tampering.
- **Role-Based Access Control (RBAC):** Strict permissions for Petitioners, Respondents, Judges, and Court Clerks.
- **Biometric Authorization:** Native Fingerprint/FaceID verification required for issuing final legal rulings on mobile devices.
- **Encrypted Storage:** All evidence artifacts (PDFs/Images) are stored in secure cloud silos.

### 🤖 Intelligent AI Assistance
- **Automated Case Briefing:** Powered by Google Gemini 1.5 Flash, providing concise legal summaries of petitions for board members.
- **Protocol Guidance:** Context-aware assistance to help users navigate university articles and board procedures.

### 📅 Board Operations
- **Digital Summons Engine:** Certified digital delivery of judicial notices with real-time push notifications.
- **Hearing Calendar:** Centralized view of all scheduled board sessions and chamber deliberations.
- **Official Documentation:** Automated generation of professional resolution certificates on official University letterhead.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion.
- **Backend:** Node.js, Express.js.
- **Mobile Integration:** Capacitor (Android).
- **Database & Auth:** Firebase (Cloud Firestore, Authentication, Storage).
- **AI Core:** Google Generative AI (Gemini 1.5 Flash).
- **PDF Engine:** jsPDF.

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- Firebase Account
- Google Gemini API Key

### Local Development
1. **Clone the repository:**
   ```bash
   git clone https://github.com/CodingV5/ANU-SJB-DOCKET.git
   cd ANU-SJB-DOCKET
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_key_here
   ```

4. **Firebase Configuration:**
   Place your `firebase-applet-config.json` and `service-account.json` in the root directory.

5. **Run the development server:**
   ```bash
   npm run dev
   ```

---

## 📱 Mobile Deployment (Android)

To sync and run the application on a physical Android device:

```bash
# Build the web assets
npm run build

# Sync to Android project
npx cap sync android

# Open in Android Studio
npx cap open android
```

---

## 🌐 Web Deployment

The project is configured for seamless deployment on **Render**. Ensure the following environment variables are set in your dashboard:
- `GEMINI_API_KEY`
- `NODE_ENV=production`

Official Live URL: [https://anu-sjb-docket.onrender.com/](https://anu-sjb-docket.onrender.com/)

---

## 📜 Privacy & Terms
By using this platform, users agree to the ANU Judicial Protocols. All data is processed in accordance with University data protection standards. Biometric data is processed locally on the user's device and never transmitted to external servers.

---

© 2024 All Nations University • Student Judicial Board
