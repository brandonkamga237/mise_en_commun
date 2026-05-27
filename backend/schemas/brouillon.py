from datetime import date, datetime

from pydantic import BaseModel

from models.brouillon import StatutPreparation
from schemas.chant import ChantOut
from schemas.user import UserOut


class PreparationOut(BaseModel):
    id: int
    date_dimanche: date
    auteur: UserOut
    cree_le: datetime
    modifie_le: datetime
    liturgie: str
    lecon: str
    divers: str
    statut: StatutPreparation
    validateur: UserOut | None
    valide_le: datetime | None
    motif_revision: str | None = None
    visible: bool = True
    chants: list[ChantOut] = []
    nb_commentaires: int = 0

    model_config = {"from_attributes": True}


# Alias de compatibilité
BrouillonOut = PreparationOut


class RenvoyerBody(BaseModel):
    motif: str = ""


class VisibiliteBody(BaseModel):
    visible: bool


class PreparationSummary(BaseModel):
    id: int
    date_dimanche: date
    auteur: UserOut
    modifie_le: datetime
    statut: StatutPreparation
    visible: bool = True
    nb_chants: int = 0
    nb_commentaires: int = 0
    apercu_lecon: str = ""

    model_config = {"from_attributes": True}


# Alias de compatibilité
BrouillonSummary = PreparationSummary


class PreparationCreate(BaseModel):
    date_dimanche: date
    liturgie: str = ""
    lecon: str = ""
    divers: str = ""


# Alias de compatibilité
BrouillonCreate = PreparationCreate


class PreparationUpdate(BaseModel):
    liturgie: str | None = None
    lecon: str | None = None
    divers: str | None = None


# Alias de compatibilité
BrouillonUpdate = PreparationUpdate


class PreparationDuplicate(BaseModel):
    source_id: int
    date_dimanche: date


# Alias de compatibilité
BrouillonDuplicate = PreparationDuplicate
