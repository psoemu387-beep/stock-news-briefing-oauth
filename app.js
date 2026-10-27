'use strict';
// No external libraries, analytics, network fetches, token exchange or logging.
const storageKey = 'stock-news-briefing-oauth';
const status = document.getElementById('status');
const redirect = location.origin + location.pathname;
const params = new URLSearchParams(location.search);
// Remove OAuth parameters before any navigation/copy. Do not render them as HTML.
history.replaceState(null, '', redirect);
document.getElementById('redirect').textContent = redirect;
let code = null;

if (params.has('code') || params.has('error')) {
  let pending = null;
  try {
    pending = JSON.parse(sessionStorage.getItem(storageKey));
    sessionStorage.removeItem(storageKey);
  } catch (_) { /* fail closed */ }
  if (!pending || params.get('state') !== pending.state || pending.redirect !== redirect ||
      !Number.isFinite(pending.started) || Date.now() - pending.started > 10 * 60 * 1000) {
    status.textContent = '인증 상태를 확인할 수 없습니다. 이 탭에서 새로 로그인하세요.';
  } else if (params.has('error') || !params.get('code')) {
    status.textContent = '동의가 완료되지 않았습니다. 다시 로그인하세요.';
  } else {
    code = params.get('code');
    document.getElementById('start').hidden = true;
    document.getElementById('result').hidden = false;
    status.textContent = '로그인 완료. 토큰 교환은 아직 실행되지 않았습니다.';
  }
}
// Drop a second in-memory copy; never put the code in DOM or persistent storage.
params.delete('code');
params.delete('state');
params.delete('error');

document.getElementById('login').addEventListener('click', () => {
  const key = document.getElementById('key').value.trim();
  if (!key) {
    status.textContent = 'REST API 키를 입력하세요.';
    return;
  }
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const state = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  try {
    sessionStorage.setItem(storageKey, JSON.stringify({state, redirect, started: Date.now()}));
  } catch (_) {
    status.textContent = '이 인증은 sessionStorage가 필요합니다. 브라우저 설정을 확인하세요.';
    return;
  }
  const url = new URL('https://kauth.kakao.com/oauth/authorize');
  url.search = new URLSearchParams({client_id: key, redirect_uri: redirect,
                                   response_type: 'code', scope: 'talk_message', state});
  document.getElementById('key').value = '';
  location.assign(url.href);
});

document.getElementById('copy').addEventListener('click', async () => {
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    status.textContent = '복사했습니다. GitHub Secret 입력란에만 붙여 넣고 즉시 수동 워크플로를 실행하세요.';
  } catch (_) {
    status.textContent = '복사 권한이 필요합니다. 브라우저의 클립보드 권한을 확인하세요.';
  }
});
window.addEventListener('pagehide', () => { code = null; });
