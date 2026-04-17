const { spawn } = require('child_process');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/root/workspace/openclaw-mas-ui/.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lhqwfnhvaafjbcwvlqpi.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_ucSK26SCh9M2VsosZo4-cw_PDg1RO-Z';
const supabase = createClient(supabaseUrl, supabaseKey);
function nativeFetch(url, options) {
    const urlObj = new URL(url);
    const opts = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: options.method || 'GET',
        headers: options.headers || {}
    };
    return new Promise((resolve, reject) => {
        const req = http.request(opts, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ json: () => Promise.resolve(JSON.parse(data)), text: () => Promise.resolve(data) }));
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}


const query = process.argv[2] || 'hello';
const project = process.argv[3] || '';
const BASE_WORKSPACE = project ? `/root/workspace/mas-projects/${project}` : '/root/workspace/mas-projects/main';
const WEBHOOK = 'http://localhost:18802/api/webhook/emit';

function emitHitl(agent, question, options) {
    return new Promise((resolve) => {
        const body = JSON.stringify({ 
            project,
            agent, 
            type: 'ask_boss', 
            text: question, 
            options,
            actionTarget: 'meeting'
        });
        
        const req = http.request(WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed.answer || 'No response');
                } catch(e) { resolve('No response'); }
            });
        });
        req.on('error', () => resolve('No response'));
        req.write(body);
        req.end();
    });
}

