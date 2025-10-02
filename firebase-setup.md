# Firebase Setup Guide for Event Builder

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name (e.g., "patato-king-events")
4. Enable Google Analytics (optional)
5. Click "Create project"

## 2. Enable Firestore Database

1. In your Firebase project console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location for your database
5. Click "Done"

## 3. Get Firebase Configuration

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click "Web" icon (</>) to add a web app
4. Register your app with a name
5. Copy the Firebase configuration object

## 4. Update Configuration in script.js

Replace the placeholder configuration in `script.js` with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-actual-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-actual-app-id"
};
```

## 5. Uncomment Firebase Initialization

In `script.js`, uncomment these lines:

```javascript
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
```

## 6. Set Up Firestore Security Rules (Optional)

For production, update Firestore rules in the Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /events/{document} {
      allow read, write: if true; // Adjust based on your needs
    }
  }
}
```

## 7. Test the Integration

1. Open your webpage
2. Create an event
3. Click "Save Event"
4. Check your Firestore database in the Firebase Console to see if the event was saved

## Fallback to Local Storage

If Firebase is not configured, the app will automatically use browser's localStorage as a fallback. This means the app will work even without Firebase setup, but data will only be stored locally in the browser.

## Troubleshooting

- Make sure all Firebase scripts are loaded before your custom script
- Check browser console for any Firebase-related errors
- Ensure your Firebase project has Firestore enabled
- Verify that your Firebase configuration is correct
