/**
 * 지역/국가 관련 유틸리티 함수들
 */

export type Language = 'ko' | 'en' | 'vi' | 'zh' | 'ja' | 'th' | 'fil';

// 지원하는 7개 언어/국가
export const SUPPORTED_LANGUAGES: Language[] = ['ko', 'en', 'vi', 'zh', 'ja', 'th', 'fil'];

// 각 언어별 지도 중심점 (수도 기준)
export const COUNTRY_MAP_CENTERS: Record<Language, { lat: number; lng: number }> = {
  ko: { lat: 37.5665, lng: 126.9780 }, // 서울
  en: { lat: 51.5074, lng: -0.1278 },  // 런던
  vi: { lat: 21.0285, lng: 105.8542 }, // 하노이
  zh: { lat: 39.9042, lng: 116.4074 }, // 베이징
  ja: { lat: 35.6762, lng: 139.6503 }, // 도쿄
  th: { lat: 13.7563, lng: 100.5018 }, // 방콕
  fil: { lat: 14.5995, lng: 120.9842 } // 마닐라
};

// Google Places API 국가 제한
export const getCountryRestrictions = (language: Language | null): { country: string[] } => {
  const countryMap: Record<Language, string[]> = {
    ko: ['kr'],
    en: ['gb', 'us'],
    vi: ['vn'],
    zh: ['cn'],
    ja: ['jp'],
    th: ['th'],
    fil: ['ph']
  };

  return {
    country: language && countryMap[language] ? countryMap[language] : ['kr']
  };
};

// 현재 언어에 따른 지역 코드 반환
export const getCurrentRegionCode = (language: Language | null): string => {
  const regionMap: Record<Language, string> = {
    ko: 'KR',
    en: 'US',
    vi: 'VN', 
    zh: 'CN',
    ja: 'JP',
    th: 'TH',
    fil: 'PH'
  };
  
  return language && regionMap[language] ? regionMap[language] : 'KR';
};

// 언어별 위치 힌트 메시지
export const getLocationHintByLanguage = (language: Language | null): string => {
  const hints: Record<Language, string> = {
    ko: '위치를 검색하거나 선택해주세요',
    en: 'Search or select a location',
    vi: 'Tìm kiếm hoặc chọn địa điểm',
    zh: '搜索或选择位置',
    ja: '场所を検索または选択してください',
    th: 'ค้นหาหรือเลือกสถานที่',
    fil: 'Maghanap o pumili ng lokasyon'
  };
  
  return language && hints[language] ? hints[language] : hints.ko;
};

// 🚀 API 기반 국가 코드 조회 (하드코딩 제거)
export const getCountryCodeFromAPI = async (countryName: string): Promise<string> => {
  try {
    // GeoNames API로 국가 정보 조회
    const response = await fetch(
      `http://api.geonames.org/searchJSON?q=${encodeURIComponent(countryName)}&featureClass=A&featureCode=PCLI&maxRows=1&username=tripjoy`
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.geonames && data.geonames.length > 0) {
        const country = data.geonames[0];
        console.log(`🌍 국가 코드 API 조회: ${countryName} → ${country.countryCode}`);
        return country.countryCode; // ISO 3166-1 alpha-2 코드
      }
    }
    
    // API 실패시 기본 알고리즘
    console.warn(`⚠️ 국가 코드 API 실패, 기본 알고리즘 사용: ${countryName}`);
    return generateCountryCodeFromName(countryName);
    
  } catch (error) {
    console.error(`❌ 국가 코드 API 오류:`, error);
    return generateCountryCodeFromName(countryName);
  }
};

// 기본 국가 코드 생성 (API 실패시 대안)
const generateCountryCodeFromName = (countryName: string): string => {
  if (!countryName) return '';
  
  // 첫 2글자를 대문자로 변환
  const code = countryName.replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase();
  return code.length >= 2 ? code : code + 'X'.repeat(2 - code.length);
};

// 🚀 완전 제거됨 - API만 사용

