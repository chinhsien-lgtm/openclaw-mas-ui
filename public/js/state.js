// state.js
// Centralized State Management for OpenClaw MAS UI

window.MAS_STATE = {
    allLogs: [],
    files: [],
    currentView: 'GLOBAL',
    currentProjectName: '',
    officeRoster: {
        'CEO':          { sprite: 'sprite-ceo', home: {x: 100, y: 250}, current: {x: 100, y: 250}, target: {x: 100, y: 250}, isWalking: false, dir: 0, frame: 0 },
        'CPO':          { sprite: 'sprite-cpo', home: {x: 100, y: 350}, current: {x: 100, y: 350}, target: {x: 100, y: 350}, isWalking: false, dir: 0, frame: 0 },
        'CTO':          { sprite: 'sprite-cto', home: {x: 1050, y: 250}, current: {x: 1050, y: 250}, target: {x: 1050, y: 250}, isWalking: false, dir: 0, frame: 0 },
        'Programmer':   { sprite: 'sprite-dev', home: {x: 150, y: 650}, current: {x: 150, y: 650}, target: {x: 150, y: 650}, isWalking: false, dir: 0, frame: 0 },
        'Tester':       { sprite: 'sprite-qa', home: {x: 550, y: 650}, current: {x: 550, y: 650}, target: {x: 550, y: 650}, isWalking: false, dir: 0, frame: 0 },
        'Reviewer':     { sprite: 'sprite-qa', home: {x: 750, y: 650}, current: {x: 750, y: 650}, target: {x: 750, y: 650}, isWalking: false, dir: 0, frame: 0 },
        'Data Analyst': { sprite: 'sprite-data', home: {x: 1000, y: 550}, current: {x: 1000, y: 550}, target: {x: 1000, y: 550}, isWalking: false, dir: 0, frame: 0 },
        'Researcher':   { sprite: 'sprite-data', home: {x: 1000, y: 680}, current: {x: 1000, y: 680}, target: {x: 1000, y: 680}, isWalking: false, dir: 0, frame: 0 }
    },
    locations: { meeting: {x: 600, y: 250}, dev: {x: 250, y: 600}, qa: {x: 650, y: 600}, research: {x: 1050, y: 600} },
    allProjects: [],
    queue: { isRunning: false, currentTask: null, pending: [] }
};

window.MAS_ACTIONS = {
    addLog: (log) => {
        window.MAS_STATE.allLogs.push(log);
        if (window.MAS_STATE.allLogs.length > 300) window.MAS_STATE.allLogs.shift();
        if (typeof renderLogs === 'function') renderLogs();
    },
    setLogs: (logs) => {
        window.MAS_STATE.allLogs = logs || [];
        if (typeof renderLogs === 'function') renderLogs();
    },
    setFiles: (files) => {
        window.MAS_STATE.files = files || [];
        if (typeof renderInventory === 'function') renderInventory();
    },
    addFile: (file) => {
        window.MAS_STATE.files.push(file);
        if (typeof renderInventory === 'function') renderInventory();
    },
    setQueue: (queueData) => {
        if (!queueData) return;
        window.MAS_STATE.queue = queueData;
        if (typeof renderQueue === 'function') renderQueue();
    },
    setProjects: (projects) => {
        window.MAS_STATE.allProjects = projects || [];
    },
    setCurrentProject: (proj) => {
        window.MAS_STATE.currentProjectName = proj || '';
    },
    setView: (viewName) => {
        window.MAS_STATE.currentView = viewName;
        if (typeof renderHeader === 'function') renderHeader();
        if (typeof renderLogs === 'function') renderLogs();
    },
    moveAgent: (agentName, targetName) => {
        const roster = window.MAS_STATE.officeRoster;
        const locs = window.MAS_STATE.locations;
        if (!roster[agentName]) return;
        
        let tx = roster[agentName].home.x, ty = roster[agentName].home.y;
        
        if (targetName === 'QA_DESK') { tx = roster['Tester'].home.x - 40; ty = roster['Tester'].home.y; }
        else if (targetName === 'REVIEW_DESK') { tx = roster['Reviewer'].home.x - 40; ty = roster['Reviewer'].home.y; }
        else if (targetName === 'dev') { tx = locs.dev.x + (Math.random()*60 - 30); ty = locs.dev.y + (Math.random()*60 - 30); }
        else if (targetName === 'qa') { tx = locs.qa.x + (Math.random()*60 - 30); ty = locs.qa.y + (Math.random()*60 - 30); }
        else if (targetName === 'research') { tx = locs.research.x + (Math.random()*60 - 30); ty = locs.research.y + (Math.random()*60 - 30); }
        else if (targetName === 'home') { tx = roster[agentName].home.x; ty = roster[agentName].home.y; }
        else if (targetName === 'meeting') { tx = locs.meeting.x + (Math.random()*100 - 50); ty = locs.meeting.y + (Math.random()*60 - 30); }
        else if (roster[targetName]) { tx = roster[targetName].current.x - 40; ty = roster[targetName].current.y; }
        
        roster[agentName].target.x = tx;
        roster[agentName].target.y = ty;
        
        clearTimeout(roster[agentName].sleepTimer);
        roster[agentName].sleepTimer = setTimeout(() => { 
            roster[agentName].target.x = roster[agentName].home.x; 
            roster[agentName].target.y = roster[agentName].home.y; 
        }, 20000);
    }
};

window.renderQueue = function() {
    const queue = window.MAS_STATE.queue;
                        const countText = document.getElementById('queue-count-text');
    const currentText = document.getElementById('queue-current-text');
    const currentTaskBox = document.getElementById('queue-current-task');
    const list = document.getElementById('queue-pending-list');
    
    if (!countText) return;
    
    countText.innerText = (queue.pending ? queue.pending.length : 0) + ' PENDING';
    
    if (queue.isRunning) {
        if(currentTaskBox) currentTaskBox.style.display = 'block';
        if(currentText) currentText.innerText = queue.currentTask ? queue.currentTask.rawMessage : 'None';
    } else {
        if(currentTaskBox) currentTaskBox.style.display = 'none';
        if(currentText) currentText.innerText = 'None';
    }
    
    let qhtml = '';
    if (queue.pending) {
        queue.pending.forEach((task, idx) => {
            qhtml += `<div style="padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 12px; background: transparent; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                    <div style="color: #666; font-size: 12px; font-weight: bold; width: 16px; text-align: center;">${idx + 1}</div>
                    <div style="flex-grow: 1; overflow: hidden;">
                        <div style="color: #ccc; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;">${task.rawMessage}</div>
                    </div>
                    <button onclick="fetch('/api/queue/remove', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({project: window.MAS_STATE.currentProjectName, index: idx})}); setTimeout(()=>{if(typeof window.loadProjectState==='function') window.loadProjectState();}, 1000);" style="background:transparent; border:none; color:#f87171; padding:0; cursor:pointer; font-size:12px; font-weight:bold; opacity:0.8; transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">✖</button>
                </div>`;
        });
    }
    if(list) list.innerHTML = qhtml;
};