'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
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
  updateAllChatRoomImages,
  getUnreadMessageCount,
  subscribeToMessages,
  getChatRoom,
  sendMessage,
  markMessageAsRead,
  ChatRoom 
} from '../services/chatService';
import { getUserInfo } from '../auth/services/authService';
import './style.css';

// 채팅방 내용 컴포넌트 (PC용 분할 뷰에서 사용)
interface ChatRoomContentProps {
  chatId: string;
  onMessagesRead?: (chatId: string) => void;
}

const ChatRoomContent: React.FC<ChatRoomContentProps> = ({ chatId, onMessagesRead }) => {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [chatRoom, setChatRoom] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 채팅방 정보 로드 (기존 방식과 동일하게)
  useEffect(() => {
    if (!chatId) return;

    const loadChatRoom = async () => {
      try {
        console.log('🏠 채팅방 정보 로드 시작:', chatId);
        const room = await getChatRoom(chatId);
        console.log('🏠 채팅방 정보 로드 완료:', room);
        setChatRoom(room);
      } catch (error) {
        console.error('❌ 채팅방 정보 로드 실패:', error);
      }
    };

    loadChatRoom();
  }, [chatId]);

  // 메시지 실시간 구독 (기존 방식과 동일하게)
  useEffect(() => {
    if (!chatId) return;

    console.log('📡 메시지 구독 시작:', chatId);
    setIsLoading(true);
    
    const unsubscribe = subscribeToMessages(chatId, (newMessages) => {
      console.log('📨 새 메시지 수신:', newMessages.length, '개');
      setMessages(newMessages);
      setIsLoading(false);
      
      // 스크롤을 맨 아래로
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return unsubscribe;
  }, [chatId]);

  // 메시지 읽음 처리 (기존 방식과 동일하게)
  useEffect(() => {
    if (!user?.uid || messages.length === 0) return;

    const markMessagesAsRead = async () => {
      const unreadMessages = messages.filter(
        msg => msg.senderId !== user.uid && 
               (!msg.readBy || !msg.readBy[user.uid])
      );

      console.log('📖 읽지 않은 메시지:', unreadMessages.length, '개');

      if (unreadMessages.length > 0) {
        for (const message of unreadMessages) {
          await markMessageAsRead(chatId, message.id, user.uid);
        }
        
        // 메시지를 읽었으므로 채팅 목록의 읽지 않은 수 업데이트
        if (onMessagesRead) {
          onMessagesRead(chatId);
        }
      }
    };

    markMessagesAsRead();
  }, [messages, user?.uid, chatId, onMessagesRead]);

  // 메시지 전송
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.uid || isSending) return;

    setIsSending(true);
    try {
      // 사용자 이름을 더 안전하게 가져오기
      const userName = user.displayName || user.email?.split('@')[0] || '사용자';
      console.log('📤 메시지 전송 시작:', { chatId, userId: user.uid, userName, message: newMessage.trim() });
      await sendMessage(chatId, user.uid, userName, newMessage.trim());
      setNewMessage('');
      console.log('✅ 메시지 전송 완료');
    } catch (error) {
      console.error('❌ 메시지 전송 실패:', error);
    } finally {
      setIsSending(false);
    }
  };

  // 상대방 정보 가져오기
  const getOtherParticipant = () => {
    if (!chatRoom || !user?.uid) return null;
    
    const otherUserId = chatRoom.participants.find((id: string) => id !== user.uid);
    if (!otherUserId) return null;
    
    return {
      id: otherUserId,
      name: chatRoom.participantNames[otherUserId] || '알 수 없음',
      image: chatRoom.participantImages[otherUserId] || ''
    };
  };

  // 메시지 시간 포맷 (기존 방식과 동일하게)
  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    let date: Date;
    
    try {
      // Firebase Timestamp 객체인 경우
      if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      }
      // toDate() 메서드가 있는 경우 (Firestore Timestamp)
      else if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      }
      // 이미 Date 객체인 경우
      else if (timestamp instanceof Date) {
        date = timestamp;
      }
      // 숫자 타임스탬프인 경우
      else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
      }
      // 문자열인 경우
      else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      }
      else {
        return '';
      }
      
      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        return '';
      }
      
    } catch (error) {
      console.error('메시지 타임스탬프 파싱 오류:', error, timestamp);
      return '';
    }
    
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  // 분 단위로 새로운 그룹인지 확인
  const shouldShowNewGroup = (currentMessage: any, previousMessage: any) => {
    if (!currentMessage || !previousMessage) return true;
    
    const currentTime = parseMessageTimestamp(currentMessage.timestamp);
    const previousTime = parseMessageTimestamp(previousMessage.timestamp);
    
    if (!currentTime || !previousTime) return true;
    
    // 분 단위로 비교 (시간과 분이 다르면 새로운 그룹)
    const currentMinute = currentTime.getHours() * 60 + currentTime.getMinutes();
    const previousMinute = previousTime.getHours() * 60 + previousTime.getMinutes();
    const isNewGroup = currentMinute !== previousMinute;
    
    console.log('🕐 그룹 확인:', {
      currentId: currentMessage.id,
      previousId: previousMessage.id,
      currentTime: currentTime.toLocaleTimeString(),
      previousTime: previousTime.toLocaleTimeString(),
      currentMinute: currentMinute,
      previousMinute: previousMinute,
      isNewGroup: isNewGroup
    });
    
    return isNewGroup;
  };

  // 메시지 타임스탬프 파싱 헬퍼
  const parseMessageTimestamp = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    
    try {
      // Firebase Realtime Database serverTimestamp는 숫자일 수 있음
      if (typeof timestamp === 'number') {
        return new Date(timestamp);
      } else if (timestamp?.seconds) {
        return new Date(timestamp.seconds * 1000);
      } else if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
      } else if (timestamp instanceof Date) {
        return timestamp;
      } else if (typeof timestamp === 'string') {
        return new Date(timestamp);
      }
      
      return null;
    } catch (error) {
      console.error('타임스탬프 파싱 오류:', error, timestamp);
      return null;
    }
  };

  const otherParticipant = getOtherParticipant();

  if (isLoading) {
    return (
      <div className="embedded-chat-room">
        <div className="embedded-chat-messages">
          <div className="chat-loading">
            <div className="chat-loading-spinner">💬</div>
            <span>채팅을 불러오는 중...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="embedded-chat-room">
      <div className="embedded-chat-header">
        <div className="embedded-participant-info">
          <div className="embedded-participant-avatar">
            {otherParticipant?.image ? (
              <img src={otherParticipant.image} alt={otherParticipant.name} />
            ) : (
              <span>{otherParticipant?.name.charAt(0) || '?'}</span>
            )}
          </div>
          <h3>{otherParticipant?.name || '채팅방'}</h3>
        </div>
      </div>
      
      <div className="embedded-chat-messages">
        {messages.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            메시지가 없습니다
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isMyMessage = message.senderId === user?.uid;
              const isSystemMessage = message.type === 'system';
              
              // 시스템 메시지는 별도 처리
              if (isSystemMessage) {
                return (
                  <div key={message.id} className="system-message">
                    <div className="system-message-content">
                      {message.message}
                    </div>
                    <div className="system-message-time">
                      {formatMessageTime(message.timestamp)}
                    </div>
                  </div>
                );
              }
              
              // 아바타 표시 조건: 분 단위로 그룹핑
              const isFirstMessage = index === 0;
              const isDifferentSender = index > 0 && messages[index - 1].senderId !== message.senderId;
              const isNewTimeGroup = index > 0 && shouldShowNewGroup(message, messages[index - 1]);
              
              const showAvatar = !isMyMessage && (
                isFirstMessage || 
                isDifferentSender ||
                isNewTimeGroup
              );
              
              console.log('👤 아바타 표시 확인:', {
                messageId: message.id,
                isMyMessage,
                isFirstMessage,
                isDifferentSender,
                isNewTimeGroup,
                showAvatar
              });
              
              return (
                <div key={message.id} className={`message ${isMyMessage ? 'my-message' : 'other-message'} ${!showAvatar && !isMyMessage ? 'no-avatar' : ''}`}>
                  {showAvatar && (
                    <div className="message-avatar">
                      <img 
                        src={otherParticipant?.image || '/default-avatar.png'} 
                        alt="프로필"
                        onError={(e) => {
                          e.currentTarget.src = '/default-avatar.png';
                        }}
                      />
                    </div>
                  )}
                  <div className="message-content">
                    <div className="message-bubble">
                      {message.message}
                    </div>
                    <div className="message-time">
                      <span>{formatMessageTime(message.timestamp)}</span>
                      {isMyMessage && (
                        <span className="message-read-status">
                          {message.readBy && Object.keys(message.readBy).length > 1 ? '읽음' : '안읽음'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      <form className="embedded-chat-input" onSubmit={handleSendMessage}>
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="메시지를 입력하세요..."
          className="message-input"
          disabled={isSending}
        />
        <button 
          type="submit"
          className={`send-btn ${newMessage.trim() ? 'active' : ''}`}
          disabled={!newMessage.trim() || isSending}
        >
          {isSending ? '⏳' : '📤'}
        </button>
      </form>
    </div>
  );
};

// 채팅방 목록 컴포넌트
interface ChatRoomListProps {
  onChatRoomClick?: (chatId: string) => void;
  selectedChatId?: string | null;
  unreadCounts?: Record<string, number>;
  setUnreadCounts?: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

const ChatRoomList: React.FC<ChatRoomListProps> = ({ 
  onChatRoomClick, 
  selectedChatId,
  unreadCounts: externalUnreadCounts,
  setUnreadCounts: setExternalUnreadCounts
}) => {
  const { user } = useAuthContext();
  const { t } = useTranslationContext();
  const router = useRouter();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOptionsFor, setShowOptionsFor] = useState<string | null>(null);
  const [userImageCache, setUserImageCache] = useState<Record<string, string>>({});
  const [localUnreadCounts, setLocalUnreadCounts] = useState<Record<string, number>>({});
  
  // 외부에서 전달받은 unreadCounts가 있으면 사용, 없으면 로컬 상태 사용
  const unreadCounts = externalUnreadCounts || localUnreadCounts;
  const setUnreadCounts = setExternalUnreadCounts || setLocalUnreadCounts;

  useEffect(() => {
    if (!user?.uid) return;

    const loadChatRooms = async () => {
      try {
        setIsLoading(true);
        const rooms = await getUserChatRooms(user.uid);
        setChatRooms(rooms);
        
        // 각 채팅방의 상대방 이미지와 읽지 않은 메시지 수 가져오기
        const dataPromises = rooms.map(async (room) => {
          const otherUserId = room.participants.find(id => id !== user.uid);
          
          const [userInfo, unreadCount] = await Promise.all([
            otherUserId ? getUserInfo(otherUserId).catch(() => null) : Promise.resolve(null),
            getUnreadMessageCount(room.id, user.uid).catch(() => 0)
          ]);
          
          return {
            chatId: room.id,
            userId: otherUserId,
            photoUrl: userInfo?.photoUrl || '',
            unreadCount
          };
        });
        
        const dataResults = await Promise.all(dataPromises);
        const newImageCache: Record<string, string> = {};
        const newUnreadCounts: Record<string, number> = {};
        
        dataResults.forEach((result) => {
          if (result.userId) {
            newImageCache[result.userId] = result.photoUrl;
          }
          newUnreadCounts[result.chatId] = result.unreadCount;
        });
        
        setUserImageCache(newImageCache);
        setUnreadCounts(newUnreadCounts);
      } catch (error) {
        console.error('채팅방 목록 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChatRooms();
  }, [user?.uid]);

  const handleChatRoomClick = (chatId: string) => {
    if (onChatRoomClick) {
      onChatRoomClick(chatId);
    } else {
      router.push(`/chat/${chatId}`);
    }
  };

  const getOtherParticipant = (room: ChatRoom) => {
    const otherUserId = room.participants.find(id => id !== user?.uid);
    return {
      id: otherUserId,
      name: otherUserId ? room.participantNames[otherUserId] : '알 수 없음',
      image: otherUserId ? (userImageCache[otherUserId] || room.participantImages[otherUserId] || '') : ''
    };
  };

  const formatLastMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    let date: Date;
    
    try {
      // Firebase Timestamp 객체인 경우
      if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      }
      // toDate() 메서드가 있는 경우 (Firestore Timestamp)
      else if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      }
      // 이미 Date 객체인 경우
      else if (timestamp instanceof Date) {
        date = timestamp;
      }
      // 숫자 타임스탬프인 경우
      else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
      }
      // 문자열인 경우
      else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      }
      else {
        console.warn('알 수 없는 타임스탬프 형식:', timestamp);
        return '시간 미상';
      }
      
      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        console.warn('유효하지 않은 날짜:', timestamp);
        return '시간 미상';
      }
      
    } catch (error) {
      console.error('타임스탬프 파싱 오류:', error, timestamp);
      return '시간 미상';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes <= 0 ? '방금 전' : `${diffMinutes}분 전`;
    } else if (diffHours < 24) {
      return `${diffHours}시간 전`;
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR');
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
                className={`chat-room-item ${selectedChatId === room.id ? 'selected' : ''}`}
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
                    <div className="chat-room-meta">
                      <span className="chat-room-time">
                        {formatLastMessageTime(room.lastMessageTime || room.updatedAt)}
                      </span>
                      {unreadCounts[room.id] > 0 && (
                        <div className="unread-indicator">
                          <span className="unread-count">{unreadCounts[room.id]}</span>
                        </div>
                      )}
                    </div>
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

// 채팅 메인 컨텐츠 컴포넌트 (PC용 분할 뷰)
const ChatMainContent: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthContext();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // 화면 크기 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // URL에서 chatId 파라미터 확인
  useEffect(() => {
    const chatId = searchParams.get('chatId');
    if (chatId) {
      setSelectedChatId(chatId);
    }
  }, [searchParams]);

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

      // 모바일에서는 개별 페이지로, PC에서는 선택된 채팅으로 설정
      if (isMobile) {
        router.replace(`/chat/${chatId}`);
      } else {
        setSelectedChatId(chatId);
        router.replace(`/chat?chatId=${chatId}`);
      }
      
    } catch (error) {
      console.error('채팅방 생성 실패:', error);
      router.replace('/chat');
    } finally {
      setIsCreating(false);
    }
  };

  // 메시지 읽음 처리 핸들러
  const handleMessagesRead = (chatId: string) => {
    console.log('📖 채팅방 읽음 처리:', chatId);
    setUnreadCounts(prev => ({
      ...prev,
      [chatId]: 0
    }));
  };

  // 채팅방 선택 핸들러
  const handleChatRoomSelect = (chatId: string) => {
    if (isMobile) {
      router.push(`/chat/${chatId}`);
    } else {
      setSelectedChatId(chatId);
      router.push(`/chat?chatId=${chatId}`);
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

  // 모바일에서는 기존처럼 채팅 목록만 표시
  if (isMobile) {
    return <ChatRoomList onChatRoomClick={handleChatRoomSelect} />;
  }

  // PC에서는 분할 뷰로 표시
  return (
    <div className="chat-split-view">
      <div className="chat-list-panel">
        <ChatRoomList 
          onChatRoomClick={handleChatRoomSelect} 
          selectedChatId={selectedChatId}
          unreadCounts={unreadCounts}
          setUnreadCounts={setUnreadCounts}
        />
      </div>
      <div className="chat-content-panel">
        {selectedChatId ? (
          <ChatRoomContent 
            chatId={selectedChatId} 
            onMessagesRead={handleMessagesRead}
          />
        ) : (
          <div className="no-chat-selected">
            <div className="no-chat-icon">💬</div>
            <h3>채팅을 선택해주세요</h3>
            <p>왼쪽에서 채팅방을 선택하면 대화를 시작할 수 있습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
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
              <ChatMainContent />
            </Suspense>
          </div>
        </div>
        <BottomNavigator />
      </div>
    </AuthGuard>
  );
};

export default ChatPage;
