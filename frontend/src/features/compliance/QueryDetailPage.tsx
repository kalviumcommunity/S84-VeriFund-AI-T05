import { ArrowLeft, Calendar, Bell, FileText, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const QueryDetailPage = () => {
  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-6 shrink-0 bg-white">
        <div className="flex items-center">
          <Link to="/audit" className="mr-4 text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-semibold text-gray-900">Query Verification Detail</h1>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center px-3 py-1.5 border rounded-md text-sm text-gray-600 hover:bg-gray-50 bg-white">
            <span className="uppercase text-[10px] tracking-wider mr-2 font-semibold">AS-OF DATE</span>
            <Calendar className="h-4 w-4" />
          </button>
          <button className="p-1.5 text-gray-500 hover:text-gray-900">
            <Bell className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="p-8 flex-1 overflow-auto max-w-6xl mx-auto w-full">
        
        {/* Meta Card */}
        <div className="bg-white border shadow-sm rounded-lg p-6 mb-6">
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">ADVISOR</div>
              <div className="font-medium text-gray-900">Sarah Jenkins, CFA</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">TIMESTAMP</div>
              <div className="font-medium text-gray-500">2023-10-24 14:32:05 UTC</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">AS-OF DATE</div>
              <div className="font-medium text-gray-500">2023-09-30</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">GROUNDEDNESS SCORE</div>
              <div className="flex items-center mt-1">
                <span className="text-2xl font-bold text-blue-600 mr-4">98%</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '98%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">ORIGINAL QUERY</div>
            <div className="p-4 border rounded-md bg-gray-50 text-gray-800 text-sm">
              "What are the redemption terms and current expense ratio for the Horizon Balanced Growth Fund?"
            </div>
          </div>
        </div>

        {/* Content Split */}
        <div className="grid grid-cols-3 gap-6">
          
          {/* Left Column (Response & Disclosures) */}
          <div className="col-span-2 space-y-6">
            
            <div className="bg-white border shadow-sm rounded-lg p-6 relative">
              <div className="absolute top-4 right-4 bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded flex items-center border border-blue-100">
                <CheckCircle2 className="h-3 w-3 mr-1" /> AI GENERATED
              </div>
              <h2 className="font-semibold text-gray-900 mb-4">Generated Response</h2>
              <div className="text-sm text-gray-800 leading-relaxed space-y-4">
                <p>Based on the documents provided as of September 30, 2023, the Horizon Balanced Growth Fund has the following terms:</p>
                <p>
                  <span className="font-bold">Expense Ratio:</span> The net expense ratio is currently <span className="font-bold text-blue-800">0.85%</span><sup className="text-blue-600 cursor-pointer hover:underline">[1]</sup>. This includes management fees of 0.65% and other administrative expenses of 0.20%.
                </p>
                <p>
                  <span className="font-bold">Redemption Terms:</span> Redemptions are processed on a daily basis. Notice must be received by <span className="font-bold text-blue-800">4:00 PM EST for same-day NAV pricing</span><sup className="text-blue-600 cursor-pointer hover:underline">[2]</sup>. Proceeds are typically dispersed within T+2 business days. There is a 1.00% early redemption fee for shares held less than 30 days.
                </p>
              </div>
            </div>

            <div className="bg-white border shadow-sm rounded-lg p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-4 w-4 mr-2" /> Applied Disclosures
              </h2>
              <div className="p-4 border rounded-md bg-gray-50 text-gray-600 text-xs italic">
                "The information provided is derived from the most recent fund prospectus and factsheets available. Mutual fund investing involves risk, including possible loss of principal. Please read the prospectus carefully before investing. Expense ratios and terms are subject to change."
              </div>
            </div>

          </div>

          {/* Right Column (Sources) */}
          <div className="col-span-1">
            <div className="bg-[#F8FAFC] border shadow-sm rounded-lg p-4 h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 text-sm">Retrieved Sources</h2>
                <span className="text-[10px] font-mono bg-white border px-2 py-0.5 rounded text-gray-500">Top K: 2</span>
              </div>
              
              <div className="space-y-4">
                {/* Source 1 */}
                <div className="bg-white border rounded-md shadow-sm">
                  <div className="p-2 border-b bg-gray-50 flex items-center justify-between text-xs">
                    <div className="flex items-center font-medium text-blue-700">
                      <span className="font-bold mr-2">[1]</span>
                      <FileText className="h-3 w-3 mr-1" /> Horizon Balanced Growth Fund ...
                    </div>
                    <div className="bg-white border rounded px-1 text-[10px] text-gray-500 leading-tight text-center">Pg<br/>4</div>
                  </div>
                  <div className="p-3">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">EXTRACTED SNIPPET: FEES & EXPENSES</div>
                    <div className="text-xs text-gray-600 font-mono leading-relaxed bg-gray-50 p-2 rounded">
                      "...the Fund's Total Annual Operating Expenses are 0.85%. The Adviser has contractually agreed to waive fees,.."
                    </div>
                  </div>
                </div>

                {/* Source 2 */}
                <div className="bg-white border rounded-md shadow-sm">
                  <div className="p-2 border-b bg-gray-50 flex items-center justify-between text-xs">
                    <div className="flex items-center font-medium text-blue-700">
                      <span className="font-bold mr-2">[2]</span>
                      <FileText className="h-3 w-3 mr-1" /> Horizon Balanced Growth Fund P...
                    </div>
                    <div className="bg-white border rounded px-1 text-[10px] text-gray-500 leading-tight text-center">Pg<br/>17</div>
                  </div>
                  <div className="p-3">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">EXTRACTED SNIPPET: REDEMPTION TERMS</div>
                    <div className="text-xs text-gray-600 font-mono leading-relaxed bg-gray-50 p-2 rounded">
                      "Shares may be redeemed daily at the Net Asset Value (NAV) next calculated after receipt of a redemption request..."
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="h-12 border-t flex items-center justify-between px-6 bg-gray-50 text-[11px] text-gray-500 shrink-0 mt-auto">
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

export default QueryDetailPage;
