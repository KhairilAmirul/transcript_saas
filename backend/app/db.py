from sqlalchemy import create_engine, text

DB_URL = "mysql+pymysql://root:@localhost/transcript_saas"

engine = create_engine(DB_URL, pool_pre_ping=True)