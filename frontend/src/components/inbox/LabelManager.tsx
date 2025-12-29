import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  GripVertical,
} from 'lucide-react';
import type { Label } from '@/lib/api/inbox';

interface LabelManagerProps {
  labels: Label[];
  onCreateLabel?: (data: { name: string; color: string; icon?: string; description?: string }) => void;
  onUpdateLabel?: (id: number, data: { name?: string; color?: string; icon?: string; description?: string }) => void;
  onDeleteLabel?: (id: number) => void;
  onReorderLabels?: (orderedIds: number[]) => void;
  loading?: boolean;
  className?: string;
}

const PRESET_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#6B7280', // gray
];

const PRESET_ICONS = [
  '📌', '🔥', '⭐', '💡', '🎯', '✅', '🚀', '📧', '📝', '🔔',
  '💬', '📂', '🏷️', '🔖', '📋', '⚡', '🎨', '🔧', '💰', '📅',
];

interface LabelFormData {
  name: string;
  color: string;
  icon: string;
  description: string;
}

const LabelManager: React.FC<LabelManagerProps> = ({
  labels,
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
  onReorderLabels,
  loading = false,
  className = '',
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<LabelFormData>({
    name: '',
    color: PRESET_COLORS[0],
    icon: '',
    description: '',
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const resetForm = () => {
    setFormData({
      name: '',
      color: PRESET_COLORS[0],
      icon: '',
      description: '',
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const startEdit = (label: Label) => {
    setFormData({
      name: label.name,
      color: label.color,
      icon: label.icon || '',
      description: label.description || '',
    });
    setEditingId(label.id);
    setIsCreating(false);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    if (editingId) {
      onUpdateLabel?.(editingId, {
        name: formData.name,
        color: formData.color,
        icon: formData.icon || undefined,
        description: formData.description || undefined,
      });
    } else {
      onCreateLabel?.({
        name: formData.name,
        color: formData.color,
        icon: formData.icon || undefined,
        description: formData.description || undefined,
      });
    }
    resetForm();
  };

  const handleDelete = (id: number) => {
    if (deleteConfirmId === id) {
      onDeleteLabel?.(id);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const renderForm = () => (
    <div className="p-4 bg-gray-50 rounded-lg space-y-4">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter label name"
          className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setFormData({ ...formData, color })}
              className={`w-8 h-8 rounded-full ${
                formData.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <input
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="w-8 h-8 rounded-full cursor-pointer"
          />
        </div>
      </div>

      {/* Icon */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Icon (optional)</label>
        <div className="flex flex-wrap gap-1">
          {PRESET_ICONS.map((icon) => (
            <button
              key={icon}
              onClick={() => setFormData({ ...formData, icon: formData.icon === icon ? '' : icon })}
              className={`w-8 h-8 text-lg flex items-center justify-center rounded ${
                formData.icon === icon ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-gray-100'
              }`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description"
          className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Preview */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Preview</label>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-sm"
            style={{
              backgroundColor: `${formData.color}20`,
              color: formData.color,
            }}
          >
            {formData.icon && <span className="mr-1">{formData.icon}</span>}
            {formData.name || 'Label name'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={resetForm}
          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!formData.name.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {editingId ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-4 h-4 bg-gray-200 rounded-full" />
            <div className="flex-1 h-4 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Labels</h3>
        {onCreateLabel && !isCreating && !editingId && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Add label
          </button>
        )}
      </div>

      {/* Create form */}
      {isCreating && renderForm()}

      {/* Edit form */}
      {editingId && renderForm()}

      {/* Labels list */}
      {!isCreating && !editingId && (
        <div className="space-y-2">
          {labels.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Tag className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No labels yet</p>
              {onCreateLabel && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Create your first label
                </button>
              )}
            </div>
          ) : (
            labels.map((label) => (
              <div
                key={label.id}
                className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50 group"
              >
                <div className="flex items-center gap-3">
                  {onReorderLabels && (
                    <GripVertical className="w-4 h-4 text-gray-300 cursor-grab opacity-0 group-hover:opacity-100" />
                  )}
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: label.color }}
                  />
                  <div>
                    <div className="flex items-center gap-1">
                      {label.icon && <span>{label.icon}</span>}
                      <span className="font-medium text-gray-900">{label.name}</span>
                      {label.is_system && (
                        <span className="text-xs text-gray-400">(system)</span>
                      )}
                    </div>
                    {label.description && (
                      <p className="text-xs text-gray-500">{label.description}</p>
                    )}
                  </div>
                </div>

                {!label.is_system && (onUpdateLabel || onDeleteLabel) && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    {onUpdateLabel && (
                      <button
                        onClick={() => startEdit(label)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {onDeleteLabel && (
                      <button
                        onClick={() => handleDelete(label.id)}
                        className={`p-1.5 rounded ${
                          deleteConfirmId === label.id
                            ? 'text-white bg-red-500'
                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                        title={deleteConfirmId === label.id ? 'Click again to confirm' : 'Delete'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default LabelManager;
