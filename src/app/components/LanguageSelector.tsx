"use client";

import React, { useState } from "react";
import "./LanguageSelector.css";

interface LanguageSelectorProps {
  currentLanguage: string;
  onLanguageChange: (language: 'ko' | 'en' | 'vi' | 'zh' | 'ja' | 'th' | 'fil') => void;
  dropdownDirection?: 'up' | 'down';
}

export const LanguageSelector = ({ currentLanguage, onLanguageChange, dropdownDirection = 'up' }: LanguageSelectorProps): React.JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);
  
  const languages = [
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'th', name: 'ไทย', flag: '🇹🇭' },
    { code: 'fil', name: 'Filipino', flag: '🇵🇭' }
  ];

  const handleLanguageChange = (languageCode: 'ko' | 'en' | 'vi' | 'zh' | 'ja' | 'th' | 'fil') => {
    onLanguageChange(languageCode);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="language-selector">
      <div className="language-dropdown">
        <button className="language-button" onClick={toggleDropdown}>
          <span className="flag">{languages.find(lang => lang.code === currentLanguage)?.flag}</span>
          <span className="language-name">{languages.find(lang => lang.code === currentLanguage)?.name}</span>
          <span className={`arrow ${isOpen ? 'rotated' : ''} ${dropdownDirection}`}>
            {dropdownDirection === 'down' ? '▼' : '▲'}
          </span>
        </button>
        <div className={`language-options ${isOpen ? 'open' : ''} ${dropdownDirection}`}>
          {languages.map((language) => (
            <button
              key={language.code}
              className={`language-option ${currentLanguage === language.code ? 'active' : ''}`}
              onClick={() => handleLanguageChange(language.code as 'ko' | 'en' | 'vi' | 'zh' | 'ja' | 'th' | 'fil')}
            >
              <span className="flag">{language.flag}</span>
              <span className="language-name">{language.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
