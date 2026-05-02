(function () {
  "use strict";

  var currentScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  var API_BASE = (currentScript && currentScript.getAttribute("data-api")) || "";
  if (!API_BASE) { console.warn("[marco] data-api attribute missing on loader script tag"); return; }
  API_BASE = API_BASE.replace(/\/$/, "");

  var HOMEPAGE = "https://homepage-pw-marco.netlify.app";
  var TOKEN_KEY = "marco_access_token";
  var DEVICE_KEY = "marco_device_id";
  var HEARTBEAT_INTERVAL = 2500;
  var pollTimer = null;
  var heartbeatTimer = null;
  var overlay = null;
  var isBlocked = false;

  function getFingerprint() {
    var nav = navigator;
    var raw = [
      nav.userAgent, nav.language,
      screen.width + "x" + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      !!nav.cookieEnabled, !!window.indexedDB, !!window.sessionStorage,
    ].join("|");
    var hash = 0;
    for (var i = 0; i < raw.length; i++) {
      var ch = raw.charCodeAt(i);
      hash = (hash << 5) - hash + ch;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36) + "-" + nav.userAgent.length.toString(36);
  }

  function getToken() { return sessionStorage.getItem(TOKEN_KEY); }
  function setToken(t) { sessionStorage.setItem(TOKEN_KEY, t); }
  function clearToken() { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(DEVICE_KEY); }

  function escHtml(str) {
    return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function showOverlay(message, reason, canRetry) {
    isBlocked = true;
    if (overlay) overlay.remove();
    overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui,sans-serif;color:#fff;text-align:center;padding:20px;box-sizing:border-box";
    var icon = canRetry ? "\uD83D\uDD12" : "\uD83D\uDEAB";
    var html = '<div style="max-width:400px;">';
    html += '<div style="font-size:48px;margin-bottom:16px;">' + icon + "</div>";
    html += '<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;">' + escHtml(message) + "</h2>";
    if (reason) html += '<p style="margin:0 0 24px;font-size:14px;opacity:0.7;line-height:1.5;">' + escHtml(reason) + "</p>";
    if (canRetry) html += '<button id="__marco_retry" style="background:#6366f1;color:#fff;border:none;padding:12px 28px;border-radius:8px;font-size:15px;cursor:pointer;font-weight:600;">Generate New Access Key</button>';
    html += "</div>";
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    if (canRetry) {
      document.getElementById("__marco_retry").addEventListener("click", function () {
        clearToken(); overlay.remove(); overlay = null; isBlocked = false; init();
      });
    }
  }

  function showGeneratePopup(onGenerated) {
    if (overlay) overlay.remove();
    overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui,sans-serif;color:#fff;text-align:center;padding:20px;box-sizing:border-box";
    overlay.innerHTML = [
      '<div style="max-width:420px;background:#111;border:1px solid #333;border-radius:16px;padding:40px 32px;">',
      '<div style="font-size:48px;margin-bottom:16px;">\uD83D\uDD11</div>',
      '<h2 style="margin:0 0 8px;font-size:24px;font-weight:700;">Access Required</h2>',
      '<p style="margin:0 0 28px;font-size:14px;opacity:0.6;line-height:1.6;">This content requires a valid access key.</p>',
      '<button id="__marco_gen" style="background:#6366f1;color:#fff;border:none;padding:14px 32px;border-radius:10px;font-size:16px;cursor:pointer;font-weight:700;width:100%;">Generate Access Key</button>',
      '<p id="__marco_status" style="margin:12px 0 0;font-size:13px;opacity:0.5;min-height:20px;"></p>',
      "</div>",
    ].join("");
    document.body.appendChild(overlay);
    document.getElementById("__marco_gen").addEventListener("click", function () {
      var btn = document.getElementById("__marco_gen");
      var status = document.getElementById("__marco_status");
      btn.disabled = true; btn.textContent = "Generating..."; status.textContent = "Verifying your device...";
      generateToken(function (err, token) {
        if (err) { btn.disabled = false; btn.textContent = "Try Again"; status.textContent = err; return; }
        status.textContent = "Access granted! Redirecting...";
        setTimeout(function () { overlay.remove(); overlay = null; onGenerated(token); }, 800);
      });
    });
  }

  function generateToken(callback) {
    var fingerprint = getFingerprint();
    fetchApi(API_BASE + "/api/token/generate", "POST", JSON.stringify({
      deviceFingerprint: fingerprint,
      deviceName: navigator.platform || "Unknown",
      userAgent: navigator.userAgent,
    }), function (err, data) {
      if (err) return callback(err);
      if (data.error) return callback(data.reason || data.error);
      setToken(data.token);
      if (data.deviceId) sessionStorage.setItem(DEVICE_KEY, data.deviceId);
      callback(null, data.token);
    });
  }

  function validateToken(token, callback) {
    fetchApi(API_BASE + "/api/token/validate", "POST", JSON.stringify({ token: token, deviceFingerprint: getFingerprint() }), function (err, data) {
      if (err) return callback(false, "Network error", "expired");
      callback(data.valid, data.reason, data.status);
    });
  }

  function sendHeartbeat(token) {
    fetchApi(API_BASE + "/api/token/heartbeat", "POST", JSON.stringify({
      token: token, deviceFingerprint: getFingerprint(), currentUrl: location.href,
    }), function (err, data) {
      if (err || !data || !data.valid) {
        if (pollTimer) clearInterval(pollTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        var reason = (data && data.reason) ? data.reason : "Session ended";
        var status = (data && data.status) ? data.status : "expired";
        var canRetry = status !== "banned";
        var msg = status === "banned" ? "Device Banned" : status === "revoked" ? "Access Revoked" : "Session Expired";
        clearToken();
        showOverlay(msg, reason, canRetry);
        setTimeout(function () { location.href = HOMEPAGE; }, canRetry ? 1500 : 2500);
      }
    });
  }

  function startPolling(token) {
    if (pollTimer) clearInterval(pollTimer);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(function () { if (!isBlocked) sendHeartbeat(token); }, HEARTBEAT_INTERVAL);
    pollTimer = setInterval(function () {
      if (isBlocked) return;
      validateToken(token, function (valid, reason, status) {
        if (!valid) {
          clearInterval(pollTimer); clearInterval(heartbeatTimer);
          var canRetry = status !== "banned";
          var msg = status === "banned" ? "Device Banned" : status === "revoked" ? "Access Revoked" : "Session Expired";
          clearToken(); showOverlay(msg, reason, canRetry);
          setTimeout(function () { location.href = HOMEPAGE; }, canRetry ? 1500 : 2500);
        }
      });
    }, 2500);
  }

  function injectMainJs() {
    var token = getToken();
    if (!token) return;
    var s = document.createElement("script");
    s.src = API_BASE + "/api/main.js?t=" + Date.now();
    s.setAttribute("data-marco-token", token);
    s.crossOrigin = "anonymous";
    (document.head || document.documentElement).appendChild(s);
  }

  function fetchApi(url, method, body, callback) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.timeout = 8000;
      xhr.ontimeout = function () { callback("Request timed out"); };
      xhr.onerror = function () { callback("Network error"); };
      xhr.onload = function () {
        try { callback(null, JSON.parse(xhr.responseText)); }
        catch (e) { callback("Invalid response"); }
      };
      xhr.send(body || null);
    } catch (e) { callback("Request failed"); }
  }

  function init() {
    var existingToken = getToken();
    if (!existingToken) {
      showGeneratePopup(function (token) { startPolling(token); injectMainJs(); location.href = HOMEPAGE; });
      return;
    }
    validateToken(existingToken, function (valid, reason, status) {
      if (!valid) {
        clearToken();
        var canRetry = status !== "banned";
        var msg = status === "banned" ? "Device Banned" : status === "revoked" ? "Access Revoked" : "Session Expired";
        showOverlay(msg, reason, canRetry);
        setTimeout(function () { location.href = HOMEPAGE; }, canRetry ? 1500 : 2500);
        return;
      }
      startPolling(existingToken); injectMainJs();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
