window.sendBroadcast = async function sendBroadcast() {
            const input = document.getElementById('chat-input');
            if (!input) return;
            const val = input.value.trim();
            if(!val) return;
            input.value = '';
            
            const selector = document.getElementById('project-selector');
            const currentProject = (selector && selector.value !== 'new') ? selector.value : '';
            
            try {
                await fetch('/api/chat', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        message: val,
                        target: window.MAS_STATE.currentView === 'GLOBAL' ? null : window.MAS_STATE.currentView,
                        project: currentProject
                    })
                });
            } catch(e) {
                console.error('Failed to send', e);
            }
        };

window.appendLog = function appendLog(log) {
            const div = document.createElement('div');
            let className = 'msg ';
            
            if (log.from === 'Boss') className += 'msg-boss';
            else if (log.from === 'System') className += 'msg-system';
            else if (log.type === 'thought') className += 'msg-thought';
            else className += 'msg-agent'; 
            
            div.className = className;
            
            let header = log.from;
            if (log.type === 'direct') header = `${log.from} ▶ ${log.to}`;
            if (log.type === 'thought') header = `<span class="thought-icon">💭</span>${log.from}'s Thought`;
            
            let text = log.text || '';
            text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
            div.innerHTML = `<div class="sender-name">${header}</div>${text}`;
            chatLog.appendChild(div);
            window.scrollToBottom();
        };

window.scrollToBottom = function scrollToBottom() {
            const cl = document.getElementById('chat-log');
            if (cl) cl.scrollTop = cl.scrollHeight;
        };

window.renderLogs = function renderLogs() {
            chatLog.innerHTML = '';
            window.MAS_STATE.allLogs.forEach(log => {
                const isRelevant = 
                    (window.MAS_STATE.currentView === 'GLOBAL' && (log.type === 'global' || log.type === 'direct')) || 
                    (window.MAS_STATE.currentView !== 'GLOBAL' && (log.from === window.MAS_STATE.currentView || log.to === window.MAS_STATE.currentView));
                
                if (isRelevant) window.appendLog(log);
            });
            window.scrollToBottom();
        };

window.clearLogs = async function clearLogs() {
            const selector = document.getElementById('project-selector');
            const currentProject = (selector && selector.value !== 'new') ? selector.value : '';
            
            if(!confirm('Are you sure you want to CLEAR ALL CHAT RECORDS for project: ' + (currentProject || 'GLOBAL') + '?')) return;
            try {
                await fetch('/api/clear', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ project: currentProject })
                });
                const cl = document.getElementById('chat-log');
                if (cl) cl.innerHTML = '';
            } catch(e) { console.error('Failed to clear', e); }
        };

window.toggleChat = function toggleChat() {
            document.getElementById('left-panel').classList.toggle('expanded');
            if (document.getElementById('left-panel').classList.contains('expanded')) {
                document.getElementById('toggle-icon').innerText = '▼';
                document.getElementById('chat-badge').style.display = 'none';
            } else {
                document.getElementById('toggle-icon').innerText = '▲';
            }
        };

window.toggleInputSize = function toggleInputSize() {
            const inputEl = document.getElementById('chat-input');
            const btn = document.getElementById('expand-btn');
            if (!inputEl || !btn) return;
            if (inputEl.style.height === '50px' || !inputEl.style.height) {
                inputEl.style.height = '150px';
                btn.style.bottom = '112px';
            } else {
                inputEl.style.height = '50px';
                btn.style.bottom = '12px';
            }
        };

window.setView = function setView(viewName) {
            window.MAS_STATE.currentView = viewName;
            if (window.MAS_STATE.currentView === 'GLOBAL') {
                const oldSelector = document.getElementById('project-selector');
                const selectedVal = oldSelector ? oldSelector.value : '';
                document.getElementById('chat-header').innerHTML = `<div style="display:flex; flex-direction:column; width:100%; gap:8px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                            <div style="display:flex; align-items:center; gap:10px;">
                                <span>📢 Company Broadcast</span><div class="status-dot"></div>
                            </div>
                            <button onclick="event.stopPropagation(); showAppManager()" style="background:#4ade80; color:#000; border:none; padding:4px 8px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:12px;">🌐 Active Apps</button>
                        </div>
                        <div id="project-selector-wrapper" style="position:relative; width:100%;">
                            <input type="hidden" id="project-selector" value="${selectedVal}">
                        </div>
                    </div>`;
                document.getElementById('chat-header').style.cursor = 'default';
                document.getElementById('chat-input').placeholder = "Enter requirements... (Shift+Enter for new line)";
                renderCustomDropdown(selectedVal);
            } else {
                document.getElementById('chat-header').innerHTML = `<div style="display:flex; flex-direction:column; gap:8px; width:100%;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="display:flex; align-items:center; gap:10px;">
                                <span onclick="setView('GLOBAL')" style="cursor:pointer; background:rgba(255,255,255,0.1); padding:4px 8px; border-radius:4px; font-size:14px; text-decoration:none;">◀ Back</span> 
                                <span>💬 ${window.MAS_STATE.currentView}</span>
                                <button onclick="viewAgentLog(window.MAS_STATE.currentView)" style="background: #34495e; padding: 4px 8px; border-radius: 4px; color: white; font-size: 12px; border:none; cursor:pointer;">📋 View Progress Log</button>
                            </div>
                            <button onclick="showAppManager()" style="background:#4ade80; color:#000; border:none; padding:4px 8px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:12px;">🌐 Active Apps</button>
                        </div>
                    </div>`;
                document.getElementById('chat-header').style.cursor = 'default';
                document.getElementById('chat-input').placeholder = `Assign task to ${window.MAS_STATE.currentView}... (Shift+Enter for new line)`;
            }

            if (window.innerWidth <= 768 && !document.getElementById('left-panel').classList.contains('expanded')) {
                toggleChat();
            }
            window.renderLogs();
        };

