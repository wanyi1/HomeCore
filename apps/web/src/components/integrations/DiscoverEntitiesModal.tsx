import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Check,
  Cpu,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Lightbulb,
  ToggleLeft,
  Thermometer,
  Gauge,
  Radio,
} from 'lucide-react';
import { api } from '../../api/client';
import { Room, DiscoveredEntity } from '../../types';
import { useToast } from '../../context/ToastContext';

interface DiscoverEntitiesModalProps {
  integrationId: string;
  integrationName: string;
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

export const DiscoverEntitiesModal: React.FC<DiscoverEntitiesModalProps> = ({
  integrationId,
  integrationName,
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [entities, setEntities] = useState<DiscoveredEntity[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [roomAssignments, setRoomAssignments] = useState<Record<string, string>>({});
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, integrationId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [entitiesData, roomsData] = await Promise.all([
        api.integrations.discover(integrationId),
        api.rooms.list(),
      ]);
      setEntities(entitiesData);
      setRooms(roomsData);

      // 默认勾选尚未导入的在线设备
      const toSelect = new Set<string>();
      const initRooms: Record<string, string> = {};
      entitiesData.forEach((e) => {
        if (!e.already_imported && e.is_available) {
          toSelect.add(e.external_id);
        }
        if (roomsData.length > 0) {
          initRooms[e.external_id] = roomsData[0].id;
        }
      });
      setSelectedIds(toSelect);
      setRoomAssignments(initRooms);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: '实体发现失败',
        message: err.message || '无法从该集成扫描实体，请检查网关在线状态与权限',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (extId: string) => {
    const next = new Set(selectedIds);
    if (next.has(extId)) {
      next.delete(extId);
    } else {
      next.add(extId);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === entities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entities.map((e) => e.external_id)));
    }
  };

  const handleRoomChange = (extId: string, roomId: string) => {
    setRoomAssignments((prev) => ({
      ...prev,
      [extId]: roomId,
    }));
  };

  const handleBatchImport = async () => {
    if (selectedIds.size === 0) {
      showToast({
        type: 'warning',
        title: '未选择实体',
        message: '请至少勾选一个需要导入的设备实体',
      });
      return;
    }

    setImporting(true);
    try {
      const payload = entities
        .filter((e) => selectedIds.has(e.external_id))
        .map((e) => ({
          external_id: e.external_id,
          name: e.name,
          device_type: e.device_type,
          room_id: roomAssignments[e.external_id] || null,
          capabilities: e.capabilities,
          current_state: e.current_state,
          attributes: e.attributes,
          is_available: e.is_available,
        }));

      const res = await api.integrations.import(integrationId, payload);
      showToast({
        type: 'success',
        title: '批量导入成功',
        message: res.message || `已成功导入/更新 ${payload.length} 个设备！`,
      });
      if (onImportComplete) {
        onImportComplete();
      }
      onClose();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: '导入失败',
        message: err.message || '导入设备时发生异常',
      });
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'light':
        return <Lightbulb className="w-4 h-4 text-amber-400" />;
      case 'switch':
        return <ToggleLeft className="w-4 h-4 text-blue-400" />;
      case 'climate':
        return <Thermometer className="w-4 h-4 text-cyan-400" />;
      case 'sensor':
        return <Gauge className="w-4 h-4 text-emerald-400" />;
      default:
        return <Cpu className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#1E293B] flex items-center justify-between bg-[#111C35]/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <span>实体扫描与导入向导</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-normal">
                  {integrationName}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                扫描外部网关暴露的受控实体，支持类型自动映射、房间归属绑定及无损去重同步。
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-2 rounded-xl hover:bg-slate-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-sm text-slate-400">正在与外部网关建立长连接并检索实体列表...</p>
            </div>
          ) : entities.length === 0 ? (
            <div className="py-16 text-center">
              <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-300">未发现受支持的实体</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                请确认外部实例已接入且包含 light / switch / climate / sensor 领域的实体，并检查当前访问令牌权限。
              </p>
              <button
                onClick={loadData}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium transition-colors"
              >
                重新扫描
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === entities.length && entities.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                  />
                  <span>
                    全选 (已选 {selectedIds.size} / {entities.length})
                  </span>
                </div>
                <button
                  onClick={loadData}
                  className="flex items-center space-x-1.5 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>刷新扫描结果</span>
                </button>
              </div>

              <div className="divide-y divide-slate-800/60 rounded-xl border border-slate-800/80 bg-slate-900/30 overflow-hidden">
                {entities.map((item) => {
                  const isSelected = selectedIds.has(item.external_id);
                  return (
                    <div
                      key={item.external_id}
                      className={`p-3.5 flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-blue-500/5' : 'hover:bg-slate-800/30'
                      }`}
                    >
                      {/* Checkbox & Basic Info */}
                      <div className="flex items-center space-x-3.5 min-w-0 flex-1 pr-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.external_id)}
                          className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                        />
                        <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50 flex-shrink-0">
                          {getTypeIcon(item.device_type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold text-slate-200 truncate">
                              {item.name}
                            </span>
                            {item.already_imported && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>已在库中</span>
                              </span>
                            )}
                            {!item.is_available && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                离线
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-mono truncate mt-0.5 flex items-center space-x-2">
                            <span>{item.external_id}</span>
                            <span>•</span>
                            <span className="capitalize">{item.device_type}</span>
                            <span>•</span>
                            <span>状态: {item.current_state}</span>
                          </div>
                        </div>
                      </div>

                      {/* Room Selector */}
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className="text-xs text-slate-400 hidden sm:inline">归属空间:</span>
                        <select
                          value={roomAssignments[item.external_id] || ''}
                          onChange={(e) => handleRoomChange(item.external_id, e.target.value)}
                          className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                        >
                          <option value="">未分配房间</option>
                          {rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.area})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1E293B] bg-[#111C35]/50 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            已选择 <span className="text-blue-400 font-bold">{selectedIds.size}</span> 个待导入实体
          </span>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={importing}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleBatchImport}
              disabled={importing || selectedIds.size === 0}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>正在同步导入...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>执行批量导入 ({selectedIds.size})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
