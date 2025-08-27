'use client';

import React, { useState } from 'react';
import { useTranslationContext } from '../contexts/TranslationContext';
import './CompanionCard.css';

interface CompanionCardProps {
  companion: {
    id: string;
    senderId: string;
    senderName: string;
    receiverId: string;
    receiverName?: string;
    hotelName: string;
    location: string;
    country: string;
    city: string;
    dateRequested: string;
    timeRequested: string;
    region: string;
    status: 'pending' | 'accepted' | 'rejected' | 'past';
    createdAt: any;
  };
  type: 'received' | 'requested';
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
}

export function CompanionCard({ companion, type, onAccept, onReject, onCancel }: CompanionCardProps) {
  const { t } = useTranslationContext();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  const handleAccept = async () => {
    if (onAccept && !isAccepting) {
      setIsAccepting(true);
      try {
        await onAccept();
      } finally {
        setIsAccepting(false);
      }
    }
  };

  const handleReject = async () => {
    if (onReject && !isRejecting) {
      setIsRejecting(true);
      try {
        await onReject();
      } finally {
        setIsRejecting(false);
      }
    }
  };

  const handleCancel = async () => {
    if (onCancel && !isCanceling) {
      setIsCanceling(true);
      try {
        await onCancel();
      } finally {
        setIsCanceling(false);
      }
    }
  };

  const getStatusText = () => {
    switch (companion.status) {
      case 'pending':
        return t('statusPending');
      case 'accepted':
        return t('statusAccepted');
      case 'rejected':
        return t('statusRejected');
      case 'past':
        return t('statusPast');
      default:
        return companion.status;
    }
  };

  const getStatusClass = () => {
    switch (companion.status) {
      case 'pending':
        return 'status-pending';
      case 'accepted':
        return 'status-accepted';
      case 'rejected':
        return 'status-rejected';
      case 'past':
        return 'status-past';
      default:
        return '';
    }
  };

  return (
    <div className="companion-card">
      {/* 상태 배지 */}
      <div className={`status-badge ${getStatusClass()}`}>
        {getStatusText()}
      </div>

      {/* 호텔 정보 */}
      <div className="companion-header">
        <div className="hotel-image-placeholder">
          img
        </div>
        <div className="companion-info">
          <div className="location-pin">📍</div>
          <h3 className="hotel-name">{companion.hotelName}</h3>
          <p className="hotel-location">{companion.location}</p>
          <div className="companion-from">
            {type === 'received' ? (
              <span>{t('from')}: {companion.senderName}</span>
            ) : (
              <span>{t('to')}: {companion.receiverName || t('unknown')}</span>
            )}
          </div>
        </div>
      </div>

      {/* 체크박스 옵션들 */}
      <div className="companion-options">
        <div className="option-item">
          <input type="checkbox" id={`date-${companion.id}`} defaultChecked />
          <label htmlFor={`date-${companion.id}`}>{t('companionDate')}</label>
        </div>
        <div className="option-item">
          <input type="radio" name={`time-${companion.id}`} id={`reservation-${companion.id}`} defaultChecked />
          <label htmlFor={`reservation-${companion.id}`}>{t('reservationTime')}</label>
        </div>
        <div className="option-item">
          <input type="radio" name={`time-${companion.id}`} id={`meal-${companion.id}`} />
          <label htmlFor={`meal-${companion.id}`}>{t('mealTime')}</label>
        </div>
        <div className="option-item">
          <input type="checkbox" id={`region-${companion.id}`} defaultChecked />
          <label htmlFor={`region-${companion.id}`}>{t('companionRegion')}</label>
        </div>
      </div>

      {/* 신청소식 */}
      <div className="application-info">
        <span className="info-label">{t('applicationNews')}</span>
      </div>

      {/* 액션 버튼들 */}
      <div className="companion-actions">
        {type === 'received' && companion.status === 'pending' && (
          <>
            <button 
              className="action-btn reject-btn"
              onClick={handleReject}
              disabled={isRejecting}
            >
              {isRejecting ? t('rejecting') : t('reject')}
            </button>
            <button 
              className="action-btn accept-btn"
              onClick={handleAccept}
              disabled={isAccepting}
            >
              {isAccepting ? t('accepting') : t('accept')}
            </button>
          </>
        )}
        
        {type === 'requested' && companion.status === 'pending' && (
          <button 
            className="action-btn cancel-btn"
            onClick={handleCancel}
            disabled={isCanceling}
          >
            {isCanceling ? t('canceling') : t('cancel')}
          </button>
        )}

        {companion.status === 'accepted' && (
          <div className="accepted-message">
            <span className="success-icon">✓</span>
            {t('companionAccepted')}
          </div>
        )}

        {companion.status === 'rejected' && (
          <div className="rejected-message">
            <span className="error-icon">✗</span>
            {t('companionRejected')}
          </div>
        )}
      </div>
    </div>
  );
}
