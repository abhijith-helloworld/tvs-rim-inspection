"use client";

import React from "react";
import Image from "next/image";
import Rim from "../../../../public/tire.svg";

interface RimType {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    category: any;
    status: string;
}

interface PaginationState {
    count: number;
    next: string | null;
    previous: string | null;
    currentPage: number;
}

interface RimTypeTableProps {
    data: RimType[];
    loading: boolean;
    onEdit: (item: RimType) => void;
    pagination: PaginationState;
    pageSize: number;
    onNextPage: () => void;
    onPreviousPage: () => void;
    onPageClick: (page: number) => void;
}

function RimTypeTable({
    data,
    loading,
    onEdit,
    pagination,
    pageSize,
    onNextPage,
    onPreviousPage,
    onPageClick,
}: RimTypeTableProps) {
    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        } catch {
            return "Invalid date";
        }
    };

    const totalPages = Math.ceil(pagination.count / pageSize);

    const getPageNumbers = (): (number | "...")[] => {
        const pages: (number | "...")[] = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (pagination.currentPage > 3) pages.push("...");
            for (
                let i = Math.max(2, pagination.currentPage - 1);
                i <= Math.min(totalPages - 1, pagination.currentPage + 1);
                i++
            ) {
                pages.push(i);
            }
            if (pagination.currentPage < totalPages - 2) pages.push("...");
            pages.push(totalPages);
        }
        return pages;
    };

    const startItem = (pagination.currentPage - 1) * pageSize + 1;
    const endItem = Math.min(pagination.currentPage * pageSize, pagination.count);

    return (
        <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Rim Type
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Description
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Status
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Created
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Actions
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                                        <p className="font-medium text-gray-700">Loading rim types...</p>
                                        <p className="text-gray-500 text-sm mt-1">Please wait</p>
                                    </div>
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center">
                                    <div className="max-w-sm mx-auto">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            No rim types found
                                        </h3>
                                        <p className="text-gray-600 mb-4">
                                            Get started by creating your first rim type
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            data.map((item) => (
                                <tr
                                    key={item.id}
                                    className="hover:bg-gray-50/30 transition-colors"
                                >
                                    {/* Name with Icon */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                                                <Image src={Rim} alt="" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 text-sm">
                                                    {item.name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    ID: {item.id}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Description */}
                                    <td className="px-6 py-4">
                                        <div className="max-w-xs">
                                            <p className="text-gray-700 text-sm truncate">
                                                {item.description || (
                                                    <span className="italic text-gray-400">
                                                        No description
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                                                item.is_active
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                                    : "bg-gray-50 text-gray-600 border border-gray-200"
                                            }`}
                                        >
                                            <span
                                                className={`w-2 h-2 rounded-full ${item.is_active ? "bg-emerald-500" : "bg-gray-400"}`}
                                            ></span>
                                            {item.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </td>

                                    {/* Created Date */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                                                <svg
                                                    className="w-4 h-4 text-gray-500"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                    />
                                                </svg>
                                            </div>
                                            <span className="text-sm text-gray-600">
                                                {formatDate(item.created_at)}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => onEdit(item)}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-all text-sm"
                                        >
                                            <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                />
                                            </svg>
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Pagination Footer ── */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/40">
                    {/* Info */}
                    <p className="text-sm text-gray-500">
                        Showing{" "}
                        <span className="font-semibold text-gray-700">{startItem}</span>
                        {" – "}
                        <span className="font-semibold text-gray-700">{endItem}</span>
                        {" of "}
                        <span className="font-semibold text-gray-700">{pagination.count}</span>{" "}
                        results
                    </p>

                    {/* Controls */}
                    <div className="flex items-center gap-1">
                        {/* Previous */}
                        <button
                            onClick={onPreviousPage}
                            disabled={!pagination.previous || loading}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                            Prev
                        </button>

                        {/* Page Numbers */}
                        <div className="flex items-center gap-1">
                            {getPageNumbers().map((page, idx) =>
                                page === "..." ? (
                                    <span
                                        key={`ellipsis-${idx}`}
                                        className="px-2 py-2 text-sm text-gray-400"
                                    >
                                        •••
                                    </span>
                                ) : (
                                    <button
                                        key={page}
                                        onClick={() => onPageClick(page as number)}
                                        disabled={loading}
                                        className={`w-9 h-9 text-sm font-medium rounded-lg transition-all duration-200 ${
                                            pagination.currentPage === page
                                                ? "bg-blue-600 text-white shadow-md shadow-blue-200 scale-105"
                                                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                                        }`}
                                    >
                                        {page}
                                    </button>
                                )
                            )}
                        </div>

                        {/* Next */}
                        <button
                            onClick={onNextPage}
                            disabled={!pagination.next || loading}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            Next
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RimTypeTable;