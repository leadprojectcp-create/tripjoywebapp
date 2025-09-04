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
  
  // 모바일 모달 상태
  const [isMobile, setIsMobile] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [tempSelectedCountry, setTempSelectedCountry] = useState(selectedCountry);
  const [tempSelectedCity, setTempSelectedCity] = useState(selectedCity);
  const [modalCountries, setModalCountries] = useState<Country[]>([]);
  const [modalCities, setModalCities] = useState<City[]>([]);
  const [loadingModalCountries, setLoadingModalCountries] = useState(false);
  const [loadingModalCities, setLoadingModalCities] = useState(false);

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 480);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // 모바일 모달 관련 함수들
  const handleTitleClick = () => {
    if (!isMobile) return;
    
    setTempSelectedCountry(currentCountry);
    setTempSelectedCity(currentCity);
    setIsLocationModalOpen(true);
    loadModalCountries();
    
    if (currentCountry) {
      loadModalCities(currentCountry);
    }
  };

  const loadModalCountries = async () => {
    setLoadingModalCountries(true);
    try {
      const response = await fetch('/data/countries.json');
      const data = await response.json();
      setModalCountries(data.countries || []);
    } catch (error) {
      console.error('❌ Modal 국가 데이터 로드 실패:', error);
    } finally {
      setLoadingModalCountries(false);
    }
  };

  const loadModalCities = async (countryCode: string) => {
    if (!countryCode) {
      setModalCities([]);
      return;
    }

    setLoadingModalCities(true);
    try {
      const selectedCountryData = modalCountries.find(c => c.code === countryCode);
      if (!selectedCountryData) return;

      const countryFileMap: Record<string, string> = {
        'ko': 'kr', 'en': 'us', 'vi': 'vn', 'zh': 'cn',
        'ja': 'jp', 'th': 'th', 'fil': 'ph'
      };

      const fileName = countryFileMap[selectedCountryData.name];
      if (!fileName) return;

      const response = await fetch(`/data/cities-${fileName}.json`);
      const data = await response.json();
      setModalCities(data.cities || []);
    } catch (error) {
      console.error('❌ Modal 도시 데이터 로드 실패:', error);
      setModalCities([]);
    } finally {
      setLoadingModalCities(false);
    }
  };

  const handleTempCountrySelect = (countryCode: string) => {
    setTempSelectedCountry(countryCode);
    setTempSelectedCity('');
    
    if (countryCode) {
      loadModalCities(countryCode);
    } else {
      setModalCities([]);
    }
  };

  const handleTempCitySelect = (cityCode: string) => {
    setTempSelectedCity(cityCode);
  };

  const handleApplySelection = () => {
    setCurrentCountry(tempSelectedCountry);
    setCurrentCity(tempSelectedCity);
    onSelectionChange(tempSelectedCountry, tempSelectedCity);
    setIsLocationModalOpen(false);
  };

  const handleCancelSelection = () => {
    setTempSelectedCountry(currentCountry);
    setTempSelectedCity(currentCity);
    setIsLocationModalOpen(false);
  };

  const getSelectedLocationText = () => {
    if (!currentCountry && !currentCity) {
      return t('whereToGo');
    }

    const country = countries.find(c => c.code === currentCountry);
    const city = cities.find(c => c.code === currentCity);
    
    const countryName = country?.names[currentLanguage] || country?.names['en'] || '';
    const cityName = city?.names[currentLanguage] || city?.names['en'] || '';

    if (countryName && cityName) {
      return `${countryName} | ${cityName}`;
    } else if (countryName) {
      return countryName;
    } else {
      return t('whereToGo');
    }
  };

  return (
    <>
      {isMobile ? (
        // 모바일: 클릭 가능한 타이틀
        <div className="mobile-title" onClick={handleTitleClick}>
          <img src="/icons/location_pin.svg" alt="location" width={24} height={24} />
          {getSelectedLocationText()}
          <img src="/icons/stat_minus.svg" alt="dropdown" width={20} height={20} />
        </div>
      ) : (
        // PC: 제목 + 드롭다운
        <div>
          <h1 className="pc-main-title">
            <img src="/icons/location_pin.svg" alt="location" width={24} height={24} />
            {t('whereToGo')}
          </h1>
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
                          <span>{getCountryFlag(currentCountry)}</span>
                          <span>{getSelectedCountryName()}</span>
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
                          <span>{getCountryFlag(country.code)}</span>
                          <span>{country.names[currentLanguage] || country.names['en']}</span>
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
        </div>
      )}

      {/* 모바일 모달 */}
      {isMobile && isLocationModalOpen && (
        <div className="location-modal-overlay" onClick={handleCancelSelection}>
          <div className={`location-modal ${isLocationModalOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <img src="/icons/location_pin.svg" alt="location" width={20} height={20} />
                {t('whereToGo')}
              </h3>
              <button className="modal-close" onClick={handleCancelSelection}>×</button>
            </div>
            
            <div className="modal-content">
              <div className="modal-section">
                <h4 className="modal-section-title">{t('allCountries')}</h4>
                <div className="modal-list">
                  {loadingModalCountries ? (
                    <div className="modal-loading">{t('loading')}</div>
                  ) : (
                    <>
                      <button
                        className={`modal-list-item ${tempSelectedCountry === '' ? 'selected' : ''}`}
                        onClick={() => handleTempCountrySelect('')}
                      >
                        <div className="modal-list-item-content">
                          <span className="modal-list-left">전체</span>
                        </div>
                        <img src="/icons/check.svg" alt="selected" width={24} height={24} className="check-icon"/>
                      </button>
                      {modalCountries.map((country) => (
                        <button
                          key={country.code}
                          className={`modal-list-item ${tempSelectedCountry === country.code ? 'selected' : ''}`}
                          onClick={() => handleTempCountrySelect(country.code)}
                        >
                          <div className="modal-list-item-content">
                            <span className="modal-list-left">
                              {getCountryFlag(country.code)} {country.names[currentLanguage] || country.names['en']}
                            </span>
                          </div>
                          <img src="/icons/check.svg" alt="selected" width={24} height={24} className="check-icon"/>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
              
              <div className="modal-section">
                <h4 className="modal-section-title">{t('allCities')}</h4>
                <div className="modal-list">
                  {!tempSelectedCountry ? (
                    <div className="modal-placeholder">{t('selectCountryFirst')}</div>
                  ) : loadingModalCities ? (
                    <div className="modal-loading">{t('loading')}</div>
                  ) : (
                    <>
                      <button
                        className={`modal-list-item ${tempSelectedCity === '' && tempSelectedCountry ? 'selected' : ''}`}
                        onClick={() => handleTempCitySelect('')}
                      >
                        <div className="modal-list-item-content">
                          <span className="modal-list-left">전체</span>
                        </div>
                        <img src="/icons/check.svg" alt="selected" width={24} height={24} className="check-icon"/>
                      </button>
                      {modalCities.map((city) => (
                        <button
                          key={city.code}
                          className={`modal-list-item ${tempSelectedCity === city.code ? 'selected' : ''}`}
                          onClick={() => handleTempCitySelect(city.code)}
                        >
                          <div className="modal-list-item-content">
                            <span className="modal-list-left">{city.names[currentLanguage] || city.names['en']}</span>
                          </div>
                          <img src="/icons/check.svg" alt="selected" width={24} height={24} className="check-icon"/>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="modal-buttons">
              <button className="modal-button apply-button" onClick={handleApplySelection}>적용</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CountryAndCitySelector;