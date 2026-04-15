"use client";

import { useEffect, useRef, useState } from "react";

interface RobotAvatarProps {
  className?: string;
  size?: number;
}

/**
 * Modern AI robot avatar — smooth rounded design inspired by modern AI assistants.
 * CSS 3D perspective transform tracks mouse for parallax depth effect.
 * Cyan/green glow eyes, soft white body, floating animation.
 */
export function RobotAvatar({ className = "", size = 300 }: RobotAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [eyePos, setEyePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (window.innerWidth / 2);
      const dy = (e.clientY - cy) / (window.innerHeight / 2);
      setTilt({ x: dy * -8, y: dx * 8 });
      setEyePos({ x: dx * 4, y: dy * 3 });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        width: size,
        height: size,
        perspective: "800px",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: "transform 0.12s ease-out",
          transformStyle: "preserve-3d",
          animation: "robot-float 4s ease-in-out infinite",
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 300 300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Glow filters */}
            <filter id="eyeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Body gradient */}
            <linearGradient id="bodyGrad3d" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e8e8e8" />
              <stop offset="50%" stopColor="#d0d0d0" />
              <stop offset="100%" stopColor="#b0b0b0" />
            </linearGradient>
            <linearGradient id="headGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f0f0f0" />
              <stop offset="100%" stopColor="#d8d8d8" />
            </linearGradient>
            <linearGradient id="visorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a2332" />
              <stop offset="100%" stopColor="#0d1520" />
            </linearGradient>
            <radialGradient id="shadowGrad">
              <stop offset="0%" stopColor="rgba(0,204,138,0.15)" />
              <stop offset="100%" stopColor="rgba(0,204,138,0)" />
            </radialGradient>
          </defs>

          {/* Ground shadow */}
          <ellipse cx="150" cy="280" rx="60" ry="8" fill="rgba(0,0,0,0.3)">
            <animate attributeName="rx" values="60;55;60" dur="4s" repeatCount="indefinite" />
          </ellipse>

          {/* === BODY === */}
          {/* Torso — rounded capsule shape */}
          <rect x="105" y="165" width="90" height="85" rx="20" fill="url(#bodyGrad3d)" />
          {/* Chest light strip */}
          <rect x="125" y="192" width="50" height="3" rx="1.5" fill="#0d1520" />
          <rect x="125" y="192" width="30" height="3" rx="1.5" fill="#00cc8a" opacity="0.7">
            <animate attributeName="width" values="15;35;20;30" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0.9;0.5" dur="3s" repeatCount="indefinite" />
          </rect>
          {/* Chest dots */}
          <circle cx="135" cy="210" r="3" fill="#00cc8a" opacity="0.5">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="150" cy="210" r="3" fill="#00cc8a" opacity="0.3" />
          <circle cx="165" cy="210" r="3" fill="#00cc8a" opacity="0.5">
            <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2.5s" repeatCount="indefinite" />
          </circle>

          {/* === ARMS === */}
          {/* Left arm */}
          <g>
            <animateTransform
              attributeName="transform" type="rotate"
              values="0 108 175;3 108 175;0 108 175;-2 108 175;0 108 175"
              dur="5s" repeatCount="indefinite"
            />
            <rect x="72" y="172" width="33" height="16" rx="8" fill="url(#bodyGrad3d)" />
            <rect x="65" y="190" width="22" height="40" rx="11" fill="url(#bodyGrad3d)" />
            {/* Hand */}
            <circle cx="76" cy="235" r="10" fill="#d8d8d8" />
          </g>
          {/* Right arm */}
          <g>
            <animateTransform
              attributeName="transform" type="rotate"
              values="0 192 175;-3 192 175;0 192 175;2 192 175;0 192 175"
              dur="5s" repeatCount="indefinite"
            />
            <rect x="195" y="172" width="33" height="16" rx="8" fill="url(#bodyGrad3d)" />
            <rect x="213" y="190" width="22" height="40" rx="11" fill="url(#bodyGrad3d)" />
            <circle cx="224" cy="235" r="10" fill="#d8d8d8" />
          </g>

          {/* === LEGS === */}
          <rect x="120" y="250" width="22" height="25" rx="8" fill="url(#bodyGrad3d)" />
          <rect x="158" y="250" width="22" height="25" rx="8" fill="url(#bodyGrad3d)" />
          {/* Feet */}
          <rect x="112" y="272" width="36" height="10" rx="5" fill="#c0c0c0" />
          <rect x="152" y="272" width="36" height="10" rx="5" fill="#c0c0c0" />

          {/* === HEAD === */}
          {/* Neck */}
          <rect x="135" y="148" width="30" height="20" rx="6" fill="#d0d0d0" />

          {/* Head — large rounded rectangle */}
          <rect x="88" y="62" width="124" height="92" rx="32" fill="url(#headGrad)" />

          {/* Visor / face screen */}
          <rect x="100" y="78" width="100" height="56" rx="22" fill="url(#visorGrad)" />

          {/* Eyes — glowing cyan/green, track mouse */}
          <g filter="url(#eyeGlow)">
            {/* Left eye */}
            <ellipse
              cx={132 + eyePos.x}
              cy={108 + eyePos.y}
              rx="12" ry="14"
              fill="#00cc8a"
              opacity="0.9"
              style={{ transition: "cx 0.1s ease, cy 0.1s ease" }}
            >
              <animate attributeName="ry" values="14;14;2;14;14" dur="4s" repeatCount="indefinite" />
            </ellipse>
            {/* Left eye highlight */}
            <ellipse
              cx={128 + eyePos.x * 0.5}
              cy={102 + eyePos.y * 0.5}
              rx="4" ry="5"
              fill="white"
              opacity="0.4"
              style={{ transition: "cx 0.15s ease, cy 0.15s ease" }}
            />
          </g>
          <g filter="url(#eyeGlow)">
            {/* Right eye */}
            <ellipse
              cx={168 + eyePos.x}
              cy={108 + eyePos.y}
              rx="12" ry="14"
              fill="#00cc8a"
              opacity="0.9"
              style={{ transition: "cx 0.1s ease, cy 0.1s ease" }}
            >
              <animate attributeName="ry" values="14;14;2;14;14" dur="4s" repeatCount="indefinite" />
            </ellipse>
            <ellipse
              cx={164 + eyePos.x * 0.5}
              cy={102 + eyePos.y * 0.5}
              rx="4" ry="5"
              fill="white"
              opacity="0.4"
              style={{ transition: "cx 0.15s ease, cy 0.15s ease" }}
            />
          </g>

          {/* Smile / mouth indicator */}
          <path
            d="M135 126 Q150 134 165 126"
            stroke="#00cc8a" strokeWidth="2" fill="none" opacity="0.5"
            strokeLinecap="round"
          />

          {/* Antenna */}
          <line x1="150" y1="42" x2="150" y2="62" stroke="#c0c0c0" strokeWidth="3" strokeLinecap="round" />
          <circle cx="150" cy="36" r="6" fill="#00cc8a" opacity="0.8" filter="url(#softGlow)">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
            <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Ear accents */}
          <rect x="82" y="95" width="8" height="20" rx="4" fill="#c0c0c0" />
          <rect x="210" y="95" width="8" height="20" rx="4" fill="#c0c0c0" />
          <circle cx="86" cy="105" r="3" fill="#00cc8a" opacity="0.5">
            <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="214" cy="105" r="3" fill="#00cc8a" opacity="0.5">
            <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.8s" repeatCount="indefinite" />
          </circle>

          {/* Ambient glow under robot */}
          <ellipse cx="150" cy="265" rx="45" ry="15" fill="url(#shadowGrad)" />
        </svg>
      </div>

      <style jsx>{`
        @keyframes robot-float {
          0%, 100% { transform: rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(0px); }
          50% { transform: rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