function emit(agent, evt_type, text, actionTarget, to) {
    if (!text && evt_type !== 'meeting_all') return;
    const body = JSON.stringify({ project, agent, type: evt_type, text, actionTarget, to });
    const req = http.request('http://localhost:18802/api/webhook/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    });
    req.on('error', () => {});
    req.write(body);
    req.end();
}

function emit_deliver(deliverable) {
    const body = JSON.stringify({ project, agent: "Reviewer", type: "deliver", to: "Boss", actionTarget: "home", deliverable });
    const req = http.request('http://localhost:18802/api/webhook/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    });
    req.on('error', () => {});
    req.write(body);
    req.end();
}

function emit_meeting_all(text) {
    const body = JSON.stringify({ project, actionTarget: "meeting_all", agent: "CEO", text });
    const req = http.request('http://localhost:18802/api/webhook/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    });
    req.on('error', () => {});
    req.write(body);
    req.end();
}

function runAgent(role, location, prompt) {
    return new Promise((resolve) => {
        const agentId = `mas_${role.toLowerCase().replace(' ', '_')}`;
        emit(role, 'thought', `Process [${agentId}] waking up, loading exclusive identity...`, location);
        
        const child = spawn('openclaw', [
            'agent', 
            '--agent', agentId, 
            '--session-id', `${agentId}_task_${Date.now()}_${Math.floor(Math.random()*1000)}`, 
            '--message', prompt,
            '--thinking', 'high'
        ]);
        
        let buffer = '';
        let last_thought_len = 0;

        child.stdout.on('data', d => {
            const chunk = d.toString();
            buffer += chunk;
            
            // Tool call detection
            if (chunk.includes('Tool call')) {
                if (chunk.includes('exec')) emit(role, 'thought', 'Terminal Operation: Executing Shell command...', location);
                if (chunk.includes('read') || chunk.includes('memory')) emit(role, 'thought', 'Knowledge Base: Retrieving internal files...', location);
                if (chunk.includes('write') || chunk.includes('edit')) emit(role, 'thought', 'Code Edit: Saving source code modifications...', location);
                if (chunk.includes('web_search') || chunk.includes('curl')) emit(role, 'thought', 'Network Probe: Fetching latest data...', location);
            }
            
            const lastThinkOpen = buffer.lastIndexOf('<think>');
            const lastThinkClose = buffer.lastIndexOf('</think>');
            
            if (lastThinkOpen > lastThinkClose) {
                const currentThought = buffer.substring(lastThinkOpen + 7);
                if (currentThought.length - last_thought_len > 25) {
                    let snippet = currentThought.substring(currentThought.length - 25).replace(/\n/g, ' ');
                    emit(role, 'thought', snippet + '...', location);
                    last_thought_len = currentThought.length;
                }
            } else {
                last_thought_len = 0;
            }

            // HITL Trigger Detection inside Stream
            const hitlMatch = buffer.match(/<ask_boss>([\s\S]*?)<\/ask_boss>/);
            if (hitlMatch && !buffer.includes('hitl_answered_')) {
                try {
                    const hitlData = JSON.parse(hitlMatch[1]);
                    // Pause buffer to prevent re-triggering while waiting
                    buffer += '<!-- hitl_answered_pending -->';
                    
                    // Trigger webhook block
                    emitHitl(role, hitlData.question, hitlData.options).then(answer => {
                        // We must inject the boss's answer back into the agent's memory
                        // (Note: To truly inject this into the openclaw session dynamically without closing it, 
                        // we need to use the sessions_send tool or append to prompt.
                        // For MVP, we will save it to a file that the agent is instructed to read).
                        require('child_process').execSync(`echo "BOSS_ANSWER: ${answer}" > /tmp/hitl_response_${agentId}.txt`);
                        buffer += `\n<!-- Boss Answer Received: ${answer} -->\n`;
                    });
                } catch(e) {}
            }
        });

        child.on('close', (code) => {
            console.log('Process exited with code', code);
            let finalTxt = buffer;
            const finalMatch = buffer.match(/<final>([\s\S]*?)<\/final>/);
            if (finalMatch) finalTxt = finalMatch[1].trim();
            finalTxt = finalTxt.replace(/<move>.*?<\/move>/ig, '').trim();
            emit(role, 'working', '💤 Task complete, process destroyed, memory retained.', location);
            resolve(finalTxt);
        });
    });
}

async function main() {
    console.log('Started main');
    emit('System', 'system', `Parsing command: '${query}'`);
    
    // Ask CEO to dynamically orchestrate
    let serverIp = 'localhost';
    try {
        serverIp = require('child_process').execSync('curl -s ifconfig.me', {timeout: 3000}).toString().trim();
    } catch(e) {}
    

    let currentTree = 'Empty Directory';
    try {
        if (require('fs').existsSync(BASE_WORKSPACE)) {
            currentTree = require('child_process').execSync('find "' + BASE_WORKSPACE + '" -type f -not -path "*/node_modules/*" -not -path "*/.git/*"').toString().trim().split('\n').map(l => l.replace(BASE_WORKSPACE, '')).join('\n');
        }
    } catch(e) {}

    
    let recentChatContext = '';
    try {
        const { data: logs } = await supabase.from('mas_chat_logs')
            .select('sender, receiver, type, text')
            .eq('project', project || 'main')
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (logs && logs.length > 0) {
            recentChatContext = "\n\n[RECENT CHAT HISTORY FOR CONTEXT]:\n" + logs.reverse().map(l => `[${l.type}] ${l.sender}${l.receiver ? ' -> ' + l.receiver : ''}: ${l.text}`).join('\n');
        }
    } catch(e) {}

    const ceoPrompt = `[CURRENT PROJECT FILES IN ${BASE_WORKSPACE}]:\n${currentTree}${recentChatContext}\n\nBoss Command: "${query}"\nWorkspace context: ${project ? "Project: " + project : "Default sandbox"}.\nYou are the CEO. You have the following autonomous Team Members:\n- CPO: Product, UI/UX Design, System Architecture. (MUST output a strict multi-file JSON folder structure for the project).\n- CTO: Deployment, Server Architecture, Environment Setup (Must run npm install and randomly pick port 8000-9999 if deploying)\n- Programmer: Writing actual code. (MUST use tools to create directories and write multiple files based on CPO's structure).\n- Tester: Quality assurance, debugging, checking code\n- Data Analyst: Processing, formatting, and analyzing data (CSV/JSON)\n- Researcher: Deep web search, scraping, finding information\n\nCRITICAL DIRECTIVE: The project workspace is located at ${BASE_WORKSPACE}. All generated code and files MUST be created inside this exact directory. DYNAMICALLY analyze the Boss's request and construct the absolute best sequential workflow by picking 2 to 4 roles. You decide the order based on logical dependencies.\n\nReturn strictly JSON (absolutely DO NOT include \`\`\`json tags). ALL JSON VALUES, SPEECH, AND REASONING MUST BE IN ENGLISH:\n{"ceo_speech": "Words spoken in broadcast", "movements": { "Role1": "meeting", "Role2": "dev" }, "tasks": { "Role1": "exact task description (explicitly mention paths in ${BASE_WORKSPACE})", "Role2": "exact task description" }, "handoffs": [ {"from": "Role1", "to": "Role2", "reason": "reason for handoff"} ]}\nIf the command is unclear, please return:\n{"ceo_speech": "Words spoken in broadcast explaining the confusion and presenting the options", "movements": {}, "tasks": {}, "handoffs": [], "ask_options": ["Option A", "Option B", "Other (Input)"]}\nNOTE: Provide 2 or 3 highly specific options based on what is missing in the command.`;

    emit('CEO', 'talk', 'Received Boss command, utilizing LLM to generate dynamic execution flow and communication topology...', 'meeting', 'Boss');

    console.log('Running CEO');
    const ceoRaw = await runAgent('CEO', 'meeting', ceoPrompt);
    console.log('CEO returned:', ceoRaw);
    let plan = { ceo_speech: "I will dynamically allocate tasks based on requirements!", movements: {}, tasks: {}, handoffs: [] };

    
    try {
        const jsonStr = ceoRaw.substring(ceoRaw.indexOf('{'), ceoRaw.lastIndexOf('}') + 1);
        plan = JSON.parse(jsonStr);
        emit('CEO', 'talk', plan.ceo_speech, 'meeting', 'Boss');
        
        if (Object.keys(plan.tasks).length === 0) {
            // The CEO is confused and asked for details. Trigger HITL manually!
            const options = plan.ask_options || ["Proceed with standard best practices", "Abort task", "Other (Input)"];
            const hitlText = `Regarding your task: "${query}"\n\n${plan.ceo_speech}`;
            const answer = await emitHitl('CEO', hitlText, options);
            emit('CEO', 'talk', `Received clarification: ${answer}. Proceeding to re-evaluate.`, 'meeting', 'Boss');
            // Re-run the CEO with the combined query
            const newQuery = query + " \n[Clarification]: " + answer;
            const newCeoPrompt = ceoPrompt.replace(query, newQuery);
            const newCeoRaw = await runAgent('CEO', 'meeting', newCeoPrompt);
            try {
                const newJsonStr = newCeoRaw.substring(newCeoRaw.indexOf('{'), newCeoRaw.lastIndexOf('}') + 1);
                plan = JSON.parse(newJsonStr);
                emit('CEO', 'talk', plan.ceo_speech, 'meeting', 'Boss');
            } catch(e) {
                // Fallback
                plan.tasks = { "Programmer": newQuery };
                plan.movements = { "Programmer": "dev" };
                plan.handoffs = [];
            }
        }
    } catch(e) {

        emit('CEO', 'talk', `Parsing failed. I will assign the raw task directly to the most suitable people to attempt completion.\n[System Fallback Allocation] CPO, Programmer, CTO`, 'meeting', 'Boss');
        // Dynamic fallback extraction from text if JSON fails
        const text = ceoRaw.toLowerCase();
        if (text.includes('data') || text.includes('research') || text.includes('analysis') || text.includes('search')) {
             plan.tasks = { "Researcher": query, "Data Analyst": "Process Researcher data" };
             plan.movements = { "Researcher": "research", "Data Analyst": "qa" };
             plan.handoffs = [ { "from": "Researcher", "to": "Data Analyst", "reason": "Data cleaning and integration" } ];
        } else {
             plan.tasks = { "CPO": "Analyze requirements and output design specs", "Programmer": query, "CTO": "Execute scripts and deploy the service" };
             plan.movements = { "CPO": "meeting", "Programmer": "dev", "CTO": "home" };
             plan.handoffs = [ { "from": "CPO", "to": "Programmer", "reason": "Design specs completed" }, { "from": "Programmer", "to": "CTO", "reason": "Code completed, ready for deployment" } ];
        }
    }

    await new Promise(r => setTimeout(r, 500));

    // Move people
    if (plan.movements) {
        let keys = Object.keys(plan.movements);
        if (keys.length > 0) {
            emit('System', 'system', `🚶 Vision Engine: Planning spatial pathfinding for ${keys.length} employees...`);
            for (let role in plan.movements) {
                let loc = plan.movements[role];
                emit(role, 'autonomous', 'Moving under CEO orders...', loc);
            }
        }
    }

    const rolesToRun = Object.keys(plan.tasks || {});
    if (rolesToRun.length === 0) {
        emit('System', 'system', `✨ Coordinate scheduling only, no compute load detected, physical engine sleeping.`);
        return;
    }

    emit('System', 'system', `⚡ Spinning up ${rolesToRun.length} Agent processes...`);

    // 1. Sort roles dynamically based on the topological graph (handoffs) generated by the CEO
    let executionOrder = [];
    let inDegree = {};
    let graph = {};
    
    // Initialize nodes
    rolesToRun.forEach(role => {
        inDegree[role] = 0;
        graph[role] = [];
    });
    
    // Build graph from CEO's handoffs
    (plan.handoffs || []).forEach(h => {
        if (rolesToRun.includes(h.from) && rolesToRun.includes(h.to)) {
            graph[h.from].push(h.to);
            inDegree[h.to] = (inDegree[h.to] || 0) + 1;
        }
    });
    
    // Topo sort
    let queue = rolesToRun.filter(role => inDegree[role] === 0);
    while(queue.length > 0) {
        let current = queue.shift();
        executionOrder.push(current);
        graph[current].forEach(neighbor => {
            inDegree[neighbor]--;
            if (inDegree[neighbor] === 0) queue.push(neighbor);
        });
    }
    
    // Fallback if there's a cycle or disconnected nodes
    rolesToRun.forEach(role => {
        if (!executionOrder.includes(role)) executionOrder.push(role);
    });

    let resultsObj = {};
    let previousOutput = "";

    // 2. TRUE SEQUENTIAL EXECUTION (Fixing the Time-Space Paradox)
    for (let role of executionOrder) {
        let loc = plan.movements && plan.movements[role] ? plan.movements[role] : 'dev';
        
        let prompt = `Your current task is: ${plan.tasks[role]}\n(Note: Boss's overall requirement is "${query}").\n\n`;
        if (previousOutput) {
             prompt += `[PREVIOUS STAGE OUTPUT (Context from colleague)]:\n${previousOutput.substring(0, 3000)}\n\n`;
        }
        prompt += `${recentChatContext}\n\nCRITICAL DIRECTIVES:\n1. WORKSPACE: Your working directory for this task is EXACTLY ${BASE_WORKSPACE}. Create the directory if it does not exist using \`exec mkdir -p ${BASE_WORKSPACE}\`. ALL code and files MUST be placed here.\n2. SELF-REFLECTION: Before doing anything, you MUST use the 'memory_search' tool to query past experiences from your workspace memory.\n3. EXECUTION: Do NOT just output text. You MUST use your tools (exec, write, etc.) to DO the work on the machine inside ${BASE_WORKSPACE}.\n4. HUMAN-IN-THE-LOOP (HITL): If you need Boss's feedback (e.g. for design choices or missing requirements), output EXACTLY this XML tag (with valid JSON inside): <ask_boss>{"question": "What color?", "options": ["Red", "Blue", "Other (Input)"]}</ask_boss>. Then, use 'exec' to run \`cat /tmp/hitl_response_mas_${role.toLowerCase()}.txt\` to read the answer. If it fails (file not found), you MUST use 'exec' with \`sleep 5\` and check again. DO NOT PROCEED WITH THE REST OF THE TASK until you successfully read the boss's answer.\n5. GIT: If modifying code, use 'exec' to \`git add .\` and \`git commit\` inside ${BASE_WORKSPACE}.\n6. LANGUAGE: ALL outputs MUST be strictly in ENGLISH. NO CHINESE.`;
        
        const result = await runAgent(role, loc, prompt);
        resultsObj[role] = result;
        previousOutput = result; // Pass this context down the waterfall

        // Real-time True Handoff UI Update
        const handoff = (plan.handoffs || []).find(h => h.from === role);
        if (handoff && rolesToRun.includes(handoff.to)) {
            emit('System', 'system', `🔄 True Handoff: Passing contextual data from ${role} to ${handoff.to}...`);
            let textData = result.substring(0, 100).replace(/\n/g, ' ');
            emit(role, 'talk', `Hi ${handoff.to}, I have completed my part!\n[Handoff Reason] ${handoff.reason}\n[Partial Output Preview] ${textData}...`, handoff.to, handoff.to);
            await new Promise(r => setTimeout(r, 1000));
            
            emit(handoff.to, 'talk', `Received! I am proceeding with further processing based on ${role}'s deliverables...`, role, role);
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    emit('System', 'system', `✅ Concurrent nodes and topology handoff complete. Spinning up Reviewer node for global wrap-up...`);
    emit('Reviewer', 'thought', 'I will review and summarize the deliverables from various concurrent nodes, and package them for the Boss!', 'REVIEW_DESK');

    let revPrompt = `Boss Command: ${query}\nYou are the Reviewer. The server's public IP is ${serverIp}. Please review all materials just submitted by the team, and distill/merge them into a beautifully crafted final Markdown report for the Boss. CRITICAL: If a web service was deployed, you MUST extract the port used by the CTO, construct the final URL (http://${serverIp}:PORT), and state it clearly.\nIMPORTANT: You must determine a highly descriptive, concise file name for this report (ending in .md) that directly reflects the final outcome or product name. You MUST put this filename inside a <filename> tag at the very beginning of your response. Example: <filename>Scientific_Calculator_Deployed.md</filename>.\nNote: Output ONLY the <filename> tag and the body of the final report, do not include <think> tags, and avoid any polite filler! THE ENTIRE REPORT MUST BE STRICTLY IN ENGLISH.\n`;
    for (let role of executionOrder) {
        revPrompt += `\n[${role}'s Final Output]:\n${resultsObj[role]}\n`;
    }

    const revOut = await runAgent('Reviewer', 'QA_DESK', revPrompt);

    // Extract dynamic filename from Reviewer's output
    let fileName = `Task_Report_${Date.now()}.md`;
    let cleanRevOut = revOut;
    const fileMatch = revOut.match(/<filename>(.*?)<\/filename>/i);
    if (fileMatch && fileMatch[1]) {
        fileName = fileMatch[1].trim().replace(/[^a-zA-Z0-9_\-\.]/g, '_');
        if (!fileName.endsWith('.md')) fileName += '.md';
        // Remove the tag from the final markdown body so it looks clean
        cleanRevOut = revOut.replace(fileMatch[0], '').trim();
    } else {
        const shortTime = new Date().toISOString().replace(/[:.]/g, '-').substring(11, 19);
        fileName = `Deliverable_${shortTime}.md`;
    }

    // Dynamic URL extraction and broadcast
    const urlMatch = cleanRevOut.match(/http:\/\/[0-9\.]+:\d+/);
    if (urlMatch) {
        emit('Reviewer', 'talk', `Boss, the product is deployed and live! You can access it directly here: ${urlMatch[0]}`, 'home', 'Boss');
    }

    const b64 = Buffer.from(cleanRevOut).toString('base64');
    const dataUri = `data:text/markdown;base64,${b64}`;

    emit_deliver({ name: fileName, url: dataUri, type: 'Enterprise Deliverable' });
    emit('System', 'system', '🎉 Industrial-grade fully autonomous array task successfully completed!');
}

main();
