const { spawn } = require('child_process');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const basicAuth = require('express-basic-auth');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lhqwfnhvaafjbcwvlqpi.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_ucSK26SCh9M2VsosZo4-cw_PDg1RO-Z';
const supabase = createClient(supabaseUrl, supabaseKey);


const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
let chatSessionSuffix = 'chat_' + Date.now();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/api/project/tree', (req, res) => {
    const fs2 = require('fs');
    const path2 = require('path');
    const projectName = req.query.project;
    let targetDir = '/root/workspace/mas-projects/main';
    if (projectName && projectName !== 'new') {
        targetDir = path2.join('/root/workspace/mas-projects', projectName);
    }
    
    if (!fs2.existsSync(targetDir)) {
        return res.json({ success: false, tree: [] });
    }

    function buildTree(dir) {
        const result = [];
        try {
            const items = fs2.readdirSync(dir);
            for (let item of items) {
                if (item === 'node_modules' || item === '.git') continue;
                const fullPath = path2.join(dir, item);
                const stat = fs2.statSync(fullPath);
                if (stat.isDirectory()) {
                    result.push({ name: item, type: 'directory', children: buildTree(fullPath) });
                } else {
                    result.push({ name: item, type: 'file', path: fullPath.replace(targetDir, '') });
                }
            }
        } catch(e) {}
        result.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'directory' ? -1 : 1;
        });
        return result;
    }

    res.json({ success: true, tree: buildTree(targetDir) });
});

app.get('/api/project/file', (req, res) => {
    const fs2 = require('fs');
    const path2 = require('path');
    const projectName = req.query.project;
    const filePath = req.query.path;
    let targetDir = '/root/workspace/mas-projects/main';
    if (projectName && projectName !== 'new') {
        targetDir = path2.join('/root/workspace/mas-projects', projectName);
    }
    const fullPath = path2.join(targetDir, filePath);
    if (!fullPath.startsWith(targetDir)) return res.status(403).json({error: 'Invalid path'});
    try {
        const content = fs2.readFileSync(fullPath, 'utf8');
        res.json({ success: true, content });
    } catch(e) {
        res.status(500).json({ error: 'Failed to read file' });
    }
});


app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'grafilab' && password === 'grafilab2026!') {
        res.json({ success: true, token: 'dev-session-token-999' });
    } else {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
});

// Simple API protection middleware

app.get('/api/project/state', (req, res) => {
    const proj = req.query.project || 'main';
    const filteredLogs = systemLogs.filter(l => (l.project || 'main') === proj);
    const filteredDeliverables = deliverables.filter(d => (d.project || 'main') === proj);
    const q = projectQueues[proj] || { isRunning: false, currentTask: null, pending: [] };
    res.json({ logs: filteredLogs, deliverables: filteredDeliverables, queue: q });
});

app.use('/api', (req, res, next) => {
    // Exempt webhook routes and login
    if (req.path === '/webhook/emit' || req.path === '/agent_chat' || req.path === '/auth/login') {
        return next();
    }
    
    const token = req.headers['authorization'];
    if (token !== 'Bearer dev-session-token-999') {
        return res.status(401).json({ error: 'Unauthorized API Access' });
    }
    next();
});

let activeAgents = {};
// Store structured logs: { type: 'global'|'direct'|'thought', from, to, text, timestamp }
const fs = require('fs');
const DB_FILE = '/root/workspace/openclaw-mas-ui/sandbox_db.json';

let systemLogs = [
    { type: 'global', from: 'System', text: '[Grafilab] Loaded. Click a role to view its workflow footprint, or use @Role to issue direct commands.', timestamp: Date.now() }
];
let deliverables = [];

// Load persisted state (first from local, then sync from Supabase asynchronously)
if (fs.existsSync(DB_FILE)) {
    try {
        const saved = JSON.parse(fs.readFileSync(DB_FILE));
        if (saved.logs && saved.logs.length > 0) systemLogs = saved.logs;
        if (saved.deliverables) deliverables = saved.deliverables;
    } catch(e) {}
}

