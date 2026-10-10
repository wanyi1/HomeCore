from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import init_db, SessionLocal
from app.api.v1.router import api_router
from app.services.iot_engine import iot_engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 初始化数据库（自动创建表结构、迁移并启用 WAL 模式）
    init_db()
    print(f"[{settings.PROJECT_NAME}] 服务已启动，监听地址: http://{settings.HOST}:{settings.PORT}")
    print(f"[{settings.PROJECT_NAME}] 本地数据库已连接，WAL 高并发模式已激活")
    
    # 异步启动已配置的物联网适配器
    db = SessionLocal()
    try:
        await iot_engine.start_all_adapters(db)
    except Exception as e:
        print(f"[{settings.PROJECT_NAME}] 物联网引擎启动警告: {e}")
    finally:
        db.close()

    yield
    print(f"[{settings.PROJECT_NAME}] 正在关闭物联网连接...")
    await iot_engine.stop_all_adapters()
    print(f"[{settings.PROJECT_NAME}] 服务已安全退出。")


app = FastAPI(
    title="HomeCore API",
    description="家庭数字中枢 (Family Intelligence Operating System) 核心服务接口",
    version=settings.VERSION,
    lifespan=lifespan,
)

# 配置 CORS 跨域通信
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/v1/health", tags=["系统健康"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "connected (SQLite WAL)",
    }

# 注册所有 API v1 路由
app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
