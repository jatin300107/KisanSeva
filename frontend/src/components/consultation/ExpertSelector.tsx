import React, { useEffect, useState } from 'react';
import { farmerApi } from '../../api/farmer';
import type { Expert } from '../../types';
import { UserCheck, ShieldCheck, Phone } from 'lucide-react';

interface ExpertSelectorProps {
  selectedExpertId: string | null;
  onSelect: (expertId: string) => void;
}

export const ExpertSelector: React.FC<ExpertSelectorProps> = ({ selectedExpertId, onSelect }) => {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    farmerApi.getExperts()
      .then((res) => {
        setExperts(res.data.experts || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'Failed to load experts');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-3 py-2">
        <div className="h-16 bg-slate-100 animate-pulse rounded-xl" />
        <div className="h-16 bg-slate-100 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">{error}</div>;
  }

  if (experts.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
        No active agricultural or veterinary experts available at the moment.
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
      {experts.map((exp) => {
        const isSelected = selectedExpertId === exp.id;
        return (
          <div
            key={exp.id}
            onClick={() => onSelect(exp.id)}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              isSelected
                ? 'border-emerald-500 bg-emerald-50/60 shadow-sm'
                : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-full ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">{exp.name || 'Certified Specialist'}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md capitalize">
                    {exp.role === 'vet' ? 'Veterinarian' : 'Agrologist'}
                  </span>
                  {exp.phone && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {exp.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {isSelected && (
              <div className="text-emerald-600">
                <UserCheck className="w-5 h-5" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
