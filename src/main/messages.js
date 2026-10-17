'use strict';

const I18n = require('../shared/i18n');

/*
 * Turns raw git text and app state into plain-language guidance, in the
 * currently selected language (set via setLanguage before use).
 */

let lang = 'en';

function setLanguage(value) {
  lang = I18n.languages.indexOf(value) !== -1 ? value : 'en';
}

function msg(tone, titleKey, detailKey, params) {
  return {
    tone,
    title: I18n.t(lang, titleKey, params),
    detail: detailKey ? I18n.t(lang, detailKey, params) : '',
  };
}

function authMessage(raw) {
  return Object.assign(msg('error', 'main.auth.title', 'main.auth.detail'), { raw });
}

function networkMessage(raw) {
  return Object.assign(msg('error', 'main.network.title', 'main.network.detail'), { raw });
}

function needPullMessage(raw) {
  return Object.assign(msg('warn', 'main.needPull.title', 'main.needPull.detail'), { raw });
}

function conflictMessage(raw) {
  return Object.assign(msg('warn', 'main.conflict.title', 'main.conflict.detail'), { raw });
}

function identityMessage(raw) {
  return Object.assign(msg('warn', 'main.identity.title', 'main.identity.detail'), { raw });
}

function noUpstreamMessage(raw) {
  return Object.assign(msg('info', 'main.noUpstream.title', 'main.noUpstream.detail'), { raw });
}

function repoNotFoundMessage(raw) {
  return Object.assign(msg('error', 'main.repoNotFound.title', 'main.repoNotFound.detail'), { raw });
}

function emptyRepoMessage(raw) {
  return Object.assign(msg('info', 'main.emptyRepo.title', 'main.emptyRepo.detail'), { raw });
}

function nothingToCommitMessage(raw) {
  return Object.assign(msg('info', 'main.nothingToCommit.title', 'main.nothingToCommit.detail'), { raw });
}

function friendlyError(result, fallbackTitleKey) {
  const raw = ((result && (result.stderr || result.stdout)) || '').trim();
  const text = raw.toLowerCase();

  if (
    /authentication failed|could not read username|could not read password|terminal prompts disabled|permission denied|invalid username or password|401|403/.test(text)
  ) {
    return authMessage(raw);
  }
  if (/could not resolve host|failed to connect|unable to access|connection timed out|network is unreachable|connection refused/.test(text)) {
    return networkMessage(raw);
  }
  if (/non-fast-forward|fetch first|rejected|updates were rejected|not possible to fast-forward|diverged|behind its remote/.test(text)) {
    return needPullMessage(raw);
  }
  if (/conflict|automatic merge failed/.test(text)) {
    return conflictMessage(raw);
  }
  if (/empty ident|please tell me who you are|author identity unknown/.test(text)) {
    return identityMessage(raw);
  }
  if (/no configured push destination|no upstream branch|no tracking information|does not have any commits yet|has no commits yet/.test(text)) {
    return noUpstreamMessage(raw);
  }
  if (/repository not found|does not appear to be a git repository|not found/.test(text)) {
    return repoNotFoundMessage(raw);
  }
  if (/nothing to commit|no changes added to commit/.test(text)) {
    return nothingToCommitMessage(raw);
  }

  const title = I18n.t(lang, fallbackTitleKey || 'main.generic.title');
  return {
    tone: 'error',
    title,
    detail: raw || I18n.t(lang, 'main.generic.detail'),
    raw,
  };
}

function describeStatus(data) {
  if (!data) {
    return msg('info', 'main.status.checking.title', 'main.status.checking.detail');
  }

  const changes = data.changes || [];
  const count = changes.length;
  const hasChanges = count > 0;
  const behind = data.behind > 0;
  const ahead = data.ahead > 0;

  if (!data.upstream) {
    if (hasChanges) {
      return msg('info', 'main.status.notConnectedHasChanges.title', 'main.status.notConnectedHasChanges.detail', { count });
    }
    return msg('info', 'main.status.notConnectedClean.title', 'main.status.notConnectedClean.detail');
  }

  if (hasChanges && behind) {
    return msg('warn', 'main.status.bothChanged.title', 'main.status.bothChanged.detail', { count, behind: data.behind });
  }

  if (behind) {
    return msg('info', 'main.status.behind.title', 'main.status.behind.detail', { behind: data.behind });
  }

  if (hasChanges || ahead) {
    return msg('info', 'main.status.aheadOrChanges.title', 'main.status.aheadOrChanges.detail', { count });
  }

  return msg('ok', 'main.status.upToDate.title', 'main.status.upToDate.detail');
}

module.exports = {
  setLanguage,
  friendlyError,
  describeStatus,
};
