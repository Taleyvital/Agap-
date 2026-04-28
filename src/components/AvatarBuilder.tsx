"use client";

import React from "react";

export interface AvatarConfig {
  skin_tone?: string;
  eye_shape?: string;
  eye_color?: string;
  eyebrow_style?: string;
  nose_shape?: string;
  mouth_style?: string;
  hair_style?: string;
  hair_color?: string;
  beard_style?: string;
  accessory?: string;
  background_color?: string;
}

interface Props {
  config?: AvatarConfig;
  size?: number;
  className?: string;
}

const SKIN: Record<string, string> = {
  tone1: "#FDDBB4", tone2: "#E8B98A", tone3: "#C68642",
  tone4: "#8D5524", tone5: "#5C3317", tone6: "#3B1F0F",
};
const SHADOW: Record<string, string> = {
  tone1: "#CC8C56", tone2: "#B07038", tone3: "#8A5018",
  tone4: "#5C2A08", tone5: "#3A1606", tone6: "#200C03",
};
const LIP: Record<string, string> = {
  tone1: "#C96B5E", tone2: "#B85A48", tone3: "#9A4032",
  tone4: "#7A2E20", tone5: "#5C2016", tone6: "#401610",
};
const EYE_C: Record<string, string> = {
  brown: "#7B3A28", black: "#222", hazel: "#7A5C14", honey: "#B87A14",
};
const HAIR_C: Record<string, string> = {
  black: "#1A1A1A", brown: "#4A2800", chestnut: "#954A1A",
};
const BG_MAP: Record<string, string> = {
  bg_violet: "#2a2040", bg_blue: "#1a3040", bg_red: "#2a1a1a",
  bg_green: "#1a2a1a", bg_golden: "#2a2010",
};

function Eyes({ shape, color }: { shape: string; color: string }) {
  const white = "white";
  const pupil = "#111";
  const hl = "white";
  const positions = [
    { cx: 82, hlx: 84.5 },
    { cx: 118, hlx: 120.5 },
  ];
  return (
    <>
      {positions.map(({ cx, hlx }) => {
        const cy = 108;
        const hly = 105.5;
        if (shape === "round") return (
          <g key={cx}>
            <circle cx={cx} cy={cy} r={8} fill={white} />
            <circle cx={cx} cy={cy} r={5} fill={color} />
            <circle cx={cx} cy={cy} r={3} fill={pupil} />
            <circle cx={hlx} cy={hly} r={1.5} fill={hl} />
          </g>
        );
        if (shape === "wide") return (
          <g key={cx}>
            <ellipse cx={cx} cy={cy} rx={12} ry={7.5} fill={white} />
            <circle cx={cx} cy={cy} r={5.5} fill={color} />
            <circle cx={cx} cy={cy} r={3.2} fill={pupil} />
            <circle cx={hlx} cy={hly} r={1.5} fill={hl} />
          </g>
        );
        if (shape === "asian") return (
          <g key={cx}>
            <ellipse cx={cx} cy={cy} rx={10} ry={4.5} fill={white} />
            <ellipse cx={cx} cy={cy} rx={5} ry={3.5} fill={color} />
            <ellipse cx={cx} cy={cy} rx={3} ry={2.5} fill={pupil} />
            <circle cx={cx === 82 ? 84 : 120} cy={107} r={1} fill={hl} />
          </g>
        );
        // default: almond
        return (
          <g key={cx}>
            <ellipse cx={cx} cy={cy} rx={10} ry={6.5} fill={white} />
            <circle cx={cx} cy={cy} r={4.5} fill={color} />
            <circle cx={cx} cy={cy} r={2.8} fill={pupil} />
            <circle cx={hlx} cy={hly} r={1.5} fill={hl} />
          </g>
        );
      })}
    </>
  );
}

function Eyebrows({ style, color }: { style: string; color: string }) {
  const w = style === "thick" ? 4.5 : 2.5;
  const commonProps = { stroke: color, strokeWidth: w, fill: "none" as const, strokeLinecap: "round" as const };
  if (style === "straight") return (
    <>
      <line x1={70} y1={95} x2={94} y2={95} stroke={color} strokeWidth={w} strokeLinecap="round" />
      <line x1={106} y1={95} x2={130} y2={95} stroke={color} strokeWidth={w} strokeLinecap="round" />
    </>
  );
  if (style === "arched") return (
    <>
      <path d="M70 99 Q82 88 94 97" {...commonProps} />
      <path d="M106 97 Q118 88 130 99" {...commonProps} />
    </>
  );
  // natural + thick share the same curve
  return (
    <>
      <path d="M70 97 Q82 91 94 96" {...commonProps} />
      <path d="M106 96 Q118 91 130 97" {...commonProps} />
    </>
  );
}

