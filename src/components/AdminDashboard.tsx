import React from 'react';
import { AdminPortfolios } from './AdminPortfolios';
import { AdminActiveOrders } from './AdminActiveOrders';

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      <AdminActiveOrders />
      <AdminPortfolios />
    </div>
  );
}