// Async load from Supabase on startup
async function loadFromSupabase() {
    try {
        const { data: logData, error: logErr } = await supabase.from('mas_chat_logs').select('*').order('created_at', { ascending: true }).limit(5000);
        if (!logErr && logData && logData.length > 0) {
            systemLogs = logData.map(r => ({
                project: r.project,
                type: r.type,
                from: r.sender,
                to: r.receiver,
                text: r.text,
                actionTarget: r.action_target,
                timestamp: new Date(r.created_at).getTime()
            }));
        }
        
        const { data: delData, error: delErr } = await supabase.from('mas_deliverables').select('*').order('created_at', { ascending: true });
        if (!delErr && delData && delData.length > 0) {
            deliverables = delData.map(r => ({
                project: r.project,
                name: r.name,
                type: r.type,
                content: r.content
            }));
        }
        
        // Notify all clients of new state
        io.emit('init_state', { agents: activeAgents, logs: systemLogs, deliverables, queues: projectQueues });
    } catch(e) {
        console.log("Supabase initial load failed, relying on local DB.", e.message);
    }
}
loadFromSupabase();


function saveState() {
    fs.writeFileSync(DB_FILE, JSON.stringify({ logs: systemLogs, deliverables }));
}

const rosterKeys = ['CEO', 'CPO', 'CTO', 'Programmer', 'Tester', 'Reviewer', 'Data Analyst', 'Researcher'];
rosterKeys.forEach(k => { activeAgents[k] = { id: k, role: k, status: 'idle', x: 0, y: 0 }; });

async function addLog(logObj) {
    // Drop [Routine] logs from persistence and UI list
    if (logObj.text && logObj.text.includes('[Routine]')) return;

    logObj.timestamp = Date.now();
    systemLogs.push(logObj);
    saveState();
    // // if(systemLogs.length > 300) systemLogs.shift(); // Disabled cap to keep multi-project history
    io.emit('new_log', logObj);
    
    // Push to Supabase
    try {
        await supabase.from('mas_chat_logs').insert([{
            project: logObj.project || '',
            type: logObj.type,
            sender: logObj.from,
            receiver: logObj.to || null,
            text: logObj.text,
            action_target: logObj.actionTarget || null
        }]);
    } catch(e) { console.error('Supabase log error:', e); }
}

// Broadcast movement/status to world
function emitAction(agent, type, message, actionTarget = null, project = '') {
    activeAgents[agent] = activeAgents[agent] || { id: agent, status: 'working' };
    activeAgents[agent].status = 'working';
    const eventData = { agent, type, message, status: 'working', actionTarget, state: activeAgents[agent], project };
    io.emit('agent_event', eventData);
}

// Full wrapper for an agent doing something and logging it
function agentThought(agent, text, actionTarget = null, project = '') {
    emitAction(agent, 'thought', text, actionTarget, project);
    addLog({ type: 'thought', from: agent, text, project });
}

function agentTalk(from, to, text, actionTarget = null, project = '') {
    emitAction(from, 'talk', text, actionTarget, project);
    addLog({ type: 'direct', from, to, text, project });
}

// Autonomous Living Engine
const idleActions = ["Organizing bookshelf 📚", "Daydreaming...", "Looking out the window...", "Debugging code 💻", "Drinking coffee ☕", "Writing comments..."];
setInterval(() => {
    const idleAgents = Object.values(activeAgents).filter(a => a.status === 'idle');
    if (idleAgents.length > 0 && Math.random() < 0.4) {
        const agent = idleAgents[Math.floor(Math.random() * idleAgents.length)];
        const action = idleActions[Math.floor(Math.random() * idleActions.length)];
        emitAction(agent.id, 'autonomous', action);
        addLog({ type: 'thought', from: agent.id, text: `[Routine] ${action}` });
    }
}, 10000);

// ==========================================
// TASK QUEUE MANAGER
// ==========================================
const projectQueues = {};

