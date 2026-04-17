// Custom Dialog Logic
        
        






        // JWT Auth
                const API_TOKEN = localStorage.getItem('mas_auth_token');
        if (API_TOKEN) {
            document.getElementById('login-modal').style.display = 'none';
            setTimeout(() => { if (typeof loadProjects === 'function') loadProjects(); }, 100);
        } else {
            document.getElementById('login-user').focus();
        }


        // Add Bearer token to all fetch calls by overriding window.fetch
        const originalFetch = window.fetch;
        window.fetch = async function() {
            let [resource, config] = arguments;
            if(resource.startsWith('/api') && !resource.startsWith('/api/auth')) {
                if(config === undefined) { config = {}; }
                if(config.headers === undefined) { config.headers = {}; }
                config.headers['Authorization'] = 'Bearer ' + localStorage.getItem('mas_auth_token');
            }
            const res = await originalFetch(resource, config);
            if (res.status === 401) {
                localStorage.removeItem('mas_auth_token');
                document.getElementById('login-modal').style.display = 'flex';
                document.getElementById('login-modal').style.opacity = '1';
                document.getElementById('login-error').innerText = "Session expired, please login again.";
            }
            return res;
        };

        
        window.filterFileTree = function() {
            const input = document.getElementById('file-search-input');
            if (!input) return;
            const filter = input.value.toLowerCase();
            const container = document.getElementById('file-tree-content');
            if (!container) return;

            function traverse(node) {
                let hasMatch = false;
                const children = Array.from(node.children);
                
                // If it's a leaf node (file)
                if (node.classList && node.classList.contains('file-item') && !node.classList.contains('folder-item')) {
                    if (node.innerText.toLowerCase().includes(filter)) {
                        node.style.display = 'block';
                        hasMatch = true;
                    } else {
                        node.style.display = 'none';
                    }
                    return hasMatch;
                }
                
                // If it's a wrapper for a folder
                if (node.tagName === 'DIV' && !node.classList.contains('file-item')) {
                    const folderDiv = children[0]; // The folder label
                    const subContainer = children[1]; // The children container
                    
                    let childMatch = false;
                    if (subContainer) {
                        Array.from(subContainer.children).forEach(child => {
                            if (traverse(child)) childMatch = true;
                        });
                    }
                    
                    const selfMatch = folderDiv && folderDiv.innerText.toLowerCase().includes(filter);
                    
                    if (childMatch || selfMatch || filter === '') {
                        node.style.display = 'block';
                        if (subContainer) {
                            if (filter !== '') {
                                subContainer.style.display = 'block'; // Auto expand if searching
                            } else {
                                // Just leave it as is if filter is empty, or collapse it.
                                // Let's collapse so it resets cleanly.
                                subContainer.style.display = 'none';
                            }
                        }
                        hasMatch = true;
                    } else {
                        node.style.display = 'none';
                    }
                }
                return hasMatch;
            }
            
            Array.from(container.children).forEach(child => traverse(child));
        };

        window.loadFileTree = async function loadFileTree() {
            const selector = document.getElementById('project-selector');
            const proj = (selector && selector.value !== 'new') ? selector.value : '';
            try {
                const res = await fetch('/api/project/tree?project=' + encodeURIComponent(proj));
                const data = await res.json();
                if (data.success) {
                    renderTree(data.tree, document.getElementById('file-tree-content'));
                }
            } catch(e) {
                console.error(e);
            }
        }
        function renderTree(nodes, container) {
            if (!container) return;
            if (!nodes || nodes.length === 0) {
                container.innerHTML = '<div style="color:#888; padding:10px;">Empty directory</div>';
                return;
            }
            container.innerHTML = '';
            nodes.forEach(node => {
                const div = document.createElement('div');
                div.className = 'file-item ' + (node.type === 'directory' ? 'folder-item' : '');
                div.innerHTML = (node.type === 'directory' ? '📁 ' : '📄 ') + node.name;
                
                if (node.type === 'file') {
                    div.onclick = async (e) => {
                        e.stopPropagation();
                        try {
                            const selector = document.getElementById('project-selector');
                            const proj = (selector && selector.value !== 'new') ? selector.value : '';
                            const res = await fetch('/api/project/file?project=' + encodeURIComponent(proj) + '&path=' + encodeURIComponent(node.path));
                            const data = await res.json();
                            if(data.success) {
                                document.getElementById('doc-viewer-title').innerText = node.name;
                                const contentDiv = document.getElementById('doc-viewer-content');
                                contentDiv.innerHTML = '<pre><code>' + data.content.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code></pre>';
                                document.getElementById('doc-viewer-modal').style.display = 'flex';
                            }
                        } catch(e) { console.error(e); }
                    };
                    container.appendChild(div);
                } else {
                    const wrap = document.createElement('div');
                    wrap.appendChild(div);
                    const childContainer = document.createElement('div');
                    childContainer.style.paddingLeft = '15px';
                    childContainer.style.display = 'none';
                    renderTree(node.children, childContainer);
                    div.onclick = (e) => { 
                        e.stopPropagation();
                        childContainer.style.display = childContainer.style.display === 'none' ? 'block' : 'none'; 
                    };
                    wrap.appendChild(childContainer);
                    container.appendChild(wrap);
                }
            });
        }
        
        // Auto-refresh file tree occasionally or hook into loadProjects
        let bubbleTimeouts = {};
