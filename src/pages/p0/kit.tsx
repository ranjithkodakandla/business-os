import React from 'react';
import { PageHeader } from '../../components/ui';
import { useStore } from '../../lib/store';
import { moduleByKey } from '../../lib/nav';
import { can, roleOf, type Perm } from '../../lib/rbac';
import type { Lang } from '../../lib/i18n';
export const useLang = () => useStore().s.lang as Lang;
export function ModHead({ k, subtitle, actions, badge }: { k: string; subtitle?: React.ReactNode; actions?: React.ReactNode; badge?: React.ReactNode }) {
  const lang = useLang(); const m = moduleByKey(k)!;
  return <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: m.group }, { label: m.label[lang] }]} title={<span className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-grad text-white shadow-glow"><m.icon size={18} /></span>{m.label[lang]}</span>} subtitle={subtitle ?? m.desc} actions={actions} badge={badge} />;
}
export const useCan = (k: string) => { const { s } = useStore(); return (p: Perm) => can(s, k, p); };
export const NoPerm = ({ k, p }: { k: string; p: Perm }) => { const { s } = useStore(); return <span className="text-2xs text-slate-400">Needs {p} on {k} · {roleOf(s)} can’t</span>; };
export const Grid = ({ children, cols = 4 }: { children: React.ReactNode; cols?: number }) => <div className={`mb-4 grid grid-cols-2 gap-3 ${cols === 5 ? 'lg:grid-cols-5' : cols === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>{children}</div>;
export const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#64748b'];
