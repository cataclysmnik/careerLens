import React from 'react';

type DataPoint = {
  subject: string;
  score: number | null; // 0-100, null means unmeasured
  fullMark: number;
};

interface SkillRadarChartProps {
  data: DataPoint[];
  size?: number;
  className?: string;
}

export function SkillRadarChart({ data, size = 300, className = '' }: SkillRadarChartProps) {
  // A minimum of 3 points is required for a polygon. If there are fewer, a radar chart isn't great.
  if (data.length < 3) return null;

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = (size / 2) * 0.65; // Leave space for labels
  const levels = 5; // Rings (20, 40, 60, 80, 100)

  // Calculate coordinates for a given value (0-100) on a specific axis index
  const getPointCoordinates = (value: number, index: number, total: number) => {
    // Start from top (axis 0) and go clockwise
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const distance = (value / 100) * radius;
    return {
      x: centerX + distance * Math.cos(angle),
      y: centerY + distance * Math.sin(angle),
    };
  };

  const totalPoints = data.length;

  // Background Rings (Polygon shape)
  const rings = Array.from({ length: levels }).map((_, i) => {
    const levelVal = ((i + 1) / levels) * 100;
    const points = data
      .map((_, index) => {
        const { x, y } = getPointCoordinates(levelVal, index, totalPoints);
        return `${x},${y}`;
      })
      .join(' ');
    return points;
  });

  // Data Polygon (The actual filled shape for the user's scores)
  // Treat null scores as 0 for drawing the shape, or skip? We'll treat as 0 so the polygon closes.
  const dataPoints = data
    .map((d, index) => {
      const val = d.score !== null ? d.score : 0;
      const { x, y } = getPointCoordinates(val, index, totalPoints);
      return { x, y, val, original: d };
    });
  
  const polygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: '100%', height: size }}>
      <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible max-w-full">
        {/* Background Rings */}
        {rings.map((points, i) => (
          <polygon
            key={`ring-${i}`}
            points={points}
            fill={i % 2 === 0 ? 'rgba(0, 0, 0, 0.02)' : 'transparent'} // Subtle alternating background
            stroke="currentColor"
            className="text-gray-200 dark:text-zinc-800"
            strokeWidth="1"
          />
        ))}

        {/* Axis Lines extending to outer ring */}
        {data.map((_, index) => {
          const { x, y } = getPointCoordinates(100, index, totalPoints);
          return (
            <line
              key={`axis-${index}`}
              x1={centerX}
              y1={centerY}
              x2={x}
              y2={y}
              stroke="currentColor"
              className="text-gray-200 dark:text-zinc-800"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* User Data Polygon */}
        <polygon
          points={polygonPoints}
          fill="rgba(37, 99, 235, 0.2)" // Tailwind blue-600 with 20% opacity
          stroke="#2563eb" // Tailwind blue-600
          strokeWidth="2"
          strokeLinejoin="round"
          className="transition-all duration-500 ease-in-out"
        />

        {/* Data Points (Dots) */}
        {dataPoints.map((p, index) => (
          p.original.score !== null && (
            <circle
              key={`dot-${index}`}
              cx={p.x}
              cy={p.y}
              r="4"
              fill="#2563eb"
              className="transition-all duration-500 ease-in-out hover:r-6 cursor-pointer"
            >
              <title>{`${p.original.subject}: ${p.original.score}`}</title>
            </circle>
          )
        ))}

        {/* Labels */}
        {data.map((d, index) => {
          // Push labels outside the 100% radius (130%)
          const { x, y } = getPointCoordinates(135, index, totalPoints);
          
          // Determine text anchor based on x position relative to center
          let textAnchor = 'middle';
          if (x > centerX + 10) textAnchor = 'start';
          else if (x < centerX - 10) textAnchor = 'end';
          
          return (
            <text
              key={`label-${index}`}
              x={x}
              y={y}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider fill-gray-500 dark:fill-gray-400"
            >
              {d.subject.length > 15 ? d.subject.split(' ')[0] : d.subject}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
