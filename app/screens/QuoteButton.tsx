'use client';

import React, { useState } from 'react';
import { WHEEL_COLORS } from '@/app/lib/constants';
import { Calculator, Sparkles } from 'lucide-react';

interface QuoteButtonProps {
  selectedSize: number;
  selectedColor: string;
  selectedModel: string;
}

export const QuoteButton: React.FC<QuoteButtonProps> = ({ 
  selectedSize, 
  selectedColor,
  selectedModel 
}) => {
  const [quote, setQuote] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const calculateQuote = () => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const basePrice = 800;
      const sizeMultiplier = selectedSize * 40;
      const colorPremium = selectedColor === '#1a1a1a' ? 100 : 
                          selectedColor === '#f5f5dc' ? 150 : 200;
      const modelPremium = selectedModel === 'P102' ? 200 : 
                          selectedModel === 'P103' ? 350 : 0;
      
      const total = basePrice + sizeMultiplier + colorPremium + modelPremium;
      setQuote(total);
      setIsLoading(false);
      setShowDetails(true);
    }, 800);
  };

  const colorName = WHEEL_COLORS.find(c => c.value === selectedColor)?.name || 'Dark Clear';

  return (
    <div className="bg-gradient-to-br from-dark-card to-dark-lighter rounded-2xl p-6 border border-gray-700">
      <div className="flex items-center mb-6">
        <Sparkles className="text-primary mr-3" size={24} />
        <h3 className="text-xl font-semibold">Configuration Summary</h3>
        <span className="ml-auto text-sm bg-primary/20 text-primary px-3 py-1 rounded-full">
          {selectedModel}
        </span>
      </div>
      
      <div className="space-y-4 mb-6">
        <div className="flex justify-between py-3 border-b border-gray-700">
          <span className="text-gray-400">Wheel Size</span>
          <span className="font-semibold">{selectedSize}"</span>
        </div>
        <div className="flex justify-between py-3 border-b border-gray-700">
          <span className="text-gray-400">Finish</span>
          <span className="font-semibold">{colorName}</span>
        </div>
        <div className="flex justify-between py-3 border-b border-gray-700">
          <span className="text-gray-400">Construction</span>
          <span className="font-semibold text-primary">Forged Monoblock</span>
        </div>
      </div>
      
      {showDetails && quote && (
        <div className="mb-6 p-4 bg-dark-lighter/30 rounded-lg animate-fade-in">
          <div className="text-center mb-2">
            <div className="text-3xl font-bold text-primary">${quote.toLocaleString()}</div>
            <div className="text-gray-400">Estimated Price (Set of 4)</div>
          </div>
          <div className="text-sm text-gray-400 mt-2">
            Includes: Custom finish, center caps, titanium bolts, 5-year warranty
          </div>
        </div>
      )}
      
      <button
        onClick={calculateQuote}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-primary to-amber-500 hover:from-amber-500 
          hover:to-primary text-dark font-bold py-4 px-6 rounded-xl 
          transition-all duration-300 transform hover:scale-[1.02] 
          disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-dark mr-3"></div>
            Calculating Quote...
          </>
        ) : (
          <>
            <Calculator className="mr-3" size={20} />
            GET QUOTE
          </>
        )}
      </button>
      
      <div className="mt-4 text-center text-sm text-gray-400">
        <i className="fas fa-sync-alt mr-2"></i>
        Quotes are generated in real-time
      </div>
    </div>
  );
};