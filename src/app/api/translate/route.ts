import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('API 요청 본문:', body);
    
    const { text, targetLanguage, autoDetect } = body;

    if (!text || !targetLanguage) {
      console.error('필수 파라미터 누락:', { text: !!text, targetLanguage });
      return NextResponse.json(
        { error: '텍스트와 대상 언어가 필요합니다.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API 키가 설정되지 않았습니다.');
      return NextResponse.json(
        { error: 'API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    console.log('번역 요청:', { 
      text: text.substring(0, 50) + '...', 
      targetLanguage, 
      autoDetect,
      apiKey: apiKey.substring(0, 10) + '...' 
    });

    // Google Cloud Translation API 요청 본문 구성
    const requestBody: any = {
      q: text,
      target: targetLanguage,
      format: 'text'
    };

    // Google Translate API는 source를 생략하면 자동 감지합니다
    // source: 'auto'는 때때로 문제를 일으킬 수 있으므로 생략
    // if (autoDetect) {
    //   requestBody.source = 'auto';
    // }

    console.log('Google Translate API 요청 본문:', requestBody);

    // Google Cloud Translation API 사용
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Translate API 오류:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        requestBody: requestBody,
        url: `https://translation.googleapis.com/language/translate/v2?key=${apiKey.substring(0, 10)}...`
      });
      
      // Google API 오류 응답을 파싱해서 더 자세한 정보 제공
      let parsedError;
      try {
        parsedError = JSON.parse(errorText);
      } catch (e) {
        parsedError = { raw: errorText };
      }
      
      return NextResponse.json(
        { 
          error: `번역 API 오류: ${response.status} ${response.statusText}`,
          details: parsedError,
          requestBody: requestBody
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('번역 응답:', data);
    
    if (!data.data || !data.data.translations || !data.data.translations[0]) {
      console.error('번역 응답 형식 오류:', data);
      return NextResponse.json(
        { error: '번역 응답 형식이 올바르지 않습니다.' },
        { status: 500 }
      );
    }

    const translatedText = data.data.translations[0].translatedText;
    return NextResponse.json({ translatedText });
  } catch (error) {
    console.error('번역 오류:', error);
    return NextResponse.json(
      { error: '번역 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
