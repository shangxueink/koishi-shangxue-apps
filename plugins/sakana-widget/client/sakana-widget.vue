<template>
    <div ref="container" class="sakana-widget-container" :style="containerStyle">
        <div id="sakana-widget" ref="sakanaWidget"></div>
    </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onBeforeUnmount, ref, computed, watch, reactive } from 'vue'

// 定义类型
interface SakanaWidgetState {
    i: number // 惯性
    s: number // 粘性
    d: number // 衰减
    r: number // 角度
    y: number // 高度
    t: number // 垂直速度
    w: number // 水平速度
}

interface SakanaWidgetCharacter {
    image: string
    initialState: SakanaWidgetState
}

// 定义配置接口
interface SakanaConfig {
    size?: number
    autoFit?: boolean
    character?: string
    controls?: boolean
    rod?: boolean
    draggable?: boolean
    stroke?: {
        color?: string
        width?: number
    }
    threshold?: number
    rotate?: number
    title?: boolean
    customCharacters?: any[]
    offsetX?: number
    offsetY?: number
}

// 获取配置
export default defineComponent({
    name: 'SakanaWidget',
    setup() {
        // 从本地配置文件读取配置
        const config = reactive<SakanaConfig>({
            size: 200,
            autoFit: false,
            character: 'chisato',
            controls: true,
            rod: true,
            draggable: true,
            stroke: {
                color: 'rgba(180, 180, 180, 1)',
                width: 10
            },
            threshold: 0.1,
            rotate: 0,
            title: false,
            offsetX: 0,
            offsetY: 10,
            customCharacters: []
        })

        // 加载本地配置文件
        const loadConfig = async () => {
            try {
                const response = await fetch('/sakana-widget/public/config.json')
                if (response.ok) {
                    const configData = await response.json()

                    // 如果配置数据是角色数组，则设置为 customCharacters
                    if (Array.isArray(configData) && configData.length > 0 && configData[0].name) {
                        config.customCharacters = configData;
                        // 设置默认角色为第一个角色
                        if (!config.character && configData.length > 0) {
                            config.character = configData[0].name;
                        }
                    } else {
                        // 否则按对象格式处理
                        Object.assign(config, configData)
                    }
                } else {
                    console.error('无法加载配置文件:', response.statusText)
                }
            } catch (error) {
                console.error('加载配置文件失败:', error)
            }
        }


        /*
                // 调试时 要取消注释
                console.group("==================== sakana-widget ====================")
                console.log("使用本地配置文件:", config)
                console.groupEnd()
        */
        const container = ref(null)
        const sakanaWidget = ref(null)
        let widget: any = null
        let SakanaWidgetClass: any = null

        // 从配置中获取自定义角色
        const customCharacters = computed(() => {
            // 如果配置中直接是角色数组，则使用它
            if (Array.isArray(config.customCharacters)) {
                return config.customCharacters;
            }
            // 如果配置本身就是角色数组，则直接使用
            if (Array.isArray(config) && config.length > 0 && config[0].name) {
                return config;
            }
            return []
        })

        // 获取配置
        const getConfig = () => {
            return {
                size: config.size || 200,
                autoFit: config.autoFit || false,
                character: config.character || 'chisato',
                controls: config.controls !== undefined ? config.controls : true,
                rod: config.rod !== undefined ? config.rod : true,
                draggable: config.draggable !== undefined ? config.draggable : true,
                stroke: {
                    color: config.stroke?.color || 'rgba(180, 180, 180, 1)',
                    width: config.stroke?.width || 10
                },
                threshold: config.threshold || 0.1,
                rotate: config.rotate || 0,
                title: config.title || false,
                offsetX: config.offsetX || 0,
                offsetY: config.offsetY || 10
            }
        }

        const containerStyle = computed(() => {
            // 获取偏移量配置，默认横轴为0，竖轴为+10px
            const offsetX = config.offsetX || 0;
            const offsetY = config.offsetY || 1000;

            return {
                position: 'fixed' as const, // 使用类型断言解决类型错误
                bottom: `calc(0.7rem + ${offsetY}px)`,
                right: `calc(2.5rem + ${offsetX}px)`,
                zIndex: '150',
                width: config.size ? `${config.size}px` : '200px',
                height: config.size ? `${config.size}px` : '200px'
            }
        })

        // 注册所有角色
        const registerAllCharacters = async () => {
            if (!SakanaWidgetClass || !customCharacters.value.length) return {}

            const registeredCharacters: { [key: string]: string } = {}

            // 注册所有自定义角色
            for (const char of customCharacters.value) {
                const actualCharacterName = await registerCharacter(char)
                if (actualCharacterName) {
                    registeredCharacters[char.name] = actualCharacterName
                } else {
                    console.error(`Failed to register character: ${char.name}`)
                }
            }

            return registeredCharacters
        }

        // 初始化 sakana-widget
        const initSakanaWidget = async () => {
            if (!sakanaWidget.value || !SakanaWidgetClass) return

            try {
                // 获取当前配置
                const currentConfig = getConfig()

                // 清除所有已注册的自定义角色（保留默认角色）
                const allCharacters = SakanaWidgetClass.getCharacters();
                if (allCharacters) {
                    Object.keys(allCharacters).forEach(charName => {
                        // 只清除非默认角色
                        if (charName !== 'chisato' && charName !== 'takina') {
                            delete allCharacters[charName];
                        }
                    });
                }

                // 注册所有角色
                const registeredCharacters = await registerAllCharacters()

                // 确定要使用的角色名称
                const selectedCharName = currentConfig.character;
                // 查找实际注册的角色名称
                let actualCharacterName = selectedCharName;
                if (registeredCharacters[selectedCharName]) {
                    actualCharacterName = registeredCharacters[selectedCharName];
                } else if (selectedCharName === 'chisato' || selectedCharName === 'takina') {
                    // 使用默认角色
                    actualCharacterName = selectedCharName;
                } else {
                    console.error(`Character '${selectedCharName}' not found in registered characters`);
                    // 使用第一个可用的角色作为后备
                    const availableChars = Object.values(registeredCharacters);
                    if (availableChars.length > 0) {
                        actualCharacterName = availableChars[0];
                    } else {
                        actualCharacterName = 'chisato'; // 最终后备
                    }
                }

                // 验证角色确实存在
                const allChars = SakanaWidgetClass.getCharacters();

                const finalChar = SakanaWidgetClass.getCharacter(actualCharacterName);
                if (!finalChar) {
                    console.error(`Character '${actualCharacterName}' not found in registered characters`);
                    return;
                }

                widget = new SakanaWidgetClass({
                    size: currentConfig.size,
                    autoFit: currentConfig.autoFit,
                    character: actualCharacterName,
                    controls: currentConfig.controls,
                    rod: currentConfig.rod,
                    draggable: currentConfig.draggable,
                    stroke: currentConfig.stroke,
                    threshold: currentConfig.threshold,
                    rotate: currentConfig.rotate,
                    title: currentConfig.title,
                    imageOptions: {
                        referrerPolicy: 'no-referrer'
                    }
                })

                // 挂载到 DOM 元素
                widget.mount('#sakana-widget')
            } catch (error) {
                console.error('Failed to initialize sakana-widget:', error)
            }
        }

        // 注册单个角色的辅助函数
        const registerCharacter = async (char: { name: string, image: string, initialState?: any }) => {
            if (!SakanaWidgetClass) {
                console.error('SakanaWidgetClass not available');
                return null;
            }

            try {
                // 确保角色名称符合要求
                let characterName = char.name;
                // 将所有非字母数字字符替换为下划线，并确保以字母开头
                characterName = characterName.replace(/[^a-zA-Z0-9]/g, '_');
                if (/^\d/.test(characterName)) {
                    characterName = `char_${characterName}`;
                }
                // 确保名称不为空且以字母开头
                if (!characterName || !/^[a-zA-Z]/.test(characterName)) {
                    characterName = `character_${Math.random().toString(36).substring(2, 9)}`;
                }

                if (characterName !== char.name) {
                    console.log(`Character name '${char.name}' converted to '${characterName}' for compatibility`);
                }


                // 对图片使用代理获取 base64
                let imageUrl = char.image;

                if (imageUrl) {
                    try {
                        const proxyUrl = `/sakana-widget/public/proxy-image?url=${encodeURIComponent(imageUrl)}`;

                        const response = await fetch(proxyUrl);
                        if (response.ok) {
                            const data = await response.json();
                            if (data.base64Image) {
                                imageUrl = data.base64Image;
                            } else {
                                console.error('No base64Image in response:', data);
                                return null;
                            }
                        } else {
                            console.error('Failed to proxy image:', response.status, response.statusText);
                            return null;
                        }
                    } catch (error) {
                        console.error(`Failed to proxy image for ${characterName}:`, error);
                        return null;
                    }
                }

                // 默认状态
                const defaultState = {
                    i: 0.08, // 惯性
                    s: 0.1,  // 粘性
                    d: 0.99, // 衰减
                    r: 0.1,  // 角度
                    y: 0.1,  // 高度
                    t: 0,    // 垂直速度
                    w: 0     // 水平速度
                };

                // 创建角色
                const customChar: SakanaWidgetCharacter = {
                    image: imageUrl,
                    initialState: {
                        ...defaultState,
                        ...(char.initialState || {})
                    }
                }

                // 使用静态方法注册角色
                SakanaWidgetClass.registerCharacter(characterName, customChar);

                // 验证角色是否成功注册
                const registeredChar = SakanaWidgetClass.getCharacter(characterName);
                if (registeredChar) {
                    // 返回实际注册的角色名称
                    return characterName;
                } else {
                    console.error(`Failed to register character: ${characterName}`);
                    return null;
                }
            } catch (error) {
                console.error(`Failed to register character ${char.name}:`, error);
                return null;
            }
        }

        onMounted(async () => {
            try {
                // 先加载配置文件
                await loadConfig()

                // 确保配置中有自定义角色
                if (!customCharacters.value || customCharacters.value.length === 0) {
                    console.error('No custom characters found in config');
                    return;
                }

                // 导入本地 CSS  
                const link = document.createElement('link')
                link.rel = 'stylesheet'
                link.href = '/sakana-widget/public/sakana.min.css'
                document.head.appendChild(link)

                // 动态导入本地 sakana-widget
                const script = document.createElement('script')
                script.src = '/sakana-widget/public/sakana.min.js'
                document.head.appendChild(script)

                // 等待脚本加载完成
                script.onload = async () => {
                    // 获取全局 SakanaWidget 类
                    SakanaWidgetClass = (window as any).SakanaWidget

                    if (!SakanaWidgetClass) {
                        console.error('SakanaWidget class not found in window object');
                        return;
                    }

                    // 等待 CSS 加载完成后初始化
                    if (link.sheet) {
                        setTimeout(() => initSakanaWidget(), 100);
                    } else {
                        link.onload = () => {
                            setTimeout(() => initSakanaWidget(), 100);
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to load sakana-widget:', error)
            }
        })

        // 监听配置变化
        watch(config, () => {
            if (widget && SakanaWidgetClass) {
                // 卸载旧实例
                widget.unmount()
                // 重新初始化
                initSakanaWidget()
            }
        }, { deep: true })

        onBeforeUnmount(() => {
            // 卸载组件
            if (widget) {
                widget.unmount()
            }
        })

        return {
            container,
            sakanaWidget,
            containerStyle
        }
    }
})
</script>

<style>
.sakana-widget-container {
    position: relative;
}

/* 确保控制台状态栏在小组件上方 */
.layout-status {
    z-index: 200 !important;
}
</style>