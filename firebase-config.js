// Replace these placeholder values with your Firebase project's web app config.
// Firebase Console → Project settings → General → Your apps → Web app → SDK setup and configuration
export const firebaseConfig = {
  apiKey: "AIzaSyArGVTxHweggOqwPiEn9Wozghbo6vKpWYs",
  authDomain: "free-chat-168b2.firebaseapp.com",
  projectId: "free-chat-168b2",
  storageBucket: "free-chat-168b2.firebasestorage.app",
  messagingSenderId: "613013993168",
  appId: "1:613013993168:web:33cf6b1cd0add84223d0d5",
  measurementId: "G-1L8Q1BH6R4"
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
