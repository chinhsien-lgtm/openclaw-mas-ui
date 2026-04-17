const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://lhqwfnhvaafjbcwvlqpi.supabase.co', 'sb_publishable_ucSK26SCh9M2VsosZo4-cw_PDg1RO-Z');

async function test() {
  const { data, error } = await supabase.from('todos').select('*').limit(1);
  console.log("data:", data);
  console.log("error:", error);
}
test();
