# 快捷指令源码工具 - API服务

这是快捷指令源码工具的后端API服务，用于从iCloud链接获取iOS快捷指令源代码并转换为JSON或XML格式。

## 功能特点

- 从iCloud链接提取快捷指令源码
- 支持JSON和XML输出格式
- 完整的错误处理和日志记录
- 内置CORS支持
- Docker容器化部署支持

## 技术栈

- Python 3.11+
- FastAPI
- Uvicorn
- Docker

## 安装和运行

### 方法1: 使用Python直接运行

#### 前置条件

- Python 3.11或更高版本
- pip (Python包管理器)

#### 安装依赖

```bash
pip install -r requirements.txt
```

#### 配置环境变量

复制`.env.example`文件为`.env`并根据需要进行修改：

```bash
cp .env.example .env
```

主要配置项说明：

- `API_HOST`: API服务监听地址
- `API_PORT`: API服务监听端口
- `LOG_LEVEL`: 日志级别 (INFO, DEBUG等)
- `ENABLE_CORS`: 是否启用CORS
- `ALLOWED_ORIGINS`: 允许的来源域名，用逗号分隔
- `ALLOWED_METHODS`: 允许的HTTP方法
- `ALLOWED_HEADERS`: 允许的HTTP头

#### 运行服务

```bash
python app.py
```

### 方法2: 使用Docker运行

#### 前置条件

- Docker
- Docker Compose (可选)

#### 构建镜像

```bash
docker build -t shortcut-api .
```

#### 运行容器

```bash
docker run -p 8888:3333 -d shortcut-api
```

#### 使用Docker Compose (可选)

创建一个`docker-compose.yml`文件：

```yaml
version: '3'
services:
  shortcut-api:
    build: .
    ports:
      - "8888:3333"
    environment:
      - API_HOST=0.0.0.0
      - API_PORT=3333
      - LOG_LEVEL=INFO
```

运行：

```bash
docker-compose up -d
```

## API接口文档

### 获取快捷指令内容

```
GET /?shortcuturl={url}&fmt={format}
```

#### 参数

- `shortcuturl`: iCloud快捷指令链接，例如 `https://www.icloud.com/shortcuts/abcdef1234567890`
- `fmt`: 输出格式，可选值为 `json`(默认) 或 `xml`

#### 响应

成功时返回快捷指令的内容，格式根据`fmt`参数确定。

#### 示例请求

```
GET /?shortcuturl=https://www.icloud.com/shortcuts/abcdef1234567890&fmt=json
```

#### 示例响应

```json
{
  "WFWorkflowName": "示例快捷指令",
  "WFWorkflowMinimumClientVersionString": "900",
  "WFWorkflowClientVersion": "1101",
  "WFWorkflowActions": [...]
}
```

### 健康检查接口

```
GET /health
```

#### 响应

```json
{
  "status": "ok"
}
```

## 服务器部署

### Nginx配置

以下是推荐的Nginx配置，用于代理API请求并正确处理CORS：

```nginx
server {
    listen       8443 ssl http2;
    listen       [::]:8443 ssl http2;
    server_name  your-api-domain.com;

    # SSL证书配置
    ssl_certificate     /path/to/cert.crt;
    ssl_certificate_key /path/to/key.pem;

    # TLS配置
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # CORS配置 - 注意不要重复添加头
    location / {
        # 允许跨域请求 - 每个头只设置一次
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
        
        # 处理 OPTIONS 请求
        if ($request_method = 'OPTIONS') {
            return 204;
        }

        proxy_pass http://127.0.0.1:8888;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置
        proxy_connect_timeout 300s;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

### Cloudflare设置

如果您使用Cloudflare，可能需要：

1. 将SSL/TLS模式设置为"Full"或"Full (Strict)"
2. 禁用Cloudflare的CORS设置，避免重复添加头
3. 或者考虑将API域名设置为DNS-only模式（灰云模式）

## 注意事项

1. 确保服务器上安装了必要的依赖，特别是用于XML处理的库
2. 对于大型快捷指令，可能需要调整超时设置
3. 必须确保CORS头不被重复添加，无论是通过Nginx还是Cloudflare
4. Docker容器内部使用端口3333，记得在映射到外部端口时注意这一点

## 许可证

MIT 