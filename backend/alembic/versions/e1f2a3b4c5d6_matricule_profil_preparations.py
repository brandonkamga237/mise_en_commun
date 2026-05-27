"""matricule auth, profil enrichi, rename brouillons -> preparations

Revision ID: e1f2a3b4c5d6
Revises: c1d2e3f4a5b6
Create Date: 2026-05-27

"""
import secrets
import string

import sqlalchemy as sa
from alembic import op

revision = 'e1f2a3b4c5d6'
down_revision = 'c1d2e3f4a5b6'
branch_labels = None
depends_on = None


def _gen_matricule() -> str:
    chars = string.ascii_uppercase + string.digits
    return 'MCM-' + ''.join(secrets.choice(chars) for _ in range(6))


def upgrade() -> None:
    bind = op.get_bind()

    # ── 1. Nouvelles colonnes utilisateurs ───────────────────────
    op.add_column('users', sa.Column('matricule', sa.String(20), nullable=True))
    op.add_column('users', sa.Column('prenom', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('photo_url', sa.String(512), nullable=True))
    op.add_column('users', sa.Column('adresse', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('telephone', sa.String(30), nullable=True))

    # ── 2. Rendre email nullable ──────────────────────────────────
    op.alter_column('users', 'email',
                    existing_type=sa.String(255),
                    nullable=True)

    # ── 3. Générer un matricule unique pour chaque utilisateur ────
    users = bind.execute(sa.text("SELECT id FROM users WHERE matricule IS NULL")).fetchall()
    existing_matricules: set[str] = set()
    for (user_id,) in users:
        for _ in range(50):
            m = _gen_matricule()
            if m not in existing_matricules:
                row = bind.execute(
                    sa.text("SELECT id FROM users WHERE matricule = :m"), {"m": m}
                ).first()
                if not row:
                    existing_matricules.add(m)
                    bind.execute(
                        sa.text("UPDATE users SET matricule = :m WHERE id = :id"),
                        {"m": m, "id": user_id},
                    )
                    break

    # ── 4. Passer matricule en NOT NULL + contrainte unique ───────
    op.alter_column('users', 'matricule',
                    existing_type=sa.String(20),
                    nullable=False)
    op.create_unique_constraint('uq_users_matricule', 'users', ['matricule'])
    op.create_index('ix_users_matricule', 'users', ['matricule'], unique=True)

    # ── 5. Renommer la table brouillons → preparations ────────────
    # PostgreSQL met à jour automatiquement les FK qui référencent la table
    op.rename_table('brouillons', 'preparations')


def downgrade() -> None:
    op.rename_table('preparations', 'brouillons')
    op.drop_index('ix_users_matricule', table_name='users')
    op.drop_constraint('uq_users_matricule', 'users', type_='unique')
    op.alter_column('users', 'email',
                    existing_type=sa.String(255),
                    nullable=False)
    op.drop_column('users', 'telephone')
    op.drop_column('users', 'adresse')
    op.drop_column('users', 'photo_url')
    op.drop_column('users', 'prenom')
    op.drop_column('users', 'matricule')
