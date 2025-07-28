import { HistoryItem, TokenData } from '@/types/token';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
// @ts-ignore
import logo from '/android/app/src/main/res/mds_logo.png';


export const generateTokenNumber = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  // Get daily sequence number
  const today = date.toDateString();
  const tempTokens = getTempTokenData();
  const historyTokens = getHistoryData();
  
  // Count tokens from both temp storage and history for today
  const todayTempTokens = tempTokens.filter(item => {
    const itemDate = new Date(item.timestamp).toDateString();
    return itemDate === today;
  });
  
  const todayHistoryTokens = historyTokens.filter(item => {
    const itemDate = new Date(item.timestamp).toDateString();
    return itemDate === today;
  });
  
  const totalTodayTokens = todayTempTokens.length + todayHistoryTokens.length;
  const sequenceNumber = (totalTodayTokens + 1).toString().padStart(3, '0');
  
  return `${day}${month}${sequenceNumber}`;
};

export const convertToWords = (num: number): string => {
  // Always show two decimal places for percentage
  const fixed = num.toFixed(2);
  const [integerPart, decimalPartRaw] = fixed.split('.');
  // Remove trailing zeros in decimal part
  const decimalPart = decimalPartRaw //.replace(/0+$/, '');
  const digitToWord = (d: string) => {
    switch (d) {
      case '0': return 'ZERO';
      case '1': return 'ONE';
      case '2': return 'TWO';
      case '3': return 'THREE';
      case '4': return 'FOUR';
      case '5': return 'FIVE';
      case '6': return 'SIX';
      case '7': return 'SEVEN';
      case '8': return 'EIGHT';
      case '9': return 'NINE';
      default: return '';
  }
  };
  const intWords = integerPart.split('').map(digitToWord).join(' ');
  const decWords = decimalPart ? decimalPart.split('').map(digitToWord).join(' ') : '';
  return decWords ? `${intWords} / ${decWords}` : intWords;
};

