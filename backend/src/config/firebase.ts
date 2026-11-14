import { App, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging, Message } from 'firebase-admin/messaging';
import path from 'path';
import fs from 'fs';

let firebaseApp: App | null = null;

export const initFirebase = (): App | null => {
  if (firebaseApp) return firebaseApp;

  try {
    // 1. Check if SERVICE_ACCOUNT JSON is provided directly in env variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      firebaseApp = initializeApp({
        credential: cert(credentials),
        projectId: credentials.project_id || 'jenista-chits',
      });
      console.log('✅ Firebase Admin SDK initialized from env FIREBASE_SERVICE_ACCOUNT');
      return firebaseApp;
    }

    // 2. Check for local firebase-service-account.json file
    const serviceAccountPaths = [
      path.join(__dirname, 'firebase-service-account.json'),
      path.join(__dirname, '../../config/firebase-service-account.json'),
      path.join(process.cwd(), 'src/config/firebase-service-account.json'),
      path.join(process.cwd(), 'config/firebase-service-account.json'),
      path.join(process.cwd(), 'backend/src/config/firebase-service-account.json'),
    ];

    for (const p of serviceAccountPaths) {
      if (fs.existsSync(p)) {
        const fileContent = JSON.parse(fs.readFileSync(p, 'utf8'));
        firebaseApp = initializeApp({
          credential: cert(fileContent),
          projectId: fileContent.project_id || 'jenista-chits',
        });
        console.log(`✅ Firebase Admin SDK initialized from ${p}`);
        return firebaseApp;
      }
    }

    // 3. Fallback to default application credentials if available
    firebaseApp = initializeApp();
    console.log('✅ Firebase Admin SDK initialized with default application credentials');
    return firebaseApp;
  } catch (error) {
    console.warn('⚠️ Firebase Admin SDK initialization failed:', error);
    return null;
  }
};

// Initialize on module load
initFirebase();

export const getFirebaseApp = () => firebaseApp;

/**
 * Send push notification to a specific device FCM registration token
 */
export const sendPushNotification = async (
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
) => {
  const app = initFirebase();
  if (!app) {
    console.warn('Firebase not initialized; skipping push notification');
    return null;
  }

  try {
    const messaging = getMessaging(app);
    const message: Message = {
      token,
      notification: {
        title,
        body,
      },
      data: data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
    };

    const response = await messaging.send(message);
    console.log('✅ FCM message sent successfully:', response);
    return response;
  } catch (err) {
    console.error('❌ Failed to send FCM message:', err);
    throw err;
  }
};

/**
 * Send push notification to a topic (e.g. 'all_customers', 'group_JJ-1')
 */
export const sendTopicNotification = async (
  topic: string,
  title: string,
  body: string,
  data?: Record<string, string>
) => {
  const app = initFirebase();
  if (!app) {
    console.warn('Firebase not initialized; skipping topic notification');
    return null;
  }

  try {
    const messaging = getMessaging(app);
    const message: Message = {
      topic,
      notification: {
        title,
        body,
      },
      data: data || {},
    };

    const response = await messaging.send(message);
    console.log(`✅ FCM topic (${topic}) message sent successfully:`, response);
    return response;
  } catch (err) {
    console.error(`❌ Failed to send FCM topic message (${topic}):`, err);
    throw err;
  }
};
