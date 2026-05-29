from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from core.database import get_db
from models.catalogue_chant import CatalogueChant
from models.chant import Chant

router = APIRouter(prefix="/catalogue-chants", tags=["catalogue"])


class CatalogueChantOut(BaseModel):
    id: int
    numero: str
    titre: str
    nb_utilisations: int = 0

    model_config = {"from_attributes": True}


@router.get("", response_model=list[CatalogueChantOut])
def list_catalogue(
    q: str | None = Query(None),
    db: Session = Depends(get_db),
):
    if q and q.strip():
        search = f"%{q.strip()}%"
        rows = (
            db.query(CatalogueChant)
            .filter(
                or_(
                    func.upper(CatalogueChant.titre).like(search.upper()),
                    CatalogueChant.numero.like(search),
                )
            )
            .order_by(CatalogueChant.id)
            .limit(15)
            .all()
        )
    else:
        rows = db.query(CatalogueChant).order_by(CatalogueChant.id).all()

    # Comptage des utilisations par titre (insensible à la casse)
    usage_rows = (
        db.query(func.upper(Chant.titre), func.count(Chant.id))
        .group_by(func.upper(Chant.titre))
        .all()
    )
    usage_map: dict[str, int] = {t: c for t, c in usage_rows}

    return [
        CatalogueChantOut(
            id=r.id,
            numero=r.numero,
            titre=r.titre,
            nb_utilisations=usage_map.get(r.titre.upper(), 0),
        )
        for r in rows
    ]
