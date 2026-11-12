import React from 'react';
import { Badge } from './Badge';

export type StatusValue =
  | 'Completed'
  | 'Pending'
  | 'Refunded'
  | 'Failed'
  | 'Paid'
  | 'Expired'
  | 'Cancelled'
  | 'Active'
  | 'Paused'
  | 'Needs Attention'
  | 'All Safe';

export const StatusBadge: React.FC<{ status: StatusValue }> = ({ status }) => {
  if (status === 'Completed' || status === 'Paid' || status === 'Active' || status === 'All Safe') {
    return (
      <Badge variant="success">
        <span className="w-[5px] h-[5px] rounded-full bg-[#2e8b46]" aria-hidden="true" />
        {status}
      </Badge>
    );
  }
  if (status === 'Pending' || status === 'Needs Attention') {
    return (
      <Badge variant="warning">
        <span className="w-[5px] h-[5px] rounded-full bg-[#b4690e]" aria-hidden="true" />
        {status}
      </Badge>
    );
  }
  if (status === 'Refunded' || status === 'Paused' || status === 'Expired') {
    return (
      <Badge variant="default">
        <span className="w-[5px] h-[5px] rounded-full bg-[#78736c]" aria-hidden="true" />
        {status}
      </Badge>
    );
  }
  return (
    <Badge variant="danger">
      <span className="w-[5px] h-[5px] rounded-full bg-[#c93b2b]" aria-hidden="true" />
      {status}
    </Badge>
  );
};

export default StatusBadge;