function emitQueueUpdate(project) {
    if (!projectQueues[project]) return;
    const { isRunning, currentTask, pending } = projectQueues[project];
    io.emit('queue_update', { project, isRunning, currentTask, pending });
}

function processQueue(project) {
    if (!projectQueues[project]) projectQueues[project] = { isRunning: false, currentTask: null, pending: [] };
    const pq = projectQueues[project];
    
    if (pq.isRunning) {
        emitQueueUpdate(project);
        return;
    }
    if (pq.pending.length === 0) {
        pq.currentTask = null;
        pq.isRunning = false;
        emitQueueUpdate(project);
        return;
    }
    
    pq.isRunning = true;
    const task = pq.pending.shift();
    pq.currentTask = task;
    emitQueueUpdate(project);
    
    const { actualTarget, actualMessage } = task;
    
    if (actualTarget) {
        // Log is already added in /api/chat immediately
        const agentId = 'mas_' + actualTarget.toLowerCase().replace(' ', '_');
        emitAction(actualTarget, 'thought', 'Receiving command, processing...', null, project);
        
        const child = require('child_process').spawn('openclaw', [
            'agent', '--agent', agentId, '--message', actualMessage, '--session-id', `${agentId}_${Date.now()}_${Math.floor(Math.random()*1000)}`, '--thinking', 'high'
        ]);
        
        let fullReply = "";
        let moveEmitted = false;
        
        child.stdout.on('data', d => {
            const chunk = d.toString();
            fullReply += chunk;
            if (!moveEmitted) {
                const moveMatch = fullReply.match(/<move>(.*?)<\/move>/i);
                if (moveMatch) {
                    moveEmitted = true;
                    const moveTarget = moveMatch[1].trim();
                    const mLower = moveTarget.toLowerCase();
                    const rosterKeys = ['ceo', 'cpo', 'cto', 'programmer', 'tester', 'reviewer', 'data analyst', 'researcher'];
                    const locMap = { 'tester': 'qa', 'programmer': 'dev', 'researcher': 'research', 'data analyst': 'qa', 'reviewer': 'qa' };
                    let matchedPerson = rosterKeys.find(k => k.toLowerCase() === mLower);
                    if (matchedPerson) {
                        io.emit('agent_approach', { from: actualTarget, to: matchedPerson, message: `Heading to ${matchedPerson}...`, project });
                    } else {
                        let loc = locMap[mLower] || mLower;
                        emitAction(actualTarget, 'autonomous', `Moving to ${moveTarget}...`, loc, project);
                    }
                }
            }
        });
        
        child.on('close', () => {
            let finalTxt = fullReply;
            const finalMatch = fullReply.match(/<final>([\s\S]*?)<\/final>/);
            if (finalMatch) finalTxt = finalMatch[1];
            
            const deliverableMatch = finalTxt.match(/<deliverable>([\s\S]*?)<\/deliverable>/i);
            if (deliverableMatch) {
                const b64 = Buffer.from(deliverableMatch[1].trim()).toString('base64');
                const dataUri = `data:text/markdown;base64,${b64}`;
                deliverables.push({ name: `${actualTarget}_Delivery_${Date.now()}.md`, url: dataUri, type: 'Deliverable', project });
                saveState();
                io.emit('deliverable_ready', deliverables[deliverables.length - 1]);
                addLog({ type: 'global', from: 'System', text: `🎉 ${actualTarget} submitted a new deliverable! Please check the top inventory.`, project, timestamp: Date.now() });
                finalTxt = finalTxt.replace(deliverableMatch[0], '').trim();
            }

            finalTxt = finalTxt.replace(/<move>.*?<\/move>/ig, '').replace(/<think>[\s\S]*?<\/think>/ig, '').trim();
            if (!finalTxt) finalTxt = "Execution complete.";
            addLog({ type: 'direct', from: actualTarget, to: 'Boss', text: finalTxt, project });
            emitAction(actualTarget, 'chatting', finalTxt, null, project);
            setTimeout(() => emitAction(actualTarget, 'idle', 'Standby', null, project), 8000);
            
            pq.isRunning = false;
            processQueue(project);
        });
    } else {
        // Log is already added in /api/chat immediately
        addLog({ type: 'global', from: 'System', text: 'Command received', project });
        
        const child = require('child_process').spawn('node', ['/root/workspace/openclaw-mas-ui/mas_swarm.js', actualMessage, project || 'main'], {
            env: { ...process.env }
        });
        child.stdout.on('data', (data) => console.log('Python stdout:', data.toString()));
        child.stderr.on('data', (data) => console.error('Python stderr:', data.toString()));
        child.on('close', (code) => {
            console.log('Python Agent Process exited with code', code);
            pq.isRunning = false;
            processQueue(project);
        });
    }
}

