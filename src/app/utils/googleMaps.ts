// Google Maps API 키 설정
// 환경변수에서 가져옴 (반드시 .env 파일에 설정 필요)
export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Google Maps API가 로드되었는지 확인하는 타입 가드
declare global {
  interface Window {
    google: any;
  }
}

// Google Maps 스크립트 로드 함수
export const loadGoogleMapsScript = (apiKey: string, language: string = 'ko'): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 이미 로드된 경우
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    // 이미 스크립트가 추가된 경우 (로딩 중)
    const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', reject);
      return;
    }

    // 새 스크립트 추가
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=${language}`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => resolve();
    script.onerror = reject;
    
    document.head.appendChild(script);
  });
};

// Places Autocomplete 옵션
export const getAutocompleteOptions = () => ({
  types: ['establishment', 'geocode'],
  fields: ['place_id', 'name', 'formatted_address', 'geometry', 'photos']
});

// 장소 정보 타입 정의
export interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  photoUrl?: string;
}

// Google Place를 PlaceDetails로 변환
export const convertGooglePlaceToDetails = (place: any): PlaceDetails | null => {
  if (!place || !place.formatted_address) {
    return null;
  }

  return {
    placeId: place.place_id || '',
    name: place.name || '',
    address: place.formatted_address,
    lat: place.geometry?.location?.lat() || 0,
    lng: place.geometry?.location?.lng() || 0,
    photoUrl: place.photos?.[0]?.getUrl({ maxWidth: 400, maxHeight: 300 })
  };
};
