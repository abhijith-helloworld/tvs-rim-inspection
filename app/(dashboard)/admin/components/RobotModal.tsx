import { useState, useEffect } from "react";
import { Robot } from "../../../types/robot";
import { showError } from "./NotificationService";

interface RobotModalProps {
  isOpen: boolean;
  onClose: () => void;
  robot: Robot | null;
  onSubmit: (data: { 
    robo_id: string; 
    name: string; 
    local_ip: string;
    minimum_battery_charge: number;
  }) => Promise<void>;
  saving: boolean;
}

export function RobotModal({ isOpen, onClose, robot, onSubmit, saving }: RobotModalProps) {
  const [form, setForm] = useState({
    robo_id: "",
    name: "",
    local_ip: "",
    minimum_battery_charge: 20,
  });

  const [errors, setErrors] = useState({
    robo_id: "",
    name: "",
    local_ip: "",
    minimum_battery_charge: "",
  });

  const [touched, setTouched] = useState({
    robo_id: false,
    name: false,
    local_ip: false,
    minimum_battery_charge: false,
  });

  useEffect(() => {
    if (robot && isOpen) {
      setForm({
        robo_id: robot.robo_id,
        name: robot.name,
        local_ip: robot.local_ip || "",
        minimum_battery_charge: robot.minimum_battery_charge || 20,
      });
    } else if (isOpen) {
      setForm({ robo_id: "", name: "", local_ip: "", minimum_battery_charge: 20 });
    }
    setErrors({ robo_id: "", name: "", local_ip: "", minimum_battery_charge: "" });
    setTouched({ robo_id: false, name: false, local_ip: false, minimum_battery_charge: false });
  }, [robot, isOpen]);

  const validateField = (name: keyof typeof form, value: string | number) => {
    switch (name) {
      case "robo_id":
        if (!String(value).trim()) return "Robot ID is required";
        if (String(value).length < 3) return "Robot ID must be at least 3 characters";
        if (!/^[a-zA-Z0-9-_]+$/.test(String(value))) return "Only letters, numbers, hyphens and underscores allowed";
        return "";
      
      case "name":
        if (!String(value).trim()) return "Robot name is required";
        if (String(value).length < 2) return "Name must be at least 2 characters";
        return "";
      
      case "local_ip":
        if (String(value).trim() && !/^(\d{1,3}\.){3}\d{1,3}$/.test(String(value))) {
          return "Please enter a valid IP address (e.g., 192.168.1.100)";
        }
        return "";
      
      case "minimum_battery_charge":
        const numValue = Number(value);
        if (isNaN(numValue)) return "Must be a valid number";
        if (numValue < 0) return "Cannot be negative";
        if (numValue > 100) return "Cannot exceed 100%";
        return "";
      
      default:
        return "";
    }
  };

  const handleBlur = (field: keyof typeof form) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, form[field]);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleChange = (field: keyof typeof form, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const validateForm = () => {
    const newErrors = {
      robo_id: validateField("robo_id", form.robo_id),
      name: validateField("name", form.name),
      local_ip: validateField("local_ip", form.local_ip),
      minimum_battery_charge: validateField("minimum_battery_charge", form.minimum_battery_charge),
    };
    
    setErrors(newErrors);
    setTouched({
      robo_id: true,
      name: true,
      local_ip: true,
      minimum_battery_charge: true,
    });

    return !newErrors.robo_id && !newErrors.name && !newErrors.local_ip && !newErrors.minimum_battery_charge;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showError("Please fix the errors in the form");
      return;
    }

    try {
      await onSubmit(form);
    } catch (error) {
      // Error is already handled by parent component
    }
  };

  if (!isOpen) return null;

  const isEdit = !!robot;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {isEdit ? "Edit Robot" : "Add New Robot"}
              </h2>
              <p className="text-sm text-gray-600">
                {isEdit 
                  ? "Update robot configuration details" 
                  : "Configure a new robot for your fleet"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors disabled:opacity-50"
              disabled={saving}
            >
              ×
            </button>
          </div>

          {/* Edit badge */}
          {isEdit && (
            <div className="mt-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-semibold text-blue-700">
                Editing: {robot?.name || robot?.robo_id}
              </span>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {/* Robot ID */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Robot ID *
            </label>
            <input
              type="text"
              value={form.robo_id}
              onChange={(e) => handleChange("robo_id", e.target.value)}
              onBlur={() => handleBlur("robo_id")}
              className={`w-full px-4 py-3 rounded-lg border font-mono text-sm transition-colors ${
                errors.robo_id && touched.robo_id
                  ? "border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  : "border-gray-300 bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              }`}
              placeholder="e.g., robot-001"
              disabled={saving}
            />
            {errors.robo_id && touched.robo_id ? (
              <p className="text-sm text-red-600">{errors.robo_id}</p>
            ) : (
              <p className="text-xs text-gray-500">
                Unique identifier for the robot
              </p>
            )}
          </div>

          {/* Robot Name */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Robot Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              className={`w-full px-4 py-3 rounded-lg border text-sm transition-colors ${
                errors.name && touched.name
                  ? "border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  : "border-gray-300 bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              }`}
              placeholder="e.g., Inspection Bot #1"
              disabled={saving}
            />
            {errors.name && touched.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Local IP */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-900">
                Local IP Address
              </label>
              <span className="text-xs font-medium px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
                Optional
              </span>
            </div>
            <input
              type="text"
              value={form.local_ip}
              onChange={(e) => handleChange("local_ip", e.target.value)}
              onBlur={() => handleBlur("local_ip")}
              className={`w-full px-4 py-3 rounded-lg border font-mono text-sm transition-colors ${
                errors.local_ip && touched.local_ip
                  ? "border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  : "border-gray-300 bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              }`}
              placeholder="e.g., 192.168.1.100 (optional)"
              disabled={saving}
            />
            {errors.local_ip && touched.local_ip ? (
              <p className="text-sm text-red-600">{errors.local_ip}</p>
            ) : (
              <div className="px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-900 font-medium mb-1">
                  Network Configuration
                </p>
                <p className="text-xs text-blue-700">
                  Leave empty for automatic DHCP assignment. Manual IP must follow XXX.XXX.XXX.XXX format.
                </p>
              </div>
            )}
          </div>

          {/* Minimum Battery Charge */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Minimum Battery Charge (%) *
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={form.minimum_battery_charge}
                onChange={(e) => handleChange("minimum_battery_charge", Number(e.target.value))}
                onBlur={() => handleBlur("minimum_battery_charge")}
                className={`w-full px-4 py-3 rounded-lg border text-sm transition-colors ${
                  errors.minimum_battery_charge && touched.minimum_battery_charge
                    ? "border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                }`}
                placeholder="20"
                disabled={saving}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                %
              </div>
            </div>
            {errors.minimum_battery_charge && touched.minimum_battery_charge ? (
              <p className="text-sm text-red-600">{errors.minimum_battery_charge}</p>
            ) : (
              <p className="text-xs text-gray-500">
                Robot will return to charging station when battery falls below this level
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>{isEdit ? "Updating..." : "Creating..."}</span>
              </>
            ) : (
              <span>{isEdit ? "Update Robot" : "Create Robot"}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}