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
import Image from 'next/image';

// Game Tags
type GameTag = 'TNF' | 'FNF' | 'SNF' | 'MNF' | 'INT' | 'XMAS' | 'BYE' | '';

interface Team {
    id: string;
    name: string;
    color: string;
    logo: string;
}

interface ScheduleItem {
    team?: Team;
    tag: GameTag;
    timeSlot?: 'noon' | 'mid-day';
}

interface WeeksState {
    [key: string]: ScheduleItem;
}

const gameTags: { value: GameTag; label: string }[] = [
    { value: 'TNF', label: 'Thursday Night Football' },
    { value: 'FNF', label: 'Friday Night Football' },
    { value: 'SNF', label: 'Sunday Night Football' },
    { value: 'MNF', label: 'Monday Night Football' },
    { value: 'INT', label: 'International Game' },
    { value: 'XMAS', label: 'Christmas Game' },
    { value: 'BYE', label: 'Bye Week' },
    { value: '', label: 'Regular Game' },
];

// Calculate dates for the 2025 season
const getWeekDates = () => {
    const weekDates = [];
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const baseDate = new Date(2025, 8, 4); // 09/04/2025

    for (let week = 0; week < 18; week++) {
        const thursdayDate = new Date(baseDate.getTime() + week * msPerWeek);
        const fridayDate = new Date(thursdayDate.getTime() + 1 * 24 * 60 * 60 * 1000);
        const sundayDate = new Date(thursdayDate.getTime() + 3 * 24 * 60 * 60 * 1000);
        const mondayDate = new Date(thursdayDate.getTime() + 4 * 24 * 60 * 60 * 1000);

        weekDates.push({
            week: week + 1,
            friday: fridayDate,
            thursday: thursdayDate,
            sunday: sundayDate,
            monday: mondayDate,
        });
    }

    return weekDates;
};


const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
};

const opponentsList: Team[] = [
    // Home Games
    { id: 'broncos-home', name: 'Broncos (Home)', color: '#FB4F14', logo: '/logos/broncos.png' },
    { id: 'raiders-home', name: 'Raiders (Home)', color: '#000000', logo: '/logos/raiders.png' },
    { id: 'chargers-home', name: 'Chargers (Home)', color: '#0080C6', logo: '/logos/chargers.png' },
    { id: 'ravens-home', name: 'Ravens (Home)', color: '#241773', logo: '/logos/ravens.png' },
    { id: 'lions-home', name: 'Lions (Home)', color: '#0076B6', logo: '/logos/lions.png' },
    { id: 'texans-home', name: 'Texans (Home)', color: '#03202F', logo: '/logos/texans.png' },
    { id: 'colts-home', name: 'Colts (Home)', color: '#002C5F', logo: '/logos/colts.png' },
    { id: 'eagles-home', name: 'Eagles (Home)', color: '#004C54', logo: '/logos/eagles.png' },
    { id: 'commanders-home', name: 'Commanders (Home)', color: '#5A1414', logo: '/logos/commanders.png' },
    // Away Games
    { id: 'broncos-away', name: 'Broncos (Away)', color: '#FB4F14', logo: '/logos/broncos.png' },
    { id: 'raiders-away', name: 'Raiders (Away)', color: '#000000', logo: '/logos/raiders.png' },
    { id: 'chargers-away', name: 'Chargers (Away)', color: '#0080C6', logo: '/logos/chargers.png' },
    { id: 'bills-away', name: 'Bills (Away)', color: '#00338D', logo: '/logos/bills.png' },
    { id: 'cowboys-away', name: 'Cowboys (Away)', color: '#003594', logo: '/logos/cowboys.png' },
    { id: 'jaguars-away', name: 'Jaguars (Away)', color: '#006778', logo: '/logos/jaguars.png' },
    { id: 'giants-away', name: 'Giants (Away)', color: '#0B2265', logo: '/logos/giants.png' },
    { id: 'titans-away', name: 'Titans (Away)', color: '#0C2340', logo: '/logos/titans.png' },
];

