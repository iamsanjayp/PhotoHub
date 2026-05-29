const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hsczzvbvmeaylmoqmvmx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzY3p6dmJ2bWVheWxtb3Ftdm14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcwNDY5MCwiZXhwIjoyMDk1MjgwNjkwfQ.0GswCNHCtoF4ZbOdKlkmrUT1T5dZOeMPZyfNGwuoUbw';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    const { data: triggerList, error: listErr } = await supabase
      .from('equipment')
      .select('*');
    
    console.log('Equipment count:', triggerList ? triggerList.length : 'error');
    if (listErr) console.error('List error:', listErr);
    
    // Let's query using custom RPC if available
    const { data: queryData, error: queryErr } = await supabase.rpc('execute_sql', {
      sql_query: "SELECT tgname, tgenabled, tgtype FROM pg_trigger WHERE tgrelid = 'equipment'::regclass;"
    });

    console.log('Triggers:', queryData, queryErr);
  } catch (err) {
    console.error('Catch error:', err);
  }
}
run();
