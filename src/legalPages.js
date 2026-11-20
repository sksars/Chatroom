import { icons } from './icons.js';

// Set your approved Google AdSense Publisher ID (e.g. 'ca-pub-1234567890123456') when ready.
export const ADSENSE_CONFIG = {
  publisherId: '',
  slots: {
    guideBanner: '',
    aboutRectangle: '',
  },
};

export function renderAdSlot({ label = 'Advertisement', minHeight = 'min-h-[100px]', slotId = '' }) {
  // Policy: Clearly labeled, generous vertical separation, never placed on auth forms, errors, or chat streams.
  return `
    <aside aria-label="Advertisement" class="my-8 py-4 px-4 rounded-2xl bg-[#f8f9fa] dark:bg-[#182229] border border-[#e9edef] dark:border-[#2a3942] text-center">
      <p class="text-[11px] font-medium tracking-wide text-[#667781] dark:text-[#8696a0] mb-2">
        ${label}
      </p>
      <div class="${minHeight} flex items-center justify-center rounded-xl border border-dashed border-[#d1d7db] dark:border-[#2a3942] px-4 py-6">
        ${
          ADSENSE_CONFIG.publisherId && slotId
            ? `<ins class="adsbygoogle block w-full" data-ad-client="${ADSENSE_CONFIG.publisherId}" data-ad-slot="${slotId}" data-ad-format="auto" data-full-width-responsive="true"></ins>`
            : `<p class="text-xs text-[#667781] dark:text-[#8696a0] max-w-md">
                 AdSense-compliant display unit container. Configure your Publisher ID in <code class="font-mono text-[11px]">ADSENSE_CONFIG</code> and <code class="font-mono text-[11px]">/ads.txt</code> after site approval.
               </p>`
        }
      </div>
    </aside>
  `;
}

export function renderPublicTopBar(activePage, isLoggedIn) {
  const navItems = [
    { id: 'home', label: 'Overview' },
    { id: 'guide', label: 'Guide' },
    { id: 'about', label: 'About' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'contact', label: 'Contact' },
  ];

  return `
    <header class="sticky top-0 z-30 bg-white/95 dark:bg-[#111b21]/95 backdrop-blur-md border-b border-[#e9edef] dark:border-[#2a3942]">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        <!-- Zone 1: Single text brand wordmark -->
        <button type="button" data-action="nav-page" data-page="home"
          class="font-display text-lg font-bold tracking-tight text-[#111b21] dark:text-[#e9edef] hover:text-[#008069] dark:hover:text-[#00a884] transition-colors cursor-pointer whitespace-nowrap shrink-0">
          Baatcheet
        </button>

        <!-- Zone 2: 5 concise single-line text nav links -->
        <nav class="hidden md:flex items-center gap-6 text-sm font-medium">
          ${navItems
            .map(
              (item) => `
              <button type="button" data-action="nav-page" data-page="${item.id}"
                class="whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer ${
                  activePage === item.id
                    ? 'text-[#008069] dark:text-[#00a884] font-semibold underline underline-offset-8 decoration-2'
                    : 'text-[#54656f] dark:text-[#aebac1] hover:text-[#111b21] dark:hover:text-white'
                }">
                ${item.label}
              </button>
            `
            )
            .join('')}
        </nav>

        <!-- Zone 3: 1 primary action -->
        <div class="flex items-center shrink-0">
          ${
            isLoggedIn
              ? `<button type="button" data-action="back-to-chats"
                   class="px-4 py-2 rounded-xl bg-[#008069] hover:bg-[#017561] dark:bg-[#00a884] dark:hover:bg-[#06cf9c] text-white dark:text-[#111b21] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0">
                   Back to Chats
                 </button>`
              : `<button type="button" data-action="focus-auth"
                   class="px-4 py-2 rounded-xl bg-[#008069] hover:bg-[#017561] dark:bg-[#00a884] dark:hover:bg-[#06cf9c] text-white dark:text-[#111b21] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0">
                   Sign In
                 </button>`
          }
        </div>
      </div>

      <!-- Mobile nav row -->
      <nav class="md:hidden flex items-center gap-4 px-4 pb-2.5 overflow-x-auto text-xs font-medium border-t border-[#f0f2f5] dark:border-[#202c33]">
        ${navItems
          .map(
            (item) => `
            <button type="button" data-action="nav-page" data-page="${item.id}"
              class="whitespace-nowrap shrink-0 py-1.5 cursor-pointer ${
                activePage === item.id
                  ? 'text-[#008069] dark:text-[#00a884] font-semibold'
                  : 'text-[#54656f] dark:text-[#aebac1]'
              }">
              ${item.label}
            </button>
          `
          )
          .join('')}
      </nav>
    </header>
  `;
}

