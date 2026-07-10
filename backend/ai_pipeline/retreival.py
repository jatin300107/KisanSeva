from backend.db import supabase
from backend.exceptions import DiseaseNotFound, NoDiseaseDiagnosed, InvalidDiseaseDiagnose


def retreive_disease_list(name, type):
    if type.lower() == "animal":
        disease_list = supabase.table("animal_advisory").select("animal", "disease_name").eq("animal", name).execute()
    elif type.lower() == "crop":
        disease_list = supabase.table("crop_advisory").select("crop", "disease_name").eq("crop", name).execute()
    else:
        raise DiseaseNotFound()

    if not disease_list.data:
        raise DiseaseNotFound()
    return disease_list.data


def retrive_disease_data(possible_disease, name, type: str):
    if not possible_disease:
        raise NoDiseaseDiagnosed()
    if type.lower() == "animal":
        disease_data = supabase.table("animal_advisory").select("*").eq("animal", name).eq("disease_name", possible_disease).execute()
    elif type.lower() == "crop":
        disease_data = supabase.table("crop_advisory").select("*").eq("crop", name).eq("disease_name", possible_disease).execute()
    else:
        raise InvalidDiseaseDiagnose()
    if not disease_data.data:
        raise InvalidDiseaseDiagnose()
    return disease_data.data


retrieve_disease_list = retreive_disease_list
retrieve_disease_data = retrive_disease_data



