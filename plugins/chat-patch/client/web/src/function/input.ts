/**
 * 触控板滚动蒙版
 * 用来连续返回一系列滚动事件处理,自带中断处理
 */
export function wheelMask(process: (event: WheelEvent) => boolean, removeHook?: ()=>void): Promise<void> {
    // 中断回调
    const mask = document.createElement('div')
    let r!: () => void
    const promise = new Promise<void>((resolve) => {
        r = resolve
    })
    const remove = () => {
        document.body.removeChild(mask)
        removeHook?.()
        r()
    }
    let wheelTimeOut = setTimeout(remove, 100) as unknown as number
    mask.style.position = 'fixed'
    mask.style.top = '0'
    mask.style.left = '0'
    mask.style.width = '100vw'
    mask.style.height = '100vh'
    mask.style.zIndex = '9999'
    mask.style.backgroundColor = 'rgba(0, 0, 0, 0)'
    mask.addEventListener('wheel', (event) => {
        event.preventDefault()
        if (!process(event)) return
        // 中断回调
        clearTimeout(wheelTimeOut)
        wheelTimeOut = setTimeout(remove, 100) as unknown as number
    }, { passive: false })
    document.body.appendChild(mask)
    return promise
}

export function mousemoveMask(process: (event: MouseEvent) => void, removeHook?: (event: MouseEvent)=>void): Promise<void> {
    // 中断回调
    const mask = document.createElement('div')
    let r!: () => void
    const promise = new Promise<void>((resolve) => {
        r = resolve
    })
    const remove = (event: MouseEvent) => {
        document.body.removeChild(mask)
        removeHook?.(event)
        r()
    }
    mask.id = 'mask'
    mask.style.position = 'fixed'
    mask.style.top = '0'
    mask.style.left = '0'
    mask.style.width = '100vw'
    mask.style.height = '100vh'
    mask.style.zIndex = '9999'
    mask.style.backgroundColor = 'rgba(0, 0, 0, 0)'
    const mousemoveFun = (event: MouseEvent) => {
        event.preventDefault()
        process(event)
    }
    const mouseupFun = (event: MouseEvent) => {
        event.preventDefault()
        remove(event)
    }
    mask.addEventListener('mousemove', mousemoveFun, { passive: false })
    mask.addEventListener('mouseleave', mouseupFun, { passive: false })
    mask.addEventListener('mouseup', mouseupFun, { passive: false })
    document.body.appendChild(mask)
    return promise
}