// Unified PDF logic: Always use the report (bill) format for both token and bill
export const generatePDF = async (tokenData: TokenData, type: 'token' | 'bill', returnBlob: boolean = false, masked: boolean = false): Promise<void | Blob> => {
  const jsPDF = (await import('jspdf')).default;
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;

  if (!masked) {
    // Add golden border
    pdf.setDrawColor(218, 165, 32);
    pdf.setLineWidth(1);
    pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);

    // Header with golden background
    pdf.setFillColor(255, 255, 200);
    pdf.rect(7, 7, pageWidth - 14, 22, 'F');

    pdf.addImage(logo, 'PNG', 50, 10, 15, 15);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(139, 69, 19);
    const title = 'New MDS Jewellers';
    const titleWidth = pdf.getTextWidth(title);
    pdf.text(title, (pageWidth - titleWidth) / 2, 15);

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const subtitle = 'Shop no. 29, SKS Complex, Old Bus Stand, Kurnool';
    const subtitleWidth = pdf.getTextWidth(subtitle);
    pdf.text(subtitle, (pageWidth - subtitleWidth) / 2, 21);

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    const subtitle_no = '9849957100 / 8247453580';
    const subtitleWidth_no = pdf.getTextWidth(subtitle_no);
    pdf.text(subtitle_no, (pageWidth - subtitleWidth_no) / 2, 27)
    

    pdf.setFontSize(15);
    pdf.setFont('helvetica', 'bold');
    const certTitle = 'XRF Gold/Silver Test Certificate'; 
    const certTitleWidth = pdf.getTextWidth(certTitle);
    pdf.text(certTitle, (pageWidth - certTitleWidth) / 2, 35);
  }

  pdf.setTextColor(0, 0, 0);
  let yPosition = 35;

  if (!masked) {
    // Date and Time - use current date/time for preview/share
    const now = new Date();
    const currentDate = now.toLocaleDateString('en-GB');
    const currentTime = now.toLocaleTimeString('en-GB', { hour12: false });
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`DATE: ${currentDate}`, 160, yPosition);
    yPosition += 8;

    pdf.text(`TIME: ${currentTime}`, 160, yPosition);
    yPosition += 8;

    // Customer details with styled boxes
    const addStyledField = (label: string, value: string, y: number) => {
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${label}:`, 15, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(value, 80, y);
      return y + 9;
    };

    yPosition = addStyledField('TOKEN NUMBER', tokenData.tokenNumber, yPosition);
    yPosition = addStyledField('CUSTOMER NAME', tokenData.customerName, yPosition);
    yPosition = addStyledField(
      'ITEM WEIGHT (GRMS)',
      `${(typeof tokenData.itemWeight === 'number' ? tokenData.itemWeight : Number(tokenData.itemWeight)).toFixed(3)} g`,
      yPosition
    );

    // Item Description with text wrapping
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ITEM DESCRIPTION:', 15, yPosition);
    pdf.setFont('helvetica', 'normal');
    const descriptionLines = pdf.splitTextToSize(tokenData.itemDescription, pageWidth - 75);
    pdf.text(descriptionLines, 80, yPosition);
    yPosition += 7 + (descriptionLines.length * 6);
  } else {
    // For masked print, start at a position where results would appear
    yPosition = 80; // Moved lower
  }

  // Analysis text for all (unified with report/bill format)
  if (tokenData.percentage && tokenData.element) {
    if (masked) {
      // Compact date/time for masked print - positioned closer to result
      const now = new Date();
      const currentDate = now.toLocaleDateString('en-GB');
      const currentTime = now.toLocaleTimeString('en-GB', { hour12: false });
      
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(128, 128, 128);
      pdf.text(`${currentDate} ${currentTime}`, 15, yPosition + 2);
      pdf.setTextColor(0, 0, 0);
      yPosition += 8;
    }

    pdf.setFontSize(masked ? 13 : 13);
    pdf.setFont('helvetica', 'bold');
    pdf.text('XRF ANALYSIS RESULT:', 15, yPosition);
    yPosition += 7;

    const percent = `${parseFloat(tokenData.percentage).toFixed(2)}%`;
    const element = `${(tokenData.element || '').toUpperCase()}`;
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Upon XRF analysis, the above sample item has `, 15, yPosition);

    const offset = pdf.getTextWidth('Upon XRF analysis, the above sample item has ') + 15;
    pdf.setFont('helvetica', 'bold');
    pdf.text(` ${percent} of PURE ${element}.`, offset, yPosition);
    yPosition += 9;

    if (tokenData.element.toLowerCase() === 'gold') {
      pdf.setFont('helvetica', 'bold');
      pdf.text('KARAT:', 15, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${(parseFloat(tokenData.percentage)* 0.2402).toFixed(2)}K`, 60, yPosition);
      yPosition += 9;
    }

    if (tokenData.percentageInWords) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('PERCENTAGE IN WORDS:', 15, yPosition);
      yPosition += 7;

      pdf.setFont('helvetica', 'normal');
      pdf.text(tokenData.percentageInWords, 15, yPosition);
      yPosition += 9;
    }

    if (tokenData.remarks) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('REMARKS:', 15, yPosition);
      pdf.setFont('helvetica', 'normal');
      const remarksLines = pdf.splitTextToSize(tokenData.remarks, pageWidth - 75);
      pdf.text(remarksLines, 60, yPosition);
      yPosition += 7 + (remarksLines.length * 6);
    }
  }
  //new comment trying out github
  // Add image for tokens and reports (only in non-masked print)
  if (tokenData.image && !masked) {
    try {
      const img = new Image();
      img.src = tokenData.image;
      await new Promise(resolve => { img.onload = resolve; });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');

      const imgWidth = 40;
      const imgHeight = 40;
      const imgX = pageWidth - imgWidth - 15;
      const imgY = pageHeight - imgHeight - 60;
      pdf.setDrawColor(218, 165, 32);
      pdf.setLineWidth(0.5);
      pdf.rect(imgX, imgY, imgWidth, imgHeight);
      pdf.addImage(dataUrl, 'JPEG', imgX, imgY, imgWidth, imgHeight);
    } catch (error) {
      console.log('Could not add image to PDF:', error);
    }
  }

  // Footer
  //pdf.setFontSize(7);
  //pdf.setTextColor(128, 128, 128);
  //pdf.text('This document is computer generated and does not require signature.', 10, pageHeight - 7);

  const filename = `Bill_${tokenData.tokenNumber}_${tokenData.date.replace(/\//g, '')}.pdf`;

  if (returnBlob) {
    return pdf.output('blob');
  }
  pdf.save(filename);
};

export const saveToHistory = (tokenData: TokenData): void => {
  const historyItem: HistoryItem = {
    tokenNumber: tokenData.tokenNumber,
    customerName: tokenData.customerName,
    itemDescription: tokenData.itemDescription,
    date: tokenData.date,
    time: tokenData.time,
    timestamp: tokenData.timestamp
  };
  
  const existingHistory = getHistoryData();
  const updatedHistory = [...existingHistory, historyItem];
  
  localStorage.setItem('tokenHistory', JSON.stringify(updatedHistory));
  
  // Also save full token data for bill generation
  const existingTokens = getFullTokenData();
  const updatedTokens = [...existingTokens, tokenData];
  localStorage.setItem('fullTokenData', JSON.stringify(updatedTokens));
};

// New function to save tokens to temporary storage (not history)
export const saveTokenToTemp = (tokenData: TokenData): void => {
  try {
    const existingTokens = getTempTokenData();
    const updatedTokens = [...existingTokens, tokenData];
    localStorage.setItem('tempTokenData', JSON.stringify(updatedTokens));
  } catch (error) {
    console.error('Error saving token to temp storage:', error);
    // If the token data is too large (e.g., due to image), try saving without the image
    try {
      const tokenDataWithoutImage = { ...tokenData, image: '' };
      const existingTokens = getTempTokenData();
      const updatedTokens = [...existingTokens, tokenDataWithoutImage];
      localStorage.setItem('tempTokenData', JSON.stringify(updatedTokens));
      console.log('Token saved without image due to size constraints');
    } catch (secondError) {
      console.error('Failed to save token even without image:', secondError);
      throw new Error('Failed to save token data');
    }
  }
};

// New function to get tokens from temporary storage
export const getTempTokenData = (): TokenData[] => {
  try {
    const data = localStorage.getItem('tempTokenData');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading temp token data:', error);
    return [];
  }
};

// New function to move token from temp storage to history
export const moveTokenToHistory = (tokenData: TokenData): void => {
  // Remove from temp storage
  const existingTempTokens = getTempTokenData();
  const updatedTempTokens = existingTempTokens.filter(token => token.id !== tokenData.id);
  localStorage.setItem('tempTokenData', JSON.stringify(updatedTempTokens));
  
  // Add to history
  const historyItem: HistoryItem = {
    tokenNumber: tokenData.tokenNumber,
    customerName: tokenData.customerName,
    itemDescription: tokenData.itemDescription,
    date: tokenData.date,
    time: tokenData.time,
    timestamp: tokenData.timestamp
  };
  
  const existingHistory = getHistoryData();
  const updatedHistory = [...existingHistory, historyItem];
  localStorage.setItem('tokenHistory', JSON.stringify(updatedHistory));
  
  // Also save full token data for bill generation
  try {
    const existingTokens = getFullTokenData();
    const updatedTokens = [...existingTokens, tokenData];
    localStorage.setItem('fullTokenData', JSON.stringify(updatedTokens));
  } catch (error) {
    console.error('Error saving full token to history:', error);
    // Fallback to saving without the image
    try {
      const tokenDataWithoutImage = { ...tokenData, image: '' };
      const existingTokens = getFullTokenData();
      const updatedTokens = [...existingTokens, tokenDataWithoutImage];
      localStorage.setItem('fullTokenData', JSON.stringify(updatedTokens));
      console.log('Token saved to history without image due to size constraints');
    } catch (secondError) {
      console.error('Failed to save token to history even without image:', secondError);
      throw new Error('Failed to save token data to history');
    }
  }
};

export const getHistoryData = (): TokenData[] => {
  try {
    const data = localStorage.getItem('fullTokenData');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading history:', error);
    return [];
  }
};

export const getFullTokenData = (): TokenData[] => {
  try {
    const data = localStorage.getItem('fullTokenData');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading token data:', error);
    return [];
  }
};

export const updateTokenData = (updatedToken: TokenData): void => {
  const existingTokens = getFullTokenData();
  const updatedTokens = existingTokens.map(token => 
    token.id === updatedToken.id ? updatedToken : token
  );
  localStorage.setItem('fullTokenData', JSON.stringify(updatedTokens));
};

export const deleteTokenData = (tokenId: string): void => {
  const existingTokens = getFullTokenData();
  const filteredTokens = existingTokens.filter(token => token.id !== tokenId);
  localStorage.setItem('fullTokenData', JSON.stringify(filteredTokens));
};

export const exportToCSV = async (data: TokenData[], share: boolean = false): Promise<void> => {
  const headers = ['Token Number', 'Customer Name', 'Item Description', 'Phone Number', 'Weight (gms)', 'Date', 'Time', 'Percentage', 'Element'];
  const csvContent = [
    headers.join(','),
    ...data.map(item => [
      item.tokenNumber,
      `"${item.customerName}"`,
      `"${item.itemDescription}"`,
      item.phoneNumber || '',
      item.itemWeight !== undefined ? Number(item.itemWeight).toFixed(3) : '',
      item.date,
      item.time,
      item.percentage || '',
      item.element || ''
    ].join(','))
  ].join('\n');

  const filename = `MDS_History_${new Date().toISOString().split('T')[0]}.csv`;

  if (Capacitor.getPlatform() === 'android') {
    const base64 = btoa(unescape(encodeURIComponent(csvContent)));
    await Filesystem.writeFile({
      path: `Download/${filename}`,
      data: base64,
      directory: Directory.External,
      recursive: true
    });
    if (share) {
      const fileUriResult = await Filesystem.getUri({
        path: `Download/${filename}`,
        directory: Directory.External,
      });
      const contentUri = fileUriResult.uri;
      await Share.share({
        title: 'MDS History CSV',
        text: 'Here is your exported history (CSV).',
        url: contentUri,
        dialogTitle: 'Share CSV',
      });
    }
    return;
  }

  // Browser logic
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToExcel = async (data: TokenData[], share: boolean = false): Promise<void> => {
  const headers = ['Token Number', 'Customer Name', 'Item Description', 'Phone Number', 'Weight (gms)', 'Date', 'Time', 'Percentage', 'Element'];
  const csvContent = [
    headers.join(','),
    ...data.map(item => [
      item.tokenNumber,
      `"${item.customerName}"`,
      `"${item.itemDescription}"`,
      item.phoneNumber || '',
      item.itemWeight !== undefined ? Number(item.itemWeight).toFixed(3) : '',
      item.date,
      item.time,
      item.percentage || '',
      item.element || ''
    ].join(','))
  ].join('\n');

  const filename = `MDS_History_${new Date().toISOString().split('T')[0]}.xlsx`;

  if (Capacitor.getPlatform() === 'android') {
    const base64 = btoa(unescape(encodeURIComponent(csvContent)));
    await Filesystem.writeFile({
      path: `Download/${filename}`,
      data: base64,
      directory: Directory.External,
      recursive: true
    });
    if (share) {
      const fileUriResult = await Filesystem.getUri({
        path: `Download/${filename}`,
        directory: Directory.External,
      });
      const contentUri = fileUriResult.uri;
      await Share.share({
        title: 'MDS History Excel',
        text: 'Here is your exported history (Excel).',
        url: contentUri,
        dialogTitle: 'Share Excel',
      });
    }
    return;
  }

  // Browser logic
  const blob = new Blob([csvContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generatePDFPreview = async (tokenData: TokenData, type: 'token' | 'bill', masked: boolean = false): Promise<string> => {
  const blob = await generatePDF(tokenData, type, true, masked);
  if (blob instanceof Blob) {
    const url = URL.createObjectURL(blob);
    return url;
  }
  throw new Error('Failed to generate PDF preview blob.');
};
