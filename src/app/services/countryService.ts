// REST Countries API를 사용한 국가 정보 서비스
export interface Country {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  translations?: {
    [key: string]: string | {
      official?: string;
      common?: string;
    };
  };
}

// 지원하는 7개 국가들을 우선순위로 정렬
const PRIORITY_COUNTRIES = [
  'KR', // 대한민국
  'US', // 미국
  'VN', // 베트남
  'CN', // 중국
  'JP', // 일본
  'TH', // 태국
  'PH', // 필리핀
];

let cachedCountries: Country[] | null = null;

export const getCountries = async (): Promise<Country[]> => {
  // 캐시된 데이터가 있으면 반환
  if (cachedCountries) {
    return cachedCountries;
  }

  try {
    console.log('🌍 Fetching countries from REST Countries API...');
    
    // REST Countries API 호출 (번역 정보 포함)
    const response = await fetch('https://restcountries.com/v3.1/all?fields=cca2,name,flag,translations');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 데이터 변환
    const countries: Country[] = data.map((country: any) => ({
      code: country.cca2,
      name: country.name.common,
      nativeName: (() => {
        if (!country.name.nativeName) return country.name.common;
        const nativeNameValue = Object.values(country.name.nativeName)[0] as any;
        return nativeNameValue?.common || nativeNameValue || country.name.common;
      })(),
      flag: country.flag,
      translations: country.translations || {}
    }));

    // 지원하는 7개 국가만 필터링하고 우선순위로 정렬
    const supportedCountries = countries.filter(country => 
      PRIORITY_COUNTRIES.includes(country.code)
    ).sort((a, b) => 
      PRIORITY_COUNTRIES.indexOf(a.code) - PRIORITY_COUNTRIES.indexOf(b.code)
    );

    const sortedCountries = supportedCountries;
    
    // 캐시에 저장
    cachedCountries = sortedCountries;
    
    console.log(`✅ Loaded ${sortedCountries.length} countries`);
    return sortedCountries;
    
  } catch (error) {
    console.error('Failed to fetch countries:', error);
    
    // Fallback 국가 리스트 (지원하는 7개 국가만)
    const fallbackCountries: Country[] = [
      { code: 'KR', name: '대한민국', nativeName: '대한민국', flag: '🇰🇷' },
      { code: 'US', name: 'United States', nativeName: 'United States', flag: '🇺🇸' },
      { code: 'VN', name: 'Vietnam', nativeName: 'Việt Nam', flag: '🇻🇳' },
      { code: 'CN', name: 'China', nativeName: '中国', flag: '🇨🇳' },
      { code: 'JP', name: 'Japan', nativeName: '日本', flag: '🇯🇵' },
      { code: 'TH', name: 'Thailand', nativeName: 'ประเทศไทย', flag: '🇹🇭' },
      { code: 'PH', name: 'Philippines', nativeName: 'Philippines', flag: '🇵🇭' },
    ];
    
    cachedCountries = fallbackCountries;
    console.log('⚠️ Using fallback country list');
    return fallbackCountries;
  }
};

// 국가 코드로 국가 정보 찾기
export const getCountryByCode = async (code: string): Promise<Country | null> => {
  const countries = await getCountries();
  return countries.find(country => country.code === code) || null;
};

// 언어별 국가명 가져오기
export const getCountryNameByLanguage = (country: Country, language: string): string => {
  // 언어 코드 매핑 (7개 지원 언어)
  const languageMap: { [key: string]: string } = {
    'ko': 'kor',
    'en': 'eng',
    'vi': 'vie',
    'zh': 'zho',
    'ja': 'jpn',
    'th': 'tha',
    'fil': 'eng' // 필리핀어는 영어로 fallback
  };

  const apiLanguageCode = languageMap[language];
  
  if (apiLanguageCode && country.translations && country.translations[apiLanguageCode]) {
    const translation = country.translations[apiLanguageCode];
    
    // API에서 번역이 객체 형태로 올 경우 (official, common 키를 가진 경우)
    if (typeof translation === 'object' && translation !== null) {
      const translationObj = translation as { official?: string; common?: string };
      // common을 우선으로 하고, 없으면 official 사용
      return translationObj.common || translationObj.official || country.name;
    }
    
    // 문자열로 온 경우 그대로 반환
    if (typeof translation === 'string') {
      return translation;
    }
  }
  
  // 번역이 없으면 기본 이름 반환
  return country.name;
};

// 캐시 초기화 (필요시)
export const clearCountryCache = () => {
  cachedCountries = null;
};

// 초기화시 캐시 클리어 (번역 로직 업데이트로 인해)
clearCountryCache();
