'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sidebar } from '../components/Sidebar';
import { AppBar } from '../components/AppBar';
import { BottomNavigator } from '../components/BottomNavigator';
import { useAuthContext } from '../contexts/AuthContext';
import { useTranslationContext } from '../contexts/TranslationContext';
import { AuthGuard } from '../components/AuthGuard';
import { 
  getUserChatRooms, 
  createChatRoom, 
  deleteChatRoom, 
  blockUser, 
  deleteChatRoomAndBlockUser,
  ChatRoom 
} from '../services/chatService';
import { getUserInfo } from '../auth/services/authService';
import './style.css';

// 채팅방 목록 컴포넌트
const ChatRoomList: React.FC = () => {
  const { user } = useAuthContext();
  const { t } = useTranslationContext();
  const router = useRouter();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOptionsFor, setShowOptionsFor] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    const loadChatRooms = async () => {
      try {
        setIsLoading(true);
        const rooms = await getUserChatRooms(user.uid);
        setChatRooms(rooms);
      } catch (error) {
        console.error('채팅방 목록 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChatRooms();
  }, [user?.uid]);

  const handleChatRoomClick = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const getOtherParticipant = (room: ChatRoom) => {
    const otherUserId = room.participants.find(id => id !== user?.uid);
    return {
      id: otherUserId,
      name: otherUserId ? room.participantNames[otherUserId] : '알 수 없음',
      image: otherUserId ? room.participantImages[otherUserId] : ''
    };
  };

  const formatLastMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}분 전`;
    } else if (diffHours < 24) {
      return `${diffHours}시간 전`;
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // 채팅방 삭제
  const handleDeleteChatRoom = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user?.uid) return;
    
    const confirmed = window.confirm('채팅방을 삭제하시겠습니까? 모든 메시지가 삭제됩니다.');
    if (!confirmed) return;

    try {
      const success = await deleteChatRoom(chatId, user.uid);
      if (success) {
        // 채팅방 목록에서 제거
        setChatRooms(prev => prev.filter(room => room.id !== chatId));
        setShowOptionsFor(null);
        alert('채팅방이 삭제되었습니다.');
      } else {
        alert('채팅방 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('채팅방 삭제 실패:', error);
      alert('채팅방 삭제 중 오류가 발생했습니다.');
    }
  };

  // 사용자 차단
  const handleBlockUser = async (chatId: string, targetUserId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user?.uid) return;
    
    const confirmed = window.confirm('이 사용자를 차단하시겠습니까? 채팅방도 함께 삭제됩니다.');
    if (!confirmed) return;

    try {
      const success = await deleteChatRoomAndBlockUser(chatId, user.uid, targetUserId);
      if (success) {
        // 채팅방 목록에서 제거
        setChatRooms(prev => prev.filter(room => room.id !== chatId));
        setShowOptionsFor(null);
        alert('사용자를 차단하고 채팅방을 삭제했습니다.');
      } else {
        alert('사용자 차단에 실패했습니다.');
      }
    } catch (error) {
      console.error('사용자 차단 실패:', error);
      alert('사용자 차단 중 오류가 발생했습니다.');
    }
  };

  // 옵션 메뉴 토글
  const toggleOptions = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowOptionsFor(showOptionsFor === chatId ? null : chatId);
  };

  if (isLoading) {
    return (
      <div className="chat-loading">
        <div className="chat-loading-spinner">💬</div>
        <span>채팅방을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="chat-room-list">
      <div className="chat-header">
        <h1>💬 채팅</h1>
      </div>

      {chatRooms.length === 0 ? (
        <div className="no-chat-rooms">
          <div className="no-chat-icon">💬</div>
          <h3>아직 채팅방이 없습니다</h3>
          <p>다른 사용자와 대화를 시작해보세요!</p>
        </div>
      ) : (
        <div className="chat-rooms-container">
          {chatRooms.map((room) => {
            const otherParticipant = getOtherParticipant(room);
            
            return (
              <div 
                key={room.id} 
                className="chat-room-item"
                onClick={() => handleChatRoomClick(room.id)}
              >
                <div className="chat-room-avatar">
                  {otherParticipant.image ? (
                    <img src={otherParticipant.image} alt={otherParticipant.name} />
                  ) : (
                    <span>{otherParticipant.name.charAt(0)}</span>
                  )}
                </div>
                
                <div className="chat-room-info">
                  <div className="chat-room-header">
                    <h3 className="chat-room-name">{otherParticipant.name}</h3>
                    <span className="chat-room-time">
                      {formatLastMessageTime(room.lastMessageTime || room.updatedAt)}
                    </span>
                  </div>
                  
                  <div className="chat-room-preview">
                    <p className="last-message">
                      {room.lastMessage || '대화를 시작해보세요'}
                    </p>
                  </div>
                </div>

                <div className="chat-room-actions">
                  <button 
                    className="chat-options-btn"
                    onClick={(e) => toggleOptions(room.id, e)}
                  >
                    ⋯
                  </button>
                  
                  {showOptionsFor === room.id && (
                    <div className="chat-options-menu">
                      <button 
                        className="chat-option-item delete"
                        onClick={(e) => handleDeleteChatRoom(room.id, e)}
                      >
                        🗑️ 채팅방 삭제
                      </button>
                      <button 
                        className="chat-option-item block"
                        onClick={(e) => handleBlockUser(room.id, otherParticipant.id!, e)}
                      >
                        🚫 사용자 차단
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// 새 채팅 시작 컴포넌트
const NewChatContent: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthContext();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const targetUserId = searchParams.get('userId');
    
    if (targetUserId && user?.uid) {
      handleCreateChat(targetUserId);
    }
  }, [searchParams, user?.uid]);

  const handleCreateChat = async (targetUserId: string) => {
    if (!user?.uid || isCreating) return;

    try {
      setIsCreating(true);
      
      // 현재 사용자 정보 가져오기
      const currentUserInfo = await getUserInfo(user.uid);
      const targetUserInfo = await getUserInfo(targetUserId);
      
      if (!currentUserInfo || !targetUserInfo) {
        console.error('사용자 정보를 찾을 수 없습니다.');
        return;
      }

      // 채팅방 생성 또는 기존 채팅방 찾기
      const chatId = await createChatRoom(
        user.uid,
        targetUserId,
        currentUserInfo.name,
        targetUserInfo.name,
        currentUserInfo.photoUrl,
        targetUserInfo.photoUrl
      );

      // 채팅방으로 이동
      router.replace(`/chat/${chatId}`);
      
    } catch (error) {
      console.error('채팅방 생성 실패:', error);
      router.replace('/chat');
    } finally {
      setIsCreating(false);
    }
  };

  if (isCreating) {
    return (
      <div className="chat-loading">
        <div className="chat-loading-spinner">💬</div>
        <span>채팅방을 생성하는 중...</span>
      </div>
    );
  }

  return <ChatRoomList />;
};

// 메인 채팅 페이지 컴포넌트
const ChatPage: React.FC = () => {
  return (
    <AuthGuard>
      <div className="chat-page">
        <AppBar />
        <div className="chat-main-layout">
          <Sidebar />
          <div className="chat-main-content">
            <Suspense fallback={
              <div className="chat-loading">
                <div className="chat-loading-spinner">💬</div>
                <span>로딩 중...</span>
              </div>
            }>
              <NewChatContent />
            </Suspense>
          </div>
        </div>
        <BottomNavigator />
      </div>
    </AuthGuard>
  );
};

export default ChatPage;
