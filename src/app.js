import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  writeBatch,
  increment,
  OperationType,
  handleFirestoreError,
  USERNAME_REGEX,
  LIMITS,
} from './firebase.js';
import { icons } from './icons.js';
import {
  renderPublicTopBar,
  renderPublicFooter,
  renderEditorialSections,
  renderPolicyPageContent,
  renderCookieBanner,
} from './legalPages.js';

const EMOJI_LIST = [
  '😀', '😂', '🥹', '😍', '🤩', '😎', '🙏', '👍',
  '👏', '🔥', '💯', '🎉', '❤️', '💙', '✨', '🤝',
  '😊', '😅', '🤔', '🙌', '🥳', '😴', '🤗', '🚀',
];

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function linkifySafeText(rawText) {
  const escaped = escapeHtml(rawText);
  return escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="underline decoration-current/60 hover:opacity-80 break-all">$1</a>'
  );
}

function normalizeUsername(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, LIMITS.USERNAME_MAX);
}

function getDirectChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

function toDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
}

function formatTime(ts) {
  const d = toDate(ts);
  if (!d) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatSidebarDate(ts) {
  const d = toDate(ts);
  if (!d) return '';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday - startOfMsg) / 86400000);
  if (diffDays === 0) return formatTime(ts);
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatDayDivider(ts) {
  const d = toDate(ts);
  if (!d) return 'Today';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday - startOfMsg) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatLastSeen(profile) {
  if (!profile) return '';
  if (profile.isOnline) return 'Online';
  const d = toDate(profile.lastSeen);
  if (!d) return 'Offline';
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return `Last seen today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return `Last seen ${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function getInitials(name) {
  const clean = String(name || '?').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

function getAvatarHue(seed) {
  const hues = [
    'bg-emerald-600',
    'bg-teal-600',
    'bg-cyan-700',
    'bg-sky-700',
    'bg-indigo-600',
    'bg-amber-700',
    'bg-rose-700',
  ];
  let hash = 0;
  const s = String(seed || 'u');
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return hues[Math.abs(hash) % hues.length];
}

function renderAvatar(profile, sizeClass = 'w-11 h-11', textClass = 'text-sm', showOnline = false) {
  const name = profile?.displayName || profile?.username || 'User';
  const initials = escapeHtml(getInitials(name));
  const bg = getAvatarHue(profile?.uid || profile?.username || name);
  const photo = profile?.photoURL && /^https?:\/\//.test(profile.photoURL) ? escapeHtml(profile.photoURL) : '';

  return `
    <div class="relative shrink-0 ${sizeClass}">
      ${
        photo
          ? `<img src="${photo}" alt="${escapeHtml(name)}" referrerpolicy="no-referrer"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
               class="w-full h-full rounded-full object-cover bg-[#dfe5e7] dark:bg-[#2a3942]" />
             <div style="display:none" class="w-full h-full rounded-full ${bg} text-white font-semibold ${textClass} items-center justify-center select-none">${initials}</div>`
          : `<div class="w-full h-full rounded-full ${bg} text-white font-semibold ${textClass} flex items-center justify-center select-none">${initials}</div>`
      }
      ${
        showOnline && profile?.isOnline
          ? `<span title="Online" class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#00a884] ring-2 ring-white dark:ring-[#111b21]"></span>`
          : ''
      }
    </div>
  `;
}

export function createChatApp(rootEl) {
  const state = {
    authReady: false,
    authUser: null,
    myProfile: null,
    needsOnboarding: false,
    pendingDisplayName: '',
    theme: localStorage.getItem('baatcheet_theme') === 'dark' ? 'dark' : 'light',

    authMode: 'signin', // 'signin' | 'signup' | 'forgot'
    authSubmitting: false,
    authSuccessMessage: '',
    showPassword: false,

    publicPage: (() => {
      const h = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      return ['home', 'guide', 'about', 'privacy', 'terms', 'contact'].includes(h) ? h : 'home';
    })(), // 'home' | 'guide' | 'about' | 'privacy' | 'terms' | 'contact'
    viewingPublicDocs: false,
    cookieConsent: localStorage.getItem('baatcheet_cookie_consent') || '',
    contactSubmitted: false,

    chats: [],
    profilesByUid: {},
    memberStatesByChat: {},

    activeChatId: null,
    activeContactUid: null,
    activeMessages: [],
    activeChatSearchOpen: false,
    activeChatSearchQuery: '',
    contactInfoOpen: false,

    sidebarSearch: '',
    sidebarFilter: 'all', // 'all' | 'unread'

    modal: null, // null | 'new-chat' | 'profile'
    usernameSearchQuery: '',
    usernameSearchResults: [],
    usernameSearchLoading: false,
    usernameSearchError: '',

    onboardingUsername: '',
    onboardingCheckStatus: 'idle', // 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
    onboardingError: '',
    onboardingSubmitting: false,

    emojiOpen: false,
    toastMessage: '',
    authError: '',
  };

  let unsubChats = null;
  const unsubProfiles = {};
  const unsubMemberStates = {};
  let unsubMessages = null;
  let typingTimer = null;
  let isCurrentlyTyping = false;
  let searchDebounce = null;
  let onboardingDebounce = null;
  let toastTimer = null;

  function applyTheme(theme) {
    state.theme = theme;
    localStorage.setItem('baatcheet_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  applyTheme(state.theme);

  function showToast(msg) {
    state.toastMessage = msg;
    const toastEl = document.getElementById('toast-container');
    if (toastEl) {
      toastEl.innerHTML = `<div class="px-4 py-2.5 rounded-xl bg-[#111b21] dark:bg-[#233138] text-white text-sm font-medium shadow-lg">${escapeHtml(msg)}</div>`;
      toastEl.classList.remove('hidden');
    }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      state.toastMessage = '';
      const el = document.getElementById('toast-container');
      if (el) el.classList.add('hidden');
    }, 2600);
  }

  function cleanupAllListeners() {
    if (unsubChats) {
      unsubChats();
      unsubChats = null;
    }
    if (unsubMessages) {
      unsubMessages();
      unsubMessages = null;
    }
    Object.keys(unsubProfiles).forEach((uid) => {
      unsubProfiles[uid]();
      delete unsubProfiles[uid];
    });
    Object.keys(unsubMemberStates).forEach((cid) => {
      unsubMemberStates[cid]();
      delete unsubMemberStates[cid];
    });
    state.chats = [];
    state.profilesByUid = {};
    state.memberStatesByChat = {};
    state.activeChatId = null;
    state.activeContactUid = null;
    state.activeMessages = [];
  }

  function subscribeProfile(uid) {
    if (!uid || unsubProfiles[uid]) return;
    const path = `publicProfiles/${uid}`;
    unsubProfiles[uid] = onSnapshot(
      doc(db, 'publicProfiles', uid),
      (snap) => {
        if (snap.exists()) {
          state.profilesByUid[uid] = snap.data();
          updateReactiveViews();
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, path)
    );
  }

  function subscribeMemberStates(chatId) {
    if (!chatId || unsubMemberStates[chatId]) return;
    const path = `chats/${chatId}/memberStates`;
    unsubMemberStates[chatId] = onSnapshot(
      collection(db, 'chats', chatId, 'memberStates'),
      (snap) => {
        const map = {};
        snap.forEach((d) => {
          map[d.id] = d.data();
        });
        state.memberStatesByChat[chatId] = map;
        updateReactiveViews();
      },
      (err) => handleFirestoreError(err, OperationType.LIST, path)
    );
  }

  function startChatsListener(myUid) {
    if (unsubChats) unsubChats();
    const path = 'chats';
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', myUid),
      limit(50)
    );

    unsubChats = onSnapshot(
      q,
      (snap) => {
        const list = [];
        snap.forEach((d) => list.push(d.data()));
        list.sort((a, b) => {
          const ta = toDate(a.lastMessageAt)?.getTime() || 0;
          const tb = toDate(b.lastMessageAt)?.getTime() || 0;
          return tb - ta;
        });
        state.chats = list;

        list.forEach((chat) => {
          const otherUid = chat.participants.find((id) => id !== myUid);
          if (otherUid) subscribeProfile(otherUid);
          subscribeMemberStates(chat.chatId);
        });

        // If active chat just got created on Firestore, attach messages listener
        if (
          state.activeChatId &&
          !unsubMessages &&
          list.some((c) => c.chatId === state.activeChatId)
        ) {
          attachMessagesListener(state.activeChatId);
        }

        updateReactiveViews();
      },
      (err) => handleFirestoreError(err, OperationType.LIST, path)
    );
  }

  function attachMessagesListener(chatId) {
    if (unsubMessages) {
      unsubMessages();
      unsubMessages = null;
    }
    if (!chatId) return;
    const chatExists = state.chats.some((c) => c.chatId === chatId);
    if (!chatExists) {
      state.activeMessages = [];
      renderMessagesList();
      return;
    }

    const path = `chats/${chatId}/messages`;
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    unsubMessages = onSnapshot(
      q,
      (snap) => {
        const msgs = [];
        snap.forEach((d) => msgs.push(d.data()));
        state.activeMessages = msgs;
        renderMessagesList(true);
        markActiveChatRead(chatId, msgs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, path)
    );
  }

  async function markActiveChatRead(chatId, msgs) {
    const myUid = state.authUser?.uid;
    if (!myUid || !chatId || state.activeChatId !== chatId) return;
    if (document.visibilityState !== 'visible') return;

    const unreadIncoming = msgs.filter(
      (m) => m.senderId !== myUid && m.status === 'sent'
    );
    const myState = state.memberStatesByChat[chatId]?.[myUid];
    const hasUnreadCount = myState && myState.unreadCount > 0;

    if (unreadIncoming.length === 0 && !hasUnreadCount) return;

    try {
      const batch = writeBatch(db);
      unreadIncoming.slice(0, 50).forEach((m) => {
        batch.update(doc(db, 'chats', chatId, 'messages', m.messageId), {
          status: 'read',
          readAt: serverTimestamp(),
        });
      });
      if (myState) {
        batch.update(doc(db, 'chats', chatId, 'memberStates', myUid), {
          unreadCount: 0,
          lastReadAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}/messages`);
    }
  }

  async function setOnlinePresence(isOnline) {
    const myUid = state.authUser?.uid;
    if (!myUid || state.needsOnboarding || !state.myProfile) return;
    try {
      await updateDoc(doc(db, 'publicProfiles', myUid), {
        isOnline: Boolean(isOnline),
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Presence updates are best-effort during unload/visibility transitions
    }
  }

  async function setTypingState(isTyping) {
    const myUid = state.authUser?.uid;
    const chatId = state.activeChatId;
    if (!myUid || !chatId) return;
    if (!state.chats.some((c) => c.chatId === chatId)) return;
    if (isCurrentlyTyping === isTyping) return;
    isCurrentlyTyping = isTyping;

    try {
      await updateDoc(doc(db, 'chats', chatId, 'memberStates', myUid), {
        isTyping: Boolean(isTyping),
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Typing indicator failure shouldn't interrupt composing
    }
  }

  function handleComposerInput() {
    const textarea = document.getElementById('message-composer');
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 128) + 'px';

    if (textarea.value.trim().length > 0) {
      setTypingState(true);
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => setTypingState(false), 2200);
    } else {
      clearTimeout(typingTimer);
      setTypingState(false);
    }
  }

  async function handleSendMessage(e) {
    if (e) e.preventDefault();
    const textarea = document.getElementById('message-composer');
    if (!textarea) return;
    const rawText = textarea.value.trim();
    if (!rawText) return;

    const text = rawText.slice(0, LIMITS.MESSAGE_MAX);
    const myUid = state.authUser?.uid;
    const otherUid = state.activeContactUid;
    const chatId = state.activeChatId;
    if (!myUid || !otherUid || !chatId) return;

    textarea.value = '';
    textarea.style.height = 'auto';
    state.emojiOpen = false;
    updateEmojiPopover();
    clearTimeout(typingTimer);
    isCurrentlyTyping = false;

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const preview = text.slice(0, LIMITS.PREVIEW_MAX);
    const chatExists = state.chats.some((c) => c.chatId === chatId);

    try {
      const batch = writeBatch(db);
      if (!chatExists) {
        const sortedParticipants = [myUid, otherUid].sort();
        batch.set(doc(db, 'chats', chatId), {
          chatId,
          participants: sortedParticipants,
          createdBy: myUid,
          lastMessageText: preview,
          lastMessageSenderId: myUid,
          lastMessageAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'chats', chatId, 'memberStates', myUid), {
          uid: myUid,
          chatId,
          isTyping: false,
          unreadCount: 0,
          lastReadAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'chats', chatId, 'memberStates', otherUid), {
          uid: otherUid,
          chatId,
          isTyping: false,
          unreadCount: 1,
          lastReadAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.update(doc(db, 'chats', chatId), {
          lastMessageText: preview,
          lastMessageSenderId: myUid,
          lastMessageAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.update(doc(db, 'chats', chatId, 'memberStates', myUid), {
          isTyping: false,
          unreadCount: 0,
          lastReadAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.update(doc(db, 'chats', chatId, 'memberStates', otherUid), {
          unreadCount: increment(1),
          updatedAt: serverTimestamp(),
        });
      }

      batch.set(doc(db, 'chats', chatId, 'messages', messageId), {
        messageId,
        chatId,
        senderId: myUid,
        text,
        status: 'sent',
        isDeleted: false,
        createdAt: serverTimestamp(),
      });

      await batch.commit();
      textarea.focus();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `chats/${chatId}/messages/${messageId}`);
    }
  }

  async function handleDeleteMessage(messageId) {
    const chatId = state.activeChatId;
    if (!chatId || !messageId) return;
    try {
      await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
        text: 'This message was deleted',
        isDeleted: true,
        editedAt: serverTimestamp(),
      });
      showToast('Message deleted');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}/messages/${messageId}`);
    }
  }

  function openChatWithUser(otherUid, preloadedProfile = null) {
    const myUid = state.authUser?.uid;
    if (!myUid || !otherUid || otherUid === myUid) return;

    if (state.activeChatId) {
      setTypingState(false);
    }

    if (preloadedProfile) {
      state.profilesByUid[otherUid] = {
        ...state.profilesByUid[otherUid],
        ...preloadedProfile,
      };
    }

    subscribeProfile(otherUid);
    const chatId = getDirectChatId(myUid, otherUid);
    state.activeChatId = chatId;
    state.activeContactUid = otherUid;
    state.activeChatSearchOpen = false;
    state.activeChatSearchQuery = '';
    state.contactInfoOpen = false;
    state.modal = null;

    renderWorkspace();
    attachMessagesListener(chatId);

    setTimeout(() => {
      const composer = document.getElementById('message-composer');
      if (composer) composer.focus();
    }, 60);
  }

  async function searchUsernames(rawQuery) {
    const myUid = state.authUser?.uid;
    if (!myUid) return;

    const clean = normalizeUsername(rawQuery);
    const rawLower = String(rawQuery || '').trim().toLowerCase();
    state.usernameSearchLoading = true;
    state.usernameSearchError = '';
    renderModalContent();

    try {
      const resultsMap = new Map();

      if (clean.length > 0 && USERNAME_REGEX.test(clean)) {
        const exactSnap = await getDoc(doc(db, 'usernames', clean));
        if (exactSnap.exists()) {
          const data = exactSnap.data();
          if (data.uid !== myUid && data.isDiscoverable !== false) {
            resultsMap.set(data.uid, data);
          }
        }
      }

      const listSnap = await getDocs(
        query(
          collection(db, 'usernames'),
          where('isDiscoverable', '==', true),
          limit(20)
        )
      );
      listSnap.forEach((d) => {
        const data = d.data();
        if (data.uid === myUid) return;
        if (!clean && !rawLower) {
          resultsMap.set(data.uid, data);
          return;
        }
        const matchesUsername = clean && String(data.username || '').includes(clean);
        const matchesDisplay = rawLower && String(data.displayName || '').toLowerCase().includes(rawLower);
        if (matchesUsername || matchesDisplay) {
          resultsMap.set(data.uid, data);
        }
      });

      state.usernameSearchResults = Array.from(resultsMap.values());
      state.usernameSearchLoading = false;
      renderModalContent();
    } catch (err) {
      state.usernameSearchLoading = false;
      state.usernameSearchError = 'Could not search usernames right now.';
      renderModalContent();
      handleFirestoreError(err, OperationType.LIST, 'usernames');
    }
  }

  async function checkUsernameAvailability(candidate) {
    const clean = normalizeUsername(candidate);
    if (!USERNAME_REGEX.test(clean)) {
      state.onboardingCheckStatus = clean.length > 0 ? 'invalid' : 'idle';
      updateUsernameCheckUI();
      return;
    }

    state.onboardingCheckStatus = 'checking';
    updateUsernameCheckUI();

    try {
      const snap = await getDoc(doc(db, 'usernames', clean));
      if (snap.exists() && snap.data().uid !== state.authUser?.uid) {
        state.onboardingCheckStatus = 'taken';
      } else {
        state.onboardingCheckStatus = 'available';
      }
      updateUsernameCheckUI();
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `usernames/${clean}`);
    }
  }

  async function handleCompleteOnboarding(e) {
    e.preventDefault();
    const user = state.authUser;
    if (!user) return;

    const usernameInput = document.getElementById('onboarding-username');
    const displayInput = document.getElementById('onboarding-displayname');
    const aboutInput = document.getElementById('onboarding-about');

    const username = normalizeUsername(usernameInput?.value);
    const displayName = String(displayInput?.value || '').trim().slice(0, LIMITS.DISPLAY_NAME_MAX);
    const about = String(aboutInput?.value || 'Hey there! I am using Baatcheet.').trim().slice(0, LIMITS.ABOUT_MAX);

    if (!USERNAME_REGEX.test(username)) {
      state.onboardingError = 'Username must be 3–20 lowercase letters, numbers, or underscores.';
      renderApp();
      return;
    }
    if (!displayName) {
      state.onboardingError = 'Display name is required.';
      renderApp();
      return;
    }

    state.onboardingSubmitting = true;
    state.onboardingError = '';
    renderApp();

    const photoURL = (user.photoURL || '').slice(0, LIMITS.PHOTO_URL_MAX);

    try {
      await runTransaction(db, async (tx) => {
        const usernameRef = doc(db, 'usernames', username);
        const existingUsername = await tx.get(usernameRef);
        if (existingUsername.exists() && existingUsername.data().uid !== user.uid) {
          throw new Error('USERNAME_TAKEN');
        }

        const now = serverTimestamp();
        tx.set(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email || '',
          username,
          displayName,
          photoURL,
          about,
          createdAt: now,
          updatedAt: now,
        });

        tx.set(doc(db, 'publicProfiles', user.uid), {
          uid: user.uid,
          username,
          displayName,
          photoURL,
          about,
          isOnline: true,
          isDiscoverable: true,
          lastSeen: now,
          createdAt: now,
          updatedAt: now,
        });

        tx.set(usernameRef, {
          uid: user.uid,
          username,
          displayName,
          photoURL,
          about,
          isDiscoverable: true,
          createdAt: now,
          updatedAt: now,
        });
      });

      const userSnap = await getDoc(doc(db, 'users', user.uid));
      state.myProfile = userSnap.data();
      state.needsOnboarding = false;
      state.pendingDisplayName = '';
      state.onboardingSubmitting = false;
      renderApp();
      startChatsListener(user.uid);
    } catch (err) {
      state.onboardingSubmitting = false;
      if (err instanceof Error && err.message === 'USERNAME_TAKEN') {
        state.onboardingError = `The handle @${username} was just claimed. Please pick another.`;
        state.onboardingCheckStatus = 'taken';
        renderApp();
        return;
      }
      state.onboardingError = 'Failed to save your profile. Please try again.';
      renderApp();
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    const user = state.authUser;
    const oldProfile = state.myProfile;
    if (!user || !oldProfile) return;

    const displayInput = document.getElementById('edit-displayname');
    const aboutInput = document.getElementById('edit-about');
    const usernameInput = document.getElementById('edit-username');

    const newDisplayName = String(displayInput?.value || '').trim().slice(0, LIMITS.DISPLAY_NAME_MAX);
    const newAbout = String(aboutInput?.value || '').trim().slice(0, LIMITS.ABOUT_MAX);
    const newUsername = normalizeUsername(usernameInput?.value || oldProfile.username);

    if (!newDisplayName) {
      showToast('Display name cannot be empty');
      return;
    }
    if (!USERNAME_REGEX.test(newUsername)) {
      showToast('Username must be 3–20 lowercase letters, numbers, or _');
      return;
    }

    try {
      await runTransaction(db, async (tx) => {
        const now = serverTimestamp();
        const usernameChanged = newUsername !== oldProfile.username;

        if (usernameChanged) {
          const newRef = doc(db, 'usernames', newUsername);
          const newSnap = await tx.get(newRef);
          if (newSnap.exists() && newSnap.data().uid !== user.uid) {
            throw new Error('USERNAME_TAKEN');
          }
          tx.delete(doc(db, 'usernames', oldProfile.username));
          tx.set(newRef, {
            uid: user.uid,
            username: newUsername,
            displayName: newDisplayName,
            photoURL: oldProfile.photoURL || '',
            about: newAbout,
            isDiscoverable: true,
            createdAt: now,
            updatedAt: now,
          });
        } else {
          tx.update(doc(db, 'usernames', oldProfile.username), {
            displayName: newDisplayName,
            about: newAbout,
            updatedAt: now,
          });
        }

        tx.update(doc(db, 'users', user.uid), {
          username: newUsername,
          displayName: newDisplayName,
          about: newAbout,
          updatedAt: now,
        });

        tx.update(doc(db, 'publicProfiles', user.uid), {
          username: newUsername,
          displayName: newDisplayName,
          about: newAbout,
          updatedAt: now,
        });
      });

      const refreshed = await getDoc(doc(db, 'users', user.uid));
      state.myProfile = refreshed.data();
      state.modal = null;
      renderApp();
      showToast('Profile updated');
    } catch (err) {
      if (err instanceof Error && err.message === 'USERNAME_TAKEN') {
        showToast(`@${newUsername} is already taken`);
        return;
      }
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  }

  function mapAuthError(err) {
    const code = err?.code || '';
    if (code === 'auth/operation-not-allowed') {
      return 'Email/Password sign-in is not enabled yet in Firebase Console (Authentication → Sign-in method → Email/Password). Google sign-in works right away.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Incorrect email or password. Please check your credentials and try again.';
    }
    if (code === 'auth/weak-password') {
      return 'Password must be at least 6 characters long.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Google sign-in popup was closed before completing.';
    }
    if (code === 'auth/unauthorized-domain') {
      const host = window.location.hostname || 'this domain';
      return `Domain "${host}" is not authorized yet in Firebase Console (Authentication → Settings → Authorized domains). Add "${host}" there to enable Google sign-in.`;
    }
    return err instanceof Error ? err.message : 'Authentication failed. Please try again.';
  }

  async function handleEmailAuthSubmit(e) {
    e.preventDefault();
    const emailInput = document.getElementById('auth-email');
    const passInput = document.getElementById('auth-password');
    const nameInput = document.getElementById('auth-name');

    const email = String(emailInput?.value || '').trim();
    const password = String(passInput?.value || '');
    const displayName = String(nameInput?.value || '').trim().slice(0, LIMITS.DISPLAY_NAME_MAX);

    state.authError = '';
    state.authSuccessMessage = '';

    if (!email) {
      state.authError = 'Please enter your email address.';
      renderApp();
      return;
    }

    if (state.authMode === 'forgot') {
      state.authSubmitting = true;
      renderApp();
      try {
        await sendPasswordResetEmail(auth, email);
        state.authSubmitting = false;
        state.authSuccessMessage = `Password reset link sent to ${email}. Check your inbox.`;
        state.authMode = 'signin';
        renderApp();
      } catch (err) {
        state.authSubmitting = false;
        state.authError = mapAuthError(err);
        renderApp();
      }
      return;
    }

    if (password.length < 6) {
      state.authError = 'Password must be at least 6 characters.';
      renderApp();
      return;
    }

    state.authSubmitting = true;
    renderApp();

    try {
      if (state.authMode === 'signup') {
        state.pendingDisplayName = displayName;
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(cred.user, { displayName });
          const displayInput = document.getElementById('onboarding-displayname');
          if (displayInput && !displayInput.value.trim()) {
            displayInput.value = displayName;
          }
        }
        state.authSubmitting = false;
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        state.authSubmitting = false;
      }
    } catch (err) {
      state.pendingDisplayName = '';
      state.authSubmitting = false;
      state.authError = mapAuthError(err);
      renderApp();
    }
  }

  async function handleGoogleSignIn() {
    state.authError = '';
    state.authSuccessMessage = '';
    const btn = document.getElementById('google-signin-btn');
    if (btn) btn.disabled = true;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (btn) btn.disabled = false;
      state.authError = mapAuthError(err);
      renderApp();
    }
  }

  async function handleSignOut() {
    await setOnlinePresence(false);
    cleanupAllListeners();
    state.myProfile = null;
    state.needsOnboarding = false;
    state.pendingDisplayName = '';
    state.viewingPublicDocs = false;
    await signOut(auth);
  }

  // Targeted DOM updaters so active inputs never lose focus
  function updateReactiveViews() {
    if (!state.authReady || !state.authUser || state.needsOnboarding) return;
    renderSidebarList();
    renderChatHeader();
    renderTypingIndicator();
    if (state.contactInfoOpen) renderContactDrawer();
  }

  function updateUsernameCheckUI() {
    const statusEl = document.getElementById('onboarding-username-status');
    if (!statusEl) return;
    const map = {
      idle: '<span class="text-xs text-[#667781] dark:text-[#8696a0]">Lowercase letters, numbers, and underscores (3–20 chars)</span>',
      checking: '<span class="text-xs text-[#667781] dark:text-[#8696a0]">Checking availability...</span>',
      available: '<span class="text-xs font-medium text-[#008069] dark:text-[#00a884]">Username is available</span>',
      taken: '<span class="text-xs font-medium text-rose-600 dark:text-rose-400">This username is already taken</span>',
      invalid: '<span class="text-xs font-medium text-amber-600 dark:text-amber-400">Use 3–20 lowercase letters, numbers, or _</span>',
    };
    statusEl.innerHTML = map[state.onboardingCheckStatus] || map.idle;
  }

  function renderSidebarList() {
    const container = document.getElementById('sidebar-chat-list');
    if (!container) return;

    const myUid = state.authUser?.uid;
    const filterText = state.sidebarSearch.trim().toLowerCase();

    const filteredChats = state.chats.filter((chat) => {
      const otherUid = chat.participants.find((id) => id !== myUid);
      const profile = state.profilesByUid[otherUid];
      const myMemberState = state.memberStatesByChat[chat.chatId]?.[myUid];
      const unreadCount = myMemberState?.unreadCount || 0;

      if (state.sidebarFilter === 'unread' && unreadCount === 0) return false;
      if (!filterText) return true;

      const haystack = `${profile?.displayName || ''} ${profile?.username || ''} ${chat.lastMessageText || ''}`.toLowerCase();
      return haystack.includes(filterText);
    });

    if (filteredChats.length === 0) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center text-center px-6 py-16">
          <div class="w-14 h-14 rounded-full bg-[#e9edef] dark:bg-[#202c33] text-[#008069] dark:text-[#00a884] flex items-center justify-center mb-4">
            ${icons.userPlus}
          </div>
          <p class="text-sm font-medium text-[#111b21] dark:text-[#e9edef]">
            ${state.chats.length === 0 ? 'No conversations yet' : 'No matching chats'}
          </p>
          <p class="text-xs text-[#667781] dark:text-[#8696a0] mt-1.5 max-w-[240px] leading-relaxed">
            ${
              state.chats.length === 0
                ? 'Search anyone by their unique @username to start messaging in real time.'
                : 'Try a different name, @username, or switch back to All chats.'
            }
          </p>
          ${
            state.chats.length === 0
              ? `<button type="button" data-action="open-new-chat"
                   class="mt-5 px-4 py-2.5 rounded-xl bg-[#008069] hover:bg-[#017561] dark:bg-[#00a884] dark:hover:bg-[#06cf9c] dark:text-[#111b21] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0">
                   Find by @username
                 </button>`
              : ''
          }
        </div>
      `;
      return;
    }

    container.innerHTML = filteredChats
      .map((chat) => {
        const otherUid = chat.participants.find((id) => id !== myUid);
        const profile = state.profilesByUid[otherUid] || {
          uid: otherUid,
          displayName: 'Loading...',
          username: 'user',
        };
        const memberStates = state.memberStatesByChat[chat.chatId] || {};
        const myState = memberStates[myUid];
        const otherState = memberStates[otherUid];
        const unread = myState?.unreadCount || 0;
        const isTyping = otherState?.isTyping === true;
        const isActive = state.activeChatId === chat.chatId;
        const isOutgoing = chat.lastMessageSenderId === myUid;

        return `
          <button
            type="button"
            data-action="select-chat"
            data-uid="${escapeHtml(otherUid)}"
            class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-[#f0f2f5] dark:border-[#202c33] cursor-pointer min-h-[68px] ${
              isActive
                ? 'bg-[#f0f2f5] dark:bg-[#2a3942]'
                : 'hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]'
            }"
          >
            ${renderAvatar(profile, 'w-12 h-12', 'text-sm', true)}
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline justify-between gap-2">
                <div class="flex items-baseline gap-1.5 min-w-0">
                  <span class="font-medium text-[15px] text-[#111b21] dark:text-[#e9edef] truncate">
                    ${escapeHtml(profile.displayName || profile.username)}
                  </span>
                  <span class="text-xs text-[#667781] dark:text-[#8696a0] truncate shrink-0">
                    @${escapeHtml(profile.username || '')}
                  </span>
                </div>
                <span class="text-[11px] tabular-nums shrink-0 ${
                  unread > 0
                    ? 'text-[#008069] dark:text-[#00a884] font-semibold'
                    : 'text-[#667781] dark:text-[#8696a0]'
                }">
                  ${escapeHtml(formatSidebarDate(chat.lastMessageAt))}
                </span>
              </div>
              <div class="flex items-center justify-between gap-2 mt-0.5">
                <p class="text-[13px] truncate flex items-center gap-1 ${
                  isTyping
                    ? 'text-[#008069] dark:text-[#00a884] font-medium'
                    : unread > 0
                      ? 'text-[#111b21] dark:text-[#e9edef] font-medium'
                      : 'text-[#667781] dark:text-[#8696a0]'
                }">
                  ${
                    isTyping
                      ? 'typing...'
                      : `${
                          isOutgoing
                            ? `<span class="text-[#667781] dark:text-[#8696a0] inline-flex items-center">${icons.checkDouble}</span>`
                            : ''
                        }<span class="truncate">${escapeHtml(chat.lastMessageText || '')}</span>`
                  }
                </p>
                ${
                  unread > 0
                    ? `<span class="min-w-[20px] h-5 px-1.5 rounded-full bg-[#00a884] text-white dark:text-[#111b21] text-[11px] font-bold tabular-nums flex items-center justify-center shrink-0">${unread > 99 ? '99+' : unread}</span>`
                    : ''
                }
              </div>
            </div>
          </button>
        `;
      })
      .join('');
  }

  function renderChatHeader() {
    const header = document.getElementById('active-chat-header');
    if (!header || !state.activeChatId) return;

    const profile = state.profilesByUid[state.activeContactUid];
    const otherState = state.memberStatesByChat[state.activeChatId]?.[state.activeContactUid];
    const isTyping = otherState?.isTyping === true;

    header.innerHTML = `
      <div class="flex items-center justify-between gap-3 px-3 sm:px-4 h-[60px] bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#2a3942] shrink-0">
        <div class="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            data-action="close-mobile-chat"
            aria-label="Back to chats"
            class="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#54656f] dark:text-[#aebac1] cursor-pointer shrink-0"
          >
            ${icons.back}
          </button>
          <button
            type="button"
            data-action="toggle-contact-info"
            class="flex items-center gap-3 min-w-0 text-left cursor-pointer rounded-xl py-1 pr-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            ${renderAvatar(profile, 'w-10 h-10', 'text-xs', true)}
            <div class="min-w-0">
              <div class="flex items-baseline gap-1.5 min-w-0">
                <h2 class="text-[15px] font-semibold text-[#111b21] dark:text-[#e9edef] truncate">
                  ${escapeHtml(profile?.displayName || 'Chat')}
                </h2>
                ${
                  profile?.username
                    ? `<span class="text-xs text-[#667781] dark:text-[#8696a0] truncate shrink-0">@${escapeHtml(profile.username)}</span>`
                    : ''
                }
              </div>
              <p class="text-xs truncate ${
                isTyping
                  ? 'text-[#008069] dark:text-[#00a884] font-medium'
                  : 'text-[#667781] dark:text-[#8696a0]'
              }">
                ${isTyping ? 'typing...' : escapeHtml(formatLastSeen(profile))}
              </p>
            </div>
          </button>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <button
            type="button"
            data-action="toggle-chat-search"
            title="Search in conversation"
            aria-label="Search in conversation"
            class="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#54656f] dark:text-[#aebac1] cursor-pointer ${
              state.activeChatSearchOpen ? 'bg-black/10 dark:bg-white/15' : ''
            }"
          >
            ${icons.search}
          </button>
          <button
            type="button"
            data-action="toggle-contact-info"
            title="Contact info"
            aria-label="Contact info"
            class="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#54656f] dark:text-[#aebac1] cursor-pointer ${
              state.contactInfoOpen ? 'bg-black/10 dark:bg-white/15' : ''
            }"
          >
            ${icons.info}
          </button>
        </div>
      </div>
      ${
        state.activeChatSearchOpen
          ? `<div class="px-4 py-2 bg-white dark:bg-[#111b21] border-b border-[#e9edef] dark:border-[#2a3942] flex items-center gap-2">
               <span class="text-[#667781] dark:text-[#8696a0]">${icons.search}</span>
               <input
                 id="in-chat-search-input"
                 type="text"
                 value="${escapeHtml(state.activeChatSearchQuery)}"
                 placeholder="Search messages in this chat..."
                 class="flex-1 bg-transparent text-sm text-[#111b21] dark:text-[#e9edef] placeholder:text-[#667781] focus:outline-none"
               />
               <button type="button" data-action="clear-chat-search" class="text-xs font-medium text-[#008069] dark:text-[#00a884] px-2 py-1 cursor-pointer">
                 Close
               </button>
             </div>`
          : ''
      }
    `;
  }

  function renderMessagesList(scrollToBottom = false) {
    const container = document.getElementById('messages-viewport');
    if (!container) return;

    const myUid = state.authUser?.uid;
    const chatExists = state.chats.some((c) => c.chatId === state.activeChatId);
    const searchTerm = state.activeChatSearchQuery.trim().toLowerCase();
    const otherProfile = state.profilesByUid[state.activeContactUid];

    if (!chatExists || state.activeMessages.length === 0) {
      container.innerHTML = `
        <div class="h-full flex flex-col items-center justify-center text-center px-6 py-10">
          <div class="max-w-sm rounded-2xl bg-white/90 dark:bg-[#202c33]/95 px-6 py-5 shadow-sm border border-black/5 dark:border-white/5">
            <p class="text-sm font-semibold text-[#111b21] dark:text-[#e9edef]">
              Start chatting with ${escapeHtml(otherProfile?.displayName || '@' + (otherProfile?.username || 'user'))}
            </p>
            <p class="text-xs text-[#667781] dark:text-[#8696a0] mt-1.5 leading-relaxed">
              Messages are synced in real time via Firebase Firestore. Say hello below!
            </p>
          </div>
        </div>
      `;
      return;
    }

    const filtered = searchTerm
      ? state.activeMessages.filter((m) => m.text.toLowerCase().includes(searchTerm))
      : state.activeMessages;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="h-full flex items-center justify-center text-sm text-[#667781] dark:text-[#8696a0]">
          No messages match "${escapeHtml(state.activeChatSearchQuery)}"
        </div>
      `;
      return;
    }

    let lastDay = '';
    let lastSender = '';
    const htmlParts = [];

    filtered.forEach((msg) => {
      const dayLabel = formatDayDivider(msg.createdAt);
      if (dayLabel !== lastDay) {
        lastDay = dayLabel;
        lastSender = '';
        htmlParts.push(`
          <div class="flex justify-center my-3">
            <span class="px-3 py-1 rounded-lg bg-white/95 dark:bg-[#182229] text-[12px] font-medium text-[#54656f] dark:text-[#8696a0] shadow-xs">
              ${escapeHtml(dayLabel)}
            </span>
          </div>
        `);
      }

      const isMine = msg.senderId === myUid;
      const isFirstInGroup = msg.senderId !== lastSender;
      lastSender = msg.senderId;

      const bubbleColors = isMine
        ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef]'
        : 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef]';

      const tailClass = isFirstInGroup
        ? isMine
          ? 'bubble-tail-out mt-1.5'
          : 'bubble-tail-in mt-1.5'
        : 'mt-0.5';

      const tickColor =
        msg.status === 'read'
          ? 'text-[#53bdeb]'
          : 'text-[#667781] dark:text-[#8696a0]';

      htmlParts.push(`
        <div class="flex ${isMine ? 'justify-end' : 'justify-start'} group px-2 sm:px-6">
          <div class="relative max-w-[85%] sm:max-w-[68%] lg:max-w-[58%] rounded-xl px-3 py-1.5 shadow-xs ${bubbleColors} ${tailClass}">
            ${
              !msg.isDeleted
                ? `<div class="hidden group-hover:flex items-center gap-1 absolute -top-3 ${isMine ? 'left-2' : 'right-2'} bg-white dark:bg-[#233138] border border-black/10 dark:border-white/10 rounded-lg px-1.5 py-0.5 shadow-sm z-10">
                     <button type="button" data-action="copy-msg" data-text="${escapeHtml(msg.text)}" title="Copy message" class="p-1 text-[#54656f] dark:text-[#aebac1] hover:text-[#111b21] dark:hover:text-white cursor-pointer">${icons.copy}</button>
                     ${
                       isMine
                         ? `<button type="button" data-action="delete-msg" data-id="${escapeHtml(msg.messageId)}" title="Delete for everyone" class="p-1 text-rose-600 dark:text-rose-400 hover:opacity-80 cursor-pointer">${icons.trash}</button>`
                         : ''
                     }
                   </div>`
                : ''
            }
            <div class="flex flex-wrap items-end gap-x-2.5 gap-y-0.5">
              <div class="text-[14.5px] leading-[1.45] whitespace-pre-wrap break-words ${
                msg.isDeleted ? 'italic text-[#667781] dark:text-[#8696a0]' : ''
              }">${msg.isDeleted ? 'This message was deleted' : linkifySafeText(msg.text)}</div>
              <div class="flex items-center gap-1 ml-auto shrink-0 translate-y-[2px]">
                <span class="text-[11px] tabular-nums text-[#667781] dark:text-[#8696a0]/90">
                  ${escapeHtml(formatTime(msg.createdAt) || 'Sending')}
                </span>
                ${
                  isMine && !msg.isDeleted
                    ? `<span title="${msg.status === 'read' ? 'Read' : 'Delivered'}" class="${tickColor}">${icons.checkDouble}</span>`
                    : ''
                }
              </div>
            </div>
          </div>
        </div>
      `);
    });

    container.innerHTML = `<div class="py-3 space-y-0.5">${htmlParts.join('')}</div>`;
    if (scrollToBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }

  function renderTypingIndicator() {
    const bar = document.getElementById('typing-indicator-slot');
    if (!bar || !state.activeChatId) return;
    const otherState = state.memberStatesByChat[state.activeChatId]?.[state.activeContactUid];
    if (otherState?.isTyping) {
      bar.innerHTML = `
        <div class="px-4 sm:px-8 pb-2 flex justify-start">
          <div class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#202c33] shadow-xs">
            <span class="w-1.5 h-1.5 rounded-full bg-[#667781] dark:bg-[#8696a0] typing-dot"></span>
            <span class="w-1.5 h-1.5 rounded-full bg-[#667781] dark:bg-[#8696a0] typing-dot"></span>
            <span class="w-1.5 h-1.5 rounded-full bg-[#667781] dark:bg-[#8696a0] typing-dot"></span>
          </div>
        </div>
      `;
    } else {
      bar.innerHTML = '';
    }
  }

  function updateEmojiPopover() {
    const pop = document.getElementById('emoji-popover');
    if (!pop) return;
    if (!state.emojiOpen) {
      pop.classList.add('hidden');
      return;
    }
    pop.classList.remove('hidden');
    pop.innerHTML = `
      <div class="grid grid-cols-6 gap-1 p-2.5 bg-white dark:bg-[#233138] rounded-2xl shadow-xl border border-black/10 dark:border-white/10 w-[264px]">
        ${EMOJI_LIST.map(
          (em) => `
            <button type="button" data-action="insert-emoji" data-emoji="${em}"
              class="w-10 h-10 rounded-xl hover:bg-[#f0f2f5] dark:hover:bg-[#2a3942] text-xl flex items-center justify-center cursor-pointer transition-transform active:scale-90">
              ${em}
            </button>
          `
        ).join('')}
      </div>
    `;
  }

  function renderContactDrawer() {
    const drawer = document.getElementById('contact-info-drawer');
    if (!drawer) return;
    if (!state.contactInfoOpen || !state.activeContactUid) {
      drawer.classList.add('hidden');
      return;
    }
    const profile = state.profilesByUid[state.activeContactUid];
    drawer.classList.remove('hidden');
    drawer.innerHTML = `
      <div class="h-full flex flex-col bg-[#f0f2f5] dark:bg-[#111b21] border-l border-[#e9edef] dark:border-[#2a3942]">
        <div class="h-[60px] px-4 flex items-center gap-3 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#2a3942] shrink-0">
          <button type="button" data-action="toggle-contact-info" aria-label="Close contact info"
            class="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#54656f] dark:text-[#aebac1] cursor-pointer">
            ${icons.close}
          </button>
          <h3 class="text-[15px] font-semibold text-[#111b21] dark:text-[#e9edef]">Contact info</h3>
        </div>
        <div class="flex-1 overflow-y-auto wa-scroll p-6 space-y-5">
          <div class="flex flex-col items-center text-center bg-white dark:bg-[#202c33] rounded-2xl p-6 shadow-xs">
            ${renderAvatar(profile, 'w-28 h-28', 'text-2xl', true)}
            <h4 class="mt-4 text-lg font-semibold text-[#111b21] dark:text-[#e9edef]">
              ${escapeHtml(profile?.displayName || 'User')}
            </h4>
            <div class="mt-1 flex items-center gap-2">
              <span class="text-sm text-[#008069] dark:text-[#00a884] font-medium">@${escapeHtml(profile?.username || '')}</span>
              <button type="button" data-action="copy-text" data-text="@${escapeHtml(profile?.username || '')}" title="Copy username"
                class="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#667781] dark:text-[#8696a0] cursor-pointer">
                ${icons.copy}
              </button>
            </div>
            <p class="mt-2 text-xs text-[#667781] dark:text-[#8696a0]">
              ${escapeHtml(formatLastSeen(profile))}
            </p>
          </div>
          <div class="bg-white dark:bg-[#202c33] rounded-2xl p-5 shadow-xs">
            <p class="text-xs font-medium text-[#667781] dark:text-[#8696a0] mb-1.5">About</p>
            <p class="text-sm text-[#111b21] dark:text-[#e9edef] leading-relaxed">
              ${escapeHtml(profile?.about || 'Hey there! I am using Baatcheet.')}
            </p>
          </div>
        </div>
      </div>
    `;
  }

  function renderModalContent() {
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;
    if (!state.modal) {
      modalRoot.innerHTML = '';
      modalRoot.classList.add('hidden');
      return;
    }

    modalRoot.classList.remove('hidden');

    if (state.modal === 'new-chat') {
      const existingResultsEl = document.getElementById('new-chat-results');
      if (existingResultsEl) {
        existingResultsEl.innerHTML = buildNewChatResultsHtml();
        return;
      }

      modalRoot.innerHTML = `
        <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4" data-action="close-modal-backdrop">
          <div class="w-full max-w-md bg-white dark:bg-[#202c33] rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden flex flex-col max-h-[82dvh]">
            <div class="flex items-center justify-between px-5 py-4 bg-[#008069] dark:bg-[#202c33] text-white border-b border-transparent dark:border-[#2a3942]">
              <div>
                <h3 class="text-base font-semibold">New chat</h3>
                <p class="text-xs text-white/80 dark:text-[#8696a0]">Search users by their @username</p>
              </div>
              <button type="button" data-action="close-modal" aria-label="Close modal"
                class="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-white/10 cursor-pointer">
                ${icons.close}
              </button>
            </div>

            <div class="p-4 border-b border-[#e9edef] dark:border-[#2a3942] bg-[#f0f2f5] dark:bg-[#111b21]">
              <div class="flex items-center gap-2 bg-white dark:bg-[#202c33] rounded-xl px-3.5 py-2.5 border border-[#e9edef] dark:border-[#2a3942] focus-within:ring-2 focus-within:ring-[#00a884]">
                <span class="text-[#008069] dark:text-[#00a884] font-semibold text-sm">@</span>
                <input
                  id="username-search-input"
                  type="text"
                  value="${escapeHtml(state.usernameSearchQuery)}"
                  placeholder="Type a username (e.g. rohit, priya_k)..."
                  autocomplete="off"
                  class="flex-1 bg-transparent text-sm text-[#111b21] dark:text-[#e9edef] placeholder:text-[#667781] focus:outline-none"
                />
              </div>
              <div class="mt-2.5 flex items-center justify-between text-xs text-[#667781] dark:text-[#8696a0]">
                <span>Your handle: <strong class="text-[#111b21] dark:text-[#e9edef]">@${escapeHtml(state.myProfile?.username || '')}</strong></span>
                <button type="button" data-action="copy-text" data-text="@${escapeHtml(state.myProfile?.username || '')}"
                  class="inline-flex items-center gap-1 text-[#008069] dark:text-[#00a884] font-medium hover:underline cursor-pointer">
                  ${icons.copy} Copy mine
                </button>
              </div>
            </div>

            <div id="new-chat-results" class="flex-1 overflow-y-auto wa-scroll divide-y divide-[#f0f2f5] dark:divide-[#2a3942]">
              ${buildNewChatResultsHtml()}
            </div>
          </div>
        </div>
      `;

      setTimeout(() => {
        const input = document.getElementById('username-search-input');
        if (input) input.focus();
      }, 30);
    } else if (state.modal === 'profile') {
      const p = state.myProfile;
      modalRoot.innerHTML = `
        <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4" data-action="close-modal-backdrop">
          <div class="w-full max-w-md bg-white dark:bg-[#202c33] rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 bg-[#008069] dark:bg-[#202c33] text-white border-b border-transparent dark:border-[#2a3942]">
              <h3 class="text-base font-semibold">Profile & Username</h3>
              <button type="button" data-action="close-modal" aria-label="Close modal"
                class="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-white/10 cursor-pointer">
                ${icons.close}
              </button>
            </div>
            <form id="edit-profile-form" class="p-5 space-y-4">
              <div class="flex items-center gap-4">
                ${renderAvatar(p, 'w-16 h-16', 'text-lg', false)}
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-[#111b21] dark:text-[#e9edef] truncate">${escapeHtml(p?.displayName)}</p>
                  <p class="text-xs text-[#667781] dark:text-[#8696a0] truncate">${escapeHtml(p?.email || '')}</p>
                </div>
              </div>

              <div>
                <label class="block text-xs font-medium text-[#667781] dark:text-[#8696a0] mb-1">Username</label>
                <div class="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#f0f2f5] dark:bg-[#111b21] border border-[#e9edef] dark:border-[#2a3942]">
                  <span class="text-sm font-semibold text-[#008069] dark:text-[#00a884]">@</span>
                  <input id="edit-username" type="text" required maxlength="20" value="${escapeHtml(p?.username || '')}"
                    class="flex-1 bg-transparent text-sm text-[#111b21] dark:text-[#e9edef] focus:outline-none" />
                </div>
              </div>

              <div>
                <label class="block text-xs font-medium text-[#667781] dark:text-[#8696a0] mb-1">Display name</label>
                <input id="edit-displayname" type="text" required maxlength="50" value="${escapeHtml(p?.displayName || '')}"
                  class="w-full px-3 py-2.5 rounded-xl bg-[#f0f2f5] dark:bg-[#111b21] border border-[#e9edef] dark:border-[#2a3942] text-sm text-[#111b21] dark:text-[#e9edef] focus:outline-none focus:ring-2 focus:ring-[#00a884]" />
              </div>

              <div>
                <label class="block text-xs font-medium text-[#667781] dark:text-[#8696a0] mb-1">About</label>
                <input id="edit-about" type="text" maxlength="140" value="${escapeHtml(p?.about || '')}"
                  class="w-full px-3 py-2.5 rounded-xl bg-[#f0f2f5] dark:bg-[#111b21] border border-[#e9edef] dark:border-[#2a3942] text-sm text-[#111b21] dark:text-[#e9edef] focus:outline-none focus:ring-2 focus:ring-[#00a884]" />
              </div>

              <div class="flex items-center justify-end gap-2 pt-2">
                <button type="button" data-action="close-modal"
                  class="px-4 py-2 rounded-xl text-sm font-medium text-[#54656f] dark:text-[#aebac1] hover:bg-[#f0f2f5] dark:hover:bg-[#2a3942] cursor-pointer">
                  Cancel
                </button>
                <button type="submit"
                  class="px-5 py-2 rounded-xl text-sm font-semibold bg-[#008069] hover:bg-[#017561] dark:bg-[#00a884] dark:hover:bg-[#06cf9c] text-white dark:text-[#111b21] cursor-pointer">
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      `;
    }
  }

  function buildNewChatResultsHtml() {
    if (state.usernameSearchLoading) {
      return `<div class="p-8 text-center text-sm text-[#667781] dark:text-[#8696a0]">Searching directory...</div>`;
    }
    if (state.usernameSearchError) {
      return `<div class="p-8 text-center text-sm text-rose-600 dark:text-rose-400">${escapeHtml(state.usernameSearchError)}</div>`;
    }
    if (state.usernameSearchResults.length === 0) {
      return `
        <div class="p-8 text-center">
          <p class="text-sm font-medium text-[#111b21] dark:text-[#e9edef]">
            ${state.usernameSearchQuery ? `No user found for "@${escapeHtml(normalizeUsername(state.usernameSearchQuery))}"` : 'No other users registered yet'}
          </p>
          <p class="text-xs text-[#667781] dark:text-[#8696a0] mt-1">
            Share your handle <strong>@${escapeHtml(state.myProfile?.username || '')}</strong> so friends can sign in and chat with you.
          </p>
        </div>
      `;
    }

    return state.usernameSearchResults
      .map(
        (u) => `
          <button
            type="button"
            data-action="start-chat-user"
            data-uid="${escapeHtml(u.uid)}"
            class="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#f5f6f6] dark:hover:bg-[#2a3942] text-left transition-colors cursor-pointer"
          >
            ${renderAvatar(u, 'w-11 h-11', 'text-sm', false)}
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline gap-2 min-w-0">
                <span class="text-sm font-semibold text-[#111b21] dark:text-[#e9edef] truncate">
                  ${escapeHtml(u.displayName)}
                </span>
                <span class="text-xs font-medium text-[#008069] dark:text-[#00a884] shrink-0">
                  @${escapeHtml(u.username)}
                </span>
              </div>
              <p class="text-xs text-[#667781] dark:text-[#8696a0] truncate mt-0.5">
                ${escapeHtml(u.about || 'Hey there! I am using Baatcheet.')}
              </p>
            </div>
          </button>
        `
      )
      .join('');
  }

  function renderWorkspace() {
    const p = state.myProfile;
    const hasActiveChat = Boolean(state.activeChatId && state.activeContactUid);

    rootEl.innerHTML = `
      <div class="h-[100dvh] w-full flex bg-white dark:bg-[#111b21] overflow-hidden relative">
        <!-- Left Sidebar -->
        <aside class="${hasActiveChat ? 'hidden md:flex' : 'flex'} w-full md:w-[340px] lg:w-[390px] shrink-0 flex-col bg-white dark:bg-[#111b21] border-r border-[#e9edef] dark:border-[#2a3942]">
          <!-- Sidebar Top Bar -->
          <header class="h-[60px] px-3 sm:px-4 flex items-center justify-between bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#2a3942] shrink-0">
            <button type="button" data-action="open-profile" class="flex items-center gap-2.5 min-w-0 text-left rounded-xl py-1 pr-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
              ${renderAvatar(p, 'w-10 h-10', 'text-xs', false)}
              <div class="min-w-0">
                <p class="text-sm font-semibold text-[#111b21] dark:text-[#e9edef] truncate">${escapeHtml(p?.displayName || 'Account')}</p>
                <p class="text-xs text-[#008069] dark:text-[#00a884] truncate">@${escapeHtml(p?.username || '')}</p>
              </div>
            </button>

            <div class="flex items-center gap-1 shrink-0">
              <button type="button" data-action="open-new-chat" title="New chat by username (Ctrl+K)" aria-label="New chat"
                class="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#54656f] dark:text-[#aebac1] cursor-pointer">
                ${icons.newChat}
              </button>
              <button type="button" data-action="open-legal-docs" title="Privacy, Terms & Guide" aria-label="Privacy and Guide"
                class="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#54656f] dark:text-[#aebac1] cursor-pointer">
                ${icons.shield}
              </button>
              <button type="button" data-action="toggle-theme" title="Switch theme" aria-label="Switch theme"
                class="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#54656f] dark:text-[#aebac1] cursor-pointer">
                ${state.theme === 'dark' ? icons.sun : icons.moon}
              </button>
              <button type="button" data-action="sign-out" title="Sign out" aria-label="Sign out"
                class="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#54656f] dark:text-[#aebac1] cursor-pointer">
                ${icons.logout}
              </button>
            </div>
          </header>

          <!-- Search & Filter Controls -->
          <div class="px-3 py-2.5 space-y-2 border-b border-[#f0f2f5] dark:border-[#202c33]">
            <div class="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#f0f2f5] dark:bg-[#202c33] focus-within:ring-2 focus-within:ring-[#00a884]/50">
              <span class="text-[#54656f] dark:text-[#8696a0] shrink-0">${icons.search}</span>
              <input
                id="sidebar-search-input"
                type="text"
                value="${escapeHtml(state.sidebarSearch)}"
                placeholder="Search chats or @username"
                class="flex-1 bg-transparent text-sm text-[#111b21] dark:text-[#e9edef] placeholder:text-[#667781] focus:outline-none"
              />
            </div>

            <div class="flex items-center gap-1 p-1 rounded-xl bg-[#f0f2f5] dark:bg-[#202c33]">
              <button type="button" data-action="filter-chats" data-filter="all"
                class="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  state.sidebarFilter === 'all'
                    ? 'bg-white dark:bg-[#2a3942] text-[#111b21] dark:text-[#e9edef] shadow-xs'
                    : 'text-[#667781] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-[#e9edef]'
                }">
                All chats
              </button>
              <button type="button" data-action="filter-chats" data-filter="unread"
                class="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  state.sidebarFilter === 'unread'
                    ? 'bg-white dark:bg-[#2a3942] text-[#111b21] dark:text-[#e9edef] shadow-xs'
                    : 'text-[#667781] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-[#e9edef]'
                }">
                Unread
              </button>
            </div>
          </div>

          <!-- Real-Time Chat List -->
          <div id="sidebar-chat-list" class="flex-1 overflow-y-auto wa-scroll"></div>
        </aside>

        <!-- Main Chat Viewport -->
        <main class="${hasActiveChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0 chat-wallpaper relative">
          ${
            hasActiveChat
              ? `
                <div id="active-chat-header"></div>
                <div id="messages-viewport" class="flex-1 overflow-y-auto wa-scroll"></div>
                <div id="typing-indicator-slot"></div>

                <!-- Bottom Composer Bar -->
                <footer class="relative px-3 sm:px-4 py-2.5 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#e9edef] dark:border-[#2a3942] shrink-0">
                  <div id="emoji-popover" class="hidden absolute bottom-full left-3 mb-2 z-30"></div>
                  <form id="message-form" class="flex items-end gap-2">
                    <button
                      type="button"
                      data-action="toggle-emoji"
                      aria-label="Insert emoji"
                      class="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#54656f] dark:text-[#aebac1] cursor-pointer shrink-0"
                    >
                      ${icons.smile}
                    </button>
                    <textarea
                      id="message-composer"
                      rows="1"
                      maxlength="${LIMITS.MESSAGE_MAX}"
                      placeholder="Type a message"
                      class="flex-1 max-h-32 min-h-[44px] py-2.5 px-4 rounded-2xl bg-white dark:bg-[#2a3942] text-[15px] text-[#111b21] dark:text-[#e9edef] placeholder:text-[#667781] dark:placeholder:text-[#8696a0] resize-none focus:outline-none focus:ring-2 focus:ring-[#00a884]/40 leading-snug"
                    ></textarea>
                    <button
                      type="submit"
                      aria-label="Send message"
                      class="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-[#008069] hover:bg-[#017561] dark:bg-[#00a884] dark:hover:bg-[#06cf9c] text-white dark:text-[#111b21] shadow-xs transition-colors cursor-pointer shrink-0"
                    >
                      ${icons.send}
                    </button>
                  </form>
                </footer>
              `
              : `
                <div class="h-full flex flex-col items-center justify-center text-center px-6 bg-[#f0f2f5] dark:bg-[#222e35] border-b-[6px] border-[#00a884]">
                  <div class="w-20 h-20 rounded-full bg-[#008069]/10 dark:bg-[#00a884]/15 text-[#008069] dark:text-[#00a884] flex items-center justify-center mb-6">
                    ${icons.logo}
                  </div>
                  <h1 class="font-display text-2xl sm:text-3xl font-semibold text-[#111b21] dark:text-[#e9edef] tracking-tight">
                    Baatcheet Web
                  </h1>
                  <p class="mt-2.5 text-sm text-[#667781] dark:text-[#8696a0] max-w-md leading-relaxed">
                    Send and receive real-time messages with read receipts and live typing status. Search any friend by their unique @username to start a new chat.
                  </p>
                  <button type="button" data-action="open-new-chat"
                    class="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#008069] hover:bg-[#017561] dark:bg-[#00a884] dark:hover:bg-[#06cf9c] text-white dark:text-[#111b21] text-sm font-semibold shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0">
                    ${icons.userPlus}
                    <span>New chat by @username</span>
                  </button>
                  <p class="mt-6 text-xs text-[#667781] dark:text-[#8696a0]">
                    Your username: <strong class="text-[#111b21] dark:text-[#e9edef]">@${escapeHtml(p?.username || '')}</strong>
                  </p>
                </div>
              `
          }
        </main>

        <!-- Right Contact Info Drawer -->
        <aside id="contact-info-drawer" class="hidden w-full sm:w-[320px] lg:w-[350px] shrink-0 absolute md:static inset-0 z-30"></aside>

        <!-- Modals & Toast -->
        <div id="modal-root" class="hidden"></div>
        <div id="toast-container" class="hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50"></div>
      </div>
    `;

    renderSidebarList();
    if (hasActiveChat) {
      renderChatHeader();
      renderMessagesList(true);
      renderTypingIndicator();
      renderContactDrawer();
    }
    renderModalContent();
  }

  function renderOnboarding() {
    const user = state.authUser;
    const suggested = normalizeUsername(user?.email?.split('@')[0] || user?.displayName || 'user');
    const currentUsername = state.onboardingUsername || suggested;

    rootEl.innerHTML = `
      <div class="min-h-[100dvh] w-full flex items-center justify-center p-4 bg-[#eae6df] dark:bg-[#0b141a]">
        <div class="w-full max-w-md bg-white dark:bg-[#202c33] rounded-2xl shadow-xl border border-black/5 dark:border-white/10 overflow-hidden">
          <div class="px-6 py-5 bg-[#008069] dark:bg-[#202c33] text-white border-b border-transparent dark:border-[#2a3942]">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">${icons.logo}</div>
              <div>
                <h1 class="font-display text-lg font-semibold">Set up your @username</h1>
                <p class="text-xs text-white/80 dark:text-[#8696a0]">Friends will search this handle to message you</p>
              </div>
            </div>
          </div>

          <form id="onboarding-form" class="p-6 space-y-4">
            ${
              state.onboardingError
                ? `<div class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                     ${escapeHtml(state.onboardingError)}
                   </div>`
                : ''
            }

            <div>
              <label for="onboarding-username" class="block text-xs font-medium text-[#54656f] dark:text-[#aebac1] mb-1.5">
                Unique Username
              </label>
              <div class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#f0f2f5] dark:bg-[#111b21] border border-[#e9edef] dark:border-[#2a3942] focus-within:ring-2 focus-within:ring-[#00a884]">
                <span class="text-sm font-semibold text-[#008069] dark:text-[#00a884]">@</span>
                <input
                  id="onboarding-username"
                  type="text"
                  required
                  maxlength="20"
                  value="${escapeHtml(currentUsername)}"
                  placeholder="your_username"
                  class="flex-1 bg-transparent text-sm text-[#111b21] dark:text-[#e9edef] focus:outline-none"
                />
              </div>
              <div id="onboarding-username-status" class="mt-1.5 min-h-[18px]"></div>
            </div>

            <div>
              <label for="onboarding-displayname" class="block text-xs font-medium text-[#54656f] dark:text-[#aebac1] mb-1.5">
                Display Name
              </label>
              <input
                id="onboarding-displayname"
                type="text"
                required
                maxlength="50"
                value="${escapeHtml(state.pendingDisplayName || user?.displayName || '')}"
                placeholder="Your name"
                class="w-full px-3.5 py-2.5 rounded-xl bg-[#f0f2f5] dark:bg-[#111b21] border border-[#e9edef] dark:border-[#2a3942] text-sm text-[#111b21] dark:text-[#e9edef] focus:outline-none focus:ring-2 focus:ring-[#00a884]"
              />
            </div>

            <div>
              <label for="onboarding-about" class="block text-xs font-medium text-[#54656f] dark:text-[#aebac1] mb-1.5">
                About
              </label>
              <input
                id="onboarding-about"
                type="text"
                maxlength="140"
                value="Hey there! I am using Baatcheet."
                class="w-full px-3.5 py-2.5 rounded-xl bg-[#f0f2f5] dark:bg-[#111b21] border border-[#e9edef] dark:border-[#2a3942] text-sm text-[#111b21] dark:text-[#e9edef] focus:outline-none focus:ring-2 focus:ring-[#00a884]"
              />
            </div>

            <div class="flex items-center justify-between pt-2 gap-3">
              <button type="button" data-action="sign-out"
                class="px-4 py-2.5 rounded-xl text-xs font-medium text-[#54656f] dark:text-[#aebac1] hover:bg-[#f0f2f5] dark:hover:bg-[#2a3942] cursor-pointer">
                Switch account
              </button>
              <button type="submit" ${state.onboardingSubmitting ? 'disabled' : ''}
                class="flex-1 py-2.5 px-5 rounded-xl bg-[#008069] hover:bg-[#017561] dark:bg-[#00a884] dark:hover:bg-[#06cf9c] text-white dark:text-[#111b21] text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60">
                ${state.onboardingSubmitting ? 'Creating profile...' : 'Continue to chats'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    checkUsernameAvailability(currentUsername);
  }

  function renderPublicExperience() {
    const isLoggedIn = Boolean(state.authUser);
    const activePage = state.publicPage || 'home';

    if (activePage !== 'home') {
      rootEl.innerHTML = `
        <div class="min-h-[100dvh] flex flex-col bg-[#f0f2f5] dark:bg-[#0b141a]">
          ${renderPublicTopBar(activePage, isLoggedIn)}
          <div class="flex-1">
            ${renderPolicyPageContent(activePage, state)}
          </div>
          ${renderPublicFooter(state.theme)}
          ${renderCookieBanner(state.cookieConsent)}
        </div>
      `;
      return;
    }

    const mode = state.authMode;
    rootEl.innerHTML = `
      <div class="min-h-[100dvh] flex flex-col bg-[#f0f2f5] dark:bg-[#0b141a]">
        ${renderPublicTopBar('home', isLoggedIn)}

        <!-- Hero Split: Clear Value Proposition + Clean Email/Password & Google Auth -->
        <section class="bg-gradient-to-b from-[#008069]/10 via-[#f0f2f5] to-[#f0f2f5] dark:from-[#00a884]/10 dark:via-[#0b141a] dark:to-[#0b141a] pt-8 sm:pt-12 pb-6">
          <div class="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <!-- Left Proposition -->
            <div class="lg:col-span-7 flex flex-col justify-center space-y-5">
              <p class="text-xs font-semibold tracking-wide text-[#008069] dark:text-[#00a884]">
                Real-Time Handle Messaging
              </p>
              <h1 class="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#111b21] dark:text-[#e9edef] leading-[1.15] tracking-tight" style="text-wrap: balance;">
                Fast, private conversations with @username discovery
              </h1>
              <p class="text-base text-[#54656f] dark:text-[#aebac1] leading-relaxed max-w-xl">
                Connect with friends and teams in real time without sharing your phone number. Sign in with Email &amp; Password or Google, claim a unique <code class="font-mono text-xs">@username</code>, and start chatting immediately.
              </p>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 max-w-xl">
                <div class="p-4 rounded-2xl bg-white dark:bg-[#202c33] border border-[#e9edef] dark:border-[#2a3942]">
                  <p class="text-sm font-semibold text-[#111b21] dark:text-[#e9edef]">Instant Username Search</p>
                  <p class="mt-1 text-xs text-[#667781] dark:text-[#8696a0] leading-relaxed">
                    Look up any verified handle to open a 1-on-1 conversation in seconds.
                  </p>
                </div>
                <div class="p-4 rounded-2xl bg-white dark:bg-[#202c33] border border-[#e9edef] dark:border-[#2a3942]">
                  <p class="text-sm font-semibold text-[#111b21] dark:text-[#e9edef]">Live Ticks &amp; Typing Status</p>
                  <p class="mt-1 text-xs text-[#667781] dark:text-[#8696a0] leading-relaxed">
                    Synced read receipts, unread counters, and real-time online presence.
                  </p>
                </div>
              </div>
            </div>

            <!-- Right Auth Card (No Ads Placed Here per AdSense Policy) -->
            <div id="auth-card-section" class="lg:col-span-5 flex items-center">
              <div class="w-full bg-white dark:bg-[#202c33] rounded-2xl shadow-lg border border-[#e9edef] dark:border-[#2a3942] p-6 sm:p-7">
                ${
                  isLoggedIn
                    ? `<div class="text-center space-y-4 py-6">
                         <div class="w-14 h-14 mx-auto rounded-full bg-[#008069]/12 dark:bg-[#00a884]/15 text-[#008069] dark:text-[#00a884] flex items-center justify-center">
                           ${icons.logo}
                         </div>
                         <h2 class="font-display text-lg font-semibold text-[#111b21] dark:text-[#e9edef]">
                           Signed in as @${escapeHtml(state.myProfile?.username || 'user')}
                         </h2>
                         <button type="button" data-action="back-to-chats"
                           class="w-full py-2.5 px-5 rounded-xl bg-[#008069] hover:bg-[#017561] dark:bg-[#00a884] dark:hover:bg-[#06cf9c] text-white dark:text-[#111b21] text-sm font-semibold cursor-pointer">
                           Return to Chats
                         </button>
                       </div>`
                    : `
                      <!-- Segmented Auth Mode Tabs -->
                      <div class="flex items-center gap-1 p-1 rounded-xl bg-[#f0f2f5] dark:bg-[#111b21] mb-5">
                        <button type="button" data-action="set-auth-mode" data-mode="signin"
                          class="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            mode === 'signin'
                              ? 'bg-white dark:bg-[#2a3942] text-[#111b21] dark:text-[#e9edef] shadow-xs'
                              : 'text-[#667781] dark:text-[#8696a0]'
                          }">
                          Sign In
                        </button>
                        <button type="button" data-action="set-auth-mode" data-mode="signup"
                          class="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            mode === 'signup'
                              ? 'bg-white dark:bg-[#2a3942] text-[#111b21] dark:text-[#e9edef] shadow-xs'
                              : 'text-[#667781] dark:text-[#8696a0]'
                          }">
                          Create Account
                        </button>
                      </div>

                      ${
                        state.authError
                          ? `<div class="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                               ${escapeHtml(state.authError)}
                             </div>`
                          : ''
                      }
                      ${
                        state.authSuccessMessage
                          ? `<div class="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-[#008069] dark:text-[#00a884] leading-relaxed">
                               ${escapeHtml(state.authSuccessMessage)}
                             </div>`
                          : ''
                      }

                      <form id="email-auth-form" class="space-y-3.5">
                        ${
                          mode === 'signup'
                            ? `<div>
                                 <label for="auth-name" class="block text-xs font-medium text-[#54656f] dark:text-[#aebac1] mb-1">Full Name</label>
                                 <input id="auth-name" type="text" required maxlength="50" placeholder="Enter your name"
                                   class="w-full px-3.5 py-2.5 rounded-xl bg-[#f0f2f5] dark:bg-[#111b21] border border-[#e9edef] dark:border-[#2a3942] text-sm text-[#111b21] dark:text-[#e9edef] focus:outline-none focus:ring-2 focus:ring-[#00a884]" />
                               </div>`
                            : ''
                        }

                        <div>
                          <label for="auth-email" class="block text-xs font-medium text-[#54656f] dark:text-[#aebac1] mb-1">Email Address</label>
                          <input id="auth-email" type="email" required autocomplete="email" placeholder="you@example.com"
                            class="w-full px-3.5 py-2.5 rounded-xl bg-[#f0f2f5] dark:bg-[#111b21] border border-[#e9edef] dark:border-[#2a3942] text-sm text-[#111b21] dark:text-[#e9edef] focus:outline-none focus:ring-2 focus:ring-[#00a884]" />
                        </div>

                        ${
                          mode !== 'forgot'
                            ? `<div>
                                 <div class="flex items-center justify-between mb-1">
                                   <label for="auth-password" class="block text-xs font-medium text-[#54656f] dark:text-[#aebac1]">Password</label>
                                   ${
                                     mode === 'signin'
                                       ? `<button type="button" data-action="set-auth-mode" data-mode="forgot"
                                            class="text-xs font-medium text-[#008069] dark:text-[#00a884] hover:underline cursor-pointer">
                                            Forgot password?
                                          </button>`
                                       : ''
                                   }
                                 </div>
                                 <div class="relative flex items-center">
                                   <input id="auth-password" type="${state.showPassword ? 'text' : 'password'}" required minlength="6"
                                     autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}"
                                     placeholder="${mode === 'signup' ? 'At least 6 characters' : 'Enter password'}"
                                     class="w-full pl-3.5 pr-11 py-2.5 rounded-xl bg-[#f0f2f5] dark:bg-[#111b21] border border-[#e9edef] dark:border-[#2a3942] text-sm text-[#111b21] dark:text-[#e9edef] focus:outline-none focus:ring-2 focus:ring-[#00a884]" />
                                   <button type="button" data-action="toggle-password" aria-label="Toggle password visibility"
                                     class="absolute right-1 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg text-[#667781] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-white cursor-pointer">
                                     ${state.showPassword ? icons.eyeOff : icons.eye}
                                   </button>
                                 </div>
                               </div>`
                            : ''
                        }

                        <button type="submit" ${state.authSubmitting ? 'disabled' : ''}
                          class="w-full py-2.5 px-5 rounded-xl bg-[#008069] hover:bg-[#017561] dark:bg-[#00a884] dark:hover:bg-[#06cf9c] text-white dark:text-[#111b21] text-sm font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60">
                          ${
                            state.authSubmitting
                              ? 'Please wait...'
                              : mode === 'signup'
                                ? 'Create Account'
                                : mode === 'forgot'
                                  ? 'Send Reset Link'
                                  : 'Sign In with Email'
                          }
                        </button>

                        ${
                          mode === 'forgot'
                            ? `<button type="button" data-action="set-auth-mode" data-mode="signin"
                                 class="w-full py-2 text-xs font-medium text-[#54656f] dark:text-[#aebac1] hover:underline cursor-pointer">
                                 Back to Sign In
                               </button>`
                            : ''
                        }
                      </form>

                      <div class="relative my-5 flex items-center">
                        <div class="flex-1 border-t border-[#e9edef] dark:border-[#2a3942]"></div>
                        <span class="px-3 text-xs text-[#667781] dark:text-[#8696a0]">or</span>
                        <div class="flex-1 border-t border-[#e9edef] dark:border-[#2a3942]"></div>
                      </div>

                      <button
                        id="google-signin-btn"
                        type="button"
                        data-action="google-signin"
                        class="w-full inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl border border-[#d1d7db] dark:border-[#2a3942] bg-white dark:bg-[#111b21] hover:bg-[#f5f6f6] dark:hover:bg-[#182229] text-[#111b21] dark:text-[#e9edef] text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                          <path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"/>
                        </svg>
                        <span>Continue with Google</span>
                      </button>

                      <p class="mt-4 text-[11px] text-[#667781] dark:text-[#8696a0] text-center leading-relaxed">
                        By continuing, you agree to our
                        <button type="button" data-action="nav-page" data-page="terms" class="text-[#008069] dark:text-[#00a884] underline cursor-pointer">Terms</button>
                        and
                        <button type="button" data-action="nav-page" data-page="privacy" class="text-[#008069] dark:text-[#00a884] underline cursor-pointer">Privacy Policy</button>.
                      </p>
                    `
                }
              </div>
            </div>
          </div>
        </section>

        ${renderEditorialSections()}
        ${renderPublicFooter(state.theme)}
        ${renderCookieBanner(state.cookieConsent)}
      </div>
    `;
  }

  function renderLoading() {
    rootEl.innerHTML = `
      <div class="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-[#111b21] px-4">
        <div class="w-14 h-14 rounded-full bg-[#008069]/12 dark:bg-[#00a884]/15 text-[#008069] dark:text-[#00a884] flex items-center justify-center mb-4 animate-pulse">
          ${icons.logo}
        </div>
        <p class="text-sm font-medium text-[#54656f] dark:text-[#aebac1]">Connecting to Baatcheet...</p>
      </div>
    `;
  }

  function renderApp() {
    if (!state.authReady) {
      renderLoading();
      return;
    }
    if (!state.authUser || state.viewingPublicDocs) {
      renderPublicExperience();
      return;
    }
    if (state.needsOnboarding) {
      renderOnboarding();
      return;
    }
    renderWorkspace();
  }

  // Event delegation on rootEl
  rootEl.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;

    if (action === 'google-signin') {
      handleGoogleSignIn();
    } else if (action === 'set-auth-mode') {
      state.authMode = target.dataset.mode || 'signin';
      state.authError = '';
      state.authSuccessMessage = '';
      renderApp();
    } else if (action === 'toggle-password') {
      state.showPassword = !state.showPassword;
      const pw = document.getElementById('auth-password');
      if (pw) {
        pw.type = state.showPassword ? 'text' : 'password';
        target.innerHTML = state.showPassword ? icons.eyeOff : icons.eye;
      }
    } else if (action === 'nav-page') {
      state.publicPage = target.dataset.page || 'home';
      state.contactSubmitted = false;
      window.location.hash = state.publicPage === 'home' ? '' : `#${state.publicPage}`;
      renderApp();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (action === 'focus-auth') {
      state.publicPage = 'home';
      window.location.hash = '';
      renderApp();
      setTimeout(() => {
        const emailEl = document.getElementById('auth-email');
        if (emailEl) {
          emailEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          emailEl.focus();
        }
      }, 60);
    } else if (action === 'open-legal-docs') {
      state.viewingPublicDocs = true;
      state.publicPage = 'privacy';
      window.location.hash = '#privacy';
      renderApp();
      window.scrollTo({ top: 0 });
    } else if (action === 'back-to-chats') {
      state.viewingPublicDocs = false;
      window.location.hash = '';
      renderApp();
    } else if (action === 'toggle-public-theme') {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
      renderApp();
    } else if (action === 'cookie-accept' || action === 'cookie-essential') {
      const choice = action === 'cookie-accept' ? 'all' : 'essential';
      state.cookieConsent = choice;
      localStorage.setItem('baatcheet_cookie_consent', choice);
      renderApp();
    } else if (action === 'reopen-cookie-banner') {
      state.cookieConsent = '';
      localStorage.removeItem('baatcheet_cookie_consent');
      renderApp();
    } else if (action === 'reset-contact') {
      state.contactSubmitted = false;
      renderApp();
    } else if (action === 'sign-out') {
      handleSignOut();
    } else if (action === 'toggle-theme') {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
      renderWorkspace();
    } else if (action === 'open-new-chat') {
      state.modal = 'new-chat';
      state.usernameSearchQuery = '';
      state.usernameSearchError = '';
      renderModalContent();
      searchUsernames('');
    } else if (action === 'open-profile') {
      state.modal = 'profile';
      renderModalContent();
    } else if (action === 'close-modal') {
      state.modal = null;
      renderModalContent();
    } else if (action === 'close-modal-backdrop' && e.target === target) {
      state.modal = null;
      renderModalContent();
    } else if (action === 'filter-chats') {
      state.sidebarFilter = target.dataset.filter || 'all';
      renderWorkspace();
    } else if (action === 'select-chat') {
      openChatWithUser(target.dataset.uid);
    } else if (action === 'start-chat-user') {
      const uid = target.dataset.uid;
      const found = state.usernameSearchResults.find((u) => u.uid === uid) || null;
      openChatWithUser(uid, found);
    } else if (action === 'close-mobile-chat') {
      setTypingState(false);
      state.activeChatId = null;
      state.activeContactUid = null;
      if (unsubMessages) {
        unsubMessages();
        unsubMessages = null;
      }
      renderWorkspace();
    } else if (action === 'toggle-chat-search') {
      state.activeChatSearchOpen = !state.activeChatSearchOpen;
      if (!state.activeChatSearchOpen) state.activeChatSearchQuery = '';
      renderChatHeader();
      renderMessagesList();
      if (state.activeChatSearchOpen) {
        const input = document.getElementById('in-chat-search-input');
        if (input) input.focus();
      }
    } else if (action === 'clear-chat-search') {
      state.activeChatSearchOpen = false;
      state.activeChatSearchQuery = '';
      renderChatHeader();
      renderMessagesList();
    } else if (action === 'toggle-contact-info') {
      state.contactInfoOpen = !state.contactInfoOpen;
      renderChatHeader();
      renderContactDrawer();
    } else if (action === 'toggle-emoji') {
      state.emojiOpen = !state.emojiOpen;
      updateEmojiPopover();
    } else if (action === 'insert-emoji') {
      const emoji = target.dataset.emoji || '';
      const composer = document.getElementById('message-composer');
      if (composer) {
        const start = composer.selectionStart ?? composer.value.length;
        const end = composer.selectionEnd ?? composer.value.length;
        composer.value = composer.value.slice(0, start) + emoji + composer.value.slice(end);
        composer.focus();
        composer.selectionStart = composer.selectionEnd = start + emoji.length;
        handleComposerInput();
      }
    } else if (action === 'copy-msg' || action === 'copy-text') {
      const txt = target.dataset.text || '';
      navigator.clipboard?.writeText(txt).then(() => showToast('Copied to clipboard'));
    } else if (action === 'delete-msg') {
      handleDeleteMessage(target.dataset.id);
    }
  });

  rootEl.addEventListener('input', (e) => {
    const id = e.target.id;
    if (id === 'sidebar-search-input') {
      state.sidebarSearch = e.target.value;
      renderSidebarList();
    } else if (id === 'in-chat-search-input') {
      state.activeChatSearchQuery = e.target.value;
      renderMessagesList();
    } else if (id === 'message-composer') {
      handleComposerInput();
    } else if (id === 'username-search-input') {
      state.usernameSearchQuery = e.target.value;
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        searchUsernames(state.usernameSearchQuery);
      }, 240);
    } else if (id === 'onboarding-username') {
      state.onboardingUsername = e.target.value;
      clearTimeout(onboardingDebounce);
      onboardingDebounce = setTimeout(() => {
        checkUsernameAvailability(e.target.value);
      }, 260);
    }
  });

  rootEl.addEventListener('keydown', (e) => {
    if (e.target.id === 'message-composer' && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  rootEl.addEventListener('submit', (e) => {
    if (e.target.id === 'message-form') {
      handleSendMessage(e);
    } else if (e.target.id === 'onboarding-form') {
      handleCompleteOnboarding(e);
    } else if (e.target.id === 'edit-profile-form') {
      handleSaveProfile(e);
    } else if (e.target.id === 'email-auth-form') {
      handleEmailAuthSubmit(e);
    } else if (e.target.id === 'contact-form') {
      e.preventDefault();
      state.contactSubmitted = true;
      renderApp();
    }
  });

  // Global keyboard shortcut: Ctrl+K / Cmd+K to open New Chat search
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      if (state.authUser && !state.needsOnboarding && !state.viewingPublicDocs) {
        e.preventDefault();
        state.modal = 'new-chat';
        state.usernameSearchQuery = '';
        renderModalContent();
        searchUsernames('');
      }
    } else if (e.key === 'Escape' && state.modal) {
      state.modal = null;
      renderModalContent();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      setOnlinePresence(true);
      if (state.activeChatId && state.activeMessages.length > 0) {
        markActiveChatRead(state.activeChatId, state.activeMessages);
      }
    } else {
      setTypingState(false);
      setOnlinePresence(false);
    }
  });

  window.addEventListener('beforeunload', () => {
    setOnlinePresence(false);
  });

  window.addEventListener('hashchange', () => {
    const h = window.location.hash.replace(/^#\/?/, '').toLowerCase();
    const validPages = ['home', 'guide', 'about', 'privacy', 'terms', 'contact'];
    if (validPages.includes(h)) {
      state.publicPage = h;
      if (state.authUser && h !== 'home') {
        state.viewingPublicDocs = true;
      }
      renderApp();
    }
  });

  onAuthStateChanged(auth, async (user) => {
    cleanupAllListeners();
    state.authUser = user;
    state.myProfile = null;
    state.needsOnboarding = false;
    state.viewingPublicDocs = false;
    state.authReady = true;

    if (!user) {
      renderApp();
      return;
    }

    renderLoading();
    const userPath = `users/${user.uid}`;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (!snap.exists()) {
        state.needsOnboarding = true;
        state.onboardingUsername = normalizeUsername(
          user.email?.split('@')[0] || user.displayName || 'user'
        );
        renderApp();
        return;
      }

      state.myProfile = snap.data();
      state.needsOnboarding = false;
      renderApp();
      setOnlinePresence(true);
      startChatsListener(user.uid);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, userPath);
    }
  });

  renderApp();
}
