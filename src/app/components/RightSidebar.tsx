"use client";

import React from "react";
import "./RightSidebar.css";

export const RightSidebar = (): React.JSX.Element => {
  return (
    <div className="right-sidebar">
      <div className="popular-areas">
        <h3>실시간 인기 많은 지역</h3>
        <div className="destination-circles">
          <div className="destination-circle">
            <div className="circle-image">🌊</div>
            <span>다낭</span>
          </div>
          <div className="destination-circle">
            <div className="circle-image">🌅</div>
            <span>하노이</span>
          </div>
          <div className="destination-circle">
            <div className="circle-image">🌻</div>
            <span>달랏</span>
          </div>
          <div className="destination-circle">
            <div className="circle-image">🌃</div>
            <span>호치민</span>
          </div>
          <div className="destination-circle">
            <div className="circle-image">🚠</div>
            <span>푸꾸옥</span>
          </div>
          <div className="destination-circle">
            <div className="circle-image">🏖️</div>
            <span>나트랑</span>
          </div>
        </div>
      </div>
    </div>
  );
};
