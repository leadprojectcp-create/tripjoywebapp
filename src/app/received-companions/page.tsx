'use client';

import React, { useState, useEffect } from 'react';
import { useTranslationContext } from '../contexts/TranslationContext';
import { useAuthContext } from '../contexts/AuthContext';
import { CompanionCard } from '../components/CompanionCard';
import { getReceivedCompanionRequests, CompanionRequest } from '../services/companionRequestService';
import { AppBar } from '../components/AppBar';
import { Sidebar } from '../components/Sidebar';
import { AuthGuard } from '../components/AuthGuard';
import './style.css';

export default function ReceivedCompanionsPage() {
  const { t } = useTranslationContext();
  const { user } = useAuthContext();
  const [companions, setCompanions] = useState<CompanionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'past'>('pending');

  useEffect(() => {
    const fetchCompanions = async () => {
      if (!user?.uid) return;
      
      try {
        setLoading(true);
        const companionsData = await getReceivedCompanionRequests(user.uid);
        setCompanions(companionsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load companions');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanions();
  }, [user?.uid]);

  const filteredCompanions = companions.filter(companion => {
    switch (activeTab) {
      case 'pending':
        return companion.status === 'pending';
      case 'confirmed':
        return companion.status === 'accepted';
      case 'past':
        return companion.status === 'rejected' || companion.status === 'cancelled';
      default:
        return true;
    }
  });

  return (
    <AuthGuard>
      <div className="received-companions-page">
        <AppBar />
        <div className="body-content">
          <Sidebar />
          <div className="received-companions-main-content">
            <div className="received-companions-content">
              <div className="received-companions-header">
                <h1>{t('receivedCompanions')}</h1>
                <p>{t('receivedCompanionsDescription')}</p>
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
                      type="received"
                      onAccept={() => {/* Handle accept */}}
                      onReject={() => {/* Handle reject */}}
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
