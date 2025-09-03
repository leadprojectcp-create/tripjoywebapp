import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getFirebaseConfig } from '../utils/env';

// Firebase 설정 - 클라이언트 사이드에서만 실행
let firebaseConfig: any = null;

const initializeFirebaseConfig = () => {
  if (typeof window !== 'undefined' && !firebaseConfig) {
    try {
      firebaseConfig = getFirebaseConfig();
      console.log('🔧 Firebase config loaded:', firebaseConfig ? 'SUCCESS' : 'FAILED');
      if (firebaseConfig) {
        console.log('🔑 API Key exists:', !!firebaseConfig.apiKey);
        console.log('🏠 Auth Domain:', firebaseConfig.authDomain);
        console.log('📦 Project ID:', firebaseConfig.projectId);
      }
    } catch (error) {
      console.error('Firebase config initialization error:', error);
      return null;
    }
  }
  return firebaseConfig;
};

// Firebase 앱 초기화 (환경 변수가 설정된 경우에만)
let app: any;
let auth: any;
let db: any;
let storage: any;
let realtimeDb: any;

const initializeFirebase = () => {
  console.log('🚀 Firebase 초기화 시작...');
  console.log('window 존재:', typeof window !== 'undefined');
  
  if (typeof window === 'undefined') {
    console.log('❌ 서버 사이드에서는 Firebase를 초기화하지 않습니다.');
    return;
  }
  
  try {
    console.log('🔧 Firebase config 가져오는 중...');
    const config = initializeFirebaseConfig();
    
    if (!config) {
      console.error('❌ Firebase config를 가져오는데 실패했습니다.');
      auth = null;
      db = null;
      storage = null;
      realtimeDb = null;
      return;
    }
    
    console.log('✅ Firebase config 가져오기 성공');
    
    // Firebase 앱 초기화
    console.log('🔥 Firebase 앱 초기화 중...');
    app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    realtimeDb = getDatabase(app);
    
    console.log('✅ Firebase가 성공적으로 초기화되었습니다.');
    console.log('auth 상태:', !!auth);
    console.log('db 상태:', !!db);
  } catch (error) {
    console.error('❌ Firebase 초기화 실패:', error);
    auth = null;
    db = null;
    storage = null;
    realtimeDb = null;
  }
};

// 클라이언트 사이드에서만 초기화
if (typeof window !== 'undefined') {
  initializeFirebase();
}

// Firebase 서비스 export
export { app, auth, db, storage, realtimeDb };

// Firebase 초기화 상태 확인 헬퍼
export const isFirebaseInitialized = () => {
  return !!(app && auth && db);
};

// Firebase 서비스 가져오기 헬퍼 (lazy initialization)
export const getFirebaseAuth = () => {
  if (!auth && typeof window !== 'undefined') {
    initializeFirebase();
  }
  return auth;
};

export const getFirebaseDb = () => {
  if (!db && typeof window !== 'undefined') {
    initializeFirebase();
  }
  return db;
};

export const getFirebaseStorage = () => {
  if (!storage && typeof window !== 'undefined') {
    initializeFirebase();
  }
  return storage;
};

export const getFirebaseDatabase = () => {
  if (!realtimeDb && typeof window !== 'undefined') {
    initializeFirebase();
  }
  return realtimeDb;
};

// Firebase Messaging 가져오기 (브라우저 환경에서만)
export const getFirebaseMessaging = async () => {
  if (typeof window === 'undefined') {
    console.log('🚫 서버 환경에서는 Firebase Messaging을 사용할 수 없습니다.');
    return null;
  }

  try {
    // 브라우저에서 FCM 지원 여부 확인
    const supported = await isSupported();
    if (!supported) {
      console.log('🚫 현재 브라우저는 Firebase Messaging을 지원하지 않습니다.');
      return null;
    }

    // Firebase 앱 초기화 확인
    if (!app) {
      initializeFirebase();
    }

    if (!app) {
      console.error('❌ Firebase 앱이 초기화되지 않았습니다.');
      return null;
    }

    // Messaging 인스턴스 생성
    const messaging = getMessaging(app);
    console.log('✅ Firebase Messaging 초기화 완료');
    return messaging;

  } catch (error) {
    console.error('❌ Firebase Messaging 초기화 실패:', error);
    return null;
  }
};