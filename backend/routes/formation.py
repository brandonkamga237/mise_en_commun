import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
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


# ── PDF ──────────────────────────────────────────────────────────────────────

@router.get("/cours/{cours_id}/pdf")
def cours_pdf(
    cours_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm, mm
        from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer

        from services import pdf_common as P
    except ImportError:
        raise HTTPException(status_code=500, detail="La bibliothèque PDF n'est pas installée")

    cours = db.query(Cours).filter(Cours.id == cours_id).first()
    if not cours:
        raise HTTPException(status_code=404, detail="Cours introuvable")

    lecons = sorted(cours.lecons, key=lambda l: l.ordre)
    styles = P.make_styles()
    buf = io.BytesIO()

    def on_page(canvas, doc):
        canvas.saveState()
        w, h = A4
        # Bandeau
        canvas.setFillColor(colors.HexColor(P.INDIGO))
        canvas.rect(0, h - 28 * mm, w, 28 * mm, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor(P.AMBER))
        canvas.rect(0, h - 30 * mm, w, 2 * mm, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 11)
        canvas.drawString(2 * cm, h - 14 * mm, "Mises en Commun")
        canvas.setFont("Helvetica", 8.5)
        canvas.setFillColor(colors.HexColor("#C7C4F0"))
        canvas.drawString(2 * cm, h - 20 * mm, "Formation  ·  Culte d'enfants")
        # Pied
        canvas.setFillColor(colors.HexColor(P.TINT))
        canvas.rect(0, 0, w, 14 * mm, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor(P.LINE))
        canvas.rect(0, 14 * mm, w, 0.4 * mm, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor(P.MUTED))
        canvas.setFont("Helvetica", 7.5)
        now = datetime.now(timezone.utc).strftime("%d/%m/%Y à %H:%M UTC")
        canvas.drawString(2 * cm, 5.5 * mm, f"Généré le {now}")
        canvas.setFont("Helvetica-Bold", 8)
        canvas.setFillColor(colors.HexColor(P.INDIGO))
        canvas.drawRightString(w - 2 * cm, 5.5 * mm, f"Page {doc.page}")
        canvas.restoreState()

    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=3.6 * cm, bottomMargin=2 * cm,
        title=f"Formation — {cours.titre}",
    )

    story = [Paragraph(cours.titre, styles["h1"])]
    meta = f"{len(lecons)} leçon{'s' if len(lecons) != 1 else ''}"
    if cours.cree_par:
        meta += f"  ·  par {cours.cree_par.prenom or cours.cree_par.nom}"
    story.append(Paragraph(meta, styles["muted"]))
    if cours.description:
        story.append(Paragraph(P_escape(cours.description), styles["body"]))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor(P.AMBER),
                            spaceBefore=6, spaceAfter=10))

    if not lecons:
        story.append(Paragraph("Ce cours ne contient pas encore de leçons.", styles["empty"]))

    for i, lecon in enumerate(lecons, 1):
        titre = f"{i}. {lecon.titre}"
        if lecon.duree_minutes:
            titre += f"   ({lecon.duree_minutes} min)"
        story.append(Paragraph(P_escape(titre), styles["h2"]))
        story.extend(P.html_to_flowables(lecon.contenu, styles))
        if i < len(lecons):
            story.append(HRFlowable(width="100%", thickness=0.4, color=colors.HexColor(P.LINE),
                                    spaceBefore=10, spaceAfter=8))
        else:
            story.append(Spacer(1, 8))

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    buf.seek(0)

    safe_title = "".join(c if c.isalnum() else "_" for c in cours.titre)[:40] or "cours"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="formation_{safe_title}.pdf"'},
    )


def P_escape(text: str | None) -> str:
    if not text:
        return ""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")
