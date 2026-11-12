import React, { useState } from 'react';
import { ASSETS } from '../assets/images';
import type { RoutePath } from '../data/dashboard';
import type { UserProfile } from '../data/users';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { Badge } from '../components/Badge';
import { Tabs } from '../components/Tabs';

export type SettingsTab =
  | 'Profile'
  | 'Account'
  | 'Security'
  | 'Privacy'
  | 'Notifications'
  | 'Payments'
  | 'Appearance'
  | 'Connected Accounts';

export interface SettingsTogglesState {
  twoFactor: boolean;
  passkeyBiometric: boolean;
  loginAlerts: boolean;
  notifTransactions: boolean;
  notifSecurity: boolean;
  notifRewards: boolean;
  notifAgents: boolean;
  notifMarketing: boolean;
  privacyDataSharing: boolean;
  privacyPersonalization: boolean;
  privacyAiPermissions: boolean;
  compactMode: boolean;
  subtleAnimations: boolean;
}

type SettingsToggleKey = keyof SettingsTogglesState;

export interface SettingsPageProps {
  userProfile: UserProfile;
  onUpdateProfile: (patch: Pick<UserProfile, 'name' | 'email' | 'phone' | 'location'>) => void;
  defaultPaymentMethod: string;
  onChangeDefaultPaymentMethod: (method: string) => void;
  balanceNumber: number;
  onNavigate: (route: RoutePath) => void;
  onToast: (msg: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  userProfile,
  onUpdateProfile,
  defaultPaymentMethod,
  onChangeDefaultPaymentMethod,
  balanceNumber,
  onNavigate,
  onToast,
}) => {
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('Profile');
  const [editName, setEditName] = useState(userProfile.name);
  const [editEmail, setEditEmail] = useState(userProfile.email);
  const [editPhone, setEditPhone] = useState(userProfile.phone);
  const [editLocation, setEditLocation] = useState(userProfile.location);
  const [settingsToggles, setSettingsToggles] = useState<SettingsTogglesState>({
    twoFactor: true,
    passkeyBiometric: true,
    loginAlerts: true,
    notifTransactions: true,
    notifSecurity: true,
    notifRewards: true,
    notifAgents: true,
    notifMarketing: false,
    privacyDataSharing: false,
    privacyPersonalization: true,
    privacyAiPermissions: true,
    compactMode: false,
    subtleAnimations: true,
  });

  const toggleSetting = (key: SettingsToggleKey, label: string) => {
    setSettingsToggles((prev) => ({ ...prev, [key]: !prev[key] }));
    onToast(`Updated ${label}`);
  };

  const securityItems: { key: SettingsToggleKey; label: string; sub: string }[] = [
    { key: 'twoFactor', label: 'Two-Factor Authentication (2FA)', sub: 'Require authenticator code or biometric passkey on sign-in' },
    { key: 'passkeyBiometric', label: 'Apple Touch ID / Face ID Passkey', sub: 'Sign in without passwords on trusted Apple devices' },
    { key: 'loginAlerts', label: 'Instant Unfamiliar Login Alerts', sub: 'Notify immediately if a new browser or location signs in' },
  ];

  const privacyItems: { key: SettingsToggleKey; label: string; sub: string }[] = [
    { key: 'privacyAiPermissions', label: 'PayPal AI Shopping & Insights Permissions', sub: 'Allow your AI agents to scan deals and categorize spending locally' },
    { key: 'privacyPersonalization', label: 'Personalized Cashback Offers', sub: 'Tailor Level 2 Silver reward multipliers to your top categories' },
    { key: 'privacyDataSharing', label: 'Third-Party Partner Analytics Sharing', sub: 'Share anonymized telemetry with external marketing partners' },
  ];

  const notificationItems: { key: SettingsToggleKey; label: string; sub: string }[] = [
    { key: 'notifTransactions', label: 'Transactions & Transfers', sub: 'Instant alerts for payments sent, received, or refunded' },
    { key: 'notifSecurity', label: 'FraudGuard Security Alerts', sub: 'Critical sign-in and unusual activity alerts' },
    { key: 'notifRewards', label: 'Rewards & Silver Multipliers', sub: 'Points earned and tier progress updates' },
    { key: 'notifAgents', label: 'AI Agents Task Updates', sub: 'Price drops and weekly cashflow digest' },
    { key: 'notifMarketing', label: 'Marketing & Seasonal Promotions', sub: 'General promotional newsletters' },
  ];

  const paymentMethods = [
    `PayPal Balance ($${balanceNumber.toFixed(2)})`,
    'Chase Checking ••4821',
    'Visa Signature ••9014',
  ];

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Settings"
        subtitle="Configure your profile, security, privacy, notifications, payments, and connected accounts."
        onBack={() => onNavigate('/')}
      />

      <div className="mb-3">
        <Tabs
          tabs={[
            'Profile',
            'Account',
            'Security',
            'Privacy',
            'Notifications',
            'Payments',
            'Appearance',
            'Connected Accounts',
          ]}
          activeTab={settingsTab}
          onChange={(t) => setSettingsTab(t as SettingsTab)}
        />
      </div>

      <Card className="p-[20px] flex-1 flex flex-col justify-between">
        {settingsTab === 'Profile' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#efe9de]">
              <div className="flex items-center gap-4">
                <img
                  src={ASSETS.avatarCat}
                  alt={userProfile.name}
                  className="w-[72px] h-[72px] rounded-full ring-1 ring-[#b8b1a6] object-cover shrink-0"
                />
                <div>
                  <h3 className="text-[16px] font-bold text-[#181715]">{userProfile.name}</h3>
                  <p className="text-[11px] text-[#6a665f]">
                    {userProfile.handle} • {userProfile.tier}
                  </p>
                  <div className="mt-1">
                    <SecondaryButton onClick={() => onNavigate('/profile')} className="h-[28px] px-3 text-[10.5px]">
                      View Public Profile Page
                    </SecondaryButton>
                  </div>
                </div>
              </div>
              <PrimaryButton
                onClick={() => {
                  onUpdateProfile({
                    name: editName.trim() || userProfile.name,
                    email: editEmail.trim() || userProfile.email,
                    phone: editPhone.trim() || userProfile.phone,
                    location: editLocation.trim() || userProfile.location,
                  });
                  onToast('Saved profile settings');
                }}
                className="h-[34px] text-[11px]"
              >
                Save Changes
              </PrimaryButton>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="settings-name" className="block text-[11px] font-semibold text-[#181715] mb-1">
                  Full Name
                </label>
                <input
                  id="settings-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-[38px] px-3 rounded-[10px] bg-[#f4efe5] border border-[#dfd8cd] text-[12px]"
                />
              </div>
              <div>
                <label htmlFor="settings-email" className="block text-[11px] font-semibold text-[#181715] mb-1">
                  Email Address
                </label>
                <input
                  id="settings-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full h-[38px] px-3 rounded-[10px] bg-[#f4efe5] border border-[#dfd8cd] text-[12px]"
                />
              </div>
              <div>
                <label htmlFor="settings-phone" className="block text-[11px] font-semibold text-[#181715] mb-1">
                  Phone Number
                </label>
                <input
                  id="settings-phone"
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full h-[38px] px-3 rounded-[10px] bg-[#f4efe5] border border-[#dfd8cd] text-[12px]"
                />
              </div>
              <div>
                <label htmlFor="settings-location" className="block text-[11px] font-semibold text-[#181715] mb-1">
                  Location
                </label>
                <input
                  id="settings-location"
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full h-[38px] px-3 rounded-[10px] bg-[#f4efe5] border border-[#dfd8cd] text-[12px]"
                />
              </div>
            </div>
          </div>
        )}

        {settingsTab === 'Account' && (
          <div className="space-y-3">
            <h3 className="text-[14px] font-bold text-[#181715]">Account Preferences</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3]">
                <div className="text-[11px] text-[#6a665f]">Account Status</div>
                <div className="text-[13px] font-bold text-[#181715] mt-0.5">Verified • Level 2 Silver</div>
              </div>
              <div className="p-3.5 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3]">
                <div className="text-[11px] text-[#6a665f]">Primary Currency</div>
                <div className="text-[13px] font-bold text-[#181715] mt-0.5">{userProfile.defaultCurrency}</div>
              </div>
              <div className="p-3.5 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3]">
                <div className="text-[11px] text-[#6a665f]">Time Zone</div>
                <div className="text-[13px] font-bold text-[#181715] mt-0.5">{userProfile.timezone}</div>
              </div>
              <div className="p-3.5 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3]">
                <div className="text-[11px] text-[#6a665f]">Member Since</div>
                <div className="text-[13px] font-bold text-[#181715] mt-0.5">{userProfile.memberSince}</div>
              </div>
            </div>
          </div>
        )}

        {settingsTab === 'Security' && (
          <div className="space-y-3">
            <h3 className="text-[14px] font-bold text-[#181715]">Password, 2FA &amp; Active Devices</h3>
            {securityItems.map((item) => {
              const enabled = settingsToggles[item.key];
              return (
                <div
                  key={item.key}
                  className="p-3.5 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3] flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-[12px] font-semibold text-[#181715]">{item.label}</div>
                    <div className="text-[10.5px] text-[#6a665f]">{item.sub}</div>
                  </div>
                  <button
                    type="button"
                    aria-pressed={enabled}
                    onClick={() => toggleSetting(item.key, item.label)}
                    className={`px-3.5 py-1 rounded-full text-[10.5px] font-semibold cursor-pointer shrink-0 ${
                      enabled ? 'bg-[#222220] text-[#f7f2e8]' : 'bg-[#e5ded3] text-[#5c5954]'
                    }`}
                  >
                    {enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              );
            })}
            <div className="p-3.5 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3] flex items-center justify-between gap-3">
              <div>
                <div className="text-[12px] font-semibold text-[#181715]">Active Sessions (2 Devices)</div>
                <div className="text-[10.5px] text-[#6a665f]">MacBook Pro 16&quot; (Current) • iPhone 16 Pro (San Jose, CA)</div>
              </div>
              <SecondaryButton onClick={() => onToast('All other sessions verified clean')} className="h-[30px] text-[10.5px]">
                Manage Devices
              </SecondaryButton>
            </div>
          </div>
        )}

        {settingsTab === 'Privacy' && (
          <div className="space-y-3">
            <h3 className="text-[14px] font-bold text-[#181715]">Data Sharing, Personalization &amp; AI Permissions</h3>
            {privacyItems.map((item) => {
              const enabled = settingsToggles[item.key];
              return (
                <div
                  key={item.key}
                  className="p-3.5 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3] flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-[12px] font-semibold text-[#181715]">{item.label}</div>
                    <div className="text-[10.5px] text-[#6a665f]">{item.sub}</div>
                  </div>
                  <button
                    type="button"
                    aria-pressed={enabled}
                    onClick={() => toggleSetting(item.key, item.label)}
                    className={`px-3.5 py-1 rounded-full text-[10.5px] font-semibold cursor-pointer shrink-0 ${
                      enabled ? 'bg-[#222220] text-[#f7f2e8]' : 'bg-[#e5ded3] text-[#5c5954]'
                    }`}
                  >
                    {enabled ? 'Allowed' : 'Off'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {settingsTab === 'Notifications' && (
          <div className="space-y-2.5">
            <h3 className="text-[14px] font-bold text-[#181715]">Notification Channels</h3>
            {notificationItems.map((item) => {
              const enabled = settingsToggles[item.key];
              return (
                <div
                  key={item.key}
                  className="p-3 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3] flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-[12px] font-semibold text-[#181715]">{item.label}</div>
                    <div className="text-[10px] text-[#6a665f]">{item.sub}</div>
                  </div>
                  <button
                    type="button"
                    aria-pressed={enabled}
                    onClick={() => toggleSetting(item.key, item.label)}
                    className={`px-3.5 py-1 rounded-full text-[10.5px] font-semibold cursor-pointer shrink-0 ${
                      enabled ? 'bg-[#2e8b46] text-white' : 'bg-[#e5ded3] text-[#5c5954]'
                    }`}
                  >
                    {enabled ? 'On' : 'Muted'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {settingsTab === 'Payments' && (
          <div className="space-y-3">
            <h3 className="text-[14px] font-bold text-[#181715]">Default Payment Method, Banks &amp; Cards</h3>
            {paymentMethods.map((method) => {
              const isSelected = defaultPaymentMethod.startsWith(method.split(' (')[0]);
              return (
                <div
                  key={method}
                  className="p-3.5 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3] flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-[12px] font-bold text-[#181715]">{method}</div>
                    <div className="text-[10px] text-[#6a665f]">Verified • Instant Checkout Eligible</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeDefaultPaymentMethod(method);
                      onToast(`Set ${method} as default payment method`);
                    }}
                    className={`px-3 py-1 rounded-full text-[10.5px] font-semibold cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-[#222220] text-[#f7f2e8]'
                        : 'bg-[#faf5ec] border border-[#dfd8cd] text-[#2b2927]'
                    }`}
                  >
                    {isSelected ? 'Default ✓' : 'Set Default'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {settingsTab === 'Appearance' && (
          <div className="space-y-3">
            <h3 className="text-[14px] font-bold text-[#181715]">Theme, Layout &amp; Motion</h3>
            <div className="p-3.5 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3] flex items-center justify-between gap-3">
              <div>
                <div className="text-[12px] font-semibold text-[#181715]">Application Theme</div>
                <div className="text-[10.5px] text-[#6a665f]">PayPal Warm Cashmere &amp; Charcoal (Master Design System)</div>
              </div>
              <Badge variant="dark">Active Theme</Badge>
            </div>
            <div className="p-3.5 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3] flex items-center justify-between gap-3">
              <div>
                <div className="text-[12px] font-semibold text-[#181715]">Subtle UI Transitions</div>
                <div className="text-[10.5px] text-[#6a665f]">Smooth hover states and modal transitions</div>
              </div>
              <button
                type="button"
                aria-pressed={settingsToggles.subtleAnimations}
                onClick={() => toggleSetting('subtleAnimations', 'Subtle UI Transitions')}
                className="px-3.5 py-1 rounded-full bg-[#222220] text-[#f7f2e8] text-[10.5px] font-semibold cursor-pointer shrink-0"
              >
                {settingsToggles.subtleAnimations ? 'Enabled' : 'Reduced'}
              </button>
            </div>
          </div>
        )}

        {settingsTab === 'Connected Accounts' && (
          <div className="space-y-3">
            <h3 className="text-[14px] font-bold text-[#181715]">Connected Merchant &amp; Wallet Accounts</h3>
            {[
              { name: 'Apple ID & Apple Pay', status: 'Connected', detail: 'Express Checkout & Subscriptions' },
              { name: 'Steam Gaming Account', status: 'Connected', detail: 'Instant Digital Refunds Enabled' },
              { name: 'Amazon Prime Checkout', status: 'Connected', detail: 'Linked Chase Checking Backup' },
            ].map((acc) => (
              <div
                key={acc.name}
                className="p-3.5 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3] flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-[12px] font-bold text-[#181715]">{acc.name}</div>
                  <div className="text-[10px] text-[#6a665f]">{acc.detail}</div>
                </div>
                <Badge variant="success">{acc.status}</Badge>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 mt-4 border-t border-[#efe9de] flex items-center justify-between text-[10.5px] text-[#78736c]">
          <span>PayPal Argon 4 • Encrypted Account Configuration</span>
          <button
            type="button"
            onClick={() => onNavigate('/profile')}
            className="font-semibold text-[#181715] hover:underline cursor-pointer"
          >
            Open Full Profile Page →
          </button>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