export function renderPublicFooter(theme) {
  return `
    <footer class="bg-white dark:bg-[#111b21] border-t border-[#e9edef] dark:border-[#2a3942] mt-16">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p class="font-display text-base font-bold text-[#111b21] dark:text-[#e9edef]">Baatcheet</p>
            <p class="mt-2 text-xs text-[#667781] dark:text-[#8696a0] leading-relaxed max-w-xs">
              Real-time 1-on-1 web messaging powered by unique @username discovery, verified authentication, and isolated user privacy controls.
            </p>
          </div>

          <div class="grid grid-cols-2 gap-4 text-xs">
            <div class="space-y-2.5">
              <p class="font-semibold text-[#111b21] dark:text-[#e9edef]">Platform</p>
              <button type="button" data-action="nav-page" data-page="home" class="block text-[#54656f] dark:text-[#aebac1] hover:underline cursor-pointer">Overview</button>
              <button type="button" data-action="nav-page" data-page="guide" class="block text-[#54656f] dark:text-[#aebac1] hover:underline cursor-pointer">User Guide & FAQ</button>
              <button type="button" data-action="nav-page" data-page="about" class="block text-[#54656f] dark:text-[#aebac1] hover:underline cursor-pointer">About Us</button>
            </div>
            <div class="space-y-2.5">
              <p class="font-semibold text-[#111b21] dark:text-[#e9edef]">Legal & Policies</p>
              <button type="button" data-action="nav-page" data-page="privacy" class="block text-[#54656f] dark:text-[#aebac1] hover:underline cursor-pointer">Privacy Policy</button>
              <button type="button" data-action="nav-page" data-page="terms" class="block text-[#54656f] dark:text-[#aebac1] hover:underline cursor-pointer">Terms of Service</button>
              <button type="button" data-action="nav-page" data-page="contact" class="block text-[#54656f] dark:text-[#aebac1] hover:underline cursor-pointer">Contact Us</button>
            </div>
          </div>

          <div class="flex flex-col justify-between items-start md:items-end gap-4">
            <button type="button" data-action="toggle-public-theme"
              class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#e9edef] dark:border-[#2a3942] text-xs font-medium text-[#54656f] dark:text-[#aebac1] hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] cursor-pointer">
              ${theme === 'dark' ? icons.sun : icons.moon}
              <span>${theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
            </button>
            <button type="button" data-action="reopen-cookie-banner"
              class="text-xs text-[#008069] dark:text-[#00a884] hover:underline cursor-pointer">
              Cookie & Ad Preferences
            </button>
          </div>
        </div>

        <div class="mt-8 pt-6 border-t border-[#f0f2f5] dark:border-[#202c33] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#667781] dark:text-[#8696a0]">
          <p>© ${new Date().getFullYear()} Baatcheet. All rights reserved.</p>
          <p>Publisher transparency: Original messaging documentation & verified user directory.</p>
        </div>
      </div>
    </footer>
  `;
}

