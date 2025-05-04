import { useState, useEffect, Component, ReactNode } from 'react'
import './App.css'
import { parseShortcut } from './utils/parser'
import { API_CONFIG, UI_CONFIG, FEATURES } from './config'

// 内联样式，确保即使Tailwind CSS加载失败也有基本样式
const styles = {
  container: {
    minHeight: '100vh',
    padding: '1rem',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  card: {
    width: '90%',
    margin: '0 auto',
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  header: {
    padding: '1.25rem',
    backgroundColor: '#4361ee',
    color: 'white',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#e0e7ff',
    margin: '0.5rem 0 0 0',
  },
  body: {
    padding: '1.5rem',
  },
  resultCard: {
    backgroundColor: 'white',
    borderRadius: '0.375rem',
    padding: '1.5rem',
  },
  pre: {
    backgroundColor: '#1e293b',
    color: '#e5e7eb',
    padding: '1rem',
    borderRadius: '0.375rem',
    overflow: 'auto',
    fontSize: '0.875rem',
    maxHeight: '600px', // 增加最大高度
  },
  actionsList: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '0.375rem',
    padding: '0.5rem',
    margin: '1rem 0',
    maxHeight: '200px',
    overflow: 'auto',
  },
  actionItem: {
    padding: '0.25rem 0',
    borderBottom: '1px solid #f3f4f6',
    fontSize: '0.875rem',
  },
  statsBox: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap' as const,
    margin: '1rem 0',
  },
  statItem: {
    backgroundColor: '#f3f4f6',
    padding: '0.5rem',
    borderRadius: '0.375rem',
    fontSize: '0.75rem',
    color: '#4b5563',
  },
  buttonGroup: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.5rem',
    marginTop: '1rem',
  },
  button: {
    padding: '0.25rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: '500' as const,
    borderRadius: '9999px',
    cursor: 'pointer',
    border: 'none',
  },
  copyButton: {
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
  },
  downloadButton: {
    backgroundColor: '#d1fae5',
    color: '#047857',
  },
  exportButton: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  backButton: {
    marginTop: '1rem',
    backgroundColor: '#e5e7eb',
    color: '#4b5563',
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
    border: 'none',
  },
  footer: {
    padding: '0.75rem 1rem',
    backgroundColor: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
    textAlign: 'right' as const,
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    marginBottom: '1rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500' as const,
    color: '#374151',
  },
  error: {
    color: '#ef4444',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  loader: {
    display: 'inline-block',
    width: '1rem',
    height: '1rem',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '50%',
    borderTopColor: 'white',
    animation: 'spin 1s ease-in-out infinite',
    marginRight: '0.5rem',
  },
}

// 添加错误边界接口
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

