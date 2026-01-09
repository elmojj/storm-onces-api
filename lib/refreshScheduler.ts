import { isTokenNearExpiry } from "./tokenStore";
import { refreshOnesToken } from "./tokenService";

let started = false;

async function tick() {
  try {
    if (isTokenNearExpiry(300)) {
      await refreshOnesToken();
    }
  } catch (err) {
    console.error("[refreshScheduler] 自动刷新出错", err);
  }
}

/**
 * 启动定时任务：每小时检查一次，如果 token 接近过期则刷新
 * 同时启动时先尝试刷新一次。
 */
export function startRefreshScheduler() {
  if (started) return;
  started = true;

  // 启动时先尝试刷新一次（可选）
  tick();

  // 每小时跑一次
  const ONE_HOUR = 60 * 60 * 1000;
  setInterval(tick, ONE_HOUR);

  console.log("[refreshScheduler] 自动刷新任务已启动（每小时）");
}

