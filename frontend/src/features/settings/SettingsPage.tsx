import { useState } from 'react';
import { Bell, Shield, Database, CheckCircle, Save } from 'lucide-react';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('compliance');
  const [saved, setSaved] = useState(false);
  const [model] = useState(localStorage.getItem('preferredModel') || 'gemini-3.8-flash');
  const [strictMode, setStrictMode] = useState(localStorage.getItem('strictMode') !== 'false'); // Default true
  const [temperature, setTemperature] = useState(parseFloat(localStorage.getItem('temperature') || '0.1'));

  const handleSave = () => {
    localStorage.setItem('preferredModel', model);
    localStorage.setItem('strictMode', strictMode.toString());
    localStorage.setItem('temperature', temperature.toString());
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Header */}
      <div className="h-14 border-b flex items-center px-6 shrink-0 bg-white justify-between">
        <h1 className="text-gray-900 font-semibold text-lg">System Settings</h1>
        <button 
          onClick={handleSave}
          className="flex items-center px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          {saved ? <CheckCircle className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {saved ? 'Saved' : 'Save Changes'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Nav */}
        <div className="w-64 border-r bg-white p-4 flex flex-col space-y-1">
          <button 
            onClick={() => setActiveTab('compliance')}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'compliance' ? 'bg-blue-50 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Shield className="h-4 w-4 mr-3" />
            Compliance & Rules
          </button>
          <button 
            onClick={() => setActiveTab('models')}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'models' ? 'bg-blue-50 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Database className="h-4 w-4 mr-3" />
            AI Models & Vector DB
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'notifications' ? 'bg-blue-50 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Bell className="h-4 w-4 mr-3" />
            Notifications
          </button>
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-auto p-8 bg-gray-50">
          <div className="max-w-3xl mx-auto space-y-6">
            
            {activeTab === 'compliance' && (
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Compliance Guardrails</h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Groundedness Threshold</label>
                    <p className="text-xs text-gray-500 mb-2">Responses falling below this percentage will be automatically blocked and flagged for review.</p>
                    <input type="range" min="50" max="100" defaultValue="80" className="w-full accent-primary" />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>50%</span>
                      <span className="font-bold text-gray-700">80%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  <hr />
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Strict Hallucination Mode</h4>
                      <p className="text-xs text-gray-500">Prevent the AI from using external knowledge not found in the uploaded documents.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={strictMode} 
                        onChange={(e) => setStrictMode(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'models' && (
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Models & Vector Database</h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Temperature ({temperature})</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.1" 
                      value={temperature} 
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-primary" 
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0.0 (Precise)</span>
                      <span>1.0 (Creative)</span>
                    </div>
                  </div>
                  <hr />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vector DB Namespace</label>
                    <input 
                      type="text" 
                      className="w-full border rounded-md p-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none" 
                      defaultValue="verifund-prod-v1" 
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <div className="mb-3 p-4 bg-gray-50 rounded-full border">
                  <Bell className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-sm">This section is currently under development.</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
