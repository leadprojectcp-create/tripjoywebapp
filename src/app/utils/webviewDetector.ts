/**
 * 웹뷰 환경 감지 유틸리티
 */

/**
 * 웹뷰 환경인지 감지하는 함수
 */
export const isWebView = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  
  // iOS WebView 감지
  const isIOSWebView = /iphone|ipad|ipod/.test(userAgent) && 
                      /webkit/.test(userAgent) && 
                      !/safari/.test(userAgent);
  
  // Android WebView 감지
  const isAndroidWebView = /android/.test(userAgent) && 
                          /webkit/.test(userAgent) && 
                          !/chrome/.test(userAgent);
  
  // React Native WebView 감지
  const isReactNativeWebView = /react-native/.test(userAgent);
  
  // 기타 WebView 감지
  const isOtherWebView = /wv/.test(userAgent) || 
                        /mobile/.test(userAgent) && /safari/.test(userAgent);
  
  return isIOSWebView || isAndroidWebView || isReactNativeWebView || isOtherWebView;
};

/**
 * 모바일 환경인지 감지하는 함수
 */
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /mobile|android|iphone|ipad|ipod/.test(userAgent);
};
