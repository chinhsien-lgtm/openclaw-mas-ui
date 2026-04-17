window.renderApps = function renderApps(apps, ip) {
            const list = document.getElementById('app-list');
            if (apps.length === 0) {
                list.innerHTML = '<div style="text-align:center; color:#888; padding:20px;">No deployed apps found running on ports 8000-9999.</div>';
                return;
            }
            
            list.innerHTML = apps.map(app => `
                <div style="background:rgba(0,0,0,0.5); border:1px solid #444; padding:10px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="flex-grow:1; overflow:hidden;">
                        <div style="color:#4ade80; font-weight:bold; font-size:16px;">Port ${app.port}</div>
                        <div style="color:#aaa; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${app.cmd}">${app.cmd}</div>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <a href="http://${ip}:${app.port}" target="_blank" style="background:#2563eb; color:white; text-decoration:none; padding:6px 12px; border-radius:4px; font-size:12px; font-weight:bold;">Open URL</a>
                        <button onclick="showGithubModal(${app.pid})" style="background:#34d399; color:#000; border:none; padding:6px 12px; border-radius:4px; font-size:12px; font-weight:bold; cursor:pointer;">Push to GitHub</button>
                        <button onclick="killApp(${app.pid})" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:4px; font-size:12px; font-weight:bold; cursor:pointer;">Destroy</button>
                    </div>
                </div>
            `).join('');
        };

window.killApp = async function killApp(pid) {
            if(!await customConfirm('Are you sure you want to destroy this app process?')) return;
            await fetch('/api/apps/kill', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pid })
            });
            window.showAppManager(); // Refresh list
        };

window.showAppManager = async function showAppManager() {
            document.getElementById('app-manager-modal').style.display = 'flex';
            document.getElementById('app-list').innerHTML = '<div style="text-align:center; color:#aaa;">Scanning ports...</div>';
            try {
                const res = await fetch('/api/apps');
                const data = await res.json();
                renderApps(data.apps || [], data.ip || 'localhost');
            } catch(e) {
                document.getElementById('app-list').innerHTML = '<div style="color:#ff4444;">Failed to load apps.</div>';
            }
        };

window.scanApps = function() {
            if (typeof window.showAppManager === 'function') window.showAppManager();
        };

