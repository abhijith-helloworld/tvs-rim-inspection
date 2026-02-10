'use client';

import React from 'react';
import { WHEEL_COLORS } from '@/app/lib/constants';
import { Palette, Eye, Thermometer } from 'lucide-react';

interface ColorSelectorProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
}

export const ColorSelector: React.FC<ColorSelectorProps> = ({ 
  selectedColor, 
  onColorChange 
}) => {
  const getFinishInspectionNotes = (colorValue: string) => {
    const notes = {
      '#1a1a1a': 'Dark finishes hide minor scratches but require enhanced lighting for inspection.',
      '#f5f5dc': 'Light finishes show defects clearly but prone to showing dust and contaminants.',
      '#2d1b00': 'Multi-tone finishes require color consistency checks across all angles.'
    };
    return notes[colorValue as keyof typeof notes] || 'Standard visual inspection required.';
  };

  return (
    <div className="bg-dark-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Palette className="text-primary mr-3" size={24} />
          <div>
            <h3 className="text-xl font-semibold">Finish Inspection</h3>
            <p className="text-gray-400 text-sm">Analyze coating and surface quality</p>
          </div>
        </div>
        <div className="text-sm px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full">
          Visual + UV Analysis
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {WHEEL_COLORS.map((color) => (
          <div key={color.value} className="relative">
            <button
              onClick={() => onColorChange(color.value)}
              className={`w-full p-4 rounded-xl border-2 transition-all duration-300
                ${selectedColor === color.value 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-700 bg-dark-lighter hover:border-gray-500'
                }`}
            >
              <div className="flex items-center">
                <div 
                  className="w-16 h-16 rounded-lg mr-4 border-2 border-gray-600 shadow-lg"
                  style={{ backgroundColor: color.value }}
                ></div>
                <div className="text-left flex-1">
                  <div className="font-semibold">{color.name}</div>
                  <div className="text-sm text-gray-400 mt-1">Defect Rate: {color.defectRate}</div>
                  <div className="flex items-center mt-2 text-xs">
                    <Eye size={12} className="mr-1" />
                    <span className="text-gray-500">UV Inspection Required</span>
                  </div>
                </div>
              </div>
              
              {selectedColor === color.value && (
                <div className="absolute -top-2 -right-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <i className="fas fa-check text-dark"></i>
                  </div>
                </div>
              )}
            </button>
          </div>
        ))}
      </div>
      
      {/* Inspection Notes */}
      <div className="bg-dark-lighter/50 rounded-lg p-4 mb-6">
        <div className="flex items-center mb-3">
          <Eye className="text-blue-400 mr-3" size={20} />
          <h4 className="font-semibold">Inspection Notes</h4>
        </div>
        <p className="text-gray-300 text-sm mb-3">
          {getFinishInspectionNotes(selectedColor)}
        </p>
        <div className="flex items-center text-sm text-gray-400">
          <Thermometer size={14} className="mr-2" />
          <span>Recommended lighting: 5000K daylight LED • Magnification: 10x minimum</span>
        </div>
      </div>
      
      {/* Coating Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gradient-to-br from-dark-lighter to-dark-card rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-2">Coating Thickness</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold">45-55μm</div>
            <div className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
              Within Spec
            </div>
          </div>
          <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
          </div>
        </div>
        
        <div className="p-4 bg-gradient-to-br from-dark-lighter to-dark-card rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-2">Adhesion Test</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold">4B Rating</div>
            <div className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
              Excellent
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Cross-cut tape test passed • No detachment observed
          </div>
        </div>
      </div>
    </div>
  );
};