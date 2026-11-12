export interface UserProfile {
  name: string;
  handle: string;
  email: string;
  phone: string;
  location: string;
  memberSince: string;
  status: string;
  tier: string;
  completion: number;
  defaultCurrency: string;
  timezone: string;
}

export interface ContactPerson {
  id: string;
  name: string;
  email: string;
  phone: string;
  handle: string;
  initials: string;
  bgColor: string;
}

export const CURRENT_USER: UserProfile = {
  name: 'Dharshan',
  handle: '@dharshan',
  email: 'dharshan.k@paypal.com',
  phone: '+1 (415) 892-4410',
  location: 'San Jose, CA, United States',
  memberSince: 'March 2021',
  status: 'Verified Account',
  tier: 'Level 2 · Silver',
  completion: 95,
  defaultCurrency: 'USD ($)',
  timezone: 'Pacific Time (PT)',
};

export const CONTACTS_DATA: ContactPerson[] = [
  { id: 'c-1', name: 'Sarah K.', email: 'sarah.k@designstudio.io', phone: '+1 (415) 309-8821', handle: '@sarahk', initials: 'SK', bgColor: '#222220' },
  { id: 'c-2', name: 'Alex Rivera', email: 'alex.rivera@stanford.edu', phone: '+1 (650) 441-9023', handle: '@arivera', initials: 'AR', bgColor: '#2b7a43' },
  { id: 'c-3', name: 'Maya Lin', email: 'maya.lin@stripe-alumni.org', phone: '+1 (212) 904-1182', handle: '@mayalin', initials: 'ML', bgColor: '#5c5549' },
  { id: 'c-4', name: 'Liam O’Connor', email: 'liam.oc@fintech.co', phone: '+1 (312) 608-3349', handle: '@liamoc', initials: 'LO', bgColor: '#3d5a80' },
  { id: 'c-5', name: 'Priya Nair', email: 'priya.nair@cloudlabs.ai', phone: '+1 (408) 772-5519', handle: '@priyanair', initials: 'PN', bgColor: '#7a4938' },
];
