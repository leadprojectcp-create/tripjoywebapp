'use client';

import { useState, useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { getUserChatRooms, getUnreadMessageCount } from '../services/chatService';

export const useUnreadMessageCount = () => {
  const { user } = useAuthContext();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setTotalUnreadCount(0);
      return;
    }

    const loadTotalUnreadCount = async () => {
      try {
        console.log('📊 전체 읽지 않은 메시지 수 계산 시작');
        
        // 사용자의 모든 채팅방 가져오기
        const chatRooms = await getUserChatRooms(user.uid);
        
        let totalCount = 0;
        
        // 각 채팅방의 읽지 않은 메시지 수 계산
        for (const room of chatRooms) {
          const unreadCount = await getUnreadMessageCount(room.id, user.uid);
          totalCount += unreadCount;
        }
        
        console.log('📊 전체 읽지 않은 메시지 수:', totalCount);
        setTotalUnreadCount(totalCount);
        
      } catch (error) {
        console.error('❌ 전체 읽지 않은 메시지 수 계산 실패:', error);
        setTotalUnreadCount(0);
      }
    };

    loadTotalUnreadCount();
    
    // 30초마다 업데이트
    const interval = setInterval(loadTotalUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, [user?.uid]);

  return totalUnreadCount;
};
