


class DiseaseNotFound(Exception):
    def __init__(self):
        super().__init__(f"Animal disease data not found in records")
    
class NoDiseaseDiagnosed(Exception):
    def __init__(self):
        super().__init__(f"AI couldnt find disease feed in records")

class InvalidDiseaseDiagnose(Exception):
    def __int__(self):
        super().__init__(f"Records dont have data regarding diagnosed diseases")

class PrimaryDiagnosisError(Exception):
    def __init__(self, e):
        self.msg = e
        super().__init__(f"Error in Ai API: {self.msg}")

class EmptyGeminiResponse(Exception):
    def __init__(self):
        super().__init__(f"Gemini returned empty response")


class ReportGenerationError(Exception):
    def __init__(self, msg):
        self.msg = msg
        super().__init__(f"Couldn't generate Report : {self.msg}")