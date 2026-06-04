// 中文优先，单 locale 起步（architecture.md §6）。seam 留好，key 级类型见 i18next.d.ts。
export const zh = {
  translation: {
    app: {
      title: '安逸生活',
      subtitle: '像素风 2.5D 个人物品管理 OS',
    },
    health: {
      title: '系统状态',
      db: '数据库',
      up: '正常',
      down: '离线',
      loading: '检查中…',
      error: '健康检查失败',
    },
  },
} as const;

export type ZhResources = typeof zh;
