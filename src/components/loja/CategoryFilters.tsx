import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Subcategory {
  _id: string;
  nome: string;
}

interface CategoryFiltersProps {
  subcategories: Subcategory[];
  allVariations: Map<string, Set<string>>;
  priceRange: [number, number];
  draftSubcats: Set<string>;
  setDraftSubcats: (v: Set<string>) => void;
  draftVariations: Set<string>;
  setDraftVariations: (v: Set<string>) => void;
  draftPriceRange: [number, number];
  setDraftPriceRange: (v: [number, number]) => void;
  onApply: () => void;
  onClear: () => void;
  formatPrice: (cents: number) => string;
  /** If true, hides Apply/Clear buttons (desktop sidebar auto-applies) */
  inline?: boolean;
}

export function CategoryFilters({
  subcategories,
  allVariations,
  priceRange,
  draftSubcats,
  setDraftSubcats,
  draftVariations,
  setDraftVariations,
  draftPriceRange,
  setDraftPriceRange,
  onApply,
  onClear,
  formatPrice,
  inline = false,
}: CategoryFiltersProps) {
  const handleMinInput = (val: string) => {
    const cents = Math.max(0, Math.round(parseFloat(val || '0') * 100));
    setDraftPriceRange([cents, draftPriceRange[1]]);
  };

  const handleMaxInput = (val: string) => {
    const cents = Math.max(0, Math.round(parseFloat(val || '0') * 100));
    setDraftPriceRange([draftPriceRange[0], cents]);
  };

  return (
    <div className="space-y-6">
      {/* Subcategories */}
      {subcategories.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Subcategorias</h3>
          <div className="space-y-2">
            {subcategories.map(sub => (
              <label key={sub._id} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={draftSubcats.has(sub._id)}
                  onCheckedChange={(checked) => {
                    const next = new Set(draftSubcats);
                    if (checked) next.add(sub._id); else next.delete(sub._id);
                    setDraftSubcats(next);
                  }}
                />
                <span className="text-sm">{sub.nome}</span>
              </label>
            ))}
          </div>
          <Separator className="mt-4" />
        </div>
      )}

      {/* Variations */}
      {allVariations.size > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Variações</h3>
          {Array.from(allVariations.entries()).map(([tipo, nomes]) => (
            <div key={tipo} className="mb-4">
              <p className="text-xs text-muted-foreground mb-2 uppercase">{tipo}</p>
              <div className="space-y-2">
                {Array.from(nomes).map(nome => (
                  <label key={nome} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={draftVariations.has(nome)}
                      onCheckedChange={(checked) => {
                        const next = new Set(draftVariations);
                        if (checked) next.add(nome); else next.delete(nome);
                        setDraftVariations(next);
                      }}
                    />
                    <span className="text-sm">{nome}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <Separator className="mt-2" />
        </div>
      )}

      {/* Price Range - Dual Slider + Inputs */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Faixa de Preço</h3>
        <div className="px-2">
          <Slider
            min={priceRange[0]}
            max={priceRange[1] || 100000}
            step={100}
            value={draftPriceRange}
            onValueChange={(v) => setDraftPriceRange(v as [number, number])}
          />
        </div>
        <div className="flex gap-2 mt-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Mínimo</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
              <Input
                type="number"
                min={0}
                step={1}
                value={(draftPriceRange[0] / 100).toFixed(0)}
                onChange={(e) => handleMinInput(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Máximo</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
              <Input
                type="number"
                min={0}
                step={1}
                value={(draftPriceRange[1] / 100).toFixed(0)}
                onChange={(e) => handleMaxInput(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Apply / Clear buttons */}
      {!inline && (
        <div className="flex gap-2 pt-4 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={onClear}>Limpar</Button>
          <Button className="flex-1" onClick={onApply}>Aplicar</Button>
        </div>
      )}
    </div>
  );
}
