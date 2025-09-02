'use client';

import { 
  ref, 
  push, 
  set, 
  onValue, 
  off, 
  query, 
  orderByChild, 
  limitToLast,
  serverTimestamp,
  get,
  update,
  remove
} from 'firebase/database';
import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { realtimeDb, db } from './firebase';

// 채팅 메시지 인터페이스
export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: any; // Firebase serverTimestamp
  type: 'text' | 'system';
  readBy?: { [userId: string]: any }; // 읽음 처리
}

// 채팅방 정보 인터페이스
export interface ChatRoom {
  id: string;
  participants: string[]; // 참여자 userId 배열
  participantNames: { [userId: string]: string };
  participantImages: { [userId: string]: string };
  lastMessage?: string;
  lastMessageTime?: any;
  createdAt: any;
  updatedAt: any;
}

// 채팅방 생성 (양방향 통신 보장)
// 시나리오:
// 1. "alice123"이 "Bob456"에게 채팅 시작 → participants: ["alice123", "Bob456"] (대소문자 구분 없이 정렬)
// 2. "Bob456"이 "alice123"에게 채팅 시작 → 기존 채팅방 찾음 (중복 생성 방지)
// 3. 어떤 순서로 접근해도 같은 채팅방 사용 (대소문자, 특수문자 관계없이)
export const createChatRoom = async (
  currentUserId: string, 
  targetUserId: string,
  currentUserName: string,
  targetUserName: string,
  currentUserImage?: string,
  targetUserImage?: string
): Promise<string> => {
  try {
    console.log('🚀 채팅방 생성 시작:', { currentUserId, targetUserId });

    // 이미 존재하는 채팅방이 있는지 확인 (양방향 통신 보장)
    const existingChatId = await findExistingChatRoom(currentUserId, targetUserId);
    if (existingChatId) {
      console.log('✅ 기존 채팅방 사용:', existingChatId, 
        `참여자: [${[currentUserId, targetUserId].sort().join(', ')}]`);
      
      // 기존 채팅방의 이미지 정보도 최신으로 업데이트
      try {
        const currentUserDoc = await getDoc(doc(db, 'users', currentUserId));
        const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
        
        const currentUserPhotoUrl = currentUserDoc.exists() ? currentUserDoc.data().photoUrl || '' : '';
        const targetUserPhotoUrl = targetUserDoc.exists() ? targetUserDoc.data().photoUrl || '' : '';
        
        const chatRoomRef = ref(realtimeDb, `chatRooms/${existingChatId}`);
        await update(chatRoomRef, {
          participantImages: {
            [currentUserId]: currentUserPhotoUrl,
            [targetUserId]: targetUserPhotoUrl
          }
        });
        console.log('✅ 기존 채팅방 이미지 정보 업데이트 완료');
      } catch (error) {
        console.error('❌ 기존 채팅방 이미지 정보 업데이트 실패:', error);
      }
      
      return existingChatId;
    }

    // users에서 실제 사용자 정보 가져오기
    let actualCurrentUserImage = currentUserImage || '';
    let actualTargetUserImage = targetUserImage || '';
    
    try {
      // 현재 사용자 정보 가져오기
      const currentUserDoc = await getDoc(doc(db, 'users', currentUserId));
      if (currentUserDoc.exists()) {
        const currentUserData = currentUserDoc.data();
        actualCurrentUserImage = currentUserData.photoUrl || '';
        console.log('📸 현재 사용자 photoUrl:', actualCurrentUserImage);
      }
      
      // 대상 사용자 정보 가져오기
      const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
      if (targetUserDoc.exists()) {
        const targetUserData = targetUserDoc.data();
        actualTargetUserImage = targetUserData.photoUrl || '';
        console.log('📸 대상 사용자 photoUrl:', actualTargetUserImage);
      }
    } catch (error) {
      console.error('❌ 사용자 photoUrl 가져오기 실패:', error);
    }

    // 새 채팅방 생성 (push 키는 서버 타임베이스를 포함하여 충돌 가능성 매우 낮음)
    const chatRoomsRef = ref(realtimeDb, 'chatRooms');
    const newChatRef = push(chatRoomsRef);
    const chatId = newChatRef.key!;

    // participants 배열을 항상 정렬된 순서로 저장 (양방향 통신 보장)
    // 대소문자 구분 없이 안전하게 정렬 (Firebase UID는 대소문자 혼합 가능)
    // localeCompare()로 유니코드 안전 정렬
    const sortedParticipants = [currentUserId, targetUserId].sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
    
    const chatRoomData: Omit<ChatRoom, 'id'> = {
      participants: sortedParticipants,
      participantNames: {
        [currentUserId]: currentUserName,
        [targetUserId]: targetUserName
      },
      participantImages: {
        [currentUserId]: actualCurrentUserImage,
        [targetUserId]: actualTargetUserImage
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Realtime Database에 채팅방 생성 (멱등 보장: 이미 존재하면 set으로 동일 데이터 유지)
    await set(newChatRef, chatRoomData);

    // 각 사용자의 Firestore 문서에 채팅방 ID 추가
    await Promise.all([
      addChatIdToUser(currentUserId, chatId),
      addChatIdToUser(targetUserId, chatId)
    ]);

    // 시스템 메시지 추가
    await sendMessage(
      chatId, 
      'system', 
      '시스템', 
      `${currentUserName}님과 ${targetUserName}님이 채팅을 시작했습니다.`,
      'system'
    );

    console.log('✅ 새 채팅방 생성 완료:', chatId, 
      `참여자: [${sortedParticipants.join(', ')}]`);
    return chatId;

  } catch (error) {
    console.error('❌ 채팅방 생성 실패:', error);
    throw error;
  }
};

// 기존 채팅방 찾기
export const findExistingChatRoom = async (
  userId1: string, 
  userId2: string
): Promise<string | null> => {
  try {
    // 정렬된 순서로 비교하여 기존 채팅방 찾기
    // 대소문자 구분 없이 안전하게 정렬
    const sortedUsers = [userId1, userId2].sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
    
    const chatRoomsRef = ref(realtimeDb, 'chatRooms');
    const snapshot = await get(chatRoomsRef);
    
    if (snapshot.exists()) {
      const chatRooms = snapshot.val();
      
      for (const [chatId, chatRoom] of Object.entries(chatRooms)) {
        const room = chatRoom as ChatRoom;
        if (room.participants && room.participants.length === 2) {
          // participants 배열을 정렬하여 비교 (대소문자 구분 없이)
          const roomParticipants = [...room.participants].sort((a, b) => 
            a.toLowerCase().localeCompare(b.toLowerCase())
          );
          if (roomParticipants[0] === sortedUsers[0] && 
              roomParticipants[1] === sortedUsers[1]) {
            console.log('✅ 기존 채팅방 발견:', chatId);
            return chatId;
          }
        }
      }
    }
    
    console.log('🔍 기존 채팅방 없음, 새로 생성 필요');
    return null;
  } catch (error) {
    console.error('❌ 기존 채팅방 찾기 실패:', error);
    return null;
  }
};

// 사용자에게 채팅방 ID 추가
const addChatIdToUser = async (userId: string, chatId: string): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      chatIds: arrayUnion(chatId)
    });
    console.log(`✅ 사용자 ${userId}에게 채팅방 ID ${chatId} 추가 완료`);
  } catch (error) {
    console.error(`❌ 사용자 ${userId}에게 채팅방 ID 추가 실패:`, error);
    throw error;
  }
};

