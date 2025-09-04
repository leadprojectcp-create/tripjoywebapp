"use client";

import React from "react";
import { useTranslationContext } from "../contexts/TranslationContext";
import "./RightSidebar.css";

export const RightSidebar = (): React.JSX.Element => {
  const { t } = useTranslationContext();
  
  return (
    <div className="right-sidebar">
      <div className="popular-areas">
        <h3>
          <img src="/icons/real-check.svg" alt="실시간" width="20" height="20" />
          {t('realtimePopularAreas')}
        </h3>
        <div className="destination-circles">
          <div className="destination-circle">
            <img src="/assets/popular-curator/danang.png" alt="다낭" className="circle-image" />
            <span>다낭</span>
          </div>
          <div className="destination-circle">
            <img src="/assets/popular-curator/hanoi.png" alt="하노이" className="circle-image" />
            <span>하노이</span>
          </div>
          <div className="destination-circle">
            <img src="/assets/popular-curator/dalat.png" alt="달랏" className="circle-image" />
            <span>달랏</span>
          </div>
          <div className="destination-circle">
            <img src="/assets/popular-curator/hocimin.png" alt="호치민" className="circle-image" />
            <span>호치민</span>
          </div>
          <div className="destination-circle">
            <img src="/assets/popular-curator/puckuok.png" alt="푸꾸옥" className="circle-image" />
            <span>푸꾸옥</span>
          </div>
          <div className="destination-circle">
            <img src="/assets/popular-curator/nattrang.png" alt="나트랑" className="circle-image" />
            <span>나트랑</span>
          </div>
        </div>
      </div>
    </div>
  );
};
