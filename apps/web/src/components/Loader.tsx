"use client";

import React from "react";

export type LoaderVariant = "universal" | "bubble";

export interface LoaderProps {
  variant?: LoaderVariant;
  className?: string;
  scale?: number;
  color?: string;
}

/**
 * Universal Banter Loader (Default)
 * 9 sliding boxes mechanical puzzle animation
 */
export function BanterLoader({
  className = "",
  scale = 1,
  color = "#0f172a"
}: {
  className?: string;
  scale?: number;
  color?: string;
}) {
  return (
    <div
      className={`banter-loader-wrapper ${className}`}
      style={{
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        ["--banter-box-color" as any]: color
      }}
    >
      <div className="banter-loader">
        <div className="banter-loader__box" />
        <div className="banter-loader__box" />
        <div className="banter-loader__box" />
        <div className="banter-loader__box" />
        <div className="banter-loader__box" />
        <div className="banter-loader__box" />
        <div className="banter-loader__box" />
        <div className="banter-loader__box" />
        <div className="banter-loader__box" />
      </div>
    </div>
  );
}

/**
 * Bubble Loader
 * Liquid bubble pill cross animation
 */
export function BubbleLoader({
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

/**
 * Universal Loader Component
 * Defaults to BanterLoader unless customized variant (e.g. "bubble") is requested.
 */
export default function Loader({
  variant = "universal",
  className = "",
  scale = 1,
  color = "#0f172a"
}: LoaderProps) {
  if (variant === "bubble") {
    return <BubbleLoader className={className} scale={scale} />;
  }
  return <BanterLoader className={className} scale={scale} color={color} />;
}