app.post('/api/chat', (req, res) => {
    const { message, target, project } = req.body;
    const projKey = project || 'main';

    let actualTarget = target;
    let actualMessage = message;

    const rosterKeys = ['ceo', 'cpo', 'cto', 'programmer', 'tester', 'reviewer', 'data analyst', 'researcher'];
    if (!target && message.startsWith('@')) {
        const spaceIdx = message.indexOf(' ');
        if (spaceIdx > -1) {
            const possibleTarget = message.substring(1, spaceIdx);
            const matched = rosterKeys.find(k => k.toLowerCase() === possibleTarget.toLowerCase());
            if (matched) {
                actualTarget = matched;
                actualMessage = message.substring(spaceIdx + 1).trim();
            }
        }
    }
    
    if (!projectQueues[projKey]) projectQueues[projKey] = { isRunning: false, currentTask: null, pending: [] };

    // IMMEDIATELY log the Boss's message so the user sees it in the chat interface regardless of queue state.
    if (actualTarget) {
        addLog({ type: 'direct', from: 'Boss', to: actualTarget, text: actualMessage, project: projKey });
    } else {
        addLog({ type: 'global', from: 'Boss', text: actualMessage, project: projKey });
    }

    const taskId = Date.now().toString() + Math.floor(Math.random()*1000);
    projectQueues[projKey].pending.push({
        id: taskId,
        actualTarget,
        actualMessage,
        rawMessage: message,
        timestamp: Date.now()
    });
    
    addLog({ type: 'global', from: 'System', text: `📌 Task queued: "${message.substring(0, 30)}..."`, project: projKey });
    
    processQueue(projKey);
    res.json({ success: true, message: 'Task queued' });
});



// INTER-AGENT COMMUNICATION API
app.post('/api/agent_chat', (req, res) => {
    const { from, to, message, project } = req.body;
    addLog({ type: 'direct', from, to, text: `[Collaboration Request]\n${message || ''}`, project });
    
    // Decoupled: Let the UI handle the spatial routing
    io.emit('agent_approach', { from, to, message: `Heading to ${to} to discuss task...`, project });
    emitAction(to, 'thought', `Receiving data stream from ${from}...`, null, project);
    
    const agentId = 'mas_' + to.toLowerCase().replace(' ', '_');
    const child = require('child_process').spawn('openclaw', [
        'agent', 
        '--agent', agentId, 
        '--message', `[Message from ${from}]: ${message}`, 
        '--session-id', `${agentId}_chat_${Date.now()}`, 
        '--json'
    ]);
    
    let fullReply = "";
    child.stdout.on('data', d => fullReply += d.toString());
    child.on('close', () => {
        let finalTxt = "No response.";
        try {
            const parsed = JSON.parse(fullReply);
            if (parsed.result && parsed.result.payloads && parsed.result.payloads.length > 0) {
                finalTxt = parsed.result.payloads[0].text;
            }
        } catch(e) {
            finalTxt = fullReply.trim() || "No response.";
        }
        
        addLog({ type: 'direct', from: to, to: from, text: finalTxt, project });
        emitAction(to, 'chatting', 'Collaboration complete.', null, project);
        setTimeout(() => emitAction(to, 'idle', 'Standby', null, project), 4000);
        
        res.json({ reply: finalTxt });
    });
});


