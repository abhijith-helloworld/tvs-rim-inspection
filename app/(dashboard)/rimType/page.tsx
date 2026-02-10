"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth, API_BASE_URL } from "../../lib/auth";
import RimTypeForm from "./components/RimTypeForm";
import RimTypeTable from "./components/RimTypeTable";

/* ================= TYPES ================= */

interface RimType {
    category: any;
    status: string;
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
}

interface FormData {
    id: number | null;
    name: string;
    description: string;
    is_active: boolean;
}

/* ================= PAGE ================= */

export default function RimTypePage() {
    const [rimTypes, setRimTypes] = useState<RimType[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);

    const [formData, setFormData] = useState<FormData>({
        id: null,
        name: "",
        description: "",
        is_active: true,
    });

    const isEdit = Boolean(formData.id);

    /* ================= FETCH LIST ================= */

    const fetchRimTypes = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/rim-types/`);
            const json = await res.json();

            if (json.success) {
                setRimTypes(json.data || []);
            } else {
                setError(json.message || "Failed to load rim types");
            }
        } catch (err) {
            setError("Something went wrong while fetching rim types");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRimTypes();
    }, []);

    /* ================= INPUT CHANGE ================= */

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        const { name, value, type } = e.target;
        const checked =
            type === "checkbox"
                ? (e.target as HTMLInputElement).checked
                : undefined;

        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    /* ================= CREATE / UPDATE ================= */

    const handleSubmit = async () => {
        if (!formData.name.trim()) return;

        const url = isEdit
            ? `${API_BASE_URL}/rim-types/${formData.id}/`
            : `${API_BASE_URL}/rim-types/`;

        const method = isEdit ? "PATCH" : "POST";

        try {
            const res = await fetchWithAuth(url, {
                method,
                body: JSON.stringify({
                    name: formData.name.trim(),
                    description: formData.description || null,
                    is_active: formData.is_active,
                }),
            });

            const json = await res.json();

            if (json.success) {
                fetchRimTypes();
                handleCancel(); // close modal + reset
            } else {
                alert(json.message || "Operation failed");
            }
        } catch (err) {
            alert("Failed to save rim type");
        }
    };

    /* ================= EDIT ================= */

    const handleEdit = (item: RimType) => {
        setFormData({
            id: item.id,
            name: item.name,
            description: item.description || "",
            is_active: item.is_active,
        });
        setShowModal(true);
    };

    /* ================= CANCEL / CLOSE ================= */

    const handleCancel = () => {
        setFormData({
            id: null,
            name: "",
            description: "",
            is_active: true,
        });
        setShowModal(false);
    };

    /* ================= UI ================= */

    return (
        <div className="p-6 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header Section */}
            <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Rim Types
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Manage and organize your rim inventory
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            handleCancel();
                            setShowModal(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                        Add Rim Type
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">
                                    Total Rims
                                </p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                    {rimTypes.length}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                                <svg
                                    className="w-6 h-6 text-blue-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Active</p>
                                <p className="text-2xl font-bold text-green-600 mt-1">
                                    {
                                        rimTypes.filter(
                                            (r) => r.status === "active",
                                        ).length
                                    }
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                                <svg
                                    className="w-6 h-6 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">
                                    Last Added
                                </p>
                                <p className="text-sm font-medium text-gray-900 mt-1">
                                    Today
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                                <svg
                                    className="w-6 h-6 text-purple-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">
                                    Categories
                                </p>
                                <p className="text-2xl font-bold text-amber-600 mt-1">
                                    {
                                        new Set(rimTypes.map((r) => r.category))
                                            .size
                                    }
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                                <svg
                                    className="w-6 h-6 text-amber-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="mb-6 animate-fade-in">
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <svg
                                    className="h-5 w-5 text-red-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700 font-medium">
                                    {error}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Table Section */}
            <div className="">
                <RimTypeTable
                    data={rimTypes}
                    loading={loading}
                    onEdit={handleEdit}
                />
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div
                        className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl transform transition-all duration-300 animate-scale-in"
                        style={{
                            background:
                                "linear-gradient(white, white) padding-box, linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1)) border-box",
                            border: "1px solid transparent",
                        }}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {isEdit
                                        ? "Edit Rim Type"
                                        : "Add New Rim Type"}
                                </h2>
                                <p className="text-gray-600 mt-1">
                                    {isEdit
                                        ? "Update rim type details"
                                        : "Add a new rim type to your inventory"}
                                </p>
                            </div>
                            <button
                                onClick={handleCancel}
                                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors group"
                            >
                                <svg
                                    className="w-5 h-5 text-gray-500 group-hover:text-gray-700"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            <RimTypeForm
                                formData={formData}
                                onChange={handleChange}
                                onSubmit={handleSubmit}
                                onCancel={handleCancel}
                                isEdit={isEdit}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
