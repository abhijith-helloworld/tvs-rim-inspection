"use client";

import React, { useState } from "react";

interface FormData {
    id: number | null;
    name: string;
    description: string;
    is_active: boolean;
}

interface RimTypeFormProps {
    formData: FormData;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onSubmit: () => void;
    onCancel: () => void;
    isEdit: boolean;
}

function RimTypeForm({ formData, onChange, onSubmit, onCancel, isEdit }: RimTypeFormProps) {
    const [errors, setErrors] = useState<{ name?: string; description?: string }>({});
    const [touched, setTouched] = useState<{ name?: boolean; description?: boolean }>({});

    const validateName = (value: string) => {
        if (!value.trim()) {
            return "Rim type name is required";
        }
        if (value.trim().length < 2) {
            return "Name must be at least 2 characters";
        }
        if (value.trim().length > 100) {
            return "Name must be less than 100 characters";
        }
        return "";
    };

    const validateDescription = (value: string) => {
        if (value && value.length > 500) {
            return "Description must be less than 500 characters";
        }
        return "";
    };

    const handleBlur = (field: "name" | "description") => {
        setTouched({ ...touched, [field]: true });
        
        if (field === "name") {
            const error = validateName(formData.name);
            setErrors({ ...errors, name: error });
        } else if (field === "description") {
            const error = validateDescription(formData.description);
            setErrors({ ...errors, description: error });
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        // Call parent onChange
        onChange(e);
        
        // Clear error when user starts typing
        if (touched[name as keyof typeof touched]) {
            if (name === "name") {
                const error = validateName(value);
                setErrors({ ...errors, name: error });
            } else if (name === "description") {
                const error = validateDescription(value);
                setErrors({ ...errors, description: error });
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate all fields
        const nameError = validateName(formData.name);
        const descriptionError = validateDescription(formData.description);
        
        setErrors({
            name: nameError,
            description: descriptionError,
        });
        
        setTouched({
            name: true,
            description: true,
        });
        
        // Only submit if no errors
        if (!nameError && !descriptionError) {
            onSubmit();
        }
    };

    const isFormValid = !validateName(formData.name) && !validateDescription(formData.description);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Input */}
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Rim Type Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${
                            errors.name && touched.name ? "bg-red-100" : "bg-indigo-100"
                        }`}>
                            <svg className={`w-3 h-3 ${errors.name && touched.name ? "text-red-600" : "text-indigo-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                        </div>
                    </div>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        onBlur={() => handleBlur("name")}
                        placeholder="Enter rim type name"
                        className={`w-full pl-11 pr-4 py-3 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                            errors.name && touched.name
                                ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                                : "border-gray-200 focus:ring-indigo-500 focus:border-transparent"
                        }`}
                        maxLength={100}
                    />
                    {formData.name && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <span className="text-xs text-gray-400">
                                {formData.name.length}/100
                            </span>
                        </div>
                    )}
                </div>
                {errors.name && touched.name ? (
                    <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.name}
                    </p>
                ) : (
                    <p className="text-xs text-gray-500 mt-1.5">Choose a descriptive name for your rim type</p>
                )}
            </div>

            {/* Description Input */}
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                </label>
                <div className="relative">
                    <div className="absolute top-3 left-3 pointer-events-none">
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${
                            errors.description && touched.description ? "bg-red-100" : "bg-blue-100"
                        }`}>
                            <svg className={`w-3 h-3 ${errors.description && touched.description ? "text-red-600" : "text-blue-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                    </div>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        onBlur={() => handleBlur("description")}
                        placeholder="Enter description (optional)"
                        rows={4}
                        className={`w-full pl-11 pr-4 py-3 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 transition-all resize-none ${
                            errors.description && touched.description
                                ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                                : "border-gray-200 focus:ring-indigo-500 focus:border-transparent"
                        }`}
                        maxLength={500}
                    />
                    {formData.description && (
                        <div className="absolute bottom-3 right-3">
                            <span className="text-xs text-gray-400">
                                {formData.description.length}/500
                            </span>
                        </div>
                    )}
                </div>
                {errors.description && touched.description ? (
                    <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.description}
                    </p>
                ) : (
                    <p className="text-xs text-gray-500 mt-1.5">Add details about this rim type (optional)</p>
                )}
            </div>

            {/* Active Status */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                            formData.is_active 
                                ? "bg-emerald-100" 
                                : "bg-gray-200"
                        }`}>
                            <svg className={`w-5 h-5 transition-colors ${formData.is_active ? "text-emerald-600" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <label htmlFor="is_active" className="block text-sm font-semibold text-gray-900 cursor-pointer">
                                Active Status
                            </label>
                            <p className="text-xs text-gray-500">
                                {formData.is_active ? "This rim type is active" : "This rim type is inactive"}
                            </p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            id="is_active"
                            name="is_active"
                            checked={formData.is_active}
                            onChange={(e) => {
                                const syntheticEvent = {
                                    target: {
                                        name: "is_active",
                                        value: e.target.checked.toString(),
                                        type: "checkbox",
                                        checked: e.target.checked,
                                    },
                                } as React.ChangeEvent<HTMLInputElement>;
                                onChange(syntheticEvent);
                            }}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 rounded-full transition-all bg-gray-300 peer-checked:bg-emerald-500 relative">
                            <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform shadow-sm ${
                                formData.is_active ? "translate-x-5" : "translate-x-0"
                            }`}></div>
                        </div>
                    </label>
                </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
                <button
                    type="submit"
                    disabled={!isFormValid}
                    className={`flex-1 px-6 py-3 font-medium rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 ${
                        isFormValid
                            ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isEdit ? "M5 13l4 4L19 7" : "M12 4v16m8-8H4"} />
                    </svg>
                    {isEdit ? "Update Rim Type" : "Create Rim Type"}
                </button>
                
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors border border-gray-200"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}

export default RimTypeForm;