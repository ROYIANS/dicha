/**
 * 房间 = 独立功能模块（不是数据分类）。
 * MVP 三间（α 战略）：杂物间 / 衣橱 / 书房。v2+ 候选见 plan.md。
 */
export enum RoomType {
  STORAGE_ROOM = 'STORAGE_ROOM',
  WARDROBE = 'WARDROBE',
  LIBRARY = 'LIBRARY',
}

/** 贴纸来源：AI 生成 / sticker 库匹配 / 用户上传。 */
export enum StickerSource {
  AI = 'AI',
  LIBRARY = 'LIBRARY',
  USER = 'USER',
}

/** 诗的作者类型：类目默认池兜底 / 用户自写 / AI 提议。 */
export enum PoemAuthorType {
  DEFAULT_POOL = 'DEFAULT_POOL',
  USER = 'USER',
  AI = 'AI',
}

/** 诗默认私密；per-item 可分享给好友。市集不上诗（伦理边界）。 */
export enum PoemVisibility {
  PRIVATE = 'PRIVATE',
  FRIEND = 'FRIEND',
}

/**
 * 互动事件统一进 Event 表（落灰曲线需要历史）。
 * 不追踪"打开详情卡"——会让互动变廉价。
 */
export enum EventType {
  CREATED = 'CREATED',
  CHECK_IN = 'CHECK_IN',
  WORN = 'WORN',
  READ = 'READ',
  CLEANED_DUST = 'CLEANED_DUST',
}

/** 角色性格 archetype（Onboarding 选 1 种，不做 AI 推断）。占位，M3 定稿。 */
export enum PersonalityArchetype {
  GENTLE = 'GENTLE',
  LIVELY = 'LIVELY',
  QUIET = 'QUIET',
  WITTY = 'WITTY',
}
