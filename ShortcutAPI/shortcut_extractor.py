#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
iCloud快捷指令源码提取工具
将iCloud快捷指令链接转换为JSON或XML格式
author: zhuxingtongxue
"""

import re
import json
import tempfile
import os
import subprocess
import requests
import logging
from typing import Tuple, Optional
import base64
import sys
import plistlib  # 添加plistlib以提供备用解析方法

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("shortcut-extractor")

class ShortcutExtractor:
    """
    快捷指令提取器类
    
    用于从iCloud链接中提取快捷指令内容，并转换为指定格式
    支持JSON和XML格式输出
    """
    
    def __init__(self):
        """初始化提取器"""
        logger.info("初始化快捷指令提取器")

    def extract(self, shortcut_url: str, format_type: str = "json") -> Tuple[str, str, Optional[str]]:
        """
        从iCloud链接中提取快捷指令并转换为指定格式
        
        Args:
            shortcut_url: iCloud快捷指令链接
            format_type: 输出格式（json或xml），默认为json
            
        Returns:
            Tuple[str, str, Optional[str]]: (转换后的内容, 文件名, 错误消息)
        """
        logger.info(f"开始处理: {shortcut_url}")
        
        # 验证格式
        if format_type not in ["json", "xml"]:
            return "", "", "格式必须是json或xml"
        
        # 从URL提取快捷指令ID
        shortcut_id = self._extract_id_from_url(shortcut_url)
        if not shortcut_id:
            return "", "", "无法从URL中提取快捷指令ID"
        
        # 构建API URL
        api_url = f"https://www.icloud.com/shortcuts/api/records/{shortcut_id}"
        logger.info(f"API URL: {api_url}")
        
        try:
            # 下载API数据
            logger.info("下载快捷指令元数据...")
            response = requests.get(api_url)
            response.raise_for_status()
            
            # 解析API响应
            data = response.json()
            logger.debug(f"API响应数据: {json.dumps(data, indent=2)[:500]}...")
            
            # 提取下载URL和快捷指令名称
            download_url = data.get("fields", {}).get("shortcut", {}).get("value", {}).get("downloadURL")
            shortcut_name = data.get("fields", {}).get("name", {}).get("value")
            
            # 如果名称为空，使用ID作为名称
            if not shortcut_name:
                shortcut_name = f"shortcut_{shortcut_id}"
                
            # 清理文件名
            shortcut_name = re.sub(r'[^\w\-]', '_', shortcut_name)
            logger.info(f"快捷指令名称: {shortcut_name}")
            
            if not download_url:
                return "", "", "无法找到下载链接"
                
            logger.info(f"下载链接: {download_url}")
            
            # 下载plist文件
            logger.info("下载快捷指令plist文件...")
            plist_response = requests.get(download_url)
            plist_response.raise_for_status()
            plist_content = plist_response.content
            
            if not plist_content:
                logger.error("下载的plist内容为空")
                return "", "", "下载的plist内容为空"
                
            logger.info(f"成功下载plist文件，大小：{len(plist_content)} 字节")
            
            # 创建临时文件
            with tempfile.NamedTemporaryFile(delete=False, suffix=".plist") as temp_file:
                temp_file_path = temp_file.name
                temp_file.write(plist_content)
                
            logger.info(f"临时文件创建在: {temp_file_path}")
            
            # 输出文件名
            output_filename = f"{shortcut_name}.{format_type}"
            
            # 使用plutil转换plist到目标格式
            content = self._convert_plist(temp_file_path, format_type)
            
            # 删除临时文件
            os.unlink(temp_file_path)
            logger.info(f"已删除临时文件: {temp_file_path}")
            
            # 检查转换后的内容
            if not content:
                logger.error("转换后的内容为空")
                return "", "", "转换后的内容为空"
                
            logger.info(f"成功! 快捷指令已转换为: {format_type}，内容长度: {len(content)} 字节")
            
            # 返回结果
            return content, output_filename, None
            
        except requests.RequestException as e:
            error_msg = f"API请求失败: {str(e)}"
            logger.error(error_msg)
            return "", "", error_msg
        except json.JSONDecodeError:
            error_msg = "API响应不是有效的JSON"
            logger.error(error_msg)
            return "", "", error_msg
        except Exception as e:
            error_msg = f"处理快捷指令时出错: {str(e)}"
            logger.error(error_msg)
            return "", "", error_msg
    
    def _extract_id_from_url(self, url: str) -> str:
        """从URL中提取快捷指令ID"""
        match = re.search(r'[^/]*$', url)
        return match.group(0) if match else ""
    
    def _convert_plist(self, plist_path: str, format_type: str) -> str:
        """
        使用plutil/plistutil将plist转换为json或xml
        
        Args:
            plist_path: plist文件路径
            format_type: 输出格式（json或xml）
            
        Returns:
            str: 转换后的内容
        """
        # 创建临时输出文件
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{format_type}") as output_file:
            output_path = output_file.name
        
        try:
            # 确认plist文件存在且有内容
            if not os.path.exists(plist_path) or os.path.getsize(plist_path) == 0:
                logger.error(f"plist文件不存在或为空: {plist_path}")
                raise FileNotFoundError(f"plist文件不存在或为空: {plist_path}")
                
            # 检测操作系统类型，判断使用plutil还是plistutil
            import platform
            is_macos = platform.system() == "Darwin"
            
            # 尝试使用系统命令转换
            try:
                if is_macos:
                    # macOS系统使用plutil
                    plist_format = "json" if format_type == "json" else "xml1"
                    command = ["plutil", "-convert", plist_format, plist_path, "-o", output_path]
                    logger.info(f"使用macOS plutil命令: {' '.join(command)}")
                else:
                    # Linux系统上尝试不同的plistutil命令格式
                    # 首先检查支持的格式
                    try:
                        help_process = subprocess.run(
                            ["plistutil", "--help"],
                            capture_output=True,
                            text=True,
                            check=False
                        )
                        help_output = help_process.stdout + help_process.stderr
                        logger.debug(f"plistutil帮助信息: {help_output}")
                        
                        # 根据帮助信息调整格式参数
                        if "-f xml" in help_output or "--format=xml" in help_output:
                            # 使用xml和binary作为格式选项
                            plist_format = "xml" if format_type == "xml" else "binary"
                            command = ["plistutil", "-i", plist_path, "-o", output_path, "-f", plist_format]
                        else:
                            # 尝试不使用-f参数
                            command = ["plistutil", "-i", plist_path, "-o", output_path]
                            
                    except Exception as e:
                        logger.warning(f"检查plistutil支持的格式失败: {str(e)}")
                        # 默认尝试不带格式参数
                        command = ["plistutil", "-i", plist_path, "-o", output_path]
                
                # 执行命令进行转换
                logger.info(f"执行转换命令: {' '.join(command)}")
                process = subprocess.run(
                    command,
                    check=True,
                    capture_output=True
                )
                
                # 检查命令输出
                if process.stdout:
                    logger.info(f"命令标准输出: {process.stdout.decode('utf-8')}")
                if process.stderr:
                    logger.warning(f"命令错误输出: {process.stderr.decode('utf-8')}")
                
                # 如果是非macOS系统且需要json格式，可能需要额外处理
                if not is_macos and format_type == "json" and os.path.exists(output_path):
                    # 检查输出文件是否为XML格式，如果是则需要转换为JSON
                    with open(output_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if content.startswith('<?xml') or '<plist' in content:
                            logger.info("检测到XML输出，需要手动转换为JSON")
                            # 使用plistlib将XML转换为JSON
                            with open(plist_path, 'rb') as pf:
                                plist_data = plistlib.load(pf)
                                json_content = json.dumps(plist_data, ensure_ascii=False, indent=2)
                                with open(output_path, 'w', encoding='utf-8') as jf:
                                    jf.write(json_content)
                                    logger.info("成功将XML手动转换为JSON")
                
            except subprocess.CalledProcessError as e:
                # 命令行转换失败，使用plistlib作为备用方案
                logger.warning(f"命令行转换失败，使用plistlib作为备用: {str(e)}")
                with open(plist_path, 'rb') as f:
                    plist_data = plistlib.load(f)
                    
                if format_type == "json":
                    # 转换为JSON
                    content = json.dumps(plist_data, ensure_ascii=False, indent=2)
                    with open(output_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                else:
                    # 保存为XML
                    with open(output_path, 'wb') as f:
                        plistlib.dump(plist_data, f, fmt=plistlib.FMT_XML)
                        
                logger.info(f"使用plistlib成功转换为{format_type}格式")
            
            # 确保输出文件存在
            if not os.path.exists(output_path):
                logger.error(f"转换后的输出文件不存在: {output_path}")
                return ""
                
            # 检查输出文件大小
            file_size = os.path.getsize(output_path)
            if file_size == 0:
                logger.error(f"转换后的输出文件为空: {output_path}")
                return ""
                
            logger.info(f"成功创建转换后的文件，大小: {file_size} 字节")
            
            # 读取转换后的内容
            with open(output_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            if not content:
                logger.error("读取的文件内容为空")
            else:
                logger.info(f"成功读取文件内容，长度: {len(content)} 字节")
                
            # 删除临时输出文件
            os.unlink(output_path)
            logger.info(f"已删除临时输出文件: {output_path}")
            
            return content
            
        except Exception as e:
            logger.error(f"文件转换出错: {str(e)}")
            raise
        finally:
            # 确保临时文件被删除
            if os.path.exists(output_path):
                os.unlink(output_path)