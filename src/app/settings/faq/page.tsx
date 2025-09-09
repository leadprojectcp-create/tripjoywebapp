'use client';

import { useState, useEffect } from 'react';
import { useTranslationContext } from '../../contexts/TranslationContext';
import { 
  getFAQs, 
  getFAQsByCategory, 
  searchFAQs,
  FAQItem, 
  getCategoryIcon,
  getCategoryKey
} from '../../services/faqService';
import { AppBar } from '../../components/AppBar';


import './style.css';

export default function FAQPage() {
  const { t } = useTranslationContext();
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | FAQItem['category']>('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadFAQs();
  }, [filter]);

  const loadFAQs = async () => {
    try {
      setLoading(true);
      let faqData: FAQItem[];
      
      if (searchTerm.trim()) {
        faqData = await searchFAQs(searchTerm);
      } else if (filter === 'all') {
        faqData = await getFAQs();
      } else {
        faqData = await getFAQsByCategory(filter);
      }
      
      setFaqs(faqData);
    } catch (error) {
      console.error('FAQ 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchTerm.trim()) {
      setFilter('all');
      loadFAQs();
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setFilter('all');
    loadFAQs();
  };

  const toggleFAQExpand = (faqId: string) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
  };

  const getCategoryName = (category: FAQItem['category']) => {
    return t(getCategoryKey(category));
  };

  return (
    
      <div className="faq-page">
        <AppBar />
        <div className="body-content">
          
          <div className="faq-main-content">
            <div className="faq-content">
              <div className="faq-header">
                <h1>{t('faqTitle')}</h1>
                <p>{t('description')}</p>
              </div>

              {/* 검색바 */}
              <div className="faq-search">
                <div className="search-input-group">
                  <input
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    className="search-input"
                  />
                  <button 
                    onClick={handleSearch}
                    className="search-button"
                  >
                    🔍
                  </button>
                  {searchTerm && (
                    <button 
                      onClick={clearSearch}
                      className="clear-button"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* 필터 탭 메뉴 */}
              <div className="faq-filter-tabs">
                <button 
                  className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  {t('filterAll')}
                </button>
                <button 
                  className={`filter-tab ${filter === 'general' ? 'active' : ''}`}
                  onClick={() => setFilter('general')}
                >
                  {t('filterGeneral')}
                </button>
                <button 
                  className={`filter-tab ${filter === 'account' ? 'active' : ''}`}
                  onClick={() => setFilter('account')}
                >
                  {t('filterAccount')}
                </button>
                <button 
                  className={`filter-tab ${filter === 'travel' ? 'active' : ''}`}
                  onClick={() => setFilter('travel')}
                >
                  {t('filterTravel')}
                </button>
                <button 
                  className={`filter-tab ${filter === 'technical' ? 'active' : ''}`}
                  onClick={() => setFilter('technical')}
                >
                  {t('filterTechnical')}
                </button>
                <button 
                  className={`filter-tab ${filter === 'safety' ? 'active' : ''}`}
                  onClick={() => setFilter('safety')}
                >
                  {t('filterSafety')}
                </button>
              </div>

              <div className="faq-list-container">
                {loading ? (
                  <div className="faq-loading">
                    <div className="loading-spinner"></div>
                    <p>{t('loading')}</p>
                  </div>
                ) : faqs.length === 0 ? (
                  <div className="faq-empty">
                    <div className="empty-icon">❓</div>
                    <p>{searchTerm ? t('noSearchResults') : t('empty')}</p>
                    {searchTerm && (
                      <button onClick={clearSearch} className="clear-search-btn">
                        {t('clearSearch')}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="faq-list">
                    {faqs.map((faq) => (
                      <div key={faq.id} className="faq-item">
                        <div 
                          className="faq-item-header"
                          onClick={() => toggleFAQExpand(faq.id)}
                        >
                          <div className="faq-left">
                            <div className="faq-category-icon">
                              {getCategoryIcon(faq.category)}
                            </div>
                            <div className="faq-info">
                              <div className="faq-question">
                                {faq.question}
                              </div>
                              <div className="faq-meta">
                                <span className="faq-category">
                                  {getCategoryName(faq.category)}
                                </span>
                                {faq.tags && faq.tags.length > 0 && (
                                  <div className="faq-tags">
                                    {faq.tags.slice(0, 3).map((tag, index) => (
                                      <span key={index} className="faq-tag">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="faq-expand-icon">
                            {expandedFAQ === faq.id ? '▲' : '▼'}
                          </div>
                        </div>
                        
                        {expandedFAQ === faq.id && (
                          <div className="faq-answer-expanded">
                            <div className="faq-answer-text">
                              {faq.answer.split('\n').map((line, index) => (
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
