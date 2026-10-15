"use client";

import React from "react";

export default function Loader({
  className = "",
  scale = 1
}: {
  className?: string;
  scale?: number;
}) {
  return (
    <div
      className={`custom-loader-wrapper ${className}`}
      style={scale !== 1 ? { transform: `scale(${scale})` } : undefined}
    >
      <div className="Strich1">
        <div className="Strich2">
          <div className="bubble" />
          <div className="bubble1" />
          <div className="bubble2" />
          <div className="bubble3" />
          <div className="bubble4" />
        </div>
      </div>
    </div>
  );
}
