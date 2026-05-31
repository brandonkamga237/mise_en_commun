from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.dependencies import get_current_user
from models.formation import Cours, Lecon
from models.user import RoleEnum, User
from schemas.formation import (
    CoursCreate,
    CoursOut,
    CoursSummaryOut,
    CoursUpdate,
    LeconCreate,
    LeconOut,
    LeconUpdate,
)
from schemas.user import UserOut

router = APIRouter(prefix="/formations", tags=["formations"])


def _require_responsable(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (RoleEnum.responsable, RoleEnum.admin):
        raise HTTPException(status_code=403, detail="Accès réservé aux responsables")
    return current_user


def _build_cours_out(cours: Cours) -> CoursOut:
    return CoursOut(
        id=cours.id,
        titre=cours.titre,
        description=cours.description,
        publie=cours.publie,
        ordre=cours.ordre,
        nb_lecons=len(cours.lecons),
        cree_par=UserOut.model_validate(cours.cree_par) if cours.cree_par else None,
        cree_le=cours.cree_le,
        modifie_le=cours.modifie_le,
        lecons=list(cours.lecons),
    )


# ── Cours ────────────────────────────────────────────────────────────────────

@router.get("/cours", response_model=list[CoursSummaryOut])
def list_cours(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_resp = current_user.role in (RoleEnum.responsable, RoleEnum.admin)
    q = db.query(Cours).order_by(Cours.ordre, Cours.cree_le)
    if not is_resp:
        q = q.filter(Cours.publie.is_(True))
    cours_list = q.all()
    return [
        CoursSummaryOut(
            id=c.id,
            titre=c.titre,
            description=c.description,
            publie=c.publie,
            ordre=c.ordre,
            nb_lecons=len(c.lecons),
            cree_par=UserOut.model_validate(c.cree_par) if c.cree_par else None,
            cree_le=c.cree_le,
            modifie_le=c.modifie_le,
        )
        for c in cours_list
    ]


@router.post("/cours", response_model=CoursOut, status_code=status.HTTP_201_CREATED)
def create_cours(
    body: CoursCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_responsable),
):
    cours = Cours(
        titre=body.titre.strip(),
        description=body.description,
        ordre=body.ordre,
        publie=body.publie,
        cree_par_id=current_user.id,
    )
    db.add(cours)
    db.commit()
    db.refresh(cours)
    return _build_cours_out(cours)


@router.get("/cours/{cours_id}", response_model=CoursOut)
def get_cours(
    cours_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cours = db.query(Cours).filter(Cours.id == cours_id).first()
    if not cours:
        raise HTTPException(status_code=404, detail="Cours introuvable")
    is_resp = current_user.role in (RoleEnum.responsable, RoleEnum.admin)
    if not cours.publie and not is_resp:
        raise HTTPException(status_code=403, detail="Ce cours n'est pas encore publié")
    return _build_cours_out(cours)


@router.put("/cours/{cours_id}", response_model=CoursOut)
def update_cours(
    cours_id: int,
    body: CoursUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_responsable),
):
    cours = db.query(Cours).filter(Cours.id == cours_id).first()
    if not cours:
        raise HTTPException(status_code=404, detail="Cours introuvable")
    if body.titre is not None:
        cours.titre = body.titre.strip()
    if body.description is not None:
        cours.description = body.description or None
    if body.ordre is not None:
        cours.ordre = body.ordre
    if body.publie is not None:
        cours.publie = body.publie
    db.commit()
    db.refresh(cours)
    return _build_cours_out(cours)


@router.delete("/cours/{cours_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cours(
    cours_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_responsable),
):
    cours = db.query(Cours).filter(Cours.id == cours_id).first()
    if not cours:
        raise HTTPException(status_code=404, detail="Cours introuvable")
    db.delete(cours)
    db.commit()


# ── Leçons ───────────────────────────────────────────────────────────────────

@router.post("/cours/{cours_id}/lecons", response_model=LeconOut, status_code=status.HTTP_201_CREATED)
def create_lecon(
    cours_id: int,
    body: LeconCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_responsable),
):
    cours = db.query(Cours).filter(Cours.id == cours_id).first()
    if not cours:
        raise HTTPException(status_code=404, detail="Cours introuvable")
    max_ordre = max((l.ordre for l in cours.lecons), default=0)
    lecon = Lecon(
        cours_id=cours_id,
        titre=body.titre.strip(),
        contenu=body.contenu,
        ordre=max_ordre + 1,
        duree_minutes=body.duree_minutes,
    )
    db.add(lecon)
    db.commit()
    db.refresh(lecon)
    return lecon


@router.put("/cours/{cours_id}/lecons/{lecon_id}", response_model=LeconOut)
def update_lecon(
    cours_id: int,
    lecon_id: int,
    body: LeconUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_responsable),
):
    lecon = db.query(Lecon).filter(Lecon.id == lecon_id, Lecon.cours_id == cours_id).first()
    if not lecon:
        raise HTTPException(status_code=404, detail="Leçon introuvable")
    if body.titre is not None:
        lecon.titre = body.titre.strip()
    if body.contenu is not None:
        lecon.contenu = body.contenu
    if body.ordre is not None:
        lecon.ordre = body.ordre
    if body.duree_minutes is not None:
        lecon.duree_minutes = body.duree_minutes
    db.commit()
    db.refresh(lecon)
    return lecon


@router.delete("/cours/{cours_id}/lecons/{lecon_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lecon(
    cours_id: int,
    lecon_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_require_responsable),
):
    lecon = db.query(Lecon).filter(Lecon.id == lecon_id, Lecon.cours_id == cours_id).first()
    if not lecon:
        raise HTTPException(status_code=404, detail="Leçon introuvable")
    db.delete(lecon)
    db.commit()


@router.put("/cours/{cours_id}/lecons/reorder")
def reorder_lecons(
    cours_id: int,
    body: dict,
    db: Session = Depends(get_db),
    _: User = Depends(_require_responsable),
):
    ids: list[int] = body.get("ids", [])
    for i, lecon_id in enumerate(ids):
        db.query(Lecon).filter(
            Lecon.id == lecon_id, Lecon.cours_id == cours_id
        ).update({"ordre": i + 1})
    db.commit()
    return {"ok": True}
