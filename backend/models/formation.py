from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from core.database import Base


class Cours(Base):
    __tablename__ = "cours"

    id = Column(Integer, primary_key=True, index=True)
    titre = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    ordre = Column(Integer, default=0, nullable=False)
    publie = Column(Boolean, default=False, nullable=False)
    cree_par_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    cree_le = Column(DateTime, default=datetime.utcnow, nullable=False)
    modifie_le = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    cree_par = relationship("User", foreign_keys=[cree_par_id])
    lecons = relationship(
        "Lecon",
        back_populates="cours",
        order_by="Lecon.ordre",
        cascade="all, delete-orphan",
    )


class Lecon(Base):
    __tablename__ = "lecons"

    id = Column(Integer, primary_key=True, index=True)
    cours_id = Column(Integer, ForeignKey("cours.id"), nullable=False)
    titre = Column(String(200), nullable=False)
    contenu = Column(Text, nullable=True)
    ordre = Column(Integer, default=0, nullable=False)
    duree_minutes = Column(Integer, nullable=True)
    cree_le = Column(DateTime, default=datetime.utcnow, nullable=False)
    modifie_le = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    cours = relationship("Cours", back_populates="lecons")
