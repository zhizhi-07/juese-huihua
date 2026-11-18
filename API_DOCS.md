# 本地保存接口

- `GET /api/status`：服务状态；`characterBaseProjectId` 是人物分支当前继承的素体工程编号。创建人物分支时可传 `baseRevision` 查询参数（素体 GET 的 ETag），若素体版本已变则返回 409。
- `GET /api/projects`：当前工程列表，不含已归档工程。
- `GET /api/project?id=main`：主工程JSON；响应头ETag是保存版本。
- `GET /api/project?id=<编号>`：指定独立工程。
- `PUT /api/project?id=<编号>`：保存完整JSON，请求头 `Content-Type: application/json`、`X-Pixel-Editor: 1`、`If-Match: <ETag>`；新工程用 `If-Match: none`。
- 409时停止覆盖，保留候选稿并合并。保存后回读验证。

当前主工程为原生16规格，只有行走、待机、拾取、坐姿。不要假设全部帧都固定为16×16，应读取各帧实际width、height。旧绘画规范不再自动加载。
