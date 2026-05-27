from datetime import datetime

from pydantic import BaseModel

from models.user import RoleEnum


class UserOut(BaseModel):
    id: int
    matricule: str | None
    nom: str
    prenom: str | None = None
    email: str | None = None
    role: RoleEnum
    photo_url: str | None = None
    adresse: str | None = None
    telephone: str | None = None
    cree_le: datetime

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    nom: str
    mot_de_passe: str
    prenom: str | None = None
    email: str | None = None
    role: RoleEnum = RoleEnum.moniteur


class UserUpdate(BaseModel):
    nom: str | None = None
    prenom: str | None = None
    role: RoleEnum | None = None


class ProfileUpdate(BaseModel):
    nom: str | None = None
    prenom: str | None = None
    mot_de_passe: str | None = None
    adresse: str | None = None
    telephone: str | None = None
