import os
from sqlalchemy import create_engine

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:PASSWORD@localhost/transcript_saas"
)

engine = create_engine(DATABASE_URL)