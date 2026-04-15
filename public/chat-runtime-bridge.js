(function () {
  const HIDDEN_HREFS = [
    '/overview',
    '/channels',
    '/instances',
    '/sessions',
    '/usage',
    '/cron',
    '/agents',
    '/skills',
    '/nodes',
    '/config',
    '/communications',
    '/appearance',
    '/automation',
    '/infrastructure',
    '/ai-agents',
    '/debug',
    '/logs',
  ];
  const HIDDEN_BUTTON_LABELS = [
    'Open command palette',
    'Toggle assistant thinking/working output',
    'Toggle tool calls and tool results',
    'Show cron sessions',
  ];

  let runtimeContext = null;
  let decorateAttempts = 0;
  let intervalHandle = null;

  function isFr() {
    return document.documentElement.lang !== 'en';
  }

  function getContextCopy() {
    const role = runtimeContext && runtimeContext.user ? runtimeContext.user.role : 'user';
    const fr = isFr();

    if (role === 'platform_admin') {
      return {
        roleLabel: fr ? 'Admin plateforme' : 'Platform admin',
        workspaceLabel: fr ? 'Commande plateforme' : 'Platform command',
        summary: fr
          ? 'Pilotage plateforme, supervision flotte et validation provider.'
          : 'Platform operations, fleet supervision, and provider validation.',
      };
    }

    if (role === 'org_admin') {
      return {
        roleLabel: fr ? 'Admin organisation' : 'Organization admin',
        workspaceLabel: fr ? 'Espace audit organisation' : 'Organization audit workspace',
        summary: fr
          ? 'Pilotage securite limite a votre organisation.'
          : 'Security leadership limited to your organization boundary.',
      };
    }

    return {
      roleLabel: fr ? 'Espace user' : 'Workspace user',
      workspaceLabel: fr ? 'Espace audit' : 'Audit workspace',
      summary: fr
        ? 'Workspace dedie et isole par BJHUNT.'
        : 'Dedicated isolated workspace managed by BJHUNT.',
    };
  }

  function replaceBranding() {
    if (document.title) {
      document.title = document.title.replace(/OpenClaw/gi, 'BJHUNT').replace(/Gateway Dashboard/gi, 'BJHUNT');
    }

    document.querySelectorAll('title, h1, h2, h3, p, span, div, button').forEach((node) => {
      if (!(node instanceof HTMLElement)) {
        return;
      }

      const text = node.textContent || '';
      if (!text || !/OpenClaw|Gateway Dashboard/.test(text)) {
        return;
      }

      if (node.children.length === 0) {
        node.textContent = text.replace(/OpenClaw/gi, 'BJHUNT').replace(/Gateway Dashboard/gi, 'BJHUNT');
      }
    });
  }

  function hideTechnicalLinks() {
    HIDDEN_HREFS.forEach((href) => {
      document.querySelectorAll(`a[href="${href}"]`).forEach((anchor) => {
        const item = anchor.closest('li, a, .nav-item, .sidebar-item');
        if (item instanceof HTMLElement) {
          item.style.display = 'none';
        }
      });
    });

    document.querySelectorAll('a[href*="docs.openclaw.ai"]').forEach((anchor) => {
      const item = anchor.closest('li, a, .nav-item, .sidebar-item');
      if (item instanceof HTMLElement) {
        item.style.display = 'none';
      }
    });

    document.querySelectorAll('button').forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      const label =
        button.getAttribute('aria-label') ||
        button.getAttribute('title') ||
        (button.textContent || '').trim();
      if (HIDDEN_BUTTON_LABELS.includes(label)) {
        button.style.display = 'none';
      }
    });
  }

  function ensureRoleBanner() {
    const banner = document.querySelector('[role="banner"], header.topbar, .topbar');
    if (!(banner instanceof HTMLElement) || banner.querySelector('.bjhunt-role-banner')) {
      return;
    }

    const copy = getContextCopy();
    const organizationName =
      runtimeContext && runtimeContext.organization ? runtimeContext.organization.name : 'BJHUNT';

    const roleBanner = document.createElement('div');
    roleBanner.className = 'bjhunt-role-banner';
    roleBanner.innerHTML = `
      <span class="bjhunt-role-banner__eyebrow">BJHUNT</span>
      <span class="bjhunt-role-banner__title">${copy.workspaceLabel}</span>
      <span class="bjhunt-role-banner__meta">${copy.roleLabel} - ${organizationName}</span>
    `;

    banner.appendChild(roleBanner);
  }

  function ensureSidebarContextCard() {
    const sidebar = document.querySelector('[role="complementary"], aside.sidebar, aside');
    if (!(sidebar instanceof HTMLElement) || sidebar.querySelector('.bjhunt-context-card')) {
      return;
    }

    const copy = getContextCopy();
    const displayName =
      runtimeContext && runtimeContext.user ? runtimeContext.user.displayName : 'BJHUNT operator';
    const organizationName =
      runtimeContext && runtimeContext.organization ? runtimeContext.organization.name : 'BJHUNT';

    const card = document.createElement('section');
    card.className = 'bjhunt-context-card';
    card.innerHTML = `
      <p class="bjhunt-context-card__eyebrow">${copy.roleLabel}</p>
      <h2 class="bjhunt-context-card__title">${copy.workspaceLabel}</h2>
      <p class="bjhunt-context-card__body">${copy.summary}</p>
      <div class="bjhunt-context-card__meta">
        <span>${displayName}</span>
        <span>${organizationName}</span>
      </div>
    `;

    sidebar.insertBefore(card, sidebar.firstChild);
  }

  function decorate() {
    replaceBranding();
    hideTechnicalLinks();
    ensureRoleBanner();
    ensureSidebarContextCard();
    document.body.dataset.bjhuntRole =
      runtimeContext && runtimeContext.user ? runtimeContext.user.role : 'user';

    decorateAttempts += 1;
    if (decorateAttempts >= 12 && intervalHandle) {
      window.clearInterval(intervalHandle);
      intervalHandle = null;
    }
  }

  async function loadRuntimeContext() {
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 3000);
      const response = await fetch('/api/runtime/session-context', {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      if (response.ok) {
        runtimeContext = await response.json();
      }
    } catch {}
  }

  function boot() {
    decorate();
    if (!intervalHandle) {
      intervalHandle = window.setInterval(decorate, 800);
    }
  }

  window.addEventListener('load', boot);
  document.addEventListener('DOMContentLoaded', boot);

  loadRuntimeContext().finally(boot);
})();
