'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';

export default function SidebarRail() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const isLinkActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  const navItems = [
    { title: 'Home', path: '/', icon: 'home' },
    { title: 'Companies', path: '/companies', icon: 'corporate_fare' },
    { title: 'Customers', path: '/customers', icon: 'groups' },
    { title: 'Products', path: '/products', icon: 'inventory_2' },
    { title: 'Renewals', path: '/renewals', icon: 'event_repeat' },
    { title: 'Templates', path: '/templates', icon: 'grid_view' },
  ];

  const mockNavItems = [
    { title: 'Workflow', path: '/workflow', icon: 'account_tree' },
    { title: 'Reports', path: '/reports', icon: 'analytics' },
    { title: 'Archive', path: '/archive', icon: 'inventory_2' },
  ];

  return (
    <nav className="bg-surface border-r border-outline-variant/30 fixed left-0 top-0 h-full w-[64px] z-50 flex flex-col justify-between select-none">
      <div className="flex-1 flex flex-col items-center pt-4 overflow-y-auto custom-scrollbar w-full">
        {/* Brand Logo Area */}
        <Link href="/" className="mb-6 cursor-pointer flex flex-col items-center">
          <div className="w-10 h-10 rounded-lg bg-primary/5 text-primary flex items-center justify-center font-headline-sm font-bold active:scale-95 transition-all shadow-xs border border-primary/10">
            DF
          </div>
        </Link>

        {/* Primary Navigation Tabs */}
        <div className="flex flex-col items-center w-full gap-2">
          {navItems.map((item) => {
            const active = isLinkActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                title={item.title}
                className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all cursor-pointer active:scale-95 group
                  ${
                    active
                      ? 'bg-primary/5 text-primary font-bold border border-primary/10'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: active ? "'FILL' 1" : undefined }}>
                  {item.icon}
                </span>
                <span className="font-label-sm text-[9px] mt-0.5 font-medium leading-none">{item.title}</span>
              </Link>
            );
          })}

          <div className="w-8 h-[1px] bg-outline-variant/30 my-2"></div>

          {mockNavItems.map((item) => (
            <div
              key={item.title}
              title={`${item.title} (Coming Soon)`}
              className="flex flex-col items-center justify-center w-12 h-12 rounded-lg text-on-surface-variant/40 cursor-not-allowed group"
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="font-label-sm text-[9px] mt-0.5 font-medium leading-none">{item.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Tabs */}
      <div className="flex flex-col items-center pb-4 w-full gap-2 border-t border-outline-variant/30 pt-3">
        <Link
          href="/settings"
          title="Settings"
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg active:scale-95 transition-all
            ${isLinkActive('/settings') ? 'bg-primary/5 text-primary border border-primary/10' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
        </Link>

        <button
          onClick={logout}
          title="Sign Out"
          className="flex flex-col items-center justify-center w-12 h-12 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/5 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
        </button>
      </div>
    </nav>
  );
}
