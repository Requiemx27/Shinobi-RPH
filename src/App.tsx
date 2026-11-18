import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { signInWithPopup } from 'firebase/auth';
import { X } from 'lucide-react';
import { auth, googleAuthProvider } from './lib/firebase.ts';
import {
  buildDefaultGeopoliticsState,
  CharacterModel,
  DailyLoginRewardPopupData,
  ScaledMission,
  toUtcDateKey,
} from './game/engine.ts';
import { GeopoliticsWorldState, JutsuDef } from './game/narutoData.ts';
import { LanguageCode, t } from './game/i18n.ts';
import { shinobiAudio } from './game/sound.ts';
import { useOnlineStatus } from './hooks/usePWAInstall.ts';
import { apiFetch, getAuthToken, setAuthToken } from './utils/api.ts';
import { loadOfflineSnapshot, saveOfflineSnapshot } from './utils/offlineStore.ts';
import { ForumHeader, ForumNavSection } from './components/ForumHeader.tsx';
import { HomePage } from './components/HomePage.tsx';
import { ForumBoard, ForumPost, ForumThread } from './components/ForumBoard.tsx';
import { CombatArena } from './components/CombatArena.tsx';
import { CharacterStudio } from './components/CharacterStudio.tsx';
import { JutsuDojo } from './components/JutsuDojo.tsx';
import { GraduationCenter } from './components/GraduationCenter.tsx';
import { MarketArsenal, MarketListing } from './components/MarketArsenal.tsx';
import { ChatMsg, KageChatPanel } from './components/KageChatPanel.tsx';
import { AdminAnalyticsPanel } from './components/AdminAnalyticsPanel.tsx';
import { GeopoliticsPanel } from './components/GeopoliticsPanel.tsx';
import { TeamsPanel } from './components/TeamsPanel.tsx';
import { DailyRewardModal } from './components/DailyRewardModal.tsx';

interface OnlineUser {
  uid: string;
  name: string;
  village: string;
}

