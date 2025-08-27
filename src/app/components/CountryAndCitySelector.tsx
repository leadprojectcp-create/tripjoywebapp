'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslationContext } from '../contexts/TranslationContext';
import './CountryAndCitySelector.css';

interface Country {
  code: string;
  name: string;
  names: Record<string, string>;
}

interface City {
  code: string;
  names: Record<string, string>;
}

interface CountryAndCitySelectorProps {
  selectedCountry?: string;
  selectedCity?: string;
  onSelectionChange: (countryCode: string, cityCode: string) => void;
  className?: string;
}

const CountryAndCitySelector: React.FC<CountryAndCitySelectorProps> = ({
  selectedCountry = '',
  selectedCity = '',
  onSelectionChange,
  className = ''
}) => {
  const { t, currentLanguage } = useTranslationContext();
  
  // States
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [currentCountry, setCurrentCountry] = useState(selectedCountry);
  const [currentCity, setCurrentCity] = useState(selectedCity);
  
  // 커스텀 드롭다운 상태
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  
  // 드롭다운 refs
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  // Load countries on component mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await fetch('/data/countries.json');
        const data = await response.json();
        setCountries(data.countries || []);
      } catch (error) {
        console.error('❌ 국가 데이터 로드 실패:', error);
      } finally {
        setLoadingCountries(false);
      }
    };

    loadCountries();
  }, []);

  // Load cities when country changes
  useEffect(() => {
    const loadCities = async (countryName: string) => {
      if (!countryName) {
        setCities([]);
        return;
      }

      setLoadingCities(true);
      try {
        // Map country names to file names
        const countryFileMap: Record<string, string> = {
          'ko': 'kr',
          'en': 'us',
          'vi': 'vn',
          'zh': 'cn',
          'ja': 'jp',
          'th': 'th',
          'fil': 'ph'
        };

        const fileName = countryFileMap[countryName];
        if (!fileName) {
          console.error('❌ 지원되지 않는 국가:', countryName);
          setCities([]);
          return;
        }

        const response = await fetch(`/data/cities-${fileName}.json`);
        const data = await response.json();
        setCities(data.cities || []);
      } catch (error) {
        console.error('❌ 도시 데이터 로드 실패:', error);
        setCities([]);
      } finally {
        setLoadingCities(false);
      }
    };

    if (currentCountry) {
      const selectedCountryData = countries.find(c => c.code === currentCountry);
      if (selectedCountryData) {
        loadCities(selectedCountryData.name);
      }
    } else {
      setCities([]);
    }
  }, [currentCountry, countries]);

  // Handle country selection change
  const handleCountryChange = (countryCode: string) => {
    setCurrentCountry(countryCode);
    setCurrentCity(''); // Reset city selection when country changes
    
    onSelectionChange(countryCode, '');
  };

  // Handle city selection change
  const handleCityChange = (cityCode: string) => {
    setCurrentCity(cityCode);
    
    if (currentCountry) {
      onSelectionChange(currentCountry, cityCode);
    }
  };

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setIsCityDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 커스텀 드롭다운 핸들러들
  const handleCountrySelect = (countryCode: string) => {
    handleCountryChange(countryCode);
    setIsCountryDropdownOpen(false);
  };

  const handleCitySelect = (cityCode: string) => {
    handleCityChange(cityCode);
    setIsCityDropdownOpen(false);
  };

  // 선택된 국가/도시 이름 가져오기
  const getSelectedCountryName = () => {
    if (!currentCountry) return '';
    const country = countries.find(c => c.code === currentCountry);
    return country?.names[currentLanguage] || country?.names['en'] || '';
  };

  const getSelectedCityName = () => {
    if (!currentCity) return '';
    const city = cities.find(c => c.code === currentCity);
    return city?.names[currentLanguage] || city?.names['en'] || '';
  };

  // 국가별 국기 이모지
  const getCountryFlag = (countryCode: string) => {
    const flagMap: Record<string, string> = {
      'KR': '🇰🇷',
      'US': '🇺🇸', 
      'VN': '🇻🇳',
      'CN': '🇨🇳',
      'JP': '🇯🇵',
      'TH': '🇹🇭',
      'PH': '🇵🇭'
    };
    return flagMap[countryCode] || '🌍';
  };

  return (
    <div className={`country-city-selector ${className}`}>
      {/* Country Selector */}
      <div className="selector-group" ref={countryDropdownRef}>
        <div className="custom-dropdown">
          <button
            type="button"
            className={`dropdown-trigger ${isCountryDropdownOpen ? 'open' : ''}`}
            onClick={() => !loadingCountries && setIsCountryDropdownOpen(!isCountryDropdownOpen)}
            disabled={loadingCountries}
          >
            <span className="dropdown-text">
              {currentCountry && getSelectedCountryName() 
                ? (
                  <span className="country-with-flag">
                    {getCountryFlag(currentCountry)} {getSelectedCountryName()}
                  </span>
                )
                : (
                  <span className="all-option">
                    {loadingCountries ? t('loading') : t('allCountries')}
                  </span>
                )
              }
            </span>
            <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {isCountryDropdownOpen && !loadingCountries && (
            <div className="dropdown-menu">
              <button
                type="button"
                className={`dropdown-item ${currentCountry === '' ? 'selected' : ''}`}
                onClick={() => handleCountrySelect('')}
              >
                <span className="all-option">
                  {t('allCountries')}
                </span>
              </button>
              {countries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  className={`dropdown-item ${currentCountry === country.code ? 'selected' : ''}`}
                  onClick={() => handleCountrySelect(country.code)}
                >
                  <span className="country-with-flag">
                    {getCountryFlag(country.code)} {country.names[currentLanguage] || country.names['en']}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* City Selector */}
      <div className="selector-group" ref={cityDropdownRef}>
        <div className="custom-dropdown">
          <button
            type="button"
            className={`dropdown-trigger ${isCityDropdownOpen ? 'open' : ''}`}
            onClick={() => (!currentCountry || loadingCities) ? null : setIsCityDropdownOpen(!isCityDropdownOpen)}
            disabled={!currentCountry || loadingCities}
          >
            <span className="dropdown-text">
              {currentCity && getSelectedCityName()
                ? getSelectedCityName()
                : (
                  <span className="all-option">
                    {!currentCountry 
                      ? t('selectCountryFirst') 
                      : loadingCities 
                      ? t('loading') 
                      : t('allCities')
                    }
                  </span>
                )
              }
            </span>
            <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {isCityDropdownOpen && currentCountry && !loadingCities && (
            <div className="dropdown-menu">
              <button
                type="button"
                className={`dropdown-item ${currentCity === '' ? 'selected' : ''}`}
                onClick={() => handleCitySelect('')}
              >
                <span className="all-option">
                  {t('allCities')}
                </span>
              </button>
              {cities.map((city) => (
                <button
                  key={city.code}
                  type="button"
                  className={`dropdown-item ${currentCity === city.code ? 'selected' : ''}`}
                  onClick={() => handleCitySelect(city.code)}
                >
                  {city.names[currentLanguage] || city.names['en']}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CountryAndCitySelector;
