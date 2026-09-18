import { useState, useEffect } from 'react';
import { Calendar, Bell, Filter, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import Footer from '../../components/layout/Footer';

const AuditPage = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      // Mocking fetch since we don't have a GET route for query_logs yet, but it would look like this:
      // const response = await api.get('/copilot/history');
      // setLogs(response.data);
      
      setLogs([
        {
          id: 'q-4921',
          timestamp: '2023-10-24 14:32:11',
          advisor: 'Sarah Jenkins',
          query: 'What are the exit fees for Horizon Balanced Growth?',
          groundedness: 98,
          flagged: false,
        },
        {
          id: 'q-4920',
          timestamp: '2023-10-24 11:15:42',
          advisor: 'Michael Chang',
          query: 'Can a non-US resident invest in Alpha Core?',
          groundedness: 65,
          flagged: true,
        },
        {
          id: 'q-4919',
          timestamp: '2023-10-23 16:45:00',
          advisor: 'David Reynolds',
          query: 'Compare Q3 performance of Tech Sector fund vs Benchmark.',
          groundedness: 92,
          flagged: false,
        }
      ]);
    } catch (error) {
      console.error('Failed to fetch logs', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-6 shrink-0 bg-white">
        <h1 className="font-semibold text-lg text-gray-900">Compliance Audit</h1>
        <div className="flex items-center space-x-3">
          <button className="flex items-center px-3 py-1.5 border rounded-md text-sm text-gray-600 hover:bg-gray-50 bg-white">
            <Calendar className="h-4 w-4 mr-2 text-primary" />
            As-Of Date
          </button>
          <button className="p-1.5 text-gray-500 hover:text-gray-900">
            <Bell className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="p-8 flex-1 overflow-auto">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-5 rounded-lg border shadow-sm flex flex-col justify-between">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Queries</div>
            <div className="text-4xl font-bold text-gray-900">1,284</div>
          </div>
          <div className="bg-white p-5 rounded-lg border shadow-sm flex flex-col justify-between">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Verified Responses</div>
            <div className="text-4xl font-bold text-blue-600">1,251</div>
          </div>
          <div className="bg-white p-5 rounded-lg border shadow-sm flex flex-col justify-between">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Blocked Responses</div>
            <div className="text-4xl font-bold text-red-600">33</div>
          </div>
          <div className="bg-white p-5 rounded-lg border shadow-sm flex flex-col justify-between">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Average Groundedness</div>
            <div className="text-4xl font-bold text-gray-900">97.8%</div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white border shadow-sm rounded-lg flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Query Audit Log</h2>
            <button className="flex items-center px-3 py-1.5 border rounded-md text-sm text-gray-600 hover:bg-gray-50">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b">
                <tr>
                  <th className="px-6 py-3 uppercase tracking-wider text-[11px]">Timestamp</th>
                  <th className="px-6 py-3 uppercase tracking-wider text-[11px]">Advisor</th>
                  <th className="px-6 py-3 uppercase tracking-wider text-[11px]">Query</th>
                  <th className="px-6 py-3 uppercase tracking-wider text-[11px]">Groundedness</th>
                  <th className="px-6 py-3 uppercase tracking-wider text-[11px]">Documents Used</th>
                  <th className="px-6 py-3 uppercase tracking-wider text-[11px]">As-Of Date</th>
                  <th className="px-6 py-3 uppercase tracking-wider text-[11px]">Status</th>
                  <th className="px-6 py-3 uppercase tracking-wider text-[11px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-700">
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-500">09:42 AM</td>
                  <td className="px-6 py-4 font-medium text-gray-900">Sarah Mitchell</td>
                  <td className="px-6 py-4 text-gray-600">What is the exit fee...?</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center w-24">
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mr-2">
                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '98%' }}></div>
                      </div>
                      <span className="text-xs font-medium">98%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">3 sources</td>
                  <td className="px-6 py-4 text-gray-500">Current</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100">
                      Verified
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link to="/audit/1" className="text-primary hover:underline font-medium text-xs">View Details</Link>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-500">09:37 AM</td>
                  <td className="px-6 py-4 font-medium text-gray-900">James Carter</td>
                  <td className="px-6 py-4 text-gray-600">Can clients redeem...?</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center w-24">
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mr-2">
                        <div className="bg-red-600 h-1.5 rounded-full" style={{ width: '74%' }}></div>
                      </div>
                      <span className="text-xs font-medium text-red-600">74%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">2 sources</td>
                  <td className="px-6 py-4 text-gray-500">Current</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-red-700 bg-red-50 border border-red-100">
                      Blocked
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link to="/audit/2" className="text-primary hover:underline font-medium text-xs">View Details</Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default AuditPage;
