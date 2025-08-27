'use client';

import React, { useState, useEffect } from 'react';
import { useTranslationContext } from '../contexts/TranslationContext';
import { CompanionCard } from '../components/CompanionCard';
import { getRequestedCompanions } from '../services/companionService';
import { AppBar } from '../components/AppBar';
import { Sidebar } from '../components/Sidebar';
import { AuthGuard } from '../components/AuthGuard';
import './style.css';

// CompanionData 인터페이스
interface CompanionData {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  hotelName: string;
  location: string;
  country: string;
  city: string;
  dateRequested: string;
  timeRequested: string;
  region: string;
  status: 'pending' | 'accepted' | 'rejected' | 'past';
  createdAt: any;
}

export default function RequestedCompanionsPage() {
  const { t } = useTranslationContext();
  const [companions, setCompanions] = useState<CompanionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'past'>('pending');

  useEffect(() => {
    const fetchCompanions = async () => {
      try {
        setLoading(true);
        const companionsData = await getRequestedCompanions();
        setCompanions(companionsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load companions');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanions();
  }, []);

  const filteredCompanions = companions.filter(companion => {
    switch (activeTab) {
      case 'pending':
        return companion.status === 'pending';
      case 'confirmed':
        return companion.status === 'accepted';
      case 'past':
        return companion.status === 'past' || companion.status === 'rejected';
      default:
        return true;
    }
  });

  return (
    <AuthGuard>
      <div className="requested-companions-page">
        <AppBar />
        <div className="body-content">
          <Sidebar />
          <div className="requested-companions-main-content">
            <div className="requested-companions-content">
              <div className="requested-companions-header">
                <h1>{t('requestedCompanions')}</h1>
                <p>{t('requestedCompanionsDescription')}</p>
              </div>

              {/* 탭 메뉴 */}
              <div className="companion-tabs">
                <button 
                  className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
                  onClick={() => setActiveTab('pending')}
                >
                  {t('pendingCompanions')}
                </button>
                <button 
                  className={`tab-button ${activeTab === 'confirmed' ? 'active' : ''}`}
                  onClick={() => setActiveTab('confirmed')}
                >
                  {t('confirmedCompanions')}
                </button>
                <button 
                  className={`tab-button ${activeTab === 'past' ? 'active' : ''}`}
                  onClick={() => setActiveTab('past')}
                >
                  {t('pastCompanions')}
                </button>
              </div>

              {loading ? (
                <div className="loading-container">
                  <div className="loading-spinner">⏳</div>
                  <p>{t('loadingCompanions')}</p>
                </div>
              ) : error ? (
                <div className="error-container">
                  <p>{error}</p>
                </div>
              ) : filteredCompanions.length === 0 ? (
                <div className="no-companions">
                  <h3>{t('noCompanions')}</h3>
                  <p>{t('noCompanionsMessage')}</p>
                </div>
              ) : (
                <div className="companions-grid">
                  {filteredCompanions.map((companion) => (
                    <CompanionCard
                      key={companion.id}
                      companion={companion}
                      type="requested"
                      onCancel={() => {/* Handle cancel */}}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