app.get('/api/read_log', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const agent = req.query.agent || '';
    const safeAgent = agent.toLowerCase().replace(' ', '_');
    const logPath = path.join(__dirname, 'agents', safeAgent, 'workspace', 'TODO_LOG.md');
    try {
        if (fs.existsSync(logPath)) {
            res.json({ content: fs.readFileSync(logPath, 'utf8') });
        } else {
            res.json({ content: "This employee has no logged records yet." });
        }
    } catch(e) {
        res.json({ content: "Failed to read." });
    }
});


// KILL ALL AGENTS API
app.post('/api/kill', async (req, res) => {
    try {
        require('child_process').execSync('pkill -f "openclaw agent"');
        require('child_process').execSync('pkill -f "mas_swarm.js"');
    } catch(e) {}
    
    const { project } = req.body;
    const projKey = project || 'main';
    
    // Clear the queue for this project
    if (projectQueues[projKey]) {
        projectQueues[projKey].pending = [];
        projectQueues[projKey].isRunning = false;
        projectQueues[projKey].currentTask = null;
    }
    
    
    const roster = ['CEO', 'CPO', 'CTO', 'Programmer', 'Tester', 'Reviewer', 'Data Analyst', 'Researcher'];
    roster.forEach(k => {
        io.emit('agent_event', { project: projKey, agent: k, type: 'autonomous', message: 'Standby', actionTarget: 'home' });
    });
    const emergencyMsg = '🛑 [Emergency Stop] Forcibly terminated all AI employee processes and cleared the pending queue.';
    
    // Push to Supabase instead of memory wipe
    const { error } = await supabase.from('mas_chat_logs').insert([{
        project: projKey,
        type: 'global',
        sender: 'System',
        receiver: null,
        text: emergencyMsg
    }]);

    if (!error) {
        io.emit('new_log', {
            project: projKey,
            type: 'global',
            from: 'System',
            to: null,
            text: emergencyMsg,
            timestamp: Date.now()
        });
    }

    io.emit('queue_update', Object.assign({ project: projKey }, projectQueues[projKey]));
    res.json({ success: true });
});

app.post('/api/queue/remove', (req, res) => {
    const { project, index } = req.body;
    const projKey = project || 'main';
    if (projectQueues[projKey] && projectQueues[projKey].pending) {
        projectQueues[projKey].pending.splice(index, 1);
        io.emit('queue_update', Object.assign({ project: projKey }, projectQueues[projKey]));
    }
    res.json({ success: true });
});

app.post('/api/clear', async (req, res) => {
    const { project } = req.body;
    const projKey = project || 'main';
    
    // Filter out logs and deliverables for this project
    systemLogs = systemLogs.filter(l => (l.project || 'main') !== projKey);
    deliverables = deliverables.filter(d => (d.project || 'main') !== projKey);
    
    // Create clear event log
    const clearLog = { project: projKey, type: 'global', from: 'System', text: '🗑️ [Grafilab] Records cleared. Employee session memories reset.', timestamp: Date.now() };
    systemLogs.push(clearLog);
    
    // Wipe from Supabase
    try {
        await supabase.from('mas_chat_logs').delete().eq('project', projKey);
        await supabase.from('mas_deliverables').delete().eq('project', projKey);
        
        // Save the clear log
        await supabase.from('mas_chat_logs').insert([{
            project: projKey,
            type: 'global',
            sender: 'System',
            receiver: null,
            text: clearLog.text
        }]);
    } catch(e) {}
    
    io.emit('clear_history', { project: projKey });
    io.emit('new_log', clearLog);
    
    res.json({ success: true });
});

app.get('/api/deliverables', (req, res) => res.json(deliverables));
io.on('connection', (socket) => socket.emit('init_state', { agents: activeAgents, logs: systemLogs, deliverables }));


// ==========================================
// REAL-TIME EVENT BRIDGE & HITL
// ==========================================
let pendingHitlResolvers = {};

