from pydantic import BaseModel


class LoginRequest(BaseModel):
    matricule: str
    mot_de_passe: str


class SetupRequest(BaseModel):
    nom: str
    mot_de_passe: str
    prenom: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    matricule: str | None = None
