"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "../components/Sidebar";
import { AppBar } from "../components/AppBar";
import { RightSidebar } from "../components/RightSidebar";
import { BottomNavigator } from "../components/BottomNavigator";
import { useAuthContext } from "../contexts/AuthContext";
import { AuthGuard } from "../components/AuthGuard";
import { useTranslationContext } from "../contexts/TranslationContext";
import { PostCard } from "../components/PostCard";
import { getUserLikedPostIds, getUserBookmarkedPostIds } from "../services/interactionService";
import { getPostById } from "../services/postService";
import { PostData } from "../services/postService";
import { getUserData } from "../auth/services/authService";
import "./style.css";

type TabType = 'liked' | 'bookmarked';

export default function MyActivity() {
  const { user } = useAuthContext();
  const { t } = useTranslationContext();
  const [activeTab, setActiveTab] = useState<TabType>('liked');
  const [likedPosts, setLikedPosts] = useState<PostData[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfoCache, setUserInfoCache] = useState<{ [userId: string]: any }>({});

  // 사용자 정보 캐시 함수
  const getUserInfo = async (userId: string) => {
    if (userInfoCache[userId]) {
      return userInfoCache[userId];
    }

    try {
      const userData = await getUserData(userId);
      const userInfo = {
        name: userData?.name || '사용자',
        location: userData?.location || '위치 미상',
        profileImage: userData?.photoUrl,
        gender: userData?.gender,
        birthDate: userData?.birthDate
      };
      
      setUserInfoCache(prev => ({
        ...prev,
        [userId]: userInfo
      }));
      
      return userInfo;
    } catch (error) {
      console.error('사용자 정보 가져오기 실패:', error);
      return {
        name: '사용자',
        location: '위치 미상'
      };
    }
  };

  // 좋아요한 게시물 가져오기
  const fetchLikedPosts = async () => {
    if (!user) return;

    try {
      const likedPostIds = await getUserLikedPostIds(user.uid);
      const posts: PostData[] = [];

      for (const postId of likedPostIds) {
        try {
          const post = await getPostById(postId);
          if (post) {
            posts.push(post);
          }
        } catch (error) {
          console.error(`게시물 ${postId} 가져오기 실패:`, error);
        }
      }

      // 최신순으로 정렬 (좋아요한 시간 기준)
      posts.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return bTime.getTime() - aTime.getTime();
      });

      setLikedPosts(posts);

      // 각 게시물의 사용자 정보 미리 로드
      for (const post of posts) {
        await getUserInfo(post.userId);
      }
    } catch (error) {
      console.error('좋아요한 게시물 가져오기 실패:', error);
    }
  };

  // 북마크한 게시물 가져오기
  const fetchBookmarkedPosts = async () => {
    if (!user) return;

    try {
      const bookmarkedPostIds = await getUserBookmarkedPostIds(user.uid);
      const posts: PostData[] = [];

      for (const postId of bookmarkedPostIds) {
        try {
          const post = await getPostById(postId);
          if (post) {
            posts.push(post);
          }
        } catch (error) {
          console.error(`게시물 ${postId} 가져오기 실패:`, error);
        }
      }

      // 최신순으로 정렬 (북마크한 시간 기준)
      posts.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return bTime.getTime() - aTime.getTime();
      });

      setBookmarkedPosts(posts);

      // 각 게시물의 사용자 정보 미리 로드
      for (const post of posts) {
        await getUserInfo(post.userId);
      }
    } catch (error) {
      console.error('북마크한 게시물 가져오기 실패:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchLikedPosts(),
        fetchBookmarkedPosts()
      ]);
      setLoading(false);
    };

    if (user) {
      loadData();
    }
  }, [user]);

  const currentPosts = activeTab === 'liked' ? likedPosts : bookmarkedPosts;

  // 좋아요/북마크 상태 변경 핸들러
  const handleInteractionChange = async (postId: string, type: 'like' | 'bookmark', isActive: boolean) => {
    if (type === 'like') {
      if (!isActive) {
        // 좋아요 취소 시 목록에서 제거
        setLikedPosts(prev => prev.filter(post => post.id !== postId));
      } else {
        // 좋아요 추가 시 목록에 추가 (중복 방지)
        const existingPost = likedPosts.find(post => post.id === postId);
        if (!existingPost) {
          // 현재 표시된 게시물들에서 찾기
          const currentPost = [...likedPosts, ...bookmarkedPosts].find(post => post.id === postId);
          if (currentPost) {
            setLikedPosts(prev => [currentPost, ...prev]);
          } else {
            // 게시물 정보를 새로 가져와서 추가
            try {
              const post = await getPostById(postId);
              if (post) {
                setLikedPosts(prev => [post, ...prev]);
                // 사용자 정보도 캐시에 추가
                await getUserInfo(post.userId);
              }
            } catch (error) {
              console.error('게시물 정보 가져오기 실패:', error);
            }
          }
        }
      }
    } else if (type === 'bookmark') {
      if (!isActive) {
        // 북마크 취소 시 목록에서 제거
        setBookmarkedPosts(prev => prev.filter(post => post.id !== postId));
      } else {
        // 북마크 추가 시 목록에 추가 (중복 방지)
        const existingPost = bookmarkedPosts.find(post => post.id === postId);
        if (!existingPost) {
          // 현재 표시된 게시물들에서 찾기
          const currentPost = [...likedPosts, ...bookmarkedPosts].find(post => post.id === postId);
          if (currentPost) {
            setBookmarkedPosts(prev => [currentPost, ...prev]);
          } else {
            // 게시물 정보를 새로 가져와서 추가
            try {
              const post = await getPostById(postId);
              if (post) {
                setBookmarkedPosts(prev => [post, ...prev]);
                // 사용자 정보도 캐시에 추가
                await getUserInfo(post.userId);
              }
            } catch (error) {
              console.error('게시물 정보 가져오기 실패:', error);
            }
          }
        }
      }
    }
  };

  return (
    <>
      <AuthGuard>
        <div className="my-activity-container">
          {/* Top AppBar */}
          <AppBar 
            showBackButton={false}
            showLogo={true}
            showLanguageSelector={true}
          />
          
          {/* Body Content */}
          <div className="body-content">
            {/* Left Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <div className="my-activity-main-content">
              {/* Header */}
              <div className="my-activity-header">
                <h1>{t('myActivity')}</h1>
              </div>

              {/* Tabs */}
              <div className="activity-tabs">
                <button 
                  className={`tab-button ${activeTab === 'liked' ? 'active' : ''}`}
                  onClick={() => setActiveTab('liked')}
                >
                  <span className="tab-icon">❤️</span>
                  <span>{t('liked') || '좋아요'}</span>
                  <span className="tab-count">({likedPosts.length})</span>
                </button>
                <button 
                  className={`tab-button ${activeTab === 'bookmarked' ? 'active' : ''}`}
                  onClick={() => setActiveTab('bookmarked')}
                >
                  <span className="tab-icon">🔖</span>
                  <span>{t('bookmarked') || '북마크'}</span>
                  <span className="tab-count">({bookmarkedPosts.length})</span>
                </button>
              </div>

              {/* Content */}
              <div className="activity-content">
                {loading ? (
                  <div className="activity-loading">
                    <div className="loading-spinner">⏳</div>
                    <p>{t('loading') || '로딩 중...'}</p>
                  </div>
                ) : currentPosts.length === 0 ? (
                  <div className="no-posts">
                    <div className="no-posts-icon">
                      {activeTab === 'liked' ? '💔' : '📌'}
                    </div>
                    <h3>
                      {activeTab === 'liked' 
                        ? (t('noLikedPosts') || '좋아요한 게시물이 없습니다')
                        : (t('noBookmarkedPosts') || '북마크한 게시물이 없습니다')
                      }
                    </h3>
                    <p>
                      {activeTab === 'liked' 
                        ? (t('likePostsHint') || '마음에 드는 게시물에 좋아요를 눌러보세요!')
                        : (t('bookmarkPostsHint') || '나중에 보고 싶은 게시물을 북마크해보세요!')
                      }
                    </p>
                  </div>
                ) : (
                  <div className="posts-grid">
                    {currentPosts.map((post) => (
                      <PostCard 
                        key={post.id} 
                        post={post}
                        userInfo={userInfoCache[post.userId]}
                        showUserInfo={true}
                        onInteractionChange={handleInteractionChange}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <RightSidebar />
          </div>
        </div>
        
        {/* Mobile Bottom Navigator */}
        <BottomNavigator />
      </AuthGuard>
    </>
  );
}
