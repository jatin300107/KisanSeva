from backend.db import supabase
from backend.exceptions import DiseaseNotFound , NoDiseaseDiagnosed , InvalidDiseaseDiagnose
 
def retreive_animal_list(animal):

    animal_disease = supabase.table("animal_advisory").select("animal" , "disease_name").eq("animal" ,animal).execute()
    if not animal_disease.data:
        raise DiseaseNotFound()
    return animal_disease.data

def retrive_disease_data(possible_disease , animal):

    if not possible_disease:
        raise NoDiseaseDiagnosed()
    
    disease_data = supabase.table("animal_advisory").select("*").eq("animal",animal).eq("disease_name",possible_disease).execute()
    if not disease_data.data:
        raise InvalidDiseaseDiagnose()
    return disease_data.data



