from backend.db import supabase
from backend.exceptions import DiseaseNotFound, NoDiseaseDiagnosed, InvalidDiseaseDiagnose


def retreive_disease_list(name, type):
    if type.lower() == "animal":
        disease_list = supabase.table("animal_advisory").select("animal", "disease_name").ilike("animal", f"%{name}%").execute()
    elif type.lower() == "crop":
        disease_list = supabase.table("crop_advisory").select("crop", "disease_name").ilike("crop", f"%{name}%").execute()
    else:
        raise ValueError("Invalid type. Must be 'animal' or 'crop'.")

    if not disease_list.data:
        raise DiseaseNotFound(name)
    return disease_list.data


def retrive_disease_data(possible_disease, name, type: str):
    if not possible_disease:
        raise NoDiseaseDiagnosed()
    if type.lower() == "animal":
        disease_data = supabase.table("animal_advisory").select("*").ilike("animal", f"%{name}%").ilike("disease_name", f"%{possible_disease}%").execute()
    elif type.lower() == "crop":
        disease_data = supabase.table("crop_advisory").select("*").ilike("crop", f"%{name}%").ilike("disease_name", f"%{possible_disease}%").execute()
    else:
        raise ValueError()
    if not disease_data.data:
        raise InvalidDiseaseDiagnose()
    return disease_data.data


retrieve_disease_list = retreive_disease_list
retrieve_disease_data = retrive_disease_data



