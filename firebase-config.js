// Replace these placeholder values with your Firebase project's web app config.
// Firebase Console → Project settings → General → Your apps → Web app → SDK setup and configuration
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firestore security rules to set in Firebase Console (Firestore → Rules):
//
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /config/{docId} {
//       allow read: if true;
//       allow write: if true; // tighten this later (e.g. with an admin check) once you add auth
//     }
//     match /rooms/{roomId}/messages/{msgId} {
//       allow read: if true;
//       allow create: if true;
//       allow update, delete: if false;
//     }
//   }
// }
