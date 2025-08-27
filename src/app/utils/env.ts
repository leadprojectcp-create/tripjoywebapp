// 환경 변수 검증 유틸리티
export const validateFirebaseConfig = () => {
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ];

  const missingVars = requiredEnvVars.filter(
    varName => !process.env[varName] || process.env[varName]?.includes('your_') 
  );

  console.log('🔍 환경 변수 상세 확인:');
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    console.log(`${varName}: ${value ? '✅ 존재' : '❌ 누락'} (값: ${value || 'undefined'})`);
  });
  
  console.log('누락된 환경 변수:', missingVars);
  return missingVars.length === 0;
};

export const getFirebaseConfig = () => {
  console.log('🔍 환경 변수 체크:');
  console.log('NEXT_PUBLIC_FIREBASE_API_KEY:', !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
  console.log('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:', !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
  console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID:', !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  console.log('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:', !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
  console.log('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:', !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID);
  console.log('NEXT_PUBLIC_FIREBASE_APP_ID:', !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID);
  
  console.log('🔧 실제 환경 변수 값:');
  console.log('API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
  console.log('AUTH_DOMAIN:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
  console.log('PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  
  // 임시로 하드코딩된 설정 사용 (테스트용)
  console.log('🚨 임시로 하드코딩된 Firebase 설정을 사용합니다');
  
  const config = {
    apiKey: "AIzaSyB-H8XUSfkxv8Rx9Ao5Dzmckzosffju4Ds",
    authDomain: "tripjoy-d309f.firebaseapp.com",
    databaseURL: "https://tripjoy-d309f-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tripjoy-d309f",
    storageBucket: "tripjoy-d309f.firebasestorage.app",
    messagingSenderId: "485728455682",
    appId: "1:485728455682:web:d45d02a922d04ce4d5eb1b",
    measurementId: "G-SE307WBRGW"
  };
  
  console.log('✅ Firebase 설정이 완료되었습니다 (하드코딩).');
  return config;
};

// 환경 확인
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';
