'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useTranslationContext } from '../contexts/TranslationContext';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 임시 SVG 아이콘들
const NotificationIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="currentColor"/>
  </svg>
);

const CustomerServiceIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
  </svg>
);

const FAQIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" fill="currentColor"/>
  </svg>
);

const NoticeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
  </svg>
);

const BlockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z" fill="currentColor"/>
  </svg>
);

const ReportIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor"/>
  </svg>
);

const VersionIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2.5-9H19v2h-1.5v17.5c0 .83-.67 1.5-1.5 1.5H8c-.83 0-1.5-.67-1.5-1.5V4H5V2h4.5V.5c0-.83.67-1.5 1.5-1.5h3c.83 0 1.5.67 1.5 1.5V2h4.5z" fill="currentColor"/>
  </svg>
);

const DeleteAccountIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
  </svg>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslationContext();
  const router = useRouter();

  if (!isOpen) return null;

  const settingsItems = [
    { id: 'notifications', label: t('notifications'), icon: <NotificationIcon /> },
    { id: 'customer-service', label: t('customerService'), icon: <CustomerServiceIcon /> },
    { id: 'faq', label: t('faq'), icon: <FAQIcon /> },
    { id: 'notice', label: t('notice'), icon: <NoticeIcon /> },
    { id: 'delete-account', label: t('deleteAccount'), icon: <DeleteAccountIcon /> },
    { id: 'version', label: t('version'), icon: <VersionIcon /> },
  ];

  const handleItemClick = (itemId: string) => {
    console.log('설정 항목 클릭:', itemId);
    
    if (itemId === 'notifications') {
      onClose(); // 모달 먼저 닫기
      router.push('/settings/alert');
    } else if (itemId === 'notice') {
      onClose(); // 모달 먼저 닫기
      router.push('/settings/notice');
    } else if (itemId === 'faq') {
      onClose(); // 모달 먼저 닫기
      router.push('/settings/faq');
    } else {
      // TODO: 각 설정 항목별 기능 구현
    }
  };

  const modalContent = (
    <>
      {/* 배경 오버레이 */}
      <div className="settings-modal-overlay" onClick={onClose} />
      
      {/* 모달 컨텐츠 */}
      <div className="settings-modal">
        <div className="settings-modal-header">
          <h3>{t('settings')}</h3>
          <button className="settings-modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="settings-modal-content">
          {settingsItems.map((item) => (
            <div
              key={item.id}
              className="settings-item"
              data-id={item.id}
              onClick={() => handleItemClick(item.id)}
            >
              <div className="settings-item-icon">
                {item.icon}
              </div>
              <span className="settings-item-label">
                {item.label}
              </span>
              <div className="settings-item-arrow">
                {item.id === 'version' ? (
                  <span className="version-number">0.1.0</span>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor"/>
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  // 브라우저 환경에서만 포털 사용
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};