// 메시지 전송
export const sendMessage = async (
  chatId: string,
  senderId: string,
  senderName: string,
  message: string,
  type: 'text' | 'system' = 'text'
): Promise<void> => {
  try {
    const messagesRef = ref(realtimeDb, `messages/${chatId}`);
    const newMessageRef = push(messagesRef);

    const messageData: Omit<ChatMessage, 'id'> = {
      chatId,
      senderId,
      senderName,
      message,
      timestamp: serverTimestamp(),
      type,
      readBy: {
        [senderId]: serverTimestamp()
      }
    };

    await set(newMessageRef, messageData);

    // 채팅방 정보 업데이트 (마지막 메시지)
    // Realtime Database의 update API 사용 (원자적 부분 업데이트)
    const chatRoomRef = ref(realtimeDb, `chatRooms/${chatId}`);
    await update(chatRoomRef, {
      lastMessage: message,
      lastMessageTime: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log('✅ 메시지 전송 완료');
  } catch (error) {
    console.error('❌ 메시지 전송 실패:', error);
    throw error;
  }
};

// 메시지 실시간 수신
export const subscribeToMessages = (
  chatId: string,
  callback: (messages: ChatMessage[]) => void,
  limit: number = 50
): (() => void) => {
  try {
    console.log('🔗 Firebase Realtime Database 연결 상태:', {
      realtimeDb: !!realtimeDb,
      chatId,
      path: `messages/${chatId}`
    });
    
    const messagesRef = ref(realtimeDb, `messages/${chatId}`);
    const messagesQuery = query(
      messagesRef,
      orderByChild('timestamp'),
      limitToLast(limit)
    );
    
    console.log('📡 메시지 구독 쿼리 생성 완료:', messagesQuery);

    const unsubscribe = onValue(messagesQuery, (snapshot) => {
      console.log('🔄 메시지 데이터 업데이트:', chatId, snapshot.exists());
      const messages: ChatMessage[] = [];
      
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const messageData = childSnapshot.val();
          console.log('📨 개별 메시지 데이터:', {
            id: childSnapshot.key,
            data: messageData
          });
          messages.push({
            id: childSnapshot.key!,
            ...messageData
          });
        });
      } else {
        console.log('📭 메시지 데이터가 없습니다:', chatId);
      }
      
      console.log('📋 정렬 전 메시지:', messages.length, '개');
      
      // 시간순 정렬 (Firebase Realtime Database 타임스탬프 처리)
      messages.sort((a, b) => {
        let timeA = 0;
        let timeB = 0;
        
        // Firebase Realtime Database serverTimestamp는 숫자일 수 있음
        if (typeof a.timestamp === 'number') {
          timeA = a.timestamp;
        } else if (a.timestamp?.seconds) {
          timeA = a.timestamp.seconds;
        }
        
        if (typeof b.timestamp === 'number') {
          timeB = b.timestamp;
        } else if (b.timestamp?.seconds) {
          timeB = b.timestamp.seconds;
        }
        
        console.log('🕐 메시지 타임스탬프:', { 
          messageA: a.id, 
          timeA, 
          messageB: b.id, 
          timeB 
        });
        
        return timeA - timeB;
      });
      
      console.log('📋 정렬 후 메시지:', messages.length, '개');
      callback(messages);
    });

    return unsubscribe;
  } catch (error) {
    console.error('❌ 메시지 구독 실패:', error);
    return () => {};
  }
};

