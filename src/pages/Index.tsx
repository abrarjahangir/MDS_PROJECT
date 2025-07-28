
import React, { useState } from 'react';
import { FileText, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import TokenGenerator from '@/components/TokenGenerator';
import BillGenerator from '@/components/BillGenerator';
import HistoryView from '@/components/HistoryView';

const Index = () => {
  const [activeTab, setActiveTab] = useState('token');
  const { toast } = useToast();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-200 p-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-2xl border-4 border-amber-300">
        <div className="p-6">
          <div className="text-center mb-6 bg-gradient-to-r from-amber-600 to-yellow-600 text-white p-4 rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold">
              New MDS Jewellers
            </h1>
            <p className="text-sm opacity-90 mt-1">Shop no. 29, SKS Complex, Old Bus Stand, Kurnool</p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-amber-100 border-2 border-amber-300">
              <TabsTrigger 
                value="token"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-600 data-[state=active]:text-white font-semibold"
              >
                <FileText className="w-4 h-4 mr-2" />
                Token
              </TabsTrigger>
              <TabsTrigger 
                value="bill"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-600 data-[state=active]:text-white font-semibold"
              >
                <FileText className="w-4 h-4 mr-2" />
                Test Report
              </TabsTrigger>
              <TabsTrigger 
                value="history"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-600 data-[state=active]:text-white font-semibold"
              >
                <History className="w-4 h-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="token" className="mt-6">
              <TokenGenerator />
            </TabsContent>

            <TabsContent value="bill" className="mt-6">
              <BillGenerator />
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <HistoryView />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Index;
