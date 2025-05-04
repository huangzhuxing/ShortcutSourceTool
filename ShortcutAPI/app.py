#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
iCloud快捷指令提取API
使用FastAPI实现的HTTP API服务
可以将iCloud快捷指令链接转换为JSON或XML格式
"""

import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import Response, JSONResponse, PlainTextResponse
from starlette.middleware.cors import CORSMiddleware
import uvicorn
import logging
from typing import Optional

from shortcut_extractor import ShortcutExtractor

# 从环境变量加载配置
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "3333"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
ENABLE_CORS = os.getenv("ENABLE_CORS", "true").lower() == "true"
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
ALLOWED_METHODS = os.getenv("ALLOWED_METHODS", "GET,POST,OPTIONS").split(",")
ALLOWED_HEADERS = os.getenv("ALLOWED_HEADERS", "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range").split(",")

# 配置日志
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("shortcut-api")

# 创建FastAPI实例
app = FastAPI(
    title="快捷指令提取API",
    description="将iCloud快捷指令链接转换为JSON或XML格式",
    version="1.0.0"
)

# 添加CORS支持
if ENABLE_CORS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=ALLOWED_METHODS,
        allow_headers=ALLOWED_HEADERS,
    )

# 创建提取器实例
extractor = ShortcutExtractor()

@app.get("/")
async def extract_shortcut(
    shortcuturl: str = Query(..., description="iCloud快捷指令链接"),
    fmt: str = Query("json", description="输出格式 (json 或 xml)")
):
    """
    提取iCloud快捷指令内容并转换为指定格式
    
    - **shortcuturl**: iCloud快捷指令链接
    - **fmt**: 输出格式（json或xml），默认为json
    """
    logger.info(f"处理请求: URL={shortcuturl}, 格式={fmt}")
    
    try:
        # 验证格式参数
        if fmt not in ["json", "xml"]:
            return JSONResponse(
                status_code=400,
                content={"error": "格式必须是json或xml"}
            )
        
        # 提取快捷指令内容
        content, filename, error = extractor.extract(shortcuturl, fmt)
        
        # 检查是否有错误
        if error:
            logger.error(f"提取失败: {error}")
            return JSONResponse(
                status_code=400,
                content={"error": error}
            )
        
        # 设置适当的内容类型
        content_type = "application/json" if fmt == "json" else "application/xml"
        
        # 返回内容
        return Response(
            content=content,
            media_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
        
    except ValueError as e:
        logger.error(f"参数错误: {str(e)}")
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )
    except Exception as e:
        logger.error(f"服务器错误: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"服务器错误: {str(e)}"}
        )

@app.get("/health")
async def health_check():
    """健康检查接口"""
    return {"status": "ok"}

# 直接运行服务器（开发环境）
if __name__ == "__main__":
    uvicorn.run("app:app", host=API_HOST, port=API_PORT, reload=True)