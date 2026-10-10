"""
HomeCore 数据库结构可追踪安全迁移模块 (V0.2 -> V0.3)
确保向后兼容，不丢失任何现有用户数据、管理员账号与房间设备关联。
"""
import logging
from sqlalchemy import text, inspect
from app.db.session import engine, Base
from app.models.user import User  # noqa
from app.models.room import Room  # noqa
from app.models.integration import IntegrationConfig  # noqa
from app.models.device import Device, DeviceState  # noqa
from app.models.audit import AuditLog, EventLog  # noqa

logger = logging.getLogger("homecore.migrations")

def run_migrations():
    """执行 V0.3 增量迁移检查与应用"""
    logger.info("检查并运行数据库迁移 (V0.3 IoT Schema)...")
    
    # 1. 自动创建新表（如 integration_configs）
    Base.metadata.create_all(bind=engine)
    
    # 2. 检查 devices 表是否有新增列
    with engine.connect() as conn:
        inspector = inspect(engine)
        columns = [col["name"] for col in inspector.get_columns("devices")]
        
        # 迁移：source_connection_id
        if "source_connection_id" not in columns:
            logger.info("迁移: 为 devices 表添加列 source_connection_id...")
            conn.execute(text("ALTER TABLE devices ADD COLUMN source_connection_id VARCHAR(36)"))
            conn.commit()
            
        # 迁移：external_id
        if "external_id" not in columns:
            logger.info("迁移: 为 devices 表添加列 external_id...")
            conn.execute(text("ALTER TABLE devices ADD COLUMN external_id VARCHAR(150)"))
            # 回填已有设备的 external_id 为 identifier
            conn.execute(text("UPDATE devices SET external_id = identifier WHERE external_id IS NULL"))
            conn.commit()

        # 迁移：last_error
        if "last_error" not in columns:
            logger.info("迁移: 为 devices 表添加列 last_error...")
            conn.execute(text("ALTER TABLE devices ADD COLUMN last_error VARCHAR(255)"))
            conn.commit()

    logger.info("数据库迁移 (V0.3 IoT Schema) 完成！")
