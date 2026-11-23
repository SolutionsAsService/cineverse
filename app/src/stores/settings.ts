import { defineStore } from 'pinia';
import { reactive, ref, watch } from 'vue';
import { defaultWeights, type Weights } from '@/lib/relations';

const KEY = 'cineverse:settings:v1';
function read<T>(fallback: T): T { try { const raw = localStorage.getItem(KEY); return raw ? { ...fallback, ...JSON.parse(raw) } : fallback; } catch { return fallback; } }
export type NodeMode = 'poster' | 'minimal' | 'genre' | 'franchise' | 'timeline';
export const useSettings = defineStore('settings', () => {
  const saved = read<{ weights: Weights; nodeLimit: number; branch: number; mode: NodeMode; hubs: boolean }>({ weights: defaultWeights(), nodeLimit: 90, branch: 12, mode: 'poster', hubs: false });
  const weights = reactive<Weights>({ ...defaultWeights(), ...saved.weights }); const nodeLimit = ref(saved.nodeLimit); const branch = ref(saved.branch); const mode = ref<NodeMode>(saved.mode); const hubs = ref(saved.hubs);
  watch([weights, nodeLimit, branch, mode, hubs], () => { try { localStorage.setItem(KEY, JSON.stringify({ weights, nodeLimit: nodeLimit.value, branch: branch.value, mode: mode.value, hubs: hubs.value })); } catch { /* private mode */ } }, { deep: true });
  const resetWeights = () => Object.assign(weights, defaultWeights());
  return { weights, nodeLimit, branch, mode, hubs, resetWeights };
});
