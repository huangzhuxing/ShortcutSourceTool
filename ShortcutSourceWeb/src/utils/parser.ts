/**
 * 快捷指令源码解析工具
 */
import plist from 'plist';
// 暂时不使用API_CONFIG，可以在后续更新中将硬编码URL替换为配置值
// import { API_CONFIG } from '../config';

interface ShortcutMetadata {
  WFWorkflowName?: string;
  WFWorkflowMinimumClientVersionString?: string;
  WFWorkflowClientVersion?: string;
  WFWorkflowIcon?: {
    WFWorkflowIconStartColor?: number;
    WFWorkflowIconGlyphNumber?: number;
  };
}

// 可用的 CORS 代理服务列表
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://cors-proxy.htmldriven.com/?url=',
  'https://api.allorigins.win/raw?url=',
  'https://thingproxy.freeboard.io/fetch/'
];

/**
 * 解析快捷指令源代码
 * 
 * @param input 源代码输入文本（JSON、PLIST或iCloud链接）
 * @returns 解析后的快捷指令对象
 */
export async function parseShortcut(input: string): Promise<any> {
  try {
    // 清理输入
    input = input.trim();
    
    // 检查是否为iCloud链接
    if (input.includes('icloud.com/shortcuts/')) {
      const shortcutId = extractShortcutIdFromURL(input);
      if (shortcutId) {
        // 替换链接中的域名路径，获取API链接
        const apiUrl = input.replace('icloud.com/shortcuts/', 'icloud.com/shortcuts/api/records/');
        
        try {
          // 尝试不同的代理服务器，直到有一个成功
          let response = null;
          let proxyErrorMessage = '';
          
          for (const proxy of CORS_PROXIES) {
            try {
              const proxyUrl = `${proxy}${encodeURIComponent(apiUrl)}`;
              console.log(`尝试使用代理: ${proxy}`);
              
              response = await fetch(proxyUrl, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                },
              });
              
              if (response.ok) {
                console.log(`成功使用代理: ${proxy}`);
                break; // 如果成功，跳出循环
              } else {
                proxyErrorMessage = `代理 ${proxy} 返回状态码: ${response.status}`;
                response = null; // 重置响应对象，以便尝试下一个代理
              }
            } catch (proxyError) {
              console.warn(`代理 ${proxy} 出错:`, proxyError);
              proxyErrorMessage = `代理 ${proxy} 错误: ${proxyError instanceof Error ? proxyError.message : '未知错误'}`;
            }
          }
          
          // 如果所有代理都失败
          if (!response || !response.ok) {
            throw new Error(`所有代理请求失败。最后错误: ${proxyErrorMessage}\n
              提示：可能是由于跨域限制，浏览器无法直接获取iCloud数据。建议尝试复制快捷指令源码数据到剪贴板后导入。`);
          }
          
          const data = await response.json();
          
          // 提取fields字段中的数据（存储了实际的快捷指令内容）
          if (data && data.fields) {
            try {
              // 如果有下载链接，尝试获取完整的快捷指令文件
              if (data.fields.shortcut?.value?.downloadURL) {
                const downloadURL = data.fields.shortcut.value.downloadURL;
                const shortcutName = data.fields.name?.value || `shortcut_${shortcutId}`;
                
                try {
                  // 使用之前成功的代理服务
                  const proxyIndex = CORS_PROXIES.findIndex(proxy => 
                    response && response.url && response.url.startsWith(proxy));
                  
                  const proxy = proxyIndex >= 0 ? CORS_PROXIES[proxyIndex] : CORS_PROXIES[0];
                  const plistProxyUrl = `${proxy}${encodeURIComponent(downloadURL)}`;
                  
                  console.log(`尝试下载plist文件，使用代理: ${proxy}`);
                  const plistResponse = await fetch(plistProxyUrl);
                  
                  if (!plistResponse.ok) {
                    throw new Error(`下载plist文件失败: ${plistResponse.statusText}`);
                  }
                  
                  // 获取plist文本内容
                  const plistText = await plistResponse.text();
                  // 检查是否为有效的plist文本
                  if (!plistText.startsWith('<?xml') && !plistText.startsWith('bplist')) {
                    console.error('下载的文件不是有效的plist格式:', plistText);
                  }else{
                    console.log('下载的文件是有效的plist格式:', plistText);
                  }
                  // 检查是否为二进制plist（base64编码）
                  if (plistText.startsWith('bplist') || plistText.includes('bplist')) {
                    // 二进制plist文件需要特殊处理
                    return {
                      shortcutId: shortcutId,
                      sourceType: "iCloudLink",
                      name: shortcutName,
                      WFWorkflowName: shortcutName,
                      _rawData: {
                        ...data.fields,
                        downloadURL
                      },
                      error: "暂不支持解析二进制plist格式，请使用原生脚本工具或复制源码方式导入"
                    };
                  }
                  
                  try {
                    // 使用plist.js库解析plist文本
                    const parsedPlist = plist.parse(plistText) as Record<string, any>;
                    
                    // 构建结果对象
                    const shortcutData = {
                      shortcutId: shortcutId,
                      sourceType: "iCloudLink",
                      name: shortcutName,
                      
                      // 提取关键数据
                      WFWorkflowName: parsedPlist.WFWorkflowName || shortcutName,
                      WFWorkflowActions: parsedPlist.WFWorkflowActions || [],
                      WFWorkflowClientVersion: parsedPlist.WFWorkflowClientVersion,
                      WFWorkflowIcon: parsedPlist.WFWorkflowIcon,
                      WFWorkflowMinimumClientVersionString: parsedPlist.WFWorkflowMinimumClientVersionString,
                      
                      // 保留原始数据用于调试
                      _rawData: {
                        ...data.fields,
                        parsedPlist
                      }
                    };
                    
                    return shortcutData;
                  } catch (plistError) {
                    console.error('解析plist文件出错:', plistError);
                    // 返回元数据和错误信息
                    return {
                      shortcutId: shortcutId,
                      sourceType: "iCloudLink",
                      name: shortcutName,
                      _rawData: data.fields,
                      error: `解析plist文件出错: ${plistError instanceof Error ? plistError.message : '未知错误'}`
                    };
                  }
                } catch (downloadError) {
                  console.error('下载快捷指令文件出错:', downloadError);
                  // 如果无法下载plist文件，尝试从API响应中提取基本信息
                  return {
                    shortcutId: shortcutId,
                    sourceType: "iCloudLink",
                    name: shortcutName,
                    WFWorkflowName: shortcutName,
                    _rawData: data.fields,
                    error: `下载快捷指令文件出错: ${downloadError instanceof Error ? downloadError.message : '未知错误'}`
                  };
                }
              } else {
                // 如果没有下载链接，尝试从fields中提取内容
                // 提取字段
                const shortcutData = {
                  shortcutId: shortcutId,
                  sourceType: "iCloudLink",
                  name: data.fields?.name?.value || "未命名快捷指令",
                  
                  // 提取关键数据
                  WFWorkflowName: data.fields?.name?.value,
                  WFWorkflowActions: data.fields?.shortcut?.fields?.WFWorkflowActions || [],
                  WFWorkflowClientVersion: data.fields?.shortcut?.fields?.WFWorkflowClientVersion,
                  WFWorkflowIcon: data.fields?.shortcut?.fields?.WFWorkflowIcon,
                  WFWorkflowMinimumClientVersionString: data.fields?.shortcut?.fields?.WFWorkflowMinimumClientVersionString,
                  
                  // 保留原始数据用于调试
                  _rawData: data.fields
                };
                
                return shortcutData;
              }
            } catch (err) {
              console.error('解析快捷指令数据结构出错:', err);
              // 返回原始数据
              return {
                shortcutId: shortcutId,
                sourceType: "iCloudLink",
                _rawData: data.fields,
                error: `解析快捷指令数据结构出错: ${err instanceof Error ? err.message : '未知错误'}`
              };
            }
          } else {
            return {
              shortcutId: shortcutId,
              sourceType: "iCloudLink",
              error: "获取快捷指令数据失败: 响应中缺少fields字段"
            };
          }
        } catch (err) {
          console.error('获取快捷指令API数据出错:', err);
          // 如果API请求失败，返回基础信息和更友好的错误提示
          return {
            shortcutId: shortcutId,
            sourceType: "iCloudLink",
            error: `获取快捷指令数据失败: ${err instanceof Error ? err.message : '未知错误'}`,
            suggestion: "由于浏览器安全限制，无法直接从iCloud获取数据。建议使用原生快捷指令应用或从剪贴板粘贴源码。"
          };
        }
      }
    }
    
    // 检查是否为XML/PLIST格式
    if (input.includes('<?xml') && input.includes('<!DOCTYPE plist')) {
      try {
        // 使用plist.js解析XML格式的plist
        const parsedPlist = plist.parse(input) as Record<string, any>;
        
        // 提取元数据
        const metadata: ShortcutMetadata = {
          WFWorkflowName: parsedPlist.WFWorkflowName,
          WFWorkflowMinimumClientVersionString: parsedPlist.WFWorkflowMinimumClientVersionString,
          WFWorkflowClientVersion: parsedPlist.WFWorkflowClientVersion,
          WFWorkflowIcon: parsedPlist.WFWorkflowIcon
        };
        
        return {
          ...(parsedPlist as object),
          _metadata: metadata,
          sourceType: "plist"
        };
      } catch (e) {
        console.error('解析PLIST出错:', e);
        return {
          source: input.substring(0, 100) + "...",
          sourceType: "plist",
          error: `解析PLIST失败: ${e instanceof Error ? e.message : '未知错误'}`
        };
      }
    }
    
    // 尝试解析为JSON
    try {
      const jsonData = JSON.parse(input);
      
      // 提取元数据
      const metadata: ShortcutMetadata = {
        WFWorkflowName: jsonData.WFWorkflowName,
        WFWorkflowMinimumClientVersionString: jsonData.WFWorkflowMinimumClientVersionString,
        WFWorkflowClientVersion: jsonData.WFWorkflowClientVersion,
        WFWorkflowIcon: jsonData.WFWorkflowIcon
      };
      
      return {
        // 保留原始数据，以便在界面中直接显示
        ...jsonData,
        // 添加一些附加信息用于UI展示
        _metadata: metadata,
        sourceType: "json"
      };
    } catch (e) {
      // 不是有效的JSON，也不是XML/PLIST
      return {
        source: input.substring(0, 100) + "...",
        sourceType: "unknown",
        error: "无法识别的格式：不是有效的JSON或PLIST数据"
      };
    }
  } catch (e) {
    console.error('解析快捷指令出错:', e);
    return {
      error: `解析失败: ${e instanceof Error ? e.message : '未知错误'}`
    };
  }
}

/**
 * 从URL中提取快捷指令ID
 */
function extractShortcutIdFromURL(url: string): string | null {
  const match = url.match(/icloud\.com\/shortcuts\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

/**
 * 判断字符串是否为Base64编码
 */
// function isBase64(str: string): boolean {
//   try {
//     return btoa(atob(str)) === str;
//   } catch (e) {
//     return false;
//   }
// }