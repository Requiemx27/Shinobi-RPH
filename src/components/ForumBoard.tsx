import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Compass,
  Crown,
  ExternalLink,
  Home,
  Link2,
  MapPin,
  MessageSquare,
  MessageSquarePlus,
  Pin,
  Quote,
  Send,
  Swords,
  UserPlus,
  Users,
} from 'lucide-react';
import { CharacterModel, calculateEffectiveStats, getEffectiveJutsuEffects } from '../game/engine.ts';
import { LanguageCode, t } from '../game/i18n.ts';
import {
  getJutsuImage,
  getVillageImage,
  getVillageLocations,
  JUTSU_CATALOG,
  JutsuDef,
  VILLAGES,
} from '../game/narutoData.ts';
import { shinobiAudio } from '../game/sound.ts';
import { apiFetch } from '../utils/api.ts';
import { enqueueOfflineAction } from '../utils/offlineStore.ts';
import { ForumNavSection } from './ForumHeader.tsx';
import { ChatMsg } from './KageChatPanel.tsx';
import { NinjaAvatar } from './NinjaAvatar.tsx';
import { XpProgressPanel } from './XpProgressPanel.tsx';

export interface ForumThread {
  id: number;
  title: string;
  village: string;
  category: string;
  authorUid: string;
  authorName: string;
  authorRank: string;
  isPinned: boolean;
  createdAt: string;
}

export interface ForumPost {
  id: number;
  threadId: number;
  authorUid: string;
  characterName: string;
  characterAvatar: string;
  characterVillage: string;
  characterRank: string;
  content: string;
  actionRoll: {
    jutsuName: string;
    hitChance: number;
    rolled: number;
    isHit: boolean;
    isCrit: boolean;
    damage: number;
    appliedEffects?: string[];
    synergyNotes?: string[];
  } | null;
  createdAt: string;
}

interface ForumBoardProps {
  character: CharacterModel;
  allCharacters: CharacterModel[];
  threads: ForumThread[];
  posts: ForumPost[];
  chatMessages: ChatMsg[];
  onlineUsers: Array<{ uid: string; name: string; village: string }>;
  customJutsus?: JutsuDef[];
  lang: LanguageCode;
  isOnline: boolean;
  selectedBoard: string | null;
  selectedThreadId: number | null;
  onSelectBoard: (board: string | null) => void;
  onSelectThread: (threadId: number | null) => void;
  onNavigateSection: (section: ForumNavSection) => void;
  onOpenDm: (targetUid: string) => void;
  onSendShout: (message: string) => void;
  onRefreshForum: () => Promise<void>;
  onRefreshCharacter: () => Promise<void>;
}

function renderForumBody(raw: string) {
  const quoteMatch = raw.match(/\[quote=(.*?)\]([\s\S]*?)\[\/quote\]/i);
  if (!quoteMatch) {
    return <p className="text-sm text-[#E4E4E7] leading-relaxed whitespace-pre-line">{raw}</p>;
  }
  const author = quoteMatch[1];
  const quotedText = quoteMatch[2];
  const rest = raw.replace(quoteMatch[0], '').trim();
  return (
    <div className="space-y-3">
      <blockquote className="bg-[#070709] border border-[#272732] rounded-lg p-3 text-xs text-[#A1A1AA] space-y-1">
        <div className="font-semibold text-[#22C55E]">Citação de {author}:</div>
        <p className="italic whitespace-pre-line">{quotedText}</p>
      </blockquote>
      {rest && <p className="text-sm text-[#E4E4E7] leading-relaxed whitespace-pre-line">{rest}</p>}
    </div>
  );
}

const KAGE_COUNCIL_BANNER =
  'https://static.wikia.nocookie.net/naruto/images/0/08/Gokage_hats.png/revision/latest/scale-to-width-down/800?cb=20140220125558';
const ARENA_BANNER =
  'https://static.wikia.nocookie.net/naruto/images/b/b1/Chunin_Examination_Arena.png/revision/latest/scale-to-width-down/800?cb=20120422120447';
const KONOHA_BANNER =
  'https://static.wikia.nocookie.net/naruto/images/3/34/Konohagakure.png/revision/latest/scale-to-width-down/800?cb=20160728115517';

function resolveBoardBanner(boardName: string): string | null {
  if (boardName === 'Conselho Kage') return KAGE_COUNCIL_BANNER;
  if (boardName === 'Arena de Duelos') return ARENA_BANNER;
  return getVillageImage(boardName);
}

function formatThreadCategoryLabel(category: string, village: string): string {
  if (category === 'kage_council') return 'Conselho dos Kages';
  if (category === 'spar_duel') return 'Arena de Duelos RP';
  if (category.startsWith('loc:')) {
    const locId = category.slice(4);
    const loc = getVillageLocations(village).find((l) => l.id === locId);
    return loc ? `Local Interativo · ${loc.name}` : 'Local Interativo da Vila';
  }
  return 'Crônicas Play-by-Forum';
}

