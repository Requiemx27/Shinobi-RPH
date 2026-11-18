import React, { useMemo, useState } from 'react';
import { CreditCard, Lock, Package, Search, ShoppingBag, Sparkles, Swords, Tag } from 'lucide-react';
import { CharacterModel } from '../game/engine.ts';
import { LanguageCode, t } from '../game/i18n.ts';
import { GearSlot, ITEM_CATALOG, ItemDef } from '../game/narutoData.ts';
import { shinobiAudio } from '../game/sound.ts';
import { apiFetch } from '../utils/api.ts';

export interface MarketListing {
  id: number;
  sellerUid: string;
  sellerName: string;
  sellerVillage: string;
  itemId: string;
  qty: number;
  priceRyo: number;
  status: string;
}

interface MarketArsenalProps {
  character: CharacterModel;
  listings: MarketListing[];
  lang: LanguageCode;
  onRefreshCharacter: () => Promise<void>;
  onRefreshMarket: () => Promise<void>;
}

const SLOT_LABELS: Array<{ slot: GearSlot; label: string }> = [
  { slot: 'weapon', label: 'Arma Principal' },
  { slot: 'armor', label: 'Colete / Manto' },
  { slot: 'headband', label: 'Bandana / Máscara' },
  { slot: 'accessory', label: 'Acessório / Selo' },
];

function getRarityTextClass(rarity: ItemDef['rarity']): string {
  switch (rarity) {
    case 'Lendário':
      return 'text-amber-300';
    case 'Épico':
      return 'text-emerald-300';
    case 'Raro':
      return 'text-sky-300';
    default:
      return 'text-zinc-400';
  }
}

