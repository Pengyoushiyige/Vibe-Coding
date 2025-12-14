import React, { useMemo } from 'react';
import { BillItem, Payer } from '../types';
import { UserIcon } from './Icons';

interface ResultsSummaryProps {
  items: BillItem[];
}

export const ResultsSummary: React.FC<ResultsSummaryProps> = ({ items }) => {
  const calculations = useMemo(() => {
    let user1Total = 0;
    let user2Total = 0;
    let grandTotal = 0;
    let totalTax = 0;

    items.forEach(item => {
      const price = item.price || 0;
      const taxRate = item.taxRate || 0.10;
      const priceWithTax = price * (1 + taxRate);
      const taxAmount = price * taxRate;

      grandTotal += priceWithTax;
      totalTax += taxAmount;

      if (item.payer === Payer.User1) {
        user1Total += priceWithTax;
      } else if (item.payer === Payer.User2) {
        user2Total += priceWithTax;
      } else {
        user1Total += priceWithTax / 2;
        user2Total += priceWithTax / 2;
      }
    });

    return { user1Total, user2Total, grandTotal, totalTax };
  }, [items]);

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-700 pb-4">
        <div>
          <h2 className="text-xl font-bold">Total Bill</h2>
          <div className="text-xs text-slate-400 mt-1">
            (Includes ¥{Math.round(calculations.totalTax).toLocaleString()} tax)
          </div>
        </div>
        <span className="text-3xl font-bold text-emerald-400">¥{Math.round(calculations.grandTotal).toLocaleString()}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-indigo-900/40 p-4 rounded-xl border border-indigo-500/30 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <UserIcon className="w-12 h-12" />
          </div>
          <div className="flex items-center gap-2 mb-2 text-indigo-200 text-sm font-medium z-10">
            <UserIcon className="w-4 h-4" />
            My Share
          </div>
          <span className="text-2xl font-bold text-indigo-100 z-10">¥{Math.round(calculations.user1Total).toLocaleString()}</span>
        </div>

        <div className="bg-rose-900/40 p-4 rounded-xl border border-rose-500/30 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <UserIcon className="w-12 h-12" />
          </div>
          <div className="flex items-center gap-2 mb-2 text-rose-200 text-sm font-medium z-10">
            <UserIcon className="w-4 h-4" />
            Partner's Share
          </div>
          <span className="text-2xl font-bold text-rose-100 z-10">¥{Math.round(calculations.user2Total).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
