import os
import shutil
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.dependencies import get_current_user
from core.security import create_access_token, generate_matricule, hash_password, verify_password
from models.user import RoleEnum, User
from schemas.auth import LoginRequest, SetupRequest, TokenResponse
from schemas.user import ProfileUpdate, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

UPLOADS_DIR = os.environ.get("UPLOADS_DIR", "/uploads")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_PHOTO_SIZE = 5 * 1024 * 1024  # 5 MB


def _assign_unique_matricule(db: Session) -> str:
    for _ in range(20):
        m = generate_matricule()
        if not db.query(User).filter(User.matricule == m).first():
            return m
    raise RuntimeError("Impossible de générer un matricule unique")


@router.post("/connexion", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.matricule == body.matricule.strip().upper()).first()
    if not user or not verify_password(body.mot_de_passe, user.mot_de_passe_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Matricule ou mot de passe incorrect",
        )
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)


@router.post("/initialisation", response_model=TokenResponse)
def setup(body: SetupRequest, db: Session = Depends(get_db)):
    """Crée le premier compte admin. Désactivé si des utilisateurs existent déjà."""
    if db.query(User).count() > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="L'initialisation a déjà été effectuée",
        )
    matricule = _assign_unique_matricule(db)
    user = User(
        nom=body.nom.strip(),
        prenom=body.prenom.strip() if body.prenom else None,
        matricule=matricule,
        mot_de_passe_hash=hash_password(body.mot_de_passe),
        role=RoleEnum.admin,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, matricule=matricule)


@router.get("/moi", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/profil", response_model=UserOut)
def update_profile(
    body: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.nom is not None:
        current_user.nom = body.nom.strip()
    if body.prenom is not None:
        current_user.prenom = body.prenom.strip() or None
    if body.mot_de_passe is not None:
        if len(body.mot_de_passe) < 6:
            raise HTTPException(status_code=400, detail="Le mot de passe doit faire au moins 6 caractères")
        current_user.mot_de_passe_hash = hash_password(body.mot_de_passe)
    if body.adresse is not None:
        current_user.adresse = body.adresse.strip() or None
    if body.telephone is not None:
        current_user.telephone = body.telephone.strip() or None
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/profil/photo", response_model=UserOut)
async def upload_photo(
    file: UploadFile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Format non supporté. Utilise JPG, PNG ou WebP.")
    data = await file.read()
    if len(data) > MAX_PHOTO_SIZE:
        raise HTTPException(status_code=400, detail="L'image ne doit pas dépasser 5 Mo.")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "jpg"
    photos_dir = os.path.join(UPLOADS_DIR, "photos")
    os.makedirs(photos_dir, exist_ok=True)
    filename = f"user_{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(photos_dir, filename)
    with open(filepath, "wb") as f:
        f.write(data)
    # Delete old photo if any
    if current_user.photo_url:
        old_path = os.path.join(UPLOADS_DIR, current_user.photo_url.lstrip("/api/uploads/").lstrip("uploads/"))
        if os.path.exists(old_path) and old_path != filepath:
            try:
                os.remove(old_path)
            except OSError:
                pass
    current_user.photo_url = f"/api/uploads/photos/{filename}"
    db.commit()
    db.refresh(current_user)
    return current_user
