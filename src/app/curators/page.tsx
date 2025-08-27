'use client';

import React, { useState, useEffect } from 'react';
import { useTranslationContext } from '../contexts/TranslationContext';
import { getCurators } from '../services/curatorService';
import type { CuratorData } from '../services/curatorService';
import { CuratorCard } from '../components/CuratorCard';
import { AppBar } from '../components/AppBar';
import { Sidebar } from '../components/Sidebar';
import { AuthGuard } from '../components/AuthGuard';
import './style.css';

// CuratorData 인터페이스를 curatorService에서 가져옴

export default function CuratorsPage() {
  const { t } = useTranslationContext();
  const [curators, setCurators] = useState<CuratorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurators = async () => {
      try {
        setLoading(true);
        const curatorData = await getCurators();
        setCurators(curatorData);
      } catch (error) {
        console.error('큐레이터 데이터 로드 실패:', error);
        setError('큐레이터 정보를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchCurators();
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="curators-content">
          <div className="curators-header">
            <h1>{t('curators') || '큐레이터'}</h1>
          </div>
          <div className="curators-loading-container">
            <div className="curators-loading-spinner">⏳</div>
            <p>{t('loadingCurators') || '큐레이터를 불러오는 중...'}</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="curators-content">
          <div className="curators-header">
            <h1>{t('curators') || '큐레이터'}</h1>
          </div>
          <div className="error-container">
            <p>{error}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="curators-content">
        <div className="curators-header">
          <h1>{t('curators') || '큐레이터'}</h1>
          <p>{t('curatorsDescription') || '여행의 전문가들을 만나보세요'}</p>
        </div>
        
        <div className="curators-grid">
          {curators.map((curator) => (
            <CuratorCard
              key={curator.id}
              curator={curator}
            />
          ))}
        </div>
        
        {curators.length === 0 && (
          <div className="no-curators">
            <h3>{t('noCurators') || '큐레이터가 없습니다'}</h3>
            <p>{t('noCuratorsMessage') || '아직 등록된 큐레이터가 없습니다.'}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <AuthGuard>
      <div className="curators-page">
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
          <div className="curators-main-content">
            {renderContent()}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