export const MarketArsenal: React.FC<MarketArsenalProps> = ({
  character,
  listings,
  lang,
  onRefreshCharacter,
  onRefreshMarket,
}) => {
  const [subTab, setSubTab] = useState<'inventory' | 'shop' | 'p2p' | 'stripe'>('inventory');
  const [shopCategory, setShopCategory] = useState<'all' | 'weapon' | 'armor' | 'accessory' | 'consumable'>('all');
  const [shopSearch, setShopSearch] = useState('');
  const [sellItemId, setSellItemId] = useState<string>('');
  const [sellPrice, setSellPrice] = useState<string>('500');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const shopItems = useMemo(() => {
    const q = shopSearch.trim().toLowerCase();
    return ITEM_CATALOG.filter((item) => {
      if (item.dropOnly) return false;
      if (shopCategory !== 'all') {
        if (shopCategory === 'armor' && item.category !== 'armor' && item.category !== 'headband') {
          return false;
        } else if (shopCategory !== 'armor' && item.category !== shopCategory) {
          return false;
        }
      }
      if (q) {
        const hay = `${item.name} ${item.description} ${item.rarity}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [shopCategory, shopSearch]);

  const handleEquip = async (itemId: string) => {
    setBusy(true);
    setStatusMsg(null);
    try {
      await apiFetch('/api/inventory/equip', {
        method: 'POST',
        body: JSON.stringify({ itemId }),
      });
      shinobiAudio.playUiClick();
      await onRefreshCharacter();
    } catch (err) {
      setStatusMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleUnequip = async (unequipSlot: GearSlot) => {
    setBusy(true);
    setStatusMsg(null);
    try {
      await apiFetch('/api/inventory/equip', {
        method: 'POST',
        body: JSON.stringify({ unequipSlot }),
      });
      shinobiAudio.playUiClick();
      await onRefreshCharacter();
    } catch (err) {
      setStatusMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleBuyShop = async (itemId: string) => {
    setBusy(true);
    setStatusMsg(null);
    try {
      await apiFetch('/api/inventory/buy', {
        method: 'POST',
        body: JSON.stringify({ itemId }),
      });
      shinobiAudio.playUiClick();
      setStatusMsg('Equipamento adquirido na loja da vila!');
      await onRefreshCharacter();
    } catch (err) {
      setStatusMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellItemId) return;
    setBusy(true);
    setStatusMsg(null);
    try {
      await apiFetch('/api/market/list', {
        method: 'POST',
        body: JSON.stringify({ itemId: sellItemId, priceRyo: Number(sellPrice) }),
      });
      shinobiAudio.playUiClick();
      setStatusMsg('Item anunciado no Mercado P2P!');
      setSellItemId('');
      await Promise.all([onRefreshCharacter(), onRefreshMarket()]);
    } catch (err) {
      setStatusMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleBuyListing = async (listingId: number) => {
    setBusy(true);
    setStatusMsg(null);
    try {
      await apiFetch(`/api/market/buy/${listingId}`, { method: 'POST' });
      shinobiAudio.playLevelUpChime();
      setStatusMsg('Troca concluída com sucesso!');
      await Promise.all([onRefreshCharacter(), onRefreshMarket()]);
    } catch (err) {
      setStatusMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleStripeCheckout = async (packId: string) => {
    setBusy(true);
    setStatusMsg(null);
    try {
      const res = await apiFetch<{
        mode: string;
        checkoutUrl?: string;
        ryoGranted?: number;
        vipTier?: string | null;
      }>('/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({ packId }),
      });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      shinobiAudio.playLevelUpChime();
      setStatusMsg(`Checkout verificado: +${res.ryoGranted} Ryo adicionados à sua carteira!`);
      await onRefreshCharacter();
    } catch (err) {
      setStatusMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#24242E] pb-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#F4F4F6]">
            Arsenal, Economia & Mercado entre Jogadores
          </h2>
          <p className="text-sm text-[#8E8E9A]">
            Saldo atual: <span className="font-mono tabular-nums text-[#22C55E]">{character.ryo.toLocaleString('pt-BR')} Ryo</span>
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0C0C10] p-1 rounded-lg border border-[#24242E]">
          {[
            { id: 'inventory', label: 'Equipamento & Mochila', icon: Package },
            { id: 'shop', label: 'Ferreiro da Vila', icon: ShoppingBag },
            { id: 'p2p', label: 'Mercado P2P', icon: Tag },
            { id: 'stripe', label: 'Recarga Stripe', icon: CreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id as typeof subTab)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium cursor-pointer whitespace-nowrap ${
                  active ? 'bg-[#10B981] text-[#050505] font-bold' : 'text-[#8E8E9A] hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {statusMsg && (
        <div className="px-4 py-2.5 rounded bg-[#0C0C10] border border-[#10B981] text-xs text-[#F4F4F6]">
          {statusMsg}
        </div>
      )}

      {subTab === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Equipped Slots */}
          <div className="lg:col-span-5 bg-[#0C0C10] border border-[#24242E] rounded-lg p-5 space-y-4">
            <h3 className="font-display text-base font-bold text-[#F4F4F6]">
              Equipamento Ativo
            </h3>
            <div className="space-y-3">
              {SLOT_LABELS.map(({ slot, label }) => {
                const equippedId = character.equippedGear?.[slot];
                const def = ITEM_CATALOG.find((i) => i.id === equippedId);
                const hasImg = Boolean(def?.imageUrl && !failedImages[`eq_${def.id}`]);
                return (
                  <div
                    key={slot}
                    className="p-3.5 rounded bg-[#08080B] border border-[#24242E] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-md border border-[#24242E] bg-[#050505] overflow-hidden shrink-0 flex items-center justify-center">
                        {def && hasImg ? (
                          <img
                            src={def.imageUrl}
                            alt={def.name}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setFailedImages((prev) => ({ ...prev, [`eq_${def.id}`]: true }))
                            }
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Swords className="w-4 h-4 text-[#22C55E]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] text-[#8E8E9A]">{label}</div>
                        <div className="text-sm font-semibold text-[#F4F4F6] truncate">
                          {def ? def.name : 'Slot Vazio'}
                        </div>
                        {def && (
                          <div className="text-[11px] font-mono tabular-nums text-[#22C55E] mt-0.5">
                            {Object.entries(def.statBonuses)
                              .map(([k, v]) => `+${v} ${k}`)
                              .join(' · ')}
                          </div>
                        )}
                      </div>
                    </div>
                    {def && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleUnequip(slot)}
                        className="px-3 py-1.5 rounded bg-[#151720] hover:bg-[#1E222E] border border-[#2A2D3C] text-xs text-[#E4E4E7] cursor-pointer shrink-0"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bag Items */}
          <div className="lg:col-span-7 bg-[#0C0C10] border border-[#24242E] rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-[#F4F4F6]">
                Inventário do Shinobi & Espólios de Missão
              </h3>
              <span className="text-xs text-[#8E8E9A]">
                Itens raros obtidos pós-missão aparecem automaticamente aqui
              </span>
            </div>
            {(!character.inventory || character.inventory.length === 0) ? (
              <p className="text-sm text-[#8E8E9A]">
                Mochila vazia. Conclua missões para coletar espólios raros ou visite o Ferreiro da Vila.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {character.inventory.map((entry) => {
                  const def = ITEM_CATALOG.find((i) => i.id === entry.itemId);
                  if (!def || entry.qty <= 0) return null;
                  const hasImg = Boolean(def.imageUrl && !failedImages[def.id]);
                  const villageLocked =
                    Boolean(def.villageRequired) && def.villageRequired !== character.village;
                  return (
                    <div
                      key={entry.itemId}
                      className={`p-3.5 rounded bg-[#08080B] border flex flex-col justify-between gap-3 ${
                        def.dropOnly ? 'border-emerald-500/45' : 'border-[#24242E]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-md border border-[#24242E] bg-[#050505] overflow-hidden shrink-0 flex items-center justify-center">
                          {hasImg ? (
                            <img
                              src={def.imageUrl}
                              alt={def.name}
                              referrerPolicy="no-referrer"
                              onError={() =>
                                setFailedImages((prev) => ({ ...prev, [def.id]: true }))
                              }
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Swords className="w-5 h-5 text-[#22C55E]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                            <span className={`font-semibold ${getRarityTextClass(def.rarity)}`}>
                              {def.rarity}
                              {def.dropOnly ? ' · Espólio Raro' : ''}
                            </span>
                            <span className="text-[#22C55E] font-bold">×{entry.qty}</span>
                          </div>
                          <div className="text-sm font-semibold text-[#F4F4F6] mt-0.5 truncate">
                            {def.name}
                          </div>
                          <p className="text-xs text-[#8E8E9A] mt-0.5 line-clamp-2">
                            {def.description}
                          </p>
                          {Object.keys(def.statBonuses).length > 0 && (
                            <div className="text-[11px] font-mono tabular-nums text-[#22C55E] mt-1">
                              {Object.entries(def.statBonuses)
                                .map(([k, v]) => `+${v} ${k}`)
                                .join(' · ')}
                            </div>
                          )}
                        </div>
                      </div>

                      {def.category !== 'consumable' ? (
                        villageLocked ? (
                          <div className="text-[11px] text-amber-300 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span>Exclusivo de {def.villageRequired}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleEquip(def.id)}
                            className="w-full py-1.5 rounded bg-[#121218] hover:bg-[#10B981] hover:text-[#050505] border border-[#10B981] text-xs font-semibold text-white cursor-pointer transition-colors"
                          >
                            {t(lang, 'equip')}
                          </button>
                        )
                      ) : (
                        <div className="text-[11px] text-[#22C55E]">
                          Uso tático em Combate na Arena ({def.healHp ? `+${def.healHp} HP` : ''}{' '}
                          {def.healChakra ? `+${def.healChakra} CH` : ''})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'shop' && (
        <div className="space-y-4">
          <div className="bg-[#0C0C10] border border-[#24242E] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'weapon', label: 'Armas & Espadas' },
                { id: 'armor', label: 'Coletes & Bandanas' },
                { id: 'accessory', label: 'Acessórios' },
                { id: 'consumable', label: 'Suprimentos' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setShopCategory(cat.id as typeof shopCategory)}
                  className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer whitespace-nowrap transition-colors ${
                    shopCategory === cat.id
                      ? 'bg-[#10B981] text-[#050505] font-bold'
                      : 'bg-[#08080B] border border-[#24242E] text-[#8E8E9A] hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#8E8E9A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={shopSearch}
                onChange={(e) => setShopSearch(e.target.value)}
                placeholder="Buscar item no ferreiro..."
                aria-label="Buscar equipamento no Ferreiro da Vila"
                className="w-full pl-8 pr-3 py-1.5 rounded bg-[#08080B] border border-[#24242E] focus:border-[#10B981] focus:outline-none text-xs text-white"
              />
            </div>
          </div>

          <div className="px-4 py-2.5 rounded-lg bg-[#080A0D] border border-[#1E242B] text-xs text-[#A1A1AA] flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
            <span>
              Relíquias de Missão (como Lâminas de Chakra, Pílulas das Três Cores e Elixir Byakugou) não são vendidas no ferreiro — conquiste-as vencendo missões ou negociando no Mercado P2P.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shopItems.map((item) => {
              const hasImg = Boolean(item.imageUrl && !failedImages[item.id]);
              const villageLocked =
                Boolean(item.villageRequired) && item.villageRequired !== character.village;
              return (
                <div
                  key={item.id}
                  className="bg-[#0C0C10] border border-[#24242E] rounded-lg p-5 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-md border border-[#24242E] bg-[#07080A] overflow-hidden shrink-0 flex items-center justify-center">
                        {hasImg ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setFailedImages((prev) => ({ ...prev, [item.id]: true }))
                            }
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Swords className="w-5 h-5 text-[#22C55E]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                          <span className={`font-semibold ${getRarityTextClass(item.rarity)}`}>
                            {item.rarity}
                          </span>
                          <span className="text-[#8E8E9A]">{item.category}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-[#F4F4F6] mt-0.5">{item.name}</h3>
                      </div>
                    </div>

                    <p className="text-xs text-[#8E8E9A] leading-relaxed">{item.description}</p>
                    {Object.keys(item.statBonuses).length > 0 && (
                      <div className="text-[11px] font-mono tabular-nums text-[#22C55E]">
                        {Object.entries(item.statBonuses)
                          .map(([k, v]) => `+${v} ${k}`)
                          .join(' · ')}
                      </div>
                    )}
                    {item.villageRequired && (
                      <div className="text-[11px] text-amber-300">
                        Restrição: Ninjas de {item.villageRequired} (Sete Espadachins da Névoa)
                      </div>
                    )}
                  </div>

                  {villageLocked ? (
                    <div className="w-full py-2 px-3 rounded bg-[#08080B] border border-[#24242E] text-[11px] text-amber-300 flex items-center justify-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>Exclusivo de {item.villageRequired}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={busy || character.ryo < item.priceRyo}
                      onClick={() => handleBuyShop(item.id)}
                      className="w-full py-2 rounded bg-[#10B981] hover:bg-[#22C55E] disabled:opacity-40 text-xs font-bold text-[#050505] font-mono tabular-nums cursor-pointer transition-colors"
                    >
                      {t(lang, 'buy')} · {item.priceRyo.toLocaleString('pt-BR')} Ryo
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab === 'p2p' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateListing}
            className="lg:col-span-4 bg-[#0C0C10] border border-[#24242E] rounded-lg p-5 space-y-4 h-fit"
          >
            <h3 className="font-display text-base font-bold text-[#F4F4F6]">
              Anunciar Item para Troca
            </h3>
            <div>
              <label htmlFor="sell-item-select" className="block text-xs text-[#D4D4DC] mb-1">
                Item do Inventário
              </label>
              <select
                id="sell-item-select"
                required
                value={sellItemId}
                onChange={(e) => setSellItemId(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#08080B] border border-[#24242E] text-xs text-white"
              >
                <option value="">Selecione um item...</option>
                {(character.inventory || []).map((entry) => {
                  const def = ITEM_CATALOG.find((i) => i.id === entry.itemId);
                  if (!def || entry.qty <= 0) return null;
                  return (
                    <option key={entry.itemId} value={entry.itemId}>
                      {def.name} (x{entry.qty})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label htmlFor="sell-price-input" className="block text-xs text-[#D4D4DC] mb-1">
                Preço em Ryo
              </label>
              <input
                id="sell-price-input"
                type="number"
                min={50}
                max={500000}
                required
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#08080B] border border-[#24242E] text-sm font-mono tabular-nums text-white"
              />
            </div>

            <button
              type="submit"
              disabled={busy || !sellItemId}
              className="w-full py-2.5 rounded bg-[#10B981] hover:bg-[#22C55E] disabled:opacity-40 text-xs font-bold text-[#050505] cursor-pointer"
            >
              Publicar no Mercado P2P
            </button>
          </form>

          <div className="lg:col-span-8 space-y-3">
            {listings.length === 0 ? (
              <div className="bg-[#0C0C10] border border-[#24242E] rounded-lg p-6 text-sm text-[#8E8E9A]">
                Nenhum anúncio ativo no momento.
              </div>
            ) : (
              listings.map((l) => {
                const def = ITEM_CATALOG.find((i) => i.id === l.itemId);
                const isOwn = l.sellerUid === character.userUid;
                return (
                  <div
                    key={l.id}
                    className="bg-[#0C0C10] border border-[#24242E] rounded-lg p-4 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#F4F4F6]">
                        {def?.name || l.itemId} <span className="text-xs text-[#8E8E9A]">x{l.qty}</span>
                      </div>
                      <div className="text-xs text-[#8E8E9A] mt-0.5">
                        Vendedor: {l.sellerName} · {l.sellerVillage}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold tabular-nums text-[#22C55E]">
                        {l.priceRyo.toLocaleString('pt-BR')} Ryo
                      </span>
                      <button
                        type="button"
                        disabled={busy || isOwn || character.ryo < l.priceRyo}
                        onClick={() => handleBuyListing(l.id)}
                        className="px-4 py-2 rounded bg-[#10B981] hover:bg-[#22C55E] disabled:opacity-40 text-xs font-bold text-[#050505] cursor-pointer"
                      >
                        {isOwn ? 'Seu Anúncio' : 'Comprar'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {subTab === 'stripe' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              id: 'ryo_pouch',
              title: 'Bolsa de 2.500 Ryo',
              price: 'R$ 9,90',
              desc: 'Suprimento rápido para aprender jutsus e adquirir armaduras no ferreiro.',
            },
            {
              id: 'jonin_pass',
              title: 'Passe Jonin + 5.000 Ryo',
              price: 'R$ 19,90',
              desc: 'Desbloqueia insígnia Jonin Patrono e bônus imediato de 5.000 Ryo.',
            },
            {
              id: 'kage_patron',
              title: 'Patrono Kage + 12.000 Ryo',
              price: 'R$ 39,90',
              desc: 'Apoio supremo ao servidor com 12.000 Ryo para seu arsenal shinobi.',
            },
          ].map((pack) => (
            <div
              key={pack.id}
              className="bg-[#0C0C10] border border-[#10B981] rounded-lg p-6 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="text-xs font-mono text-[#22C55E]">Gateway Seguro Stripe</div>
                <h3 className="font-display text-lg font-bold text-[#F4F4F6]">{pack.title}</h3>
                <p className="text-xs text-[#8E8E9A] leading-relaxed">{pack.desc}</p>
              </div>
              <div className="space-y-3 pt-2 border-t border-[#24242E]">
                <div className="font-mono text-xl font-bold tabular-nums text-[#F4F4F6]">
                  {pack.price}
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleStripeCheckout(pack.id)}
                  className="w-full py-2.5 rounded bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold cursor-pointer"
                >
                  Pagar com Stripe Checkout
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
