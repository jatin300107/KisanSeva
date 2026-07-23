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
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create New Report</h1>
          <p className="mt-2 text-gray-500">Provide details to get an instant AI diagnosis for your crops or livestock.</p>
        </div>
        
        <ReportWizard onComplete={handleComplete} />
      </div>
    </DashboardLayout>
  );
};

export default NewReport;
