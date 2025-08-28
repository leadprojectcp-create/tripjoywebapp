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
        const currentUserDoc = await getDoc(doc(db, 'users_test', currentUserId));
        const targetUserDoc = await getDoc(doc(db, 'users_test', targetUserId));
        
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

    // users_test에서 실제 사용자 정보 가져오기
    let actualCurrentUserImage = currentUserImage || '';
    let actualTargetUserImage = targetUserImage || '';
    
    try {
      // 현재 사용자 정보 가져오기
      const currentUserDoc = await getDoc(doc(db, 'users_test', currentUserId));
      if (currentUserDoc.exists()) {
        const currentUserData = currentUserDoc.data();
        actualCurrentUserImage = currentUserData.photoUrl || '';
        console.log('📸 현재 사용자 photoUrl:', actualCurrentUserImage);
      }
      
      // 대상 사용자 정보 가져오기
      const targetUserDoc = await getDoc(doc(db, 'users_test', targetUserId));
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
    const userDocRef = doc(db, 'users_test', userId);
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
    const messagesRef = ref(realtimeDb, `messages/${chatId}`);
    const messagesQuery = query(
      messagesRef,
      orderByChild('timestamp'),
      limitToLast(limit)
    );

    const unsubscribe = onValue(messagesQuery, (snapshot) => {
      const messages: ChatMessage[] = [];
      
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const messageData = childSnapshot.val();
          messages.push({
            id: childSnapshot.key!,
            ...messageData
          });
        });
      }
      
      // 시간순 정렬
      messages.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeA - timeB;
      });
      
      callback(messages);
    });

    return () => off(messagesQuery, 'value', unsubscribe);
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
    const userDocRef = doc(db, 'users_test', userId);
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
    // 디버깅: Firebase 인증 상태 확인
    const { auth } = await import('./firebase');
    console.log('🔍 Firebase Auth 상태:', {
      auth: !!auth,
      currentUser: !!auth?.currentUser,
      uid: auth?.currentUser?.uid,
      realtimeDb: !!realtimeDb
    });
    
    if (!auth?.currentUser) {
      console.error('❌ 사용자가 인증되지 않았습니다.');
      throw new Error('사용자가 인증되지 않았습니다.');
    }
    
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
    const userDocRef = doc(db, 'users_test', userId);
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
    const blockerDocRef = doc(db, 'users_test', blockerId);
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

    const blockerDocRef = doc(db, 'users_test', blockerId);
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
    const userDocRef = doc(db, 'users_test', userId);
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
