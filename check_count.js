const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/root/workspace/openclaw-mas-ui/.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lhqwfnhvaafjbcwvlqpi.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_ucSK26SCh9M2VsosZo4-cw_PDg1RO-Z';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { count } = await supabase.from('mas_chat_logs').select('*', { count: 'exact', head: true });
    console.log("Total logs:", count);
}
check();
