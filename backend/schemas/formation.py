from datetime import datetime

from pydantic import BaseModel

from schemas.user import UserOut


class LeconCreate(BaseModel):
    titre: str
    contenu: str | None = None
    ordre: int = 0
    duree_minutes: int | None = None


class LeconUpdate(BaseModel):
    titre: str | None = None
    contenu: str | None = None
    ordre: int | None = None
    duree_minutes: int | None = None


class LeconOut(BaseModel):
    id: int
    cours_id: int
    titre: str
    contenu: str | None = None
    ordre: int
    duree_minutes: int | None = None
    cree_le: datetime
    modifie_le: datetime

    model_config = {"from_attributes": True}


class CoursCreate(BaseModel):
    titre: str
    description: str | None = None
    ordre: int = 0
    publie: bool = False


class CoursUpdate(BaseModel):
    titre: str | None = None
    description: str | None = None
    ordre: int | None = None
    publie: bool | None = None


class CoursSummaryOut(BaseModel):
    id: int
    titre: str
    description: str | None = None
    publie: bool
    ordre: int
    nb_lecons: int
    cree_par: UserOut | None = None
    cree_le: datetime
    modifie_le: datetime

    model_config = {"from_attributes": True}


class CoursOut(CoursSummaryOut):
    lecons: list[LeconOut] = []