export const ForumBoard: React.FC<ForumBoardProps> = ({
  character,
  allCharacters,
  threads,
  posts,
  chatMessages,
  onlineUsers,
  customJutsus = [],
  lang,
  isOnline,
  selectedBoard,
  selectedThreadId,
  onSelectBoard,
  onSelectThread,
  onNavigateSection,
  onOpenDm,
  onSendShout,
  onRefreshForum,
  onRefreshCharacter,
}) => {
  const [showNewThread, setShowNewThread] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('rp_narration');
  const [newContent, setNewContent] = useState('');

  const [replyText, setReplyText] = useState('');
  const [selectedJutsuId, setSelectedJutsuId] = useState('');
  const [shoutText, setShoutText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Interactive Village Locations Play-by-Forum state
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [locMessage, setLocMessage] = useState('');
  const [locJutsuId, setLocJutsuId] = useState('');
  const [locSubmitting, setLocSubmitting] = useState(false);
  const [locFeedback, setLocFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  const effStats = useMemo(() => calculateEffectiveStats(character), [character]);
  const appointedKages = useMemo(() => allCharacters.filter((c) => c.isKage), [allCharacters]);
  const allCatalogJutsus = useMemo(() => [...JUTSU_CATALOG, ...customJutsus], [customJutsus]);

  const learnedJutsuDefs = useMemo(
    () => allCatalogJutsus.filter((j) => character.learnedJutsus.includes(j.id)),
    [character.learnedJutsus, allCatalogJutsus]
  );

  const boardVillageMeta = useMemo(
    () => (selectedBoard ? VILLAGES.find((v) => v.name === selectedBoard) || null : null),
    [selectedBoard]
  );

  const villageLocations = useMemo(
    () => (boardVillageMeta ? getVillageLocations(boardVillageMeta.name) : []),
    [boardVillageMeta]
  );

  useEffect(() => {
    if (villageLocations.length > 0) {
      setActiveLocationId((prev) =>
        prev && villageLocations.some((l) => l.id === prev) ? prev : villageLocations[0].id
      );
      setLocFeedback(null);
    } else {
      setActiveLocationId(null);
    }
  }, [villageLocations]);

  const activeLocation = useMemo(
    () => villageLocations.find((l) => l.id === activeLocationId) || villageLocations[0] || null,
    [villageLocations, activeLocationId]
  );

  const activeLocationThread = useMemo(() => {
    if (!boardVillageMeta || !activeLocation) return null;
    const cat = `loc:${activeLocation.id}`;
    return threads.find((th) => th.village === boardVillageMeta.name && th.category === cat) || null;
  }, [threads, boardVillageMeta, activeLocation]);

  const activeLocationPosts = useMemo(() => {
    if (!activeLocationThread) return [];
    return posts.filter((p) => p.threadId === activeLocationThread.id);
  }, [posts, activeLocationThread]);

  const threadHasPlayerReplies = useMemo(() => {
    const set = new Set<number>();
    for (const p of posts) {
      if (p.authorUid !== 'system:narrador') {
        set.add(p.threadId);
      }
    }
    return set;
  }, [posts]);

  const boardThreads = useMemo(() => {
    if (!selectedBoard) return threads;
    if (selectedBoard === 'Conselho Kage') {
      return threads.filter((th) => th.category === 'kage_council');
    }
    if (selectedBoard === 'Arena de Duelos') {
      return threads.filter((th) => th.category === 'spar_duel');
    }
    return threads.filter(
      (th) =>
        th.village === selectedBoard &&
        (!th.category.startsWith('loc:') || threadHasPlayerReplies.has(th.id))
    );
  }, [threads, selectedBoard, threadHasPlayerReplies]);

  const activeThread = useMemo(
    () => (selectedThreadId ? threads.find((th) => th.id === selectedThreadId) || null : null),
    [threads, selectedThreadId]
  );

  const activePosts = useMemo(
    () => (activeThread ? posts.filter((p) => p.threadId === activeThread.id) : []),
    [posts, activeThread]
  );

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setSubmitting(true);
    setFeedback(null);
    const targetVillage =
      selectedBoard && selectedBoard !== 'Conselho Kage' && selectedBoard !== 'Arena de Duelos'
        ? selectedBoard
        : character.village;
    try {
      const res = await apiFetch<{ thread: ForumThread }>('/api/forum/threads', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle,
          village: targetVillage,
          category: selectedBoard === 'Conselho Kage' ? 'kage_council' : newCategory,
          content: newContent,
        }),
      });
      shinobiAudio.playUiClick();
      setNewTitle('');
      setNewContent('');
      setShowNewThread(false);
      onSelectThread(res.thread.id);
      await onRefreshForum();
    } catch (err) {
      setFeedback((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !replyText.trim()) return;
    setSubmitting(true);
    setFeedback(null);

    if (!isOnline) {
      enqueueOfflineAction({
        endpoint: `/api/forum/threads/${activeThread.id}/posts`,
        method: 'POST',
        body: { content: replyText, jutsuId: selectedJutsuId || null },
      });
      setReplyText('');
      setSubmitting(false);
      setFeedback('Sem conexão: postagem salva na fila offline para envio automático.');
      return;
    }

    try {
      await apiFetch(`/api/forum/threads/${activeThread.id}/posts`, {
        method: 'POST',
        body: JSON.stringify({
          content: replyText,
          jutsuId: selectedJutsuId || null,
        }),
      });
      if (selectedJutsuId) shinobiAudio.playJutsuCast();
      else shinobiAudio.playUiClick();
      setReplyText('');
      setSelectedJutsuId('');
      await Promise.all([onRefreshForum(), onRefreshCharacter()]);
    } catch (err) {
      setFeedback((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostLocationMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardVillageMeta || !activeLocation || !locMessage.trim()) return;
    setLocSubmitting(true);
    setLocFeedback(null);

    try {
      await apiFetch('/api/forum/locations/post', {
        method: 'POST',
        body: JSON.stringify({
          village: boardVillageMeta.name,
          locationId: activeLocation.id,
          content: locMessage,
          jutsuId: locJutsuId || null,
        }),
      });
      if (locJutsuId) shinobiAudio.playJutsuCast();
      else shinobiAudio.playUiClick();
      setLocMessage('');
      setLocJutsuId('');
      setLocFeedback({
        text: `Mensagem Play-by-Forum publicada em ${activeLocation.name} (+25 XP · +10 Mérito)!`,
      });
      await Promise.all([onRefreshForum(), onRefreshCharacter()]);
    } catch (err) {
      setLocFeedback({ text: (err as Error).message, isError: true });
    } finally {
      setLocSubmitting(false);
    }
  };

  const handleQuotePost = (post: ForumPost) => {
    const snippet = post.content.slice(0, 200);
    setReplyText((prev) => `${prev ? prev + '\n\n' : ''}[quote=${post.characterName}]${snippet}[/quote]\n`);
    document.getElementById('forum-reply-box')?.focus();
  };

  const handleQuoteLocationPost = (post: ForumPost) => {
    const snippet = post.content.slice(0, 180);
    setLocMessage((prev) => `${prev ? prev + '\n\n' : ''}[quote=${post.characterName}]${snippet}[/quote]\n`);
    document.getElementById('village-location-reply-box')?.focus();
  };

  const getBoardStats = (villageName: string, filterCat?: string) => {
    const matchingThreads = threads.filter((th) => {
      if (filterCat) return th.category === filterCat;
      if (th.village !== villageName) return false;
      if (th.category.startsWith('loc:') && !threadHasPlayerReplies.has(th.id)) return false;
      return true;
    });
    const matchingThreadIds = new Set(matchingThreads.map((th) => th.id));
    const matchingPosts = posts.filter(
      (p) => matchingThreadIds.has(p.threadId) && p.authorUid !== 'system:narrador'
    );
    const lastPost = matchingPosts[matchingPosts.length - 1];
    return {
      threadCount: matchingThreads.length,
      postCount: matchingPosts.length,
      lastPost,
    };
  };

  // VIEW 3: POSTBIT THREAD VIEW
  if (activeThread) {
    const threadBanner =
      activeThread.category === 'kage_council'
        ? KAGE_COUNCIL_BANNER
        : activeThread.category === 'spar_duel'
        ? ARENA_BANNER
        : getVillageImage(activeThread.village);

    return (
      <div className="max-w-[1360px] mx-auto px-4 md:px-6 py-6 space-y-5">
        <div className="relative overflow-hidden jcink-shell rounded-xl min-h-[180px] p-6 md:p-8 flex flex-wrap items-end justify-between gap-4">
          {threadBanner && (
            <img
              src={threadBanner}
              alt={activeThread.village}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-45"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/86 to-[#050505]/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/30 to-transparent" />
          <div className="relative z-10 max-w-3xl space-y-1">
            <div className="text-xs font-mono text-[#22C55E]">
              {activeThread.village} · {formatThreadCategoryLabel(activeThread.category, activeThread.village)}
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-[#F8FAFC] text-balance">
              {activeThread.title}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => onSelectThread(null)}
            className="relative z-10 px-4 py-2 rounded-md bg-[#0C0C10] hover:bg-[#16161E] border border-[#10B981] text-xs font-semibold text-[#F8FAFC] cursor-pointer whitespace-nowrap"
          >
            Voltar ao Sub-Fórum
          </button>
        </div>

        {/* Postbit Rows */}
        <div className="space-y-4">
          {activePosts.map((post, idx) => {
            if (post.authorUid === 'system:narrador') {
              return (
                <article
                  key={post.id}
                  className="jcink-shell rounded-xl overflow-hidden border border-[#10B981]"
                >
                  {post.characterAvatar && (
                    <div className="relative w-full aspect-[21/9] max-h-[300px] overflow-hidden bg-[#050505] border-b border-[#1E1E26]">
                      <img
                        src={post.characterAvatar}
                        alt={post.characterName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#08080B] via-[#08080B]/30 to-transparent" />
                      <div className="absolute bottom-4 left-5 right-5 flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-mono text-[#22C55E] font-semibold">
                            Post #{idx + 1} · Descrição Oficial do Local · {post.characterVillage}
                          </div>
                          <h2 className="font-display text-xl md:text-2xl font-bold text-[#F8FAFC]">
                            {post.characterName}
                          </h2>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-[#08080B] border border-[#10B981] text-[11px] font-mono text-[#22C55E]">
                          Narrador Oficial
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="p-5 md:p-6 space-y-3 bg-[#09090D]">
                    {!post.characterAvatar && (
                      <div className="text-xs font-mono text-[#22C55E]">
                        Post #{idx + 1} · Descrição Oficial do Local · {post.characterName}
                      </div>
                    )}
                    {renderForumBody(post.content)}
                  </div>
                </article>
              );
            }

            const authorChar = allCharacters.find(
              (c) => c.userUid === post.authorUid || c.name === post.characterName
            );
            const authorEff = authorChar ? calculateEffectiveStats(authorChar) : null;
            const postVillageImg = getVillageImage(post.characterVillage);
            const matchedJutsu = post.actionRoll
              ? allCatalogJutsus.find((j) => j.name === post.actionRoll?.jutsuName)
              : null;

            const matchedJutsuImg = matchedJutsu ? getJutsuImage(matchedJutsu) : null;

            return (
              <article
                key={post.id}
                className="jcink-shell rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-12"
              >
                {/* Left Author Postbit Column */}
                <aside className="md:col-span-3 bg-[#09090D] border-b md:border-b-0 md:border-r border-[#1E1E26] flex flex-col">
                  {postVillageImg && (
                    <div className="hidden md:block relative h-16 overflow-hidden">
                      <img
                        src={postVillageImg}
                        alt=""
                        aria-hidden="true"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover opacity-50"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#09090D] to-transparent" />
                    </div>
                  )}

                  <div className={`p-5 ${postVillageImg ? 'md:-mt-9' : ''} relative z-10 flex flex-row md:flex-col items-center md:items-start gap-4`}>
                    <div className="rounded-lg p-0.5 bg-[#09090D] border border-[#10B981] shrink-0">
                      <NinjaAvatar
                        src={post.characterAvatar}
                        alt={post.characterName}
                        sizeClass="w-16 h-16 md:w-24 md:h-24"
                      />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1 w-full">
                      <div className="font-display font-bold text-base text-[#F8FAFC] truncate">
                        {post.characterName}
                      </div>
                      <div className="text-xs text-[#22C55E] font-semibold">
                        {authorChar?.isKage ? `Kage · ${post.characterVillage}` : post.characterRank}
                      </div>
                      <div className="text-xs text-[#A1A1AA]">
                        {post.characterVillage}
                        {authorChar ? ` · Clã ${authorChar.clan}` : ''}
                      </div>

                      {authorChar && authorEff && (
                        <div className="hidden md:block pt-3 mt-3 border-t border-[#1E1E26] space-y-1.5 text-[11px] font-mono tabular-nums text-[#E4E4E7]">
                          <div className="flex justify-between">
                            <span className="text-[#A1A1AA]">Nível / Chakra</span>
                            <span>Nv.{authorChar.level} / CH {authorChar.chakraLevel}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#A1A1AA]">HP / Chakra</span>
                            <span>{authorEff.maxHp} / {authorEff.maxChakra}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#A1A1AA]">Mérito / Ryo</span>
                            <span className="text-[#22C55E]">{authorChar.meritPoints} M · {authorChar.ryo}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#A1A1AA]">Combates</span>
                            <span>{authorChar.wins}V / {authorChar.losses}D</span>
                          </div>
                        </div>
                      )}

                      {post.authorUid !== character.userUid && (
                        <button
                          type="button"
                          onClick={() => onOpenDm(post.authorUid)}
                          className="mt-2 px-2.5 py-1 rounded bg-[#14141C] hover:bg-[#10B981] hover:text-[#050505] border border-[#272732] text-[11px] text-[#F8FAFC] font-medium cursor-pointer transition-colors"
                        >
                          Enviar MP
                        </button>
                      )}
                    </div>
                  </div>
                </aside>

                {/* Right Post Content */}
                <div className="md:col-span-9 p-5 md:p-6 flex flex-col justify-between gap-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 border-b border-[#1E1E26] pb-2.5 text-xs text-[#A1A1AA]">
                      <span className="font-mono tabular-nums">
                        Post #{idx + 1} · {new Date(post.createdAt).toLocaleString('pt-BR')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuotePost(post)}
                        className="inline-flex items-center gap-1 text-xs text-[#E4E4E7] hover:text-[#22C55E] cursor-pointer"
                      >
                        <Quote className="w-3.5 h-3.5" />
                        Citar
                      </button>
                    </div>

                    {renderForumBody(post.content)}

                    {post.actionRoll && (
                      <div className="bg-[#070709] border border-[#10B981] rounded-lg p-3.5 flex items-center gap-3.5 text-xs font-mono tabular-nums">
                        {matchedJutsuImg && (
                          <img
                            src={matchedJutsuImg}
                            alt={post.actionRoll.jutsuName}
                            referrerPolicy="no-referrer"
                            className="w-16 h-12 rounded object-cover border border-[#272732] shrink-0"
                          />
                        )}
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 text-[#22C55E] font-semibold">
                            <Swords className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                            <span className="truncate">Ação Executada: {post.actionRoll.jutsuName}</span>
                          </div>
                          <div className="text-[#E4E4E7]">
                            Precisão {post.actionRoll.hitChance}% · Dado Rolado: {post.actionRoll.rolled} ·{' '}
                            <span className={post.actionRoll.isHit ? 'text-[#22C55E] font-bold' : 'text-[#EF4444] font-bold'}>
                              {post.actionRoll.isHit
                                ? `ACERTO${post.actionRoll.isCrit ? ' CRÍTICO' : ''}: ${post.actionRoll.damage} DE DANO`
                                : 'EVADIDO PELO ALVO'}
                            </span>
                          </div>
                          {post.actionRoll.appliedEffects && post.actionRoll.appliedEffects.length > 0 && (
                            <div className="text-[11px] text-amber-300 pt-0.5">
                              {post.actionRoll.appliedEffects.join(' · ')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {authorChar && (
                    <div className="pt-3 border-t border-[#1E1E26] text-[11px] text-[#A1A1AA]">
                      <span className="text-[#22C55E]">Assinatura:</span>{' '}
                      {authorChar.specialization} · {authorChar.chakraNature} · Kekkei Genkai: {authorChar.kekkeiGenkai} · Invocação: {authorChar.summonContract}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {/* Forum Quick-Reply Box */}
        <form
          onSubmit={handlePostReply}
          className="jcink-shell rounded-xl p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label htmlFor="forum-reply-box" className="font-display text-sm font-bold text-[#F8FAFC]">
              Resposta Rápida no Tópico ({character.name})
            </label>
            <div className="flex items-center gap-2">
              <label htmlFor="forum-jutsu-select" className="text-xs text-[#A1A1AA]">
                Acoplar Rolagem de Jutsu:
              </label>
              <select
                id="forum-jutsu-select"
                value={selectedJutsuId}
                onChange={(e) => setSelectedJutsuId(e.target.value)}
                className="bg-[#070709] border border-[#272732] rounded-md px-2.5 py-1.5 text-xs text-white"
              >
                <option value="">Apenas Narração RP</option>
                {learnedJutsuDefs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name} (Rank {j.rank})
                  </option>
                ))}
              </select>
            </div>
          </div>
          {selectedJutsuId && (() => {
            const sel = learnedJutsuDefs.find((j) => j.id === selectedJutsuId);
            if (!sel) return null;
            const fxs = getEffectiveJutsuEffects(sel, character.clan, character.kekkeiGenkai);
            if (fxs.length === 0) return null;
            return (
              <div className="text-[11px] font-mono text-[#22C55E] bg-[#070709] border border-[#272732] rounded-md px-3 py-1.5">
                Efeitos da rolagem ({sel.name}): {fxs.map((f) => f.label).join(' · ')}
              </div>
            );
          })()}

          <textarea
            id="forum-reply-box"
            rows={5}
            required
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Escreva sua postagem Play-by-Forum (suporta citações [quote=Nome]...[/quote])..."
            className="w-full px-3.5 py-2.5 rounded-md bg-[#070709] border border-[#272732] focus:border-[#10B981] focus:outline-none text-sm text-[#F8FAFC]"
          />

          {feedback && <p className="text-xs text-[#22C55E]">{feedback}</p>}

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-[#A1A1AA]">
              Cada turno RP concede +25 XP e +10 Mérito para o ranking da vila.
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold cursor-pointer transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {t(lang, 'postReply')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // VIEW 2: SUB-FORUM THREAD LIST VIEW + INTERACTIVE VILLAGE PLAY-BY-FORUM LOCATIONS
  if (selectedBoard) {
    const boardImg = resolveBoardBanner(selectedBoard);

    return (
      <div className="max-w-[1360px] mx-auto px-4 md:px-6 py-6 space-y-6">
        <div className="relative overflow-hidden jcink-shell rounded-xl min-h-[210px] p-6 md:p-8 flex flex-wrap items-end justify-between gap-4">
          {boardImg && (
            <img
              src={boardImg}
              alt={selectedBoard}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-50"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/86 to-[#050505]/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/30 to-transparent" />
          <div className="relative z-10 space-y-1 max-w-2xl">
            <div className="text-xs font-mono text-[#22C55E]">
              {boardVillageMeta ? `${boardVillageMeta.country} · ${boardVillageMeta.kageTitle}` : 'Sub-Fórum Oficial'} · Konoha Defenders
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-[#F8FAFC]">
              {selectedBoard}
            </h1>
            {boardVillageMeta && (
              <p className="text-xs text-[#D4D4D8]">{boardVillageMeta.description}</p>
            )}
          </div>

          <div className="relative z-10 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onSelectBoard(null)}
              className="px-3.5 py-2 rounded-md bg-[#0C0C10] hover:bg-[#16161E] border border-[#272732] text-xs text-[#F8FAFC] cursor-pointer whitespace-nowrap"
            >
              Índice do Fórum
            </button>
            <button
              type="button"
              onClick={() => setShowNewThread(!showNewThread)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold cursor-pointer whitespace-nowrap transition-colors"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              {t(lang, 'createThread')}
            </button>
          </div>
        </div>

        {/* INTERACTIVE VILLAGE LOCATIONS FOR PLAY-BY-FORUM MESSAGES */}
        {boardVillageMeta && villageLocations.length > 0 && (
          <section className="jcink-shell rounded-xl overflow-hidden">
            <div className="jcink-cat-head px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#22C55E]" />
                <h2 className="font-display text-sm font-bold text-[#22C55E]">
                  Locais de Interação Play-by-Forum — {boardVillageMeta.name}
                </h2>
              </div>
              <span className="text-xs font-mono text-[#A1A1AA]">
                Selecione um local do vilarejo para ler cenas e enviar mensagens Play-by-Forum
              </span>
            </div>

            <div className="p-5 space-y-5">
              {/* 6 Interactive Village Location Selector Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {villageLocations.map((loc) => {
                  const isSelected = activeLocation?.id === loc.id;
                  const locThread = threads.find(
                    (th) => th.village === boardVillageMeta.name && th.category === `loc:${loc.id}`
                  );
                  const locPlayerReplies = locThread
                    ? posts.filter(
                        (p) => p.threadId === locThread.id && p.authorUid !== 'system:narrador'
                      ).length
                    : 0;

                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => {
                        shinobiAudio.playUiClick();
                        setActiveLocationId(loc.id);
                        setLocFeedback(null);
                      }}
                      className={`group text-left rounded-lg overflow-hidden border transition-colors cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#121219] border-[#10B981]'
                          : 'bg-[#08080B] border-[#1E1E26] hover:border-[#343442]'
                      }`}
                    >
                      <div className="relative h-24 w-full overflow-hidden bg-[#050505] border-b border-[#1E1E26]">
                        <img
                          src={loc.imageUrl}
                          alt={loc.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#08080B] via-[#08080B]/30 to-transparent" />
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-[#050505]/90 border border-[#24242E] font-mono text-[10px] tabular-nums text-[#22C55E]">
                          {locPlayerReplies === 0
                            ? 'Aberto'
                            : `${locPlayerReplies} ${locPlayerReplies === 1 ? 'turno' : 'turnos'}`}
                        </span>
                      </div>

                      <div className="p-3.5 space-y-1">
                        <div className="flex items-center gap-1.5 font-display text-sm font-bold text-[#F8FAFC] truncate">
                          <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#22C55E]' : 'text-[#A1A1AA]'}`} />
                          <span className="truncate">{loc.name}</span>
                        </div>
                        <div className="text-[11px] font-medium text-[#22C55E]">{loc.zoneLabel}</div>
                        <p className="text-xs text-[#A1A1AA] line-clamp-2 leading-relaxed">
                          {loc.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Active Location Live Play-by-Forum Mural & Composer */}
              {activeLocation && (
                <div className="rounded-xl bg-[#08080B] border border-[#24242E] overflow-hidden">
                  <div className="px-5 py-3.5 bg-[#101016] border-b border-[#24242E] flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-mono text-[#22C55E]">
                        Local Ativo em {boardVillageMeta.name} · {activeLocation.zoneLabel}
                      </div>
                      <h3 className="font-display text-base md:text-lg font-bold text-[#F8FAFC]">
                        {activeLocation.name}
                      </h3>
                    </div>

                    {activeLocationThread && (
                      <button
                        type="button"
                        onClick={() => onSelectThread(activeLocationThread.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#14141C] hover:bg-[#1C1C26] border border-[#272732] text-xs font-medium text-[#F8FAFC] cursor-pointer whitespace-nowrap"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#22C55E]" />
                        Abrir em Tópico Completo ({activeLocationPosts.length})
                      </button>
                    )}
                  </div>

                  {/* Location Messages Stream (Post #1 is always the Official Descriptive Location Post with Image) */}
                  <div className="p-5 space-y-4 max-h-[540px] overflow-y-auto jcink-subtle-scroll">
                    {(activeLocationPosts.length > 0
                      ? activeLocationPosts
                      : [
                          {
                            id: -1,
                            threadId: -1,
                            authorUid: 'system:narrador',
                            characterName: activeLocation.name,
                            characterAvatar: activeLocation.imageUrl,
                            characterVillage: boardVillageMeta.name,
                            characterRank: 'Descrição do Local',
                            content: activeLocation.openingNarrative,
                            actionRoll: null,
                            createdAt: '2026-01-01T00:00:00.000Z',
                          },
                        ]
                    ).map((post, idx) => {
                      if (post.authorUid === 'system:narrador') {
                        const imgSrc = post.characterAvatar || activeLocation.imageUrl;
                        return (
                          <article
                            key={post.id}
                            className="rounded-xl bg-[#0C0C10] border border-[#10B981] overflow-hidden"
                          >
                            <div className="relative w-full aspect-[21/9] max-h-[260px] overflow-hidden bg-[#050505] border-b border-[#1E1E26]">
                              <img
                                src={imgSrc}
                                alt={activeLocation.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#0C0C10] via-[#0C0C10]/25 to-transparent" />
                              <div className="absolute bottom-3 left-4 right-4 flex flex-wrap items-end justify-between gap-2">
                                <div>
                                  <div className="text-[11px] font-mono text-[#22C55E] font-semibold">
                                    Post #{idx + 1} · Descrição Inicial do Local · {boardVillageMeta.name}
                                  </div>
                                  <h4 className="font-display text-lg font-bold text-[#F8FAFC]">
                                    {activeLocation.name}
                                  </h4>
                                </div>
                                <span className="px-2.5 py-0.5 rounded bg-[#050505]/90 border border-[#10B981] font-mono text-[11px] text-[#22C55E]">
                                  Narrador Oficial
                                </span>
                              </div>
                            </div>
                            <div className="p-4 space-y-2.5">
                              {renderForumBody(post.content)}
                              <div className="pt-2 border-t border-[#1E1E26] text-[11px] text-[#A1A1AA] font-mono">
                                Ambiente aberto para interpretação real de jogadores — escreva sua chegada abaixo.
                              </div>
                            </div>
                          </article>
                        );
                      }

                      const matchedJutsu = post.actionRoll
                        ? allCatalogJutsus.find((j) => j.name === post.actionRoll?.jutsuName)
                        : null;
                      const matchedImg = matchedJutsu ? getJutsuImage(matchedJutsu) : null;

                      return (
                        <div
                          key={post.id}
                          className="rounded-lg bg-[#0C0C10] border border-[#1E1E26] p-4 space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E1E26] pb-2.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <NinjaAvatar
                                src={post.characterAvatar}
                                alt={post.characterName}
                                sizeClass="w-10 h-10"
                              />
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-[#F8FAFC] truncate">
                                  {post.characterName}
                                </div>
                                <div className="text-[11px] text-[#A1A1AA]">
                                  <span className="text-[#22C55E] font-medium">{post.characterRank}</span> · {post.characterVillage}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-[#A1A1AA]">
                              <span className="font-mono tabular-nums text-[11px]">
                                #{idx + 1} · {new Date(post.createdAt).toLocaleString('pt-BR')}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuoteLocationPost(post)}
                                className="inline-flex items-center gap-1 text-xs text-[#E4E4E7] hover:text-[#22C55E] cursor-pointer"
                              >
                                <Quote className="w-3 h-3" />
                                Citar
                              </button>
                            </div>
                          </div>

                          {renderForumBody(post.content)}

                          {post.actionRoll && (
                            <div className="bg-[#070709] border border-[#10B981] rounded-md p-3 flex items-center gap-3 text-xs font-mono tabular-nums">
                              {matchedImg && (
                                <img
                                  src={matchedImg}
                                  alt={post.actionRoll.jutsuName}
                                  referrerPolicy="no-referrer"
                                  className="w-14 h-10 rounded object-cover border border-[#272732] shrink-0"
                                />
                              )}
                              <div className="min-w-0 space-y-0.5">
                                <div className="text-[#22C55E] font-semibold truncate">
                                  Rolagem no Local: {post.actionRoll.jutsuName}
                                </div>
                                <div className="text-[#E4E4E7]">
                                  Precisão {post.actionRoll.hitChance}% · D100: {post.actionRoll.rolled} ·{' '}
                                  <span className={post.actionRoll.isHit ? 'text-[#22C55E] font-bold' : 'text-[#EF4444] font-bold'}>
                                    {post.actionRoll.isHit
                                      ? `ACERTO${post.actionRoll.isCrit ? ' CRÍTICO' : ''} (${post.actionRoll.damage} Dano)`
                                      : 'EVADIDO'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Direct Play-by-Forum Location Composer */}
                  <form
                    onSubmit={handlePostLocationMessage}
                    className="p-5 border-t border-[#24242E] bg-[#0B0B0F] space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label
                        htmlFor="village-location-reply-box"
                        className="text-xs font-semibold text-[#F8FAFC]"
                      >
                        Interagir em {activeLocation.name} como {character.name}
                      </label>
                      <div className="flex items-center gap-2">
                        <label htmlFor="village-location-jutsu" className="text-xs text-[#A1A1AA]">
                          Ação / Jutsu (opcional):
                        </label>
                        <select
                          id="village-location-jutsu"
                          value={locJutsuId}
                          onChange={(e) => setLocJutsuId(e.target.value)}
                          className="bg-[#070709] border border-[#272732] rounded-md px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value="">Apenas Interpretação RP</option>
                          {learnedJutsuDefs.map((j) => (
                            <option key={j.id} value={j.id}>
                              {j.name} (Rank {j.rank})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <textarea
                      id="village-location-reply-box"
                      rows={3}
                      required
                      value={locMessage}
                      onChange={(e) => setLocMessage(e.target.value)}
                      placeholder={`Descreva sua cena ou diálogo Play-by-Forum em ${activeLocation.name}...`}
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#070709] border border-[#272732] focus:border-[#10B981] focus:outline-none text-sm text-[#F8FAFC]"
                    />

                    {locFeedback && (
                      <div className={`text-xs ${locFeedback.isError ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>
                        {locFeedback.text}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-[#A1A1AA]">
                        Interações nos locais ficam gravadas no fórum da vila e rendem +25 XP e +10 Mérito.
                      </span>
                      <button
                        type="submit"
                        disabled={locSubmitting}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-[#10B981] hover:bg-[#22C55E] disabled:opacity-50 text-[#050505] text-xs font-bold cursor-pointer transition-colors whitespace-nowrap"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {locSubmitting ? 'Publicando...' : `Enviar em ${activeLocation.name}`}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </section>
        )}

        {showNewThread && (
          <form
            onSubmit={handleCreateThread}
            className="jcink-shell rounded-xl p-5 space-y-3"
          >
            <h2 className="font-display text-base font-bold text-[#F8FAFC]">
              Abrir Novo Tópico em {selectedBoard}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Título do Tópico RP"
                className="sm:col-span-2 px-3 py-2 rounded-md bg-[#070709] border border-[#272732] focus:border-[#10B981] focus:outline-none text-sm text-white"
              />
              <select
                aria-label="Tipo de tópico"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="px-3 py-2 rounded-md bg-[#070709] border border-[#272732] text-xs text-white"
              >
                <option value="rp_narration">Crônica / Missão RP</option>
                <option value="spar_duel">Duelo Play-by-Forum</option>
                <option value="kage_council">Conselho Kage</option>
              </select>
            </div>
            <textarea
              required
              rows={4}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Narração inicial de abertura do tópico..."
              className="w-full px-3 py-2 rounded-md bg-[#070709] border border-[#272732] focus:border-[#10B981] focus:outline-none text-sm text-white"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-md bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold cursor-pointer transition-colors"
            >
              Publicar Tópico
            </button>
          </form>
        )}

        {/* Forum Thread Table */}
        <div className="jcink-shell rounded-xl overflow-hidden">
          <div className="hidden md:grid grid-cols-12 px-5 py-3 jcink-cat-head text-xs font-semibold text-[#22C55E]">
            <div className="col-span-7">Tópicos & Cenas de {selectedBoard}</div>
            <div className="col-span-2 text-center">Respostas</div>
            <div className="col-span-3 text-right">Última Postagem</div>
          </div>

          {boardThreads.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#A1A1AA]">
              Nenhum tópico criado neste sub-fórum ainda. Seja o primeiro shinobi a iniciar uma crônica.
            </div>
          ) : (
            <div className="divide-y divide-[#1E1E26]">
              {boardThreads.map((th) => {
                const threadPosts = posts.filter((p) => p.threadId === th.id);
                const last = threadPosts[threadPosts.length - 1];
                const isLocationThread = th.category.startsWith('loc:');
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => {
                      shinobiAudio.playUiClick();
                      onSelectThread(th.id);
                    }}
                    className="w-full text-left px-5 py-4 hover:bg-[#14141C] grid grid-cols-1 md:grid-cols-12 items-center gap-3 transition-colors cursor-pointer"
                  >
                    <div className="md:col-span-7 flex items-start gap-3">
                      {th.isPinned ? (
                        <Pin className="w-4 h-4 text-[#22C55E] mt-1 shrink-0" />
                      ) : isLocationThread ? (
                        <MapPin className="w-4 h-4 text-[#22C55E] mt-1 shrink-0" />
                      ) : (
                        <MessageSquare className="w-4 h-4 text-[#A1A1AA] mt-1 shrink-0" />
                      )}
                      <div>
                        <div className="text-sm font-semibold text-[#F8FAFC]">
                          {th.isPinned ? '[Fixo] ' : ''}
                          {th.title}
                        </div>
                        <div className="text-xs text-[#A1A1AA] mt-0.5">
                          Por {th.authorName} · {th.authorRank} · {formatThreadCategoryLabel(th.category, th.village)}
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 md:text-center font-mono text-xs tabular-nums text-[#E4E4E7]">
                      {Math.max(0, threadPosts.length - 1)} respostas
                    </div>

                    <div className="md:col-span-3 md:text-right text-xs text-[#A1A1AA] flex md:justify-end items-center gap-2.5">
                      {last ? (
                        <>
                          <div>
                            <div className="text-[#F8FAFC]">{last.characterName}</div>
                            <div className="font-mono tabular-nums text-[11px]">
                              {new Date(last.createdAt).toLocaleString('pt-BR')}
                            </div>
                          </div>
                          <NinjaAvatar src={last.characterAvatar} alt={last.characterName} sizeClass="w-8 h-8" />
                        </>
                      ) : (
                        <span>—</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // VIEW 1: PLAY-BY-FORUM INDEX WITH VILLAGE IMAGERY
  const majorVillages = VILLAGES.slice(0, 5);
  const minorVillages = VILLAGES.slice(5);
  const councilStats = getBoardStats('Konohagakure', 'kage_council');
  const duelStats = getBoardStats('Kirigakure', 'spar_duel');

  return (
    <div className="space-y-6 pb-12 bg-[#050505]">
      {/* Atmospheric Masthead Banner */}
      <section className="relative overflow-hidden border-b border-[#1E1E26] bg-[#050505] min-h-[340px] md:min-h-[400px] flex items-end">
        <img
          src={KONOHA_BANNER}
          alt="Konoha Defenders — Konohagakure"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/86 to-[#050505]/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/35 to-transparent" />

        <div className="relative z-10 max-w-[1360px] mx-auto w-full px-4 md:px-6 py-8 md:py-12 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="text-xs font-mono tracking-[0.14em] text-[#22C55E]">
              Índice Geral Play-by-Forum · {VILLAGES.length} Vilas Ocultas · Locais Vivos & D100
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-[#F8FAFC] tracking-tight leading-tight text-balance">
              Konoha Defenders
            </h1>
            <p className="text-sm md:text-base text-[#D4D4D8] leading-relaxed">
              Entre em qualquer vilarejo para interagir nos locais vivos por mensagens Play-by-Forum, abrir crônicas de missão ou acompanhar os decretos dos Kages.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              {majorVillages.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelectBoard(v.name)}
                  className="px-3 py-1.5 rounded-md bg-[#0C0C10] hover:bg-[#10B981] hover:text-[#050505] border border-[#272732] hover:border-[#10B981] text-[#F8FAFC] font-medium transition-colors cursor-pointer whitespace-nowrap"
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => onNavigateSection('home')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#0C0C10] hover:bg-[#16161E] border border-[#272732] text-xs font-semibold text-[#F8FAFC] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 text-[#22C55E]" />
              Página Inicial
            </button>
            <button
              type="button"
              onClick={() => onNavigateSection('character')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#0C0C10] hover:bg-[#16161E] border border-[#10B981] text-xs font-semibold text-[#F8FAFC] transition-colors whitespace-nowrap cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#22C55E]" />
              Ficha & Sharingan
            </button>
            <button
              type="button"
              onClick={() => onNavigateSection('missions')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#10B981] hover:bg-[#22C55E] text-xs font-bold text-[#050505] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Swords className="w-3.5 h-3.5" />
              Quadro de Missões
            </button>
          </div>
        </div>
      </section>

      {/* Main 2-Column Forum Container */}
      <div className="max-w-[1360px] mx-auto px-4 md:px-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left/Center Forum Categories (9 cols) */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            {/* CATEGORY 01: Kage Council & Official Duel Arena */}
            <section className="jcink-shell rounded-xl overflow-hidden">
              <div className="jcink-cat-head px-5 py-3.5 flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-[#22C55E] tracking-wide">
                  01. Administração, Salão dos Kages & Arena Oficial
                </h2>
                <span className="hidden md:block text-[11px] font-mono text-[#A1A1AA]">
                  Tópicos · Último Autor
                </span>
              </div>
              <div className="divide-y divide-[#1E1E26]">
                {[
                  {
                    board: 'Conselho Kage',
                    title: 'Salão dos Cinco Kages & Decretos da Administração',
                    desc: 'Decretos oficiais, nomeações de Kage pela administração, tratados diplomáticos e eventos globais.',
                    img: KAGE_COUNCIL_BANNER,
                    glyph: '影',
                    stats: councilStats,
                  },
                  {
                    board: 'Arena de Duelos',
                    title: 'Arena Play-by-Forum & Exames de Graduação',
                    desc: 'Tópicos de combate narrativo com rolagem automática de precisão e dano.',
                    img: ARENA_BANNER,
                    glyph: '闘',
                    stats: duelStats,
                  },
                ].map((row) => (
                  <button
                    key={row.board}
                    type="button"
                    onClick={() => onSelectBoard(row.board)}
                    className="group w-full text-left p-4 md:p-5 hover:bg-[#14141C] grid grid-cols-1 md:grid-cols-12 items-center gap-4 transition-colors cursor-pointer"
                  >
                    <div className="md:col-span-7 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="relative w-full sm:w-44 aspect-video rounded-lg overflow-hidden border border-[#272732] group-hover:border-[#10B981] bg-[#070709] shrink-0 transition-colors">
                        <img
                          src={row.img}
                          alt={row.board}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/85 via-transparent to-transparent" />
                        <span className="absolute bottom-1.5 left-2 font-display text-sm font-bold text-[#22C55E]">
                          {row.glyph}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#F8FAFC] flex items-center gap-1">
                          <span>{row.title}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                        </div>
                        <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">{row.desc}</p>
                      </div>
                    </div>
                    <div className="md:col-span-2 md:text-center font-mono text-xs tabular-nums text-[#E4E4E7]">
                      <div>{row.stats.threadCount} {row.stats.threadCount === 1 ? 'tópico' : 'tópicos'}</div>
                      <div className="text-[#A1A1AA]">{row.stats.postCount} posts</div>
                    </div>
                    <div className="md:col-span-3 md:text-right text-xs text-[#A1A1AA] flex md:justify-end items-center gap-2.5">
                      {row.stats.lastPost ? (
                        <>
                          <div className="min-w-0">
                            <div className="text-[#F8FAFC] truncate">{row.stats.lastPost.characterName}</div>
                            <div className="font-mono text-[11px]">
                              {new Date(row.stats.lastPost.createdAt).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                          <NinjaAvatar
                            src={row.stats.lastPost.characterAvatar}
                            alt={row.stats.lastPost.characterName}
                            sizeClass="w-8 h-8"
                          />
                        </>
                      ) : (
                        <span>Sem postagens</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* CATEGORY 02: Five Great Shinobi Nations */}
            <section className="jcink-shell rounded-xl overflow-hidden">
              <div className="jcink-cat-head px-5 py-3.5 flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-[#22C55E] tracking-wide">
                  02. As Cinco Grandes Nações Shinobi (Com Locais Play-by-Forum)
                </h2>
                <span className="hidden md:block text-[11px] font-mono text-[#A1A1AA]">
                  Tópicos · Último Autor
                </span>
              </div>
              <div className="divide-y divide-[#1E1E26]">
                {majorVillages.map((v) => {
                  const st = getBoardStats(v.name);
                  const kage = allCharacters.find((c) => c.village === v.name && c.isKage);
                  const locs = getVillageLocations(v.name);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => onSelectBoard(v.name)}
                      className="group w-full text-left p-4 md:p-5 hover:bg-[#14141C] grid grid-cols-1 md:grid-cols-12 items-center gap-4 transition-colors cursor-pointer"
                    >
                      <div className="md:col-span-7 flex flex-col sm:flex-row sm:items-center gap-4">
                        {v.imageUrl && (
                          <div className="relative w-full sm:w-44 aspect-video rounded-lg overflow-hidden border border-[#272732] group-hover:border-[#10B981] bg-[#070709] shrink-0 transition-colors">
                            <img
                              src={v.imageUrl}
                              alt={`${v.name} — ${v.country}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/85 via-transparent to-transparent" />
                            <span className="absolute bottom-1.5 left-2 font-display text-sm font-bold text-[#F8FAFC] drop-shadow">
                              {v.emblemGlyph}
                            </span>
                            <span className="absolute bottom-1.5 right-2 font-mono text-[10px] text-[#22C55E]">
                              {v.primaryNature}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-display text-base font-bold text-[#F8FAFC] group-hover:text-[#22C55E] transition-colors">
                            {v.name} · <span className="font-sans text-xs font-medium text-[#A1A1AA]">{v.country}</span>
                          </div>
                          <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
                            {v.description}
                          </p>
                          <div className="text-[11px] font-mono mt-1.5 text-[#22C55E]">
                            {kage ? `${v.kageTitle}: ${kage.name}` : `${v.kageTitle}: Vago`} · {locs.length} Locais Interativos
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-2 md:text-center font-mono text-xs tabular-nums text-[#E4E4E7]">
                        <div>{st.threadCount} {st.threadCount === 1 ? 'tópico' : 'tópicos'}</div>
                        <div className="text-[#A1A1AA]">{st.postCount} posts</div>
                      </div>

                      <div className="md:col-span-3 md:text-right text-xs text-[#A1A1AA] flex md:justify-end items-center gap-2.5">
                        {st.lastPost ? (
                          <>
                            <div className="min-w-0">
                              <div className="text-[#F8FAFC] truncate">{st.lastPost.characterName}</div>
                              <div className="font-mono text-[11px]">
                                {new Date(st.lastPost.createdAt).toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                            <NinjaAvatar
                              src={st.lastPost.characterAvatar}
                              alt={st.lastPost.characterName}
                              sizeClass="w-8 h-8"
                            />
                          </>
                        ) : (
                          <span>Sem postagens</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* CATEGORY 03: Minor Nations & Hidden Regions */}
            <section className="jcink-shell rounded-xl overflow-hidden">
              <div className="jcink-cat-head px-5 py-3.5 flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-[#22C55E] tracking-wide">
                  03. Vilas Menores, Territórios Neutros & Fronteiras ({minorVillages.length} regiões)
                </h2>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {minorVillages.map((v) => {
                  const st = getBoardStats(v.name);
                  const locs = getVillageLocations(v.name);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => onSelectBoard(v.name)}
                      className="group text-left rounded-xl overflow-hidden border border-[#1E1E26] hover:border-[#10B981] bg-[#08080B] transition-colors cursor-pointer flex flex-col"
                    >
                      {v.imageUrl ? (
                        <div className="relative h-28 w-full overflow-hidden bg-[#050505]">
                          <img
                            src={v.imageUrl}
                            alt={`${v.name} — ${v.country}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#08080B] via-[#08080B]/35 to-transparent" />
                          <div className="absolute top-2 right-2.5 font-display text-sm font-bold text-[#22C55E] drop-shadow">
                            {v.emblemGlyph}
                          </div>
                          <div className="absolute bottom-2 left-3 right-3">
                            <div className="font-display text-sm font-bold text-[#F8FAFC] truncate">
                              {v.name}
                            </div>
                            <div className="text-[11px] text-[#A1A1AA] truncate">{v.country}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="px-3.5 pt-3.5 pb-2 border-b border-[#1E1E26] flex items-start justify-between gap-2 bg-[#0C0C10]">
                          <div className="min-w-0">
                            <div className="font-display text-sm font-bold text-[#F8FAFC] truncate">
                              {v.name}
                            </div>
                            <div className="text-[11px] text-[#A1A1AA] truncate">{v.country}</div>
                          </div>
                          <span className="font-display text-sm font-bold text-[#22C55E] shrink-0">
                            {v.emblemGlyph}
                          </span>
                        </div>
                      )}
                      <div className="p-3.5 flex-1 flex flex-col justify-between gap-2 text-xs">
                        <p className="text-[11px] text-[#A1A1AA] line-clamp-2 leading-relaxed">
                          {v.description}
                        </p>
                        <div className="pt-2 border-t border-[#1E1E26] flex items-center justify-between font-mono text-[11px] tabular-nums text-[#22C55E]">
                          <span>{locs.length} locais</span>
                          <span>{st.threadCount} tóp. · {st.postCount} posts</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right Sidebar: Player Mini-Profile, Kages & Live Shoutbox */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-5">
            <section className="jcink-shell rounded-xl overflow-hidden">
              {(() => {
                const myVillageImg = getVillageImage(character.village);
                return myVillageImg ? (
                  <div className="relative h-24 overflow-hidden bg-[#070709]">
                    <img
                      src={myVillageImg}
                      alt={character.village}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover opacity-70"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0C0C10] via-[#0C0C10]/35 to-transparent" />
                    <span className="absolute top-2.5 left-3.5 font-display text-[11px] font-bold text-[#F8FAFC] tracking-wide drop-shadow">
                      Minha Ficha & Avatar
                    </span>
                  </div>
                ) : (
                  <div className="px-4 py-2.5 bg-[#121218] border-b border-[#1E1E26]">
                    <span className="font-display text-[11px] font-bold text-[#22C55E] tracking-wide">
                      Minha Ficha & Avatar
                    </span>
                  </div>
                );
              })()}

              <div className="px-4 pb-4 space-y-3.5">
                <div className={`flex items-end gap-3 ${getVillageImage(character.village) ? '-mt-8' : 'pt-3.5'} relative z-10`}>
                  <div className="rounded-lg p-0.5 bg-[#0C0C10] border border-[#10B981] shrink-0">
                    <NinjaAvatar src={character.avatarUrl} alt={character.name} sizeClass="w-16 h-16" />
                  </div>
                  <div className="min-w-0 pb-0.5">
                    <div className="font-display font-bold text-sm text-[#F8FAFC] truncate">
                      {character.name}
                    </div>
                    <div className="text-xs text-[#22C55E] font-semibold">
                      {character.isKage ? `Kage · ${character.village}` : character.rank}
                    </div>
                    <div className="text-[11px] text-[#A1A1AA] truncate">
                      {character.village} · Clã {character.clan}
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-md bg-[#08080B] border border-[#1E1E26]">
                  <XpProgressPanel character={character} compact />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
                  <div className="p-2.5 rounded-md bg-[#08080B] border border-[#1E1E26]">
                    <div className="text-[#A1A1AA]">HP / Chakra</div>
                    <div className="text-[#F8FAFC] mt-0.5">{effStats.maxHp} / {effStats.maxChakra}</div>
                  </div>
                  <div className="p-2.5 rounded-md bg-[#08080B] border border-[#1E1E26]">
                    <div className="text-[#A1A1AA]">Ryo / Missões</div>
                    <div className="text-[#22C55E] mt-0.5">
                      {character.ryo} · {character.missionsCompleted} mis.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigateSection('graduation')}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-md bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Graduações
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateSection('jutsus')}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-md bg-[#121218] hover:bg-[#1A1A24] border border-[#10B981] text-[#F8FAFC] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Dojo Jutsus
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateSection('character')}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-md bg-[#08080B] hover:bg-[#14141C] border border-[#24242E] text-[#A1A1AA] hover:text-[#F8FAFC] text-xs font-medium transition-colors cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5 text-[#22C55E]" />
                  Ficha, Avatar & Sharingan
                </button>
              </div>
            </section>

            {/* Appointed Kages Card */}
            <section className="jcink-shell rounded-xl overflow-hidden">
              <div className="jcink-cat-head px-4 py-2.5 flex items-center justify-between">
                <span className="font-display text-xs font-bold text-[#22C55E] inline-flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" />
                  Kages Nomeados
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateSection('admin')}
                  className="text-[11px] text-[#A1A1AA] hover:text-[#22C55E] cursor-pointer"
                >
                  Gerenciar (ACP)
                </button>
              </div>
              <div className="p-4 space-y-2.5 text-xs">
                {appointedKages.length === 0 ? (
                  <div className="text-[#A1A1AA]">Nenhum Kage nomeado pela Administração ainda.</div>
                ) : (
                  appointedKages.map((k) => (
                    <div key={k.id} className="flex items-center justify-between gap-2.5 border-b border-[#1E1E26] pb-2.5 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <NinjaAvatar src={k.avatarUrl} alt={k.name} sizeClass="w-9 h-9" />
                        <div className="min-w-0">
                          <div className="font-semibold text-[#F8FAFC] truncate">{k.name}</div>
                          <div className="text-[11px] text-[#A1A1AA] truncate">{k.village}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-[#22C55E] shrink-0">Kage</span>
                    </div>
                  ))
                )}
                <div className="text-[11px] text-[#A1A1AA] pt-1">
                  Kages são escolhidos e apontados pela Administração.
                </div>
              </div>
            </section>

            {/* Live Shoutbox */}
            <section className="jcink-shell rounded-xl overflow-hidden">
              <div className="jcink-cat-head px-4 py-2.5 flex items-center justify-between">
                <h2 className="font-display text-xs font-bold text-[#22C55E]">
                  Shoutbox ao Vivo
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigateSection('members_chat')}
                  className="text-[11px] text-[#A1A1AA] hover:text-white cursor-pointer"
                >
                  Chat / MPs
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="max-h-40 overflow-y-auto jcink-subtle-scroll space-y-2 text-xs">
                  {chatMessages.slice(-5).map((m) => (
                    <div key={m.id} className="text-[#E4E4E7] leading-snug">
                      <span className="font-mono text-[10px] text-[#A1A1AA] mr-1.5">
                        [{new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}]
                      </span>
                      <span className="font-semibold text-[#22C55E]">{m.senderName}: </span>
                      <span>{m.message}</span>
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!shoutText.trim()) return;
                    onSendShout(shoutText.trim());
                    setShoutText('');
                  }}
                  className="flex gap-1.5"
                >
                  <input
                    type="text"
                    aria-label="Mensagem rápida na Shoutbox"
                    value={shoutText}
                    onChange={(e) => setShoutText(e.target.value)}
                    placeholder="Enviar na Shoutbox..."
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-md bg-[#070709] border border-[#272732] focus:border-[#10B981] focus:outline-none text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-md bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold cursor-pointer shrink-0 transition-colors"
                  >
                    Enviar
                  </button>
                </form>
              </div>
            </section>
          </aside>
        </div>

        {/* Bottom Board Statistics */}
        <footer className="jcink-shell rounded-xl overflow-hidden">
          <div className="jcink-cat-head px-5 py-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#22C55E]" />
            <h2 className="font-display text-xs font-bold text-[#22C55E]">
              Estatísticas do Fórum & Quem Está Online — Konoha Defenders
            </h2>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <div className="text-[#A1A1AA]">
                Shinobis conectados agora ({Math.max(1, onlineUsers.length)}):
              </div>
              <div className="text-[#F8FAFC]">
                {onlineUsers.length > 0
                  ? onlineUsers.map((u) => `${u.name} (${u.village})`).join(' · ')
                  : `${character.name} (${character.village})`}
              </div>
            </div>
            <div className="space-y-1.5 font-mono tabular-nums text-[#E4E4E7] md:text-right">
              <div>
                Ninjas Registrados: {allCharacters.length} · Tópicos: {threads.length} · Postagens: {posts.length}
              </div>
              <div className="text-[#A1A1AA]">
                Total de Vilas: {VILLAGES.length} · Último Ninja: {allCharacters[allCharacters.length - 1]?.name || character.name}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
