# Firebase Setup Guide for Event Builder

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name (e.g., "patato-king-events")
4. Enable Google Analytics (optional)
5. Click "Create project"

## 2. Enable Realtime Database

1. In your Firebase project console, go to "Realtime Database"
2. Click "Create Database"
3. Choose "Start in test mode" (for development)
4. Select a location for your database (should match your region)
5. Click "Done"

**Important:** This project uses Firebase Realtime Database, not Firestore!

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
    databaseURL: "https://your-project-default-rtdb.region.firebasedatabase.app",
    projectId: "your-actual-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-actual-app-id"
};
```

**Important:** Make sure to include the `databaseURL` for Realtime Database!

## 5. Firebase is Already Initialized

The Firebase initialization is already set up in `script.js`:

```javascript
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
```

## 6. Set Up Realtime Database Security Rules

**CRITICAL:** You must configure database rules for the delete functionality to work!

### For Testing (Allows all operations):
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

### For Production (More secure):
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

### To update rules:
1. Go to Firebase Console > Realtime Database > Rules
2. Replace the existing rules with one of the above
3. Click "Publish"

**Note:** The test rules above allow anyone to read/write. Use authentication rules for production!

## 7. Test the Integration

1. Open your webpage
2. Click "🔥 Test Firebase" button to verify connection and permissions
3. Create an event
4. Click "Save Event"
5. Check your Realtime Database in the Firebase Console to see if the event was saved
6. Try deleting an event to verify delete permissions work

## Fallback to Local Storage

If Firebase is not configured, the app will automatically use browser's localStorage as a fallback. This means the app will work even without Firebase setup, but data will only be stored locally in the browser.

## Troubleshooting

- Make sure all Firebase scripts are loaded before your custom script
- Check browser console for any Firebase-related errors
- Ensure your Firebase project has Firestore enabled
- Verify that your Firebase configuration is correct
