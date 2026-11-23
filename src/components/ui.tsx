import { useEffect, useState, type ReactNode } from 'react';
import { create } from 'zustand';
import { now } from '../store';

/* 토스트 */
const useToastStore = create<{ msg: string | null; key: number; show: (m: string) => void }>((set) => ({
  msg: null,
  key: 0,
  show: (msg) => set((s) => ({ msg, key: s.key + 1 })),
}));

export const toast = (m: string) => useToastStore.getState().show(m);

export function Toast() {
  const { msg, key } = useToastStore();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!msg) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2600);
    return () => clearTimeout(t);
  }, [msg, key]);
  if (!visible || !msg) return null;
  return (
    <div className="toast" key={key} role="status">
      {msg}
    </div>
  );
}

/* 아래에서 올라오는 시트 */
export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="grab" />
        {children}
      </div>
    </div>
  );
}

/** 시연용 시간 이동을 반영한 현재 시각. 30초마다 갱신 */
export function useNow(intervalMs = 30000): Date {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now();
}