app.post('/api/webhook/emit', (req, res) => {
    const { agent, type, text, to, actionTarget, deliverable, options, project } = req.body;
    
    // Hitl interception (Interactive Prompt)
    if (type === 'ask_boss') {
        const questionId = `hitl_${Date.now()}`;
        
        // Broadcast the question modal to all connected UI clients
        io.emit('hitl_request', { agent, questionId, text, options, project });
        addLog({ type: 'global', from: agent, text: `❓ [Pending Boss Decision] ${text}`, project });
        
        // Suspend the HTTP response (Keep-Alive) until the UI replies!
        // Timeout after 5 minutes if Boss is AFK
        let isResolved = false;
        const timer = setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                delete pendingHitlResolvers[questionId];
                io.emit('hitl_timeout', { questionId });
                res.json({ success: false, answer: "System Timeout: Boss did not respond. Proceed with your best assumption." });
            }
        }, 3600000);
        
        pendingHitlResolvers[questionId] = (answer) => {
            if (!isResolved) {
                isResolved = true;
                clearTimeout(timer);
                res.json({ success: true, answer });
            }
        };
        return; // Don't send res.json yet!
    }

    // Dynamic Registration: If agent doesn't exist, create them!
    if (agent && !activeAgents[agent] && agent !== 'System' && agent !== 'Boss') {
        activeAgents[agent] = { id: agent, role: agent, status: 'idle', x: Math.floor(Math.random()*100), y: Math.floor(Math.random()*100) };
    }

    if (actionTarget === 'meeting_all') {
        rosterKeys.forEach(k => {
            emitAction(k, 'meeting', '', 'meeting', project);
        });
        if (text) addLog({ type: 'global', from: agent || 'System', text, project });
        return res.json({ success: true });
    }

    if (type === 'thought') {
        agentThought(agent, text, actionTarget, project);
    } else if (type === 'talk') {
        agentTalk(agent, to || 'Boss', text, actionTarget, project);
    } else if (type === 'deliver') {
        if (deliverable) {
            deliverable.project = project; deliverables.push(deliverable);
            saveState();
            io.emit('deliverable_ready', deliverable);
            agentTalk(agent, 'Boss', `[File Delivery] ${deliverable.name}`, 'home', project);
            
            // Push to Supabase
            supabase.from('mas_deliverables').insert([{
                project: project || '',
                name: deliverable.name,
                type: deliverable.type || 'text',
                content: deliverable.content || ''
            }]).then(({error}) => { if (error) console.error('Supabase deliver error:', error); });
        }
    } else if (type === 'system') {
        addLog({ type: 'global', from: 'System', text, project });
    }

    res.json({ success: true, message: 'Event broadcasted to UI' });
});

// HITL RESPONSE RECEIVER FROM UI
app.post('/api/webhook/hitl-response', (req, res) => {
    const { questionId, answer, project } = req.body;
    if (pendingHitlResolvers[questionId]) {
        pendingHitlResolvers[questionId](answer);
        delete pendingHitlResolvers[questionId];
        addLog({ type: 'global', from: 'Boss', text: `✅ [Decision Submitted]: ${answer}`, project });
        res.json({ success: true });
    } else {
        res.json({ success: false, error: "Question expired or doesn't exist." });
    }
});

// PROJECT MANAGER API
const PROJECTS_DIR = '/root/workspace/mas-projects';

app.get('/api/projects', (req, res) => {
    try {
        const fs = require('fs');
        if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true });
        const dirs = fs.readdirSync(PROJECTS_DIR).filter(f => fs.statSync(require('path').join(PROJECTS_DIR, f)).isDirectory());
        res.json({ success: true, projects: dirs });
    } catch(e) {
        res.json({ success: false, error: e.message });
    }
});

