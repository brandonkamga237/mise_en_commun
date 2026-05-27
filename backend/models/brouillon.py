import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, Date, DateTime, Enum, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship

from core.database import Base


class StatutPreparation(str, enum.Enum):
    cree = "cree"
    en_revision = "en_revision"
    candidat_final = "candidat_final"
    officiel = "officiel"
    archive = "archive"


# Alias pour compatibilité des imports existants
StatutBrouillon = StatutPreparation


class Preparation(Base):
    __tablename__ = "preparations"

    id = Column(Integer, primary_key=True, index=True)
    date_dimanche = Column(Date, nullable=False, index=True)
    auteur_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    cree_le = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    modifie_le = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    liturgie = Column(Text, default="", nullable=False)
    lecon = Column(Text, default="", nullable=False)
    divers = Column(Text, default="", nullable=False)
    statut = Column(
        Enum(StatutPreparation, name="statutbrouillon"),
        default=StatutPreparation.en_revision,
        nullable=False,
    )
    valide_par = Column(Integer, ForeignKey("users.id"), nullable=True)
    valide_le = Column(DateTime(timezone=True), nullable=True)
    motif_revision = Column(Text, nullable=True)
    visible = Column(Boolean, default=False, nullable=False)

    auteur = relationship("User", foreign_keys=[auteur_id], back_populates="preparations")
    validateur = relationship("User", foreign_keys=[valide_par])
    chants = relationship(
        "Chant",
        back_populates="preparation",
        order_by="Chant.ordre",
        cascade="all, delete-orphan",
    )
    commentaires = relationship(
        "Commentaire",
        back_populates="preparation",
        cascade="all, delete-orphan",
    )


# Alias pour compatibilité des imports existants
Brouillon = Preparation
