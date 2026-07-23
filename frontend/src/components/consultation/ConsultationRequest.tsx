import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { ExpertSelector } from './ExpertSelector';
import { farmerApi } from '../../api/farmer';
import { Send, AlertCircle } from 'lucide-react';

interface ConsultationRequestProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  onSuccess: () => void;
}

export const ConsultationRequest: React.FC<ConsultationRequestProps> = ({
  isOpen,
  onClose,
  reportId,
  onSuccess,
}) => {
  const [selectedExpertId, setSelectedExpertId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpertId) {
      setError('Please select an expert first');
      return;
    }
    if (!message.trim()) {
      setError('Please enter your query or message for the expert');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await farmerApi.requestConsultation(reportId, {
        expert_id: selectedExpertId,
        message: message.trim(),
      });
      setLoading(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit consultation request');
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Expert Consultation">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            1. Select an Expert
          </label>
          <ExpertSelector
            selectedExpertId={selectedExpertId}
            onSelect={(id) => {
              setSelectedExpertId(id);
              setError(null);
            }}
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            2. Describe your inquiry or concerns
          </label>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Explain what specific questions you have about this diagnosis or treatment plan..."
            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-slate-800 placeholder-slate-400 outline-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={loading}
            disabled={!selectedExpertId || !message.trim()}
            icon={<Send className="w-4 h-4" />}
          >
            Submit Consultation
          </Button>
        </div>
      </form>
    </Modal>
  );
};
