import type { Thresholds } from '../core/types'
import { mergeThresholds } from '../core/settings'

const KEY = 'spineCheck.settings.v1'

export function loadSettings(): Thresholds {
  try { return mergeThresholds(JSON.parse(localStorage.getItem(KEY) ?? 'null')) }
  catch { return mergeThresholds(null) }
}

export function saveSettings(t: Thresholds): void {
  localStorage.setItem(KEY, JSON.stringify(t))
}