window.isInventoryExpanded = false;
        const socket = io();
        const chatLog = document.getElementById('chat-log');
        const input = document.getElementById('chat-input');
        const sandbox = document.getElementById('sandbox-container');
        const leftPanel = document.getElementById('left-panel');
        const inventoryBar = document.getElementById('inventory-bar');
        const chatHeader = document.getElementById('chat-header');
        
        
        
        
        
 // 'GLOBAL' or AgentName
        
        // ==========================================
        // CAMERA: Pan & Zoom Logic
        // ==========================================
        const viewport = document.getElementById('viewport');
        const world = document.getElementById('world');
        
        let scale = 1.0;
        const MIN_SCALE = 0.3;
        const MAX_SCALE = 2.0;
        const WORLD_W = 1200; 
        const WORLD_H = 800;

        let isDragging = false;
        let startX, startY;
        let translateX = 0, translateY = 0;
        let initialDistance = null;
        let initialScale = 1;

        function updateTransform() {
            const scaledWidth = WORLD_W * scale;
            const scaledHeight = WORLD_H * scale;
            
            const maxTx = 0;
            const minTx = Math.min(0, viewport.clientWidth - scaledWidth);
            const maxTy = 0;
            const minTy = Math.min(0, viewport.clientHeight - scaledHeight);
            
            if (scaledWidth < viewport.clientWidth) { translateX = (viewport.clientWidth - scaledWidth) / 2; }
            else { translateX = Math.max(minTx, Math.min(maxTx, translateX)); }
            
            if (scaledHeight < viewport.clientHeight) { translateY = (viewport.clientHeight - scaledHeight) / 2; } 
            else { translateY = Math.max(minTy, Math.min(maxTy, translateY)); }
            
            world.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        }

        window.onload = () => {
            const scaleX = viewport.clientWidth / WORLD_W;
            const scaleY = viewport.clientHeight / WORLD_H;
            scale = Math.min(scaleX, scaleY) * 0.95; 
            if(scale > 1) scale = 1; 
            if(scale < MIN_SCALE) scale = MIN_SCALE;
            updateTransform();
        }
        window.addEventListener('resize', updateTransform);

        viewport.addEventListener('mousedown', (e) => {
            isDragging = true; startX = e.clientX - translateX; startY = e.clientY - translateY;
        });
        window.addEventListener('mouseup', () => isDragging = false);
        window.addEventListener('mousemove', (e) => {
            if(!isDragging) return; e.preventDefault();
            translateX = e.clientX - startX; translateY = e.clientY - startY;
            updateTransform();
        });

        viewport.addEventListener('wheel', (e) => {
            // Prevent zoom/scroll on the viewport if the target is inside a scrollable modal
            if (e.target.closest('#inventory-wrapper') || e.target.closest('#custom-dialog-message') || e.target.closest('#doc-viewer-content') || e.target.closest('#app-list') || e.target.closest('#github-push-modal') || e.target.closest('#custom-dialog-modal') || e.target.closest('.inv-tooltip')) {
                return; // Let the native scroll handle it
            }
            e.preventDefault();
            manualZoom(e.deltaY * -0.001, e.clientX, e.clientY);
        }, { passive: false });

        function manualZoom(delta, cx = viewport.clientWidth/2, cy = viewport.clientHeight/2) {
            const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta));
            const rect = viewport.getBoundingClientRect();
            const mouseX = cx - rect.left; const mouseY = cy - rect.top;
            translateX = mouseX - ((mouseX - translateX) * (newScale / scale));
            translateY = mouseY - ((mouseY - translateY) * (newScale / scale));
            scale = newScale; updateTransform();
        }

        viewport.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                isDragging = false;
                initialDistance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                initialScale = scale;
            } else if (e.touches.length === 1) {
                isDragging = true; startX = e.touches[0].clientX - translateX; startY = e.touches[0].clientY - translateY;
            }
        }, { passive: false });
        window.addEventListener('touchend', () => isDragging = false);
        viewport.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault(); 
                const currentDistance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                const zoomFactor = currentDistance / initialDistance;
                const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, initialScale * zoomFactor));
                const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                translateX = centerX - ((centerX - translateX) * (newScale / scale));
                translateY = centerY - ((centerY - translateY) * (newScale / scale));
                scale = newScale; updateTransform();
            } else if (isDragging && e.touches.length === 1) {
                translateX = e.touches[0].clientX - startX; translateY = e.touches[0].clientY - startY;
                updateTransform();
            }
        }, { passive: false });


        // ==========================================
        // COMPACT RPG LOGIC (1200 x 800)
        // ==========================================
        // using window.MAS_STATE.officeRoster and window.MAS_STATE.locations

        function initOffice() {
            sandbox.innerHTML = '';
            for(let name in window.MAS_STATE.officeRoster) {
                const data = window.MAS_STATE.officeRoster[name];
                
                const el = document.createElement('div');
                el.className = `agent`;
                el.id = `agent-${name.replace(/ /g, '-')}`;
                el.style.left = `${data.current.x}px`;
                el.style.top = `${data.current.y}px`;
                
                let moved = false;
                el.addEventListener('mousedown', () => moved = false);
                el.addEventListener('mousemove', () => moved = true);
                el.addEventListener('mouseup', () => { if(!moved) setView(name); });
                el.addEventListener('touchstart', () => moved = false);
                el.addEventListener('touchmove', () => moved = true);
                el.addEventListener('touchend', () => { if(!moved) setView(name); });
                
                el.innerHTML = `
                    <div class="bubble" id="bubble-${name.replace(/ /g, '-')}"></div>
                    <div class="sprite ${data.sprite}" id="sprite-${name.replace(/ /g, '-')}"></div>
                    <div class="agent-name">${name}</div>
                `;
                sandbox.appendChild(el);
                data.el = el;
                data.spriteEl = document.getElementById(`sprite-${name.replace(/ /g, '-')}`);
                data.frame = 0;
                data.dir = 0;
            }
            requestAnimationFrame(animateAgents);
            setInterval(updateWalkFrames, 150);
        }

        const SPEED = 1.5;

                function animateAgents() {
            // Apply physical separation (Collision Avoidance)
            const keys = Object.keys(window.MAS_STATE.officeRoster);
            for (let i = 0; i < keys.length; i++) {
                for (let j = i + 1; j < keys.length; j++) {
                    const a = window.MAS_STATE.officeRoster[keys[i]];
                    const b = window.MAS_STATE.officeRoster[keys[j]];
                    const dx = a.current.x - b.current.x;
                    const dy = a.current.y - b.current.y;
                    const distSq = dx*dx + dy*dy;
                    const minDist = 60; 
                    if (distSq < minDist*minDist && distSq > 0) {
                        const dist = Math.sqrt(distSq);
                        const force = (minDist - dist) / 5;
                        const fx = (dx / dist) * force;
                        const fy = (dy / dist) * force;
                        a.current.x += fx; a.current.y += fy;
                        b.current.x -= fx; b.current.y -= fy;
                    }
                }
            }

            
            // Target Repulsion: Spatial Negotiation for seats
            // If agents pick targets that are too close, they dynamically yield and find adjacent spots.
            for (let i = 0; i < keys.length; i++) {
                for (let j = i + 1; j < keys.length; j++) {
                    const a = window.MAS_STATE.officeRoster[keys[i]];
                    const b = window.MAS_STATE.officeRoster[keys[j]];
                    const dx = a.target.x - b.target.x;
                    const dy = a.target.y - b.target.y;
                    const distSq = dx*dx + dy*dy;
                    if (distSq < 60*60 && distSq > 0) {
                        const dist = Math.sqrt(distSq);
                        const force = (60 - dist) / 2;
                        a.target.x += (dx/dist)*force; a.target.y += (dy/dist)*force;
                        b.target.x -= (dx/dist)*force; b.target.y -= (dy/dist)*force;
                    }
                }
            }

            // Furniture collision
            const obstacles = [
                {x: 600, y: 250, r: 100}, // Meeting table
                {x: 250, y: 600, r: 50},  // Dev table
                {x: 650, y: 600, r: 50},  // QA table
                {x: 1050, y: 600, r: 50}  // Research table
            ];

            for(let name in window.MAS_STATE.officeRoster) {
                const data = window.MAS_STATE.officeRoster[name];
                
                for (const obs of obstacles) {
                    const dx = data.current.x - obs.x;
                    const dy = data.current.y - obs.y;
                    const distSq = dx*dx + dy*dy;
                    if (distSq < obs.r * obs.r && distSq > 0) {
                        const dist = Math.sqrt(distSq);
                        const force = (obs.r - dist) / 3;
                        data.current.x += (dx / dist) * force;
                        data.current.y += (dy / dist) * force;
                    }
                }
            }

            for(let name in window.MAS_STATE.officeRoster) {
                const data = window.MAS_STATE.officeRoster[name];
                const dx = data.target.x - data.current.x;
                const dy = data.target.y - data.current.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist > SPEED) {
                    data.isWalking = true;
                    if (Math.abs(dx) > Math.abs(dy)) { data.dir = dx > 0 ? 2 : 1; } else { data.dir = dy > 0 ? 0 : 3; }
                    data.current.x += (dx / dist) * SPEED;
                    data.current.y += (dy / dist) * SPEED;
                } else {
                    data.isWalking = false; data.frame = 0; data.dir = 0; 
                }
                
                data.el.style.left = `${data.current.x}px`;
                data.el.style.top = `${data.current.y}px`;
                const bx = -data.frame * 64; const by = -data.dir * 64;
                data.spriteEl.style.backgroundPosition = `${bx}px ${by}px`;
            }
            requestAnimationFrame(animateAgents);
        }

        function updateWalkFrames() {
            for(let name in window.MAS_STATE.officeRoster) { const data = window.MAS_STATE.officeRoster[name]; if (data.isWalking) { data.frame = (data.frame + 1) % 3; } }
        }

        initOffice();

        // Chat Toggle
        
        window.loadProjectState = async function loadProjectState() {
            const selector = document.getElementById('project-selector');
            const proj = (selector && selector.value !== 'new') ? selector.value : '';
            window.MAS_STATE.currentProjectName = proj;
            try {
                const res = await fetch('/api/project/state?project=' + encodeURIComponent(proj));
                const data = await res.json();
                if (data.logs) {
                    window.MAS_STATE.allLogs = data.logs;
                    window.renderLogs();
                }
                if (data.deliverables) {
                    window.MAS_STATE.files = data.deliverables;
                    window.renderInventory();
                }
                if (typeof loadFileTree === 'function') loadFileTree();
            } catch(e) { console.error(e); }
        }

        window.createProject = async function createProject() {
            const name = await customPrompt("Enter new project name (letters, numbers, hyphens only):");
            if (!name || name === 'new') {
                loadProjects(); // reset selector
                return;
            }
            if (!/^[a-zA-Z0-9-]+$/.test(name)) {
                await customAlert("Invalid name. Use only letters, numbers, and hyphens.");
                loadProjects();
                return;
            }
            
            const doCopy = await customConfirm("Do you want to COPY the current workspace's window.MAS_STATE.files and chat history into this new project?\n\n(Click Cancel to create an empty project)");
            
            const selector = document.getElementById('project-selector');
            const currentProject = (selector && selector.value !== 'new') ? selector.value : '';
            
            const payload = { name };
            if (doCopy) {
                payload.copyFrom = currentProject;
            }
            
            try {
                const res = await fetch('/api/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    loadProjects(name);
                } else {
                    await customAlert("Failed to create project: " + data.error);
                    loadProjects();
                }
            } catch(e) {
                console.error(e);
            }
        }

        window.loadProjects = async function loadProjects(selectName = null) {
            try {
                const res = await fetch('/api/projects');
                const data = await res.json();
                if (data.success) {
                    const selectorHidden = document.getElementById('project-selector');
                    const wrapper = document.getElementById('project-selector-wrapper');
                    if (!wrapper || !selectorHidden) return;
                    
                    let currentVal = selectName !== null ? selectName : selectorHidden.value;
                    if (currentVal && !data.projects.includes(currentVal) && currentVal !== 'new' && currentVal !== '') {
                        currentVal = '';
                    }
                    selectorHidden.value = currentVal;
                    
                    window.__all_projects = data.projects;
                    
                    renderCustomDropdown(currentVal);
                }
            } catch(e) { console.error('Failed load projects', e); }
        }

        window.toggleProjectDropdown = function(e) {
            e.stopPropagation();
            const panel = document.getElementById('project-dropdown-panel');
            if (panel) {
                if (panel.style.display === 'none') {
                    panel.style.display = 'flex';
                    const inp = document.getElementById('project-search-input');
                    if (inp) { inp.value = ''; inp.focus(); }
                    renderProjectList();
                } else {
                    panel.style.display = 'none';
                }
            }
        };

        window.selectProject = function(val, e) {
            if(e) e.stopPropagation();
            const panel = document.getElementById('project-dropdown-panel');
            if (panel) panel.style.display = 'none';
            const selectorHidden = document.getElementById('project-selector');
            if (val === 'new') {
                createProject();
            } else {
                selectorHidden.value = val;
                loadProjectState();
                renderCustomDropdown(val);
                if (typeof window.loadFileTree === 'function') window.loadFileTree();
            }
        };

        window.renderCustomDropdown = function(currentVal) {
            const wrapper = document.getElementById('project-selector-wrapper');
            let displayLabel = '📁 Main Office (Temp)';
            if (currentVal && currentVal !== 'new') {
                displayLabel = '📁 ' + currentVal;
            }
            
            let btn = document.getElementById('project-selector-btn');
            if (!btn) {
                wrapper.innerHTML = `<input type="hidden" id="project-selector" value="${currentVal}">
                <div id="project-selector-btn" onclick="toggleProjectDropdown(event)" style="width:100%; background:#8c5a35; color:#fff; border:2px solid #5a3517; border-radius:4px; font-size:14px; padding:6px 10px; font-family:monospace; font-weight:bold; cursor:pointer; outline:none; text-shadow: 1px 1px 0 #3b2a1a; box-shadow: 2px 2px 0 rgba(0,0,0,0.2); display:flex; justify-content:space-between; align-items:center;">
                    <span id="project-selector-display" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${displayLabel}</span>
                    <span style="font-size:10px;">▼</span>
                </div>
                <div id="project-dropdown-panel" onclick="event.stopPropagation()" style="display:none; position:absolute; top:100%; left:0; width:100%; max-height:280px; background:#8c5a35; border:2px solid #5a3517; border-radius:4px; z-index:9999; box-shadow: 0 8px 24px rgba(0,0,0,0.6); flex-direction:column; overflow:hidden; margin-top:4px;">
                    <div style="padding:8px; background:#6d4323; border-bottom:1px solid #4a2d16;">
                        <input type="text" id="project-search-input" placeholder="Search project..." oninput="renderProjectList()" style="width:100%; padding:6px 8px; font-size:13px; font-family:monospace; background:rgba(0,0,0,0.4); border:1px solid #4a2d16; color:#fff; border-radius:3px; outline:none;" autocomplete="off" />
                    </div>
                    <div id="project-list-container" style="overflow-y:auto; flex-grow:1; display:flex; flex-direction:column; max-height: 180px;">
                        <!-- List populated dynamically -->
                    </div>
                    <div onclick="selectProject('new', event)" style="padding:10px; border-top:2px solid #5a3517; background:#2563eb; color:white; cursor:pointer; font-weight:bold; display:flex; align-items:center; gap:8px;" onmouseover="this.style.background='#3b82f6'" onmouseout="this.style.background='#2563eb'">
                        ✨ Create New Project...
                    </div>
                </div>`;
            } else {
                document.getElementById('project-selector-display').innerText = displayLabel;
                document.getElementById('project-selector').value = currentVal;
            }
        };

        window.renderProjectList = function() {
            const container = document.getElementById('project-list-container');
            if (!container) return;
            const search = (document.getElementById('project-search-input').value || '').toLowerCase();
            const projects = window.__all_projects || [];
            
            let html = '';
            
            const mainOffice = 'Main Office (Temp)';
            if (mainOffice.toLowerCase().includes(search) || search === '') {
                html += `<div onclick="selectProject('', event)" style="padding:12px 14px; cursor:pointer; border-bottom:1px solid rgba(0,0,0,0.2); color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:monospace; font-size:14px;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">📁 ${mainOffice}</div>`;
            }
            
            projects.forEach(p => {
                if (p !== 'main' && (p.toLowerCase().includes(search) || search === '')) {
                    html += `<div onclick="selectProject('${p}', event)" style="padding:12px 14px; cursor:pointer; border-bottom:1px solid rgba(0,0,0,0.2); color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:monospace; font-size:14px;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">📁 ${p}</div>`;
                }
            });
            
            if (html === '') {
                html = `<div style="padding:10px; color:rgba(255,255,255,0.5); font-style:italic; font-size:12px; text-align:center;">No matching projects</div>`;
            }
            
            container.innerHTML = html;
        };
        
        // Add global click listener to close dropdown
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('project-dropdown-panel');
            if (panel && panel.style.display !== 'none' && !e.target.closest('#project-selector-wrapper')) {
                panel.style.display = 'none';
            }
        });

        

        
        window.toggleProjectDropdown = function(e) {
            e.stopPropagation();
            const panel = document.getElementById('project-dropdown-panel');
            if (panel) {
                if (panel.style.display === 'none') {
                    panel.style.display = 'flex';
                    const inp = document.getElementById('project-search-input');
                    if (inp) { inp.value = ''; inp.focus(); }
                    renderProjectList();
                } else {
                    panel.style.display = 'none';
                }
            }
        };

        window.selectProject = function(val, e) {
            if(e) e.stopPropagation();
            const panel = document.getElementById('project-dropdown-panel');
            if (panel) panel.style.display = 'none';
            const selectorHidden = document.getElementById('project-selector');
            if (val === 'new') {
                if (typeof createProject === 'function') createProject();
            } else {
                selectorHidden.value = val;
                if (typeof loadProjectState === 'function') loadProjectState();
                renderCustomDropdown(val);
                if (typeof window.loadFileTree === 'function') window.loadFileTree();
            }
        };

        window.renderCustomDropdown = function(currentVal) {
            const wrapper = document.getElementById('project-selector-wrapper');
            if (!wrapper) return;
            let displayLabel = '📁 Main Office (Temp)';
            if (currentVal && currentVal !== 'new') {
                displayLabel = '📁 ' + currentVal;
            }
            
            let btn = document.getElementById('project-selector-btn');
            if (!btn) {
                wrapper.innerHTML = `<input type="hidden" id="project-selector" value="${currentVal}">
                <div id="project-selector-btn" onclick="toggleProjectDropdown(event)" style="width:100%; background:#8c5a35; color:#fff; border:2px solid #5a3517; border-radius:4px; font-size:14px; padding:6px 10px; font-family:monospace; font-weight:bold; cursor:pointer; outline:none; text-shadow: 1px 1px 0 #3b2a1a; box-shadow: 2px 2px 0 rgba(0,0,0,0.2); display:flex; justify-content:space-between; align-items:center;">
                    <span id="project-selector-display" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${displayLabel}</span>
                    <span style="font-size:10px;">▼</span>
                </div>
                <div id="project-dropdown-panel" onclick="event.stopPropagation()" style="display:none; position:absolute; top:100%; left:0; width:100%; max-height:280px; background:#8c5a35; border:2px solid #5a3517; border-radius:4px; z-index:9999; box-shadow: 0 8px 24px rgba(0,0,0,0.6); flex-direction:column; overflow:hidden; margin-top:4px;">
                    <div style="padding:8px; background:#6d4323; border-bottom:1px solid #4a2d16;">
                        <input type="text" id="project-search-input" placeholder="Search project..." oninput="renderProjectList()" style="width:100%; padding:6px 8px; font-size:13px; font-family:monospace; background:rgba(0,0,0,0.4); border:1px solid #4a2d16; color:#fff; border-radius:3px; outline:none;" autocomplete="off" />
                    </div>
                    <div id="project-list-container" style="overflow-y:auto; flex-grow:1; display:block; max-height: 220px;">
                        <!-- List populated dynamically -->
                    </div>
                    <div onclick="selectProject('new', event)" style="padding:10px; border-top:2px solid #5a3517; background:#2563eb; color:white; cursor:pointer; font-weight:bold; display:flex; align-items:center; gap:8px;" onmouseover="this.style.background='#3b82f6'" onmouseout="this.style.background='#2563eb'">
                        ✨ Create New Project...
                    </div>
                </div>`;
            } else {
                document.getElementById('project-selector-display').innerText = displayLabel;
                document.getElementById('project-selector').value = currentVal;
            }
        };

        window.renderProjectList = function() {
            const container = document.getElementById('project-list-container');
            if (!container) return;
            const search = (document.getElementById('project-search-input').value || '').toLowerCase();
            const projects = window.__all_projects || [];
            
            let html = '';
            const mainOffice = 'Main Office (Temp)';
            if (mainOffice.toLowerCase().includes(search) || search === '') {
                html += `<div onclick="selectProject('', event)" style="padding:12px 14px; cursor:pointer; border-bottom:1px solid rgba(0,0,0,0.2); color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:monospace; font-size:14px;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">📁 ${mainOffice}</div>`;
            }
            projects.forEach(p => {
                if (p !== 'main' && (p.toLowerCase().includes(search) || search === '')) {
                    html += `<div onclick="selectProject('${p}', event)" style="padding:12px 14px; cursor:pointer; border-bottom:1px solid rgba(0,0,0,0.2); color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:monospace; font-size:14px;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">📁 ${p}</div>`;
                }
            });
            if (html === '') { html = `<div style="padding:10px; color:rgba(255,255,255,0.5); font-style:italic; font-size:12px; text-align:center;">No matching projects</div>`; }
            container.innerHTML = html;
        };

        document.addEventListener('click', (e) => {
            const panel = document.getElementById('project-dropdown-panel');
            if (panel && panel.style.display !== 'none' && !e.target.closest('#project-selector-wrapper')) {
                panel.style.display = 'none';
            }
        });

        
        window.MAS_STATE.currentProjectName = '';
        window.loadProjectState = async function loadProjectState() {
            const selector = document.getElementById('project-selector');
            const proj = (selector && selector.value !== 'new') ? selector.value : '';
            window.MAS_STATE.currentProjectName = proj;
            try {
                const res = await fetch('/api/project/state?project=' + encodeURIComponent(proj));
                const data = await res.json();
                if (data.logs) {
                    window.MAS_STATE.allLogs = data.logs;
                    window.renderLogs();
                }
                if (data.deliverables) {
                    window.MAS_STATE.files = data.deliverables;
                    window.renderInventory();
                }
                if (data.queue) {
                    if (typeof renderQueue === 'function') {
                        window.MAS_STATE.queue = data.queue;
                        window.renderQueue();
                    }
                }
            } catch(e) {}
        };

        
        socket.on('new_log', (logObj) => {
            if (!window.MAS_STATE) return;
            window.MAS_STATE.allLogs.push(logObj);
            // if(window.MAS_STATE.allLogs.length > 300) window.MAS_STATE.allLogs.shift();
            
            const isRelevant = (window.MAS_STATE.currentView === 'GLOBAL') || 
                               (window.MAS_STATE.currentView === logObj.from) || 
                               (window.MAS_STATE.currentView === logObj.to);
                               
            if (isRelevant) {
                if (typeof appendLog === 'function') window.appendLog(logObj);
                if (window.innerWidth <= 768 && !leftPanel.classList.contains('expanded') && logObj.from !== 'Boss') {
                    const badge = document.getElementById('chat-badge');
                    if (badge) badge.style.display = 'block';
                }
            }
        });

        socket.on('agent_event', (data) => {
            if (!window.MAS_STATE) return;
            const { agent, type, message, actionTarget, project } = data;
            const selector = document.getElementById('project-selector');
            const currentProject = (selector && selector.value !== 'new') ? selector.value : '';
            const eventProject = project || '';
            if (currentProject !== eventProject && eventProject !== '') return;

            if(!window.MAS_STATE.officeRoster[agent]) return;
            const dataObj = window.MAS_STATE.officeRoster[agent];
            
            if (type === 'autonomous' || type === 'chatting') {
                if (typeof showBubble === 'function') window.showBubble(agent, message);
                dataObj.dir = Math.random() > 0.5 ? 1 : 2;
                setTimeout(() => dataObj.dir = 0, 2000);
            } else {
                if (typeof window.MAS_ACTIONS !== 'undefined') window.MAS_ACTIONS.moveAgent(agent, actionTarget);
                if(message && typeof showBubble === 'function') window.showBubble(agent, message);
            }
        });

        socket.on('deliverable_ready', (file) => {
            if (!window.MAS_STATE) return;
            window.MAS_STATE.files.push(file);
            if (typeof renderInventory === 'function') window.renderInventory();
        });

        socket.on('init_state', (data) => {
            if (!window.MAS_STATE) return;
            window.MAS_STATE.allLogs = data.logs || [];
            if(data.deliverables) { window.MAS_STATE.files = data.deliverables; }
            if (typeof renderLogs === 'function') window.renderLogs();
            if (typeof renderInventory === 'function') window.renderInventory(); 
        });
        
        socket.on('clear_history', (data) => {
            const selector = document.getElementById('project-selector');
            const currentProject = (selector && selector.value !== 'new') ? selector.value : '';
            const clearProject = data && data.project !== undefined ? data.project : '';
            if (currentProject === clearProject) {
                const cl = document.getElementById('chat-log');
                if (cl) cl.innerHTML = '';
            }
        });

        socket.on('queue_update', (data) => {
            const selectorHidden = document.getElementById('project-selector');
            const currentProject = (selectorHidden && selectorHidden.value !== 'new') ? selectorHidden.value : '';
            const eventProject = data.project || 'main';
            if (currentProject !== eventProject && eventProject !== 'main') return;
            
            if (typeof renderQueue === 'function') {
                window.MAS_STATE.queue = data;
                window.renderQueue();
            }
        });

        socket.on('hitl_request', (data) => {
            const { agent, questionId, text, options, project } = data;
            const selectorHidden = document.getElementById('project-selector');
            let currentProject = (selectorHidden && selectorHidden.value !== 'new') ? selectorHidden.value : '';
            if (currentProject === '') currentProject = 'main';
            let eventProject = project || 'main';
            if (currentProject !== eventProject) return;
            
            const safeText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

            let h = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e5e7eb;">`;
            h += `<div style="margin-bottom: 24px;">`;
            h += `<div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">`;
            h += `<div style="background:#34d399; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#000; font-size:12px;">🤖</div>`; 
            h += `<span style="font-weight: 600; font-size:15px; color:#f3f4f6;">${agent}</span>`;
            h += `</div>`;
            h += `<p style="font-size:15px; line-height:1.6; color:#d1d5db; margin:0; padding-left:32px;">${safeText}</p>`;
            h += `</div>`;
            
            h += `<form id="hitl-form" onsubmit="submitHitl(event, '${questionId}')" style="padding-left:32px;">`;
            
            if (options && options.length > 0) {
                h += `<div style="display:flex; flex-direction:column; gap:12px; margin-bottom:24px;">`;
                options.forEach((opt, idx) => {
                    const isOther = opt.toLowerCase().includes('other') || opt.toLowerCase().includes('input');
                    h += `<label style="display:flex; justify-content:flex-start; align-items:center; text-align:left; gap:12px; cursor:pointer; padding:12px 16px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:8px; transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
                                <input type="radio" name="hitl_choice" value="${opt}" ${idx === 0 ? 'checked' : ''} onchange="const el = document.getElementById('hitl-other-input'); if(el) el.style.display = '${isOther ? 'block' : 'none'}';" style="margin-top:0px; accent-color:#34d399; transform:scale(1.2);">
                                <span style="font-size:15px; color:#f3f4f6; line-height:1.4; text-align:left; width:100%; display:block;">${opt}</span>
                            </label>`;
                    if (isOther) {
                        h += `<input type="text" id="hitl-other-input" style="display:none; width:100%; padding:12px 16px; margin-top:-4px; margin-bottom:8px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.15); color:#fff; border-radius:8px; font-size:14px; outline:none; box-sizing:border-box;" placeholder="Please specify...">`;
                    }
                });
                h += `</div>`;
            } else {
                h += `<textarea id="hitl-text-input" style="width:100%; height:120px; padding:16px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.15); color:#fff; border-radius:8px; font-size:15px; font-family:inherit; resize:vertical; outline:none; box-sizing:border-box; margin-bottom:24px;" placeholder="Type your response here..."></textarea>`;
            }
            
            h += `<div style="display:flex; justify-content:flex-end;">
                        <button type="submit" style="padding:10px 24px; background:#34d399; color:#064e3b; font-weight:600; font-size:14px; border:none; border-radius:6px; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='#10b981'" onmouseout="this.style.background='#34d399'">Submit Response</button>
                     </div></form></div>`;
                     
            const titleEl = document.getElementById('custom-dialog-title');
            if (titleEl) {
                titleEl.innerHTML = '<div style="display:flex; align-items:center; width: 100%; position: relative;"><span>Action Required</span><span id="hitl-countdown" style="position: absolute; left: 50%; transform: translateX(-50%); font-size:15px; color:#34d399; font-family:monospace; font-variant-numeric: tabular-nums; font-weight: bold; background: rgba(0,0,0,0.4); padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(52,211,153,0.3);">03:00</span></div>';
                titleEl.style.width = '100%';
                const header = titleEl.parentElement;
                if (header) {
                    let pContainer = document.getElementById('hitl-progress-container');
                    if (!pContainer) {
                        pContainer = document.createElement('div');
                        pContainer.id = 'hitl-progress-container';
                        pContainer.style.position = 'absolute';
                        pContainer.style.bottom = '-2px';
                        pContainer.style.left = '0';
                        pContainer.style.width = '100%';
                        pContainer.style.height = '2px';
                        pContainer.style.background = 'rgba(255,255,255,0.1)';
                        pContainer.innerHTML = '<div id="hitl-progress-bar" style="width: 100%; height: 100%; background: #34d399; transition: width 0.1s linear;"></div>';
                        header.style.position = 'relative';
                        header.appendChild(pContainer);
                    }
                    pContainer.style.display = 'block';
                }
            }
            
            const msgEl = document.getElementById('custom-dialog-message');
            if (msgEl) msgEl.innerHTML = h;
            
            const actionsEl = document.getElementById('custom-dialog-actions');
            if (actionsEl) actionsEl.style.display = 'none';
            
            const boxEl = document.getElementById('custom-dialog-box');
            if (boxEl) {
                boxEl.style.borderColor = '#444';
                boxEl.style.background = '#1e1e21';
            }
            
            if (titleEl) {
                titleEl.style.color = '#e5e7eb';
                titleEl.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
                if (titleEl.parentElement) {
                    titleEl.parentElement.style.borderBottomColor = '#333';
                    titleEl.parentElement.style.background = 'transparent';
                }
            }
            
            if (msgEl) msgEl.style.background = 'transparent';
            
            const modalEl = document.getElementById('custom-dialog-modal');
            if (modalEl) modalEl.style.display = 'flex';
            
            const totalTime = 180;
            let targetEndTime = Date.now() + (totalTime * 1000);
            if (window.hitlTimerInterval) clearInterval(window.hitlTimerInterval);
            
            let lastTypingTime = 0;

            window.hitlTimerInterval = setInterval(() => {
                let isCurrentlyTyping = (Date.now() - lastTypingTime) < 1500;
                if (isCurrentlyTyping) {
                    targetEndTime = Date.now() + (totalTime * 1000);
                }
                
                let timeLeft = (targetEndTime - Date.now()) / 1000;
                
                const bar = document.getElementById('hitl-progress-bar');
                if (bar) {
                    bar.style.width = Math.max(0, (timeLeft / totalTime * 100)) + '%' ;
                    if (timeLeft <= 30) bar.style.background = '#ef4444';
                    else bar.style.background = '#34d399';
                }
                
                const countdownEl = document.getElementById('hitl-countdown');
                if (countdownEl) {
                    if (isCurrentlyTyping) {
                        countdownEl.innerText = 'Typing...';
                        countdownEl.style.color = '#60a5fa';
                    } else {
                        const m = Math.floor(Math.max(0, timeLeft) / 60);
                        const s = Math.floor(Math.max(0, Math.ceil(timeLeft)) % 60);
                        countdownEl.innerText = m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
                        countdownEl.style.color = timeLeft <= 30 ? '#ef4444' : '#34d399';
                    }
                }
                
                if (timeLeft <= 0) {
                    clearInterval(window.hitlTimerInterval);
                    if (typeof window.closeCustomDialog === 'function') window.closeCustomDialog('timeout');
                }
            }, 100);
            
            setTimeout(() => {
                const inputs = document.querySelectorAll('#custom-dialog-message input, #custom-dialog-message textarea');
                inputs.forEach(inp => {
                    const handleTyping = () => {
                        lastTypingTime = Date.now();
                        targetEndTime = Date.now() + (totalTime * 1000);
                    };
                    inp.addEventListener('input', handleTyping);
                    inp.addEventListener('change', handleTyping);
                });
            }, 100);
            
            const originalClose = window.closeCustomDialog;
            window.closeCustomDialog = function(result) {
                const boxEl2 = document.getElementById('custom-dialog-box');
                if (boxEl2) {
                    boxEl2.style.borderColor = '';
                    boxEl2.style.background = '';
                }
                
                const titleEl2 = document.getElementById('custom-dialog-title');
                if (titleEl2) {
                    titleEl2.style.color = '';
                    titleEl2.style.fontFamily = '';
                    if (titleEl2.parentElement) {
                        titleEl2.parentElement.style.borderBottomColor = '';
                        titleEl2.parentElement.style.background = '';
                    }
                }
                
                const msgEl2 = document.getElementById('custom-dialog-message');
                if (msgEl2) msgEl2.style.background = '';
                
                if (result === false) {
                    fetch('/api/webhook/hitl-response', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ questionId: questionId, answer: "Task ignored by Boss. Abort task.", project: eventProject })
                    });
                } else if (result === 'timeout') {
                    fetch('/api/webhook/hitl-response', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ questionId: questionId, answer: "System Timeout: Boss did not respond. Proceed with your best assumption.", project: eventProject })
                    });
                    result = null;
                }
                
                if (window.hitlTimerInterval) clearInterval(window.hitlTimerInterval);
                const pContainer = document.getElementById('hitl-progress-container');
                if (pContainer) pContainer.style.display = 'none';
                if (titleEl2) titleEl2.style.width = '';
                
                if (originalClose) originalClose(result);
            };
        });

        socket.on('hitl_timeout', (data) => {
            const modal = document.getElementById('custom-dialog-modal');
            if (modal) modal.style.display = 'none';
            if (typeof customAlert === 'function') customAlert("HITL Request timed out. The agent proceeded with its best assumption.");
        });

        window.submitHitl = async function submitHitl(event, questionId) {
            event.preventDefault();
            let answer = '';
            
            const radioSelected = document.querySelector('input[name="hitl_choice"]:checked');
            if (radioSelected) {
                answer = radioSelected.value;
                if (answer.toLowerCase().includes('other') || answer.toLowerCase().includes('input')) {
                    const inp = document.getElementById('hitl-other-input');
                    if (inp) answer = inp.value.trim();
                }
            } else {
                const textInput = document.getElementById('hitl-text-input');
                if (textInput) answer = textInput.value.trim();
            }
            
            if (!answer) {
                if (typeof customAlert === 'function') await customAlert("Please provide an answer before submitting.");
                return;
            }
            
            if (typeof window.closeCustomDialog === 'function') window.closeCustomDialog(null);
            
            const selectorHidden = document.getElementById('project-selector');
            let currentProject = (selectorHidden && selectorHidden.value !== 'new') ? selectorHidden.value : '';
            if (currentProject === '') currentProject = 'main';
            
            try {
                await fetch('/api/webhook/hitl-response', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ questionId, answer, project: currentProject })
                });
            } catch(e) {}
        };

        ;



