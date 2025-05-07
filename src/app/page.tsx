'use client';

import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  useDraggable,
  useDroppable,
  rectIntersection,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { memo, useCallback, useMemo, useState } from 'react';

// Game Tags
type GameTag = 'TNF' | 'SNF' | 'MNF' | 'INT' | 'XMAS' | 'BYE' | '';
type TimeSlot = 'noon' | 'mid-day';

interface Team {
  id: string;
  name: string;
  color: string;
  logo: string;
}

interface ScheduleItem {
  team?: Team;
  tag: GameTag;
  timeSlot?: string;
}

interface WeeksState {
  [key: string]: ScheduleItem;
}

interface WeekDateInfo {
  week: number;
  thursday: Date;
  sunday: Date;
  monday: Date;
}

interface GameDateTime {
  date: string;
  time: string;
}

interface TimeSlotSelectorProps {
  weekId: string;
  tag: GameTag;
  currentTimeSlot?: string;
  onTimeSlotChange: (timeSlot: string) => void;
}

// Calculate dates for the 2025 season
const getWeekDates = () => {
  const startDate = new Date(2025, 8, 4); // September 4, 2025
  const weekDates: WeekDateInfo[] = [];

  for (let week = 1; week <= 18; week++) {
    const thursdayDate = new Date(startDate);
    thursdayDate.setDate(startDate.getDate() + (week - 1) * 7);

    const sundayDate = new Date(thursdayDate);
    sundayDate.setDate(thursdayDate.getDate() + 3);

    const mondayDate = new Date(thursdayDate);
    mondayDate.setDate(thursdayDate.getDate() + 4);

    weekDates.push({
      week,
      thursday: new Date(thursdayDate),
      sunday: new Date(sundayDate),
      monday: new Date(mondayDate),
    });

    
  }

  return weekDates;
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
};

const opponentsList: Team[] = [
  { id: 'broncos-home', name: 'Broncos (Home)', color: '#FB4F14', logo: '/logos/broncos.png' },
  { id: 'raiders-home', name: 'Raiders (Home)', color: '#000000', logo: '/logos/raiders.png' },
  { id: 'chargers-home', name: 'Chargers (Home)', color: '#0080C6', logo: '/logos/chargers.png' },
  { id: 'ravens-home', name: 'Ravens (Home)', color: '#241773', logo: '/logos/ravens.png' },
  { id: 'lions-home', name: 'Lions (Home)', color: '#0076B6', logo: '/logos/lions.png' },
  { id: 'texans-home', name: 'Texans (Home)', color: '#03202F', logo: '/logos/texans.png' },
  { id: 'colts-home', name: 'Colts (Home)', color: '#002C5F', logo: '/logos/colts.png' },
  { id: 'eagles-home', name: 'Eagles (Home)', color: '#004C54', logo: '/logos/eagles.png' },
  { id: 'commanders-home', name: 'Commanders (Home)', color: '#5A1414', logo: '/logos/commanders.png' },
  { id: 'broncos-away', name: 'Broncos (Away)', color: '#FB4F14', logo: '/logos/broncos.png' },
  { id: 'raiders-away', name: 'Raiders (Away)', color: '#000000', logo: '/logos/raiders.png' },
  { id: 'chargers-away', name: 'Chargers (Away)', color: '#0080C6', logo: '/logos/chargers.png' },
  { id: 'bills-away', name: 'Bills (Away)', color: '#00338D', logo: '/logos/bills.png' },
  { id: 'cowboys-away', name: 'Cowboys (Away)', color: '#003594', logo: '/logos/cowboys.png' },
  { id: 'jaguars-away', name: 'Jaguars (Away)', color: '#006778', logo: '/logos/jaguars.png' },
  { id: 'giants-away', name: 'Giants (Away)', color: '#0B2265', logo: '/logos/giants.png' },
  { id: 'titans-away', name: 'Titans (Away)', color: '#0C2340', logo: '/logos/titans.png' },
];

const gameTags: { value: GameTag; label: string }[] = [
  { value: 'TNF', label: 'Thursday Night Football' },
  { value: 'SNF', label: 'Sunday Night Football' },
  { value: 'MNF', label: 'Monday Night Football' },
  { value: 'INT', label: 'International Game' },
  { value: 'XMAS', label: 'Christmas Game' },
  { value: 'BYE', label: 'Bye Week' },
  { value: '', label: 'Regular Game' },
];

