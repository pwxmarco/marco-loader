// ============================================
// LOADER.JS v3.0 — GitHub loader-public repo
// ============================================
(function () {

  var API = 'https://js-injection-server.onrender.com';

  var _token = null;
  var _verifyTimer = null;

  function _getToken()  { try { return localStorage.getItem('_pw_tk'); } catch(e){ return null; } }
  function _saveToken(t){ try { localStorage.setItem('_pw_tk', t); } catch(e){} }
  function _delToken()  { try { localStorage.removeItem('_pw_tk'); } catch(e){} }

  function _hideLoader() {
    var el = document.getElementById('_pw_ls');
    if (!el) return;
    el.style.transition = 'opacity 0.5s ease';
    el.style.opacity = '0';
    setTimeout(function(){ if(el) el.remove(); }, 550);
  }

  function _css() {
    if (document.getElementById('_pw_css')) return;
    var s = document.createElement('style');
    s.id = '_pw_css';
    s.textContent = '@keyframes _pfi{from{opacity:0;transform:translate(-50%,-48%)scale(0.93)}to{opacity:1;transform:translate(-50%,-50%)scale(1)}}@keyframes _poi{from{opacity:0}to{opacity:1}}#_pw_ov{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);backdrop-filter:blur(12px);z-index:2147483646;animation:_poi .3s ease}#_pw_bx{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(145deg,#1a1a2e,#16213e);border:1px solid rgba(102,126,234,0.2);border-radius:22px;padding:36px 28px;z-index:2147483647;text-align:center;font-family:"Segoe UI",Arial,sans-serif;max-width:400px;width:92%;box-shadow:0 30px 80px rgba(0,0,0,0.7);animation:_pfi .35s cubic-bezier(0.34,1.56,0.64,1);color:#e2e8f0}._pi{font-size:50px;display:block;margin-bottom:12px}._pt{font-size:21px;font-weight:800;margin:0 0 10px;background:linear-gradient(135deg,#667eea,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}._pd{color:rgba(255,255,255,0.5);font-size:13px;line-height:1.65;margin:0 0 20px}._pb{display:inline-block;background:rgba(248,113,113,0.12);border:1px solid rgba(248,113,113,0.3);color:#f87171;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:16px}._btn{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;padding:14px 0;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;width:100%;margin-bottom:8px;transition:all .3s;box-shadow:0 4px 20px rgba(102,126,234,0.35)}._btn:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(102,126,234,0.55)}._btn:disabled{opacity:.45;cursor:not-allowed;transform:none}._hr{border:none;border-top:1px solid rgba(255,255,255,0.06);margin:16px 0 12px}._fn{color:rgba(255,255,255,0.25);font-size:11px;line-height:1.5}._er{color:#f87171;font-size:12px;margin-top:10px;min-height:16px}';
    (document.head || document.documentElement).appendChild(s);
  }

  function _rmPopup() {
    ['_pw_ov','_pw_bx'].forEach(function(id){
      var el = document.getElementById(id); if(el) el.remove();
    });
  }

  function _showKeyPopup() {
    _rmPopup(); _css();
    var ov = document.createElement('div'); ov.id = '_pw_ov';
    var bx = document.createElement('div'); bx.id = '_pw_bx';
    bx.innerHTML = '<span class="_pi">🔐</span><h2 class="_pt">Access Required</h2><p class="_pd">Ek baar key generate karo — sari allowed sites pe valid rahegi.</p><button id="_pw_gb" class="_btn">⚡ Generate Access Key</button><p id="_pw_er" class="_er"></p><hr class="_hr"><p class="_fn">🛡️ Device register hoga. VPN allowed nahi hai.</p>';
    document.body.appendChild(ov);
    document.body.appendChild(bx);
    document.getElementById('_pw_gb').onclick = _genKey;
  }

  function _alert(icon, title, badge, desc, newKeyBtn) {
    _rmPopup(); _css();
    var ov = document.createElement('div'); ov.id = '_pw_ov';
    var bx = document.createElement('div'); bx.id = '_pw_bx';
    var h = ['<span class="_pi">'+icon+'</span>','<h2 class="_pt">'+title+'</h2>'];
    if(badge) h.push('<div class="_pb">'+badge+'</div>');
    h.push('<p class="_pd">'+desc+'</p>');
    if(newKeyBtn) h.push('<button id="_pw_nk" class="_btn">🔄 Generate New Key</button>');
    h.push('<hr class="_hr"><p class="_fn">Admin se contact karo agar galti lage.</p>');
    bx.innerHTML = h.join('');
    document.body.appendChild(ov);
    document.body.appendChild(bx);
    if(newKeyBtn){
      document.getElementById('_pw_nk').onclick = function(){
        _delToken(); _token = null;
        location.href = 'https://homepage-pw-marco.netlify.app';
      };
    }
  }

  async function _genKey() {
    var btn = document.getElementById('_pw_gb');
    var er  = document.getElementById('_pw_er');
    btn.disabled = true; btn.textContent = '⏳ Verifying...';
    if(er) er.textContent = '';
    try {
      var res  = await fetch(API+'/api/generate-key',{method:'POST',headers:{'Content-Type':'application/json'}});
      var data = await res.json();
      if(data.reason === 'vpn_detected'){
        _alert('🚫','VPN Detected','⚠️ VPN / Proxy Blocked','VPN ya Proxy detect hua.<br>Disable karo aur dobara try karo.',false);
        return;
      }
      if(data.reason === 'device_banned'){
        _alert('🚫','Device Banned','🔒 Permanent Ban','Tumhara device permanently ban hai.',false);
        return;
      }
      if(res.ok && data.token){
        _token = data.token; _saveToken(_token);
        _rmPopup(); _showLoader();
        _startVerify();
        await _inject();
        setTimeout(_hideLoader, 4500);
      } else {
        if(er) er.textContent = '❌ '+(data.error||'Error. Try again.');
        btn.disabled = false; btn.textContent = '⚡ Generate Access Key';
      }
    } catch(e){
      if(er) er.textContent = '❌ Network error.';
      btn.disabled = false; btn.textContent = '⚡ Generate Access Key';
    }
  }

  function _showLoader() {
    var el = document.getElementById('_pw_ls');
    if(el){ el.style.opacity='1'; return; }
    var s2 = document.createElement('style');
    s2.textContent='@keyframes _s2{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}@keyframes _p2{0%,100%{opacity:1}50%{opacity:0.3}}#_pw_ls{position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:"Segoe UI",Arial,sans-serif}#_pw_ls ._br{font-size:26px;font-weight:800;background:linear-gradient(135deg,#667eea,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:4px}#_pw_ls ._tg{color:rgba(255,255,255,0.3);font-size:10px;letter-spacing:2px;margin-bottom:32px;text-transform:uppercase}#_pw_ls ._sp{width:50px;height:50px;border:3px solid rgba(255,255,255,0.08);border-top:3px solid #667eea;border-radius:50%;animation:_s2 1s linear infinite;margin-bottom:18px}#_pw_ls ._lt{color:rgba(255,255,255,0.6);font-size:13px;letter-spacing:1px;text-transform:uppercase;animation:_p2 1.5s ease infinite}';
    (document.head||document.documentElement).appendChild(s2);
    var ls = document.createElement('div'); ls.id='_pw_ls';
    ls.innerHTML='<div class="_br">PW Marco</div><div class="_tg">Secure Access</div><div class="_sp"></div><div class="_lt">Loading App...</div>';
    document.documentElement.appendChild(ls);
  }

  async function _inject() {
    try {
      var res = await fetch(API+'/api/get-main-js?token='+_token);
      if(res.ok){
        var code = await res.text();
        var sc = document.createElement('script');
        sc.id = '_pw_main'; sc.textContent = code;
        document.body.appendChild(sc);
      }
    } catch(e){ console.error('Inject err:',e); }
  }

  function _startVerify() {
    if(_verifyTimer) clearInterval(_verifyTimer);
    _verifyTimer = setInterval(async function(){
      try {
        var res = await fetch(API+'/api/verify-token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:_token})});
        if(!res.ok){ var d = await res.json(); _onRevoke(d.reason,d.revokeReason); }
      } catch(e){}
    }, 3000);
  }

  function _onRevoke(reason, why) {
    clearInterval(_verifyTimer); _verifyTimer=null;
    _delToken(); _token=null;
    var sc=document.getElementById('_pw_main'); if(sc) sc.remove();
    var M={
      'access_revoked':['⛔','Access Revoked','📋 '+(why||'Admin action'),'Access revoke ho gaya.<br><b>Reason:</b> '+(why||'Admin ne revoke kiya')+'.',true],
      'device_banned' :['🚫','Device Banned','🔒 Permanent Ban','Device permanently ban hai.',false],
      'vpn_detected'  :['🚫','VPN Detected','⚠️ VPN/Proxy','VPN detect hua. Disable karo.',false],
      'token_expired' :['⏰','Key Expired','⏱ Session Over','Key expire ho gayi. Naya generate karo.',true],
    };
    var c=M[reason]||['⚠️','Access Blocked',reason||'Unknown','Access block ho gaya.',true];
    _alert(c[0],c[1],c[2],c[3],c[4]);
  }

  function _init() {
    var saved = _getToken();
    if(saved){
      _token = saved;
      fetch(API+'/api/verify-token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:saved})})
      .then(function(res){
        if(res.ok){
          _startVerify();
          _inject().then(function(){ setTimeout(_hideLoader,4500); });
        } else {
          return res.json().then(function(d){ _delToken(); _token=null; _hideLoader(); _onRevoke(d.reason,d.revokeReason); });
        }
      }).catch(function(){ _startVerify(); _inject().then(function(){ setTimeout(_hideLoader,4500); }); });
    } else {
      _hideLoader();
      if(document.body){ _showKeyPopup(); }
      else { document.addEventListener('DOMContentLoaded',_showKeyPopup); }
    }
  }

  _init();

  document.addEventListener('visibilitychange',function(){
    if(!document.hidden&&_token){ if(!_verifyTimer) _startVerify(); }
    else { if(_verifyTimer){ clearInterval(_verifyTimer); _verifyTimer=null; } }
  });

  // ⛔ beforeunload pe token clear NAHI

})();
