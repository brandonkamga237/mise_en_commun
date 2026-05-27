import enum
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, Integer, String
from sqlalchemy.orm import relationship

from core.database import Base


class RoleEnum(str, enum.Enum):
    moniteur = "moniteur"
    responsable = "responsable"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    matricule = Column(String(20), unique=True, nullable=True, index=True)
    nom = Column(String(100), nullable=False)
    prenom = Column(String(100), nullable=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    mot_de_passe_hash = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.moniteur, nullable=False)
    photo_url = Column(String(512), nullable=True)
    adresse = Column(String(255), nullable=True)
    telephone = Column(String(30), nullable=True)
    cree_le = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    preparations = relationship(
        "Preparation", foreign_keys="Preparation.auteur_id", back_populates="auteur"
    )
    commentaires = relationship("Commentaire", back_populates="auteur")
    presences = relationship(
        "Presence", foreign_keys="Presence.user_id", back_populates="user"
    )
