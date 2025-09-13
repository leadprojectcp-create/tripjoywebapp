'use client';

import React, { useState, useRef, useEffect } from 'react';
import { bunnyService } from '../services/bunnyService';
import styles from './PostCard.module.css';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
  priority?: boolean; // 우선순위 로딩
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  loading = 'lazy',
  onLoad,
  onError,
  priority = false
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (priority && src) {
      // 우선순위 이미지는 즉시 프리로드
      bunnyService.preloadImage(src).catch(() => {
        console.warn('Priority image preload failed:', src);
      });
    }
  }, [src, priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const imageClasses = [
    className,
    styles.imageLoadingOptimized,
    isLoaded ? styles.loaded : '',
    hasError ? 'error' : ''
  ].filter(Boolean).join(' ');

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={imageClasses}
      loading={loading}
      onLoad={handleLoad}
      onError={handleError}
      decoding="async" // 비동기 디코딩
    />
  );
};

export default OptimizedImage;
