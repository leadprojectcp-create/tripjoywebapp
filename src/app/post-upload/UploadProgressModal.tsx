'use client';

import React, { useState, useEffect } from 'react';
import styles from './UploadProgressModal.module.css';

interface UploadProgressModalProps {
  isVisible: boolean;
  progress: number;
  images: string[];
  message?: string;
}

export const UploadProgressModal: React.FC<UploadProgressModalProps> = ({
  isVisible,
  progress,
  images = [],
  message = '게시물을 업로드하고 있습니다...'
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // 이미지 캐러셀 자동 전환
  useEffect(() => {
    if (!isVisible || images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 1000); // 2초마다 전환

    return () => clearInterval(interval);
  }, [isVisible, images.length]);

  if (!isVisible) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.content}>
          {/* 이미지 캐러셀 */}
          {images.length > 0 && (
            <div className={styles.imageCarousel}>
              <div className={styles.imageContainer}>
                {images.map((image, index) => {
                  // 현재 이미지를 기준으로 상대적 위치 계산
                  let relativePosition = index - currentImageIndex;
                  
                  // 음수 인덱스 처리 (원형 배열)
                  if (relativePosition < 0) {
                    relativePosition += images.length;
                  }
                  
                  // 3장일 때: 2-1-3 순서로 배치
                  // 5장일 때: 4-2-1-3-5 순서로 배치
                  let displayIndex = relativePosition;
                  
                  // 3장일 때는 -1, 0, 1로 제한
                  if (images.length === 3) {
                    if (displayIndex > 1) {
                      displayIndex = displayIndex - images.length;
                    }
                  } else {
                    // 5장 이상일 때는 -2, -1, 0, 1, 2로 제한
                    if (displayIndex > 2) {
                      displayIndex = displayIndex - images.length;
                    }
                  }
                  
                  let sizeClass = '';
                  let blurClass = '';
                  let positionClass = '';
                  
                  if (displayIndex === 0) {
                    // 중앙 이미지
                    sizeClass = styles.centerImage;
                    blurClass = styles.noBlur;
                    positionClass = styles.center;
                  } else if (displayIndex === -1 || displayIndex === 1) {
                    // 바로 옆 이미지
                    sizeClass = styles.sideImage;
                    blurClass = styles.mediumBlur;
                    positionClass = displayIndex === -1 ? styles.left : styles.right;
                  } else {
                    // 더 멀리 있는 이미지 (5장 이상일 때만)
                    sizeClass = styles.farImage;
                    blurClass = styles.highBlur;
                    positionClass = displayIndex === -2 ? styles.farLeft : styles.farRight;
                  }
                  
                  return (
                    <div 
                      key={index} 
                      className={`${styles.imageSlide} ${sizeClass} ${blurClass} ${positionClass}`}
                      style={{
                        zIndex: images.length - Math.abs(displayIndex)
                      }}
                    >
                      <img src={image} alt={`업로드 이미지 ${index + 1}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* 메인 메시지 */}
          <h3 className={styles.title}>게시물 업로드 중</h3>
          
          {/* 서브 메시지 */}
          <p className={styles.subtitle}>
            회원님의 게시물을 업로드 하는 중입니다.<br />
            잠시만 기다려주세요
          </p>
          
          {/* 진행률 바 */}
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className={styles.progressText}>{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadProgressModal;
