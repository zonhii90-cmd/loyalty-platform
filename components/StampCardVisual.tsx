'use client'

export type CardBg = 'white' | 'gradient' | 'dark'

export interface StampCardData {
  count: number
  goal: number
  reward_text: string
  accent_color?: string
  stamp_icon?: string
  card_bg?: CardBg
  completed_count?: number
}

interface Props extends StampCardData {
  newStampIndex?: number | null
  animKey?: number
  compact?: boolean
}

export default function StampCardVisual({
  count, goal, reward_text,
  accent_color = '#F59E0B',
  stamp_icon = '★',
  card_bg = 'white',
  completed_count = 0,
  newStampIndex = null,
  animKey = 0,
  compact = false,
}: Props) {
  const isComplete = count >= goal
  const remaining  = goal - count
  const progress   = Math.min(count / goal, 1)

  const bg = card_bg === 'dark' ? 'bg-slate-800'
    : card_bg === 'gradient' ? 'bg-gradient-to-br from-white to-amber-50'
    : 'bg-white'

  const headerText = card_bg === 'dark' ? 'text-white'      : 'text-gray-800'
  const subText    = card_bg === 'dark' ? 'text-slate-400'   : 'text-gray-400'
  const divider    = card_bg === 'dark' ? 'border-slate-700' : 'border-gray-100'
  const emptyBg    = card_bg === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'
  const emptyBorder = card_bg === 'dark' ? '#334155' : '#CBD5E1'

  const pad      = compact ? 'p-3' : 'p-5'
  const iconSize = compact ? 'text-sm' : 'text-base'
  const cols     = Math.min(5, goal)
  const borderColor = isComplete ? `${accent_color}60` : card_bg === 'dark' ? 'rgba(255,255,255,0.08)' : '#F0F0EE'

  return (
    <>
      <style>{`
        @keyframes stamp-pop {
          0%   { transform: scale(0.2) rotate(-15deg); opacity: 0; }
          60%  { transform: scale(1.25) rotate(5deg); }
          80%  { transform: scale(0.95) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes stamp-glow {
          0%   { box-shadow: 0 0 0 0px   ${accent_color}AA; }
          70%  { box-shadow: 0 0 0 12px  ${accent_color}00; }
          100% { box-shadow: 0 0 0 0px   ${accent_color}00; }
        }
        @keyframes card-pulse {
          0%,100% { box-shadow: 0 0 0 2px ${accent_color}30, 0 4px 24px ${accent_color}18; }
          50%     { box-shadow: 0 0 0 3px ${accent_color}60, 0 8px 32px ${accent_color}38; }
        }
        .stamp-new          { animation: stamp-pop .5s cubic-bezier(.175,.885,.32,1.275), stamp-glow .7s ease-out .05s; }
        .card-complete-pulse { animation: card-pulse 2.5s ease-in-out infinite; }
      `}</style>

      <div
        className={`${bg} rounded-3xl ${pad} ${isComplete ? 'card-complete-pulse' : ''}`}
        style={{ border: `1.5px solid ${borderColor}` }}
      >
        {isComplete ? (
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-bold text-lg" style={{ color: accent_color }}>Card Complete!</p>
            <p className={`text-sm mt-1 ${subText}`}>
              Claim your <span className={`font-semibold ${headerText}`}>{reward_text}</span>
            </p>
            {completed_count > 0 && (
              <p className={`text-xs mt-1.5 ${subText}`}>Completed {completed_count + 1}× total</p>
            )}
          </div>
        ) : (
          <div className={`flex items-center gap-3 mb-4 pb-4 border-b ${divider}`}>
            <div
              className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-xl"
              style={{ backgroundColor: accent_color + '22' }}
            >
              🎁
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold leading-tight ${compact ? 'text-sm' : 'text-base'} ${headerText}`}>
                {reward_text}
              </p>
              <p className={`text-xs mt-0.5 ${subText}`}>Collect {goal} stamps to earn</p>
            </div>
          </div>
        )}

        {/* Stamp grid — rounded-rectangle slots */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: compact ? '6px' : '8px',
          }}
        >
          {Array.from({ length: goal }).map((_, i) => {
            const earned = i < count
            const isNew  = newStampIndex !== null && i === newStampIndex
            return (
              <div
                key={isNew ? `s-${i}-${animKey}` : `s-${i}`}
                className={`flex items-center justify-center select-none rounded-xl ${iconSize} ${isNew ? 'stamp-new' : ''}`}
                style={{
                  aspectRatio: '1',
                  backgroundColor: earned ? accent_color : emptyBg,
                  color: earned ? '#fff' : emptyBorder,
                  border: earned ? 'none' : `1.5px dashed ${emptyBorder}`,
                  boxShadow: earned ? `0 2px 6px ${accent_color}44` : 'none',
                  fontWeight: earned ? 700 : 400,
                  transition: 'background-color 0.3s, color 0.3s, box-shadow 0.3s',
                }}
              >
                {stamp_icon}
              </div>
            )
          })}
        </div>

        {/* Progress bar + count */}
        {!isComplete && (
          <div className="mt-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <p className={`text-xs font-medium ${subText}`}>
                {remaining <= 2
                  ? <><span style={{ color: accent_color }}>Almost there!</span> {remaining} more</>
                  : <><span style={{ color: accent_color }} className="font-bold">{count}</span>/{goal} stamps</>
                }
              </p>
              {completed_count > 0 && (
                <p className={`text-xs ${subText}`}>{completed_count}× before</p>
              )}
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: emptyBg, border: `1px solid ${emptyBorder}22` }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress * 100}%`, backgroundColor: accent_color }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
