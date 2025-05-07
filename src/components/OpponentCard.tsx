import React from 'react';

export const OpponentCard = ({ name }: { name: string }) => (
  <div className='p-2 bg-red-600 text-white rounded shadow'>{name}</div>
);
