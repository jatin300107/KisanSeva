import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ReportWizard } from '../../components/report/ReportWizard';
import type { SubmitReportResponse } from '../../types';

export const NewReport: React.FC = () => {
  const navigate = useNavigate();

  const handleComplete = (response: SubmitReportResponse) => {
    navigate(`/farmer/reports/${response.report_id}`);
  };

  return (
    <DashboardLayout>
      <div className="page-shell py-2 sm:py-4">
        <div className="page-heading">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Create New Report</h1>
          <p className="mt-2 max-w-2xl text-slate-500 leading-6">Provide details to get an instant AI diagnosis for your crops or livestock.</p>
        </div>
        
        <ReportWizard onComplete={handleComplete} />
      </div>
    </DashboardLayout>
  );
};

export default NewReport;