app.post('/api/projects', async (req, res) => {
    try {
        const { name, copyFrom } = req.body;
        if (!name || name.includes('/') || name.includes('..')) return res.json({ success: false, error: 'Invalid name' });
        const fs = require('fs');
        const path = require('path');
        const targetDir = path.join(PROJECTS_DIR, name);
        
        if (fs.existsSync(targetDir)) return res.json({ success: false, error: 'Project already exists' });
        fs.mkdirSync(targetDir, { recursive: true });

        if (copyFrom !== undefined) {
            const sourceName = copyFrom === '' ? 'main' : copyFrom;
            const sourceDir = path.join(PROJECTS_DIR, sourceName);
            if (fs.existsSync(sourceDir)) {
                require('child_process').execSync(`cp -rn ${sourceDir}/* ${targetDir}/ || true`);
            }
            
            // Duplicate Supabase logs
            const { data: logs } = await supabase.from('mas_chat_logs').select('*').eq('project', copyFrom).order('created_at', { ascending: true });
            if (logs && logs.length > 0) {
                const newLogs = logs.map(l => {
                    const { id, created_at, ...rest } = l;
                    return { ...rest, project: name };
                });
                await supabase.from('mas_chat_logs').insert(newLogs);
                newLogs.forEach(r => systemLogs.push({ project: r.project, type: r.type, from: r.sender, to: r.receiver, text: r.text, actionTarget: r.action_target, timestamp: Date.now() }));
            }
            
            // Duplicate Supabase deliverables
            const { data: dels } = await supabase.from('mas_deliverables').select('*').eq('project', copyFrom).order('created_at', { ascending: true });
            if (dels && dels.length > 0) {
                const newDels = dels.map(d => {
                    const { id, created_at, ...rest } = d;
                    return { ...rest, project: name };
                });
                await supabase.from('mas_deliverables').insert(newDels);
                newDels.forEach(r => deliverables.push({ project: r.project, name: r.name, type: r.type, content: r.content }));
            }
        }
        res.json({ success: true });
    } catch(e) {
        console.error(e);
        res.json({ success: false, error: e.message });
    }
});


// ACTIVE APPS MANAGER API
app.get('/api/apps', (req, res) => {
    try {
        const { execSync } = require('child_process');
        const out = execSync("netstat -tlnp 2>/dev/null | grep -E ':(8[0-9]{3}|9[0-9]{3})' || true").toString();
        let apps = [];
        const lines = out.split('\n').filter(l => l.trim());
        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            const localAddress = parts[3];
            const port = localAddress.split(':').pop();
            const pidProg = parts[6]; 
            if (pidProg && pidProg.includes('/')) {
                const [pid, prog] = pidProg.split('/');
                let cmd = prog;
                try { cmd = execSync(`ps -o args= -p ${pid} || true`).toString().trim(); } catch(e) {}
                if (!cmd.includes('server.js') && !cmd.includes('openclaw')) {
                    apps.push({ pid, port, prog, cmd });
                }
            }
        });
        let ip = 'localhost';
        try { ip = execSync('curl -s ifconfig.me', {timeout: 2000}).toString().trim(); } catch(e){}
        res.json({ apps, ip });
    } catch(e) {
        res.json({ apps: [], error: e.message });
    }
});

app.post('/api/apps/kill', (req, res) => {
    try {
        const { pid } = req.body;
        require('child_process').execSync(`kill -9 ${pid} || true`);
        res.json({ success: true });
    } catch(e) {
        res.json({ success: false });
    }
});

