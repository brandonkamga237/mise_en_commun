from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.dependencies import get_current_user
from models.brouillon import Preparation, StatutPreparation
from models.chant import Chant
from models.commentaire import Commentaire
from models.user import RoleEnum, User
from schemas.brouillon import (
    PreparationCreate,
    PreparationDuplicate,
    PreparationOut,
    PreparationSummary,
    PreparationUpdate,
    RenvoyerBody,
    VisibiliteBody,
)

router = APIRouter(prefix="/preparations", tags=["préparations"])


def _build_summary(b: Preparation) -> PreparationSummary:
    nb_chants = len(b.chants)
    nb_comm = len([c for c in b.commentaires if c.parent_id is None])
    apercu = (b.lecon or "")[:80]
    return PreparationSummary(
        id=b.id,
        date_dimanche=b.date_dimanche,
        auteur=b.auteur,
        modifie_le=b.modifie_le,
        statut=b.statut,
        visible=b.visible,
        nb_chants=nb_chants,
        nb_commentaires=nb_comm,
        apercu_lecon=apercu,
    )


def _build_out(b: Preparation) -> PreparationOut:
    nb_comm = len([c for c in b.commentaires if c.parent_id is None])
    return PreparationOut(
        id=b.id,
        date_dimanche=b.date_dimanche,
        auteur=b.auteur,
        cree_le=b.cree_le,
        modifie_le=b.modifie_le,
        liturgie=b.liturgie,
        lecon=b.lecon,
        divers=b.divers,
        statut=b.statut,
        validateur=b.validateur,
        valide_le=b.valide_le,
        motif_revision=b.motif_revision,
        visible=b.visible,
        chants=b.chants,
        nb_commentaires=nb_comm,
    )


def _is_responsable(user: User) -> bool:
    return user.role in (RoleEnum.responsable, RoleEnum.admin)


def _can_edit(preparation: Preparation, user: User) -> bool:
    if preparation.statut == StatutPreparation.officiel:
        return _is_responsable(user)
    return preparation.auteur_id == user.id or _is_responsable(user)


def _cleanup_expired(db: Session) -> None:
    """Supprime toutes les préparations passées non officielles (avec cascade)."""
    today = date.today()
    expired = db.query(Preparation).filter(
        Preparation.date_dimanche < today,
        Preparation.statut != StatutPreparation.officiel,
    ).all()
    for b in expired:
        db.delete(b)
    if expired:
        db.commit()


