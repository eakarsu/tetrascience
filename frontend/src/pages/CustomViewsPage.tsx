import React from 'react';
import { FlaskConical } from 'lucide-react';
// @ts-ignore - JS components
import SampleWorkflow from '../components/SampleWorkflow';
// @ts-ignore
import DataQualityChart from '../components/DataQualityChart';
// @ts-ignore
import SampleBarcodeExport from '../components/SampleBarcodeExport';
// @ts-ignore
import CalibrationScheduler from '../components/CalibrationScheduler';

const CustomViewsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FlaskConical className="w-7 h-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lab Views</h1>
          <p className="text-sm text-slate-600">
            Sample workflow, instrument data quality, barcode exports, and calibration scheduling.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SampleWorkflow />
        <DataQualityChart />
        <SampleBarcodeExport />
        <CalibrationScheduler />
      </div>
    </div>
  );
};

export default CustomViewsPage;
