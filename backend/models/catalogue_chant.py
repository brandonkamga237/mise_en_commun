from sqlalchemy import Column, Integer, String

from core.database import Base


class CatalogueChant(Base):
    __tablename__ = "catalogue_chants"

    id = Column(Integer, primary_key=True)
    numero = Column(String(10), nullable=False)
    titre = Column(String(300), nullable=False)