export default function App() {
  const [activeSection, setActiveSection] = useState<ForumNavSection>('home');
  const [missionsTab, setMissionsTab] = useState<
    'missions' | 'war_missions' | 'team_missions' | 'pvp' | 'jutsu_quests' | 'summon_quests'
  >('missions');
  const [pvpTargetCharId, setPvpTargetCharId] = useState<number | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);

  const [lang, setLang] = useState<LanguageCode>('pt');
  const [muted, setMuted] = useState(false);
  const [booting, setBooting] = useState(true);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [accountDisplayName, setAccountDisplayName] = useState('');
  const [needsCreation, setNeedsCreation] = useState(false);

  const [character, setCharacter] = useState<CharacterModel | null>(null);
  const [userRole, setUserRole] = useState<string>('player');
  const [geopolitics, setGeopolitics] = useState<GeopoliticsWorldState>(() =>
    buildDefaultGeopoliticsState()
  );
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [missions, setMissions] = useState<ScaledMission[]>([]);
  const [customJutsus, setCustomJutsus] = useState<JutsuDef[]>([]);
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [rankings, setRankings] = useState<CharacterModel[]>([]);
  const [activeChannel, setActiveChannel] = useState<string>('global');
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [pushEnabled, setPushEnabled] = useState<boolean>(true);
  const [pushBanner, setPushBanner] = useState<{ title: string; body: string } | null>(null);
  const [dailyRewardPopup, setDailyRewardPopup] = useState<DailyLoginRewardPopupData | null>(null);

  const isOnline = useOnlineStatus();
  const socketRef = useRef<Socket | null>(null);
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);
  const pushEnabledRef = useRef(pushEnabled);
  pushEnabledRef.current = pushEnabled;
  const activeChannelRef = useRef(activeChannel);
  activeChannelRef.current = activeChannel;
  const dailyCheckAttemptedRef = useRef<string | null>(null);

  useEffect(() => {
    document.body.dataset.state = 'playing';
  }, []);

  // Keyboard M mute shortcut when not typing in an input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      const isTyping = targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT';
      if (!isTyping && (e.key === 'm' || e.key === 'M')) {
        setMuted((prev) => {
          const next = !prev;
          shinobiAudio.muted = next;
          return next;
        });
      } else if (e.key === 'Escape' && showAuthModal) {
        setShowAuthModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showAuthModal]);

  const refreshCharacter = useCallback(async (): Promise<void> => {
    try {
      const res = await apiFetch<{ character: CharacterModel | null; needsCreation?: boolean }>(
        '/api/characters/me'
      );
      setCharacter(res.character);
      const missingChar = !res.character || Boolean(res.needsCreation);
      setNeedsCreation(missingChar);
      if (missingChar) {
        setActiveSection('character');
      } else if (res.character) {
        saveOfflineSnapshot({ character: res.character });
      }
    } catch {
      const cached = loadOfflineSnapshot();
      if (cached.character) {
        setCharacter(cached.character as CharacterModel);
        setNeedsCreation(false);
      }
    }
  }, []);

  const refreshForum = useCallback(async () => {
    try {
      const res = await apiFetch<{ threads: ForumThread[]; posts: ForumPost[] }>('/api/forum/threads');
      setThreads(res.threads);
      setPosts(res.posts);
      saveOfflineSnapshot({ threads: res.threads, posts: res.posts });
    } catch {
      const cached = loadOfflineSnapshot();
      if (cached.threads.length) setThreads(cached.threads as ForumThread[]);
      if (cached.posts.length) setPosts(cached.posts as ForumPost[]);
    }
  }, []);

  const refreshMissions = useCallback(async () => {
    try {
      const res = await apiFetch<{ missions: ScaledMission[]; customJutsus?: JutsuDef[] }>('/api/missions/dynamic');
      setMissions(res.missions);
      if (res.customJutsus) setCustomJutsus(res.customJutsus);
    } catch {
      // Keep previous missions when offline
    }
  }, []);

  const refreshMarket = useCallback(async () => {
    try {
      const res = await apiFetch<{ listings: MarketListing[] }>('/api/market/listings');
      setListings(res.listings);
    } catch {
      // Keep cached market
    }
  }, []);

  const refreshRankings = useCallback(async () => {
    try {
      const res = await apiFetch<{ characters: CharacterModel[] }>('/api/rankings');
      setRankings(res.characters);
      saveOfflineSnapshot({ rankings: res.characters });
    } catch {
      const cached = loadOfflineSnapshot();
      if (cached.rankings.length) setRankings(cached.rankings as CharacterModel[]);
    }
  }, []);

  const loadChatChannel = useCallback(async (channel: string) => {
    try {
      const res = await apiFetch<{ messages: ChatMsg[] }>(
        `/api/chat/messages?channel=${encodeURIComponent(channel)}`
      );
      setChatMessages(res.messages);
      socketRef.current?.emit('chat:join', channel);
    } catch {
      // Ignore offline chat load
    }
  }, []);

  const refreshGeopolitics = useCallback(async () => {
    try {
      const res = await apiFetch<{ geopolitics: GeopoliticsWorldState }>('/api/geopolitics');
      if (res.geopolitics) setGeopolitics(res.geopolitics);
    } catch {
      // Keep default or cached geopolitics state when offline
    }
  }, []);

  const refreshAccountMeta = useCallback(async () => {
    try {
      const me = await apiFetch<{ user?: { role?: string; displayName?: string } }>('/api/auth/me');
      if (me.user?.role) setUserRole(me.user.role);
      if (me.user?.displayName) setAccountDisplayName(me.user.displayName);
    } catch {
      // Ignore offline auth check
    }
  }, []);

  const bootstrapWorld = useCallback(async () => {
    await Promise.all([
      refreshCharacter(),
      refreshAccountMeta(),
      refreshGeopolitics(),
      refreshForum(),
      refreshMissions(),
      refreshMarket(),
      refreshRankings(),
      loadChatChannel(activeChannelRef.current),
    ]);
  }, [
    refreshCharacter,
    refreshAccountMeta,
    refreshGeopolitics,
    refreshForum,
    refreshMissions,
    refreshMarket,
    refreshRankings,
    loadChatChannel,
  ]);

  const handleStartDemo = useCallback(async () => {
    setLoadingAuth(true);
    setAuthError(null);
    try {
      const res = await apiFetch<{
        token: string;
        user: { language?: string; pushEnabled?: boolean; role?: string };
      }>('/api/auth/demo', { method: 'POST' });
      setAuthToken(res.token);
      if (res.user?.role) setUserRole(res.user.role);
      if (res.user?.language) setLang(res.user.language as LanguageCode);
      if (typeof res.user?.pushEnabled === 'boolean') setPushEnabled(res.user.pushEnabled);
      await bootstrapWorld();
      setActiveSection((prev) => (prev === 'character' ? prev : 'home'));
      setShowAuthModal(false);
    } catch (err) {
      setAuthError((err as Error).message);
      const cached = loadOfflineSnapshot();
      if (cached.character) setCharacter(cached.character as CharacterModel);
      if (cached.threads.length) setThreads(cached.threads as ForumThread[]);
      if (cached.posts.length) setPosts(cached.posts as ForumPost[]);
      if (cached.rankings.length) setRankings(cached.rankings as CharacterModel[]);
    } finally {
      setLoadingAuth(false);
      setBooting(false);
    }
  }, [bootstrapWorld]);

  // Initial seamless boot straight into the Forum Index
  useEffect(() => {
    const existingToken = getAuthToken();
    if (existingToken) {
      bootstrapWorld()
        .then(() => setBooting(false))
        .catch(() => handleStartDemo());
    } else {
      handleStartDemo();
    }
  }, [bootstrapWorld, handleStartDemo]);

  // Automatic Daily Login Reward claim on first visit of the UTC day
  useEffect(() => {
    if (booting || needsCreation || !character || !isOnline) return;
    const todayKey = toUtcDateKey();
    if (character.lastDailyRewardDate === todayKey) return;

    const attemptKey = `${character.id}:${todayKey}`;
    if (dailyCheckAttemptedRef.current === attemptKey) return;
    dailyCheckAttemptedRef.current = attemptKey;

    let cancelled = false;
    apiFetch<{
      claimed: boolean;
      alreadyClaimedToday?: boolean;
      reward: DailyLoginRewardPopupData | null;
      character?: CharacterModel;
    }>('/api/characters/daily-login', { method: 'POST' })
      .then((res) => {
        if (cancelled) return;
        if (res.character) {
          setCharacter(res.character);
          saveOfflineSnapshot({ character: res.character });
        }
        if (res.claimed && res.reward) {
          setDailyRewardPopup(res.reward);
          try {
            shinobiAudio.playLevelUpChime();
          } catch {
            // Ignore autoplay restriction before user gesture
          }
          refreshRankings();
        }
      })
      .catch(() => {
        // Keep silent if offline or transient error; allow retry on next focus/session
        if (!cancelled && dailyCheckAttemptedRef.current === attemptKey) {
          dailyCheckAttemptedRef.current = null;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [booting, needsCreation, character, isOnline, refreshRankings]);

  // Socket.io connection keyed by active character userUid
  const characterUid = character?.userUid || null;
  const characterName = character?.name || 'Shinobi';
  const characterVillage = character?.village || 'Konohagakure';

  useEffect(() => {
    if (!characterUid) return;

    const socket = io();
    socketRef.current = socket;
    setSocketInstance(socket);

    socket.on('connect', () => {
      socket.emit('presence:join', {
        uid: characterUid,
        name: characterName,
        village: characterVillage,
      });
      socket.emit('chat:join', activeChannelRef.current);
    });

    socket.on('presence:list', (list: OnlineUser[]) => {
      const seen = new Set<string>();
      const unique: OnlineUser[] = [];
      for (const item of list) {
        if (item?.uid && !seen.has(item.uid)) {
          seen.add(item.uid);
          unique.push(item);
        }
      }
      setOnlineUsers(unique);
    });

    socket.on('forum:post_created', (post: ForumPost) => {
      setPosts((prev) => (prev.some((p) => p.id === post.id) ? prev : [...prev, post]));
    });

    socket.on('forum:thread_created', ({ thread, firstPost }: { thread: ForumThread; firstPost: ForumPost }) => {
      setThreads((prev) => (prev.some((th) => th.id === thread.id) ? prev : [thread, ...prev]));
      setPosts((prev) => (prev.some((p) => p.id === firstPost.id) ? prev : [...prev, firstPost]));
    });

    socket.on('market:updated', () => {
      refreshMarket();
    });

    socket.on('geopolitics:updated', (next: GeopoliticsWorldState) => {
      if (next) setGeopolitics(next);
    });

    socket.on('chat:message', (msg: ChatMsg) => {
      if (msg.channel === activeChannelRef.current || msg.channel === 'global') {
        setChatMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
    });

    socket.on('push:notify', (note: { title: string; body: string }) => {
      if (!pushEnabledRef.current) return;
      setPushBanner(note);
      setTimeout(() => setPushBanner(null), 5000);
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification(note.title, { body: note.body });
        } catch {
          // Ignore Notification API error
        }
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketInstance(null);
    };
  }, [characterUid, characterName, characterVillage, refreshMarket]);

  useEffect(() => {
    if (characterUid) {
      loadChatChannel(activeChannel);
    }
  }, [activeChannel, characterUid, loadChatChannel]);

  const handleGoogleLogin = async () => {
    setLoadingAuth(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();
      setAuthToken(idToken);
      const me = await apiFetch<{ user?: { displayName?: string } }>('/api/auth/me');
      setAccountDisplayName(me.user?.displayName || result.user.displayName || '');
      shinobiAudio.playUiClick();
      await bootstrapWorld();
      setShowAuthModal(false);
    } catch (err) {
      setAuthError((err as Error).message);
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAuth(true);
    setAuthError(null);
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await apiFetch<{ token: string; user?: { displayName?: string } }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName }),
      });
      setAuthToken(res.token);
      setAccountDisplayName(res.user?.displayName || displayName || '');
      shinobiAudio.playUiClick();
      await bootstrapWorld();
      setShowAuthModal(false);
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (err) {
      setAuthError((err as Error).message);
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleChangeLang = async (nextLang: LanguageCode) => {
    setLang(nextLang);
    if (character) {
      apiFetch('/api/auth/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ language: nextLang }),
      }).catch(() => {});
    }
  };

  const handleTogglePush = async () => {
    const next = !pushEnabled;
    setPushEnabled(next);
    apiFetch('/api/auth/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ pushEnabled: next }),
    }).catch(() => {});
  };

  const handleSendChat = (channel: string, message: string) => {
    if (!character || !socketRef.current) return;
    socketRef.current.emit('chat:send', {
      channel,
      senderUid: character.userUid,
      senderName: character.name,
      senderVillage: character.village,
      message,
    });
  };

  const handleSelectSection = (section: ForumNavSection) => {
    if (needsCreation && section !== 'character') {
      setActiveSection('character');
      return;
    }
    shinobiAudio.playUiClick();
    if (section === 'missions') {
      setMissionsTab('missions');
    }
    setActiveSection(section);
    if (section === 'forum') {
      setSelectedBoard(null);
      setSelectedThreadId(null);
    }
  };

  const openJutsuQuests = () => {
    shinobiAudio.playUiClick();
    setMissionsTab('jutsu_quests');
    setActiveSection('missions');
  };

  const openSummonQuests = () => {
    shinobiAudio.playUiClick();
    setMissionsTab('summon_quests');
    setActiveSection('missions');
  };

  const openWarMissions = () => {
    shinobiAudio.playUiClick();
    setMissionsTab('war_missions');
    setActiveSection('missions');
  };

  const openTeamMissions = () => {
    shinobiAudio.playUiClick();
    setMissionsTab('team_missions');
    setActiveSection('missions');
  };

  const openPvpArena = (targetCharacterId?: number) => {
    shinobiAudio.playUiClick();
    if (typeof targetCharacterId === 'number') {
      setPvpTargetCharId(targetCharacterId);
    }
    setMissionsTab('pvp');
    setActiveSection('missions');
  };

  const activeThread = useMemo(
    () => (selectedThreadId ? threads.find((th) => th.id === selectedThreadId) || null : null),
    [threads, selectedThreadId]
  );

  const breadcrumbs = useMemo(() => {
    if (needsCreation || !character) {
      return [{ label: 'Criação de Personagem' }];
    }
    const items: Array<{ label: string; onClick?: () => void }> = [
      {
        label: 'Início',
        onClick:
          activeSection !== 'home'
            ? () => {
                setActiveSection('home');
                setSelectedBoard(null);
                setSelectedThreadId(null);
              }
            : undefined,
      },
    ];

    if (activeSection === 'forum') {
      items.push({
        label: 'Índice do Fórum',
        onClick:
          selectedBoard !== null || selectedThreadId !== null
            ? () => {
                setSelectedBoard(null);
                setSelectedThreadId(null);
              }
            : undefined,
      });
      const boardLabel =
        selectedBoard ||
        (activeThread
          ? activeThread.category === 'kage_council'
            ? 'Conselho Kage'
            : activeThread.category === 'spar_duel'
            ? 'Arena de Duelos'
            : activeThread.village
          : null);
      if (boardLabel) {
        items.push({
          label: boardLabel,
          onClick: activeThread
            ? () => {
                setSelectedBoard(boardLabel);
                setSelectedThreadId(null);
              }
            : undefined,
        });
      }
      if (activeThread) {
        items.push({ label: activeThread.title });
      }
    } else if (activeSection === 'missions') {
      items.push({ label: 'Missões & Arena RP' });
    } else if (activeSection === 'teams') {
      items.push({ label: 'Equipes (1 Sensei + 3 Alunos)' });
    } else if (activeSection === 'geopolitics') {
      items.push({ label: 'Geopolítica & Alianças' });
    } else if (activeSection === 'character') {
      items.push({ label: 'Ficha & Avatar' });
    } else if (activeSection === 'jutsus') {
      items.push({ label: 'Dojo de Jutsus' });
    } else if (activeSection === 'graduation') {
      items.push({ label: 'Graduações & Exames' });
    } else if (activeSection === 'market') {
      items.push({ label: 'Mercado & Arsenal' });
    } else if (activeSection === 'members_chat') {
      items.push({ label: 'Membros, Ranking & MP' });
    } else if (activeSection === 'admin') {
      items.push({ label: 'ACP & Nomeação de Kages' });
    }

    return items;
  }, [activeSection, selectedBoard, selectedThreadId, activeThread, needsCreation, character]);

  return (
    <div className="min-h-screen bg-[#050505] text-[#F8FAFC] flex flex-col">
      <ForumHeader
        character={character}
        needsCharacterCreation={needsCreation}
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        breadcrumbs={breadcrumbs}
        lang={lang}
        onChangeLang={handleChangeLang}
        muted={muted}
        onToggleMute={() => {
          const next = !muted;
          shinobiAudio.muted = next;
          setMuted(next);
        }}
        isOnline={isOnline}
        onlineCount={Math.max(1, onlineUsers.length)}
        onOpenAuthModal={() => {
          setAuthError(null);
          setShowAuthModal(true);
        }}
      />

      {!isOnline && (
        <div className="bg-[#0C0C10] border-b border-[#10B981] px-4 py-2 text-center text-xs text-[#22C55E]">
          {t(lang, 'offlineMode')}
        </div>
      )}

      {pushBanner && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-[#0C0C10] border border-[#10B981] rounded-lg p-4 shadow-2xl space-y-1">
          <div className="text-xs font-semibold text-[#22C55E]">{pushBanner.title}</div>
          <p className="text-xs text-[#F8FAFC]">{pushBanner.body}</p>
        </div>
      )}

      <main className="flex-1">
        {booting ? (
          <div className="max-w-[1360px] mx-auto px-4 md:px-6 py-12 space-y-4">
            <div className="bg-[#0C0C10] border border-[#1E1E26] rounded-xl p-8 text-center space-y-3">
              <div className="font-display text-lg font-bold text-[#F8FAFC]">
                Sincronizando Fórum Konoha Defenders...
              </div>
              <p className="text-xs text-[#A1A1AA]">
                Carregando quadros das 18 vilas ocultas, locais Play-by-Forum, Kages nomeados e estatísticas em tempo real.
              </p>
              {authError && (
                <div className="text-xs text-[#EF4444] pt-2">{authError}</div>
              )}
            </div>
          </div>
        ) : !character || needsCreation ? (
          <CharacterStudio
            character={null}
            defaultName={accountDisplayName}
            onRefreshCharacter={async () => {
              await Promise.all([refreshCharacter(), refreshRankings()]);
            }}
            onCreatedCharacter={() => setActiveSection('forum')}
          />
        ) : (
          <>
            {activeSection === 'home' && (
              <HomePage
                character={character}
                allCharacters={rankings}
                threads={threads}
                posts={posts}
                onlineCount={Math.max(1, onlineUsers.length)}
                geopolitics={geopolitics}
                onNavigateSection={handleSelectSection}
                onOpenVillageBoard={(villageName) => {
                  shinobiAudio.playUiClick();
                  setActiveSection('forum');
                  setSelectedBoard(villageName);
                  setSelectedThreadId(null);
                }}
                onOpenThread={(threadId, boardName) => {
                  shinobiAudio.playUiClick();
                  setActiveSection('forum');
                  setSelectedBoard(boardName);
                  setSelectedThreadId(threadId);
                }}
                onOpenFrontlineMissions={() => {
                  openWarMissions();
                }}
                onOpenPvpArena={() => {
                  openPvpArena();
                }}
              />
            )}

            {activeSection === 'forum' && (
              <ForumBoard
                character={character}
                allCharacters={rankings}
                threads={threads}
                posts={posts}
                chatMessages={chatMessages}
                onlineUsers={onlineUsers}
                customJutsus={customJutsus}
                lang={lang}
                isOnline={isOnline}
                selectedBoard={selectedBoard}
                selectedThreadId={selectedThreadId}
                onSelectBoard={(board) => {
                  shinobiAudio.playUiClick();
                  setSelectedBoard(board);
                  setSelectedThreadId(null);
                }}
                onSelectThread={(threadId) => {
                  shinobiAudio.playUiClick();
                  setSelectedThreadId(threadId);
                }}
                onNavigateSection={(sec) => handleSelectSection(sec)}
                onOpenDm={(targetUid) => {
                  const pair = [character.userUid, targetUid].sort().join(':');
                  setActiveChannel(`dm:${pair}`);
                  setActiveSection('members_chat');
                }}
                onSendShout={(msg) => handleSendChat('global', msg)}
                onRefreshForum={refreshForum}
                onRefreshCharacter={async () => {
                  await Promise.all([refreshCharacter(), refreshRankings()]);
                }}
              />
            )}

            {activeSection === 'missions' && (
              <CombatArena
                character={character}
                missions={missions}
                customJutsus={customJutsus}
                lang={lang}
                initialTab={missionsTab}
                geopolitics={geopolitics}
                socket={socketInstance}
                initialPvpOpponentId={pvpTargetCharId}
                onOpenArsenal={() => handleSelectSection('market')}
                onOpenGeopolitics={() => handleSelectSection('geopolitics')}
                onOpenTeamsTab={() => handleSelectSection('teams')}
                onOpenVillageRp={() => {
                  shinobiAudio.playUiClick();
                  setSelectedBoard(character.village);
                  setSelectedThreadId(null);
                  setActiveSection('forum');
                }}
                onCombatFinished={async () => {
                  await Promise.all([
                    refreshCharacter(),
                    refreshMissions(),
                    refreshRankings(),
                    refreshGeopolitics(),
                  ]);
                }}
              />
            )}

            {activeSection === 'teams' && (
              <TeamsPanel
                character={character}
                socket={socketInstance}
                onOpenTeamMissions={openTeamMissions}
                onChallengePvp={(charId) => openPvpArena(charId)}
              />
            )}

            {activeSection === 'geopolitics' && (
              <div className="max-w-[1360px] mx-auto px-4 md:px-6 py-6">
                <GeopoliticsPanel
                  geopolitics={geopolitics}
                  character={character}
                  userRole={userRole}
                  token={getAuthToken()}
                  onGeopoliticsUpdated={(next) => setGeopolitics(next)}
                  onNavigateToMissions={() => {
                    openWarMissions();
                  }}
                  onNavigateToVillageForum={(villageName) => {
                    shinobiAudio.playUiClick();
                    setSelectedBoard(villageName);
                    setSelectedThreadId(null);
                    setActiveSection('forum');
                  }}
                />
              </div>
            )}

            {activeSection === 'character' && (
              <CharacterStudio
                character={character}
                onOpenJutsuQuests={openJutsuQuests}
                onOpenSummonQuests={openSummonQuests}
                onRefreshCharacter={async () => {
                  await Promise.all([refreshCharacter(), refreshRankings()]);
                }}
              />
            )}

            {activeSection === 'jutsus' && (
              <JutsuDojo
                character={character}
                customJutsus={customJutsus}
                lang={lang}
                onOpenGraduation={() => handleSelectSection('graduation')}
                onOpenCharacterSheet={() => handleSelectSection('character')}
                onOpenJutsuQuests={openJutsuQuests}
                onOpenSummonQuests={openSummonQuests}
                onRefreshCharacter={async () => {
                  await Promise.all([refreshCharacter(), refreshRankings()]);
                }}
              />
            )}

            {activeSection === 'graduation' && (
              <GraduationCenter
                character={character}
                onRefreshAll={async () => {
                  await Promise.all([refreshCharacter(), refreshRankings(), refreshForum()]);
                }}
                onGoToJutsus={() => handleSelectSection('jutsus')}
                onGoToMissions={() => handleSelectSection('missions')}
              />
            )}

            {activeSection === 'market' && (
              <MarketArsenal
                character={character}
                listings={listings}
                lang={lang}
                onRefreshCharacter={refreshCharacter}
                onRefreshMarket={refreshMarket}
              />
            )}

            {activeSection === 'members_chat' && (
              <KageChatPanel
                character={character}
                rankings={rankings}
                chatMessages={chatMessages}
                activeChannel={activeChannel}
                onSelectChannel={setActiveChannel}
                onSendChat={handleSendChat}
                pushEnabled={pushEnabled}
                onTogglePush={handleTogglePush}
                onChallengePvp={(charId) => openPvpArena(charId)}
              />
            )}

            {activeSection === 'admin' && (
              <AdminAnalyticsPanel
                character={character}
                lang={lang}
                isOnline={isOnline}
                onRefreshAll={bootstrapWorld}
              />
            )}
          </>
        )}
      </main>

      {/* Account Switch / Login / Register Modal */}
      {showAuthModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <div className="bg-[#0C0C10] border border-[#24242E] rounded-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E1E26] pb-3">
              <h2 id="auth-modal-title" className="font-display text-lg font-bold text-[#F8FAFC]">
                Conta Konoha Defenders & Autenticação
              </h2>
              <button
                type="button"
                aria-label="Fechar janela de conta"
                onClick={() => setShowAuthModal(false)}
                className="p-1 rounded text-[#A1A1AA] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {authError && (
              <div className="px-3 py-2 rounded bg-[#180B0E] border border-red-500 text-xs text-red-200">
                {authError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={loadingAuth}
                onClick={handleStartDemo}
                className="py-2 px-3 rounded-md bg-[#121218] hover:bg-[#191922] border border-[#272732] text-xs font-medium text-[#F8FAFC] cursor-pointer whitespace-nowrap"
              >
                Conta Demo (Renjiro)
              </button>
              <button
                type="button"
                disabled={loadingAuth}
                onClick={handleGoogleLogin}
                className="py-2 px-3 rounded-md bg-[#121218] hover:bg-[#191922] border border-[#10B981] text-xs font-semibold text-[#22C55E] cursor-pointer whitespace-nowrap"
              >
                Google Sign-In
              </button>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3 pt-2 border-t border-[#1E1E26]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#F8FAFC]">
                  {authMode === 'login' ? 'Entrar com E-mail e Senha (JWT)' : 'Registrar Novo Membro do Fórum'}
                </span>
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-xs text-[#22C55E] hover:underline cursor-pointer"
                >
                  {authMode === 'login' ? 'Criar Conta' : 'Já tenho conta'}
                </button>
              </div>

              {authMode === 'register' && (
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nome do Ninja / Jogador"
                  className="w-full px-3 py-2 rounded-md bg-[#070709] border border-[#272732] focus:border-[#10B981] focus:outline-none text-sm text-white"
                />
              )}

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ninja@konoha.rpg"
                className="w-full px-3 py-2 rounded-md bg-[#070709] border border-[#272732] focus:border-[#10B981] focus:outline-none text-sm text-white"
              />

              <input
                type="password"
                required
                minLength={4}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha (mín. 4 caracteres)"
                className="w-full px-3 py-2 rounded-md bg-[#070709] border border-[#272732] focus:border-[#10B981] focus:outline-none text-sm text-white"
              />

              <button
                type="submit"
                disabled={loadingAuth}
                className="w-full py-2.5 rounded-md bg-[#10B981] hover:bg-[#22C55E] text-[#050505] text-xs font-bold cursor-pointer disabled:opacity-60 transition-colors"
              >
                {loadingAuth ? 'Autenticando...' : authMode === 'login' ? 'Entrar no Fórum' : 'Registrar e Entrar'}
              </button>
            </form>
          </div>
        </div>
      )}

      <DailyRewardModal
        reward={dailyRewardPopup}
        onClose={() => {
          shinobiAudio.playUiClick();
          setDailyRewardPopup(null);
        }}
      />
    </div>
  );
}
