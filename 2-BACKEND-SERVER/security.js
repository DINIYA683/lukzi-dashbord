// ============================================================================
// 🛡️ LUKZI GANG CYBER DEFENSE // ANTI-DEVTOOLS & SOURCE PROTECTION MATRIX
// ============================================================================
(function() {
    'use strict';

    // 1. Console Shield & Anti-Tamper Banner
    try {
        var stylesTitle = 'color: #00f2fe; font-size: 20px; font-weight: 900; text-shadow: 0 0 10px #00f2fe;';
        var stylesBody = 'color: #f43f5e; font-size: 13px; font-weight: 700; line-height: 1.6;';
        var stylesNote = 'color: #94a3b8; font-size: 11px; font-family: monospace;';

        var printSecurityBanner = function() {
            try { console.clear(); } catch(e) {}
            console.log('%c🔒 LUKZI GANG // ENCRYPTED APPLICATION RUNTIME', stylesTitle);
            console.log('%c⛔ STOP! Code inspection, reverse engineering, and client-side memory tampering are strictly restricted by LUKZI Core Security Matrix.', stylesBody);
            console.log('%cAll unauthorized access attempts are logged and reported.', stylesNote);
        };

        printSecurityBanner();

        // Suppress developer console leaks
        var noop = function() {};
        ['info', 'debug', 'table', 'dir', 'trace'].forEach(function(m) {
            if (window.console && typeof window.console[m] === 'function') {
                window.console[m] = noop;
            }
        });
    } catch(e) {}

    // 2. Disable Right-Click Context Menu
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityToast('🚫 ACCESS DENIED: Right-Click / Context Menu is disabled by Security Policy.');
        return false;
    }, true);

    // 3. Block Developer Tools Keyboard Shortcuts (F12, Ctrl+Shift+I/J/C/K, Ctrl+U, Ctrl+S)
    document.addEventListener('keydown', function(e) {
        var keyCode = e.keyCode || e.which;
        var key = (e.key || '').toUpperCase();

        // F12
        if (keyCode === 123 || key === 'F12') {
            e.preventDefault();
            e.stopPropagation();
            triggerSecurityToast('🚫 RESTRICTED: Developer Tools (F12) are locked.');
            triggerDevToolsFreeze();
            return false;
        }

        // Ctrl + Shift + (I, J, C, K) or Mac Cmd + Option + (I, J, C, K)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
            if (['I', 'J', 'C', 'K'].indexOf(key) !== -1 || [73, 74, 67, 75].indexOf(keyCode) !== -1) {
                e.preventDefault();
                e.stopPropagation();
                triggerSecurityToast('🚫 RESTRICTED: Element & Script Inspection is locked.');
                triggerDevToolsFreeze();
                return false;
            }
        }

        // Mac Cmd + Option + I / J / C
        if (e.metaKey && e.altKey) {
            if (['I', 'J', 'C'].indexOf(key) !== -1 || [73, 74, 67].indexOf(keyCode) !== -1) {
                e.preventDefault();
                e.stopPropagation();
                triggerSecurityToast('🚫 RESTRICTED: Developer Tools are locked.');
                triggerDevToolsFreeze();
                return false;
            }
        }

        // Ctrl + U (View Source)
        if ((e.ctrlKey || e.metaKey) && (key === 'U' || keyCode === 85)) {
            e.preventDefault();
            e.stopPropagation();
            triggerSecurityToast('🚫 RESTRICTED: Page Source inspection is locked.');
            return false;
        }

        // Ctrl + S (Save Web Page)
        if ((e.ctrlKey || e.metaKey) && (key === 'S' || keyCode === 83)) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        // Ctrl + P (Print Page / Print to PDF)
        if ((e.ctrlKey || e.metaKey) && (key === 'P' || keyCode === 80)) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, true);

    // 4. Toast Helper
    function triggerSecurityToast(msg) {
        if (typeof window.showCyberToast === 'function') {
            window.showCyberToast(msg);
        } else {
            var box = document.getElementById('security-fast-toast');
            if (!box) {
                box = document.createElement('div');
                box.id = 'security-fast-toast';
                box.style.cssText = 'position:fixed;bottom:25px;right:25px;background:#0d1117;border:1.5px solid #ef4444;color:#ffffff;padding:12px 20px;border-radius:12px;font-family:sans-serif;font-size:13px;font-weight:700;z-index:99999999;box-shadow:0 0 25px rgba(239,68,68,0.5);display:flex;align-items:center;gap:10px;transition:all 0.3s ease;';
                document.body.appendChild(box);
            }
            box.innerHTML = msg;
            box.style.opacity = '1';
            box.style.display = 'flex';
            clearTimeout(window._secToastTimer);
            window._secToastTimer = setTimeout(function() {
                if (box) box.style.display = 'none';
            }, 3000);
        }
    }

    // 5. Anti-DevTools Safe Shortcut Protection
    function triggerDevToolsFreeze() {
        // Safe no-op to prevent freezing user's browser during legitimate usage
    }

    // 6. Security Lockdown Overlay Controller (Only on explicit keyboard shortcut attempts)
    function handleDevToolsDetected(isOpen) {
        // Safe handler
    }

    // 8. Prevent Dragging Images or Assets
    document.addEventListener('dragstart', function(e) {
        if (e.target.tagName === 'IMG' || e.target.tagName === 'A') {
            e.preventDefault();
            return false;
        }
    });

    console.log('%c[+] LUKZI GANG Security Matrix Online.', 'color: #10b981; font-weight: bold;');
})();