// 사용자의 채팅방 목록 가져오기
export const getUserChatRooms = async (userId: string): Promise<ChatRoom[]> => {
  try {
    // 디버깅: Firebase 인증 상태 확인
    const { auth } = await import('./firebase');
    console.log('🔍 getUserChatRooms - Firebase Auth 상태:', {
      auth: !!auth,
      currentUser: !!auth?.currentUser,
      uid: auth?.currentUser?.uid,
      requestedUserId: userId,
      realtimeDb: !!realtimeDb
    });
    
    if (!auth?.currentUser) {
      console.error('❌ 사용자가 인증되지 않았습니다.');
      return [];
    }
    
    // 사용자 문서에서 채팅방 ID 목록 가져오기
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.log('📝 사용자 문서가 존재하지 않습니다:', userId);
      return [];
    }
    
    const userData = userDoc.data();
    const chatIds = userData.chatIds || [];
    console.log('📋 사용자의 채팅방 ID 목록:', chatIds);
    
    if (chatIds.length === 0) {
      return [];
    }
    
    // 각 채팅방 정보 가져오기
    const chatRooms: ChatRoom[] = [];
    
    for (const chatId of chatIds) {
      console.log('🔍 채팅방 정보 가져오는 중:', chatId);
      const chatRoomRef = ref(realtimeDb, `chatRooms/${chatId}`);
      const snapshot = await get(chatRoomRef);
      
      if (snapshot.exists()) {
        chatRooms.push({
          id: chatId,
          ...snapshot.val()
        });
        console.log('✅ 채팅방 정보 로드 성공:', chatId);
      } else {
        console.log('⚠️ 채팅방이 존재하지 않음:', chatId);
      }
    }
    
    // 마지막 메시지 시간순으로 정렬
    chatRooms.sort((a, b) => {
      const timeA = a.lastMessageTime?.seconds || a.updatedAt?.seconds || 0;
      const timeB = b.lastMessageTime?.seconds || b.updatedAt?.seconds || 0;
      return timeB - timeA;
    });
    
    console.log('📊 최종 채팅방 목록:', chatRooms.length, '개');
    return chatRooms;
  } catch (error) {
    console.error('❌ 사용자 채팅방 목록 가져오기 실패:', error);
    return [];
  }
};