export function renderEditorialSections() {
  return `
    <section class="max-w-6xl mx-auto px-4 sm:px-6 mt-14 space-y-12">
      <!-- Value & Architecture Breakdown (Valuable Publisher Content) -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <article class="bg-white dark:bg-[#202c33] rounded-2xl p-6 border border-[#e9edef] dark:border-[#2a3942]">
          <h2 class="font-display text-base font-semibold text-[#111b21] dark:text-[#e9edef]">
            01. Handle-Based Discovery
          </h2>
          <p class="mt-2 text-sm text-[#54656f] dark:text-[#aebac1] leading-relaxed">
            Every member selects a unique lowercase <code class="font-mono text-xs">@username</code>. You can connect with colleagues and friends by searching their handle without sharing personal phone numbers or email addresses.
          </p>
        </article>

        <article class="bg-white dark:bg-[#202c33] rounded-2xl p-6 border border-[#e9edef] dark:border-[#2a3942]">
          <h2 class="font-display text-base font-semibold text-[#111b21] dark:text-[#e9edef]">
            02. Instant Account Access
          </h2>
          <p class="mt-2 text-sm text-[#54656f] dark:text-[#aebac1] leading-relaxed">
            Sign in with Google or create an account with Email &amp; Password to immediately choose your handle and start chatting without waiting for email links.
          </p>
        </article>

        <article class="bg-white dark:bg-[#202c33] rounded-2xl p-6 border border-[#e9edef] dark:border-[#2a3942]">
          <h2 class="font-display text-base font-semibold text-[#111b21] dark:text-[#e9edef]">
            03. Strict Data Isolation
          </h2>
          <p class="mt-2 text-sm text-[#54656f] dark:text-[#aebac1] leading-relaxed">
            Your email address is stored in an owner-only private record and is never exposed in public username searches. Direct chats are accessible strictly to the two participating users.
          </p>
        </article>
      </div>

      ${renderAdSlot({ label: 'Advertisement', minHeight: 'min-h-[100px]', slotId: ADSENSE_CONFIG.slots.guideBanner })}

      <!-- Helpful Guide Preview -->
      <div class="bg-white dark:bg-[#202c33] rounded-2xl p-7 sm:p-9 border border-[#e9edef] dark:border-[#2a3942]">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#f0f2f5] dark:border-[#2a3942] pb-5">
          <div>
            <h2 class="font-display text-xl font-semibold text-[#111b21] dark:text-[#e9edef]">
              How Baatcheet Messaging Works
            </h2>
            <p class="mt-1 text-sm text-[#667781] dark:text-[#8696a0]">
              A quick walkthrough of account setup, privacy rules, and live messaging features.
            </p>
          </div>
          <button type="button" data-action="nav-page" data-page="guide"
            class="text-sm font-semibold text-[#008069] dark:text-[#00a884] hover:underline cursor-pointer whitespace-nowrap shrink-0">
            Read full user guide →
          </button>
        </div>

        <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-[#54656f] dark:text-[#aebac1] leading-relaxed">
          <div>
            <h3 class="font-semibold text-[#111b21] dark:text-[#e9edef]">Starting a New Chat by @username</h3>
            <p class="mt-1.5">
              Once signed in, open the New Chat dialog from the sidebar header or press <kbd class="px-1.5 py-0.5 rounded bg-[#f0f2f5] dark:bg-[#111b21] text-xs font-mono">Ctrl+K</kbd>. Type an exact or partial username to locate another registered user and begin messaging immediately.
            </p>
          </div>
          <div>
            <h3 class="font-semibold text-[#111b21] dark:text-[#e9edef]">Read Receipts &amp; Message Controls</h3>
            <p class="mt-1.5">
              Delivered messages show double gray checkmarks; once your contact opens the conversation, checkmarks turn blue. You can copy any message or delete your own messages for everyone at any time.
            </p>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function renderPolicyPageContent(pageId, state) {
  if (pageId === 'guide') {
    return `
      <main class="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <header>
          <p class="text-xs font-semibold text-[#008069] dark:text-[#00a884]">Documentation · Updated November 2026</p>
          <h1 class="mt-2 font-display text-3xl font-semibold text-[#111b21] dark:text-[#e9edef]" style="text-wrap: balance;">
            Baatcheet User Guide &amp; Safety Standards
          </h1>
          <p class="mt-3 text-base text-[#54656f] dark:text-[#aebac1] leading-relaxed">
            Learn how to configure your verified account, search contacts safely using @username handles, manage privacy preferences, and follow our community guidelines.
          </p>
        </header>

        <article class="bg-white dark:bg-[#202c33] rounded-2xl p-6 sm:p-8 border border-[#e9edef] dark:border-[#2a3942] space-y-6 text-sm text-[#3b4a54] dark:text-[#d1d7db] leading-relaxed">
          <div>
            <h2 class="font-display text-lg font-semibold text-[#111b21] dark:text-[#e9edef]">01. Account Creation &amp; Instant Access</h2>
            <p class="mt-2">
              Baatcheet supports both Google Sign-In and standard Email &amp; Password registration. After creating your account, you can immediately select your unique <code class="font-mono text-xs">@username</code> and begin messaging without waiting for an email verification link.
            </p>
          </div>
          <div>
            <h2 class="font-display text-lg font-semibold text-[#111b21] dark:text-[#e9edef]">02. Claiming &amp; Updating Your @username</h2>
            <p class="mt-2">
              Usernames must be 3 to 20 characters long and contain only lowercase letters (<code class="font-mono text-xs">a-z</code>), digits (<code class="font-mono text-xs">0-9</code>), or underscores (<code class="font-mono text-xs">_</code>). Usernames are reserved atomically using database transactions so no two accounts can share the same handle. You can update your handle, display name, or About bio anytime from your profile drawer.
            </p>
          </div>
          <div>
            <h2 class="font-display text-lg font-semibold text-[#111b21] dark:text-[#e9edef]">03. Finding Contacts &amp; Real-Time Sync</h2>
            <p class="mt-2">
              To start a conversation, select the New Chat icon in the top-left toolbar (or press <code class="font-mono text-xs">Ctrl+K</code> / <code class="font-mono text-xs">Cmd+K</code>) and type a handle. Messages, unread counters, typing indicators, and online status synchronize across open sessions in real time.
            </p>
          </div>
          <div>
            <h2 class="font-display text-lg font-semibold text-[#111b21] dark:text-[#e9edef]">04. Community &amp; Content Safety</h2>
            <p class="mt-2">
              To maintain a safe environment compliant with publisher and advertising standards, Baatcheet strictly prohibits unsolicited bulk messaging, phishing links, harassment, impersonation, and unlawful content.
            </p>
          </div>
        </article>

        ${renderAdSlot({ label: 'Advertisement', minHeight: 'min-h-[120px]', slotId: ADSENSE_CONFIG.slots.guideBanner })}
      </main>
    `;
  }

  if (pageId === 'about') {
    return `
      <main class="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <header>
          <p class="text-xs font-semibold text-[#008069] dark:text-[#00a884]">About Baatcheet</p>
          <h1 class="mt-2 font-display text-3xl font-semibold text-[#111b21] dark:text-[#e9edef]" style="text-wrap: balance;">
            Simple, Handle-First Web Messaging
          </h1>
        </header>

        <section class="bg-white dark:bg-[#202c33] rounded-2xl p-6 sm:p-8 border border-[#e9edef] dark:border-[#2a3942] space-y-4 text-sm text-[#3b4a54] dark:text-[#d1d7db] leading-relaxed">
          <p>
            Baatcheet is a lightweight web messaging platform designed for instant 1-on-1 conversations directly from your browser—without requiring phone number disclosure or heavy desktop downloads.
          </p>
          <p>
            Built on modern web standards (HTML5, CSS3, and modular JavaScript) backed by Google Firebase Authentication and Cloud Firestore, Baatcheet separates private user credentials from public <code class="font-mono text-xs">@username</code> profiles and enforces participant-only database access rules on every conversation.
          </p>
          <p>
            For support inquiries, policy questions, or feedback, please visit our <button type="button" data-action="nav-page" data-page="contact" class="text-[#008069] dark:text-[#00a884] font-semibold hover:underline cursor-pointer">Contact page</button>.
          </p>
        </section>

        ${renderAdSlot({ label: 'Advertisement', minHeight: 'min-h-[250px]', slotId: ADSENSE_CONFIG.slots.aboutRectangle })}
      </main>
    `;
  }

  if (pageId === 'privacy') {
    return `
      <main class="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <header>
          <p class="text-xs font-semibold text-[#008069] dark:text-[#00a884]">Legal · Effective November 19, 2026</p>
          <h1 class="mt-2 font-display text-3xl font-semibold text-[#111b21] dark:text-[#e9edef]">
            Privacy Policy
          </h1>
        </header>

        <article class="bg-white dark:bg-[#202c33] rounded-2xl p-6 sm:p-8 border border-[#e9edef] dark:border-[#2a3942] space-y-6 text-sm text-[#3b4a54] dark:text-[#d1d7db] leading-relaxed">
          <section>
            <h2 class="font-display text-base font-semibold text-[#111b21] dark:text-[#e9edef]">1. Information We Collect</h2>
            <p class="mt-2">
              When you register or sign in using Google Authentication or Email &amp; Password, we collect your email address, chosen <code class="font-mono text-xs">@username</code>, display name, optional profile photo URL, About bio, and the messages you send within direct conversations.
            </p>
          </section>

          <section>
            <h2 class="font-display text-base font-semibold text-[#111b21] dark:text-[#e9edef]">2. Data Isolation &amp; Storage</h2>
            <p class="mt-2">
              Your email address is stored in an owner-isolated private document (<code class="font-mono text-xs">/users/{uid}</code>) readable only by your authenticated account. Other users can view only your public profile (<code class="font-mono text-xs">@username</code>, display name, bio, and online status). Messages are stored in Cloud Firestore and restricted strictly to the two participants of each conversation.
            </p>
          </section>

          <section>
            <h2 class="font-display text-base font-semibold text-[#111b21] dark:text-[#e9edef]">3. Cookies, Google AdSense &amp; Third-Party Advertising</h2>
            <p class="mt-2">
              Baatcheet may display advertisements served by Google AdSense on public informational pages (never inside active private chat threads or authentication screens). Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites.
            </p>
            <ul class="mt-2 list-disc pl-5 space-y-1.5">
              <li>Google's use of advertising cookies enables it and its partners to serve ads to users based on their visit to Baatcheet and/or other sites on the Internet.</li>
              <li>Users may opt out of personalized advertising by visiting <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" class="text-[#008069] dark:text-[#00a884] underline">Google Ads Settings</a> or <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" class="text-[#008069] dark:text-[#00a884] underline">aboutads.info</a>.</li>
              <li>Learn more about how Google uses data when you use partner sites at <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer" class="text-[#008069] dark:text-[#00a884] underline">Google Partner Sites Policy</a>.</li>
            </ul>
          </section>

          <section>
            <h2 class="font-display text-base font-semibold text-[#111b21] dark:text-[#e9edef]">4. Your Rights &amp; Data Control</h2>
            <p class="mt-2">
              You can update your display name, username, and bio at any time from your Profile settings, or delete individual messages you have sent. To request full account deletion or raise a privacy question, please contact us via the Contact page.
            </p>
          </section>
        </article>
      </main>
    `;
  }

  if (pageId === 'terms') {
    return `
      <main class="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <header>
          <p class="text-xs font-semibold text-[#008069] dark:text-[#00a884]">Legal · Effective November 19, 2026</p>
          <h1 class="mt-2 font-display text-3xl font-semibold text-[#111b21] dark:text-[#e9edef]">
            Terms of Service
          </h1>
        </header>

        <article class="bg-white dark:bg-[#202c33] rounded-2xl p-6 sm:p-8 border border-[#e9edef] dark:border-[#2a3942] space-y-6 text-sm text-[#3b4a54] dark:text-[#d1d7db] leading-relaxed">
          <section>
            <h2 class="font-display text-base font-semibold text-[#111b21] dark:text-[#e9edef]">1. Acceptance of Terms</h2>
            <p class="mt-2">
              By creating an account or accessing Baatcheet, you agree to comply with these Terms of Service and our Privacy Policy. You must provide accurate registration details and keep your login credentials secure.
            </p>
          </section>

          <section>
            <h2 class="font-display text-base font-semibold text-[#111b21] dark:text-[#e9edef]">2. Acceptable Use &amp; Prohibited Conduct</h2>
            <p class="mt-2">
              You are solely responsible for the messages and content you transmit. You agree NOT to use Baatcheet to:
            </p>
            <ul class="mt-2 list-disc pl-5 space-y-1.5">
              <li>Send spam, automated solicitations, phishing links, or malicious software.</li>
              <li>Harass, threaten, impersonate, or infringe upon the privacy or intellectual property rights of others.</li>
              <li>Distribute illegal, sexually explicit, hateful, or violent content.</li>
              <li>Attempt to bypass authentication, scrape the username directory, or disrupt Firestore infrastructure.</li>
            </ul>
          </section>

          <section>
            <h2 class="font-display text-base font-semibold text-[#111b21] dark:text-[#e9edef]">3. Intellectual Property &amp; Moderation</h2>
            <p class="mt-2">
              We reserve the right to suspend or restrict accounts that violate these Terms or compromise platform safety.
            </p>
          </section>

          <section>
            <h2 class="font-display text-base font-semibold text-[#111b21] dark:text-[#e9edef]">4. Disclaimer</h2>
            <p class="mt-2">
              Baatcheet is provided on an "as is" and "as available" basis without warranties of uninterrupted availability.
            </p>
          </section>
        </article>
      </main>
    `;
  }

  // Contact Us page
  return `
    <main class="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <header>
        <p class="text-xs font-semibold text-[#008069] dark:text-[#00a884]">Support &amp; Inquiries</p>
        <h1 class="mt-2 font-display text-3xl font-semibold text-[#111b21] dark:text-[#e9edef]">
          Contact Us
        </h1>
        <p class="mt-2 text-sm text-[#54656f] dark:text-[#aebac1]">
          Have a question about your account, privacy, or abuse reporting? Send us a message below.
        </p>
      </header>

      <div class="bg-white dark:bg-[#202c33] rounded-2xl p-6 sm:p-8 border border-[#e9edef] dark:border-[#2a3942]">
        ${
          state.contactSubmitted
            ? `<div class="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
                 <p class="text-sm font-semibold text-[#008069] dark:text-[#00a884]">Thank you — your message has been received.</p>
                 <p class="text-xs text-[#3b4a54] dark:text-[#d1d7db]">We review support and privacy requests promptly.</p>
                 <button type="button" data-action="reset-contact" class="mt-2 text-xs font-semibold text-[#008069] dark:text-[#00a884] hover:underline cursor-pointer">
                   Send another inquiry
                 </button>
               </div>`
            : `<form id="contact-form" class="space-y-4">
                 <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label for="contact-name" class="block text-xs font-medium text-[#54656f] dark:text-[#aebac1] mb-1.5">Full Name</label>
                     <input id="contact-name" type="text" required maxlength="80" placeholder="Your name"
                       class="w-full px-3.5 py-2.5 rounded-xl bg-[#f0f2f5] dark:bg-[#111b21] border border-[#e9edef] dark:border-[#2a3942] text-sm text-[#111b21] dark:text-[#e9edef] focus:outline-none focus:ring-2 focus:ring-[#00a884]" />
                   </div>
                   <div>
                     <label for="contact-email" class="block text-xs font-medium text-[#54656f] dark:text-[#aebac1] mb-1.5">Email Address</label>
                     <input id="contact-email" type="email" required maxlength="150" placeholder="you@example.com"
                       class="w-full px-3.5 py-2.5 rounded-xl bg-[#f0f2f5] dark:bg-[#111b21] border border-[#e9edef] dark:border-[#2a3942] text-sm text-[#111b21] dark:text-[#e9edef] focus:outline-none focus:ring-2 focus:ring-[#00a884]" />
                   </div>
                 </div>
                 <div>
                   <label for="contact-subject" class="block text-xs font-medium text-[#54656f] dark:text-[#aebac1] mb-1.5">Topic</label>
                   <select id="contact-subject"
                     class="w-full px-3.5 py-2.5 rounded-xl bg-[#f0f2f5] dark:bg-[#111b21] border border-[#e9edef] dark:border-[#2a3942] text-sm text-[#111b21] dark:text-[#e9edef] focus:outline-none focus:ring-2 focus:ring-[#00a884]">
                     <option value="general">General Support</option>
                     <option value="privacy">Privacy / Data Deletion Request</option>
                     <option value="abuse">Report Abuse or Spam</option>
                     <option value="ads">Advertising &amp; Partnership Inquiry</option>
                   </select>
                 </div>
                 <div>
                   <label for="contact-message" class="block text-xs font-medium text-[#54656f] dark:text-[#aebac1] mb-1.5">Message</label>
                   <textarea id="contact-message" rows="4" required maxlength="1000" placeholder="How can we help?"
                     class="w-full px-3.5 py-2.5 rounded-xl bg-[#f0f2f5] dark:bg-[#111b21] border border-[#e9edef] dark:border-[#2a3942] text-sm text-[#111b21] dark:text-[#e9edef] focus:outline-none focus:ring-2 focus:ring-[#00a884]"></textarea>
                 </div>
                 <button type="submit"
                   class="px-5 py-2.5 rounded-xl bg-[#008069] hover:bg-[#017561] dark:bg-[#00a884] dark:hover:bg-[#06cf9c] text-white dark:text-[#111b21] text-sm font-semibold transition-colors cursor-pointer">
                   Submit message
                 </button>
               </form>`
        }
      </div>
    </main>
  `;
}

export function renderCookieBanner(cookieConsent) {
  if (cookieConsent) return '';
  return `
    <div role="region" aria-label="Cookie consent" class="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#202c33]/95 backdrop-blur-md border-t border-[#e9edef] dark:border-[#2a3942] shadow-lg">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p class="text-xs text-[#3b4a54] dark:text-[#d1d7db] leading-relaxed">
          We use essential cookies for authentication and preferences, and third-party advertising cookies (Google AdSense) on public guide pages.
          <button type="button" data-action="nav-page" data-page="privacy" class="text-[#008069] dark:text-[#00a884] font-semibold underline ml-1 cursor-pointer">
            Read Privacy Policy
          </button>
        </p>
        <div class="flex items-center gap-2 shrink-0">
          <button type="button" data-action="cookie-essential"
            class="px-3.5 py-1.5 rounded-lg border border-[#d1d7db] dark:border-[#2a3942] text-xs font-medium text-[#54656f] dark:text-[#aebac1] hover:bg-[#f0f2f5] dark:hover:bg-[#2a3942] cursor-pointer whitespace-nowrap shrink-0">
            Essential Only
          </button>
          <button type="button" data-action="cookie-accept"
            class="px-3.5 py-1.5 rounded-lg bg-[#008069] hover:bg-[#017561] dark:bg-[#00a884] dark:hover:bg-[#06cf9c] text-white dark:text-[#111b21] text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0">
            Accept All
          </button>
        </div>
      </div>
    </div>
  `;
}
