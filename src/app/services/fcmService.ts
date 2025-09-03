/**
 * 웹에서는 FCM 토큰 발급 안함 - 앱에서만 처리
 */

/**
 * 웹뷰에서 네이티브 앱에 사용자 ID 전달
 */
export const notifyAppUserLogin = (userId: string): void => {
  console.log('📱 앱에 사용자 로그인 알림:', userId);
  
  // React Native WebView인지 확인
  if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
    console.log('📤 네이티브 앱에 사용자 ID 전달');
    (window as any).ReactNativeWebView.postMessage(JSON.stringify({
      type: 'USER_LOGIN',
      userId: userId
    }));
  } else {
    console.log('🌐 웹 브라우저 - FCM 토큰 발급 안함');
  }
};