import { ReactNode } from 'react';

interface ItemGridProps {
  viewMode: 'card' | 'list';
  effectiveColumnCount: number;
  children: ReactNode;
}

function ItemGrid({ viewMode, effectiveColumnCount, children }: ItemGridProps) {
  const getGridClassName = () => {
    if (viewMode === 'card') {
      return `grid gap-4 ${
        effectiveColumnCount === 1 ? 'grid-cols-1' :
        effectiveColumnCount === 2 ? 'grid-cols-1 md:grid-cols-2' :
        effectiveColumnCount === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      }`;
    } else {
      return `${
        effectiveColumnCount === 1 ? 'space-y-0' :
        effectiveColumnCount === 2 ? 'grid grid-cols-2 gap-x-4' :
        effectiveColumnCount === 3 ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4' :
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4'
      }`;
    }
  };

  return (
    <div className="flex-1 overflow-auto pr-2">
      <div className={getGridClassName()}>
        {children}
      </div>
    </div>
  );
}

export default ItemGrid;