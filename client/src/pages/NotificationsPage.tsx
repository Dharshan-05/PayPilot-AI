import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { RoutePath } from '../data/dashboard';
import { INITIAL_NOTIFICATIONS, type NotificationCategory, type NotificationItem } from '../data/notifications';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { Badge } from '../components/Badge';
import { Tabs } from '../components/Tabs';
import { EmptyState } from '../components/EmptyState';

export type NotifTab = 'All' | NotificationCategory;

export interface NotificationsPageProps {
  notifications: NotificationItem[];
  unreadNotifCount: number;
  onUpdateNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  onNavigate: (route: RoutePath, entityId?: string) => void;
  onToast: (msg: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notifications,
  unreadNotifCount,
  onUpdateNotifications,
  onNavigate,
  onToast,
}) => {
  const [notifTab, setNotifTab] = useState<NotifTab>('All');
  const visibleNotifs = notifications.filter(
    (n) => notifTab === 'All' || n.category === notifTab
  );

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Notifications"
        subtitle="Real-time alerts across your payments, FraudGuard security, rewards, and AI agents."
        onBack={() => onNavigate('/')}
        rightSlot={
          <div className="flex items-center gap-2">
            <SecondaryButton
              onClick={() => {
                onUpdateNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
                onToast('Marked all notifications as read');
              }}
              className="h-[33px] text-[11px]"
            >
              Mark all as read
            </SecondaryButton>
            <SecondaryButton
              onClick={() => {
                onUpdateNotifications([]);
                onToast('Cleared notification feed');
              }}
              className="h-[33px] text-[11px]"
            >
              Clear notifications
            </SecondaryButton>
          </div>
        }
      />

      <Card className="p-[18px] flex-1 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <Tabs
              tabs={['All', 'Payments', 'Security', 'Rewards', 'Agents']}
              activeTab={notifTab}
              onChange={(t) => setNotifTab(t as NotifTab)}
            />
            <Badge variant="default">{unreadNotifCount} Unread</Badge>
          </div>

          {visibleNotifs.length === 0 ? (
            <EmptyState
              title="You're all caught up!"
              description="No notifications in this category right now."
              actionLabel="Restore Sample Notifications"
              onAction={() => onUpdateNotifications(INITIAL_NOTIFICATIONS)}
            />
          ) : (
            <div className="space-y-2.5">
              {visibleNotifs.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-[16px] border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    n.unread
                      ? 'bg-[#f3ece0] border-[#d6cec0]'
                      : 'bg-[#f7f2e8] border-[#e8e1d6]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                        n.unread ? 'bg-[#e54835]' : 'bg-[#c4bdb2]'
                      }`}
                      aria-hidden="true"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12.5px] font-bold text-[#181715]">{n.title}</span>
                        <Badge variant="default">{n.category}</Badge>
                      </div>
                      <p className="text-[11px] text-[#5c5954] mt-1">{n.body}</p>
                      <div className="text-[9.5px] text-[#857f77] mt-1">{n.time}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateNotifications((prev) =>
                          prev.map((item) =>
                            item.id === n.id ? { ...item, unread: !item.unread } : item
                          )
                        )
                      }
                      className="px-2.5 py-1 rounded-full bg-[#faf5ec] border border-[#dfd8cd] text-[10px] font-medium text-[#3a3835] cursor-pointer"
                    >
                      {n.unread ? 'Mark as read' : 'Mark unread'}
                    </button>
                    <PrimaryButton
                      onClick={() => {
                        onUpdateNotifications((prev) =>
                          prev.map((item) => (item.id === n.id ? { ...item, unread: false } : item))
                        );
                        onNavigate(n.targetRoute, n.txId);
                      }}
                      className="h-[29px] px-3 text-[10.5px]"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3 h-3" aria-hidden="true" />
                    </PrimaryButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default NotificationsPage;
