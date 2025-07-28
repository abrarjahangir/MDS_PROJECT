
import React, { useState, useEffect } from 'react';
import { Calendar, User, Package, Trash2, Download, Share as ShareIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { TokenData } from '@/types/token';
import { getHistoryData, deleteTokenData, exportToCSV, exportToExcel, generatePDF } from '@/utils/tokenUtils';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { generatePDFPreview } from '@/utils/tokenUtils';

const HistoryView = () => {
  const [history, setHistory] = useState<TokenData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const data = getHistoryData();
    // Only show completed reports (those with percentage and element)
    const completedReports = data.filter(item => item.percentage && item.element);
    setHistory(completedReports.sort((a, b) => b.timestamp - a.timestamp));
  }, []);

  const filteredHistory = history.filter(item =>
    item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.tokenNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.itemDescription.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (tokenId: string) => {
    try {
      deleteTokenData(tokenId);
      const updatedData = getHistoryData();
      // Only show completed reports (those with percentage and element)
      const completedReports = updatedData.filter(item => item.percentage && item.element);
      setHistory(completedReports.sort((a, b) => b.timestamp - a.timestamp));
      toast({
        title: "Token Deleted",
        description: "Token has been successfully deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete token",
        variant: "destructive"
      });
    }
  };

  const handleExportCSV = () => {
    try {
      exportToCSV(history);
      toast({
        title: "Export Successful",
        description: "History exported as CSV file",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export history as CSV",
        variant: "destructive"
      });
    }
  };

  const handleExportExcel = () => {
    try {
      exportToExcel(history);
      toast({
        title: "Export Successful",
        description: "History exported as Excel file",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export history as Excel",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg border-2 border-amber-300">
      <div className="bg-white p-4 rounded-lg border border-amber-200">
        <Label htmlFor="search" className="text-amber-800 font-semibold">Search History</Label>
        <Input
          id="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by customer name, token number, or item..."
          className="border-amber-300 focus:border-amber-500 mt-2"
        />
      </div>

      <div className="flex gap-2">
        <Button
          onClick={async () => {
            try {
              await exportToCSV(history, true);
              toast({
                title: "Export Successful",
                description: "History exported as CSV file (or ready to share)",
              });
            } catch (error) {
              toast({
                title: "Export Failed",
                description: "Failed to export history as CSV",
                variant: "destructive"
              });
            }
          }}
          variant="outline"
          className="border-amber-300 text-amber-700 hover:bg-amber-50"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
        <Button
          onClick={async () => {
            try {
              await exportToExcel(history, true);
              toast({
                title: "Export Successful",
                description: "History exported as Excel file (or ready to share)",
              });
            } catch (error) {
              toast({
                title: "Export Failed",
                description: "Failed to export history as Excel",
                variant: "destructive"
              });
            }
          }}
          variant="outline"
          className="border-amber-300 text-amber-700 hover:bg-amber-50"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Excel
        </Button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-amber-200">
            {searchTerm ? 'No matching records found.' : 'No history available.'}
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div key={`${item.tokenNumber}-${item.timestamp}`} className="p-4 bg-white rounded-lg border border-amber-200 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-lg text-amber-800">{item.tokenNumber}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{item.date}</span>
                </div>
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3 text-amber-600" />
                  <span className="text-gray-700">{item.customerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="w-3 h-3 text-amber-600" />
                  <span className="text-gray-700">{item.itemDescription}</span>
                </div>
                {item.phoneNumber && (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 text-amber-600">📞</span>
                    <span className="text-gray-700">{item.phoneNumber}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-amber-600" />
                  <span className="text-gray-700">{item.time}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-col">
                <Button
                  onClick={() => handleDelete(item.id)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50 w-full"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
                <Button
                  onClick={async () => {
                    const url = await generatePDFPreview(item, item.percentage && item.element ? 'bill' : 'token', false);
                    setPreviewUrl(url);
                    setShowPreview(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="text-amber-600 border-amber-200 hover:bg-amber-50 mt-1 w-full"
                >
                  Preview
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      const blob = await generatePDF(item, item.percentage && item.element ? 'bill' : 'token', true, false);
                      if (blob instanceof Blob) {
                        const filename = `${item.percentage && item.element ? 'Bill' : 'Token'}_${item.tokenNumber}_${item.date.replace(/\//g, '')}.pdf`;
                        
                        // Universal share logic
                        if (navigator.share && navigator.canShare) {
                          const file = new File([blob], filename, { type: 'application/pdf' });
                          if (navigator.canShare({ files: [file] })) {
                            await navigator.share({
                              files: [file],
                              title: item.percentage && item.element ? 'Test Report' : 'Token',
                              text: `Here is your ${item.percentage && item.element ? 'test report' : 'token'} PDF.`
                            });
                            return;
                          }
                        }
                        
                        if (Capacitor.getPlatform() === 'android') {
                          // Convert blob to base64
                          const arrayBuffer = await blob.arrayBuffer();
                          const uint8Array = new Uint8Array(arrayBuffer);
                          let binary = '';
                          for (let i = 0; i < uint8Array.byteLength; i++) {
                            binary += String.fromCharCode(uint8Array[i]);
                          }
                          const base64 = btoa(binary);
                          await Filesystem.writeFile({
                            path: `Download/${filename}`,
                            data: base64,
                            directory: Directory.External,
                            recursive: true
                          });
                          // Get a content URI for the file
                          const fileUriResult = await Filesystem.getUri({
                            path: `Download/${filename}`,
                            directory: Directory.External,
                          });
                          const contentUri = fileUriResult.uri;
                          await Share.share({
                            title: item.percentage && item.element ? 'Test Report' : 'Token',
                            text: `Here is your ${item.percentage && item.element ? 'test report' : 'token'} PDF.`,
                            url: contentUri,
                            dialogTitle: `Share ${item.percentage && item.element ? 'Test Report' : 'Token'}`
                          });
                          return;
                        }
                        toast({ title: "Sharing not supported", description: "Your device or browser does not support file sharing." });
                      }
                    } catch (e) {
                      toast({ title: "Error", description: "Failed to share PDF", variant: "destructive" });
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-200 hover:bg-blue-50 mt-1 w-full"
                >
                  <ShareIcon className="w-3 h-3 mr-1" />
                  Share
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
      {showPreview && previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-2 border-b">
              <span className="font-bold">PDF Preview</span>
              <button onClick={() => { setShowPreview(false); URL.revokeObjectURL(previewUrl); }} className="text-lg font-bold">&times;</button>
            </div>
            <div className="flex-1 overflow-auto">
              <Worker workerUrl={pdfWorker}>
                <Viewer fileUrl={previewUrl} />
              </Worker>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryView;
