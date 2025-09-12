export interface TranslateRequest {
  text: string;
  targetLanguage: string;
}

export interface TranslateResponse {
  translatedText: string;
}

export const translateText = async (
  text: string,
  targetLanguage: string
): Promise<string> => {
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        targetLanguage,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('번역 API 응답 오류:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`번역 요청 실패: ${response.status} ${response.statusText}`);
    }

    const data: TranslateResponse = await response.json();
    return data.translatedText;
  } catch (error) {
    console.error('번역 서비스 오류:', error);
    throw error;
  }
};

// 자동 언어 감지로 번역하는 함수
export const translateTextAuto = async (
  text: string,
  targetLanguage: string
): Promise<string> => {
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        targetLanguage,
        autoDetect: true, // 자동 언어 감지 플래그
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('번역 API 응답 오류:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        requestData: { text: text.substring(0, 50) + '...', targetLanguage, autoDetect: true }
      });
      throw new Error(`번역 요청 실패: ${response.status} ${response.statusText} - ${errorData.error || errorData.details || '알 수 없는 오류'}`);
    }

    const data: TranslateResponse = await response.json();
    return data.translatedText;
  } catch (error) {
    console.error('번역 서비스 오류:', error);
    throw error;
  }
};

// 언어 코드 매핑
export const LANGUAGE_CODES = {
  ko: 'ko', // 한국어
  en: 'en', // 영어
  ja: 'ja', // 일본어
  zh: 'zh', // 중국어
  vi: 'vi', // 베트남어
  th: 'th', // 태국어
  fil: 'fil', // 필리핀어
} as const;

export type LanguageCode = keyof typeof LANGUAGE_CODES;
