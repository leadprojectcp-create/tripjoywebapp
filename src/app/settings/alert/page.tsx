'use client';

import { useState, useEffect } from 'react';
import { useTranslationContext } from '../../contexts/TranslationContext';
import { useAuth } from '../../hooks/useAuth';
import { getMyPostAlerts, AlertItem, formatAlertTime } from '../../services/alertService';
import { AppBar } from '../../components/AppBar';
import { Sidebar } from '../../components/Sidebar';
import { AuthGuard } from '../../components/AuthGuard';
import './style.css';

export default function AlertPage() {
  const { user } = useAuth();
  const { t } = useTranslationContext();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      loadAlerts();
    }
  }, [user]);

  const loadAlerts = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      const alertData = await getMyPostAlerts(user.uid);
      setAlerts(alertData);
    } catch (error) {
      console.error('알림 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertMessage = (alert: AlertItem) => {
    const messageKey = alert.type === 'like' 
      ? 'likeMessage' 
      : 'bookmarkMessage';
    
    return t(messageKey).replace('{userName}', alert.userName);
  };

  return (
    <AuthGuard>
      <div className="alert-page">
        <AppBar />
        <div className="body-content">
          <Sidebar />
          <div className="alert-main-content">
            <div className="alert-content">
              <div className="alert-header">
                <h1>{t('alertTitle')}</h1>
              </div>

              <div className="alert-list-container">
                {loading ? (
                  <div className="alert-loading">
                    <div className="loading-spinner"></div>
                    <p>{t('loading')}</p>
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="alert-empty">
                    <div className="empty-icon">🔔</div>
                    <p>{t('noAlerts')}</p>
                  </div>
                ) : (
                  <div className="alert-list">
                    {alerts.map((alert: AlertItem) => (
                      <div key={alert.id} className="alert-item">
                        <div className="alert-user-info">
                          {alert.userProfileImage ? (
                            <img 
                              src={alert.userProfileImage} 
                              alt={alert.userName}
                              className="user-avatar"
                            />
                          ) : (
                            <div className="user-avatar-placeholder">
                              {alert.userName.charAt(0)}
                            </div>
                          )}
                        </div>

                        <div className="alert-content-info">
                          <div className="alert-message">
                            {getAlertMessage(alert)}
                          </div>
                          <div className="alert-time">
                            {formatAlertTime(alert.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
