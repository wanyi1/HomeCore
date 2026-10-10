import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Room } from '../types';
import { Loading } from '../components/common/Loading';
import { Modal } from '../components/common/Modal';
import {
  Grid,
  Plus,
  Edit2,
  Trash2,
  RotateCw,
  Home,
  Sofa,
  Bed,
  Utensils,
  BookOpen,
  FolderPlus,
  AlertTriangle,
} from 'lucide-react';

export const Rooms: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    area: '一楼',
    icon: 'home',
    sort_order: 0,
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchRooms = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.rooms.list();
      setRooms(data);
    } catch (err: any) {
      setError(err.message || '获取房间列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleOpenCreate = () => {
    setEditingRoom(null);
    setFormData({
      name: '',
      area: '一楼',
      icon: 'sofa',
      sort_order: (rooms.length + 1) * 10,
      description: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      area: room.area,
      icon: room.icon,
      sort_order: room.sort_order,
      description: room.description,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('请输入房间名称');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingRoom) {
        await api.rooms.update(editingRoom.id, formData);
      } else {
        await api.rooms.create(formData);
      }
      setIsModalOpen(false);
      await fetchRooms();
    } catch (err: any) {
      setFormError(err.message || '保存房间失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (room: Room) => {
    if (!window.confirm(`确定要删除房间【${room.name}】吗？\n该房间内的设备将被重置为未分配状态。`)) {
      return;
    }
    try {
      await api.rooms.delete(room.id);
      await fetchRooms();
    } catch (err: any) {
      alert(err.message || '删除房间失败');
    }
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'sofa':
        return <Sofa className="w-5 h-5 text-blue-400" />;
      case 'bed':
        return <Bed className="w-5 h-5 text-purple-400" />;
      case 'utensils':
        return <Utensils className="w-5 h-5 text-amber-400" />;
      case 'book-open':
        return <BookOpen className="w-5 h-5 text-emerald-400" />;
      default:
        return <Home className="w-5 h-5 text-cyan-400" />;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Grid className="w-5 h-5 text-blue-400" />
            <span>家庭空间组织与房间中心</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            按楼层、室内与户外划分逻辑区域，组织纳管所有智能硬件
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRooms}
            className="p-2 rounded-lg bg-[#171F30] border border-[#1E293B] text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="刷新"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-md shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>新建房间</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <Loading message="正在拉取家庭房间拓扑..." className="h-64" />
      ) : error ? (
        <div className="p-8 text-center bg-[#171F30] border border-rose-500/30 rounded-card">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="p-12 text-center bg-[#171F30] border border-[#1E293B] rounded-card">
          <FolderPlus className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-200">暂无房间记录</h3>
          <p className="text-xs text-slate-400 mt-1 mb-5">
            开始创建客厅、主卧、书房等房间，组织您的家庭硬件。
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>立即创建第一个房间</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="bg-[#171F30] border border-[#1E293B] hover:border-slate-700 rounded-card p-5 transition flex flex-col justify-between shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0B1020] border border-[#1E293B] flex items-center justify-center">
                      {renderIcon(room.icon)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100">{room.name}</h4>
                      <span className="text-[11px] text-slate-400 font-medium bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">
                        {room.area}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(room)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                      title="编辑房间"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(room)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="删除房间"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px]">
                  {room.description || '暂无描述信息'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1E293B] flex items-center justify-between text-xs">
                <div className="text-slate-400">
                  设备数: <span className="text-slate-200 font-semibold">{room.device_count}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-emerald-400 font-medium">{room.online_count} 在线</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRoom ? `编辑房间: ${editingRoom.name}` : '新建家庭房间'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-2.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              房间名称 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如: 主卧、客厅、厨房"
              className="w-full bg-[#0B1020] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">所属区域</label>
              <select
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="w-full bg-[#0B1020] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="一楼">一楼</option>
                <option value="二楼">二楼</option>
                <option value="三楼">三楼</option>
                <option value="地下室">地下室</option>
                <option value="庭院户外">庭院户外</option>
                <option value="室内">室内通用</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">图标样式</label>
              <select
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full bg-[#0B1020] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="sofa">沙发 (客厅)</option>
                <option value="bed">床 (卧室)</option>
                <option value="utensils">餐具 (厨房)</option>
                <option value="book-open">书本 (书房)</option>
                <option value="home">房屋 (通用)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">描述与备注</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="备注信息，如设备布局或位置特性"
              className="w-full bg-[#0B1020] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-[#0B1020] hover:bg-slate-800 text-slate-300 text-xs font-medium transition"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-semibold transition"
            >
              {isSubmitting ? '保存中...' : '确认保存'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