// 메시지 읽음 처리
export const markMessageAsRead = async (
  chatId: string,
  messageId: string,
  userId: string
): Promise<void> => {
  try {
    const messageRef = ref(realtimeDb, `messages/${chatId}/${messageId}/readBy/${userId}`);
    await set(messageRef, serverTimestamp());
  } catch (error) {
    console.error('❌ 메시지 읽음 처리 실패:', error);
  }
};

// 채팅방 정보 가져오기
export const getChatRoom = async (chatId: string): Promise<ChatRoom | null> => {
  try {
    const chatRoomRef = ref(realtimeDb, `chatRooms/${chatId}`);
    const snapshot = await get(chatRoomRef);
    
    if (snapshot.exists()) {
      return {
        id: chatId,
        ...snapshot.val()
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ 채팅방 정보 가져오기 실패:', error);
    return null;
  }
};

// 채팅방 삭제 (모든 관련 데이터 삭제)
export const deleteChatRoom = async (chatId: string, userId: string): Promise<boolean> => {
  try {
    console.log('🗑️ 채팅방 삭제 시작:', { chatId, userId });

    // 1. 채팅방 정보 가져오기
    const chatRoom = await getChatRoom(chatId);
    if (!chatRoom) {
      console.error('❌ 채팅방을 찾을 수 없습니다:', chatId);
      return false;
    }

    // 2. 모든 메시지 삭제
    const messagesRef = ref(realtimeDb, `messages/${chatId}`);
    await remove(messagesRef);
    console.log('✅ 메시지 삭제 완료:', chatId);

    // 3. 채팅방 삭제
    const chatRoomRef = ref(realtimeDb, `chatRooms/${chatId}`);
    await remove(chatRoomRef);
    console.log('✅ 채팅방 삭제 완료:', chatId);

    // 4. 모든 참여자의 Firestore 문서에서 채팅방 ID 제거
    const removePromises = chatRoom.participants.map(participantId => 
      removeChatIdFromUser(participantId, chatId)
    );
    await Promise.all(removePromises);
    console.log('✅ 모든 참여자에서 채팅방 ID 제거 완료');

    return true;
  } catch (error) {
    console.error('❌ 채팅방 삭제 실패:', error);
    return false;
  }
};

// 사용자에게서 채팅방 ID 제거
const removeChatIdFromUser = async (userId: string, chatId: string): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      chatIds: arrayRemove(chatId)
    });
    console.log(`✅ 사용자 ${userId}에서 채팅방 ID ${chatId} 제거 완료`);
  } catch (error) {
    console.error(`❌ 사용자 ${userId}에서 채팅방 ID 제거 실패:`, error);
    throw error;
  }
};

// 회원 차단
export const blockUser = async (blockerId: string, blockedUserId: string): Promise<boolean> => {
  try {
    console.log('🚫 사용자 차단 시작:', { blockerId, blockedUserId });

    // 차단 목록에 추가
    const blockerDocRef = doc(db, 'users', blockerId);
    await updateDoc(blockerDocRef, {
      blockedUsers: arrayUnion(blockedUserId)
    });

    console.log('✅ 사용자 차단 완료');
    return true;
  } catch (error) {
    console.error('❌ 사용자 차단 실패:', error);
    return false;
  }
};

// 회원 차단 해제
export const unblockUser = async (blockerId: string, blockedUserId: string): Promise<boolean> => {
  try {
    console.log('✅ 사용자 차단 해제 시작:', { blockerId, blockedUserId });

    const blockerDocRef = doc(db, 'users', blockerId);
    await updateDoc(blockerDocRef, {
      blockedUsers: arrayRemove(blockedUserId)
    });

    console.log('✅ 사용자 차단 해제 완료');
    return true;
  } catch (error) {
    console.error('❌ 사용자 차단 해제 실패:', error);
    return false;
  }
};

