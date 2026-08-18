import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { FoodItem, FoodVariation, VariationOption, FoodAddon, SelectedVariation, SelectedAddon } from '@/types';
import { getFoodItemDetails } from '@/services/restaurantService';
import { formatPrice } from '@/lib/utils';
import { Minus, Plus, Check } from 'lucide-react';

export function FoodCustomizationModal({
  item,
  onClose,
  onAdd,
}: {
  item: FoodItem;
  onClose: () => void;
  onAdd: (
    item: FoodItem,
    quantity: number,
    variations: SelectedVariation[],
    addons: SelectedAddon[],
    instructions: string
  ) => void;
}) {
  const [variations, setVariations] = useState<FoodVariation[]>([]);
  const [options, setOptions] = useState<Record<string, VariationOption[]>>({});
  const [addons, setAddons] = useState<FoodAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const details = await getFoodItemDetails(item.id);
        setVariations(details.variations);
        setAddons(details.addons);

        const optsMap: Record<string, VariationOption[]> = {};
        details.variations.forEach((v) => {
          optsMap[v.id] = details.options.filter((o) => o.variation_id === v.id);
        });
        setOptions(optsMap);

        const defaults: Record<string, string> = {};
        details.variations.forEach((v) => {
          const defOpt = optsMap[v.id]?.find((o) => o.is_default);
          if (defOpt) defaults[v.id] = defOpt.id;
        });
        setSelectedOptions(defaults);
      } catch (err) {
        console.error('Failed to load item details:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [item.id]);

  const basePrice = item.discounted_price ?? item.price;
  const variationTotal = variations.reduce((sum, v) => {
    const optId = selectedOptions[v.id];
    const opt = options[v.id]?.find((o) => o.id === optId);
    return sum + (opt?.price_modifier || 0);
  }, 0);
  const addonTotal = addons
    .filter((a) => selectedAddons.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0);
  const unitPrice = basePrice + variationTotal + addonTotal;
  const totalPrice = unitPrice * quantity;

  function handleAdd() {
    const selectedVars: SelectedVariation[] = variations.map((v) => {
      const optId = selectedOptions[v.id];
      const opt = options[v.id]?.find((o) => o.id === optId);
      return {
        variation: v.name,
        option: opt?.name || '',
        price_modifier: opt?.price_modifier || 0,
      };
    }).filter((v) => v.option);

    const selectedAddonData: SelectedAddon[] = addons
      .filter((a) => selectedAddons.includes(a.id))
      .map((a) => ({ name: a.name, price: a.price }));

    onAdd(item, quantity, selectedVars, selectedAddonData, instructions);
  }

  if (loading) {
    return (
      <Modal open={true} onClose={onClose} title="Customize">
        <div className="py-8 text-center text-gray-500">Loading...</div>
      </Modal>
    );
  }

  return (
    <Modal open={true} onClose={onClose} title="Customize Your Order" size="lg">
      <div className="space-y-4">
        <div className="flex gap-3">
          <img
            src={item.image_url || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200'}
            alt={item.name}
            className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
          />
          <div>
            <h3 className="font-bold text-gray-900">{item.name}</h3>
            <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
            <p className="font-bold text-[#ff5847] mt-1">{formatPrice(basePrice)}</p>
          </div>
        </div>

        {variations.map((variation) => (
          <div key={variation.id}>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">{variation.name}</label>
              {variation.is_required && (
                <span className="text-xs text-[#ff5847] font-semibold">Required</span>
              )}
            </div>
            <div className="space-y-2">
              {options[variation.id]?.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() =>
                    setSelectedOptions((prev) => ({ ...prev, [variation.id]: opt.id }))
                  }
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    selectedOptions[variation.id] === opt.id
                      ? 'border-[#ff5847] bg-[#ff5847]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedOptions[variation.id] === opt.id
                          ? 'border-[#ff5847]'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedOptions[variation.id] === opt.id && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff5847]" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{opt.name}</span>
                  </div>
                  {opt.price_modifier > 0 && (
                    <span className="text-sm font-semibold text-gray-600">
                      +{formatPrice(opt.price_modifier)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        {addons.length > 0 && (
          <div>
            <label className="label">Add-ons</label>
            <div className="space-y-2">
              {addons.map((addon) => (
                <button
                  key={addon.id}
                  onClick={() =>
                    setSelectedAddons((prev) =>
                      prev.includes(addon.id)
                        ? prev.filter((id) => id !== addon.id)
                        : [...prev, addon.id]
                    )
                  }
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    selectedAddons.includes(addon.id)
                      ? 'border-[#ff5847] bg-[#ff5847]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                        selectedAddons.includes(addon.id)
                          ? 'border-[#ff5847] bg-[#ff5847]'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedAddons.includes(addon.id) && (
                        <Check size={12} className="text-white" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{addon.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-600">
                    +{formatPrice(addon.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="label">Special Instructions</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Any allergies, preferences, or notes for the restaurant..."
            className="input min-h-[80px] resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50"
            >
              <Minus size={16} />
            </button>
            <span className="font-bold text-lg w-8 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50"
            >
              <Plus size={16} />
            </button>
          </div>
          <Button onClick={handleAdd} size="lg" className="flex-1 ml-4">
            Add to Cart · {formatPrice(totalPrice)}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
