import React, { useState } from 'react';
import { Copy, Printer, Check, Receipt } from 'lucide-react';

interface SplitReportProps {
  merchantName: string;
  date: string;
  user1Total: number;
  user2Total: number;
  grandTotal: number;
}

export const SplitReport: React.FC<SplitReportProps> = ({
  merchantName,
  date,
  user1Total,
  user2Total,
  grandTotal,
}) => {
  const [copied, setCopied] = useState(false);

  // Formatting date to Japanese format if it is valid
  const formattedDate = date 
    ? new Date(date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : '未設定';

  const reportText = `【精算レポート】
■ 日付: ${formattedDate}
■ 店舗名: ${merchantName || '未記入'}
---------------------------------
■ 私の負担額: ¥${Math.round(user1Total).toLocaleString()}
■ 相手の負担額: ¥${Math.round(user2Total).toLocaleString()}
---------------------------------
■ 合計金額: ¥${Math.round(grandTotal).toLocaleString()}

いつも精算に協力してくれてありがとう！`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200/80 space-y-6 max-w-md mx-auto print:shadow-none print:border-none print:p-0">
      {/* Print styles to hide non-report components and style the printout */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-report, .printable-report * {
            visibility: visible;
          }
          .printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            border: none;
            box-shadow: none;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="printable-report space-y-4">
        {/* Header */}
        <div className="text-center pb-4 border-b border-dashed border-slate-300">
          <div className="inline-flex p-2 bg-emerald-50 rounded-full mb-2 no-print">
            <Receipt className="w-6 h-6 text-emerald-600 animate-bounce" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">精算レポート</h2>
          <p className="text-xs text-slate-400 mt-1">Split Bill Summary Report</p>
        </div>

        {/* Paper Receipt Visual */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 font-mono text-sm text-slate-700 relative overflow-hidden space-y-3">
          {/* Top Zig-Zag pattern look using shadow/dots or simple layout */}
          <div className="flex justify-between text-xs text-slate-400 border-b border-slate-200 pb-2 mb-2">
            <span>RECEIPT SUMMARY</span>
            <span>{new Date().toLocaleDateString('ja-JP')}</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">日付 / Date:</span>
              <span className="font-semibold text-slate-800">{formattedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">店舗名 / Store:</span>
              <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                {merchantName || '未設定'}
              </span>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-300 my-3"></div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-indigo-700 bg-indigo-50/50 p-2 rounded-lg">
              <span className="font-medium text-xs">私の負担 / My Share:</span>
              <span className="font-extrabold text-base">
                ¥{Math.round(user1Total).toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center text-rose-700 bg-rose-50/50 p-2 rounded-lg">
              <span className="font-medium text-xs">相手の負担 / Partner's Share:</span>
              <span className="font-extrabold text-base">
                ¥{Math.round(user2Total).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-300 my-3"></div>

          <div className="flex justify-between items-center text-slate-800 pt-1">
            <span className="font-bold text-sm">合計 / Total:</span>
            <span className="font-black text-lg text-emerald-600">
              ¥{Math.round(grandTotal).toLocaleString()}
            </span>
          </div>

          {/* Receipt bottom cut pattern */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 flex overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <div 
                key={i} 
                className="w-4 h-4 bg-white rotate-45 transform origin-top-left -mt-2 border-r border-b border-transparent"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="space-y-2 no-print">
        <button
          onClick={handleCopy}
          className={`w-full flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-xl transition-all shadow-sm ${
            copied
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-5 h-5 -ml-1 animate-pulse" />
              コピーしました！
            </>
          ) : (
            <>
              <Copy className="w-5 h-5 -ml-1" />
              レポートをコピー (LINE用)
            </>
          )}
        </button>

        <button
          onClick={handlePrint}
          className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-3 px-4 rounded-xl shadow-sm transition-all"
        >
          <Printer className="w-5 h-5 -ml-1 text-slate-500" />
          レポートを印刷 (Print)
        </button>
      </div>
    </div>
  );
};
