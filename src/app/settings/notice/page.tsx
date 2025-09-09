'use client';

import { useState, useEffect } from 'react';
import { useTranslationContext } from '../../contexts/TranslationContext';
import { 
  getNotices, 
  getNoticesByCategory, 
  NoticeItem, 
  formatNoticeTime,
  getCategoryIcon,
  getImportanceIcon
} from '../../services/noticeService';
import { AppBar } from '../../components/AppBar';


import './style.css';

export default function NoticePage() {
  const { t } = useTranslationContext();
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'update' | 'maintenance' | 'event' | 'general'>('all');
  const [expandedNotice, setExpandedNotice] = useState<string | null>(null);

  useEffect(() => {
    loadNotices();
  }, [filter]);

  const loadNotices = async () => {
    try {
      setLoading(true);
      let noticeData: NoticeItem[];
      
      if (filter === 'all') {
        noticeData = await getNotices();
      } else {
        noticeData = await getNoticesByCategory(filter);
      }
      
      setNotices(noticeData);
    } catch (error) {
      console.error('공지사항 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNoticeExpand = (noticeId: string) => {
    setExpandedNotice(expandedNotice === noticeId ? null : noticeId);
  };

  const getCategoryName = (category: NoticeItem['category']) => {
    const categoryMap = {
      update: t('categoryUpdate'),
      maintenance: t('categoryMaintenance'), 
      event: t('categoryEvent'),
      general: t('categoryGeneral')
    };
    return categoryMap[category];
  };

  return (
    
      <div className="notice-page">
        <AppBar />
        <div className="body-content">
          
          <div className="notice-main-content">
            <div className="notice-content">
              <div className="notice-header">
                <h1>{t('noticeTitle')}</h1>
                <p>{t('description')}</p>
              </div>

              {/* 필터 탭 메뉴 */}
              <div className="notice-filter-tabs">
                <button 
                  className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  {t('filterAll')}
                </button>
                <button 
                  className={`filter-tab ${filter === 'update' ? 'active' : ''}`}
                  onClick={() => setFilter('update')}
                >
                  {t('filterUpdate')}
                </button>
                <button 
                  className={`filter-tab ${filter === 'maintenance' ? 'active' : ''}`}
                  onClick={() => setFilter('maintenance')}
                >
                  {t('filterMaintenance')}
                </button>
                <button 
                  className={`filter-tab ${filter === 'event' ? 'active' : ''}`}
                  onClick={() => setFilter('event')}
                >
                  {t('filterEvent')}
                </button>
                <button 
                  className={`filter-tab ${filter === 'general' ? 'active' : ''}`}
                  onClick={() => setFilter('general')}
                >
                  {t('filterGeneral')}
                </button>
              </div>

              <div className="notice-list-container">
                {loading ? (
                  <div className="notice-loading">
                    <div className="loading-spinner"></div>
                    <p>{t('loading')}</p>
                  </div>
                ) : notices.length === 0 ? (
                  <div className="notice-empty">
                    <div className="empty-icon">📄</div>
                    <p>{t('empty')}</p>
                  </div>
                ) : (
                  <div className="notice-list">
                    {notices.map((notice) => (
                      <div key={notice.id} className="notice-item">
                        <div 
                          className="notice-item-header"
                          onClick={() => toggleNoticeExpand(notice.id)}
                        >
                          <div className="notice-left">
                            <div className="notice-category-icon">
                              {getCategoryIcon(notice.category)}
                              {getImportanceIcon(notice.importance)}
                            </div>
                            <div className="notice-info">
                              <div className="notice-title">
                                {notice.title}
                              </div>
                              <div className="notice-meta">
                                <span className="notice-category">
                                  {getCategoryName(notice.category)}
                                </span>
                                <span className="notice-date">
                                  {formatNoticeTime(notice.createdAt)}
                                </span>
                                <span className="notice-author">
                                  {notice.author}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="notice-expand-icon">
                            {expandedNotice === notice.id ? '▲' : '▼'}
                          </div>
                        </div>
                        
                        {expandedNotice === notice.id && (
                          <div className="notice-content-expanded">
                            <div className="notice-content-text">
                              {notice.content.split('\n').map((line, index) => (
                                <p key={index}>{line}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    
  );
}
