from supabase_functions import create_client
from supabase import create_client
from configs import SUPABASE_URL , SUPABASE_KEY

if not SUPABASE_KEY or not SUPABASE_URL:
    raise Exception("Supabase credentials not found")

supabase_client = None

def get_supabase():
    global supabase_client
    if supabase_client is None:
        
        supabase_client = create_client(supabase_url=SUPABASE_URL, supabase_key=SUPABASE_KEY)
    return supabase_client


class LazySupabase:
    def __getattr__(self, name):
        return getattr(get_supabase(), name)

supabase = LazySupabase()

auth_client = None
def get_auth_client():
    global auth_client
    if auth_client is None:
    
        
        auth_client = create_client(supabase_url=SUPABASE_URL, supabase_key=SUPABASE_KEY)
    return auth_client