function Nose({ shape, shadow }: { shape: string; shadow: string }) {
  if (shape === "fine") return (
    <>
      <path d="M100 116 L100 124" stroke={shadow} strokeWidth={1.2} strokeLinecap="round" />
      <path d="M100 124 Q97 126 96 124" stroke={shadow} strokeWidth={1.2} fill="none" strokeLinecap="round" />
      <path d="M100 124 Q103 126 104 124" stroke={shadow} strokeWidth={1.2} fill="none" strokeLinecap="round" />
    </>
  );
  if (shape === "wide") return (
    <>
      <path d="M93 118 Q100 127 107 118" stroke={shadow} strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <ellipse cx={92} cy={123} rx={4} ry={2.2} fill={shadow} fillOpacity={0.3} />
      <ellipse cx={108} cy={123} rx={4} ry={2.2} fill={shadow} fillOpacity={0.3} />
    </>
  );
  if (shape === "button") return (
    <>
      <circle cx={100} cy={121} r={4} fill={shadow} fillOpacity={0.22} />
      <circle cx={97} cy={122.5} r={1.5} fill={shadow} fillOpacity={0.18} />
      <circle cx={103} cy={122.5} r={1.5} fill={shadow} fillOpacity={0.18} />
    </>
  );
  // rounded (default)
  return (
    <>
      <path d="M96 118 Q100 125 104 118" stroke={shadow} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <ellipse cx={95.5} cy={123} rx={3} ry={1.8} fill={shadow} fillOpacity={0.28} />
      <ellipse cx={104.5} cy={123} rx={3} ry={1.8} fill={shadow} fillOpacity={0.28} />
    </>
  );
}

function Mouth({ style, lip }: { style: string; lip: string }) {
  if (style === "neutral") return (
    <path d="M90 136 L110 136" stroke={lip} strokeWidth={2} strokeLinecap="round" />
  );
  if (style === "big_smile") return (
    <>
      <path d="M84 132 Q100 149 116 132" stroke={lip} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <path d="M84 132 Q100 145 116 132" fill={lip} fillOpacity={0.15} />
    </>
  );
  // smile (default)
  return (
    <path d="M88 134 Q100 145 112 134" stroke={lip} strokeWidth={2} fill="none" strokeLinecap="round" />
  );
}

function HairBack({ style, color }: { style: string; color: string }) {
  if (style === "afro") return <circle cx={100} cy={81} r={57} fill={color} />;
  if (style === "curly_long") return <ellipse cx={100} cy={102} rx={55} ry={62} fill={color} />;
  if (style === "hijab") return (
    <>
      <ellipse cx={100} cy={108} rx={57} ry={64} fill={color} />
      <ellipse cx={100} cy={72} rx={49} ry={36} fill={color} />
    </>
  );
  if (style === "locks") return (
    <>
      {[76, 86, 96, 106, 116, 126].map((x, i) => (
        <rect key={i} x={x - 4} y={64} width={8} height={55 + i * 4} rx={4} fill={color} />
      ))}
    </>
  );
  if (style === "braids_long") return (
    <>
      {[74, 85, 96, 107, 118, 128].map((x, i) => (
        <rect key={i} x={x - 5} y={66} width={10} height={60 + i * 3} rx={5} fill={color} />
      ))}
    </>
  );
  return null;
}

function HairFront({ style, color, clipId }: { style: string; color: string; clipId: string }) {
  const clip = `url(#${clipId})`;
  const lighter = color === "#1A1A1A" ? "#3A3A3A" : color === "#4A2800" ? "#6A4220" : "#B56030";

  if (style === "short") return (
    <ellipse cx={100} cy={83} rx={44} ry={35} fill={color} clipPath={clip} />
  );
  if (style === "fade") return (
    <>
      <ellipse cx={100} cy={81} rx={43} ry={34} fill={color} clipPath={clip} />
      <ellipse cx={60} cy={101} rx={6} ry={13} fill={color} fillOpacity={0.5} />
      <ellipse cx={140} cy={101} rx={6} ry={13} fill={color} fillOpacity={0.5} />
    </>
  );
  if (style === "cornrows") {
    const rows = [74, 81, 88, 95, 102];
    return (
      <>
        <ellipse cx={100} cy={83} rx={44} ry={35} fill={color} clipPath={clip} />
        {rows.map(y => (
          <line key={y} x1={62} y1={y} x2={138} y2={y}
            stroke={lighter} strokeWidth={1.8} clipPath={clip} strokeLinecap="round" />
        ))}
      </>
    );
  }
  if (style === "twists") return (
    <>
      <ellipse cx={100} cy={83} rx={44} ry={35} fill={color} clipPath={clip} />
      {[71, 80, 89, 98, 107, 116, 125, 134].map((x, i) => (
        <ellipse key={i} cx={x} cy={72} rx={4} ry={7} fill={lighter} clipPath={clip} />
      ))}
    </>
  );
  if (style === "short_braids") return (
    <>
      <ellipse cx={100} cy={83} rx={44} ry={35} fill={color} clipPath={clip} />
      {[72, 82, 92, 102, 112, 122, 132].map((x, i) => (
        <rect key={i} x={x - 3} y={64} width={6} height={18} rx={3} fill={lighter} clipPath={clip} />
      ))}
    </>
  );
  // shaved: no hair drawn on top (skin shows through)
  // afro/locks/braids_long/curly_long/hijab rendered in HairBack
  return null;
}

