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

  const bg = card_bg === 'dark' ? 'bg-slate-800'
    : card_bg === 'gradient' ? 'bg-gradient-to-br from-white to-amber-50'
    : 'bg-white'

  const headerText = card_bg === 'dark' ? 'text-white'    : 'text-gray-800'
  const subText    = card_bg === 'dark' ? 'text-slate-400' : 'text-gray-400'
  const divider    = card_bg === 'dark' ? 'border-slate-700' : 'border-gray-100'
  const emptyBg    = card_bg === 'dark' ? '#1e293b' : '#F3F4F6'
  const emptyColor = card_bg === 'dark' ? '#475569' : '#9CA3AF'

  const stampSize = compact ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base'
  const rowGap    = compact ? 'gap-1.5' : 'gap-2'
  const pad       = compact ? 'p-3' : 'p-5'

  const rows: number[][] = []
  for (let i = 0; i < goal; i += 5) {
    rows.push(Array.from({ length: Math.min(5, goal - i) }, (_, j) => i + j))
  }

  const borderColor = isComplete ? `${accent_color}55` : card_bg === 'dark' ? '#1e293b' : '#F3F4F6'

  return (
    <>
      <style>{`
        @keyframes stamp-bounce {
          0%   { transform:scale(0.3); opacity:0; }
          55%  { transform:scale(1.3); }
          75%  { transform:scale(0.9); }
          100% { transform:scale(1);   opacity:1; }
        }
        @keyframes stamp-ring {
          0%   { box-shadow:0 0 0 0px  ${accent_color}88; }
          70%  { box-shadow:0 0 0 10px ${accent_color}00; }
          100% { box-shadow:0 0 0 0px  ${accent_color}00; }
        }
        @keyframes card-pulse {
          0%,100% { box-shadow:0 0 0 2px ${accent_color}22,0 4px 24px ${accent_color}22; }
          50%     { box-shadow:0 0 0 3px ${accent_color}44,0 8px 32px ${accent_color}44; }
        }
        .stamp-new   { animation: stamp-bounce .5s cubic-bezier(.175,.885,.32,1.275), stamp-ring .7s ease-out .1s; }
        .card-complete-pulse { animation: card-pulse 2s ease-in-out infinite; }
      `}</style>

      <div
        className={`${bg} rounded-3xl ${pad} ${isComplete ? 'card-complete-pulse' : ''}`}
        style={{ border: `1.5px solid ${borderColor}` }}
      >
        {isComplete ? (
          /* COMPLETED STATE */
          <div className="text-center mb-4">
            <div className="text-3xl mb-1">🎉</div>
            <p className="font-bold text-lg" style={{ color: accent_color }}>Card Complete!</p>
            <p className={`text-sm mt-1 ${subText}`}>
              Show this to claim your{' '}
              <span className={`font-semibold ${headerText}`}>{reward_text}</span>
            </p>
            {completed_count > 0 && (
              <p className={`text-xs mt-2 ${subText}`}>Completed {completed_count + 1}× total</p>
            )}
          </div>
        ) : (
          /* REWARD HERO */
          <div className={`flex items-start gap-3 mb-4 pb-4 border-b ${divider}`}>
            <div
              className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-xl"
              style={{ backgroundColor: accent_color + '22' }}
            >
              🎁
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-base leading-tight ${headerText}`}>{reward_text}</p>
              <p className={`text-xs mt-0.5 ${subText}`}>Collect {goal} stamps to earn</p>
            </div>
          </div>
        )}

        {/* STAMP GRID */}
        <div className={`flex flex-col ${compact ? 'gap-1.5' : 'gap-2'} ${isComplete ? '' : 'mb-3'}`}>
          {rows.map((row, ri) => (
            <div key={ri} className={`flex ${rowGap}`}>
              {row.map(i => {
                const earned = i < count
                const isNew  = newStampIndex !== null && i === newStampIndex
                return (
                  <div
                    key={isNew ? `s-${i}-${animKey}` : `s-${i}`}
                    className={`${stampSize} rounded-full flex items-center justify-center font-bold shrink-0 select-none ${isNew ? 'stamp-new' : ''}`}
                    style={{
                      backgroundColor: earned ? accent_color : emptyBg,
                      color: earned ? '#fff' : emptyColor,
                    }}
                  >
                    {stamp_icon}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* PROGRESS TEXT */}
        {!isComplete && (
          <p className={`text-xs ${subText} mt-3`}>
            {remaining <= 2 ? (
              <><span className="font-semibold" style={{ color: accent_color }}>Almost there!</span>{' '}{remaining} more stamp{remaining === 1 ? '' : 's'}</>
            ) : (
              <><span className="font-semibold" style={{ color: accent_color }}>{count}</span> / {goal} stamps</>
            )}
          </p>
        )}

        {!isComplete && completed_count > 0 && (
          <p className={`text-xs mt-1 ${subText}`}>Completed {completed_count}× before</p>
        )}
      </div>
    </>
  )
}
