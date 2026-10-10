import React, { useState, useEffect } from 'react';
import {
  Radio,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Play,
  Pause,
  Trash2,
  Search,
  ExternalLink,
  Shield,
  Sliders,
  Cpu,
  Key,
  Layers,
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { api } from '../api/client';
import { IntegrationConfig, Room, IntegrationTestResult } from '../types';
import { useToast } from '../context/ToastContext';
import { DiscoverEntitiesModal } from '../components/integrations/DiscoverEntitiesModal';

interface IntegrationsPageProps {
  onNavigate?: (tab: any) => void;
}

export const Integrations: React.FC<IntegrationsPageProps> = ({ onNavigate }) => {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'homeassistant' | 'mqtt'>('homeassistant');
  const { showToast } = useToast();

  // HA Form state
  const [haUrl, setHaUrl] = useState('http://127.0.0.1:8123');
  const [haToken, setHaToken] = useState('');
  const [haShowToken, setHaShowToken] = useState(false);
  const [haTesting, setHaTesting] = useState(false);
  const [haDiag, setHaDiag] = useState<IntegrationTestResult | null>(null);

  // MQTT Form state
  const [mqttHost, setMqttHost] = useState('127.0.0.1');
  const [mqttPort, setMqttPort] = useState(1883);
  const [mqttUsername, setMqttUsername] = useState('');
  const [mqttPassword, setMqttPassword] = useState('');
  const [mqttClientId, setMqttClientId] = useState('homecore_gw_01');
  const [mqttTls, setMqttTls] = useState(false);
  const [mqttQos, setMqttQos] = useState(1);
  const [mqttBaseTopic, setMqttBaseTopic] = useState('homecore');
  const [mqttTesting, setMqttTesting] = useState(false);
  const [mqttDiag, setMqttDiag] = useState<IntegrationTestResult | null>(null);

  // MQTT Manual Device Register state
  const [showMqttRegister, setShowMqttRegister] = useState(false);
  const [mqttDevId, setMqttDevId] = useState('');
  const [mqttDevName, setMqttDevName] = useState('');
  const [mqttDevType, setMqttDevType] = useState('switch');
  const [mqttDevRoom, setMqttDevRoom] = useState('');

  // Discover modal
  const [discoverModalOpen, setDiscoverModalOpen] = useState(false);
  const [activeIntegrationForDiscover, setActiveIntegrationForDiscover] = useState<IntegrationConfig | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const [integData, roomsData] = await Promise.all([
        api.integrations.list(),
        api.rooms.list(),
      ]);
      setIntegrations(integData);
      setRooms(roomsData);

      // 填充表单
      const ha = integData.find((i) => i.integration_type === 'homeassistant');
      if (ha) {
        setHaUrl(ha.config.url || 'http://127.0.0.1:8123');
        setHaToken(ha.config.token || '');
      }

      const mqtt = integData.find((i) => i.integration_type === 'mqtt');
      if (mqtt) {
        setMqttHost(mqtt.config.host || '127.0.0.1');
        setMqttPort(mqtt.config.port || 1883);
        setMqttUsername(mqtt.config.username || '');
        setMqttPassword(mqtt.config.password || '');
        setMqttClientId(mqtt.config.client_id || 'homecore_gw_01');
        setMqttTls(!!mqtt.config.tls_enabled);
        setMqttQos(mqtt.config.qos ?? 1);
        setMqttBaseTopic(mqtt.config.base_topic || 'homecore');
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: '加载集成配置失败',
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const currentHa = integrations.find((i) => i.integration_type === 'homeassistant');
  const currentMqtt = integrations.find((i) => i.integration_type === 'mqtt');

  // ==================== Home Assistant 动作 ====================

  const testHaConnection = async () => {
    setHaTesting(true);
    setHaDiag(null);
    try {
      let diag: IntegrationTestResult;
      if (currentHa && (!haToken || haToken.includes('...'))) {
        // 使用已存安全配置测试
        diag = await api.integrations.testSaved(currentHa.id);
      } else {
        // 使用当前表单临时测试
        diag = await api.integrations.testAdhoc({
          integration_type: 'homeassistant',
          config: { url: haUrl, token: haToken },
        });
      }
      setHaDiag(diag);
      if (diag.success) {
        showToast({
          type: 'success',
          title: 'Home Assistant 连接成功',
          message: `版本: ${diag.version}，扫描到 ${diag.entity_count} 个实体，延迟: ${diag.latency_ms}ms`,
        });
      } else {
        showToast({
          type: 'error',
          title: '连接测试未通过',
          message: diag.error || '无法与 Home Assistant 实例通信',
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: '诊断异常',
        message: err.message,
      });
    } finally {
      setHaTesting(false);
    }
  };

  const saveHaIntegration = async () => {
    try {
      if (currentHa) {
        const payload: any = {
          name: currentHa.name,
          config: { url: haUrl },
          is_enabled: true,
        };
        if (haToken && !haToken.includes('...')) {
          payload.config.token = haToken;
        }
        await api.integrations.update(currentHa.id, payload);
        showToast({
          type: 'success',
          title: '更新成功',
          message: 'Home Assistant 配置已更新并重新启动长连接监听',
        });
      } else {
        await api.integrations.create({
          integration_type: 'homeassistant',
          name: '主家庭 Home Assistant',
          config: { url: haUrl, token: haToken },
          is_enabled: true,
        });
        showToast({
          type: 'success',
          title: '创建成功',
          message: '已添加 Home Assistant 集成并激活 WebSocket 状态监听',
        });
      }
      loadIntegrations();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: '保存失败',
        message: err.message,
      });
    }
  };

  const openHaDiscover = () => {
    if (!currentHa) {
      showToast({
        type: 'warning',
        title: '请先保存配置',
        message: '请先保存并启用 Home Assistant 集成后再进行实体发现',
      });
      return;
    }
    setActiveIntegrationForDiscover(currentHa);
    setDiscoverModalOpen(true);
  };

  // ==================== MQTT 动作 ====================

  const testMqttConnection = async () => {
    setMqttTesting(true);
    setMqttDiag(null);
    try {
      let diag: IntegrationTestResult;
      if (currentMqtt && (!mqttPassword || mqttPassword.includes('...'))) {
        diag = await api.integrations.testSaved(currentMqtt.id);
      } else {
        diag = await api.integrations.testAdhoc({
          integration_type: 'mqtt',
          config: {
            host: mqttHost,
            port: mqttPort,
            username: mqttUsername,
            password: mqttPassword,
            client_id: mqttClientId,
            tls_enabled: mqttTls,
            qos: mqttQos,
          },
        });
      }
      setMqttDiag(diag);
      if (diag.success) {
        showToast({
          type: 'success',
          title: 'MQTT 握手成功',
          message: `Broker: ${mqttHost}:${mqttPort} 响应正常，延迟: ${diag.latency_ms}ms`,
        });
      } else {
        showToast({
          type: 'error',
          title: 'MQTT 连接失败',
          message: diag.error || '无法与 Broker 建立 TCP/TLS 连接',
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'MQTT 诊断异常',
        message: err.message,
      });
    } finally {
      setMqttTesting(false);
    }
  };

  const saveMqttIntegration = async () => {
    try {
      const cfg: any = {
        host: mqttHost,
        port: Number(mqttPort),
        username: mqttUsername,
        client_id: mqttClientId,
        tls_enabled: mqttTls,
        qos: Number(mqttQos),
        base_topic: mqttBaseTopic,
      };
      if (mqttPassword && !mqttPassword.includes('...')) {
        cfg.password = mqttPassword;
      }

      if (currentMqtt) {
        await api.integrations.update(currentMqtt.id, {
          name: currentMqtt.name,
          config: cfg,
          is_enabled: true,
        });
        showToast({
          type: 'success',
          title: 'MQTT 配置已更新',
          message: '已重启 MQTT 客户端并重新订阅白名单主题',
        });
      } else {
        await api.integrations.create({
          integration_type: 'mqtt',
          name: '本地 MQTT Broker',
          config: cfg,
          is_enabled: true,
        });
        showToast({
          type: 'success',
          title: 'MQTT 集成已建立',
          message: '已连接至 Broker 并发布网关上线保活报文',
        });
      }
      loadIntegrations();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: '保存失败',
        message: err.message,
      });
    }
  };

  const handleRegisterMqttDevice = async () => {
    if (!mqttDevId || !mqttDevName) {
      showToast({
        type: 'warning',
        title: '请填写完整信息',
        message: '设备标识与设备名称不能为空',
      });
      return;
    }

    try {
      if (!currentMqtt) {
        showToast({
          type: 'warning',
          title: '未找到 MQTT 集成',
          message: '请先保存并连接 MQTT 集成后再登记设备',
        });
        return;
      }

      const caps = mqttDevType === 'light' ? ['switch', 'brightness'] : (mqttDevType === 'climate' ? ['switch', 'temperature'] : ['switch']);

      await api.integrations.import(currentMqtt.id, [
        {
          external_id: mqttDevId,
          name: mqttDevName,
          device_type: mqttDevType,
          room_id: mqttDevRoom || null,
          capabilities: caps,
          current_state: 'off',
          is_available: true,
        },
      ]);

      showToast({
        type: 'success',
        title: 'MQTT 设备登记完成',
        message: `设备【${mqttDevName}】已登记，订阅主题: ${mqttBaseTopic}/device/${mqttDevId}/state`,
      });
      setShowMqttRegister(false);
      setMqttDevId('');
      setMqttDevName('');
      loadIntegrations();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: '登记失败',
        message: err.message,
      });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#1E2D4A]">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-3">
                <span>真实物联网接入中枢</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                  V0.3 IoT Core
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                统一连接 Home Assistant 实例与 MQTT Broker，实现真实物理设备控制、WebSocket 双工实时状态同步与去重导入。
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center space-x-3">
          <button
            onClick={loadIntegrations}
            disabled={loading}
            className="px-4 py-2 bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-medium flex items-center space-x-2 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>刷新连接状态</span>
          </button>
          {onNavigate && (
            <button
              onClick={() => onNavigate('devices')}
              className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-blue-300 rounded-xl text-xs font-medium flex items-center space-x-2 transition-colors"
            >
              <span>查看全部设备</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Protocol Selection Switcher */}
      <div className="flex items-center space-x-3 p-1.5 bg-[#0F172A] rounded-2xl border border-slate-800 w-fit">
        <button
          onClick={() => setActiveTab('homeassistant')}
          className={`flex items-center space-x-2.5 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'homeassistant'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Home Assistant 实例</span>
          {currentHa && (
            <span
              className={`w-2 h-2 rounded-full ${
                currentHa.status === 'connected' ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
          )}
        </button>

        <button
          onClick={() => setActiveTab('mqtt')}
          className={`flex items-center space-x-2.5 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'mqtt'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>MQTT 物联网网关</span>
          {currentMqtt && (
            <span
              className={`w-2 h-2 rounded-full ${
                currentMqtt.status === 'connected' ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
          )}
        </button>
      </div>

      {/* TAB 1: Home Assistant */}
      {activeTab === 'homeassistant' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Config Form */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Home Assistant 实例配置</h3>
                  <p className="text-xs text-slate-400">
                    支持通过 REST API 发现实体与下发指令，通过 WebSocket 进行双工长连接监听。
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              {currentHa && (
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center space-x-1.5 ${
                    currentHa.status === 'connected'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      currentHa.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                    }`}
                  />
                  <span>{currentHa.status === 'connected' ? '已连接 (双工监听中)' : '未连接 / 异常'}</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Home Assistant 实例地址 (URL)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={haUrl}
                    onChange={(e) => setHaUrl(e.target.value)}
                    placeholder="例如: http://192.168.1.100:8123"
                    className="w-full bg-slate-900/80 border border-slate-700/80 text-slate-100 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  局域网 Home Assistant 服务器 IP 或域名，通常端口为 8123。
                </p>
              </div>

              {/* Token */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>长期访问令牌 (Long-Lived Access Token)</span>
                  <span className="text-[10px] text-blue-400 font-normal">后端安全加密存储，防明文泄露</span>
                </label>
                <div className="relative">
                  <input
                    type={haShowToken ? 'text' : 'password'}
                    value={haToken}
                    onChange={(e) => setHaToken(e.target.value)}
                    placeholder={currentHa ? '已配置安全令牌 (如需更换请重新输入)' : '在此粘贴由 Home Assistant 个人资料页生成的长期令牌'}
                    className="w-full bg-slate-900/80 border border-slate-700/80 text-slate-100 text-sm rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setHaShowToken(!haShowToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {haShowToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  在 HA 左下角个人资料 → 长期访问令牌 (Long-Lived Access Tokens) 中创建。
                </p>
              </div>
            </div>

            {/* Test Diagnostic Output */}
            {haDiag && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-1.5 animate-in fade-in duration-200 ${
                  haDiag.success
                    ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/5 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="font-bold flex items-center space-x-2">
                  {haDiag.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>{haDiag.success ? '实例连通性探测正常' : '探测未通过'}</span>
                </div>
                {haDiag.success ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-300">
                    <div>版本: <span className="text-white font-mono">{haDiag.version}</span></div>
                    <div>空间: <span className="text-white">{haDiag.location_name}</span></div>
                    <div>实体数: <span className="text-white font-mono">{haDiag.entity_count}</span></div>
                    <div>延迟: <span className="text-white font-mono">{haDiag.latency_ms} ms</span></div>
                  </div>
                ) : (
                  <p className="text-rose-400">{haDiag.error}</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center space-x-3">
                <button
                  onClick={testHaConnection}
                  disabled={haTesting}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-colors disabled:opacity-50"
                >
                  <Activity className={`w-3.5 h-3.5 ${haTesting ? 'animate-spin' : ''}`} />
                  <span>{haTesting ? '正在探测...' : '测试连通性'}</span>
                </button>

                <button
                  onClick={saveHaIntegration}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/20 flex items-center space-x-2 transition-all"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>保存并建立长连接</span>
                </button>
              </div>

              {currentHa && (
                <button
                  onClick={openHaDiscover}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center space-x-2 transition-all"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>扫描并发现实体 ({currentHa.device_count} 已导入)</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Information & Architecture Guide */}
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <span>双工接入机制与安全</span>
              </h4>
              <ul className="text-xs text-slate-400 space-y-2.5 leading-relaxed">
                <li className="flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 flex-shrink-0" />
                  <span><strong>REST API:</strong> 用于获取实例配置、扫描全部实体以及下发服务指令。</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 flex-shrink-0" />
                  <span><strong>WebSocket:</strong> 建立状态变化长连接订阅，毫秒级同步开关与物理调光状态。</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1 flex-shrink-0" />
                  <span><strong>无损去重:</strong> 重复扫描或重新导入时，系统会自动匹配实体并更新，不会产生多余重复设备。</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 flex-shrink-0" />
                  <span><strong>数据诚实原则:</strong> HA 实例或物理硬件离线时，界面严格展示未连接，禁止伪造数据。</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MQTT Broker */}
      {activeTab === 'mqtt' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main MQTT Config */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">MQTT Broker 核心配置</h3>
                  <p className="text-xs text-slate-400">
                    基于 paho-mqtt 接入家庭局域网 Broker (如 EMQX、Mosquitto)，通过主题白名单安全订阅设备报文。
                  </p>
                </div>
              </div>

              {currentMqtt && (
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center space-x-1.5 ${
                    currentMqtt.status === 'connected'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      currentMqtt.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                    }`}
                  />
                  <span>{currentMqtt.status === 'connected' ? '在线监听中' : '未连接'}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Broker 主机 / IP
                </label>
                <input
                  type="text"
                  value={mqttHost}
                  onChange={(e) => setMqttHost(e.target.value)}
                  placeholder="127.0.0.1 或 192.168.1.x"
                  className="w-full bg-slate-900/80 border border-slate-700/80 text-slate-100 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  端口 (Port)
                </label>
                <input
                  type="number"
                  value={mqttPort}
                  onChange={(e) => setMqttPort(Number(e.target.value))}
                  placeholder="默认 1883"
                  className="w-full bg-slate-900/80 border border-slate-700/80 text-slate-100 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  用户名 (可选)
                </label>
                <input
                  type="text"
                  value={mqttUsername}
                  onChange={(e) => setMqttUsername(e.target.value)}
                  placeholder="留空则为匿名连接"
                  className="w-full bg-slate-900/80 border border-slate-700/80 text-slate-100 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  密码 (可选)
                </label>
                <input
                  type="password"
                  value={mqttPassword}
                  onChange={(e) => setMqttPassword(e.target.value)}
                  placeholder={currentMqtt ? '已安全存储 (如需修改请输入)' : '留空则为无密码'}
                  className="w-full bg-slate-900/80 border border-slate-700/80 text-slate-100 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Client ID 标识
                </label>
                <input
                  type="text"
                  value={mqttClientId}
                  onChange={(e) => setMqttClientId(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700/80 text-slate-100 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  根主题前缀 (Base Topic)
                </label>
                <input
                  type="text"
                  value={mqttBaseTopic}
                  onChange={(e) => setMqttBaseTopic(e.target.value)}
                  placeholder="homecore"
                  className="w-full bg-slate-900/80 border border-slate-700/80 text-slate-100 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Diagnostic Output */}
            {mqttDiag && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                  mqttDiag.success
                    ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/5 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="font-bold flex items-center space-x-2">
                  {mqttDiag.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>{mqttDiag.message || (mqttDiag.success ? 'MQTT 连通正常' : 'MQTT 握手失败')}</span>
                </div>
                {mqttDiag.error && <p className="text-rose-400">{mqttDiag.error}</p>}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center space-x-3">
                <button
                  onClick={testMqttConnection}
                  disabled={mqttTesting}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-colors disabled:opacity-50"
                >
                  <Activity className={`w-3.5 h-3.5 ${mqttTesting ? 'animate-spin' : ''}`} />
                  <span>{mqttTesting ? '握手中...' : '测试连接'}</span>
                </button>

                <button
                  onClick={saveMqttIntegration}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 flex items-center space-x-2 transition-all"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>保存 MQTT 配置</span>
                </button>
              </div>

              {currentMqtt && (
                <button
                  onClick={() => setShowMqttRegister(true)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>快捷登记 MQTT 设备 ({currentMqtt.device_count})</span>
                </button>
              )}
            </div>

            {/* Register MQTT Device Sub-Panel */}
            {showMqttRegister && (
              <div className="mt-4 p-5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-indigo-300 flex items-center space-x-2">
                    <Sliders className="w-4 h-4" />
                    <span>快捷登记 MQTT 设备与 Topic 白名单</span>
                  </h4>
                  <button
                    onClick={() => setShowMqttRegister(false)}
                    className="text-slate-400 hover:text-slate-200 text-xs"
                  >
                    取消
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">设备外部唯一标识 (ID)</label>
                    <input
                      type="text"
                      value={mqttDevId}
                      onChange={(e) => setMqttDevId(e.target.value)}
                      placeholder="如: living_lamp_01"
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">设备友好名称</label>
                    <input
                      type="text"
                      value={mqttDevName}
                      onChange={(e) => setMqttDevName(e.target.value)}
                      placeholder="如: 客厅落地灯"
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">设备类型</label>
                    <select
                      value={mqttDevType}
                      onChange={(e) => setMqttDevType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2"
                    >
                      <option value="switch">开关插座 (Switch)</option>
                      <option value="light">照明灯具 (Light)</option>
                      <option value="climate">环境温控 (Climate)</option>
                      <option value="sensor">环境传感 (Sensor)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">归属空间</label>
                    <select
                      value={mqttDevRoom}
                      onChange={(e) => setMqttDevRoom(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2"
                    >
                      <option value="">未分配房间</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleRegisterMqttDevice}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all"
                  >
                    确认登记并建立订阅
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Rules */}
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                <Shield className="w-4 h-4 text-indigo-400" />
                <span>MQTT 安全与 Topic 规范</span>
              </h4>
              <ul className="text-xs text-slate-400 space-y-2.5 leading-relaxed">
                <li className="flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1 flex-shrink-0" />
                  <span><strong>严禁滥用全量通配符:</strong> 拒绝全局订阅 <code>#</code>，采用白名单精准订阅已登记设备的 <code>state</code> 与 <code>telemetry</code>。</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 flex-shrink-0" />
                  <span><strong>规范指令通道:</strong> 下发控制写入 <code>{mqttBaseTopic}/device/&#123;id&#125;/set</code>。</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 flex-shrink-0" />
                  <span><strong>设备确认握手:</strong> 下发 QoS 1 保证投递，并在收到设备 <code>state</code> 回传后标记状态同步。</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Discover Modal */}
      {discoverModalOpen && activeIntegrationForDiscover && (
        <DiscoverEntitiesModal
          integrationId={activeIntegrationForDiscover.id}
          integrationName={activeIntegrationForDiscover.name}
          isOpen={discoverModalOpen}
          onClose={() => setDiscoverModalOpen(false)}
          onImportComplete={loadIntegrations}
        />
      )}
    </div>
  );
};
