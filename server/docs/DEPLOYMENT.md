# Typhoon Server 部署指南

本指南介绍如何在生产环境中部署 Typhoon Server，包括环境准备、依赖安装、配置、启动与常见问题排查。

## 1. 环境准备

- 操作系统：推荐 Linux（如 Ubuntu 20.04+）、Windows Server 2019+ 或 macOS
- Node.js：v18.x 或更高
- npm/yarn：建议使用 npm v9+ 或 yarn v1.22+
- MongoDB：v5.x 或更高，建议独立部署
- Docker（可选）：用于容器化部署
- Nginx（可选）：反向代理与 HTTPS

## 2. 获取代码

```bash
git clone <your-repo-url>
cd typhoon-server
```

## 3. 安装依赖

```bash
npm install
# 或
yarn install
```

## 4. 配置环境

- 编辑 `config/config.yml` 或按需复制/修改 `config-local.yml`、`config-production.yml`。
- 主要配置项：
  - `DATABASE_URI`：MongoDB 连接字符串
  - `HOST`/`PORT`：服务监听地址与端口
  - 日志、邮件、第三方 API 等参数

## 5. 数据库准备

- 确保 MongoDB 已启动并可访问。
- 可使用 MongoDB Atlas 或本地/远程自建实例。

## 6. 启动服务

### 方式一：本地启动

```bash
npm run build
npm run start:prod
```

### 方式二：开发模式

```bash
npm run start:dev
```

### 方式三：Docker 部署

1. 构建镜像并启动

```bash
docker-compose -f docker-config/docker-compose.yml up -d
```

2. 查看日志

```bash
docker logs <container_name>
```

## 7. 反向代理与 HTTPS（可选）

- 推荐使用 Nginx 作为反向代理，配置见 `nginx/` 目录。
- 可配置 HTTPS 证书，提升安全性。

## 8. 常见问题排查

- 端口被占用：检查 `PORT` 配置或释放端口。
- MongoDB 连接失败：检查 `DATABASE_URI`、网络与权限。
- 日志无输出：检查日志目录权限与配置。
- API 无法访问：检查防火墙、Nginx 配置与服务状态。

## 9. 其他建议

- 建议使用 PM2、systemd 等进程管理工具保障服务高可用。
- 定期备份数据库与配置文件。
- 关注日志与监控，及时发现异常。

---

如有更多部署或运维问题，请参考项目 README 或联系开发团队。
