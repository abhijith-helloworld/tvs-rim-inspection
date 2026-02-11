"use client";

import React, { useState } from "react";
import { fetchWithAuth, API_BASE_URL } from "../../../lib/auth";

interface AddUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUserAdded: () => void;
}

export default function AddUserModal({ isOpen, onClose, onUserAdded }: AddUserModalProps) {
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        // Clear error when user starts typing
        if (error) setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Basic validation
        if (!formData.username || !formData.email || !formData.password) {
            setError("All fields are required");
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const res = await fetchWithAuth(`${API_BASE_URL}/accounts/register/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok || data.success === true) {
                setSuccess(true);
                // Reset form
                setFormData({
                    username: "",
                    email: "",
                    password: "",
                });
                
                // Wait a moment to show success message
                setTimeout(() => {
                    setSuccess(false);
                    onUserAdded(); // Refresh the users list
                    onClose(); // Close modal
                },);
            } else {
                // Handle API errors - check if message is an object with field errors
                const errorMessages: string[] = [];
                
                // Check if data.message is an object containing field errors
                if (data.message && typeof data.message === 'object' && !Array.isArray(data.message)) {
                    const messageObj = data.message;
                    
                    if (messageObj.username) {
                        const usernameError = Array.isArray(messageObj.username) 
                            ? messageObj.username.join(", ") 
                            : String(messageObj.username);
                        errorMessages.push(usernameError);
                    }
                    if (messageObj.email) {
                        const emailError = Array.isArray(messageObj.email) 
                            ? messageObj.email.join(", ") 
                            : String(messageObj.email);
                        errorMessages.push(emailError);
                    }
                    if (messageObj.password) {
                        const passwordError = Array.isArray(messageObj.password) 
                            ? messageObj.password.join(", ") 
                            : String(messageObj.password);
                        errorMessages.push(passwordError);
                    }
                } else if (typeof data.message === 'string') {
                    // If message is a simple string
                    errorMessages.push(data.message);
                }
                
                // Fallback to check top-level fields
                if (errorMessages.length === 0) {
                    if (data.username) {
                        const usernameError = Array.isArray(data.username) 
                            ? data.username.join(", ") 
                            : String(data.username);
                        errorMessages.push(usernameError);
                    }
                    if (data.email) {
                        const emailError = Array.isArray(data.email) 
                            ? data.email.join(", ") 
                            : String(data.email);
                        errorMessages.push(emailError);
                    }
                    if (data.password) {
                        const passwordError = Array.isArray(data.password) 
                            ? data.password.join(", ") 
                            : String(data.password);
                        errorMessages.push(passwordError);
                    }
                    if (data.detail) {
                        errorMessages.push(String(data.detail));
                    }
                }
                
                setError(errorMessages.length > 0 ? errorMessages.join(" • ") : "Failed to create user");
            }
        } catch (err) {
            console.error("Registration error:", err);
            setError(err instanceof Error ? err.message : "Failed to create user");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setFormData({
                username: "",
                email: "",
                password: "",
            });
            setError(null);
            setSuccess(false);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Add New User</h2>
                        <button
                            onClick={handleClose}
                            disabled={loading}
                            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Success Message */}
                    {success && (
                        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="text-green-800 font-medium">User created successfully!</span>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span className="text-red-800 font-medium">{error}</span>
                            </div>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Username Field */}
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                                Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                disabled={loading}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                placeholder="Enter username"
                                required
                            />
                        </div>

                        {/* Email Field */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                disabled={loading}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                placeholder="Enter email"
                                required
                            />
                        </div>

                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                disabled={loading}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                placeholder="Enter password"
                                required
                                minLength={6}
                            />
                            <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={loading}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Creating...
                                    </>
                                ) : (
                                    "Create User"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}