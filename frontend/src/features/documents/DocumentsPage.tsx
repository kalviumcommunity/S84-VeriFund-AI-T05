import { useState, useEffect } from 'react';
import { Search, Upload, FileText, Loader2 } from 'lucide-react';
import api from '../../lib/api';

const DocumentsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const uploadPromises = Array.from(files).map(file => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      });
      
      await Promise.all(uploadPromises);
      await fetchDocuments();
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input so same file can be uploaded again if needed
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
            <label className={`h-9 px-4 ${uploading ? 'bg-[#8B4513] cursor-wait' : 'bg-primary hover:bg-[#8B4513] cursor-pointer'} text-white text-sm font-medium rounded-md flex items-center transition-colors`}>
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {uploading ? 'Uploading...' : 'Upload Document'}
              <input type="file" className="hidden" multiple onChange={handleFileUpload} accept=".pdf" disabled={uploading} />
            </label>
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
                  <th className="px-6 py-3 uppercase tracking-wider text-[11px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-700">
                {documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 flex items-start">
                      <FileText className="h-5 w-5 mr-3 text-gray-400 shrink-0 mt-0.5" />
                      <span className="font-medium text-gray-900 leading-tight">{doc.title}</span>
                    </td>
                    <td className="px-6 py-4">{doc.title.split(' ').map((w: string) => w[0]).join('').substring(0,4).toUpperCase()}</td>
                    <td className="px-6 py-4">{doc.asset_class || 'Unknown'}</td>
                    <td className="px-6 py-4 text-gray-500">v{doc.version || '1.0'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold border ${doc.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${doc.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>{doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">{new Date(doc.effective_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-gray-500">{doc.expiration_date ? new Date(doc.expiration_date).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right flex items-center justify-end space-x-2">
                      <select 
                        value={doc.status}
                        disabled={updatingId === doc.id}
                        onChange={async (e) => {
                          setUpdatingId(doc.id);
                          try {
                            await api.patch(`/documents/${doc.id}/status`, { status: e.target.value });
                            await fetchDocuments();
                          } finally {
                            setUpdatingId(null);
                          }
                        }}
                        className={`text-xs border rounded p-1 ${updatingId === doc.id ? 'opacity-50 cursor-wait bg-gray-100' : ''}`}
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="SUPERSEDED">SUPERSEDED</option>
                      </select>
                      <button 
                        onClick={() => setDocumentToDelete(doc)}
                        className="text-xs text-red-600 hover:text-red-800 border border-red-200 rounded p-1 px-2 cursor-pointer transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {documents.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                      No documents found. Upload a document to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t flex items-center justify-between text-sm text-gray-500 bg-gray-50 rounded-b-lg">
            <div>
              Showing {documents.length > 0 ? 1 : 0} to {documents.length} of {documents.length} documents
            </div>
            <div className="flex space-x-1">
              <button className="px-3 py-1 border rounded bg-white hover:bg-gray-50 text-gray-400" disabled>Prev</button>
              <button className="px-3 py-1 border rounded bg-[#FBF4EE] text-primary border-[#B87333] font-medium">1</button>
              <button className="px-3 py-1 border rounded bg-white hover:bg-gray-50 text-gray-400" disabled>Next</button>
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

      {/* Delete Confirmation Modal */}
      {documentToDelete && (
        <div 
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              setDocumentToDelete(null);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Document</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete <strong>{documentToDelete.title}</strong>? This action will permanently remove the document and its embeddings from the system. This cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                disabled={isDeleting}
                onClick={() => setDocumentToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button 
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await api.delete(`/documents/${documentToDelete.id}`);
                    await fetchDocuments();
                    setDocumentToDelete(null);
                  } catch (e) {
                    console.error("Failed to delete", e);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className={`px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 flex items-center transition-colors ${isDeleting ? 'cursor-wait opacity-50' : 'cursor-pointer'}`}
              >
                {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
