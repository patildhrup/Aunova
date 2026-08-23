import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Zap, Database, ActivitySquare, LayoutDashboard, BarChart2,
  LogOut, ChevronLeft, ChevronRight, Bell, Settings,
  Cpu, Menu, X, Home
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export type DashTab = 'data' | 'pipeline' | 'results' | 'scorecard';

const NAV_ITEMS: { id: DashTab; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: 'data',      label: 'Data',      icon: Database },
  { id: 'pipeline',  label: 'Pipeline',  icon: ActivitySquare },
  { id: 'results',   label: 'Results',   icon: LayoutDashboard },
  { id: 'scorecard', label: 'Scorecard', icon: BarChart2 },
];

interface DashboardLayoutProps {
  tab: DashTab;
  onTabChange: (t: DashTab) => void;
  hasResults: boolean;
  metricsScore?: number | null;
  children: React.ReactNode;
  topBarExtra?: React.ReactNode;
}

export default function DashboardLayout({
  tab, onTabChange, hasResults, metricsScore, children, topBarExtra,
}: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <div className="h-screen max-h-screen bg-surface-900 flex overflow-hidden">

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ══════════════════════════════ SIDEBAR (FIXED) ══════════════════════════════ */}
      <aside
        className={cn(
          'fixed md:sticky top-0 left-0 h-screen shrink-0 z-40 flex flex-col border-r border-white/[0.06] transition-all duration-300 ease-in-out',
          collapsed ? 'w-[68px]' : 'w-[220px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          'bg-surface-800'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center border-b border-white/[0.06] h-[60px] shrink-0 px-4',
          collapsed ? 'justify-center' : 'gap-2.5'
        )}>
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shrink-0 glow-brand group-hover:scale-105 transition-transform">
              <Zap size={15} className="text-white" />
            </div>
            {!collapsed && (
              <div className="leading-tight overflow-hidden">
                <div className="text-sm font-bold text-white whitespace-nowrap">Aunova</div>
                <div className="text-[10px] text-gray-500 whitespace-nowrap">Intelligence Pipeline</div>
              </div>
            )}
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {/* Section label */}
          {!collapsed && (
            <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
              Pipeline
            </p>
          )}

          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => { onTabChange(id); setMobileOpen(false); }}
                title={collapsed ? label : undefined}
                className={cn(
                  'w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative',
                  active
                    ? 'bg-brand-500/15 text-brand-300 border border-brand-500/25'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent'
                )}
              >
                <Icon size={17} className={cn('shrink-0 transition-colors', active ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300')} />
                {!collapsed && <span className="whitespace-nowrap">{label}</span>}

                {/* Badges */}
                {!collapsed && id === 'results' && hasResults && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
                )}
                {!collapsed && id === 'scorecard' && metricsScore != null && (
                  <span className="ml-auto text-[10px] bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded-full">
                    {metricsScore.toFixed(0)}%
                  </span>
                )}

                {/* Tooltip when collapsed */}
                {collapsed && (
                  <span className="absolute left-full ml-3 px-2 py-1 text-xs rounded-md bg-surface-600 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-white/10 z-50">
                    {label}
                  </span>
                )}
              </button>
            );
          })}

          {/* Divider */}
          <div className="my-3 border-t border-white/[0.06]" />
          {!collapsed && (
            <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
              General
            </p>
          )}

          {/* Home link */}
          <Link to="/"
            className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent transition-all duration-200 group relative">
            <Home size={17} className="shrink-0 text-gray-500 group-hover:text-gray-300 transition-colors" />
            {!collapsed && <span>Home</span>}
            {collapsed && (
              <span className="absolute left-full ml-3 px-2 py-1 text-xs rounded-md bg-surface-600 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-white/10 z-50">
                Home
              </span>
            )}
          </Link>
        </nav>

        {/* User section + collapse */}
        <div className="shrink-0 border-t border-white/[0.06] p-3 space-y-2">
          {/* User card */}
          <div className={cn(
            'flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03] border border-white/[0.05]',
            collapsed && 'justify-center'
          )}>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              {initials}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{username}</div>
                <div className="text-[10px] text-gray-500 truncate">{user?.email}</div>
              </div>
            )}
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/8 border border-transparent hover:border-red-500/15 transition-all duration-200 group relative',
              collapsed && 'justify-center'
            )}
          >
            <LogOut size={15} className="shrink-0 transition-colors" />
            {!collapsed && <span>Sign Out</span>}
            {collapsed && (
              <span className="absolute left-full ml-3 px-2 py-1 text-xs rounded-md bg-surface-600 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-white/10 z-50">
                Sign Out
              </span>
            )}
          </button>

          {/* Collapse toggle — desktop only */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="hidden md:flex w-full items-center gap-2 px-2.5 py-1.5 rounded-xl text-gray-600 hover:text-gray-300 hover:bg-white/[0.04] transition-all duration-200 text-xs"
          >
            {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Collapse</span></>}
          </button>
        </div>
      </aside>

      {/* ════════════════════ MAIN AREA (fixed header + scrollable content) ════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

        {/* ── Top Navbar ── */}
        <header className="h-[60px] shrink-0 flex items-center justify-between px-4 md:px-6 border-b border-white/[0.06] bg-surface-800/60 backdrop-blur-md">
          {/* Left: mobile menu + breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(m => !m)}
              className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            <div className="flex items-center gap-2">
              <Cpu size={15} className="text-brand-400" />
              <div>
                <h1 className="text-sm font-bold text-white leading-tight">
                  Unilog <span className="gradient-text">Product Intelligence</span>
                </h1>
                <p className="text-[10px] text-gray-600 hidden sm:block">
                  AI-powered catalog enrichment
                </p>
              </div>
            </div>

            {/* Breadcrumb pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-gray-500">
              <span>Dashboard</span>
              <ChevronRight size={11} />
              <span className="text-gray-300 capitalize">{tab}</span>
            </div>
          </div>

          {/* Right: extra actions + user */}
          <div className="flex items-center gap-2">
            {topBarExtra}

            {/* Notification bell */}
            <button className="p-2 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.05] transition-colors relative">
              <Bell size={16} />
            </button>

            {/* Settings */}
            <button className="p-2 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/[0.05] transition-colors">
              <Settings size={16} />
            </button>

            {/* Avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/[0.06] ml-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-xs font-bold text-white">
                {initials}
              </div>
              <span className="hidden sm:block text-xs font-medium text-gray-300 max-w-[100px] truncate">
                {username}
              </span>
            </div>
          </div>
        </header>

        {/* ── Tab nav row (sub-nav under header) ── */}
        <div className="shrink-0 border-b border-white/[0.06] bg-surface-800/30 px-4 md:px-6 flex items-center gap-0.5 overflow-x-auto">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-all duration-200 shrink-0',
                tab === id
                  ? 'border-brand-500 text-brand-300'
                  : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-white/20'
              )}
            >
              <Icon size={13} />
              {label}
              {id === 'results' && hasResults && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
              )}
              {id === 'scorecard' && metricsScore != null && (
                <span className="text-[10px] bg-brand-500/20 text-brand-300 px-1.5 rounded-full">
                  {metricsScore.toFixed(0)}%
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Page content (Scrollable area) ── */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
