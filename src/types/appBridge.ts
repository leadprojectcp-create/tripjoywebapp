// 앱-웹 연동 관련 타입 정의

export interface BridgeMessage {
  type: string;
  data: any;
  timestamp?: number;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

export interface LocationMessage extends BridgeMessage {
  type: 'LOCATION_UPDATE';
  data: LocationData;
}

export interface AppEnvironment {
  isApp: boolean;
  platform: 'ios' | 'android' | 'web';
  version?: string;
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

// 나중에 확장될 수 있는 메시지 타입들
export type MessageType = 
  | 'LOCATION_UPDATE'
  | 'CAMERA_REQUEST'      // 나중에 추가
  | 'FILE_UPLOAD'         // 나중에 추가
  | 'PUSH_NOTIFICATION'   // 나중에 추가
  | 'DEVICE_INFO';        // 나중에 추가

// 브릿지 이벤트 타입
export interface BridgeEvent {
  type: MessageType;
  payload: any;
  callback?: (response: any) => void;
}
