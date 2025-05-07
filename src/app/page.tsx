'use client';

import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  useDraggable,
  useDroppable,
  defaultDropAnimationSideEffects,
  rectIntersection,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { memo, useCallback, useMemo, useState } from 'react';

interface Team {
  id: string;
  name: string;
  color: string;
}

interface WeeksState {
  [key: string]: Team;
}

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

export default function Home() {
  const [pool, setPool] = useState<Team[]>(opponentsList);
  const [weeks, setWeeks] = useState<WeeksState>({});
  const [activeId, setActiveId] = useState<string | null>(null);

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
          setPool((prev) => {
            const draggedItem = weeks[activeFrom];
            if (!prev.find((t) => t.id === activeId)) {
              return [...prev, draggedItem];
            }
            return prev;
          });

          setWeeks((prev) => {
            const updated = { ...prev };
            delete updated[activeFrom];
            return updated;
          });
        }
      }

      // Dragged into a week
      else if (overId.startsWith('week-')) {
        const fromPool = pool.find((t) => t.id === activeId);
        const fromWeekKey = Object.entries(weeks).find(
          ([_, val]) => val?.id === activeId
        )?.[0];
        const item = fromPool || weeks[fromWeekKey || ''];

        if (!item) return;

        setWeeks((prev) => ({ ...prev, [overId]: item }));

        if (fromPool) {
          setPool((prev) => prev.filter((t) => t.id !== activeId));
        }

        if (fromWeekKey && fromWeekKey !== overId) {
          setWeeks((prev) => {
            const updated = { ...prev };
            delete updated[fromWeekKey];
            return updated;
          });
        }
      }
    },
    [pool, weeks]
  );

  // Memoize pool team list rendering
  const poolTeams = useMemo(
    () => (
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
    ),
    [pool, activeId]
  );

  // Memoize week slots rendering
  const weekSlots = useMemo(
    () =>
      Array.from({ length: 17 }, (_, i) => {
        const weekKey = `week-${i + 1}`;
        return (
          <DropZone
            key={weekKey}
            id={weekKey}
            label={`Week ${i + 1}`}
            isWeek={true}
            hasItem={!!weeks[weekKey]}
          >
            {weeks[weekKey] ? (
              <DraggableItem
                id={weeks[weekKey].id}
                name={weeks[weekKey].name}
                color={weeks[weekKey].color}
                from={weekKey}
                isActive={activeId === weeks[weekKey].id}
              />
            ) : null}
          </DropZone>
        );
      }),
    [weeks, activeId]
  );

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
                {poolTeams}
              </DropZone>
            </div>

            {/* Weeks */}
            <div className='w-full md:w-1/2'>
              <h2 className='text-xl font-bold mb-3 text-red-500 flex items-center'>
                <span className='mr-2'>Schedule</span>
                <span className='text-sm bg-red-800 text-white px-2 py-1 rounded'>
                  {Object.keys(weeks).length} / 17 weeks
                </span>
              </h2>
              <div className='bg-gray-800 bg-opacity-50 rounded-lg p-4 backdrop-blur-sm border border-gray-700'>
                {weekSlots}
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

// Memoized draggable item to prevent unnecessary re-renders
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
        isActive ? 'opacity-75' : ''
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

interface DropZoneProps {
  id: string;
  label?: string;
  children?: React.ReactNode;
  isPool?: boolean;
  isWeek?: boolean;
  hasItem?: boolean;
}

// Memoized dropzone to prevent unnecessary re-renders
const DropZone = memo(function DropZone({
  id,
  label,
  children,
  isPool = false,
  isWeek = false,
  hasItem = false,
}: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg ${
        isPool
          ? 'p-4 bg-gray-800 bg-opacity-50 min-h-[300px] border border-gray-700'
          : isWeek
          ? `p-3 mb-2 flex items-center ${
              hasItem ? 'bg-gray-700' : 'bg-gray-800 bg-opacity-50'
            } ${isOver ? 'bg-red-900 bg-opacity-30' : ''}`
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
