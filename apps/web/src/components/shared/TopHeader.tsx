'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';
import { NotificationDto } from '@docflow/shared-types';

interface TopHeaderProps {
  onSearchClick: () => void;
  onNewDocumentClick: () => void;
}

export default function TopHeader({ onSearchClick, onNewDocumentClick }: TopHeaderProps) {
  const { user } = useAuth();
  
  // Notification states
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Message / Workspace activity states
  const [activities, setActivities] = useState<any[]>([]);
  const [msgMenuOpen, setMsgMenuOpen] = useState(false);
  const msgPopoverRef = useRef<HTMLDivElement>(null);

  const loadActivities = async () => {
    try {
      const list = await api.activities.list(10);
      setActivities(list);
    } catch (err) {
      console.error('Failed to load activities:', err);
    }
  };

  // Company Switcher states
  const [companies, setCompanies] = useState<any[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState('');

  const loadNotifications = async () => {
    try {
      const list = await api.notifications.list();
      setNotifications(list);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const loadCompanies = async () => {
    try {
      const list = await api.companies.list();
      setCompanies(list);
      const stored = localStorage.getItem('activeCompanyId') || '';
      if (stored && list.some((c: any) => c.id === stored)) {
        setActiveCompanyId(stored);
      } else if (list.length > 0) {
        setActiveCompanyId(list[0].id);
        localStorage.setItem('activeCompanyId', list[0].id);
      }
    } catch (err) {
      console.error('Failed to load switcher companies:', err);
    }
  };

  useEffect(() => {
    loadNotifications();
    loadCompanies();
    loadActivities();
    // Poll status every 10 seconds for real-time responsiveness
    const timer = setInterval(() => {
      loadNotifications();
      loadActivities();
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleSwitchCompany = (companyId: string) => {
    setActiveCompanyId(companyId);
    localStorage.setItem('activeCompanyId', companyId);
    window.location.reload();
  };

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (msgPopoverRef.current && !msgPopoverRef.current.contains(event.target as Node)) {
        setMsgMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await api.notifications.markAsRead(id);
      // Update local state directly for optimistic UI feedback
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS': return { icon: 'check_circle', color: 'text-primary' };
      case 'WARNING': return { icon: 'warning', color: 'text-warning' };
      case 'ERROR': return { icon: 'error', color: 'text-error' };
      default: return { icon: 'info', color: 'text-on-surface-variant' };
    }
  };

  return (
    <header className="bg-surface border-b border-outline-variant flex justify-between items-center h-12 px-6 shrink-0 z-40 relative w-full">
      
      {/* Left: Search Bar Trigger */}
      <div 
        onClick={onSearchClick}
        className="flex items-center flex-1 max-w-md relative cursor-pointer group"
      >
        <span className="material-symbols-outlined absolute left-2.5 text-on-surface-variant text-[18px] group-hover:text-primary transition-colors">
          search
        </span>
        <div className="w-full pl-8 pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded group-hover:border-primary transition-colors text-on-surface-variant/70 text-body-sm flex justify-between items-center select-none h-[30px]">
          <span>Search workspace...</span>
          <span className="text-[10px] bg-surface-container-high border border-outline-variant px-1.5 py-0.5 rounded font-mono font-bold text-on-surface-variant/80">
            Ctrl + K
          </span>
        </div>
      </div>

      {/* Center: Company Switcher & Navigation Links */}
      <div className="hidden lg:flex items-center space-x-6 flex-1 justify-center select-none text-body-sm font-semibold">
        {companies.length > 0 && (
          <div className="flex items-center gap-1.5 bg-surface-container-low border border-outline-variant/60 rounded px-2 py-0.5 shadow-sm">
            <span className="material-symbols-outlined text-[15px] text-primary">domain</span>
            <select
              value={activeCompanyId}
              onChange={(e) => handleSwitchCompany(e.target.value)}
              className="bg-transparent text-[10px] font-bold text-on-surface focus:outline-none cursor-pointer py-1.5"
            >
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        <span className="text-primary font-bold border-b-2 border-primary pb-1 font-body-sm text-body-sm cursor-pointer">
          Dashboard
        </span>
        <span className="text-on-surface-variant font-body-sm text-body-sm hover:text-primary transition-colors cursor-pointer select-none">
          All Files
        </span>
        <span className="text-on-surface-variant font-body-sm text-body-sm hover:text-primary transition-colors cursor-pointer select-none">
          Recent
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-4 flex-1 justify-end">
        <button
          onClick={onNewDocumentClick}
          className="bg-primary text-on-primary font-label-md text-[12px] px-3.5 py-1.5 rounded flex items-center gap-1 hover:bg-primary-fixed-variant transition-colors shadow-sm font-semibold active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          New Document
        </button>
        
        <div className="flex items-center space-x-3 text-on-surface-variant">
          {/* Message / Activity comments popover */}
          <div className="relative" ref={msgPopoverRef}>
            <button 
              onClick={() => setMsgMenuOpen(!msgMenuOpen)}
              className="hover:text-primary transition-colors cursor-pointer p-1 rounded-full hover:bg-surface-container flex items-center justify-center relative"
              title="Workspace Activity Logs"
            >
              <span className="material-symbols-outlined text-[20px]">comment</span>
              {activities.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary text-on-primary rounded-full flex items-center justify-center text-[8px] font-bold">
                  {activities.length}
                </span>
              )}
            </button>

            {/* Interactive Message / Comments Feed Popover */}
            {msgMenuOpen && (
              <div className="absolute right-0 top-10 w-[420px] bg-surface border border-outline-variant shadow-xl rounded-xl z-50 overflow-hidden flex flex-col max-h-[460px] animate-fade-in select-none">
                <div className="p-3 border-b border-outline-variant bg-surface-container-lowest flex justify-between items-center h-10 shrink-0">
                  <span className="font-semibold text-label-md text-on-surface">Workspace Comments Feed</span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/60 custom-scrollbar text-body-sm font-semibold text-on-surface-variant">
                  {activities.length === 0 ? (
                    <div className="p-8 text-center text-[10px] italic text-on-surface-variant/80">No recent workspace activities or comments.</div>
                  ) : (
                    activities.map((act) => (
                      <div 
                        key={act.id} 
                        className="p-3 flex items-start gap-3 hover:bg-surface-container-low/60 transition-all border-l-4 border-l-primary/40 bg-surface hover:border-l-primary hover:-translate-y-[0.5px]"
                      >
                        <span className="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5">
                          forum
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] leading-relaxed text-on-surface font-semibold select-text">{act.details}</p>
                          <span className="text-[9px] text-on-surface-variant/60 block mt-1.5 font-mono">
                            {new Date(act.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Notification bell trigger */}
          <div className="relative" ref={popoverRef}>
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="hover:text-primary transition-colors cursor-pointer p-1 rounded-full hover:bg-surface-container flex items-center justify-center relative"
              title="Notification Center"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-error text-on-error rounded-full flex items-center justify-center text-[9px] font-bold font-mono">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Interactive Notifications Popover Menu */}
            {menuOpen && (
              <div className="absolute right-0 top-10 w-[420px] bg-surface border border-outline-variant shadow-xl rounded-xl z-50 overflow-hidden flex flex-col max-h-[460px] animate-fade-in select-none">
              
              <div className="p-3 border-b border-outline-variant bg-surface-container-lowest flex justify-between items-center h-10 shrink-0">
                <span className="font-semibold text-label-md text-on-surface">Notification Center</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-primary hover:underline font-bold"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/60 custom-scrollbar text-body-sm font-semibold text-on-surface-variant">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-[10px] italic text-on-surface-variant/80">No notification alerts.</div>
                ) : (
                  notifications.map((n) => {
                    const badge = getNotifIcon(n.type);
                    const borderLeftColor = 
                      n.type === 'SUCCESS' ? 'border-l-primary' :
                      n.type === 'WARNING' ? 'border-l-amber-500' :
                      n.type === 'ERROR' ? 'border-l-error' : 'border-l-outline';

                    return (
                      <div 
                        key={n.id} 
                        onClick={() => handleMarkRead(n.id)}
                        className={`p-3 flex items-start gap-3 cursor-pointer border-l-4 ${borderLeftColor} transition-all hover:bg-surface-container-low/60 hover:-translate-y-[0.5px]
                          ${!n.isRead ? 'bg-surface-container-lowest' : 'opacity-85 bg-surface'}`}
                      >
                        <span className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${badge.color}`}>
                          {badge.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-1">
                            <span className={`text-[11px] font-bold truncate ${!n.isRead ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                              {n.title}
                            </span>
                            {!n.isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1"></span>
                            )}
                          </div>
                          <p className="text-[10px] leading-relaxed text-on-surface-variant font-medium mt-0.5 select-text">{n.message}</p>
                          <span className="text-[9px] text-on-surface-variant/60 block mt-1.5 font-mono">
                            {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </header>
  );
}
