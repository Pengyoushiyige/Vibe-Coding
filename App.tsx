import React, { useState, useRef, useEffect, useMemo } from 'react';
import { analyzeReceiptStream } from './services/geminiService';
import { BillItem, Payer } from './types';
import { LoadingOverlay } from './components/LoadingOverlay';
import { PayerToggle } from './components/PayerToggle';
import { ResultsSummary } from './components/ResultsSummary';
import { SplitReport } from './components/SplitReport';
import { 
  ReceiptIcon, 
  PlusIcon, 
  TrashIcon, 
  CameraIcon,
  RefreshIcon,
  CheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from './components/Icons';

enum Step {
  Upload = 'UPLOAD',
  Review = 'REVIEW',
  Split = 'SPLIT',
  Report = 'REPORT'
}

export default function App() {
  const [step, setStep] = useState<Step>(Step.Upload);
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [items, setItems] = useState<BillItem[]>([]);
  const [merchantName, setMerchantName] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculations = useMemo(() => {
    let user1Total = 0;
    let user2Total = 0;
    let grandTotal = 0;

    items.forEach(item => {
      const price = item.price || 0;
      const taxRate = item.taxRate || 0.10;
      const priceWithTax = price * (1 + taxRate);

      grandTotal += priceWithTax;

      if (item.payer === Payer.User1) {
        user1Total += priceWithTax;
      } else if (item.payer === Payer.User2) {
        user2Total += priceWithTax;
      } else {
        user1Total += priceWithTax / 2;
        user2Total += priceWithTax / 2;
      }
    });

    return { user1Total, user2Total, grandTotal };
  }, [items]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (step !== Step.Upload || isAnalyzing) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleFile(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [step, isAnalyzing]);

  const handleFile = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      processImage(selectedFile, reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('image/')) {
        handleFile(droppedFile);
      }
    }
  };

  const processImage = async (file: File, base64Url: string) => {
    setIsAnalyzing(true);
    setStep(Step.Review);
    setItems([]);
    setMerchantName('');
    setDate('');
    setError(null);

    try {
      const parts = base64Url.split(',');
      const base64Data = parts[1];
      
      let mimeType = file.type;
      if (!mimeType && parts[0].startsWith('data:')) {
        const mimeMatch = parts[0].match(/:(.*?);/);
        if (mimeMatch) mimeType = mimeMatch[1];
      }
      if (!mimeType) mimeType = 'image/jpeg';

      const stream = analyzeReceiptStream(base64Data, mimeType);
      
      for await (const chunk of stream) {
        if (chunk.merchantName) setMerchantName(chunk.merchantName);
        if (chunk.date) setDate(chunk.date);
        
        setItems(prevItems => {
          return chunk.items.map((item, index) => {
            if (index < prevItems.length) {
              return { ...prevItems[index], name: item.name, price: item.price, taxRate: item.taxRate };
            } else {
              return {
                id: `item-${Date.now()}-${index}`,
                name: item.name,
                price: item.price,
                taxRate: item.taxRate || 0.10,
                payer: Payer.Split
              };
            }
          });
        });
      }
    } catch (err) {
      setError("Failed to analyze receipt. Please try again or enter items manually.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateItem = (id: string, field: keyof BillItem, value: any) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const addItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        name: "New Item",
        price: 0,
        taxRate: 0.10,
        payer: Payer.Split
      }
    ]);
  };

  const reset = () => {
    setFile(null);
    setImagePreview(null);
    setItems([]);
    setMerchantName('');
    setDate('');
    setError(null);
    setStep(Step.Upload);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm no-print">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <ReceiptIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              FairShare
            </h1>
          </div>
          {step !== Step.Upload && (
             <button 
               onClick={reset}
               className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
             >
               <RefreshIcon className="w-4 h-4" />
               Start Over
             </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        
        {/* Step 1: Upload */}
        {step === Step.Upload && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-slate-800">Split bills effortlessly</h2>
              <p className="text-slate-500 max-w-md mx-auto">
                Upload a receipt to extract items. <br/>
                Auto-calculates 8% (food) and 10% tax.
              </p>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`group relative w-full max-w-md aspect-[4/3] rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center bg-white shadow-sm hover:shadow-md ${
                isDragging 
                  ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' 
                  : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50'
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className={`p-6 rounded-full transition-colors mb-4 ${
                isDragging ? 'bg-indigo-200' : 'bg-indigo-50 group-hover:bg-indigo-100'
              }`}>
                <CameraIcon className={`w-10 h-10 transition-transform ${isDragging ? 'scale-110 text-indigo-700' : 'text-indigo-600'}`} />
              </div>
              <p className={`font-semibold transition-colors ${isDragging ? 'text-indigo-700' : 'text-slate-700'}`}>
                {isDragging ? 'Drop to upload' : 'Tap, paste (Ctrl+V) or drag receipt'}
              </p>
              <p className="text-sm text-slate-400 mt-1">Supports JPG, PNG</p>
            </div>
          </div>
        )}

        {/* Step 2 & 3: Review & Split */}
        {step !== Step.Upload && step !== Step.Report && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column: Editor */}
            <div className="space-y-6 order-2 md:order-1">
              
              {/* Progress Indicator */}
              <div className="flex items-center space-x-2 text-sm font-medium text-slate-500 mb-4 bg-white p-2 rounded-lg shadow-sm border border-slate-100 w-fit">
                <button 
                  onClick={() => setStep(Step.Review)}
                  className={`px-2 py-1 rounded-md transition-colors ${step === Step.Review ? 'bg-indigo-100 text-indigo-700 cursor-default' : 'hover:bg-slate-50 text-slate-600'}`}
                >
                  1. Check Details
                </button>
                <ArrowRightIcon className="w-4 h-4 text-slate-300" />
                <button
                  onClick={() => setStep(Step.Split)}
                  className={`px-2 py-1 rounded-md transition-colors ${step === Step.Split ? 'bg-indigo-100 text-indigo-700 cursor-default' : 'hover:bg-slate-50 text-slate-600'}`}
                >
                  2. Split Bill
                </button>
                <ArrowRightIcon className="w-4 h-4 text-slate-300" />
                <button
                  onClick={() => setStep(Step.Report)}
                  className="px-2 py-1 rounded-md transition-colors hover:bg-slate-50 text-slate-600"
                >
                  3. Report
                </button>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">
                  {step === Step.Review ? 'Review Items & Tax' : 'Assign Payers'}
                </h3>
                {step === Step.Review && (
                   <button 
                   onClick={addItem}
                   className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-full"
                 >
                   <PlusIcon className="w-4 h-4" />
                   Add Item
                 </button>
                )}
              </div>

              {/* Receipt Details Editor Card */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60 space-y-3 no-print">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <ReceiptIcon className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-bold text-slate-700">Receipt Details / 領収書情報</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Store / スーパー名</label>
                    <input 
                      type="text"
                      value={merchantName}
                      onChange={(e) => setMerchantName(e.target.value)}
                      placeholder="e.g. イオン, セブン"
                      className="w-full text-sm font-medium text-slate-800 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Date / 日付</label>
                    <input 
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full text-sm font-medium text-slate-800 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div 
                    key={item.id} 
                    className={`bg-white rounded-xl p-4 shadow-sm border transition-all animate-in slide-in-from-bottom-2 fade-in duration-300 ${step === Step.Split ? 'border-slate-200' : 'border-indigo-100 ring-1 ring-indigo-50'}`}
                  >
                    {/* Row 1: Name and Price */}
                    <div className="flex gap-3 mb-3 items-start">
                      <div className="flex-1">
                        {step === Step.Review ? (
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                            className="w-full font-medium text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 focus:outline-none pb-1"
                            placeholder="Item name"
                          />
                        ) : (
                          <span className="font-medium text-slate-900 block py-1">{item.name}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                         {/* Price Input */}
                         <div className="flex items-center">
                            <span className="text-slate-400 text-sm mr-1">¥</span>
                            {step === Step.Review ? (
                              <input
                                type="number"
                                value={item.price}
                                onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                className="w-20 text-right font-bold text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 focus:outline-none pb-1"
                                placeholder="0"
                                step="1"
                              />
                            ) : (
                              <span className="font-bold text-slate-900 w-20 text-right">{item.price}</span>
                            )}
                          </div>

                          {/* Delete Button (Review only) */}
                          {step === Step.Review && (
                            <button 
                              onClick={() => deleteItem(item.id)}
                              className="text-slate-300 hover:text-red-500 p-1"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                      </div>
                    </div>

                    {/* Row 2: Tax (Review) or Payer (Split) */}
                    <div className="flex items-center justify-between border-t border-slate-50 pt-2 mt-2">
                      <div className="flex items-center gap-2">
                        {step === Step.Review ? (
                           // Tax Selector
                           <div className="flex items-center bg-slate-100 rounded-md p-0.5">
                             <button
                               onClick={() => updateItem(item.id, 'taxRate', 0.08)}
                               className={`px-2 py-1 text-xs font-semibold rounded ${item.taxRate === 0.08 ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}
                             >
                               8%
                             </button>
                             <button
                               onClick={() => updateItem(item.id, 'taxRate', 0.10)}
                               className={`px-2 py-1 text-xs font-semibold rounded ${item.taxRate === 0.10 ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400'}`}
                             >
                               10%
                             </button>
                           </div>
                        ) : (
                          // Tax Badge (ReadOnly)
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.taxRate === 0.08 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                            Tax {item.taxRate * 100}%
                          </span>
                        )}
                        
                        {step === Step.Review && (
                           <span className="text-xs text-slate-400">
                             Total: ¥{Math.round(item.price * (1 + item.taxRate))}
                           </span>
                        )}
                      </div>
                      
                      {step === Step.Split && (
                        <div className="flex-1 max-w-[200px] ml-auto">
                          <PayerToggle 
                            value={item.payer} 
                            onChange={(val) => updateItem(item.id, 'payer', val)} 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isAnalyzing && step === Step.Review && (
                  <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 border-dashed animate-pulse flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-medium text-indigo-600">Extracting items...</span>
                  </div>
                )}
              </div>
              
              {/* Bottom Actions */}
              <div className="sticky bottom-4 z-20">
                {step === Step.Review ? (
                  <button
                    onClick={() => setStep(Step.Split)}
                    disabled={isAnalyzing || items.length === 0}
                    className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                      isAnalyzing || items.length === 0 
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                    }`}
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Next: Assign Payers'}
                    {!isAnalyzing && <ArrowRightIcon className="w-5 h-5" />}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <ResultsSummary items={items} />
                    <button
                      onClick={() => setStep(Step.Report)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                    >
                      <span>精算レポートを作成する</span>
                      <ArrowRightIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setStep(Step.Review)}
                      className="w-full bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 font-semibold py-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 no-print"
                    >
                      <ArrowLeftIcon className="w-4 h-4" />
                      Back to Edit Items
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Image Reference */}
            <div className="order-1 md:order-2">
              <div className="md:sticky md:top-24 space-y-4">
                <div className="flex items-center justify-between">
                   <h3 className="text-lg font-bold text-slate-800 hidden md:block">Original Receipt</h3>
                   {step === Step.Split && (
                      <button 
                        onClick={() => setStep(Step.Review)}
                        className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
                      >
                         <ArrowLeftIcon className="w-3 h-3" />
                        Back to Edit
                      </button>
                   )}
                </div>
                
                {imagePreview && (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
                    <img 
                      src={imagePreview} 
                      alt="Receipt" 
                      className="w-full h-auto object-contain max-h-[400px] md:max-h-[80vh]"
                    />
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Step 4: Report view */}
        {step === Step.Report && (
          <div className="max-w-md mx-auto space-y-6 animate-in fade-in zoom-in duration-300 mt-4">
            {/* Progress Indicator for Report Page */}
            <div className="flex items-center space-x-2 text-sm font-medium text-slate-500 mb-6 bg-white p-2 rounded-lg shadow-sm border border-slate-100 w-fit mx-auto no-print">
              <button 
                onClick={() => setStep(Step.Review)}
                className="px-2 py-1 rounded-md transition-colors hover:bg-slate-50 text-slate-600"
              >
                1. Check Details
              </button>
              <ArrowRightIcon className="w-4 h-4 text-slate-300" />
              <button
                onClick={() => setStep(Step.Split)}
                className="px-2 py-1 rounded-md transition-colors hover:bg-slate-50 text-slate-600"
              >
                2. Split Bill
              </button>
              <ArrowRightIcon className="w-4 h-4 text-slate-300" />
              <button
                onClick={() => setStep(Step.Report)}
                className="px-2 py-1 rounded-md bg-indigo-100 text-indigo-700 font-semibold cursor-default"
              >
                3. Report
              </button>
            </div>

            <div className="text-center space-y-2 no-print">
              <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">
                お精算完了！
              </h2>
              <p className="text-slate-500 text-sm">
                精算レポートが完成しました。LINE等へのコピーや印刷が可能です。
              </p>
            </div>

            <div className="space-y-6">
              <ResultsSummary items={items} />

              <SplitReport 
                merchantName={merchantName}
                date={date}
                user1Total={calculations.user1Total}
                user2Total={calculations.user2Total}
                grandTotal={calculations.grandTotal}
              />

              <div className="flex gap-3 pt-2 no-print">
                <button
                  onClick={() => setStep(Step.Split)}
                  className="flex-1 bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 font-semibold py-3 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  戻って修正する
                </button>
                <button
                  onClick={reset}
                  className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <RefreshIcon className="w-4 h-4" />
                  新しく精算する
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {isAnalyzing && step === Step.Upload && <LoadingOverlay message="Preparing image..." />}
    </div>
  );
}