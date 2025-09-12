// 각 앱별 딥링크 생성 유틸리티

interface Location {
  lat: number;
  lng: number;
}

interface DeepLinkOptions {
  currentLocation: Location;
  destination: Location;
  destinationName?: string;
  destinationAddress?: string;
}

export const generateDeepLinks = {
  // 애플 지도
  appleMaps: ({ currentLocation, destination, destinationName, destinationAddress }: DeepLinkOptions) => {
    // iOS 애플 지도 앱 딥링크 (현재 위치 → 목적지 좌표로 길찾기)
    const url = `maps://maps.apple.com/?saddr=${currentLocation.lat},${currentLocation.lng}&daddr=${destination.lat},${destination.lng}&dirflg=d`;
    return url;
  },

  // 구글 지도
  googleMaps: ({ currentLocation, destination, destinationName, destinationAddress }: DeepLinkOptions) => {
    // Android 구글 지도 앱 딥링크 (현재 위치 → 목적지 좌표로 길찾기)
    const url = `https://www.google.com/maps/dir/${currentLocation.lat},${currentLocation.lng}/${destination.lat},${destination.lng}`;
    return url;
  },

  // Grab
  grab: ({ currentLocation, destination, destinationName }: DeepLinkOptions) => {
    const url = `grab://open?screen=booking&action=create&pickup=${currentLocation.lat},${currentLocation.lng}&destination=${destination.lat},${destination.lng}`;
    return url;
  },

  // indrive
  indrive: ({ currentLocation, destination, destinationName }: DeepLinkOptions) => {
    const url = `indrive://order?pickup_latitude=${currentLocation.lat}&pickup_longitude=${currentLocation.lng}&dropoff_latitude=${destination.lat}&dropoff_longitude=${destination.lng}`;
    return url;
  },

  // 카카오T
  kakaoT: ({ currentLocation, destination, destinationName }: DeepLinkOptions) => {
    const url = `kakaotaxi://riderequest?startLat=${currentLocation.lat}&startLng=${currentLocation.lng}&endLat=${destination.lat}&endLng=${destination.lng}`;
    return url;
  },

  // DiDi
  didi: ({ currentLocation, destination, destinationName }: DeepLinkOptions) => {
    const url = `didi://order?fromlat=${currentLocation.lat}&fromlng=${currentLocation.lng}&tolat=${destination.lat}&tolng=${destination.lng}`;
    return url;
  },

  // GO (Bolt)
  go: ({ currentLocation, destination, destinationName }: DeepLinkOptions) => {
    const url = `bolt://setpin?client_id=order.client&pickup[latitude]=${currentLocation.lat}&pickup[longitude]=${currentLocation.lng}&destination[latitude]=${destination.lat}&destination[longitude]=${destination.lng}`;
    return url;
  }
};

export const openDeepLink = (url: string, fallbackUrl?: string) => {
  // 딥링크 시도
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.click();

  // 앱이 설치되지 않은 경우를 대비한 fallback
  if (fallbackUrl) {
    setTimeout(() => {
      window.open(fallbackUrl, '_blank');
    }, 2000);
  }
};
