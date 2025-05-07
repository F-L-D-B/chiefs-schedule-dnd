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

interface Team {
  id: string;
  name: string;
  color: string;
}

interface ScheduleItem {
  team?: Team;
  tag: GameTag;
}

interface WeeksState {
  [key: string]: ScheduleItem;
}

// Calculate dates for the 2025 season
const getWeekDates = () => {
  // Starting with Thursday of week 1 (09/04/2025)
  const startDate = new Date(2025, 8, 4); // Month is 0-indexed (8 = September)
  const weekDates = [];

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
  // Home Games
  { id: 'broncos-home', name: 'Broncos (Home)', color: '#FB4F14' },
  { id: 'raiders-home', name: 'Raiders (Home)', color: '#000000' },
  { id: 'chargers-home', name: 'Chargers (Home)', color: '#0080C6' },
  { id: 'ravens-home', name: 'Ravens (Home)', color: '#241773' },
  { id: 'lions-home', name: 'Lions (Home)', color: '#0076B6' },
  { id: 'texans-home', name: 'Texans (Home)', color: '#03202F' },
  { id: 'colts-home', name: 'Colts (Home)', color: '#002C5F' },
  { id: 'eagles-home', name: 'Eagles (Home)', color: '#004C54' },
  { id: 'commanders-home', name: 'Commanders (Home)', color: '#5A1414' },
  // Away Games
  { id: 'broncos-away', name: 'Broncos (Away)', color: '#FB4F14' },
  { id: 'raiders-away', name: 'Raiders (Away)', color: '#000000' },
  { id: 'chargers-away', name: 'Chargers (Away)', color: '#0080C6' },
  { id: 'bills-away', name: 'Bills (Away)', color: '#00338D' },
  { id: 'cowboys-away', name: 'Cowboys (Away)', color: '#003594' },
  { id: 'jaguars-away', name: 'Jaguars (Away)', color: '#006778' },
  { id: 'giants-away', name: 'Giants (Away)', color: '#0B2265' },
  { id: 'titans-away', name: 'Titans (Away)', color: '#0C2340' },
];

