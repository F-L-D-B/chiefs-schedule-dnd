'use client';

import { DndContext, closestCenter } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { opponents } from '../data/opponents';
import { OpponentCard } from '@/components/OpponentCard';

function SortableItem({ id, name }: { id: string; name: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className='mb-2'
    >
      <OpponentCard name={name} />
    </div>
  );
}

export default function Home() {
  const [items, setItems] = useState(opponents);

  return (
    <main className='p-8 max-w-3xl mx-auto'>
      <h1 className='text-2xl font-bold mb-4 text-center'>
        🏈 Chiefs Ideal Schedule Builder
      </h1>
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={(event) => {
          const { active, over } = event;
          if (active.id !== over?.id) {
            const oldIndex = items.findIndex((item) => item.id === active.id);
            const newIndex = items.findIndex((item) => item.id === over?.id);
            setItems((items) => arrayMove(items, oldIndex, newIndex));
          }
        }}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id} name={item.name} />
          ))}
        </SortableContext>
      </DndContext>
    </main>
  );
}
