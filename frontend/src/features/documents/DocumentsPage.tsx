import { useState, useEffect } from 'react';
import { Search, Upload, FileText } from 'lucide-react';
import api from '../../lib/api';

const DocumentsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/documents');
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to fetch documents', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchDocuments();
    } catch (error) {
      console.error('Upload failed', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Header */}
      <div className="h-14 border-b flex items-center px-6 shrink-0 bg-white">
        <h1 className="text-primary font-semibold text-lg">Document Library</h1>
      </div>

      <div className="p-8 flex-1 overflow-auto">
        <div className="bg-white border shadow-sm rounded-lg flex flex-col">
          {/* Toolbar */}
          <div className="p-4 border-b flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative w-96">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search documents, funds, tickers..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-md border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <select className="h-9 px-3 rounded-md border text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary">
                <option>Status: All</option>
                <option>APPROVED</option>
                <option>SUPERSEDED</option>
              </select>
              <select className="h-9 px-3 rounded-md border text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary">
                <option>Asset Class: All</option>
                <option>Equity</option>
                <option>Balanced</option>
              </select>
            </div>
            <button className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md flex items-center">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b">
                <tr>
                  <th className="px-6 py-3 uppercase tracking-wider text-[11px]">Document</th>
                  <th className="px-6 py-3 uppercase tracking-wider text-[11px]">Fund / Ticker</th>
                  <th className="px-6 py-3 uppercase tracking-wider text-[11px]">Asset Class</th>
                  <th className="px-6 py-3 uppercase tracking-wider text-[11px]">Version</th>
                  <th className="px-6 py-3 uppercase tracking-wider text-[11px]">Status</th>
                  <th className="px-6 py-3 uppercase tracking-wider text-[11px]">Effective Date</th>
                  <th className="px-6 py-3 uppercase tracking-wider text-[11px]">Expiration Date</th>
                  <th className="px-6 py-3 uppercase tracking-wider text-[11px]">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-700">
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 flex items-start">
                    <FileText className="h-5 w-5 mr-3 text-gray-400 shrink-0 mt-0.5" />
                    <span className="font-medium text-gray-900 leading-tight">Horizon Balanced<br/>Growth Fund<br/>Factsheet</span>
                  </td>
                  <td className="px-6 py-4">HBGF</td>
                  <td className="px-6 py-4">Balanced</td>
                  <td className="px-6 py-4 text-gray-500">v3.2</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></div>APPROVED
                    </span>
                  </td>
                  <td className="px-6 py-4">Jan 15, 2026</td>
                  <td className="px-6 py-4 text-gray-500">Dec 31, 2026</td>
                  <td className="px-6 py-4 text-gray-500">2h ago</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 flex items-start">
                    <FileText className="h-5 w-5 mr-3 text-gray-400 shrink-0 mt-0.5" />
                    <span className="font-medium text-gray-900 leading-tight">Atlas Equity<br/>Fund<br/>Prospectus</span>
                  </td>
                  <td className="px-6 py-4">AEF</td>
                  <td className="px-6 py-4">Equity</td>
                  <td className="px-6 py-4 text-gray-500">v5.0</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></div>APPROVED
                    </span>
                  </td>
                  <td className="px-6 py-4">Feb 01, 2026</td>
                  <td className="px-6 py-4 text-gray-500">Jan 31, 2027</td>
                  <td className="px-6 py-4 text-gray-500">1d ago</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 flex items-start">
                    <FileText className="h-5 w-5 mr-3 text-gray-400 shrink-0 mt-0.5" />
                    <span className="font-medium text-gray-500 line-through leading-tight">Growth Core Fund<br/>Factsheet</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">GCF</td>
                  <td className="px-6 py-4 text-gray-500">Equity</td>
                  <td className="px-6 py-4 text-gray-500">v2.1</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-600 text-[10px] font-bold border border-gray-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1.5 border border-white"></div>SUPERSEDED
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">Jan 01, 2025</td>
                  <td className="px-6 py-4 text-gray-500">Jan 01, 2026</td>
                  <td className="px-6 py-4 text-gray-500">1mo ago</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t flex items-center justify-between text-sm text-gray-500 bg-gray-50 rounded-b-lg">
            <div>Showing 1 to 3 of 45 documents</div>
            <div className="flex space-x-1">
              <button className="px-3 py-1 border rounded bg-white hover:bg-gray-50 text-gray-400" disabled>Prev</button>
              <button className="px-3 py-1 border rounded bg-blue-50 text-blue-600 border-blue-200 font-medium">1</button>
              <button className="px-3 py-1 border rounded bg-white hover:bg-gray-50">2</button>
              <button className="px-3 py-1 border rounded bg-white hover:bg-gray-50">3</button>
              <button className="px-3 py-1 border rounded bg-white hover:bg-gray-50">Next</button>
            </div>
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

export default DocumentsPage;