function Beard({ style, color }: { style: string; color: string; skin?: string }) {
  if (style === "beard_full") return (
    <path d="M62 144 Q100 172 138 144 Q134 158 100 165 Q66 158 62 144Z" fill={color} fillOpacity={0.92} />
  );
  if (style === "beard_short") return (
    <path d="M70 148 Q100 164 130 148 Q126 158 100 162 Q74 158 70 148Z" fill={color} fillOpacity={0.88} />
  );
  if (style === "goatee") return (
    <path d="M88 148 Q100 160 112 148 Q108 158 100 162 Q92 158 88 148Z" fill={color} fillOpacity={0.88} />
  );
  if (style === "mustache") return (
    <path d="M83 133 Q92 128 100 132 Q108 128 117 133 Q110 139 100 137 Q90 139 83 133Z" fill={color} fillOpacity={0.88} />
  );
  return null;
}

function Accessory({ type }: { type: string }) {
  const gray = "#888";
  if (type === "glasses_round") return (
    <>
      <circle cx={82} cy={108} r={14} fill="none" stroke={gray} strokeWidth={2.5} />
      <circle cx={118} cy={108} r={14} fill="none" stroke={gray} strokeWidth={2.5} />
      <line x1={96} y1={108} x2={104} y2={108} stroke={gray} strokeWidth={2.5} />
      <line x1={68} y1={107} x2={60} y2={105} stroke={gray} strokeWidth={2.5} strokeLinecap="round" />
      <line x1={132} y1={107} x2={140} y2={105} stroke={gray} strokeWidth={2.5} strokeLinecap="round" />
    </>
  );
  if (type === "glasses_rect") return (
    <>
      <rect x={68} y={101} width={28} height={16} rx={4} fill="none" stroke={gray} strokeWidth={2.5} />
      <rect x={104} y={101} width={28} height={16} rx={4} fill="none" stroke={gray} strokeWidth={2.5} />
      <line x1={96} y1={109} x2={104} y2={109} stroke={gray} strokeWidth={2.5} />
      <line x1={68} y1={109} x2={60} y2={107} stroke={gray} strokeWidth={2.5} strokeLinecap="round" />
      <line x1={132} y1={109} x2={140} y2={107} stroke={gray} strokeWidth={2.5} strokeLinecap="round" />
    </>
  );
  if (type === "crown") return (
    <>
      <path d="M68 74 L78 58 L90 70 L100 54 L110 70 L122 58 L132 74 Z" fill="#E8C84A" />
      <rect x={68} y={74} width={64} height={9} rx={2} fill="#D4A830" />
      <circle cx={90} cy={69} r={3.5} fill="#FF6B6B" />
      <circle cx={100} cy={61} r={3.5} fill="#FF6B6B" />
      <circle cx={110} cy={69} r={3.5} fill="#FF6B6B" />
    </>
  );
  if (type === "halo") return (
    <ellipse cx={100} cy={55} rx={36} ry={10} fill="none" stroke="#7B6FD4" strokeWidth={4.5} fillOpacity={0.85} />
  );
  if (type === "headphones") return (
    <>
      <path d="M62 114 Q62 56 100 56 Q138 56 138 114" fill="none" stroke="#555" strokeWidth={6} strokeLinecap="round" />
      <ellipse cx={62} cy={114} rx={10} ry={14} fill="#333" />
      <ellipse cx={138} cy={114} rx={10} ry={14} fill="#333" />
      <ellipse cx={62} cy={114} rx={6} ry={9} fill="#222" />
      <ellipse cx={138} cy={114} rx={6} ry={9} fill="#222" />
    </>
  );
  if (type === "cross_necklace") return (
    <>
      <path d="M84 158 Q100 172 116 158" fill="none" stroke="#D4A830" strokeWidth={1.5} strokeLinecap="round" />
      <line x1={100} y1={163} x2={100} y2={178} stroke="#D4A830" strokeWidth={2.5} strokeLinecap="round" />
      <line x1={93} y1={169} x2={107} y2={169} stroke="#D4A830" strokeWidth={2.5} strokeLinecap="round" />
    </>
  );
  if (type === "flower") {
    const petals = [0, 60, 120, 180, 240, 300];
    return (
      <>
        {petals.map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const px = 126 + Math.cos(rad) * 7;
          const py = 76 + Math.sin(rad) * 7;
          return (
            <ellipse
              key={angle}
              cx={px} cy={py}
              rx={5} ry={3.5}
              fill="#FF8BC0"
              transform={`rotate(${angle}, ${px}, ${py})`}
            />
          );
        })}
        <circle cx={126} cy={76} r={4} fill="#FFD700" />
      </>
    );
  }
  return null;
}

