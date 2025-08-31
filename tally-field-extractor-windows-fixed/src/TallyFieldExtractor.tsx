import React, { useState, useEffect } from 'react';
import { Building2, Server, Database, AlertCircle, CheckCircle, Loader2, FileText, Package } from 'lucide-react';
import CompanyApiService, { TallyCompany } from './services/api/company/companyApiService';

interface FieldInfo {
  name: string;
  type: string;
  description: string;
  example?: string;
}

interface TallyFieldExtractorProps {
  defaultServerUrl?: string;
}

const TallyFieldExtractor: React.FC<TallyFieldExtractorProps> = ({ 
  defaultServerUrl = 'localhost:9000' 
}) => {
  const [serverUrl, setServerUrl] = useState(defaultServerUrl);
  const [customServer, setCustomServer] = useState('');
  const [useCustomServer, setUseCustomServer] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [companies, setCompanies] = useState<TallyCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [currentView, setCurrentView] = useState<'connection' | 'company' | 'fields'>('connection');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [salesVoucherFields, setSalesVoucherFields] = useState<FieldInfo[]>([]);
  const [stockItemFields, setStockItemFields] = useState<FieldInfo[]>([]);

  const companyApi = new CompanyApiService();

  // Predefined field structures based on Tally XML API
  const salesVoucherFieldsList: FieldInfo[] = [
    { name: 'GUID', type: 'String', description: 'Unique identifier for the voucher' },
    { name: 'VOUCHERNUMBER', type: 'String', description: 'Invoice/voucher number' },
    { name: 'DATE', type: 'Date', description: 'Transaction date' },
    { name: 'VOUCHERTYPE', type: 'String', description: 'Type of voucher (Sales, Purchase, etc.)' },
    { name: 'PARTYLEDGERNAME', type: 'String', description: 'Customer/party name' },
    { name: 'PARTYADDRESS', type: 'String', description: 'Customer address' },
    { name: 'AMOUNT', type: 'Number', description: 'Total voucher amount' },
    { name: 'BASICBUYERNAME', type: 'String', description: 'Buyer name' },
    { name: 'BASICSELLERADDRESS', type: 'String', description: 'Seller address' },
    { name: 'REFERENCE', type: 'String', description: 'Reference number or description' },
    { name: 'NARRATION', type: 'String', description: 'Transaction narration/description' },
    { name: 'PERSISTEDVIEW', type: 'String', description: 'View type (Invoice view, etc.)' },
    { name: 'VCHGSTCLASS', type: 'String', description: 'GST classification' },
    { name: 'DIFFACTUALQTY', type: 'Number', description: 'Quantity difference' },
    { name: 'ISMSTFROMSYNC', type: 'Boolean', description: 'Sync status indicator' },
    { name: 'ASORIGINAL', type: 'Boolean', description: 'Original status flag' },
    { name: 'AUDITED', type: 'Boolean', description: 'Audit status' },
    { name: 'FORJOBCOSTING', type: 'Boolean', description: 'Job costing flag' },
    { name: 'ISOPTIONAL', type: 'Boolean', description: 'Optional voucher flag' },
    { name: 'EFFECTIVEDATE', type: 'Date', description: 'Effective date of transaction' },
    { name: 'USEFORINTEREST', type: 'Boolean', description: 'Interest calculation flag' },
    { name: 'USEFORGAINLOSS', type: 'Boolean', description: 'Gain/loss calculation flag' },
    { name: 'USEFORGODOWNTRANSFER', type: 'Boolean', description: 'Godown transfer flag' },
    { name: 'USEFORCOMPOUND', type: 'Boolean', description: 'Compound entry flag' },
    { name: 'USEFORSERVICETAX', type: 'Boolean', description: 'Service tax flag' },
    { name: 'ISREVERSECHARGE', type: 'Boolean', description: 'Reverse charge applicability' },
    { name: 'ISINVOICE', type: 'Boolean', description: 'Invoice type indicator' },
    { name: 'MSTTYPE', type: 'String', description: 'Master type' },
    { name: 'ISDELETED', type: 'Boolean', description: 'Deletion status' },
    { name: 'ASORIGINAL', type: 'Boolean', description: 'Original voucher flag' },
    // Ledger Entry Fields
    { name: 'LEDGERNAME', type: 'String', description: 'Ledger account name' },
    { name: 'ISDEEMEDPOSITIVE', type: 'Boolean', description: 'Positive amount indicator' },
    { name: 'LEDGERFROMITEM', type: 'Boolean', description: 'Ledger from item flag' },
    { name: 'REMOVEZEROENTRIES', type: 'Boolean', description: 'Remove zero entries flag' },
    { name: 'ISPARTYLEDGER', type: 'Boolean', description: 'Party ledger indicator' },
    // Inventory Entry Fields
    { name: 'STOCKITEMNAME', type: 'String', description: 'Stock item name' },
    { name: 'ISDEEMEDPOSITIVE', type: 'Boolean', description: 'Positive quantity indicator' },
    { name: 'ISLASTDEEMEDPOSITIVE', type: 'Boolean', description: 'Last positive quantity indicator' },
    { name: 'ISAUTONEGATE', type: 'Boolean', description: 'Auto negate flag' },
    { name: 'ISCUSTOMSCLEARANCE', type: 'Boolean', description: 'Customs clearance flag' },
    { name: 'ISTRACKCOMPONENT', type: 'Boolean', description: 'Track component flag' },
    { name: 'ISTRACKPRODUCTION', type: 'Boolean', description: 'Track production flag' },
    { name: 'ISPRIMARYITEM', type: 'Boolean', description: 'Primary item flag' },
    { name: 'ISSCRAP', type: 'Boolean', description: 'Scrap item flag' },
    { name: 'RATE', type: 'Number', description: 'Item rate/price' },
    { name: 'AMOUNT', type: 'Number', description: 'Item amount' },
    { name: 'ACTUALQTY', type: 'Number', description: 'Actual quantity' },
    { name: 'BILLEDQTY', type: 'Number', description: 'Billed quantity' },
    { name: 'GODOWNNAME', type: 'String', description: 'Godown/warehouse name' },
    { name: 'REJECTEDQTY', type: 'Number', description: 'Rejected quantity' },
    { name: 'DISCOUNT', type: 'Number', description: 'Discount amount' },
    { name: 'ASSESSABLEVALUE', type: 'Number', description: 'Assessable value for tax' },
    // GST Fields
    { name: 'GSTHSNCODE', type: 'String', description: 'GST HSN code' },
    { name: 'GSTHSNNAME', type: 'String', description: 'GST HSN description' },
    { name: 'GSTRATE', type: 'Number', description: 'GST rate percentage' },
    { name: 'CGSTRATE', type: 'Number', description: 'CGST rate percentage' },
    { name: 'SGSTRATE', type: 'Number', description: 'SGST rate percentage' },
    { name: 'IGSTRATE', type: 'Number', description: 'IGST rate percentage' },
    { name: 'GSTREGISTRATIONTYPE', type: 'String', description: 'GST registration type' },
  ];

  const stockItemFieldsList: FieldInfo[] = [
    { name: 'GUID', type: 'String', description: 'Unique identifier for stock item' },
    { name: 'NAME', type: 'String', description: 'Stock item name' },
    { name: 'ALIAS', type: 'String', description: 'Alternative name/alias' },
    { name: 'PARENT', type: 'String', description: 'Parent group name' },
    { name: 'CATEGORY', type: 'String', description: 'Item category' },
    { name: 'TAXCLASSIFICATIONNAME', type: 'String', description: 'Tax classification' },
    { name: 'TAXTYPE', type: 'String', description: 'Tax type' },
    { name: 'GSTAPPLICABLE', type: 'String', description: 'GST applicability' },
    { name: 'GSTTYPEOFSUPPLY', type: 'String', description: 'GST type of supply' },
    { name: 'GSTINWARD', type: 'String', description: 'GST inward supply type' },
    { name: 'VATAPPLICABLE', type: 'String', description: 'VAT applicability' },
    { name: 'EXCISEAPPLICABLE', type: 'String', description: 'Excise applicability' },
    { name: 'SERVICETAXAPPLICABLE', type: 'String', description: 'Service tax applicability' },
    { name: 'ISCOSTCENTRESON', type: 'Boolean', description: 'Cost centre allocation flag' },
    { name: 'ISBATCHWISEON', type: 'Boolean', description: 'Batch-wise tracking flag' },
    { name: 'ISPERISHABLEON', type: 'Boolean', description: 'Perishable item flag' },
    { name: 'ISENTRYTAXAPPLICABLE', type: 'Boolean', description: 'Entry tax applicability' },
    { name: 'ISCOSTTRACKINGON', type: 'Boolean', description: 'Cost tracking flag' },
    { name: 'ISUPDATINGTARGETID', type: 'Boolean', description: 'Target ID update flag' },
    { name: 'ASORIGINAL', type: 'Boolean', description: 'Original item flag' },
    { name: 'IGNOREPHYSICALDIFFERENCE', type: 'Boolean', description: 'Ignore physical difference flag' },
    { name: 'IGNORENEGATIVESTOCK', type: 'Boolean', description: 'Ignore negative stock flag' },
    { name: 'TREATSALESASMANUFACTURED', type: 'Boolean', description: 'Treat sales as manufactured flag' },
    { name: 'TREATPURCHASEASCONSUMED', type: 'Boolean', description: 'Treat purchase as consumed flag' },
    { name: 'TREATREJECTSASSCRAP', type: 'Boolean', description: 'Treat rejects as scrap flag' },
    { name: 'HASMFGDATE', type: 'Boolean', description: 'Has manufacturing date flag' },
    { name: 'ALLOWUSEOFEXPIREDITEMS', type: 'Boolean', description: 'Allow expired items flag' },
    { name: 'IGNOREBATCHES', type: 'Boolean', description: 'Ignore batches flag' },
    { name: 'IGNOREGODOWNS', type: 'Boolean', description: 'Ignore godowns flag' },
    { name: 'CALCONMRP', type: 'Boolean', description: 'Calculate on MRP flag' },
    { name: 'EXCLUDEJRNLFORVALUATION', type: 'Boolean', description: 'Exclude journal for valuation flag' },
    { name: 'ISMRPINCLOFTAX', type: 'Boolean', description: 'MRP inclusive of tax flag' },
    { name: 'ISADDLCOSTEXCLUDED', type: 'Boolean', description: 'Additional cost excluded flag' },
    { name: 'ISUPDATINGSTOCK', type: 'Boolean', description: 'Updating stock flag' },
    { name: 'STOCKUOM', type: 'String', description: 'Stock unit of measurement' },
    { name: 'PURCHASEUOM', type: 'String', description: 'Purchase unit of measurement' },
    { name: 'SALESUOM', type: 'String', description: 'Sales unit of measurement' },
    { name: 'BASICSALESPRICEINCLUDING', type: 'String', description: 'Sales price including taxes' },
    { name: 'BASICSALESPRICE', type: 'Number', description: 'Basic sales price' },
    { name: 'SALESPRICE', type: 'Number', description: 'Sales price' },
    { name: 'MRP', type: 'Number', description: 'Maximum retail price' },
    { name: 'MINSELLINGPRICE', type: 'Number', description: 'Minimum selling price' },
    { name: 'PURCHASEPRICE', type: 'Number', description: 'Purchase price' },
    { name: 'COSTINGMETHOD', type: 'String', description: 'Costing method (FIFO, LIFO, Average)' },
    { name: 'VALUATIONMETHOD', type: 'String', description: 'Valuation method' },
    { name: 'REORDERBASE', type: 'String', description: 'Reorder base' },
    { name: 'MINIMUM', type: 'Number', description: 'Minimum stock level' },
    { name: 'MAXIMUM', type: 'Number', description: 'Maximum stock level' },
    { name: 'REORDER', type: 'Number', description: 'Reorder level' },
    { name: 'STANDARDCOST', type: 'Number', description: 'Standard cost' },
    { name: 'STANDARDPRICE', type: 'Number', description: 'Standard price' },
    { name: 'RATEPERUNIT', type: 'Number', description: 'Rate per unit' },
    { name: 'DISCOUNTPERCENTAGE', type: 'Number', description: 'Default discount percentage' },
    { name: 'CANNOTEDIT', type: 'Boolean', description: 'Cannot edit flag' },
    { name: 'CANNOTDELETE', type: 'Boolean', description: 'Cannot delete flag' },
    { name: 'CANNOTPRINT', type: 'Boolean', description: 'Cannot print flag' },
    { name: 'OPENINGBALANCE', type: 'Number', description: 'Opening balance quantity' },
    { name: 'OPENINGVALUE', type: 'Number', description: 'Opening balance value' },
    { name: 'OPENINGRATE', type: 'Number', description: 'Opening rate' },
    // GST Related Fields for Stock Items
    { name: 'GSTHSNCODE', type: 'String', description: 'GST HSN/SAC code' },
    { name: 'GSTREPEXCLUDED', type: 'Boolean', description: 'GST report excluded flag' },
    { name: 'VATDETAILSLIST', type: 'Object', description: 'VAT details list' },
    { name: 'GSTDETAILSLIST', type: 'Object', description: 'GST details list' },
    { name: 'LANGUAGENAME.LIST', type: 'Array', description: 'Multi-language names' },
    { name: 'COMPONENTLIST', type: 'Array', description: 'Component list for manufactured items' },
    { name: 'GODOWNDETAILS', type: 'Array', description: 'Godown-wise stock details' },
    { name: 'BATCHDETAILS', type: 'Array', description: 'Batch-wise details' },
    { name: 'LEDGERENTRIESLIST', type: 'Array', description: 'Related ledger entries' },
    { name: 'PRICEDETAILS', type: 'Array', description: 'Price level details' },
    { name: 'DISCOUNTDETAILS', type: 'Array', description: 'Discount details' },
  ];

  const getCurrentServerUrl = () => {
    return useCustomServer ? customServer : serverUrl;
  };

  const testConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      setConnectionStatus('connecting');
      
      const currentServer = getCurrentServerUrl();
      companyApi.setBaseURL(`http://${currentServer}`);
      
      const companyList = await companyApi.getCompanyList();
      setCompanies(companyList);
      setConnectionStatus('connected');
      
      if (companyList.length === 0) {
        setError('No companies found. Please ensure Tally is running and has company data.');
      } else {
        setCurrentView('company');
      }
    } catch (err) {
      setConnectionStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to connect to Tally server');
    } finally {
      setLoading(false);
    }
  };

  const selectCompany = (companyName: string) => {
    setSelectedCompany(companyName);
    setSalesVoucherFields(salesVoucherFieldsList);
    setStockItemFields(stockItemFieldsList);
    setCurrentView('fields');
  };

  const resetConnection = () => {
    setCurrentView('connection');
    setConnectionStatus('idle');
    setCompanies([]);
    setSelectedCompany('');
    setError(null);
    setSalesVoucherFields([]);
    setStockItemFields([]);
  };

  const renderConnectionView = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 bg-blue-100 rounded-xl">
              <Server className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tally Field Extractor</h1>
          <p className="text-gray-600">Connect to your Tally server to extract field information</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-4">
              Select Tally Server
            </label>
            
            <div className="space-y-4">
              <div 
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  !useCustomServer ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => setUseCustomServer(false)}
              >
                <div className="flex items-center">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Default Server</h3>
                    <p className="text-sm text-gray-500">{defaultServerUrl}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    !useCustomServer ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}>
                    {!useCustomServer && <div className="w-full h-full rounded-full bg-white scale-50" />}
                  </div>
                </div>
              </div>

              <div 
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  useCustomServer ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => setUseCustomServer(true)}
              >
                <div className="flex items-center mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Custom Server</h3>
                    <p className="text-sm text-gray-500">Enter custom IP address or hostname</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    useCustomServer ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}>
                    {useCustomServer && <div className="w-full h-full rounded-full bg-white scale-50" />}
                  </div>
                </div>
                {useCustomServer && (
                  <input
                    type="text"
                    placeholder="e.g., 192.168.1.100:9000 or 34.133.208.212:9000"
                    value={customServer}
                    onChange={(e) => setCustomServer(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex-1 flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-300'
              }`} />
              <span className="text-sm text-gray-600">
                {connectionStatus === 'connected' ? 'Connected' :
                 connectionStatus === 'connecting' ? 'Connecting...' :
                 connectionStatus === 'error' ? 'Connection Failed' : 'Not Connected'}
              </span>
            </div>
            
            <button
              onClick={testConnection}
              disabled={loading || (useCustomServer && !customServer.trim())}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Database className="h-4 w-4" />
                  <span>Test Connection</span>
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-red-800">Connection Error</h3>
                <p className="text-sm text-red-700 mt-1 whitespace-pre-line">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderCompanyView = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 bg-green-100 rounded-xl">
              <Building2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Select Company</h1>
          <p className="text-gray-600">Choose a company to extract field information</p>
        </div>

        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-semibold text-green-800">Connected to Server</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-green-700">{getCurrentServerUrl()}</span>
              <button
                onClick={resetConnection}
                className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                Change
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-4">
            Available Companies ({companies.length})
          </label>
          
          {companies.map((company, index) => (
            <div
              key={index}
              onClick={() => selectCompany(company.name)}
              className="p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{company.name}</h3>
                  {company.startFrom && company.endTo && (
                    <p className="text-sm text-gray-500 mt-1">
                      Financial Year: {company.startFrom} to {company.endTo}
                    </p>
                  )}
                </div>
                <div className="text-blue-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={resetConnection}
          className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
        >
          ← Back to Server Connection
        </button>
      </div>
    </div>
  );

  const renderFieldsView = () => (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4 space-x-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <Package className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tally Fields</h1>
          <p className="text-gray-600">Available fields for <strong>{selectedCompany}</strong></p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sales Voucher Fields */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Sales Voucher Fields</h2>
                <p className="text-sm text-gray-600">{salesVoucherFields.length} fields available</p>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-xl p-4 max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {salesVoucherFields.map((field, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm">{field.name}</h3>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {field.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{field.description}</p>
                    {field.example && (
                      <p className="text-xs text-blue-600 mt-1 italic">Example: {field.example}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stock Item Fields */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Stock Item Fields</h2>
                <p className="text-sm text-gray-600">{stockItemFields.length} fields available</p>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-xl p-4 max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {stockItemFields.map((field, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm">{field.name}</h3>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        {field.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{field.description}</p>
                    {field.example && (
                      <p className="text-xs text-green-600 mt-1 italic">Example: {field.example}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => setCurrentView('company')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <span>← Back to Companies</span>
          </button>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Connected to {getCurrentServerUrl()}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      {currentView === 'connection' && renderConnectionView()}
      {currentView === 'company' && renderCompanyView()}
      {currentView === 'fields' && renderFieldsView()}
    </div>
  );
};

export default TallyFieldExtractor;