import React from 'react';
import { Payer } from '../types';
import { UserIcon, UsersIcon } from './Icons';

interface PayerToggleProps {
  value: Payer;
  onChange: (value: Payer) => void;
}

export const PayerToggle: React.FC<PayerToggleProps> = ({ value, onChange }) => {
  return (
    <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
      <button
        onClick={() => onChange(Payer.User1)}
        className={`flex-1 flex items-center justify-center py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
          value === Payer.User1
            ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200'
            : 'text-slate-500 hover:text-slate-700'
        }`}
        title="User 1 pays"
      >
        <UserIcon className="w-3.5 h-3.5 mr-1" />
        <span className="truncate">Me</span>
      </button>
      
      <button
        onClick={() => onChange(Payer.Split)}
        className={`flex-1 flex items-center justify-center py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
          value === Payer.Split
            ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200'
            : 'text-slate-500 hover:text-slate-700'
        }`}
        title="Split 50/50"
      >
        <UsersIcon className="w-3.5 h-3.5 mr-1" />
        <span className="truncate">Split</span>
      </button>

      <button
        onClick={() => onChange(Payer.User2)}
        className={`flex-1 flex items-center justify-center py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
          value === Payer.User2
            ? 'bg-white text-rose-600 shadow-sm ring-1 ring-slate-200'
            : 'text-slate-500 hover:text-slate-700'
        }`}
        title="User 2 pays"
      >
        <UserIcon className="w-3.5 h-3.5 mr-1" />
        <span className="truncate">Partner</span>
      </button>
    </div>
  );
};
