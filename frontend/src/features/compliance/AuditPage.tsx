import { useState, useEffect } from 'react';
import { Calendar, Bell, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';

const AuditPage = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await api.get('/copilot/history');
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch logs', error);
    } finally {
      setLoading(false);
    }
  };

  // calculate dynamic stats if possible, or leave as UI placeholders
  const totalQueries = logs.length;
  const verified = logs.filter(l => !l.flagged).length;
  const blocked = logs.filter(l => l.flagged).length;
  const avgGroundedness = totalQueries ? (logs.reduce((acc, l) => acc + l.groundedness, 0) / totalQueries).toFixed(1) : '0.0';

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
            <div className="text-4xl font-bold text-gray-900">{totalQueries}</div>
          </div>
          <div className="bg-white p-5 rounded-lg border shadow-sm flex flex-col justify-between">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Verified Responses</div>
            <div className="text-4xl font-bold text-blue-600">{verified}</div>
          </div>
          <div className="bg-white p-5 rounded-lg border shadow-sm flex flex-col justify-between">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Blocked Responses</div>
            <div className="text-4xl font-bold text-red-600">{blocked}</div>
          </div>
          <div className="bg-white p-5 rounded-lg border shadow-sm flex flex-col justify-between">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Average Groundedness</div>
            <div className="text-4xl font-bold text-gray-900">{avgGroundedness}%</div>
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
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-500">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{log.advisor || 'System'}</td>
                    <td className="px-6 py-4 text-gray-600 truncate max-w-[200px]">{log.query}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center w-24">
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mr-2">
                          <div className={`h-1.5 rounded-full ${log.groundedness >= 80 ? 'bg-blue-600' : 'bg-red-600'}`} style={{ width: `${log.groundedness}%` }}></div>
                        </div>
                        <span className={`text-xs font-medium ${log.groundedness >= 80 ? '' : 'text-red-600'}`}>{log.groundedness}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{log.documents_used || 0} sources</td>
                    <td className="px-6 py-4 text-gray-500">Current</td>
                    <td className="px-6 py-4">
                      {log.flagged ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-red-700 bg-red-50 border border-red-100">
                          Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100">
                          Verified
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/audit/${log.id}`} className="text-primary hover:underline font-medium text-xs">View Details</Link>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                      No audit logs found. Submit a query in Copilot to see it here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="h-12 border-t flex items-center justify-between px-6 bg-gray-50 text-[11px] text-gray-500 shrink-0">
        <div>© 2024 VeriFund AI. Regulatory Disclosure: Financial analysis provided by AI models for institutional use only.</div>
        <div className="flex space-x-4">
          <a href="#" className="hover:underline">Terms of Service</a>
          <a href="#" className="hover:underline">Privacy Policy</a>
          <a href="#" className="hover:underline">Regulatory Compliance</a>
        </div>
      </div>
    </div>
  );
};

export default AuditPage;