// PUSH APP TO GITHUB API
app.post('/api/apps/push', (req, res) => {
    try {
        const { pid, token, repo, username } = req.body;
        const { execSync } = require('child_process');
        
        // Get process working directory
        const out = execSync(`pwdx ${pid}`).toString().trim();
        const dir = out.split(': ')[1];
        if (!dir || !require('fs').existsSync(dir)) {
            return res.json({ success: false, error: 'App directory not found' });
        }
        
        // Safety check
        if (dir === '/' || dir === '/root') {
            return res.json({ success: false, error: 'Cannot push root directory' });
        }

        // Prevent pushing secrets that trigger GitHub's Push Protection (GH013)
        try {
            const fs = require('fs');
            // We append to ensure we don't wipe what AI wrote.
            // Notice: We do NOT ignore .env.template or .env.example so they can be pushed!
            fs.appendFileSync(`${dir}/.gitignore`, "\nnode_modules/\n.env\n.env.local\n.env.development\n.env.production\n*.key\n*.pem\nsecrets.json\n");
            
            // Absolute Purge: Delete the actual local .env files before git add so they physically can't be added
            require('child_process').execSync(`rm -f ${dir}/.env ${dir}/.env.local ${dir}/.env.development ${dir}/.env.production`, { stdio: 'ignore' });
            
            // Hardcore API Key Scrubber: Find any string looking like AIzaSy (Google) or sk- (OpenAI) or ghp_ (Github) or AQ. (GCP Service Account) in source code and redact it
            const scrubCmd = `find ${dir} -type f -not -path "*/.git/*" -not -path "*/node_modules/*" -exec sed -i -E 's/(AIzaSy|sk-[a-zA-Z0-9]{30,}|ghp_[a-zA-Z0-9]{36,}|AQ\\.[a-zA-Z0-9_-]{30,})[a-zA-Z0-9_-]*/[REDACTED_API_KEY]/g' {} +`;
            require('child_process').execSync(scrubCmd, { stdio: 'ignore' });
            
            // Generic token/key remover for any quoted string over 35 chars next to the word "key" or "token" to be ultra-safe
            const genericScrub = `find ${dir} -type f -not -path "*/.git/*" -not -path "*/node_modules/*" -exec sed -i -E "s/(key|token|password)['\\\"\\\`]:?\\s*['\\\"\\\`][a-zA-Z0-9_\\\\-\\\\.]{35,}['\\\"\\\`]/\\1: '[REDACTED_SECRET]'/gi" {} +`;
            try { require('child_process').execSync(genericScrub, { stdio: 'ignore' }); } catch(err) {}

            // If the AI has ALREADY committed the secrets, we must DESTROY the local git history and start fresh,
            // otherwise GitHub will still reject the push because the secrets exist in the commit history!
            require('child_process').execSync(`rm -rf ${dir}/.git`, { stdio: 'ignore' });
        } catch(e) {}

        // Enforce Git config identity so the AI's commits are attributed to the bot
        try {
            execSync(`git init`, { cwd: dir });
            execSync(`git config user.email "mas-ui@grafilab.com"`, { cwd: dir });
            execSync(`git config user.name "Grafilab AI Coder"`, { cwd: dir });
            execSync(`git branch -M main`, { cwd: dir, stdio: 'ignore' });
            
            // We force a clean initial commit containing the scrubbed codebase
            execSync(`git add .`, { cwd: dir });
            execSync(`git commit -m "Initial commit (Auto-scrubbed by System)"`, { cwd: dir, stdio: 'ignore' });
        } catch(e) {}
        
        // Create repo via curl (GitHub API)
        try {
            const repoData = JSON.stringify({ name: repo, private: false });
            execSync(`curl -s -H "Authorization: token ${token}" -H "Accept: application/vnd.github.v3+json" -d '${repoData}' https://api.github.com/user/repos`);
        } catch(e) {}

        const remoteUrl = `https://${username}:${token}@github.com/${username}/${repo}.git`;
        try { execSync(`git remote remove origin`, { cwd: dir, stdio: 'ignore' }); } catch(e) {}
        
        execSync(`git remote add origin ${remoteUrl}`, { cwd: dir });
        
        try {
            execSync(`git push -u origin main -f`, { cwd: dir, stdio: 'pipe' });
        } catch(pushErr) {
            return res.json({ success: false, error: `Git Push Failed: ${pushErr.stderr ? pushErr.stderr.toString() : pushErr.message}` });
        }
        
        res.json({ success: true, url: `https://github.com/${username}/${repo}` });
    } catch(e) {
        res.json({ success: false, error: e.message || String(e) });
    }
});

app.post('/api/deliverables/delete', (req, res) => {
    const { name } = req.body;
    deliverables = deliverables.filter(d => d.name !== name);
    saveState();
    io.emit('init_state', { agents: activeAgents, logs: systemLogs, deliverables, queues: projectQueues });
    res.json({ success: true });
});

server.listen(18802, () => console.log(`Sandbox running on 18802`));