export default function Home() {
    const [pool, setPool] = useState<Team[]>(opponentsList);
    const [weeks, setWeeks] = useState<WeeksState>({
        'week-17': { tag: 'XMAS' }
    });

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
                        // Create a complete copy of the team object to ensure type safety
                        const teamToAddToPool: Team = {
                            id: weekItem.team.id,
                            name: weekItem.team.name,
                            color: weekItem.team.color,
                            logo: weekItem.team.logo
                        };

                        setPool((prev) => {
                            // Check if this team is already in the pool
                            if (!prev.find((t) => t.id === teamToAddToPool.id)) {
                                return [...prev, teamToAddToPool];
                            }
                            return prev;
                        });
                    }

                    // Update the week to remove the team but keep the tag
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
                    // Dragging from pool to week
                    setWeeks((prev) => {
                        const existingItem = prev[overId] || { tag: '' };

                        // If the target week already has a team, move it back to the pool
                        if (existingItem.team) {
                            const displacedTeam = {
                                id: existingItem.team.id,
                                name: existingItem.team.name,
                                color: existingItem.team.color,
                                logo: existingItem.team.logo
                            };

                            // Add the displaced team back to the pool
                            setPool((prevPool) => {
                                if (!prevPool.find(t => t.id === displacedTeam.id)) {
                                    return [...prevPool, displacedTeam];
                                }
                                return prevPool;
                            });
                        }

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
                    const sourceWeek = weeks[activeFrom];

                    if (sourceWeek?.team) {
                        const sourceTeam: Team = {
                            id: sourceWeek.team.id,
                            name: sourceWeek.team.name,
                            color: sourceWeek.team.color,
                            logo: sourceWeek.team.logo
                        };

                        // Update both weeks
                        setWeeks((prev) => {
                            const targetWeek = prev[overId] || { tag: '' };
                            const updatedWeeks = { ...prev };

                            // If target already has a team, swap them
                            if (targetWeek.team) {
                                const targetTeam: Team = {
                                    id: targetWeek.team.id,
                                    name: targetWeek.team.name,
                                    color: targetWeek.team.color,
                                    logo: targetWeek.team.logo
                                };

                                updatedWeeks[activeFrom] = {
                                    ...sourceWeek,
                                    team: targetTeam
                                };
                            } else {
                                updatedWeeks[activeFrom] = {
                                    ...sourceWeek,
                                    team: undefined
                                };
                            }

                            updatedWeeks[overId] = {
                                ...targetWeek,
                                team: sourceTeam
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
                    const teamToReturn: Team = {
                        id: existingItem.team.id,
                        name: existingItem.team.name,
                        color: existingItem.team.color,
                        logo: existingItem.team.logo,
                    };

                    setTimeout(() => {
                        setPool((prevPool) => {
                            if (!prevPool.find((t) => t.id === teamToReturn.id)) {
                                return [...prevPool, teamToReturn];
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

            // Normal case
            const existingItem = prev[weekId] || { team: undefined };
            return {
                ...prev,
                [weekId]: { ...existingItem, tag },
            };
        });
    }, []);

    // Get game date based on week number and tag
    const getGameDate = useCallback((weekNum: number, tag: GameTag, timeSlot?: 'noon' | 'mid-day'): string => {
        const weekIndex = weekNum - 1;
        if (weekIndex < 0 || weekIndex >= weekDates.length) return '';

        const dates = weekDates[weekIndex];

        let time = '';
        switch (tag) {
            case 'TNF':
                time = '7:15 PM';
                return `${formatDate(dates.thursday)} • ${time}`;
            case 'FNF':
                time = '7:15 PM';
                return `${formatDate(dates.friday)} • ${time}`;
            case 'MNF':
                time = '7:15 PM';
                return `${formatDate(dates.monday)} • ${time}`;
            case 'SNF':
                time = '7:20 PM';
                return `${formatDate(dates.sunday)} • ${time}`;
            case 'INT':
                time = '8:30 AM';
                return `${formatDate(dates.sunday)} • ${time}`;
            case 'XMAS':
                const xmasDate = new Date(2025, 11, 25); // December 25, 2025
                return `${formatDate(xmasDate)} • 12:00 PM / 3:30 PM`;
            case 'BYE':
                return ''; // No time shown
            default:
                // Regular games
                if (timeSlot === 'mid-day') {
                    return `${formatDate(dates.sunday)} • 3:25 PM`;
                } else {
                    return `${formatDate(dates.sunday)} • 12:00 PM`;
                }
        }
    }, [weekDates]);

    const handleTimeSlotChange = useCallback((weekId: string, slot: 'noon' | 'mid-day') => {
        setWeeks((prev) => ({
            ...prev,
            [weekId]: { ...prev[weekId], timeSlot: slot },
        }));
    }, []);

    return (
        <div className='min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4'>
            <div className='max-w-[96rem] mx-auto'>
                <header className='mb-8 pt-4'>
                    <div className='flex items-center justify-center space-x-4 mb-2'>
                        <div className='w-6 h-6 mr-2 flex-shrink-0'>
                            <Image
                                src={'/logos/chiefs.png'}
                                alt='Chiefs Logo'
                                width={24}
                                height={24}
                                className='object-contain w-full h-full'
                            />
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
                    <div className='flex flex-col lg:flex-row gap-8 items-start'>
                        {/* Team Pool */}
                        <div className='w-full max-w-[16rem]'>
                            <h2 className='text-xl font-bold mb-3 text-red-500 flex items-center'>
                                <span className='mr-2'>Available Teams</span>
                                <span className='text-sm bg-red-800 text-white px-2 py-1 rounded'>
                                    {pool.length} teams
                                </span>
                            </h2>
                            <DropZone id='pool' label='' isPool={true}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
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
                        <div className='w-full flex-grow'>
                            <h2 className='text-xl font-bold mb-3 text-red-500 flex items-center'>
                                <span className='mr-2'>Schedule</span>
                                <span className='text-sm bg-red-800 text-white px-2 py-1 rounded'>
                                    {Object.values(weeks).filter(item => item.team || item.tag === 'BYE').length} / 18 weeks
                                </span>
                            </h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full max-w-full xl:max-w-[1200px]">
                                {Array.from({ length: 18 }, (_, i) => {
                                    const weekNum = i + 1;
                                    const weekKey = `week-${weekNum}`;
                                    const weekItem = weeks[weekKey] || { tag: '' };
                                    const gameDate = getGameDate(weekNum, weekItem.tag, weekItem.timeSlot);

                                    return (
                                        <div
                                            key={weekKey}
                                            className='bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 shadow-sm'
                                        >
                                            <WeekRow
                                                id={weekKey}
                                                weekNum={weekNum}
                                                gameDate={gameDate}
                                                item={weekItem}
                                                activeId={activeId}
                                                onTagChange={(tag) => handleTagChange(weekKey, tag as GameTag)}
                                                onTimeSlotChange={(slot) => handleTimeSlotChange(weekKey, slot)}
                                            />
                                        </div>
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

    // Find the team to get its logo
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
            className={`bg-gradient-to-r from-gray-800 to-gray-900 p-3 rounded-lg shadow cursor-move w-full max-w-full border-l-4 ${isActive ? 'opacity-75 ring-2 ring-red-500' : ''
                }`}
        >
            <div className='flex items-center'>
                {logo ? (
                    <div className='w-6 h-6 mr-2 flex-shrink-0'>
                        <Image
                            src={logo}
                            alt={name.split(' ')[0]}
                            width={24}
                            height={24}
                            className='object-contain w-full h-full'
                        />
                    </div>
                ) : (
                    <div className='w-6 h-6 bg-gray-700 rounded-full mr-2 flex items-center justify-center'>
                        <span className='text-xs'>{name.charAt(0)}</span>
                    </div>
                )}
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
    onTimeSlotChange: (slot: 'noon' | 'mid-day') => void;
}

const WeekRow = memo(function WeekRow({
    id,
    weekNum,
    gameDate,
    item,
    activeId,
    onTagChange,
    onTimeSlotChange,
}: WeekRowProps) {
    const getTagColor = (tag: GameTag) => {
        if (weekNum === 1 && tag === 'FNF') return '';
        switch (tag) {
            case 'TNF': return 'bg-purple-900';
            case 'FNF': return "bg-orange-900";
            case 'SNF': return 'bg-yellow-900';
            case 'MNF': return 'bg-white';
            case 'INT': return 'bg-green-900';
            case 'XMAS': return 'bg-red-900';
            case 'BYE': return 'bg-gray-900';
            default: return '';
        }
    };

    const isBrazilGame =
    item.tag === 'FNF' &&
    item.team?.name === 'Chargers (Away)';

    const isUKGame =
    item.tag === 'INT' &&
    item.team?.name === 'Jaguars (Away)';

    return (
        <div
        className='relative mb-4 p-4 rounded-lg border border-gray-700 shadow-sm flex flex-col sm:flex-row sm:items-start gap-4 overflow-hidden'
        >

            {(isBrazilGame) && (
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `url("/flags/brazil.png")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  zIndex: 0
                }}
              ></div>
            )}

            {isUKGame && (
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `url("/flags/UK.png")`,
                  backgroundSize: '100% 100%',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  zIndex: 0,
                  pointerEvents: 'none',
                }}
              ></div>
            )}



            {/* Week Info (Fixed width) */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-start gap-4 w-full">
            <div className="w-24 flex flex-col items-start text-sm">
              <span className={isUKGame ? 'font-semibold text-white px-1 rounded' : 'font-semibold text-white'}>
                Week {weekNum}
              </span>
              <span className={isUKGame ? 'text-white px-1 rounded' : 'text-gray-300'}>
                {gameDate.split('•')[0].trim()}
              </span>
              {gameDate.includes('•') && (
                <span className={isUKGame ? 'text-white px-1 rounded' : 'text-gray-300'}>
                  {gameDate.split('•')[1].trim()}
                </span>
              )}
            </div>



            {/* Drop Zone */}
            <div className='flex-grow'>
                <DropZone
                    id={id}
                    isWeek
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
                        <div className='bg-gray-800 p-3 rounded-lg w-full text-center text-gray-400'>BYE WEEK</div>
                    ) : null}
                </DropZone>
            </div>

            {/* Controls */}
            <div className='flex flex-col gap-2'>
                <select
                    value={item.tag}
                    onChange={(e) => onTagChange(e.target.value)}
                    disabled={id === 'week-17'}
                    className={`bg-gray-800 text-sm rounded-md px-2 py-1 border border-gray-700 text-gray-300 ${id === 'week-17' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {gameTags.map((tag) => (
                        <option
                            key={tag.value}
                            value={tag.value}
                            disabled={id !== 'week-17' && tag.value === 'XMAS'}
                        >
                            {tag.label}
                        </option>
                    ))}
                </select>


                {item.tag === '' && id !== 'week-17' && (
                    <select
                        value={item.timeSlot || 'noon'}
                        onChange={(e) => onTimeSlotChange(e.target.value as 'noon' | 'mid-day')}
                        className='bg-gray-800 text-sm rounded-md px-2 py-1 border border-gray-700 text-gray-300'
                    >
                        <option value='noon'>12:00 PM</option>
                        <option value='mid-day'>3:25 PM</option>
                    </select>
                )}
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
            className={`rounded-lg ${isPool
                ? 'p-4 bg-gray-800 bg-opacity-50 min-h-[300px] border border-gray-700'
                : isWeek
                    ? `p-2 flex-grow flex items-center ${hasItem ? 'bg-gray-700' : 'bg-gray-800 bg-opacity-50'
                    } ${tagColor || ''} ${isOver ? 'ring-2 ring-red-500' : ''}`
                    : ''
                }`}
        >
            {label && (
                <div
                    className={`text-gray-400 font-medium ${isWeek ? 'w-24 flex-shrink-0' : 'mb-2'
                        }`}
                >
                    {label}
                </div>
            )}
            <div className={`${isWeek ? 'flex-grow' : ''}`}>{children}</div>
        </div>
    );
});
