'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { AppBar } from '../../components/AppBar';
import { BottomNavigator } from '../../components/BottomNavigator';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTranslationContext } from '../../contexts/TranslationContext';
import { AuthGuard } from '../../components/AuthGuard';
import { 
  subscribeToMessages, 
  sendMessage, 
  getChatRoom, 
  markMessageAsRead,
  deleteChatRoom,
  blockUser,
  deleteChatRoomAndBlockUser,
  ChatMessage, 
  ChatRoom 
} from '../../services/chatService';
import './style.css';

const ChatRoomPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthContext();
  const { t } = useTranslationContext();
  
  const chatId = params.chatId as string;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 채팅방 정보 로드
  useEffect(() => {
    if (!chatId) return;

    const loadChatRoom = async () => {
      try {
        const room = await getChatRoom(chatId);
        setChatRoom(room);
      } catch (error) {
        console.error('채팅방 정보 로드 실패:', error);
      }
    };

    loadChatRoom();
  }, [chatId]);

  // 메시지 실시간 구독
  useEffect(() => {
    if (!chatId) return;

    setIsLoading(true);
    
    const unsubscribe = subscribeToMessages(chatId, (newMessages) => {
      setMessages(newMessages);
      setIsLoading(false);
      
      // 스크롤을 맨 아래로
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    });

    return unsubscribe;
  }, [chatId]);

  // 메시지 읽음 처리
  useEffect(() => {
    if (!user?.uid || messages.length === 0) return;

    const markMessagesAsRead = async () => {
      const unreadMessages = messages.filter(
        msg => msg.senderId !== user.uid && 
               (!msg.readBy || !msg.readBy[user.uid])
      );

      for (const message of unreadMessages) {
        await markMessageAsRead(chatId, message.id, user.uid);
      }
    };

    markMessagesAsRead();
  }, [messages, user?.uid, chatId]);

  // 스크롤을 맨 아래로
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 메시지 전송
  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user?.uid || isSending) return;

    try {
      setIsSending(true);
      
      await sendMessage(
        chatId,
        user.uid,
        user.displayName || '사용자',
        newMessage.trim(),
        'text'
      );
      
      setNewMessage('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('메시지 전송 실패:', error);
    } finally {
      setIsSending(false);
    }
  }, [newMessage, user, chatId, isSending]);

  // 채팅방 삭제
  const handleDeleteChatRoom = async () => {
    if (!user?.uid || !chatRoom) return;
    
    const confirmed = window.confirm('채팅방을 삭제하시겠습니까? 모든 메시지가 삭제됩니다.');
    if (!confirmed) return;

    try {
      const success = await deleteChatRoom(chatId, user.uid);
      if (success) {
        alert('채팅방이 삭제되었습니다.');
        router.push('/chat');
      } else {
        alert('채팅방 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('채팅방 삭제 실패:', error);
      alert('채팅방 삭제 중 오류가 발생했습니다.');
    }
  };

  // 사용자 차단
  const handleBlockUser = async () => {
    if (!user?.uid || !chatRoom) return;
    
    const otherParticipant = getOtherParticipant();
    if (!otherParticipant?.id) return;
    
    const confirmed = window.confirm(`${otherParticipant.name}님을 차단하시겠습니까? 채팅방도 함께 삭제됩니다.`);
    if (!confirmed) return;

    try {
      const success = await deleteChatRoomAndBlockUser(chatId, user.uid, otherParticipant.id);
      if (success) {
        alert('사용자를 차단하고 채팅방을 삭제했습니다.');
        router.push('/chat');
      } else {
        alert('사용자 차단에 실패했습니다.');
      }
    } catch (error) {
      console.error('사용자 차단 실패:', error);
      alert('사용자 차단 중 오류가 발생했습니다.');
    }
  };

  // 상대방 정보 가져오기
  const getOtherParticipant = () => {
    if (!chatRoom || !user?.uid) return null;
    
    const otherUserId = chatRoom.participants.find(id => id !== user.uid);
    if (!otherUserId) return null;
    
    return {
      id: otherUserId,
      name: chatRoom.participantNames[otherUserId] || '알 수 없음',
      image: chatRoom.participantImages[otherUserId] || ''
    };
  };

  // 메시지 시간 포맷
  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  // 날짜 구분선 표시 여부
  const shouldShowDateSeparator = (currentMsg: ChatMessage, prevMsg?: ChatMessage) => {
    if (!prevMsg) return true;
    
    const currentDate = new Date(currentMsg.timestamp?.seconds * 1000).toDateString();
    const prevDate = new Date(prevMsg.timestamp?.seconds * 1000).toDateString();
    
    return currentDate !== prevDate;
  };

  // 날짜 포맷
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp.seconds * 1000);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return '오늘';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '어제';
    } else {
      return date.toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  const otherParticipant = getOtherParticipant();

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="chat-room-page">
          <AppBar />
          <div className="chat-room-main-layout">
            <Sidebar />
            <div className="chat-room-main-content">
              <div className="chat-room-loading">
                <div className="chat-loading-spinner">💬</div>
                <span>채팅을 불러오는 중...</span>
              </div>
            </div>
          </div>
          <BottomNavigator />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="chat-room-page">
        <AppBar />
        <div className="chat-room-main-layout">
          <Sidebar />
          <div className="chat-room-main-content">
      {/* 채팅방 헤더 */}
      <div className="chat-room-header">
        <button 
          className="back-btn"
          onClick={() => router.back()}
        >
          ←
        </button>
        
        <div className="chat-room-info">
          <div className="participant-avatar">
            {otherParticipant?.image ? (
              <img src={otherParticipant.image} alt={otherParticipant.name} />
            ) : (
              <span>{otherParticipant?.name.charAt(0) || '?'}</span>
            )}
          </div>
          <div className="participant-details">
            <h2>{otherParticipant?.name || '채팅방'}</h2>
            <span className="participant-status">온라인</span>
          </div>
        </div>
        
        <div className="chat-room-more-actions">
          <button 
            className="more-btn"
            onClick={() => setShowMoreOptions(!showMoreOptions)}
          >
            ⋯
          </button>
          
          {showMoreOptions && (
            <div className="chat-room-more-menu">
              <button 
                className="chat-room-more-item delete"
                onClick={handleDeleteChatRoom}
              >
                🗑️ 채팅방 삭제
              </button>
              <button 
                className="chat-room-more-item block"
                onClick={handleBlockUser}
              >
                🚫 사용자 차단
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 메시지 목록 */}
      <div className="messages-container">
        {messages.map((message, index) => {
          const prevMessage = index > 0 ? messages[index - 1] : undefined;
          const showDateSeparator = shouldShowDateSeparator(message, prevMessage);
          const isMyMessage = message.senderId === user?.uid;
          const isSystemMessage = message.type === 'system';

          return (
            <React.Fragment key={message.id}>
              {showDateSeparator && (
                <div className="date-separator">
                  <span>{formatDate(message.timestamp)}</span>
                </div>
              )}
              
              {isSystemMessage ? (
                <div className="system-message">
                  <span>{message.message}</span>
                </div>
              ) : (
                <div className={`message-item ${isMyMessage ? 'my-message' : 'other-message'}`}>
                  {!isMyMessage && (
                    <div className="message-avatar">
                      {otherParticipant?.image ? (
                        <img src={otherParticipant.image} alt={message.senderName} />
                      ) : (
                        <span>{message.senderName.charAt(0)}</span>
                      )}
                    </div>
                  )}
                  
                  <div className="message-content">
                    {!isMyMessage && (
                      <div className="message-sender">{message.senderName}</div>
                    )}
                    <div className="message-bubble">
                      <p>{message.message}</p>
                    </div>
                    <div className="message-time">
                      {formatMessageTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 메시지 입력 */}
      <form className="message-input-form" onSubmit={handleSendMessage}>
        <div className="message-input-container">
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
        </div>
      </form>
          </div>
        </div>
        <BottomNavigator />
      </div>
    </AuthGuard>
  );
};

export default ChatRoomPage;
