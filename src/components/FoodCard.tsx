import { Plus, Leaf, Flame } from 'lucide-react';
import type { FoodItem } from '@/types';
import { formatPrice } from '@/lib/utils';

export function FoodCard({
  item,
  onAdd,
  hasCustomization = false,
}: {
  item: FoodItem;
  onAdd?: () => void;
  hasCustomization?: boolean;
}) {
  const price = item.discounted_price ?? item.price;

  return (
    <div className="flex gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          {item.is_vegetarian && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-100">
              <Leaf size={10} className="text-green-600" />
            </span>
          )}
          {item.is_vegan && (
            <span className="badge bg-green-100 text-green-700 text-[10px]">Vegan</span>
          )}
        </div>
        <h3 className="font-semibold text-gray-900 text-sm leading-tight">{item.name}</h3>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
        <div className="flex items-center gap-2 mt-2">
          {item.discounted_price && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(item.price)}
            </span>
          )}
          <span className="font-bold text-gray-900 text-sm">{formatPrice(price)}</span>
          {item.calories && (
            <span className="text-xs text-gray-400">{item.calories} cal</span>
          )}
        </div>
      </div>

      <div className="relative flex-shrink-0">
        <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Flame size={24} className="text-gray-300" />
            </div>
          )}
        </div>
        {item.is_available && (
          <button
            onClick={onAdd}
            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center hover:bg-[#ff5847] hover:text-white transition-colors"
          >
            <Plus size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
