const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/root/workspace/openclaw-mas-ui/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lhqwfnhvaafjbcwvlqpi.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_ucSK26SCh9M2VsosZo4-cw_PDg1RO-Z';
const supabase = createClient(supabaseUrl, supabaseKey);

const DB_FILE = '/root/workspace/openclaw-mas-ui/sandbox_db.json';

async function migrate() {
    if (!fs.existsSync(DB_FILE)) {
        console.log("No local DB found.");
        return;
    }
    
    const data = JSON.parse(fs.readFileSync(DB_FILE));
    
    if (data.logs && data.logs.length > 0) {
        console.log(`Migrating ${data.logs.length} logs...`);
        const logsToInsert = data.logs.map(l => ({
            project: l.project || 'noobieteam', // Fallback legacy to noobieteam
            type: l.type || 'global',
            sender: l.from || 'System',
            receiver: l.to || null,
            text: l.text || '',
            action_target: l.actionTarget || null,
            created_at: l.timestamp ? new Date(l.timestamp).toISOString() : new Date().toISOString()
        }));
        
        for (let i = 0; i < logsToInsert.length; i += 100) {
            const chunk = logsToInsert.slice(i, i + 100);
            const { error } = await supabase.from('mas_chat_logs').insert(chunk);
            if (error) console.error("Log migration error:", error);
        }
    }
    
    if (data.deliverables && data.deliverables.length > 0) {
        console.log(`Migrating ${data.deliverables.length} deliverables...`);
        const delToInsert = data.deliverables.map(d => ({
            project: d.project || 'noobieteam', // Fallback legacy to noobieteam
            name: d.name || 'unnamed',
            type: d.type || 'text',
            content: d.url || d.content || ''
        }));
        
        for (let i = 0; i < delToInsert.length; i += 100) {
            const chunk = delToInsert.slice(i, i + 100);
            const { error } = await supabase.from('mas_deliverables').insert(chunk);
            if (error) console.error("Deliverables migration error:", error);
        }
    }
    
    console.log("Migration complete!");
}

migrate();
