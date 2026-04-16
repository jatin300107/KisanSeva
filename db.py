from configs import SUPABASE_URL , SUPABASE_KEY

if not SUPABASE_KEY or not SUPABASE_URL:
    raise Exception("Supabase credentials not found")

# Initialize Supabase client lazily
supabase_client = None

def get_supabase():
    global supabase_client
    if supabase_client is None:
        from supabase import create_client
        supabase_client = create_client(supabase_url=SUPABASE_URL, supabase_key=SUPABASE_KEY)
    return supabase_client

# For backward compatibility - this will call get_supabase when accessed
class LazySupabase:
    def __getattr__(self, name):
        return getattr(get_supabase(), name)

supabase = LazySupabase()