// 🚀 API 전용 address_components 파싱 함수 (하드코딩 완전 제거)
export const parseAddressComponents = async (addressComponents: any[]): Promise<{
  city?: string;
  nationality?: string;
  cityName?: string;
  countryName?: string;
}> => {
  let cityName = '';
  let countryName = '';
  let countryShortName = '';
  let sublocality = '';
  let administrativeArea = '';
  
  // address_components에서 필요한 정보 추출
  addressComponents.forEach((component: any) => {
    const types = component.types || [];
    
    // 도시 정보 - 우선순위별로 수집
    if (types.includes('locality')) {
      cityName = component.long_name;
    } else if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
      sublocality = component.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      administrativeArea = component.long_name;
    } else if (types.includes('administrative_area_level_2') && !cityName && !sublocality) {
      cityName = component.long_name;
    }
    
    // 국가 정보
    if (types.includes('country')) {
      countryName = component.long_name;
      countryShortName = component.short_name; // ISO 3166-1 alpha-2 코드 (KR, VN 등)
    }
  });
  
  // 최적의 도시명 선택
  const finalCityName = cityName || sublocality || administrativeArea;
  
  // 🚀 완전 API 기반 코드 생성
  let nationality = countryShortName; // Google이 제공하는 ISO 코드 우선 사용
  let city = '';
  
  // 국가 코드가 없으면 API로 조회
  if (!nationality && countryName) {
    nationality = await getCountryCodeFromAPI(countryName);
  }
  
  // 도시 코드 API로 조회
  if (finalCityName && nationality) {
    city = await fetchCityCodeFromAPI(finalCityName, nationality);
  }
  
  return {
    city: city || undefined,
    nationality: nationality || undefined,
    cityName: finalCityName || undefined,
    countryName: countryName || undefined
  };
};

// 🔧 도시명에서 코드 생성하는 개선된 알고리즘 (JDE 방지 - 순수 API 기반)
const generateCityCodeFromName = (cityName: string, countryCode?: string): string => {
  if (!cityName) return '';
  
  console.log(`🔍 개선된 알고리즘으로 코드 생성: ${cityName}`);
  
  // 🚀 더 안전한 패턴들 (JDE 방지를 위해 순서 변경)
  const saferPatterns = [
    // 패턴 1: 첫 3글자 (가장 안전하고 직관적)
    cityName.substring(0, 3),
    
    // 패턴 2: 공백 기준 각 단어 첫글자 (예: "New York" → "NEW")
    cityName.split(/[\s-]+/).map(word => word.charAt(0)).join('').substring(0, 3),
    
    // 패턴 3: 첫 글자 + 마지막 2글자
    cityName.charAt(0) + cityName.slice(-2),
    
    // 패턴 4: 첫글자 + 자음 조합 (JDE 원인 - 우선순위 최하위)
    cityName.charAt(0) + cityName.slice(1).replace(/[aeiou\s-]/gi, '').substring(0, 2)
  ];
  
  // 🎯 가장 적절한 패턴 선택 (3글자, 알파벳만)
  let bestCode = '';
  
  for (const pattern of saferPatterns) {
    const cleanPattern = pattern.replace(/[^A-Za-z]/g, '').toUpperCase();
    if (cleanPattern.length >= 3) {
      bestCode = cleanPattern.substring(0, 3);
      console.log(`✅ 선택된 패턴: "${pattern}" → "${bestCode}"`);
      break;
    }
  }
  
  // 패턴이 모두 실패했을 경우 첫 3글자 강제 사용
  if (bestCode.length < 3) {
    bestCode = cityName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
  }
  
  // 3글자 맞추기 (X로 패딩)
  if (bestCode.length < 3) {
    bestCode = (bestCode + cityName.replace(/[aeiou]/gi, '')).substring(0, 3).toUpperCase();
  } else if (bestCode.length > 3) {
    bestCode = bestCode.substring(0, 3);
  }
  
  // 숫자나 특수문자 제거
  bestCode = bestCode.replace(/[^A-Z]/g, '');
  
  // 빈 자리는 X로 채우기
  while (bestCode.length < 3) {
    bestCode += 'X';
  }
  
  console.log(`🏙️ 도시 코드 생성: ${cityName} → ${bestCode}`);
  return bestCode;
};