// 차단된 사용자 목록 가져오기
export const getBlockedUsers = async (userId: string): Promise<string[]> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return [];
    }
    
    const userData = userDoc.data();
    return userData.blockedUsers || [];
  } catch (error) {
    console.error('❌ 차단된 사용자 목록 가져오기 실패:', error);
    return [];
  }
};

// 채팅방 삭제 및 사용자 차단 (한 번에 처리)
export const deleteChatRoomAndBlockUser = async (
  chatId: string, 
  currentUserId: string, 
  targetUserId: string
): Promise<boolean> => {
  try {
    console.log('🗑️🚫 채팅방 삭제 및 사용자 차단 시작:', { chatId, currentUserId, targetUserId });

    // 1. 채팅방 삭제
    const deleteSuccess = await deleteChatRoom(chatId, currentUserId);
    if (!deleteSuccess) {
      console.error('❌ 채팅방 삭제 실패');
      return false;
    }

    // 2. 사용자 차단
    const blockSuccess = await blockUser(currentUserId, targetUserId);
    if (!blockSuccess) {
      console.error('❌ 사용자 차단 실패');
      return false;
    }

    console.log('✅ 채팅방 삭제 및 사용자 차단 완료');
    return true;
  } catch (error) {
    console.error('❌ 채팅방 삭제 및 사용자 차단 실패:', error);
    return false;
  }
};

// 읽지 않은 메시지 수 가져오기
export const getUnreadMessageCount = async (chatId: string, userId: string): Promise<number> => {
  try {
    const messagesRef = ref(realtimeDb, `messages/${chatId}`);
    const snapshot = await get(messagesRef);
    
    if (!snapshot.exists()) {
      return 0;
    }
    
    let unreadCount = 0;
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      // 내가 보낸 메시지가 아니고, 내가 읽지 않은 메시지인 경우
      if (message.senderId !== userId && (!message.readBy || !message.readBy[userId])) {
        unreadCount++;
      }
    });
    
    return unreadCount;
  } catch (error) {
    console.error('읽지 않은 메시지 수 가져오기 실패:', error);
    return 0;
  }
};

// 모든 채팅방의 이미지 정보를 업데이트하는 함수 (개발용)
export const updateAllChatRoomImages = async (userId: string): Promise<void> => {
  try {
    console.log('🔄 모든 채팅방 이미지 정보 업데이트 시작:', userId);
    
    // 사용자의 채팅방 목록 가져오기
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.log('❌ 사용자 문서가 존재하지 않습니다:', userId);
      return;
    }
    
    const userData = userDoc.data();
    const chatIds = userData.chatIds || [];
    
    console.log('📋 업데이트할 채팅방 개수:', chatIds.length);
    
    for (const chatId of chatIds) {
      try {
        const chatRoomRef = ref(realtimeDb, `chatRooms/${chatId}`);
        const snapshot = await get(chatRoomRef);
        
        if (snapshot.exists()) {
          const chatRoom = snapshot.val() as ChatRoom;
          const participants = chatRoom.participants || [];
          
          // 각 참여자의 최신 photoUrl 가져오기
          const updatedImages: { [userId: string]: string } = {};
          
          for (const participantId of participants) {
            try {
              const participantDoc = await getDoc(doc(db, 'users', participantId));
              if (participantDoc.exists()) {
                const participantData = participantDoc.data();
                updatedImages[participantId] = participantData.photoUrl || '';
                console.log(`📸 ${participantId} photoUrl:`, participantData.photoUrl);
              }
            } catch (error) {
              console.error(`❌ 참여자 ${participantId} 정보 가져오기 실패:`, error);
              updatedImages[participantId] = '';
            }
          }
          
          // 채팅방 이미지 정보 업데이트
          await update(chatRoomRef, {
            participantImages: updatedImages
          });
          
          console.log('✅ 채팅방 이미지 업데이트 완료:', chatId);
        }
      } catch (error) {
        console.error(`❌ 채팅방 ${chatId} 업데이트 실패:`, error);
      }
    }
    
    console.log('✅ 모든 채팅방 이미지 정보 업데이트 완료');
  } catch (error) {
    console.error('❌ 채팅방 이미지 정보 업데이트 실패:', error);
  }
};
