"use client";

import React, { useState, useEffect, useRef } from "react";
import { Country, getCountryNameByLanguage } from "../services/countryService";
import { useTranslationContext } from "../contexts/TranslationContext";
import "./CountrySelector.css";

interface CountrySelectorProps {
  countries: Country[];
  value: string;
  onChange: (countryCode: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
}

export const CountrySelector = ({ 
  countries, 
  value, 
  onChange, 
  placeholder = "국가를 선택해주세요",
  disabled = false,
  error = false
}: CountrySelectorProps): React.JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { currentLanguage } = useTranslationContext();

  // 선택된 국가 찾기
  const selectedCountry = countries.find(country => country.code === value);

  // 검색 필터링된 국가 목록
  const filteredCountries = countries.filter(country => {
    const translatedName = getCountryNameByLanguage(country, currentLanguage);
    return (
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.nativeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      translatedName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 드롭다운 위치 계산
  const calculateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  // 드롭다운 열기/닫기
  const toggleDropdown = () => {
    if (!disabled) {
      if (!isOpen) {
        calculateDropdownPosition();
      }
      setIsOpen(!isOpen);
      if (!isOpen) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    }
  };

  // 국가 선택
  const handleCountrySelect = (country: Country) => {
    onChange(country.code);
    setIsOpen(false);
    setSearchTerm("");
  };

  // 검색어 변경
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className={`country-selector ${error ? 'error' : ''}`} ref={dropdownRef}>
      <div 
        ref={buttonRef}
        className={`country-selector-button ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={toggleDropdown}
      >
        <div className="selected-country">
          {selectedCountry ? (
            <>
              <span className="country-flag">{selectedCountry.flag}</span>
              <span className="country-name">
                {getCountryNameByLanguage(selectedCountry, currentLanguage)}
              </span>
            </>
          ) : (
            <span className="placeholder">{placeholder}</span>
          )}
        </div>
        <div className="dropdown-arrow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {isOpen && (
        <div 
          className="country-dropdown"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width
          }}
        >
          <div className="search-container">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="국가 검색..."
              className="country-search"
            />
          </div>
          <div className="country-list">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <div
                  key={country.code}
                  className={`country-option ${value === country.code ? 'selected' : ''}`}
                  onClick={() => handleCountrySelect(country)}
                >
                  <span className="country-flag">{country.flag}</span>
                  <div className="country-info">
                    <span className="country-name">
                      {getCountryNameByLanguage(country, currentLanguage)}
                    </span>
                    {country.nativeName !== country.name && (
                      <span className="country-native-name">{country.nativeName}</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results">검색 결과가 없습니다</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
