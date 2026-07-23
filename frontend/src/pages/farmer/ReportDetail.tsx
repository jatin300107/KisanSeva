import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { farmerApi } from '../../api/farmer';
import type { ReportDetailResponse } from '../../types';
import { ReportView } from '../../components/report/ReportView';
import { ConsultationRequest } from '../../components/consultation/ConsultationRequest';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ReportDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConsultModal, setShowConsultModal] = useState(false);

  const fetchReport = () => {
    if (!id) return;
    setLoading(true);
    farmerApi.getReport(id)
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'Report not found');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReport();
  }, [id]);

  return (
    <DashboardLayout>
      {loading ? (
        <div className="py-20 flex justify-center">
          <Spinner size={32} label="Loading Report Details..." />
        </div>
      ) : error || !data ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 max-w-lg mx-auto my-12">
          <h2 className="text-xl font-bold text-slate-800">Report Error</h2>
          <p className="text-sm text-slate-500">{error || 'Unable to display report'}</p>
          <Button variant="primary" onClick={() => navigate('/farmer/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      ) : (
        <>
          <ReportView
            report={data.report}
            images={data.images}
            answers={data.answers}
            consultations={data.consultations}
            onRequestConsultation={() => setShowConsultModal(true)}
            onBackToDashboard={() => navigate('/farmer/dashboard')}
          />

          <ConsultationRequest
            isOpen={showConsultModal}
            onClose={() => setShowConsultModal(false)}
            reportId={data.report.id}
            onSuccess={() => fetchReport()}
          />
        </>
      )}
    </DashboardLayout>
  );
}