window.killAllAgents = window.killAllAgents = async function killAllAgents() {
            if(!confirm('🚨 EMERGENCY STOP 🚨\n\nAre you sure you want to forcibly terminate all running Agent processes across all projects?')) return;
            try {
                await fetch('/api/kill', { method: 'POST' });
            } catch(e) { console.error('Failed to kill', e); }
        };

;

;

;

;

;

window.makeDraggable = window.makeDraggable = function makeDraggable(boxId, headerId) {
            const elmnt = document.getElementById(boxId);
            const header = document.getElementById(headerId);
            if (!elmnt || !header) return;

            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            header.onmousedown = dragMouseDown;

            function dragMouseDown(e) {
                e = e || window.event;
                e.preventDefault();
                
                // Convert percentage/transform centering to absolute pixels if first time
                if (elmnt.style.transform !== 'none') {
                    const rect = elmnt.getBoundingClientRect();
                    elmnt.style.transform = 'none';
                    elmnt.style.top = rect.top + 'px';
                    elmnt.style.left = rect.left + 'px';
                }

                pos3 = e.clientX;
                pos4 = e.clientY;
                document.onmouseup = closeDragElement;
                document.onmousemove = elementDrag;
            }

            function elementDrag(e) {
                e = e || window.event;
                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                
                elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
                elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
            }

            function closeDragElement() {
                document.onmouseup = null;
                document.onmousemove = null;
            }
        };

