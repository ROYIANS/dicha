# State Management

> Zustand（client state）+ TanStack Query（server state）。两者分工严格。

---

## 分工

| 数据性质 | 用什么 | 例子 |
|---|---|---|
| 来自后端、需缓存 / 重取 | TanStack Query | 物品列表、用户信息、AI 调用结果 |
| 纯客户端 UI 状态 | Zustand | 当前 active 房间、录入草稿、PixiJS 场景控制 |
| 路由参数 | TanStack Router | 当前 path、search params |
| 表单临时态 | React Hook Form（如需） / useState | 表单输入 |

**铁律：server data 不进 Zustand store。** 走 query 缓存。

- **auth 状态也是 server state**：`/api/auth/me` 用 Query 缓存，不进 Zustand。
- **数据加载是 loader-first**：路由 `loader` 用 `queryClient.ensureQueryData(xxxQueryOptions)` 预取；`queryClient` 经 `createRouter({ context })` 注入。详见 [architecture.md §2](./architecture.md)。

---

## Zustand Store 划分

按 slice 分文件，避免单一巨大 store：

```
stores/
├── itemDraftStore.ts     # 当前正在录入的物品草稿
├── sceneStore.ts         # 当前在哪个房间、视图缩放等
├── characterStore.ts     # 用户化身 / 宠物当前状态
└── uiStore.ts            # 通用 UI 状态（dialog open 等）
```

---

## 持久化

- Onboarding 阶段用 `localStorage`（注册前数据先本地，注册时 upload）
- 录入草稿：`localStorage`（防意外丢失）
- 其它客户端态：会话内 in-memory

---

## TODO（M1 录入流程实装后回填）

- [ ] store 之间引用 / 派生状态的模式
- [ ] PixiJS 场景状态如何与 Zustand 同步
- [ ] 离线录入策略（v1 不支持，v2 考虑）
