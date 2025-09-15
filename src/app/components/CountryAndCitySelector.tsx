'use client';

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { useTranslationContext } from '../contexts/TranslationContext';
import styles from './CountryAndCitySelector.module.css';

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
  onLocationTextChange?: (text: string) => void;
  className?: string;
  variant?: 'pc' | 'mobile';
  renderTrigger?: boolean; // 트리거 UI(타이틀) 노출 여부
}

export interface CountryAndCitySelectorRef {
  openMobileModal: () => void;
}

const CountryAndCitySelector = forwardRef<CountryAndCitySelectorRef, CountryAndCitySelectorProps>(({ 
  selectedCountry = '',
  selectedCity = '',
  onSelectionChange,
  onLocationTextChange,
  className = '',
  variant = 'pc',
  renderTrigger = true
}, ref) => {
  const { t, currentLanguage } = useTranslationContext();
  
  // States
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [currentCountry, setCurrentCountry] = useState(selectedCountry);
  const [currentCity, setCurrentCity] = useState(selectedCity);

  // props가 변경될 때 내부 상태 업데이트
  useEffect(() => {
    setCurrentCountry(selectedCountry);
    setCurrentCity(selectedCity);
  }, [selectedCountry, selectedCity]);

  // 로컬 스토리지에서 지역 정보 불러오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCountry = localStorage.getItem('dashboard_selectedCountry');
      const savedCity = localStorage.getItem('dashboard_selectedCity');
      
      console.log('CountryAndCitySelector 로컬 스토리지에서 불러온 값들:', {
        savedCountry,
        savedCity
      });
      
      if (savedCountry && !selectedCountry) {
        setCurrentCountry(savedCountry);
        console.log('CountryAndCitySelector currentCountry 설정됨:', savedCountry);
      }
      if (savedCity && !selectedCity) {
        setCurrentCity(savedCity);
        console.log('CountryAndCitySelector currentCity 설정됨:', savedCity);
      }
    }
  }, [selectedCountry, selectedCity]);
  
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

  // 모달 관련 함수들 (PC/모바일 공통)
  const handleTitleClick = () => {
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
    console.log('CountryAndCitySelector getSelectedLocationText 호출:', {
      currentCountry,
      currentCity,
      countriesLength: countries.length,
      citiesLength: cities.length,
      currentLanguage
    });

    if (!currentCountry && !currentCity) {
      console.log('국가/도시가 선택되지 않음, whereToGo 반환');
      return t('whereToGo');
    }

    const country = countries.find(c => c.code === currentCountry);
    const city = cities.find(c => c.code === currentCity);
    
    console.log('찾은 국가/도시 데이터:', { country, city });
    
    const countryName = country?.names[currentLanguage] || country?.names['en'] || '';
    const cityName = city?.names[currentLanguage] || city?.names['en'] || '';

    console.log('최종 국가/도시 이름:', { countryName, cityName });

    if (countryName && cityName) {
      const result = `${cityName}, ${countryName}`;
      console.log('도시+국가 조합 반환:', result);
      return result;
    } else if (countryName) {
      console.log('국가만 반환:', countryName);
      return countryName;
    } else {
      console.log('데이터 없음, whereToGo 반환');
      return t('whereToGo');
    }
  };

  // 선택이 변경될 때마다 dashboard로 location text 전달
  useEffect(() => {
    if (onLocationTextChange) {
      onLocationTextChange(getSelectedLocationText());
    }
  }, [currentCountry, currentCity, countries, cities, currentLanguage, t]);

  // 외부에서 모달을 열 수 있도록 ref 노출
  useImperativeHandle(ref, () => ({
    openMobileModal: () => {
      handleTitleClick(); // PC에서도 모바일 모달 사용
    }
  }));

  return (
    <>
      {/* 실제 표시되는 위치 선택기 - 변이별 단일 렌더 (숨김 가능) */}
      {renderTrigger && variant === 'pc' && (
        <div className={styles['pc-title']} onClick={handleTitleClick}>
          <img src="/icons/location_icon.svg" alt="location" width={24} height={24} />
          {getSelectedLocationText()}
          <img src="/icons/stat_minus.svg" alt="dropdown" width={20} height={20} />
        </div>
      )}
      {renderTrigger && variant === 'mobile' && (
        <div className={styles['mobile-title']} onClick={handleTitleClick}>
          <img src="/icons/location_icon.svg" alt="location" width={24} height={24} />
          {getSelectedLocationText()}
          <img src="/icons/stat_minus.svg" alt="dropdown" width={20} height={20} />
        </div>
      )}

      {/* 모달 (PC는 중앙 팝업, 모바일은 하단 슬라이드) - body에 포털로 렌더링 */}
      {isLocationModalOpen && createPortal(
        <div className={styles['location-modal-overlay']} onClick={handleCancelSelection}>
          <div className={`${styles['location-modal']} ${isLocationModalOpen ? styles['open'] : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h3 className={styles['modal-title']}>
                <img src="/icons/location_icon.svg" alt="location" width={20} height={20} />
                {t('whereToGo')}
              </h3>
              <button className={styles['modal-close']} onClick={handleCancelSelection}>×</button>
            </div>
            
            <div className={styles['modal-content']}>
              <div className={styles['modal-section']}>
                <h4 className={styles['modal-section-title']}>{t('allCountries')}</h4>
                <div className={styles['modal-list']}>
                  {loadingModalCountries ? (
                    <div className={styles['modal-loading']}>{t('loading')}</div>
                  ) : (
                    <>
                      <button
                        className={`${styles['modal-list-item']} ${tempSelectedCountry === '' ? styles['selected'] : ''}`}
                        onClick={() => handleTempCountrySelect('')}
                      >
                        <div className={styles['modal-list-item-content']}>
                          <span className={styles['modal-list-left']}>전체</span>
                        </div>
                        <img src="/icons/check.svg" alt="selected" width={24} height={24} className={styles['check-icon']}/>
                      </button>
                      {modalCountries.map((country) => (
                        <button
                          key={country.code}
                          className={`${styles['modal-list-item']} ${tempSelectedCountry === country.code ? styles['selected'] : ''}`}
                          onClick={() => handleTempCountrySelect(country.code)}
                        >
                          <div className={styles['modal-list-item-content']}>
                            <span className={styles['modal-list-left']}>
                              {getCountryFlag(country.code)} {country.names[currentLanguage] || country.names['en']}
                            </span>
                          </div>
                          <img src="/icons/check.svg" alt="selected" width={24} height={24} className={styles['check-icon']}/>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
              
              <div className={styles['modal-section']}>
                <h4 className={styles['modal-section-title']}>{t('allCities')}</h4>
                <div className={styles['modal-list']}>
                  {!tempSelectedCountry ? (
                    <div className={styles['modal-placeholder']}>{t('selectCountryFirst')}</div>
                  ) : loadingModalCities ? (
                    <div className={styles['modal-loading']}>{t('loading')}</div>
                  ) : (
                    <>
                      <button
                        className={`${styles['modal-list-item']} ${tempSelectedCity === '' && tempSelectedCountry ? styles['selected'] : ''}`}
                        onClick={() => handleTempCitySelect('')}
                      >
                        <div className={styles['modal-list-item-content']}>
                          <span className={styles['modal-list-left']}>전체</span>
                        </div>
                        <img src="/icons/check.svg" alt="selected" width={24} height={24} className={styles['check-icon']}/>
                      </button>
                      {modalCities.map((city) => (
                        <button
                          key={city.code}
                          className={`${styles['modal-list-item']} ${tempSelectedCity === city.code ? styles['selected'] : ''}`}
                          onClick={() => handleTempCitySelect(city.code)}
                        >
                          <div className={styles['modal-list-item-content']}>
                            <span className={styles['modal-list-left']}>{city.names[currentLanguage] || city.names['en']}</span>
                          </div>
                          <img src="/icons/check.svg" alt="selected" width={24} height={24} className={styles['check-icon']}/>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className={styles['modal-buttons']}>
              <button className={`${styles['modal-button']} ${styles['apply-button']}`} onClick={handleApplySelection}>적용</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
});

CountryAndCitySelector.displayName = 'CountryAndCitySelector';

export default CountryAndCitySelector;