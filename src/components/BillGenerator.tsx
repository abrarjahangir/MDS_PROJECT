import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { TokenData } from '@/types/token';
import { convertToWords, generatePDF, generatePDFPreview, getTempTokenData, moveTokenToHistory, updateTokenData } from '@/utils/tokenUtils';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import { useEffect, useState } from 'react';
// @ts-ignore
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Helper to request storage permissions using Capacitor
async function requestStoragePermission() {
  if (Capacitor.getPlatform() === 'android') {
    try {
      const permResult = await Filesystem.requestPermissions();
      return permResult.publicStorage === 'granted';
    } catch (err) {
      return false;
    }
  }
  return true;
}

const BillGenerator = () => {
  const [todayTokens, setTodayTokens] = useState<TokenData[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenData | null>(null);
  const [billData, setBillData] = useState({
    percentage: '',
    element: '',
    remarks: ''
  });
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [maskedPrint, setMaskedPrint] = useState(false);

  useEffect(() => {
    const tempTokens = getTempTokenData();
    const today = new Date().toDateString();
    // Only include tokens from today
    const todayItems = tempTokens.filter(item => {
      const itemDate = new Date(item.timestamp).toDateString();
      return itemDate === today;
    });
    setTodayTokens(todayItems);
  }, []);

  const handleTokenSelect = (token: TokenData) => {
    setSelectedToken(token);
    setBillData({
      percentage: token.percentage || '',
      element: token.element || '',
      remarks: token.remarks || ''
    });
  };

  const handleBillDataChange = (field: string, value: string) => {
    setBillData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGenerateBill = async () => {
    if (!selectedToken || !billData.percentage || !billData.element) {
      toast({
        title: "Missing Information",
        description: "Please select a token and fill in percentage and element",
        variant: "destructive"
      });
      return;
    }

    const percentageInWords = convertToWords(parseFloat(billData.percentage));
    
    const updatedToken: TokenData = {
      ...selectedToken,
      percentage: billData.percentage,
      element: billData.element,
      percentageInWords,
      remarks: billData.remarks
    };

    try {
      await generatePDF(updatedToken, 'bill');
      updateTokenData(updatedToken);
      
      toast({
        title: "Bill Generated",
        description: `Bill for token ${updatedToken.tokenNumber} has been downloaded`,
      });

      // Refresh today's tokens
      const tempTokens = getTempTokenData();
      const today = new Date().toDateString();
      const todayItems = tempTokens.filter(item => {
        const itemDate = new Date(item.timestamp).toDateString();
        return itemDate === today;
      });
      setTodayTokens(todayItems);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate bill",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg border-2 border-amber-300">
      <div className="bg-white p-4 rounded-lg border border-amber-200">
        <h3 className="font-bold text-lg text-amber-800 mb-4">Today's Tokens</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {todayTokens.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No tokens generated today</p>
          ) : (
            todayTokens.map((token) => (
              <div
                key={token.id}
                onClick={() => handleTokenSelect(token)}
                className={`p-3 rounded-lg cursor-pointer transition-colors border-2 ${
                  selectedToken?.id === token.id
                    ? 'bg-amber-100 border-amber-400'
                    : 'bg-gray-50 border-gray-200 hover:bg-amber-50 hover:border-amber-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-amber-800">{token.tokenNumber}</span>
                  <span className="text-sm text-gray-600">{token.time}</span>
                </div>
                <div className="text-sm text-gray-700">{token.customerName}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedToken && (
        <div className="space-y-4 bg-white p-6 rounded-lg border border-amber-200">
          <h3 className="font-bold text-lg text-amber-800">Selected Token Details</h3>
          
          <div className="grid grid-cols-1 gap-3 text-sm bg-amber-50 p-4 rounded-lg">
            <div><strong>Token Number:</strong> {selectedToken.tokenNumber}</div>
            <div><strong>Customer Name:</strong> {selectedToken.customerName}</div>
            <div><strong>Item Description:</strong> {selectedToken.itemDescription}</div>
            <div><strong>Weight:</strong> {selectedToken.itemWeight} grams</div>
            {selectedToken.phoneNumber && (
              <div><strong>Phone Number:</strong> {selectedToken.phoneNumber}</div>
            )}
            <div><strong>Date:</strong> {selectedToken.date}</div>
            <div><strong>Time:</strong> {selectedToken.time}</div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="percentage" className="text-amber-800 font-semibold">Percentage (%) *</Label>
              <Input
                id="percentage"
                type="number"
                step="0.01"
                value={billData.percentage}
                onChange={(e) => handleBillDataChange('percentage', e.target.value)}
                placeholder=""
                className="border-amber-300 focus:border-amber-500"
              />
            </div>

            <div>
              <Label htmlFor="element" className="text-amber-800 font-semibold">Element *</Label>
              <Select
                value={billData.element}
                onValueChange={(value) => handleBillDataChange('element', value)}
              >
                <SelectTrigger id="element" className="border-amber-300 focus:border-amber-500">
                  <SelectValue placeholder="Select element" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="remarks" className="text-amber-800 font-semibold">Remarks</Label>
              <Textarea
                id="remarks"
                value={billData.remarks}
                onChange={(e) => handleBillDataChange('remarks', e.target.value)}
                placeholder="Additional remarks or notes"
                rows={3}
                className="border-amber-300 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-amber-200 mb-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="maskedPrint"
                checked={maskedPrint}
                onCheckedChange={(checked) => setMaskedPrint(checked as boolean)}
              />
              <Label htmlFor="maskedPrint" className="text-amber-800 font-semibold">
                Masked Print
              </Label>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full mt-4">
            {/* Preview Button */}
            <Button
              type="button"
              onClick={async () => {
                if (!selectedToken || !billData.percentage || !billData.element) {
                  toast({
                    title: "Missing Information",
                    description: "Please select a token and fill in percentage and element",
                    variant: "destructive"
                  });
                  return;
                }
                const percentageInWords = convertToWords(parseFloat(billData.percentage));
                const updatedToken: TokenData = {
                  ...selectedToken,
                  percentage: billData.percentage,
                  element: billData.element,
                  percentageInWords,
                  remarks: billData.remarks
                };
                try {
                  // Use generatePDFPreview to get a blob URL for the new A5 landscape layout
                  const url = await generatePDFPreview(updatedToken, 'bill', maskedPrint);
                  setPreviewUrl(url);
                  setShowPreview(true);
                } catch (error) {
                  toast({ title: "Error", description: "Failed to generate preview", variant: "destructive" });
                }
              }}
              className="w-full bg-gradient-to-r from-amber-300 to-yellow-400 hover:from-amber-400 hover:to-yellow-500 text-white font-bold py-3 text-lg shadow-lg"
              size="lg"
            >
              Preview
            </Button>

            {/* Share Button */}
            <Button
              type="button"
              onClick={async () => {
                if (!selectedToken || !billData.percentage || !billData.element) {
                  toast({
                    title: "Missing Information",
                    description: "Please select a token and fill in percentage and element",
                    variant: "destructive"
                  });
                  return;
                }
                const percentageInWords = convertToWords(parseFloat(billData.percentage));
                const updatedToken: TokenData = {
                  ...selectedToken,
                  percentage: billData.percentage,
                  element: billData.element,
                  percentageInWords,
                  remarks: billData.remarks
                };
                try {
                  const blob = await generatePDF(updatedToken, 'bill', true, maskedPrint); // Generate blob instead of saving
                  if (blob) {
                    const filename = `Bill_${updatedToken.tokenNumber}_${updatedToken.date.replace(/\//g, '')}.pdf`;

                    if (navigator.share && navigator.canShare) {
                      const file = new File([blob], filename, { type: 'application/pdf' });
                      if (navigator.canShare({ files: [file] })) {
                        await navigator.share({
                          files: [file],
                          title: 'Test Report',
                          text: 'Here is your test report PDF.'
                        });
                        return;
                      }
                    }

                    if (Capacitor.getPlatform() === 'android') {
                      const base64 = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve((reader.result as string).split(',')[1]);
                        reader.onerror = (error) => reject(error);
                        reader.readAsDataURL(blob);
                      });

                      await Filesystem.writeFile({
                        path: `Download/${filename}`,
                        data: base64 as string,
                        directory: Directory.External,
                        recursive: true
                      });

                      const fileUriResult = await Filesystem.getUri({
                        path: `Download/${filename}`,
                        directory: Directory.External,
                      });

                      await Share.share({
                        title: 'Test Report',
                        text: 'Here is your test report PDF.',
                        url: fileUriResult.uri,
                        dialogTitle: 'Share Test Report'
                      });
                      return;
                    }
                    toast({ title: "Sharing not supported", description: "Your device or browser does not support file sharing." });
                  }
                } catch (error) {
                  console.error("Sharing error:", error);
                  toast({ title: "Error", description: "Failed to share bill PDF", variant: "destructive" });
                }
              }}
              className="w-full bg-gradient-to-r from-amber-300 to-yellow-400 hover:from-amber-400 hover:to-yellow-500 text-white font-bold py-3 text-lg shadow-lg"
              size="lg"
            >
              Share
            </Button>
            {/* Save Report Button */}
          <Button 
              type="button"
              onClick={async () => {
                if (!selectedToken || !billData.percentage || !billData.element) {
                  toast({
                    title: "Missing Information",
                    description: "Please select a token and fill in percentage and element",
                    variant: "destructive"
                  });
                  return;
                }
                const percentageInWords = convertToWords(parseFloat(billData.percentage));
                const updatedToken: TokenData = {
                  ...selectedToken,
                  percentage: billData.percentage,
                  element: billData.element,
                  percentageInWords,
                  remarks: billData.remarks
                };
                moveTokenToHistory(updatedToken);
                toast({
                  title: "Report Saved",
                  description: `Report for token ${updatedToken.tokenNumber} has been saved to history`,
                });
                // Remove the token from todayTokens and clear selectedToken if needed
                setTodayTokens(prev => prev.filter(token => token.id !== updatedToken.id));
                if (selectedToken.id === updatedToken.id) {
                  setSelectedToken(null);
                }
              }}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-bold py-3 text-lg shadow-lg"
            size="lg"
          >
              Lock Report
          </Button>
            {/* PDF Preview Modal */}
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
        </div>
      )}
    </div>
  );
};

export default BillGenerator;