export default function Home() {
  const [pool, setPool] = useState<Team[]>(opponentsList);
  const [weeks, setWeeks] = useState<WeeksState>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const weekDates = useMemo(() => getWeekDates(), []);

  const collisionDetection = useMemo(() => rectIntersection, []);
  const modifiers = useMemo(() => [restrictToWindowEdges], []);

  const handleDragStart = useCallback((event: DragStartEvent): void => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent): void => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;
      const activeFrom = active.data.current?.from as string | undefined;

      // Handle dragging back to pool
      if (overId === 'pool') {
        if (activeFrom?.startsWith('week-')) {
          const weekItem = weeks[activeFrom];
          if (weekItem?.team) {
            const teamToAdd: Team = { ...weekItem.team };

            setPool((prev) => {
              if (!prev.some((t) => t.id === teamToAdd.id)) {
                return [...prev, teamToAdd];
              }
              return prev;
            });
          }

          setWeeks((prev) => {
            const updated = { ...prev };
            if (updated[activeFrom]) {
              const tag = updated[activeFrom].tag;
              updated[activeFrom] = { tag, team: undefined };
            }
            return updated;
          });
        }
      }

            // Dragged into a week
            else if (overId.startsWith('week-')) {
              const fromPool = pool.find((t) => t.id === activeId);
      
              if (fromPool) {
                // Drag from pool to week
                setWeeks((prev) => {
                  const existing = prev[overId] || { tag: '' };
      
                  if (existing.team) {
                    const displaced = { ...existing.team };
                    setPool((prevPool) => {
                      if (!prevPool.find((t) => t.id === displaced.id)) {
                        return [...prevPool, displaced];
                      }
                      return prevPool;
                    });
                  }
      
                  return {
                    ...prev,
                    [overId]: {
                      ...existing,
                      team: fromPool,
                    },
                  };
                });
      
                setPool((prev) => prev.filter((t) => t.id !== activeId));
              } else if (activeFrom?.startsWith('week-')) {
                // Drag from week to week
                const source = weeks[activeFrom];
      
                if (source?.team) {
                  const sourceTeam = { ...source.team };
      
                  setWeeks((prev) => {
                    const target = prev[overId] || { tag: '' };
                    const updated = { ...prev };
      
                    if (target.team) {
                      updated[activeFrom] = { ...source, team: { ...target.team } };
                    } else {
                      updated[activeFrom] = { ...source, team: undefined };
                    }
      
                    updated[overId] = { ...target, team: sourceTeam };
                    return updated;
                  });
                }
              }
            }
          },
          [pool, weeks]
        );

        const handleTagChange = useCallback((weekId: string, tag: GameTag) => {
          setWeeks((prev) => {
            if (tag === 'BYE') {
              const existing = prev[weekId];
              if (existing?.team) {
                const returnTeam = { ...existing.team };
                setTimeout(() => {
                  setPool((prevPool) => {
                    if (!prevPool.find((t) => t.id === returnTeam.id)) {
                      return [...prevPool, returnTeam];
                    }
                    return prevPool;
                  });
                }, 0);
              }
      
              return {
                ...prev,
                [weekId]: { tag, team: undefined },
              };
            }
      
            const existing = prev[weekId] || { team: undefined };
            return {
              ...prev,
              [weekId]: { ...existing, tag },
            };
          });
        }, []);
      
        const getGameTime = (tag: GameTag, timeSlot?: string): string => {
          switch (tag) {
            case 'TNF': return '7:15 PM';
            case 'SNF': return '7:20 PM';
            case 'MNF': return '7:15 PM';
            case 'INT': return '8:30 AM';
            case 'XMAS': return '12:00 PM / 3:30 PM';
            case 'BYE': return '';
            default:
              return timeSlot === 'mid-day' ? '3:25 PM' : '12:00 PM';
          }
        };

        const getGameDateTime = useCallback((weekNum: number, item: ScheduleItem): { date: string, time: string } => {
          const weekIndex = weekNum - 1;
          if (weekIndex < 0 || weekIndex >= weekDates.length) return { date: '', time: '' };
      
          const dates = weekDates[weekIndex];
          let gameDate = '';
      
          if (item.tag === 'TNF' || item.tag === 'XMAS') {
            gameDate = formatDate(dates.thursday);
          } else if (item.tag === 'MNF') {
            gameDate = formatDate(dates.monday);
          } else {
            gameDate = formatDate(dates.sunday);
          }
      
          const gameTime = getGameTime(item.tag, item.timeSlot);
          return { date: gameDate, time: gameTime };
        }, [weekDates]);
      
        const handleTimeSlotChange = useCallback((weekId: string, timeSlot: string) => {
          setWeeks((prev) => {
            const existing = prev[weekId] || { tag: '', team: undefined };
            return {
              ...prev,
              [weekId]: { ...existing, timeSlot },
            };
          });
        }, []);

        const TimeSlotSelector = memo(function TimeSlotSelector({
          weekId,
          tag,
          currentTimeSlot,
          onTimeSlotChange,
        }: {
          weekId: string;
          tag: GameTag;
          currentTimeSlot?: string;
          onTimeSlotChange: (timeSlot: string) => void;
        }) {
          if (tag !== '') return null;
      
          return (
            <select
              value={currentTimeSlot || 'noon'}
              onChange={(e) => onTimeSlotChange(e.target.value)}
              className="bg-gray-800 text-xs rounded-md px-1 py-1 border border-gray-700 text-gray-300"
            >
              <option value="noon">12:00 PM</option>
              <option value="mid-day">3:25 PM</option>
            </select>
          );
        });

        return (
          <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
            <div className="max-w-7xl mx-auto">
              <header className="mb-8 pt-4">
                <div className="flex items-center justify-center space-x-4 mb-2">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🏈</span>
                  </div>
                  <h1 className="text-3xl font-bold text-red-500">
                    Chiefs Schedule Builder
                  </h1>
                </div>
                <p className="text-center text-gray-400">
                  Drag and drop teams to build your ideal Chiefs schedule
                </p>
              </header>
      
              <DndContext
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                collisionDetection={collisionDetection}
                modifiers={modifiers}
              >

              <div className="flex flex-col md:flex-row gap-6">
              {/* Team Pool */}
              <div className="w-full md:w-1/2 mb-6 md:mb-0">
                <h2 className="text-xl font-bold mb-3 text-red-500 flex items-center">
                  <span className="mr-2">Available Teams</span>
                  <span className="text-sm bg-red-800 text-white px-2 py-1 rounded">
                    {pool.length} teams
                  </span>
                </h2>
                <DropZone id="pool" label="" isPool={true}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {pool.map((team) => (
                      <DraggableItem
                        key={team.id}
                        id={team.id}
                        name={team.name}
                        color={team.color}
                        from="pool"
                        isActive={activeId === team.id}
                      />
                    ))}
                  </div>
                </DropZone>
              </div>

                          {/* Weeks */}
            <div className="w-full md:w-1/2">
            <h2 className="text-xl font-bold mb-3 text-red-500 flex items-center">
              <span className="mr-2">Schedule</span>
              <span className="text-sm bg-red-800 text-white px-2 py-1 rounded">
                {Object.values(weeks).filter(item => item.team || item.tag === 'BYE').length} / 18 weeks
              </span>
            </h2>
            <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 border border-gray-700">
              {Array.from({ length: 18 }, (_, i) => {
                const weekNum = i + 1;
                const weekKey = `week-${weekNum}`;
                const weekItem = weeks[weekKey] || { tag: '' };
                const { date, time } = getGameDateTime(weekNum, weekItem);

                return (
                  <WeekRow
                    key={weekKey}
                    id={weekKey}
                    weekNum={weekNum}
                    gameDate={date}
                    gameTime={time}
                    item={weekItem}
                    activeId={activeId}
                    onTagChange={(tag) => handleTagChange(weekKey, tag as GameTag)}
                    onTimeSlotChange={(timeSlot) => handleTimeSlotChange(weekKey, timeSlot)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </DndContext>
    </div>
  </div>
);
}

interface DraggableItemProps {
  id: string;
  name: string;
  color: string;
  from: string;
  isActive: boolean;
}

const DraggableItem = memo(function DraggableItem({
  id,
  name,
  color,
  from,
  isActive,
}: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    data: { id, name, color, from },
  });

  const team = opponentsList.find(team => team.id === id);
  const logo = team?.logo || '';

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        borderLeftColor: color,
      }
    : { borderLeftColor: color };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-gradient-to-r from-gray-800 to-gray-900 p-3 rounded-lg shadow cursor-move w-full max-w-full border-l-4 ${
        isActive ? 'opacity-75 ring-2 ring-red-500' : ''
      }`}
    >

    <div className="flex items-center">
    {logo ? (
      <div className="w-6 h-6 mr-2 flex-shrink-0">
        <img
          src={logo}
          alt={name.split(' ')[0]}
          className="w-full h-full object-contain"
        />
      </div>
    ) : (
      <div className="w-6 h-6 bg-gray-700 rounded-full mr-2 flex items-center justify-center">
        <span className="text-xs">{name.charAt(0)}</span>
      </div>
    )}
    <span className="font-medium truncate">{name}</span>
  </div>
</div>
);
});

interface WeekRowProps {
  id: string;
  weekNum: number;
  gameDate: string;
  gameTime: string;
  item: ScheduleItem;
  activeId: string | null;
  onTagChange: (tag: string) => void;
  onTimeSlotChange: (timeSlot: string) => void;
}

const WeekRow = memo(function WeekRow({
  id,
  weekNum,
  gameDate,
  gameTime,
  item,
  activeId,
  onTagChange,
  onTimeSlotChange,
}: WeekRowProps) {
  const getTagColor = (tag: GameTag) => {
    switch (tag) {
      case 'TNF': return 'bg-blue-900';
      case 'SNF': return 'bg-purple-900';
      case 'MNF': return 'bg-yellow-900';
      case 'INT': return 'bg-green-900';
      case 'XMAS': return 'bg-red-900';
      case 'BYE': return 'bg-gray-900';
      default: return '';
    }
  };

  return (
    <div className="mb-2 flex flex-col sm:flex-row items-stretch">
      <div className="w-full sm:w-24 flex-shrink-0 text-gray-400 font-medium mb-1 sm:mb-0 flex flex-row sm:flex-col items-center sm:items-start justify-between sm:justify-start px-2 py-1">
        <span>Week {weekNum}</span>
        <div className="flex flex-col items-center sm:items-start">
          <span className="text-sm">{gameDate}</span>
          {gameTime && <span className="text-xs text-gray-500">{gameTime}</span>}
        </div>
      </div>

      <div className="flex-grow flex items-center">
      <DropZone
        id={id}
        isWeek={true}
        hasItem={!!item.team || item.tag === 'BYE'}
        tagColor={getTagColor(item.tag)}
      >
        {item.team ? (
          <DraggableItem
            id={item.team.id}
            name={item.team.name}
            color={item.team.color}
            from={id}
            isActive={activeId === item.team.id}
          />
        ) : item.tag === 'BYE' ? (
          <div className="bg-gray-800 p-3 rounded-lg w-full text-center text-gray-400">
            BYE WEEK
          </div>
        ) : null}
      </DropZone>

      <div className="ml-2 flex-shrink-0 flex flex-col space-y-1">
        <select
          value={item.tag}
          onChange={(e) => onTagChange(e.target.value)}
          className={`bg-gray-800 text-sm rounded-md px-2 py-1 border border-gray-700 ${
            getTagColor(item.tag as GameTag) ? 'text-white' : 'text-gray-400'
          }`}
          style={{ backgroundColor: getTagColor(item.tag as GameTag) || '#1f2937' }}
        >
          {gameTags.map((tag) => (
            <option key={tag.value} value={tag.value}>
              {tag.value || 'Regular'}
            </option>
          ))}
        </select>

        <TimeSlotSelector
        weekId={id}
        tag={item.tag}
        currentTimeSlot={item.timeSlot}
        onTimeSlotChange={(timeSlot) => onTimeSlotChange(timeSlot)}
      />
    </div>
  </div>
</div>
);
});

interface DropZoneProps {
id: string;
label?: string;
children?: React.ReactNode;
isPool?: boolean;
isWeek?: boolean;
hasItem?: boolean;
tagColor?: string;
}

const DropZone = memo(function DropZone({
id,
label,
children,
isPool = false,
isWeek = false,
hasItem = false,
tagColor = '',
}: DropZoneProps) {
const { setNodeRef, isOver } = useDroppable({ id });

return (
<div
  ref={setNodeRef}
  className={`rounded-lg ${
    isPool
      ? 'p-4 bg-gray-800 bg-opacity-50 min-h-[300px] border border-gray-700'
      : isWeek
      ? `p-2 flex-grow flex items-center ${
          hasItem ? 'bg-gray-700' : 'bg-gray-800 bg-opacity-50'
        } ${tagColor || ''} ${isOver ? 'ring-2 ring-red-500' : ''}`
      : ''
  }`}
>
  {label && (
    <div
      className={`text-gray-400 font-medium ${
        isWeek ? 'w-24 flex-shrink-0' : 'mb-2'
      }`}
    >
      {label}
    </div>
  )}
  <div className={`${isWeek ? 'flex-grow' : ''}`}>{children}</div>
</div>
);
});
