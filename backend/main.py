import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import settings
from core.database import Base, engine
from models import (  # noqa: F401 — registration before create_all
    Preparation,
    Chant,
    Commentaire,
    Presence,
    User,
)
from models.catalogue_chant import CatalogueChant  # noqa: F401
from routes import (
    auth_router,
    brouillons_router,
    catalogue_router,
    chants_router,
    commentaires_router,
    commentaires_extra_router,
    pdf_router,
    presence_router,
    users_router,
)

UPLOADS_DIR = os.environ.get("UPLOADS_DIR", "/uploads")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    os.makedirs(os.path.join(UPLOADS_DIR, "photos"), exist_ok=True)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="4.0.0",
    description="Système de gestion des mises en commun — Culte d'enfants",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(brouillons_router, prefix="/api")
app.include_router(chants_router, prefix="/api")
app.include_router(commentaires_router, prefix="/api")
app.include_router(commentaires_extra_router, prefix="/api")
app.include_router(presence_router, prefix="/api")
app.include_router(pdf_router, prefix="/api")
app.include_router(catalogue_router, prefix="/api")

# Serve uploaded files (photos de profil, etc.)
if os.path.isdir(UPLOADS_DIR):
    app.mount("/api/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


@app.get("/api/sante")
def health():
    return {"statut": "ok", "service": settings.APP_NAME}