export default function AvatarBuilder({ config = {}, size = 200, className }: Props) {
  const uid = React.useId().replace(/:/g, "");

  const skin_tone      = config.skin_tone      ?? "tone3";
  const eye_shape      = config.eye_shape      ?? "almond";
  const eye_color      = config.eye_color      ?? "brown";
  const eyebrow_style  = config.eyebrow_style  ?? "natural";
  const nose_shape     = config.nose_shape     ?? "rounded";
  const mouth_style    = config.mouth_style    ?? "smile";
  const hair_style     = config.hair_style     ?? "short";
  const hair_color_key = config.hair_color     ?? "black";
  const beard_style    = config.beard_style    ?? "none";
  const accessory      = config.accessory      ?? "none";
  const rawBg          = config.background_color ?? "#1a1830";
  const background_color = BG_MAP[rawBg] ?? rawBg;

  const skin = SKIN[skin_tone] ?? SKIN.tone3;
  const shadow = SHADOW[skin_tone] ?? SHADOW.tone3;
  const lip = LIP[skin_tone] ?? LIP.tone3;
  const eyeColor = EYE_C[eye_color] ?? EYE_C.brown;
  const hairColor = HAIR_C[hair_color_key] ?? HAIR_C.black;

  const hairClipId = `hc-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        {/* Clip everything to background circle */}
        <clipPath id={`bg-${uid}`}>
          <circle cx={100} cy={100} r={100} />
        </clipPath>
        {/* Clip hair-front to top of head only */}
        <clipPath id={hairClipId}>
          <rect x={0} y={0} width={200} height={103} />
        </clipPath>
      </defs>

      {/* Background */}
      <circle cx={100} cy={100} r={100} fill={background_color} />

      <g clipPath={`url(#bg-${uid})`}>
        {/* Shoulders */}
        <ellipse cx={100} cy={197} rx={92} ry={56} fill={skin} />
        {/* Neck */}
        <rect x={86} y={152} width={28} height={36} rx={6} fill={skin} />

        {/* Ears — drawn before face so face overlaps inner ear */}
        <ellipse cx={60} cy={110} rx={9} ry={12} fill={skin} />
        <ellipse cx={140} cy={110} rx={9} ry={12} fill={skin} />
        <ellipse cx={62} cy={110} rx={5} ry={8} fill={shadow} fillOpacity={0.22} />
        <ellipse cx={138} cy={110} rx={5} ry={8} fill={shadow} fillOpacity={0.22} />

        {/* Hair drawn BEHIND face (afro, hijab, long styles) */}
        <HairBack style={hair_style} color={hairColor} />

        {/* Face */}
        <ellipse cx={100} cy={112} rx={40} ry={48} fill={skin} />

        {/* Hair drawn ON TOP of face, clipped to top region */}
        <HairFront style={hair_style} color={hairColor} clipId={hairClipId} />

        {/* Eyebrows */}
        <Eyebrows style={eyebrow_style} color={hairColor} />

        {/* Eyes */}
        <Eyes shape={eye_shape} color={eyeColor} />

        {/* Nose */}
        <Nose shape={nose_shape} shadow={shadow} />

        {/* Mouth */}
        <Mouth style={mouth_style} lip={lip} />

        {/* Beard */}
        <Beard style={beard_style} color={hairColor} skin={skin} />

        {/* Accessory */}
        <Accessory type={accessory} />
      </g>
    </svg>
  );
}
