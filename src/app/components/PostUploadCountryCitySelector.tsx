'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslationContext } from '../contexts/TranslationContext';
import styles from './PostUploadCountryCitySelector.module.css';

interface Country {
  code: string;
  name: string;
  names: Record<string, string>;
}

interface City {
  code: string;
  names: Record<string, string>;
}

interface PostUploadCountryCitySelectorProps {
  selectedCountry?: string;
  selectedCity?: string;
  onSelectionChange: (countryCode: string, cityCode: string) => void;
  className?: string;
}

const PostUploadCountryCitySelector: React.FC<PostUploadCountryCitySelectorProps> = ({
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
    if (!currentCountry) return t('selectCountry') || '국가 선택';
    const country = countries.find(c => c.code === currentCountry);
    return country?.names[currentLanguage] || country?.names['en'] || '';
  };

  const getSelectedCityName = () => {
    if (!currentCity) return t('selectCity') || '도시 선택';
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
    <div className={`${styles['country-city-selector']} ${className}`}>
      {/* 국가 선택 */}
      <div className={styles['selector-group']}>
        <div className={styles['custom-dropdown']} ref={countryDropdownRef}>
          <button
            type="button"
            className={styles['dropdown-trigger']}
            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
            disabled={loadingCountries}
          >
            <span className={styles['dropdown-text']}>
              {loadingCountries ? (t('loading') || '로딩 중...') : getSelectedCountryName()}
            </span>
            <span className={`${styles['dropdown-arrow']} ${isCountryDropdownOpen ? styles['open'] : ''}`}>
              ▼
            </span>
          </button>
          
          {isCountryDropdownOpen && (
            <div className={styles['dropdown-menu']}>
              <div className={styles['dropdown-list']}>
                {countries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    className={`${styles['dropdown-item']} ${currentCountry === country.code ? styles['selected'] : ''}`}
                    onClick={() => handleCountrySelect(country.code)}
                  >
                    <span className={styles['item-flag']}>
                      {getCountryFlag(country.code)}
                    </span>
                    <span className={styles['item-text']}>
                      {country.names[currentLanguage] || country.names['en']}
                    </span>
                    {currentCountry === country.code && (
                      <span className={styles['check-icon']}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 도시 선택 */}
      <div className={styles['selector-group']}>
        <div className={styles['custom-dropdown']} ref={cityDropdownRef}>
          <button
            type="button"
            className={styles['dropdown-trigger']}
            onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
            disabled={!currentCountry || loadingCities}
          >
            <span className={styles['dropdown-text']}>
              {!currentCountry 
                ? (t('selectCountryFirst') || '국가를 먼저 선택하세요')
                : loadingCities 
                ? (t('loading') || '로딩 중...')
                : getSelectedCityName()
              }
            </span>
            <span className={`${styles['dropdown-arrow']} ${isCityDropdownOpen ? styles['open'] : ''}`}>
              ▼
            </span>
          </button>
          
          {isCityDropdownOpen && currentCountry && (
            <div className={styles['dropdown-menu']}>
              <div className={styles['dropdown-list']}>
                {cities.map((city) => (
                  <button
                    key={city.code}
                    type="button"
                    className={`${styles['dropdown-item']} ${currentCity === city.code ? styles['selected'] : ''}`}
                    onClick={() => handleCitySelect(city.code)}
                  >
                    <span className={styles['item-text']}>
                      {city.names[currentLanguage] || city.names['en']}
                    </span>
                    {currentCity === city.code && (
                      <span className={styles['check-icon']}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(PostUploadCountryCitySelector);
