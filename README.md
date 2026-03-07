🏥 Kushal Mangal – AI-Powered Medical Patient Portal
Kushal Mangal is a cloud-powered health portal that allows patients to manage their Electronic Medical Records (EMR) and interact with Kusha, a multilingual AI medical assistant, using text or voice.

🌐 Live Deployment: [https://kushal-mangal-app-vixc.vercel.app/]

✨ Core Features
Secure EMR Management: Securely store and view patient history, allergies, and uploaded clinical reports using AWS DynamoDB.

Kusha AI Assistant: A context-aware medical AI that reads the patient's EMR to provide personalized, localized medical guidance.

Multilingual Voice UI: Seamlessly talk to Kusha in major Indian languages (Hindi, Bengali, Tamil, Telugu, etc.). Powered by a pipeline of Expo AV → Groq Whisper (Speech-to-Text) → Llama 3.1 → Expo Speech (Text-to-Speech).

Instant Export: Download full consultation transcripts as .txt files to share with doctors.

Demo Mode: Built-in diverse patient profiles (e.g., Hypertension, Pregnancy) for instant UI and AI testing.

⚙️ Tech Stack
Frontend: React Native, Expo, React Native Paper, TypeScript

Backend & Auth: AWS Amplify, AWS Cognito

Database: Amazon DynamoDB (PatientRecords table)

AI Infrastructure: Groq API (whisper-large-v3-turbo, llama-3.1-8b-instant)

🚀 Quick Start & Installation
1. Clone & Install

Bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO
cd YOUR_REPO
npm install
2. Environment Setup
Create a .env file in the root directory and add your Groq API key:

Plaintext
EXPO_PUBLIC_GROQ_API_KEY=your_groq_api_key
3. Run the App

Bash
npx expo start
(Supports Web, Android, and iOS)

🔒 Security
Built with AWS Cognito authentication, environment-based API keys, and DynamoDB access controls to ensure patient data remains private and secure.
