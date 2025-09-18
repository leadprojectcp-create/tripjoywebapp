'use client';

import React, { useState, useEffect } from "react";
import { AppBar } from "../components/AppBar";
import { BottomNavigator } from "../components/BottomNavigator";
import { useAuthContext } from "../contexts/AuthContext";
import { AuthGuard } from "../components/AuthGuard";
import ProfilePostCard from "../profile/ProfilePostCard";
import { CommentPopup } from "../components/comments/CommentPopup";
import { useTranslationContext } from "../contexts/TranslationContext";
import { getUserLikedPosts } from "../components/post-hooks/usePostInteractions";
import { PostData } from "../services/postService";
import { getUserData } from "../auth/services/authService";
import styles from "./page.module.css";

type TabType = 'posts' | 'tours';

export default function Wishlist() {
  const { user } = useAuthContext();
  const { t } = useTranslationContext();
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [likedPosts, setLikedPosts] = useState<PostData[]>([]);
  const [wishedCountries, setWishedCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('전체');
  const [userInfoMap, setUserInfoMap] = useState<{ [userId: string]: any }>({});
  
  // 댓글 팝업 상태
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [commentsCount, setCommentsCount] = useState<{[key: string]: number}>({});

  // 찜한 게시물 가져오기
  useEffect(() => {
    const fetchLikedPosts = async () => {
      if (user?.uid) {
        try {
          const posts = await getUserLikedPosts(user.uid);
          setLikedPosts(posts);
          
          // 찜한 국가 추출
          const countries = extractWishedCountries(posts);
          setWishedCountries(countries);

          // 각 게시물의 사용자 정보 가져오기
          const userIds = [...new Set(posts.map(post => post.userId))];
          const userInfoPromises = userIds.map(async (userId) => {
            try {
              const userData = await getUserData(userId);
              const userInfo = {
                name: userData?.name || '사용자',
                location: userData?.location || '위치 미상',
                profileImage: userData?.photoUrl,
                photoUrl: userData?.photoUrl,
                gender: userData?.gender,
                birthDate: userData?.birthDate
              };
              return { userId, userInfo };
            } catch (error) {
              console.error(`Error fetching user info for ${userId}:`, error);
              return { userId, userInfo: null };
            }
          });

          const userInfoResults = await Promise.all(userInfoPromises);
          const userInfoMapResult: { [userId: string]: any } = {};
          userInfoResults.forEach(({ userId, userInfo }) => {
            if (userInfo) {
              userInfoMapResult[userId] = userInfo;
            }
          });
          setUserInfoMap(userInfoMapResult);
        } catch (error) {
          console.error('Error fetching liked posts:', error);
        }
      }
    };

    fetchLikedPosts();
  }, [user?.uid]);

  // 찜한 국가 추출 함수
  const extractWishedCountries = (posts: PostData[]): string[] => {
    const countrySet = new Set<string>();
    posts.forEach(post => {
      if (post.location?.nationality) {
        countrySet.add(post.location.nationality);
      }
    });
    return ['전체', ...Array.from(countrySet)];
  };

  // 국가 번역 함수
  const translateCountry = (countryCode: string): string => {
    if (countryCode === '전체') {
      return t('all') || '전체';
    }
    return t(`countries.${countryCode.toLowerCase()}`) || countryCode;
  };

  // 필터링된 게시물 가져오기
  const getFilteredPosts = (): PostData[] => {
    if (selectedCountry === '전체') {
      return likedPosts;
    }
    return likedPosts.filter(post => 
      post.location?.nationality === selectedCountry
    );
  };

  const filteredPosts = getFilteredPosts();

  // 댓글 버튼 클릭 핸들러
  const handleCommentClick = (postId: string) => {
    setSelectedPostId(postId);
    setShowCommentPopup(true);
  };

  // 댓글 수 업데이트 핸들러
  const handleCommentCountUpdate = (count: number) => {
    if (selectedPostId) {
      setCommentsCount(prev => ({
        ...prev,
        [selectedPostId]: count
      }));
    }
  };

  return (
    <AuthGuard>
      <div className={styles.container}>
        <AppBar 
          title={t('wishlist') || '찜목록'} 
          showBackButton={true} 
          showLogo={false}
        />
        
        <div className={styles.mainContent}>
          {/* 탭 버튼들 */}
          <div className={styles.tabContainer}>
            <button 
              className={`${styles.tabButton} ${activeTab === 'posts' ? styles.active : ''}`}
              onClick={() => setActiveTab('posts')}
            >
              {t('wishedPosts') || '찜한 게시물'}
            </button>
            <button 
              className={`${styles.tabButton} ${activeTab === 'tours' ? styles.active : ''}`}
              onClick={() => setActiveTab('tours')}
            >
              {t('wishedTours') || '찜한 투어'}
            </button>
          </div>

          {/* 구분선 */}
          <div className={styles.divider}></div>

          {/* 찜한 국가 필터 (게시물 탭일 때만 표시) */}
          {activeTab === 'posts' && (
            <div className={styles.countryFilter}>
              {wishedCountries.map((country) => (
                <button
                  key={country}
                  className={`${styles.countryTag} ${selectedCountry === country ? styles.active : ''}`}
                  onClick={() => setSelectedCountry(country)}
                >
                  {translateCountry(country)}
                </button>
              ))}
            </div>
          )}

          {/* 콘텐츠 영역 */}
          <div className={styles.contentArea}>
            {activeTab === 'posts' ? (
              filteredPosts.length > 0 ? (
                <div className={styles.postsGrid}>
                  {filteredPosts.map((post) => {
                    const userInfo = userInfoMap[post.userId] || { name: '사용자', location: '위치 미상' };
                    return (
                      <div className={styles.postCardWrapper} key={post.id}>
                        <ProfilePostCard 
                          post={post} 
                          userInfo={userInfo}
                          showUserInfo={true}
                          onCommentClick={handleCommentClick}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <h3>{t('noWishlistPosts') || '찜목록이 비어있습니다'}</h3>
                  <p>{t('wishlistHint') || '마음에 드는 게시물을 찜해보세요!'}</p>
                </div>
              )
            ) : (
              <div className={styles.emptyState}>
                <h3>{t('toursComingSoon') || '찜한 투어 기능이 곧 출시됩니다!'}</h3>
                <p>{t('toursHint') || '투어 기능을 기대해주세요!'}</p>
              </div>
            )}
          </div>
        </div>

        <BottomNavigator />
        
        {/* Comment Popup */}
        <CommentPopup
          postId={selectedPostId}
          isOpen={showCommentPopup}
          onClose={() => setShowCommentPopup(false)}
          onCommentCountUpdate={handleCommentCountUpdate}
        />
      </div>
    </AuthGuard>
  );
}
