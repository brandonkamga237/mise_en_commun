"""formation: cours et lecons

Revision ID: 9a8b7c6d5e4f
Revises: a1b2c3d4e5f6
Create Date: 2026-05-29

"""
from alembic import op
import sqlalchemy as sa

revision = '9a8b7c6d5e4f'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'cours',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('titre', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('ordre', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('publie', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('cree_par_id', sa.Integer(), nullable=True),
        sa.Column('cree_le', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('modifie_le', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['cree_par_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_cours_id', 'cours', ['id'])

    op.create_table(
        'lecons',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('cours_id', sa.Integer(), nullable=False),
        sa.Column('titre', sa.String(length=200), nullable=False),
        sa.Column('contenu', sa.Text(), nullable=True),
        sa.Column('ordre', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('duree_minutes', sa.Integer(), nullable=True),
        sa.Column('cree_le', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('modifie_le', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['cours_id'], ['cours.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_lecons_id', 'lecons', ['id'])


def downgrade() -> None:
    op.drop_index('ix_lecons_id', table_name='lecons')
    op.drop_table('lecons')
    op.drop_index('ix_cours_id', table_name='cours')
    op.drop_table('cours')