@router.get("/", response_model=list[PreparationSummary])
def list_preparations(
    date_dimanche: date | None = Query(None),
    statut: StatutPreparation | None = Query(None),
    auteur_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import or_
    _cleanup_expired(db)
    q = db.query(Preparation).filter(
        or_(Preparation.visible == True, Preparation.auteur_id == current_user.id)
    )
    if date_dimanche:
        q = q.filter(Preparation.date_dimanche == date_dimanche)
    if statut:
        q = q.filter(Preparation.statut == statut)
    if auteur_id:
        q = q.filter(Preparation.auteur_id == auteur_id)
    preparations = q.order_by(Preparation.date_dimanche.desc(), Preparation.cree_le.desc()).all()
    return [_build_summary(b) for b in preparations]


@router.post("/", response_model=PreparationOut, status_code=status.HTTP_201_CREATED)
def create_preparation(
    body: PreparationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    b = Preparation(
        date_dimanche=body.date_dimanche,
        auteur_id=current_user.id,
        liturgie=body.liturgie,
        lecon=body.lecon,
        divers=body.divers,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return _build_out(b)


@router.get("/historique/officiel", response_model=list[PreparationSummary])
def historique(
    q: str | None = Query(None, description="Recherche texte libre"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Preparation).filter(
        Preparation.statut == StatutPreparation.officiel
    )
    if q:
        query = query.filter(
            Preparation.lecon.ilike(f"%{q}%")
            | Preparation.liturgie.ilike(f"%{q}%")
            | Preparation.divers.ilike(f"%{q}%")
        )
    preparations = query.order_by(Preparation.date_dimanche.desc()).all()
    return [_build_summary(b) for b in preparations]


@router.post("/dupliquer", response_model=PreparationOut, status_code=status.HTTP_201_CREATED)
def dupliquer(
    body: PreparationDuplicate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    source = db.query(Preparation).filter(Preparation.id == body.source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Préparation source introuvable")
    nouveau = Preparation(
        date_dimanche=body.date_dimanche,
        auteur_id=current_user.id,
        liturgie=source.liturgie,
        lecon=source.lecon,
        divers=source.divers,
    )
    db.add(nouveau)
    db.flush()
    for chant in source.chants:
        db.add(
            Chant(
                brouillon_id=nouveau.id,
                ordre=chant.ordre,
                titre=chant.titre,
                etape=chant.etape,
            )
        )
    db.commit()
    db.refresh(nouveau)
    return _build_out(nouveau)


@router.get("/{preparation_id}", response_model=PreparationOut)
def get_preparation(
    preparation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    b = db.query(Preparation).filter(Preparation.id == preparation_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Préparation introuvable")
    if not b.visible and b.auteur_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cette préparation est privée")
    return _build_out(b)


@router.post("/{preparation_id}/visibilite", response_model=PreparationOut)
def set_visibilite(
    preparation_id: int,
    body: VisibiliteBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    b = db.query(Preparation).filter(Preparation.id == preparation_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Préparation introuvable")
    if b.auteur_id != current_user.id:
        raise HTTPException(status_code=403, detail="Seul l'auteur peut modifier la visibilité")
    if b.statut == StatutPreparation.officiel:
        raise HTTPException(status_code=400, detail="Une préparation officielle est toujours visible")
    b.visible = body.visible
    b.modifie_le = datetime.now(timezone.utc)
    db.commit()
    db.refresh(b)
    return _build_out(b)


@router.put("/{preparation_id}", response_model=PreparationOut)
def update_preparation(
    preparation_id: int,
    body: PreparationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    b = db.query(Preparation).filter(Preparation.id == preparation_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Préparation introuvable")
    if not _can_edit(b, current_user):
        raise HTTPException(
            status_code=403, detail="Vous n'avez pas le droit de modifier cette préparation"
        )
    if body.liturgie is not None:
        b.liturgie = body.liturgie
    if body.lecon is not None:
        b.lecon = body.lecon
    if body.divers is not None:
        b.divers = body.divers
    b.modifie_le = datetime.now(timezone.utc)
    db.commit()
    db.refresh(b)
    return _build_out(b)


@router.delete("/{preparation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_preparation(
    preparation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    b = db.query(Preparation).filter(Preparation.id == preparation_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Préparation introuvable")
    is_admin = current_user.role == RoleEnum.admin
    if not is_admin and b.auteur_id != current_user.id:
        raise HTTPException(status_code=403, detail="Seul l'auteur ou un administrateur peut supprimer cette préparation")
    if not is_admin and b.statut == StatutPreparation.officiel:
        raise HTTPException(status_code=400, detail="Une préparation officielle ne peut pas être supprimée")
    db.delete(b)
    db.commit()


@router.post("/{preparation_id}/soumettre", response_model=PreparationOut)
def soumettre(
    preparation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    b = db.query(Preparation).filter(Preparation.id == preparation_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Préparation introuvable")
    if b.auteur_id != current_user.id:
        raise HTTPException(status_code=403, detail="Seul l'auteur peut soumettre cette préparation")
    if b.statut != StatutPreparation.en_revision:
        raise HTTPException(status_code=400, detail="Cette préparation ne peut pas être soumise dans son état actuel")
    b.visible = True
    b.modifie_le = datetime.now(timezone.utc)
    db.commit()
    db.refresh(b)
    return _build_out(b)


@router.post("/{preparation_id}/valider", response_model=PreparationOut)
def valider(
    preparation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _is_responsable(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux responsables")
    b = db.query(Preparation).filter(Preparation.id == preparation_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Préparation introuvable")
    if b.statut == StatutPreparation.officiel:
        raise HTTPException(status_code=400, detail="Cette préparation est déjà officielle")
    if b.statut != StatutPreparation.en_revision:
        raise HTTPException(status_code=400, detail="Seule une préparation en révision peut être validée")
    existing = db.query(Preparation).filter(
        Preparation.date_dimanche == b.date_dimanche,
        Preparation.statut == StatutPreparation.officiel,
    ).all()
    for old in existing:
        db.delete(old)
    b.statut = StatutPreparation.officiel
    b.visible = True
    b.valide_par = current_user.id
    b.valide_le = datetime.now(timezone.utc)
    b.modifie_le = datetime.now(timezone.utc)
    db.commit()
    db.refresh(b)
    return _build_out(b)


@router.post("/{preparation_id}/revoquer", response_model=PreparationOut)
def revoquer(
    preparation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _is_responsable(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux responsables")
    b = db.query(Preparation).filter(Preparation.id == preparation_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Préparation introuvable")
    if b.statut != StatutPreparation.officiel:
        raise HTTPException(status_code=400, detail="Seule une préparation officielle peut être révoquée")
    b.statut = StatutPreparation.en_revision
    b.valide_par = None
    b.valide_le = None
    b.modifie_le = datetime.now(timezone.utc)
    db.commit()
    db.refresh(b)
    return _build_out(b)


@router.post("/{preparation_id}/renvoyer", response_model=PreparationOut)
def renvoyer(
    preparation_id: int,
    body: RenvoyerBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _is_responsable(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux responsables")
    b = db.query(Preparation).filter(Preparation.id == preparation_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Préparation introuvable")
    if b.statut != StatutPreparation.en_revision:
        raise HTTPException(status_code=400, detail="Cette préparation n'est pas en révision")
    b.motif_revision = body.motif.strip() or None
    b.modifie_le = datetime.now(timezone.utc)
    db.commit()
    db.refresh(b)
    return _build_out(b)
