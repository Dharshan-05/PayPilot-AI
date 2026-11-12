import React, { useState } from 'react';
import { Edit3 } from 'lucide-react';
import { ASSETS } from '../assets/images';
import type { RoutePath } from '../data/dashboard';
import type { UserProfile } from '../data/users';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { Badge } from '../components/Badge';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';

export interface UserProfilePageProps {
  userProfile: UserProfile;
  defaultPaymentMethod: string;
  rewardPoints: number;
  onUpdateProfile: (patch: Pick<UserProfile, 'name' | 'email' | 'phone' | 'location'>) => void;
  onNavigate: (route: RoutePath) => void;
  onToast: (msg: string) => void;
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({
  userProfile,
  defaultPaymentMethod,
  rewardPoints,
  onUpdateProfile,
  onNavigate,
  onToast,
}) => {
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState(userProfile.name);
  const [editEmail, setEditEmail] = useState(userProfile.email);
  const [editPhone, setEditPhone] = useState(userProfile.phone);
  const [editLocation, setEditLocation] = useState(userProfile.location);

  const openEditModal = () => {
    setEditName(userProfile.name);
    setEditEmail(userProfile.email);
    setEditPhone(userProfile.phone);
    setEditLocation(userProfile.location);
    setEditProfileOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Profile"
        subtitle="Your PayPal identity, verification status, and linked financial accounts."
        onBack={() => onNavigate('/')}
        rightSlot={
          <PrimaryButton onClick={openEditModal} className="h-[35px] text-[11px]">
            <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Edit Profile</span>
          </PrimaryButton>
        }
      />

      <Card className="p-[20px] mb-[14px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-[72px] h-[72px] rounded-full ring-2 ring-[#b8b1a6] overflow-hidden bg-[#ede6dc] shrink-0">
            <img src={ASSETS.avatarCat} alt={userProfile.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[20px] font-bold text-[#181715]">{userProfile.name}</h2>
              <StatusBadge status="All Safe" />
            </div>
            <p className="text-[11.5px] text-[#6a665f] mt-0.5">
              {userProfile.handle} • {userProfile.email} • {userProfile.phone}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="dark">{userProfile.tier}</Badge>
              <Badge variant="default">Member since {userProfile.memberSince}</Badge>
              <Badge variant="success">{userProfile.status}</Badge>
            </div>
          </div>
        </div>

        <div className="sm:w-[230px] p-3.5 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3]">
          <div className="flex justify-between text-[11px] font-semibold text-[#181715] mb-1">
            <span>Profile Completion</span>
            <span>{userProfile.completion}%</span>
          </div>
          <div className="w-full h-[7px] rounded-full bg-[#e4ddd2] overflow-hidden">
            <div
              style={{ width: `${userProfile.completion}%` }}
              className="h-full bg-[#2e8b46] rounded-full"
            />
          </div>
          <div className="text-[9.5px] text-[#6a665f] mt-1.5">
            Identity, bank, and biometric passkey verified.
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px] flex-1">
        <Card className="p-[18px]">
          <h3 className="text-[13.5px] font-bold text-[#181715] mb-3">Personal Information</h3>
          <div className="space-y-2.5 text-[11.5px]">
            <div className="flex justify-between py-1.5 border-b border-[#efe9de]">
              <span className="text-[#6a665f]">Full Legal Name</span>
              <span className="font-semibold text-[#181715]">{userProfile.name}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#efe9de]">
              <span className="text-[#6a665f]">PayPal.Me Handle</span>
              <span className="font-semibold text-[#181715]">
                paypal.me/{userProfile.handle.replace(/^@/, '')}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[#6a665f]">Residential City</span>
              <span className="font-semibold text-[#181715]">{userProfile.location}</span>
            </div>
          </div>
        </Card>

        <Card className="p-[18px]">
          <h3 className="text-[13.5px] font-bold text-[#181715] mb-3">Contact Information</h3>
          <div className="space-y-2.5 text-[11.5px]">
            <div className="flex justify-between py-1.5 border-b border-[#efe9de]">
              <span className="text-[#6a665f]">Primary Email</span>
              <span className="font-semibold text-[#181715]">{userProfile.email}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#efe9de]">
              <span className="text-[#6a665f]">Mobile Phone (SMS 2FA)</span>
              <span className="font-semibold text-[#181715]">{userProfile.phone}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[#6a665f]">Emergency Recovery</span>
              <span className="font-semibold text-[#2b7a43]">Configured ✓</span>
            </div>
          </div>
        </Card>

        <Card className="p-[18px]">
          <h3 className="text-[13.5px] font-bold text-[#181715] mb-3">Preferences</h3>
          <div className="space-y-2.5 text-[11.5px]">
            <div className="flex justify-between py-1.5 border-b border-[#efe9de]">
              <span className="text-[#6a665f]">Default Currency</span>
              <span className="font-semibold text-[#181715]">{userProfile.defaultCurrency}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#efe9de]">
              <span className="text-[#6a665f]">Preferred Checkout Funding</span>
              <span className="font-semibold text-[#181715]">{defaultPaymentMethod}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[#6a665f]">Rewards Auto-Redeem</span>
              <span className="font-semibold text-[#181715]">Manual Redemption ({rewardPoints} pts)</span>
            </div>
          </div>
        </Card>

        <Card className="p-[18px]">
          <h3 className="text-[13.5px] font-bold text-[#181715] mb-3">Linked Accounts</h3>
          <div className="space-y-2 text-[11.5px]">
            <div className="p-2.5 rounded-[12px] bg-[#f4efe5] border border-[#e5ded3] flex items-center justify-between">
              <span className="font-semibold text-[#181715]">Chase Checking ••4821</span>
              <Badge variant="success">Primary Bank</Badge>
            </div>
            <div className="p-2.5 rounded-[12px] bg-[#f4efe5] border border-[#e5ded3] flex items-center justify-between">
              <span className="font-semibold text-[#181715]">Visa Signature ••9014</span>
              <Badge variant="default">Backup Card</Badge>
            </div>
          </div>
        </Card>
      </div>

      <Modal open={editProfileOpen} onClose={() => setEditProfileOpen(false)} title="Edit Your Profile">
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="profile-edit-name" className="block text-[11px] font-semibold mb-1">
              Name
            </label>
            <input
              id="profile-edit-name"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full h-[38px] px-3 rounded-[10px] bg-[#f4efe5] border border-[#dfd8cd] text-[12px]"
            />
          </div>
          <div>
            <label htmlFor="profile-edit-email" className="block text-[11px] font-semibold mb-1">
              Email
            </label>
            <input
              id="profile-edit-email"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full h-[38px] px-3 rounded-[10px] bg-[#f4efe5] border border-[#dfd8cd] text-[12px]"
            />
          </div>
          <div>
            <label htmlFor="profile-edit-phone" className="block text-[11px] font-semibold mb-1">
              Phone
            </label>
            <input
              id="profile-edit-phone"
              type="text"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="w-full h-[38px] px-3 rounded-[10px] bg-[#f4efe5] border border-[#dfd8cd] text-[12px]"
            />
          </div>
          <div>
            <label htmlFor="profile-edit-location" className="block text-[11px] font-semibold mb-1">
              Location
            </label>
            <input
              id="profile-edit-location"
              type="text"
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              className="w-full h-[38px] px-3 rounded-[10px] bg-[#f4efe5] border border-[#dfd8cd] text-[12px]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton onClick={() => setEditProfileOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton
              onClick={() => {
                onUpdateProfile({
                  name: editName.trim() || userProfile.name,
                  email: editEmail.trim() || userProfile.email,
                  phone: editPhone.trim() || userProfile.phone,
                  location: editLocation.trim() || userProfile.location,
                });
                setEditProfileOpen(false);
                onToast('Profile updated!');
              }}
            >
              Save Profile
            </PrimaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserProfilePage;