// Available game tags
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

  // Performance optimization - memoize collision detection algorithm
  const collisionDetection = useMemo(() => rectIntersection, []);

  // Performance optimization - memoize modifiers
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

      // Dragged into team pool
      if (overId === 'pool') {
        if (activeFrom?.startsWith('week-')) {
          // Get the team from the week and add it back to pool
          const weekItem = weeks[activeFrom];
          if (weekItem?.team) {
            const teamToAdd = weekItem.team; // Create a local variable to satisfy TypeScript
            setPool((prev) => {
              if (!prev.find((t) => t.id === teamToAdd.id)) {
                return [...prev, teamToAdd];
              }
              return prev;
            });
          }

          // Update the week to remove the team but keep the tag
          setWeeks((prev) => {
            const updated = { ...prev };
            if (updated[activeFrom]) {
              updated[activeFrom] = { ...updated[activeFrom], team: undefined };
            }
            return updated;
          });
        }
      }

      // Dragged into a week
      else if (overId.startsWith('week-')) {
        const fromPool = pool.find((t) => t.id === activeId);
        
        if (fromPool) {
          // Dragging from pool to week
          setWeeks((prev) => {
            const existingItem = prev[overId] || { tag: '' };
            return { 
              ...prev, 
              [overId]: { 
                ...existingItem,
                team: fromPool 
              } 
            };
          });
          
          setPool((prev) => prev.filter((t) => t.id !== activeId));
        } else if (activeFrom?.startsWith('week-')) {
          // Dragging from week to week
          const draggedWeekItem = weeks[activeFrom];
          
          if (draggedWeekItem?.team) {
            // Update target week
            setWeeks((prev) => {
              const targetExistingItem = prev[overId] || { tag: '' };
              const sourceExistingItem = prev[activeFrom];
              
              // If target already has a team, swap them
              const updatedWeeks = { ...prev };
              
              if (targetExistingItem.team) {
                updatedWeeks[activeFrom] = { 
                  ...sourceExistingItem, 
                  team: targetExistingItem.team 
                };
              } else {
                updatedWeeks[activeFrom] = { 
                  ...sourceExistingItem, 
                  team: undefined 
                };
              }
              
              updatedWeeks[overId] = { 
                ...targetExistingItem, 
                team: draggedWeekItem.team 
              };
              
              return updatedWeeks;
            });
          }
        }
      }
    },
    [pool, weeks]
  );

  // Handle tag change for a week
  const handleTagChange = useCallback((weekId: string, tag: GameTag) => {
    setWeeks((prev) => {
      // Special case: If selecting BYE tag, remove any team
      if (tag === 'BYE') {
        const existingItem = prev[weekId];
        if (existingItem?.team) {
          // Add team back to pool
          setPool((prevPool) => {
            if (!prevPool.find((t) => t.id === existingItem.team?.id)) {
              return [...prevPool, existingItem.team];
            }
            return prevPool;
          });
        }
        
        return {
          ...prev,
          [weekId]: { tag, team: undefined }
        };
      }
      
      // Normal case: Just update the tag
      const existingItem = prev[weekId] || { team: undefined };
      return {
        ...prev,
        [weekId]: { ...existingItem, tag }
      };
    });
  }, []);

  // Get game date based on week number and tag
  const getGameDate = useCallback((weekNum: number, tag: GameTag): string => {
    const weekIndex = weekNum - 1;
    if (weekIndex < 0 || weekIndex >= weekDates.length) return '';
    
    const dates = weekDates[weekIndex];
    
    if (tag === 'TNF' || tag === 'XMAS') {
      return formatDate(dates.thursday);
    } else if (tag === 'MNF') {
      return formatDate(dates.monday);
    } else {
      return formatDate(dates.sunday);
    }
  }, [weekDates]);

  return (
    <div className='min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4'>
      <div className='max-w-7xl mx-auto'>
        <header className='mb-8 pt-4'>
          <div className='flex items-center justify-center space-x-4 mb-2'>
            <div className='w-12 h-12 bg-red-600 rounded-full flex items-center justify-center'>
              <span className='text-2xl'>🏈</span>
            </div>
            <h1 className='text-3xl font-bold text-red-500'>
              Chiefs Schedule Builder
            </h1>
          </div>
          <p className='text-center text-gray-400'>
            Drag and drop teams to build your ideal Chiefs schedule
          </p>
        </header>

        <DndContext
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          collisionDetection={collisionDetection}
          modifiers={modifiers}
        >
          <div className='flex flex-col md:flex-row gap-6'>
            {/* Team Pool */}
            <div className='w-full md:w-1/2 mb-6 md:mb-0'>
              <h2 className='text-xl font-bold mb-3 text-red-500 flex items-center'>
                <span className='mr-2'>Available Teams</span>
                <span className='text-sm bg-red-800 text-white px-2 py-1 rounded'>
                  {pool.length} teams
                </span>
              </h2>
              <DropZone id='pool' label='' isPool={true}>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                  {pool.map((team) => (
                    <DraggableItem
                      key={team.id}
                      id={team.id}
                      name={team.name}
                      color={team.color}
                      from='pool'
                      isActive={activeId === team.id}
                    />
                  ))}
                </div>
              </DropZone>
            </div>

            {/* Weeks */}
            <div className='w-full md:w-1/2'>
              <h2 className='text-xl font-bold mb-3 text-red-500 flex items-center'>
                <span className='mr-2'>Schedule</span>
                <span className='text-sm bg-red-800 text-white px-2 py-1 rounded'>
                  {Object.values(weeks).filter(item => item.team || item.tag === 'BYE').length} / 18 weeks
                </span>
              </h2>
              <div className='bg-gray-800 bg-opacity-50 rounded-lg p-4 border border-gray-700'>
                {Array.from({ length: 18 }, (_, i) => {
                  const weekNum = i + 1;
                  const weekKey = `week-${weekNum}`;
                  const weekItem = weeks[weekKey] || { tag: '' };
                  const gameDate = getGameDate(weekNum, weekItem.tag);
                  
                  return (
                    <WeekRow
                      key={weekKey}
                      id={weekKey}
                      weekNum={weekNum}
                      gameDate={gameDate}
                      item={weekItem}
                      activeId={activeId}
                      onTagChange={(tag) => handleTagChange(weekKey, tag as GameTag)}
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
      <div className='flex items-center'>
        <div className='w-6 h-6 bg-gray-700 rounded-full mr-2 flex items-center justify-center'>
          <span className='text-xs'>{name.charAt(0)}</span>
        </div>
        <span className='font-medium truncate'>{name}</span>
      </div>
    </div>
  );
});

interface WeekRowProps {
  id: string;
  weekNum: number;
  gameDate: string;
  item: ScheduleItem;
  activeId: string | null;
  onTagChange: (tag: string) => void;
}

const WeekRow = memo(function WeekRow({
  id,
  weekNum,
  gameDate,
  item,
  activeId,
  onTagChange,
}: WeekRowProps) {
  // Get background color based on tag
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
    <div className='mb-2 flex flex-col sm:flex-row items-stretch'>
      {/* Week number and date */}
      <div className='w-full sm:w-24 flex-shrink-0 text-gray-400 font-medium mb-1 sm:mb-0 flex flex-row sm:flex-col items-center sm:items-start justify-between sm:justify-start px-2 py-1'>
        <span>Week {weekNum}</span>
        <span className='text-sm'>{gameDate}</span>
      </div>
      
      {/* Game slot */}
      <div className='flex-grow flex items-center'>
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
            <div className='bg-gray-800 p-3 rounded-lg w-full text-center text-gray-400'>
              BYE WEEK
            </div>
          ) : null}
        </DropZone>
        
        {/* Tag selector */}
        <div className='ml-2 flex-shrink-0'>
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