// 添加简单的错误边界组件
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("渲染错误:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#fee2e2', 
          color: '#b91c1c',
          borderRadius: '0.5rem',
          margin: '1rem'
        }}>
          <h2>渲染出错</h2>
          <p>发生错误: {this.state.error && this.state.error.toString()}</p>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '1rem' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#e5e7eb',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            刷新页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [inputText, setInputText] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [displayMode, setDisplayMode] = useState<'json' | 'details'>('json')
  const [outputFormat, setOutputFormat] = useState<'json' | 'xml'>(API_CONFIG.DEFAULT_FORMAT)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [rawData, setRawData] = useState<string>('') // 存储原始响应数据

  // 获取GitHub仓库星星数量
  const fetchGitHubStars = async () => {
    try {
      const repoUrl = 'https://api.github.com/repos/huangzhuxing/ShortcutSourceTool';
      const response = await fetch(repoUrl);
      const data = await response.json();
      
      if (data.stargazers_count !== undefined) {
        const starsElement = document.getElementById('github-stars');
        if (starsElement) {
          starsElement.textContent = data.stargazers_count.toString();
        }
      }
    } catch (error) {
      console.error('获取GitHub星星数量失败:', error);
    }
  };

  useEffect(() => {
    // 页面加载时获取GitHub星星数量
    fetchGitHubStars();
  }, []);

  // 添加调试日志
  useEffect(() => {
    if (result) {
      // 如果没有format属性，添加一个默认值以避免渲染错误
      if (result && !result.format) {
        setResult((prev: any) => ({
          ...prev,
          format: 'json'
        }))
      }

      try {
        // 测试序列化，检查是否有循环引用等问题
        JSON.stringify(result); // 移除未使用的变量声明，直接调用函数
      } catch (e) {
        console.error('结果序列化失败:', e);
        // 尝试创建一个可序列化的版本
        const safeResult = createSafeDisplayObject(result);
        setResult(safeResult);
        setRenderError(`原始结果序列化失败，已创建显示版本: ${e instanceof Error ? e.message : '未知错误'}`);
      }
    }
  }, [result])

  // 创建一个安全可显示的对象
  const createSafeDisplayObject = (obj: any) => {
    // 如果不是对象，直接返回
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    try {
      // 尝试直接复制，如果成功就返回
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      console.log('需要深度处理对象以避免循环引用');
      
      // 创建一个新对象用于存储
      const safeObj: any = Array.isArray(obj) ? [] : {};
      
      // 提取重要属性
      const keysToCopy = [
        'WFWorkflowName', 
        'WFWorkflowMinimumClientVersionString',
        'WFWorkflowClientVersion',
        'WFWorkflowIcon',
        'WFWorkflowActions',
        'format',
        'sourceType',
        'summary'
      ];
      
      // 复制重要属性
      for (const key of keysToCopy) {
        if (obj[key] !== undefined) {
          try {
            // 尝试深度复制
            safeObj[key] = JSON.parse(JSON.stringify(obj[key]));
          } catch (err) {
            // 如果失败，则用简单描述替代
            safeObj[key] = `[复杂对象: ${typeof obj[key]}]`;
          }
        }
      }
      
      // 添加格式信息
      safeObj.format = obj.format || 'json';
      safeObj.sourceType = obj.sourceType || 'unknown';
      
      // 如果有动作列表，尝试复制
      if (obj.WFWorkflowActions) {
        try {
          safeObj.WFWorkflowActions = JSON.parse(JSON.stringify(obj.WFWorkflowActions));
        } catch (err) {
          // 创建简化版本
          safeObj.WFWorkflowActions = obj.WFWorkflowActions.map((action: any, index: number) => ({
            index,
            WFWorkflowActionIdentifier: action.WFWorkflowActionIdentifier || '未知动作'
          }));
        }
      }
      
      return safeObj;
    }
  }

  // 处理输入文本的变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value)
  }

  // 处理输出格式变化
  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOutputFormat(e.target.value as 'json' | 'xml')
  }

  // 获取快捷指令数据的函数
  const fetchShortcutData = async (url: string, format: 'json' | 'xml') => {
    setLoading(true)
    setError('')
    setRawData('')

    try {
      // 清理输入的链接，去除多余的空格和换行符
      const cleanedUrl = url.trim()
      
      // 使用参数化的API进行解析
      const apiUrl = `${API_CONFIG.BASE_URL}?shortcuturl=${encodeURIComponent(cleanedUrl)}&fmt=${format}`
      
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
      }
      
      // 获取原始响应文本
      const responseText = await response.text()
      
      // 保存原始数据用于调试和显示
      setRawData(responseText)
      
      // 极简结果对象 - 只包含最基本的信息
      const simpleResult: any = {
        sourceType: 'iCloudLink',
        format: format,
      }
      
      // 极简处理 - 只提取名称和动作数量
      if (format === 'json') {
        try {
          // 尝试解析JSON以便提取基本信息
          const jsonObject = JSON.parse(responseText)
          
          // 只提取名称
          if (jsonObject.WFWorkflowName) {
            simpleResult.name = jsonObject.WFWorkflowName
          }
          
          // 提取动作数量
          if (jsonObject.WFWorkflowActions && Array.isArray(jsonObject.WFWorkflowActions)) {
            simpleResult.actionsCount = jsonObject.WFWorkflowActions.length
            
            // 不保存实际的动作列表，而只保存一个极简化版本
            simpleResult.actions = jsonObject.WFWorkflowActions.map((action: any) => 
              action.WFWorkflowActionIdentifier || '未知动作'
            ).slice(0, 5) // 只保存前5个动作ID，用于快速预览
          }
        } catch (e) {
          console.error('JSON解析出错:', e)
          // 解析错误时不抛出异常，继续处理
        }
      }
      
      setResult(simpleResult)
      setDisplayMode('json') // 默认显示JSON视图
      return simpleResult
    } catch (err) {
      console.error('解析错误:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // 提交处理
  const handleSubmit = async () => {
    if (!inputText.trim()) {
      setError('请输入快捷指令iCloud链接')
      return
    }

    try {
      // 检查输入是否为iCloud链接
      if (inputText.includes('icloud.com/shortcuts/')) {
        await fetchShortcutData(inputText, outputFormat)
        // 确保显示模式设置正确
        setDisplayMode('json') // 始终以JSON模式显示，无论是XML还是JSON格式
      } else {
        // 对于非iCloud链接的输入，继续使用本地解析功能
        console.log('使用本地解析功能')
        const parseResult = await parseShortcut(inputText)
        
        console.log('本地解析结果:', parseResult ? '成功' : '失败')
        
        if (!parseResult) {
          setError('无法解析快捷指令数据')
          return
        }
        
        setResult(parseResult)
        setDisplayMode('json') // 默认显示JSON模式
      }
    } catch (err) {
      console.error('解析错误:', err)
      setError(`解析快捷指令失败: ${err instanceof Error ? err.message : '未知错误'}`)
    }
  }

  // 复制代码
  const handleCopyCode = () => {
    // 首先尝试使用rawData
    if (rawData && rawData.length > 0) {
      console.log('使用rawData复制内容, 长度:', rawData.length);
      navigator.clipboard.writeText(rawData)
        .then(() => alert('已复制到剪贴板'))
        .catch(err => console.error('复制失败:', err));
      return;
    }
    
    // 如果没有rawData，使用老的逻辑
    if (result) {
      let contentToCopy = '';
      
      // 使用统一的rawContent字段
      if (result.rawContent) {
        contentToCopy = result.rawContent;
      } else {
        // 备用逻辑
        if (result.format === 'xml') {
          contentToCopy = result.xmlContent || '';
        } else {
          contentToCopy = JSON.stringify(result, null, 2);
        }
      }
      
      navigator.clipboard.writeText(contentToCopy)
        .then(() => alert('已复制到剪贴板'))
        .catch(err => console.error('复制失败:', err));
    }
  };

  // 下载JSON或XML
  const handleDownload = () => {
    // 首先尝试使用rawData
    if (result && rawData && rawData.length > 0) {
      console.log('使用rawData下载内容, 长度:', rawData.length);
      
      // 确定文件类型和名称
      const fileType = result.format === 'xml' ? 'application/xml' : 'application/json';
      const fileExt = result.format === 'xml' ? 'xml' : 'json';
      const fileName = `${getShortcutName() || 'shortcut'}.${fileExt}`;
      
      // 使用原始响应数据
      const blob = new Blob([rawData], { type: fileType });
      const url = URL.createObjectURL(blob);
      
      // 创建下载链接并触发下载
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      // 清理资源
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return;
    }
    
    // 如果没有rawData，使用老的逻辑
    if (result) {
      let fileContent = '';
      let fileName = '';
      let fileType = '';
      
      // 使用统一的rawContent字段
      if (result.rawContent) {
        fileContent = result.rawContent;
        fileName = `${getShortcutName() || 'shortcut'}.${result.format}`;
        fileType = result.format === 'xml' ? 'application/xml' : 'application/json';
      } else {
        // 备用逻辑
        if (result.format === 'xml') {
          fileContent = result.xmlContent || '';
          fileName = `${getShortcutName() || 'shortcut'}.xml`;
          fileType = 'application/xml';
        } else {
          let jsonData = result;
          // 对于iCloud链接，如果有原始数据，导出更完整的内容
          if (result.sourceType === 'iCloudLink' && result._rawData) {
            if (result._rawData.shortcut && result._rawData.shortcut.fields) {
              jsonData = result._rawData.shortcut.fields;
            }
          }
          
          fileContent = JSON.stringify(jsonData, null, 2);
          fileName = `${getShortcutName() || 'shortcut'}.json`;
          fileType = 'application/json';
        }
      }
      
      const blob = new Blob([fileContent], { type: fileType });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  // 返回输入界面
  const handleBack = () => {
    setResult(null)
    setInputText('')
  }

  // 切换显示模式
  const handleToggleDisplayMode = () => {
    setDisplayMode(prev => prev === 'json' ? 'details' : 'json')
  }

  // 模拟导出为Web查看
  const handleExportToWeb = () => {
    if (FEATURES.ENABLE_WEB_EXPORT) {
      // 如果功能已启用，实现导出逻辑
      // TODO: 实现Web导出功能
    } else {
      alert('网页查看功能即将上线')
    }
  }
  
  // 获取动作列表
  const getActions = () => {
    if (!result) {
      console.log('getActions: 结果为空')
      return []
    }
    
    console.log('getActions: 开始获取动作列表', typeof result)
    
    try {
      // 从result中获取WFWorkflowActions
      if (result.WFWorkflowActions && Array.isArray(result.WFWorkflowActions)) {
        console.log('getActions: 从result.WFWorkflowActions获取, 数量:', result.WFWorkflowActions.length)
        return result.WFWorkflowActions
      }
      
      // 如果有原始JSON内容，尝试解析
      if (result.format === 'json' && result.rawContent) {
        try {
          console.log('getActions: 尝试从rawContent解析')
          const jsonData = JSON.parse(result.rawContent)
          if (jsonData.WFWorkflowActions && Array.isArray(jsonData.WFWorkflowActions)) {
            console.log('getActions: 从rawContent获取, 数量:', jsonData.WFWorkflowActions.length)
            return jsonData.WFWorkflowActions
          }
        } catch (e) {
          console.error('getActions: 从rawContent解析失败', e)
        }
      }
      
      // 对于iCloud链接，尝试从_rawData中获取
      if (result._rawData?.shortcut?.fields?.WFWorkflowActions) {
        console.log('getActions: 从_rawData中获取, 数量:', result._rawData.shortcut.fields.WFWorkflowActions.length)
        return result._rawData.shortcut.fields.WFWorkflowActions
      }
      
      console.log('getActions: 未找到动作列表')
      return []
    } catch (e) {
      console.error('getActions错误:', e)
      return []
    }
  }
  
  // 获取快捷指令名称
  const getShortcutName = () => {
    if (!result) return '未知快捷指令'
    
    return result.WFWorkflowName || 
           result.name || 
           result._rawData?.name ||
           result._rawData?.shortcut?.fields?.WFWorkflowName ||
           '未命名快捷指令'
  }
  
  // 获取版本信息
  const getVersionInfo = () => {
    if (!result) return null
    
    return result.WFWorkflowMinimumClientVersionString || 
           result._rawData?.shortcut?.fields?.WFWorkflowMinimumClientVersionString
  }
  
  // 获取客户端版本
  const getClientVersion = () => {
    if (!result) return null
    
    return result.WFWorkflowClientVersion || 
           result._rawData?.shortcut?.fields?.WFWorkflowClientVersion
  }

  return (
    <div style={{
      ...styles.container,
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
    }}>
      <ErrorBoundary>
        <div style={{
          ...styles.card,
          width: '90%',
          maxWidth: '1400px',
        }}>
          <div style={styles.header}>
            <h1 style={styles.title}>{UI_CONFIG.APP_TITLE}</h1>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={styles.subtitle}>{UI_CONFIG.APP_SUBTITLE}</p>
              <a 
                href="https://github.com/huangzhuxing/ShortcutSourceTool.git" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: 'white',
                  textDecoration: 'none',
                  gap: '0.25rem',
                  fontSize: '0.8rem'
                }}
              >
                <svg height="16" width="16" viewBox="0 0 16 16" version="1.1" aria-hidden="true" fill="white">
                  <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                </svg>
                <span>GitHub</span>
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  padding: '0.1rem 0.3rem',
                  borderRadius: '0.25rem',
                  marginLeft: '0.25rem',
                  fontSize: '0.75rem'
                }}>
                  <span>⭐</span>
                  <span id="github-stars">0</span>
                </span>
                <span style={{ marginLeft: '0.25rem' }}>🫰</span>
              </a>
            </div>
          </div>

          <div style={{
            ...styles.body,
            width: '100%',
            boxSizing: 'border-box' as const,
          }}>
            {/* 显示渲染错误 */}
            {renderError && (
              <div style={{ 
                padding: '0.75rem',
                backgroundColor: '#fee2e2', 
                color: '#b91c1c',
                borderRadius: '0.375rem',
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                <strong>渲染错误：</strong> {renderError}
              </div>
            )}

            {!result ? (
              <>
                <label style={styles.label} htmlFor="shortcut-input">
                  快捷指令iCloud链接
                </label>
                <textarea
                  id="shortcut-input"
                  style={{...styles.input, height: '120px'}}
                  value={inputText}
                  onChange={handleInputChange}
                  placeholder="在此粘贴快捷指令的iCloud链接 (https://www.icloud.com/shortcuts/...)"
                />
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={styles.label} htmlFor="format-select">
                    输出格式
                  </label>
                  <select
                    id="format-select"
                    style={{...styles.input, height: 'auto', marginBottom: '0'}}
                    value={outputFormat}
                    onChange={handleFormatChange}
                  >
                    {API_CONFIG.FORMAT_OPTIONS.map(format => (
                      <option key={format} value={format}>{format.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                
                {error && <div style={styles.error}>{error}</div>}
                
                <button
                  style={{...styles.button, ...styles.exportButton, padding: '0.5rem 1rem', fontSize: '0.875rem'}}
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading && (
                    <span className="loader" style={styles.loader}></span>
                  )}
                  {loading ? '处理中...' : '解析'}
                </button>
              </>
            ) : (
              // 使用try-catch来捕获渲染错误
              (() => {
                try {
                  return (
                    <div style={{
                      ...styles.resultCard,
                      width: '100%',
                      boxSizing: 'border-box' as const,
                    }}>
                      {/* 快捷指令基本信息 */}
                      <div style={{ marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0' }}>
                          {getShortcutName()}
                        </h2>
                        
                        <div style={styles.statsBox}>
                          {getVersionInfo() && (
                            <div style={styles.statItem}>
                              最低版本: {getVersionInfo()}
                            </div>
                          )}
                          
                          {getClientVersion() && (
                            <div style={styles.statItem}>
                              客户端版本: {getClientVersion()}
                            </div>
                          )}
                          
                          <div style={styles.statItem}>
                            动作数量: {getActions().length}
                          </div>
                          
                          {result.sourceType && (
                            <div style={styles.statItem}>
                              来源: {result.sourceType === 'iCloudLink' ? 'iCloud链接' : result.sourceType === 'json' ? 'JSON' : '未知'}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* 显示模式切换 */}
                      <div style={{ marginBottom: '1rem' }}>
                        <button 
                          onClick={handleToggleDisplayMode}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '0.25rem 0.5rem',
                            color: '#4361ee',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            textDecoration: 'underline'
                          }}
                        >
                          {displayMode === 'json' ? '显示详细信息' : '显示JSON数据'}
                        </button>
                      </div>
                      
                      {/* 根据显示模式展示不同内容 */}
                      {displayMode === 'json' ? (
                        <div>
                          {/* 标题和基本信息 */}
                          <h3 style={{ fontSize: '1.25rem', margin: '0 0 1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>响应内容（原始文本）</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: '#6b7280' }}>
                              格式: {result.format.toUpperCase()}
                            </span>
                          </h3>
                          
                          {/* 使用简单的textarea显示内容，允许复制 */}
                          <textarea
                            readOnly
                            value={rawData}
                            style={{
                              width: '100%',
                              minHeight: '600px', // 增加高度到600px
                              padding: '1rem',
                              backgroundColor: '#1e293b',
                              color: '#e5e7eb',
                              fontFamily: 'monospace',
                              fontSize: '0.9rem', // 稍微增大字体
                              border: 'none',
                              borderRadius: '0.5rem',
                              resize: 'vertical',
                              lineHeight: '1.5',
                              outline: 'none', // 移除焦点边框
                              boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.2)', // 添加内阴影
                              overflowY: 'auto', // 添加垂直滚动
                              whiteSpace: 'pre', // 保持格式
                            }}
                          />
                          
                          {/* 添加显眼的操作按钮 */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            marginTop: '1rem',
                            gap: '1rem',
                            flexWrap: 'wrap',
                          }}>
                            <button
                              onClick={handleDownload}
                              style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: '#d1fae5',
                                color: '#047857',
                                borderRadius: '0.375rem',
                                border: 'none',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                              }}
                            >
                              <span>⬇️</span>
                              <span>下载{result.format === 'xml' ? 'XML' : 'JSON'}文件</span>
                            </button>
                            <button
                              onClick={handleCopyCode}
                              style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: '#e0e7ff',
                                color: '#4338ca',
                                borderRadius: '0.375rem',
                                border: 'none',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                              }}
                            >
                              <span>📋</span>
                              <span>复制到剪贴板</span>
                            </button>
                          </div>
                          
                          {/* 内容太长的提示 */}
                          {rawData.length > 100000 && (
                            <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#6b7280', padding: '0.5rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem' }}>
                              ⚠️ 内容较长({rawData.length.toLocaleString()}字符)，可能影响性能，建议使用"下载"按钮保存后查看
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* 错误信息显示 */}
                          {result.error && (
                            <div style={{ 
                              padding: '0.75rem',
                              backgroundColor: '#fee2e2', 
                              color: '#b91c1c',
                              borderRadius: '0.375rem',
                              marginBottom: '1rem',
                              fontSize: '0.875rem'
                            }}>
                              <strong>错误：</strong> {result.error}
                            </div>
                          )}
                          
                          {/* 动作列表 */}
                          {getActions().length > 0 ? (
                            <div>
                              <h3 style={{ fontSize: '1rem', margin: '1rem 0 0.5rem 0' }}>
                                动作列表
                              </h3>
                              <div style={styles.actionsList}>
                                {getActions().map((action: any, index: number) => (
                                  <div key={index} style={styles.actionItem}>
                                    <span style={{ color: '#6b7280', marginRight: '0.5rem' }}>{index + 1}.</span>
                                    <span style={{ fontWeight: 'bold' }}>
                                      {action.WFWorkflowActionIdentifier?.split('.').pop()}
                                    </span>
                                    {action.WFWorkflowActionParameters?.WFCommentActionText && (
                                      <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
                                        // {action.WFWorkflowActionParameters.WFCommentActionText}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                              没有找到动作列表
                            </div>
                          )}
                        </>
                      )}
                      
                      <div style={styles.buttonGroup}>
                        <button 
                          style={{...styles.button, ...styles.copyButton}}
                          onClick={handleCopyCode}
                        >
                          复制完整代码
                        </button>
                        <button 
                          style={{...styles.button, ...styles.downloadButton}}
                          onClick={handleDownload}
                        >
                          下载{result.format === 'xml' ? 'XML' : 'JSON'}
                        </button>
                        <button 
                          style={{...styles.button, ...styles.exportButton}}
                          onClick={handleExportToWeb}
                        >
                          导出为Web查看
                        </button>
                      </div>
                      
                      <button 
                        style={styles.backButton}
                        onClick={handleBack}
                      >
                        返回
                      </button>
                    </div>
                  );
                } catch (e) {
                  console.error('渲染结果UI出错:', e);
                  setRenderError(`渲染出错: ${e instanceof Error ? e.message : '未知错误'}`);
                  return (
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: '#fee2e2', 
                      color: '#b91c1c',
                      borderRadius: '0.5rem',
                      margin: '1rem'
                    }}>
                      <h2>渲染结果时出错</h2>
                      <p>{e instanceof Error ? e.message : '未知错误'}</p>
                      <button 
                        onClick={handleBack}
                        style={{
                          marginTop: '1rem',
                          padding: '0.5rem 1rem',
                          backgroundColor: '#e5e7eb',
                          borderRadius: '0.25rem',
                          cursor: 'pointer'
                        }}
                      >
                        返回重试
                      </button>
                    </div>
                  );
                }
              })()
            )}
          </div>

          <div style={styles.footer}>
            {UI_CONFIG.APP_TITLE} © {UI_CONFIG.COPYRIGHT_YEAR}
          </div>
        </div>
      </ErrorBoundary>
    </div>
  )
}

export default App
