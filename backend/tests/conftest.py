import pytest
from sqlalchemy import text
from app.core.database import engine, Base

@pytest.fixture(autouse=True, scope="function")
async def setup_test_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for col_sql in [
            "ALTER TABLE users ADD COLUMN telegram_id VARCHAR(50)",
            "ALTER TABLE users ADD COLUMN telegram_username VARCHAR(100)",
        ]:
            try:
                await conn.execute(text(col_sql))
            except Exception:
                pass
    yield
