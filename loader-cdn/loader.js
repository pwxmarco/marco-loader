// ============================================
// LOADER.JS - MAIN LOADER
// GitHub पर: loader-public repo में
// ============================================

console.log('🚀 Main Loader Started');

(function() {
  const API = 'https://js-injection-server.onrender.com'; // ← अपना URL डालो
  let token = null;
  let verifyInterval = null;

  console.log('📍 API Server:', API);

  // ==================== STORAGE ====================
  function getToken() {
    try {
      return sessionStorage.getItem('pw_marco_token');
    } catch(e) {
      return null;
    }
  }

  function setToken(t) {
    try {
      sessionStorage.setItem('pw_marco_token', t);
    } catch(e) {}
  }

  function clearToken() {
    try {
      sessionStorage.removeItem('pw_marco_token');
    } catch(e) {}
  }

  // ==================== POPUP ====================
  function showPopup() {
    // Check if popup already exists
    if (document.getElementById('pw-marco-popup')) return;

    console.log('📱 Showing popup...');

    const overlay = document.createElement('div');
    overlay.id = 'pw-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 999998;
    `;

    const popup = document.createElement('div');
    popup.id = 'pw-marco-popup';
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 40px;
      border-radius: 15px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
      z-index: 999999;
      text-align: center;
      font-family: 'Segoe UI', Arial, sans-serif;
      max-width: 500px;
      width: 90%;
    `;

    popup.innerHTML = `
      <div style="margin-bottom: 20px;">
        <div style="font-size: 48px; margin-bottom: 10px;">🔑</div>
        <h2 style="margin: 0; color: #333; font-size: 24px;">Generate Access Key</h2>
      </div>
      
      <p style="color: #666; margin: 15px 0; font-size: 14px; line-height: 1.5;">
        Click the button below to authenticate and access the app
      </p>
      
      <button id="pw-gen-btn" style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 14px 40px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        width: 100%;
        transition: all 0.3s;
      " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
        Generate Key
      </button>
      
      <p id="pw-status" style="
        color: #e74c3c;
        margin-top: 15px;
        font-size: 13px;
        min-height: 20px;
      "></p>
      
      <p style="
        color: #999;
        font-size: 12px;
        margin-top: 20px;
        border-top: 1px solid #eee;
        padding-top: 15px;
      ">
        Your device will be registered and verified
      </p>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    document.getElementById('pw-gen-btn').onclick = generateKey;
  }

  // ==================== GENERATE KEY ====================
  async function generateKey() {
    try {
      const btn = document.getElementById('pw-gen-btn');
      const status = document.getElementById('pw-status');

      btn.disabled = true;
      btn.textContent = '⏳ Processing...';
      status.textContent = '';

      console.log('🔄 Generating key...');

      const response = await fetch(`${API}/api/generate-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      console.log('Response:', data);

      if (response.ok && data.token) {
        token = data.token;
        setToken(token);
        console.log('✅ Key generated successfully');

        // Remove popup
        const popup = document.getElementById('pw-marco-popup');
        const overlay = document.getElementById('pw-overlay');
        if (popup) popup.remove();
        if (overlay) overlay.remove();

        // Start verification
        startVerification();
        
        // Inject main.js
        injectMainJS();

      } else {
        console.error('❌ Error:', data.error);
        status.textContent = `❌ ${data.error || 'Error generating key'}`;
        btn.disabled = false;
        btn.textContent = 'Generate Key';
      }

    } catch (error) {
      console.error('❌ Exception:', error);
      document.getElementById('pw-status').textContent = '❌ Network error. Try again.';
      document.getElementById('pw-gen-btn').disabled = false;
      document.getElementById('pw-gen-btn').textContent = 'Generate Key';
    }
  }

  // ==================== INJECT MAIN.JS ====================
  async function injectMainJS() {
    try {
      console.log('📥 Fetching main.js...');

      const response = await fetch(`${API}/api/get-main-js?token=${token}`);

      if (response.ok) {
        const code = await response.text();
        console.log('✅ main.js received:', code.length, 'bytes');

        const script = document.createElement('script');
        script.id = 'pw-main-script';
        script.textContent = code;
        document.body.appendChild(script);

        console.log('✅ main.js injected successfully!');
      } else {
        console.error('❌ Failed to fetch main.js:', response.status);
      }
    } catch (error) {
      console.error('❌ Injection error:', error);
    }
  }

  // ==================== VERIFICATION ====================
  function startVerification() {
    console.log('🔍 Starting verification (every 3 seconds)');

    verifyInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API}/api/verify-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        if (!response.ok) {
          const data = await response.json();
          console.warn('⚠️ Token invalid:', data.reason);
          handleTokenInvalid(data.reason);
        } else {
          console.log('✅ Token valid');
        }
      } catch (error) {
        console.error('❌ Verification error:', error);
      }
    }, 3000);
  }

  // ==================== HANDLE INVALID TOKEN ====================
  function handleTokenInvalid(reason) {
    console.log('🔴 Token invalid. Reason:', reason);
    
    clearToken();
    token = null;
    clearInterval(verifyInterval);

    let message = 'Your access has been revoked';
    
    if (reason === 'device_banned') {
      message = '🚫 Your device has been banned';
    } else if (reason === 'access_revoked') {
      message = '🚫 Your access has been revoked by admin';
    }

    alert(`${message}\n\nRedirecting...`);
    
    // Redirect to homepage
    window.location.href = 'https://homepage-pw-marco.netlify.app';
  }

  // ==================== ON PAGE LOAD ====================
  function initLoader() {
    console.log('📄 Initializing loader...');

    const existingToken = getToken();

    if (existingToken) {
      console.log('✅ Token found in storage');
      token = existingToken;
      startVerification();
      injectMainJS();
    } else {
      console.log('❌ No token found, showing popup');
      showPopup();
    }
  }

  // Start when document is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoader);
  } else {
    initLoader();
  }

  // ==================== ON PAGE UNLOAD ====================
  window.addEventListener('beforeunload', () => {
    clearToken();
    clearInterval(verifyInterval);
  });

  // ==================== ON TAB VISIBILITY CHANGE ====================
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      console.log('📵 Page hidden');
      clearInterval(verifyInterval);
    } else {
      console.log('📱 Page visible again');
      if (token && !verifyInterval) {
        startVerification();
      }
    }
  });

})();
