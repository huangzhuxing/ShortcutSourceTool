FROM python:3.11-slim AS builder

# 安装构建依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY requirements.txt .

# 安装依赖到虚拟环境
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 第二阶段：最终镜像
FROM python:3.11-slim

# 安装plutil工具（macOS中的plutil在Linux中是libplist-utils包的一部分）
RUN apt-get update && apt-get install -y --no-install-recommends \
    libplist-utils \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 复制虚拟环境
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# 设置工作目录
WORKDIR /app

# 复制应用代码
COPY . .

# 设置环境变量
ENV PYTHONUNBUFFERED=1
ENV PORT=3333

# 暴露端口
EXPOSE 3333

# 启动命令
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "3333"]