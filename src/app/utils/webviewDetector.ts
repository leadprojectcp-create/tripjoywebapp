/**
 * 웹뷰 환경 감지 유틸리티
 */

/**
 * React Native 앱 환경인지 감지하는 함수
 */
export const isReactNativeApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // React Native WebView 객체 확인
  const hasReactNativeWebView = !!(window as any).ReactNativeWebView;
  
  // URL 파라미터로 앱 환경 확인
  const urlParams = new URLSearchParams(window.location.search);
  const isAppParam = urlParams.get('app') === 'true';
  
  // User Agent로 React Native WebView 확인
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isReactNativeWebView = /react-native/.test(userAgent);
  
  return hasReactNativeWebView || isAppParam || isReactNativeWebView;
};

/**
 * 웹뷰 환경인지 감지하는 함수
 */
export const isWebView = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  
  // React Native 앱 환경 우선 확인
  if (isReactNativeApp()) return true;
  
  // iOS WebView 감지
  const isIOSWebView = /iphone|ipad|ipod/.test(userAgent) && 
                      /webkit/.test(userAgent) && 
                      !/safari/.test(userAgent);
  
  // Android WebView 감지
  const isAndroidWebView = /android/.test(userAgent) && 
                          /webkit/.test(userAgent) && 
                          !/chrome/.test(userAgent);
  
  // 기타 WebView 감지
  const isOtherWebView = /wv/.test(userAgent) || 
                        /mobile/.test(userAgent) && /safari/.test(userAgent);
  
  return isIOSWebView || isAndroidWebView || isOtherWebView;
};

/**
 * 모바일 환경인지 감지하는 함수
 */
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /mobile|android|iphone|ipad|ipod/.test(userAgent);
};