window.dragMouseDown = function dragMouseDown(e) {
                e = e || window.event;
                e.preventDefault();
                
                // Convert percentage/transform centering to absolute pixels if first time
                if (elmnt.style.transform !== 'none') {
                    const rect = elmnt.getBoundingClientRect();
                    elmnt.style.transform = 'none';
                    elmnt.style.top = rect.top + 'px';
                    elmnt.style.left = rect.left + 'px';
                }

                pos3 = e.clientX;
                pos4 = e.clientY;
                document.onmouseup = closeDragElement;
                document.onmousemove = elementDrag;
            };

window.elementDrag = function elementDrag(e) {
                e = e || window.event;
                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                
                elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
                elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
            };

window.closeDragElement = function closeDragElement() {
                document.onmouseup = null;
                document.onmousemove = null;
            };



        
window.executePush = async function executePush() {
            const username = document.getElementById('github-user').value.trim();
            const repo = document.getElementById('github-repo').value.trim();
            const token = document.getElementById('github-token').value.trim();

            if (!username || !repo || !token) {
                await customAlert('Please fill out all fields.');
                return;
            }

            // Save for future
            localStorage.setItem('gh_username', username);
            localStorage.setItem('gh_token', token);

            document.getElementById('github-push-modal').style.display = 'none';
            document.getElementById('app-list').innerHTML = '<div style="text-align:center; color:#34d399; font-weight:bold;">Pushing to GitHub... This might take a few seconds.</div>';
            
            try {
                const res = await fetch('/api/apps/push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pid: activePushPid, token, repo, username })
                });
                const data = await res.json();
                if (data.success) {
                    await customAlert('Successfully pushed to GitHub!\n\nURL:\n' + data.url);
                    window.open(data.url, '_blank');
                } else {
                    await customAlert('Failed to push to GitHub:\n\n' + data.error);
                }
            } catch(e) {
                await customAlert('Network error pushing to GitHub');
            }
            showAppManager();
        };

        // --- Draggable Modals Logic ---
        window.makeDraggable = function makeDraggable(boxId, headerId) {
            const elmnt = document.getElementById(boxId);
            const header = document.getElementById(headerId);
            if (!elmnt || !header) return;

            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            header.onmousedown = dragMouseDown;

            function dragMouseDown(e) {
                e = e || window.event;
                e.preventDefault();
                
                // Convert percentage/transform centering to absolute pixels if first time
                if (elmnt.style.transform !== 'none') {
                    const rect = elmnt.getBoundingClientRect();
                    elmnt.style.transform = 'none';
                    elmnt.style.top = rect.top + 'px';
                    elmnt.style.left = rect.left + 'px';
                }

                pos3 = e.clientX;
                pos4 = e.clientY;
                document.onmouseup = closeDragElement;
                document.onmousemove = elementDrag;
            }

            function elementDrag(e) {
                e = e || window.event;
                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                
                elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
                elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
            }

            function closeDragElement() {
                document.onmouseup = null;
                document.onmousemove = null;
            }
        }

        // Initialize drag on modals
        window.makeDraggable('app-manager-box', 'app-manager-header');
        window.makeDraggable('github-push-box', 'github-push-header');
        window.makeDraggable('custom-dialog-box', 'custom-dialog-header');
        window.makeDraggable('doc-viewer-box', 'doc-viewer-header');
    
        // Setup hooks at the very end
        const originalLoadProjects = window.loadProjects;
        loadProjects = async function(selectName = null) {
            await originalLoadProjects(selectName);
            if (typeof loadProjectState === 'function') loadProjectState();
        };
        const selectorEl = document.getElementById('project-selector');
        if (selectorEl) {
            selectorEl.addEventListener('change', () => { if (typeof loadFileTree === 'function') loadFileTree(); });
        }



// Trigger initializations on load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof loadProjects === 'function' || typeof window.loadProjects === 'function') {
        const lp = window.loadProjects || loadProjects;
        lp();
    }
    if (typeof loadFileTree === 'function' || typeof window.loadFileTree === 'function') {
        const lf = window.loadFileTree || loadFileTree;
        lf();
    }
    if (typeof window.loadProjectState === 'function') {
        window.loadProjectState();
    }
});

// --- RESTORED MISSING FUNCTIONS ---











;

        window.isInventoryExpanded = false;
        