// 🌍 다중 API 활용 - 순수 API 기반 동적 시스템 (하드코딩 제거)
export const fetchCityCodeFromAPI = async (cityName: string, countryCode: string): Promise<string> => {
  console.log(`🚀 순수 API 기반으로 도시 코드 조회: ${cityName}, ${countryCode}`);
  
  // 🎯 방법 1: GeoNames API - 공항 코드 우선 시도
  try {
    const geoNamesResponse = await fetch(
      `http://api.geonames.org/searchJSON?q=${encodeURIComponent(cityName)}&country=${countryCode}&featureClass=P&maxRows=3&username=tripjoy`
    );
    
    if (geoNamesResponse.ok) {
      const geoData = await geoNamesResponse.json();
      if (geoData.geonames && geoData.geonames.length > 0) {
        const place = geoData.geonames[0];
        
        // 공항 찾기 (반경 200km로 확장)
        const airportResponse = await fetch(
          `http://api.geonames.org/findNearbyJSON?lat=${place.lat}&lng=${place.lng}&featureCode=AIRP&radius=200&maxRows=5&username=tripjoy`
        );
        
        if (airportResponse.ok) {
          const airportData = await airportResponse.json();
          if (airportData.geonames && airportData.geonames.length > 0) {
            // 가장 가까운 주요 공항 찾기
            for (const airport of airportData.geonames) {
              const iataMatch = airport.name.match(/\(([A-Z]{3})\)/);
              if (iataMatch) {
                console.log(`✈️ GeoNames IATA 코드 발견: ${cityName} → ${iataMatch[1]}`);
                return iataMatch[1];
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️ GeoNames API 오류:`, error);
  }
  
  // 🎯 방법 2: OpenStreetMap Nominatim API (무료, 무제한)
  try {
    const nominatimResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(cityName)}&countrycodes=${countryCode.toLowerCase()}&format=json&limit=3&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'TripJoyApp/1.0' // Nominatim 요구사항
        }
      }
    );
    
    if (nominatimResponse.ok) {
      const nominatimData = await nominatimResponse.json();
      if (nominatimData && nominatimData.length > 0) {
        const place = nominatimData[0];
        
        // 위키데이터 ID 확인
        if (place.extratags?.wikidata) {
          console.log(`🌐 OSM 위키데이터 ID 발견: ${place.extratags.wikidata}`);
          // 위키데이터 API 호출로 IATA 코드 조회 가능 (추가 구현 가능)
        }
        
        // OSM place_id를 기반으로 간단한 코드 생성
        const osmCode = generateCodeFromOSMData(cityName, place);
        if (osmCode) {
          console.log(`🗺️ OSM 기반 코드 생성: ${cityName} → ${osmCode}`);
          return osmCode;
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️ Nominatim API 오류:`, error);
  }
  
  // 🎯 방법 3: REST Countries + World Bank API (국가별 주요 도시)
  try {
    const countryResponse = await fetch(
      `https://restcountries.com/v3.1/alpha/${countryCode}?fields=name,capital,altSpellings`
    );
    
    if (countryResponse.ok) {
      const countryData = await countryResponse.json();
      if (countryData && countryData.capital && countryData.capital[0]) {
        const capital = countryData.capital[0];
        
        // 수도와 일치하는지 확인
        if (cityName.toLowerCase().includes(capital.toLowerCase()) || 
            capital.toLowerCase().includes(cityName.toLowerCase())) {
          const capitalCode = generateCapitalCode(capital, countryCode);
          console.log(`🏛️ 수도 코드 생성: ${cityName} → ${capitalCode}`);
          return capitalCode;
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️ REST Countries API 오류:`, error);
  }
  
  // 🎯 최종 방법: 향상된 알고리즘 (여러 패턴 시도)
  console.log(`🤖 최종 알고리즘으로 코드 생성: ${cityName}`);
  return generateAdvancedCityCode(cityName, countryCode);
};

// OSM 데이터 기반 코드 생성
const generateCodeFromOSMData = (cityName: string, osmPlace: any): string => {
  // OSM place_id의 마지막 3자리를 문자로 변환
  if (osmPlace.place_id) {
    const id = osmPlace.place_id.toString();
    let code = '';
    
    // 숫자를 문자로 매핑
    const numToChar = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    for (let i = id.length - 3; i < id.length; i++) {
      const digit = parseInt(id[i]) || 0;
      code += numToChar[digit];
    }
    
    return code.length === 3 ? code : generateCityCodeFromName(cityName);
  }
  
  return generateCityCodeFromName(cityName);
};

// 🚫 하드코딩 매핑 제거됨 - API 기반 동적 방식으로 전환

// 수도 전용 코드 생성 (주요 수도만 - 하드코딩 최소화)
const generateCapitalCode = (capitalName: string, countryCode: string): string => {
  // 🌍 세계 주요 수도만 (공통적으로 알려진 것들만)
  const wellKnownCapitals: Record<string, string> = {
    'Seoul': 'SEL',
    'Tokyo': 'TYO', 
    'Beijing': 'BJS',
    'Bangkok': 'BKK',
    'Hanoi': 'HAN',
    'Manila': 'MNL',
    'London': 'LON',
    'Paris': 'PAR',
    'Berlin': 'BER',
    'Rome': 'ROM'
  };
  
  return wellKnownCapitals[capitalName] || generateCityCodeFromName(capitalName);
};

// 🔧 고급 도시 코드 생성 알고리즘 (JDE 방지 강화 - API 기반)
const generateAdvancedCityCode = (cityName: string, countryCode: string): string => {
  if (!cityName) return 'XXX';
  
  console.log(`🔍 [고급] 개선된 알고리즘으로 코드 생성: ${cityName} (국가: ${countryCode})`);
  
  // 🚀 안전성 우선 패턴들 (JDE 방지를 위해 순서 재배치)
  const improvedPatterns = [
    // 패턴 1: 첫 3글자 (가장 안전하고 직관적)
    cityName.substring(0, 3),
    
    // 패턴 2: 단어별 첫글자 조합 (예: "New York" → "NEW")
    cityName.split(/[\s-]+/).map(word => word.charAt(0)).join('').substring(0, 3),
    
    // 패턴 3: 첫글자 + 중간글자 + 끝글자 (균형잡힌 샘플링)
    cityName.charAt(0) + (cityName.charAt(Math.floor(cityName.length/2))) + cityName.charAt(cityName.length-1),
    
    // 패턴 4: 첫글자 + 자음 조합 (JDE 원인 - 최하위 우선순위)
    cityName.charAt(0) + cityName.slice(1).replace(/[aeiouAEIOU\s-]/g, '').substring(0, 2),
  ];
  
  // 🎯 가장 적절한 패턴 선택 (개선된 로직)
  for (const pattern of improvedPatterns) {
    const cleanPattern = pattern.replace(/[^A-Za-z]/g, '').toUpperCase();
    if (cleanPattern.length >= 3) {
      const finalCode = cleanPattern.substring(0, 3);
      console.log(`🎯 고급 알고리즘 결과: ${cityName} → ${finalCode}`);
      return finalCode;
    }
  }
  
  // 최종 대안
  const fallback = (cityName.replace(/[^A-Za-z]/g, '') + 'XXX').substring(0, 3).toUpperCase();
  console.log(`🔄 대안 코드: ${cityName} → ${fallback}`);
  return fallback;
};

// 🚀 중복 함수 제거됨 - parseAddressComponents가 이미 API 기반


