import React from 'react';

export const Week = ({
  children,
  week,
}: {
  children: React.ReactNode;
  week: number;
}) => (
  <div className='border p-3 rounded min-h-[60px] bg-gray-100'>
    <strong>Week {week}</strong>
    <div className='mt-2'>{children}</div>
  </div>
);
