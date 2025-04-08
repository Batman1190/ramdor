const SUPABASE_URL = 'https://ootpttzhiyhhyayiydup.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vdHB0dHpoaXloaHlheWl5ZHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwODgwMzksImV4cCI6MjA1OTY2NDAzOX0.6B_mXkRQaROBMHod3z25PX8ouCJVHXpfdAkBCpUH5ls'

// Create Supabase client correctly
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Test connection
async function testConnection() {
    try {
        console.log('Testing Supabase connection...');
        const { data, error } = await supabase.from('videos').select('count').single();
        if (error) {
            console.error('Connection test failed:', error.message);
        } else {
            console.log('Connection successful!', data);
        }
    } catch (err) {
        console.error('Test error:', err.message);
    }
}

// Run test when document is ready
document.addEventListener('DOMContentLoaded', () => {
    testConnection();
});