/**
 * 应用配置文件
 * 从环境变量中读取配置，提供默认值
 */

// API配置
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://sccode-api.900707.xyz:8443',
  FORMAT_OPTIONS: ['json', 'xml'],
  DEFAULT_FORMAT: (import.meta.env.VITE_DEFAULT_FORMAT || 'json') as 'json' | 'xml'
}

// 界面配置
export const UI_CONFIG = {
  APP_TITLE: import.meta.env.VITE_APP_TITLE || '快捷指令源码工具',
  APP_SUBTITLE: import.meta.env.VITE_APP_SUBTITLE || '解析、查看和转换iOS快捷指令源代码',
  COPYRIGHT_YEAR: import.meta.env.VITE_COPYRIGHT_YEAR || new Date().getFullYear()
}

// 功能开关
export const FEATURES = {
  ENABLE_WEB_EXPORT: import.meta.env.VITE_ENABLE_WEB_EXPORT === 'true'
} 