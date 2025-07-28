import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { TokenData } from '@/types/token';
import { generatePDF, generatePDFPreview, generateTokenNumber, saveTokenToTemp } from '@/utils/tokenUtils';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import { Camera, Download } from 'lucide-react';
import React, { useRef, useState } from 'react';
// @ts-ignore
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

const TokenGenerator = () => {
  const [formData, setFormData] = useState({
    customerName: '',
    itemDescription: '',
    itemWeight: '',
    phoneNumber: ''
  });
  const [image, setImage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleImageCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGenerateToken = async () => {
    if (!formData.customerName || !formData.itemDescription || !formData.itemWeight) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const now = new Date();
    const tokenData: TokenData = {
      id: Date.now().toString(),
      tokenNumber: generateTokenNumber(now),
      ...formData,
      image,
      date: now.toLocaleDateString('en-GB'),
      time: now.toLocaleTimeString('en-GB', { hour12: false }),
      timestamp: now.getTime()
    };

    try {
      await generatePDF(tokenData, 'token');
      saveTokenToTemp(tokenData);
      
      toast({
        title: "Token Generated",
        description: `Token ${tokenData.tokenNumber} has been created and downloaded`,
      });

      // Reset form
      setFormData({
        customerName: '',
        itemDescription: '',
        itemWeight: '',
        phoneNumber: ''
      });
      setImage('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate token",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg border-2 border-amber-300">
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white p-4 rounded-lg border border-amber-200">
          <Label htmlFor="customerName" className="text-amber-800 font-semibold">Customer Name *</Label>
          <Input
            id="customerName"
            value={formData.customerName}
            onChange={(e) => handleInputChange('customerName', e.target.value)}
            placeholder="Enter customer name"
            className="border-amber-300 focus:border-amber-500"
          />
        </div>

        <div className="bg-white p-4 rounded-lg border border-amber-200">
          <Label htmlFor="itemDescription" className="text-amber-800 font-semibold">Item Description *</Label>
          <Textarea
            id="itemDescription"
            value={formData.itemDescription}
            onChange={(e) => handleInputChange('itemDescription', e.target.value)}
            placeholder="Describe the ornament"
            rows={2}
            className="border-amber-300 focus:border-amber-500"
          />
        </div>

        <div className="bg-white p-4 rounded-lg border border-amber-200">
          <Label htmlFor="itemWeight" className="text-amber-800 font-semibold">Item Weight (grams) *</Label>
          <Input
            id="itemWeight"
            type="number"
            step="0.01"
            value={formData.itemWeight}
            onChange={(e) => handleInputChange('itemWeight', e.target.value)}
            placeholder="Weight in grams"
            className="border-amber-300 focus:border-amber-500"
          />
        </div>

        <div className="bg-white p-4 rounded-lg border border-amber-200">
          <Label htmlFor="phoneNumber" className="text-amber-800 font-semibold">Phone Number</Label>
          <Input
            id="phoneNumber"
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
            placeholder="Enter phone number (optional)"
            className="border-amber-300 focus:border-amber-500"
          />
        </div>

        <div className="bg-white p-4 rounded-lg border border-amber-200">
          <Label className="text-amber-800 font-semibold">Ornament Picture</Label>
          <div className="mt-2 space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <Camera className="w-4 h-4 mr-2" />
              Capture/Upload Image
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageCapture}
              className="hidden"
            />
            {image && (
              <div className="mt-2">
                <img
                  src={image}
                  alt="Captured ornament"
                  className="w-full h-32 object-cover rounded border-2 border-amber-300"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full">
        <Button 
          onClick={async () => {
            if (!formData.customerName || !formData.itemDescription || !formData.itemWeight) {
              toast({
                title: "Missing Information",
                description: "Please fill in all required fields",
                variant: "destructive"
              });
              return;
            }
            const now = new Date();
            const tokenData: TokenData = {
              id: Date.now().toString(),
              tokenNumber: generateTokenNumber(now),
              ...formData,
              image,
              date: now.toLocaleDateString('en-GB'),
              time: now.toLocaleTimeString('en-GB', { hour12: false }),
              timestamp: now.getTime()
            };
            try {
              let finalTokenData = { ...tokenData };
              if (tokenData.image) {
                const img = new window.Image();
                img.src = tokenData.image;
                await new Promise((resolve) => { img.onload = resolve; });
                let imgWidth = 150;
                let imgHeight = 150;
                const aspectRatio = img.width / img.height;
                if (aspectRatio > 1) {
                  imgHeight = imgWidth / aspectRatio;
                } else {
                  imgWidth = imgHeight * aspectRatio;
                }
                const canvas = document.createElement('canvas');
                canvas.width = imgWidth;
                canvas.height = imgHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, imgWidth, imgHeight);
                const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                finalTokenData.image = resizedDataUrl;
              }
              saveTokenToTemp(finalTokenData);
              toast({
                title: "Token saved",
                description: `Token ${tokenData.tokenNumber} has been saved`,
              });
              setFormData({
                customerName: '',
                itemDescription: '',
                itemWeight: '',
                phoneNumber: ''
              });
              setImage('');
            } catch (error) {
              console.error('Error saving token:', error);
              toast({
                title: "Error",
                description: "Failed to save token. Please try again.",
                variant: "destructive"
              });
            }
          }}
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-bold py-3 text-lg shadow-lg" 
          size="lg"
        >
          <Download className="w-5 h-5 mr-2" />
          Save Token
        </Button>
        <Button
          type="button"
          onClick={async () => {
            if (!formData.customerName || !formData.itemDescription || !formData.itemWeight) {
              toast({
                title: "Missing Information",
                description: "Please fill in all required fields",
                variant: "destructive"
              });
              return;
            }
            const now = new Date();
            const tokenData: TokenData = {
              id: Date.now().toString(),
              tokenNumber: generateTokenNumber(now),
              ...formData,
              image,
              date: now.toLocaleDateString('en-GB'),
              time: now.toLocaleTimeString('en-GB', { hour12: false }),
              timestamp: now.getTime()
            };
            try {
              const url = await generatePDFPreview(tokenData, 'token');
              setPreviewUrl(url);
              setShowPreview(true);
            } catch (e) {
              toast({ title: "Error", description: "Failed to preview PDF", variant: "destructive" });
            }
          }}
          className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-white font-bold py-3 text-lg shadow-lg"
          size="lg"
        >
          Preview
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
        <Button
          type="button"
          onClick={async () => {
            if (!formData.customerName || !formData.itemDescription || !formData.itemWeight) {
              toast({
                title: "Missing Information",
                description: "Please fill in all required fields",
                variant: "destructive"
              });
              return;
            }
            const now = new Date();
            const tokenData: TokenData = {
              id: Date.now().toString(),
              tokenNumber: generateTokenNumber(now),
              ...formData,
              image,
              date: now.toLocaleDateString('en-GB'),
              time: now.toLocaleTimeString('en-GB', { hour12: false }),
              timestamp: now.getTime()
            };
            try {
              // Use the same PDF generation as preview to ensure consistency
              const blob = await generatePDF(tokenData, 'token', true);
              if (blob instanceof Blob) {
                const filename = `Token_${tokenData.tokenNumber}_${tokenData.date.replace(/\//g, '')}.pdf`;
                
                // Universal share logic
                if (navigator.share && navigator.canShare) {
                  const file = new File([blob], filename, { type: 'application/pdf' });
                  if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                      files: [file],
                      title: 'Token',
                      text: 'Here is your token PDF.'
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
                    title: 'Token',
                    text: 'Here is your token PDF.',
                    url: contentUri,
                    dialogTitle: 'Share Token'
                  });
                  return;
                }
                toast({ title: "Sharing not supported", description: "Your device or browser does not support file sharing." });
              }
            } catch (e) {
              toast({ title: "Error", description: "Failed to share token PDF", variant: "destructive" });
            }
          }}
          className="w-full bg-gradient-to-r from-amber-300 to-yellow-400 hover:from-amber-400 hover:to-yellow-500 text-white font-bold py-3 text-lg shadow-lg"
          size="lg"
        >
          Share
        </Button>
      </div>
    </div>
  );
};

export default TokenGenerator;
